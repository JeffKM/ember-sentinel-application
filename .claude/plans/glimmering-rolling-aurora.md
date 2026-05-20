# Phase 5-A: 안정성 및 코드 품질 개선 계획

## Context

Phase 4 완료 후 Playwright MCP 프로덕션 테스트(10개 시나리오 전수 통과)에서 도출된 코드 품질 개선 사항. Task 024(비교 페이지 title 중복 버그)는 이미 완료됨. 나머지 6개 Task를 순차적으로 구현한다.

## 실행 순서

모든 Task가 독립적이지만, 파일 충돌 최소화와 효율성을 위해 다음 순서로 진행:

| 순서 | Task | 핵심 |
|------|------|------|
| 1 | **027** | `import "server-only"` 추가 (가장 단순, 안전 가드) |
| 2 | **025** | React `cache()` 래핑 (DB 쿼리 중복 제거) |
| 3 | **026** | fixture-detail 공통 서비스 추출 |
| 4 | **028** | CSP 헤더 추가 |
| 5 | **030** | 단위 테스트 작성 (Vitest) |
| 6 | **031** | Sentry 연동 |

---

## Task 027: 레포지토리 레이어 server-only 강화

### 수정 파일 (18개 파일, 각 1줄 추가)

**`lib/repositories/` (7개)**:
- `fixture-repository.ts` — 파일 1행 아래에 `import "server-only";` 추가
- `player-repository.ts` — 동일
- `team-repository.ts` — 동일
- `standing-repository.ts` — 동일
- `injury-repository.ts` — 동일
- `mappers.ts` — 동일 (순수 함수이지만 repo 레이어 일관성 위해)
- `index.ts` — 동일 (barrel import 보호)

**`lib/services/sync/` (10개)**:
- `sync-fixtures.ts`, `sync-players.ts`, `sync-stats.ts`, `sync-teams.ts`
- `calculate-context.ts`, `db-mappers.ts`, `auth.ts`, `log.ts`, `retry.ts`
- `index.ts`

**기타 (1개)**:
- `lib/services/h2h.ts` — SportMonks API 직접 호출

### 검증
- `npm run build` — 클라이언트 번들에서 server-only import 시 빌드 에러 발생하는지 확인

---

## Task 025: React cache()를 활용한 요청 중복 제거

### 문제
`generateMetadata`와 페이지 컴포넌트가 동일 함수를 각각 호출 → 같은 요청 범위 내 DB 쿼리 중복.

### 중복 호출 지점

| 페이지 | 중복 함수 | 절감 효과 |
|--------|-----------|-----------|
| `matchday/page.tsx` (L26, L43) | `getCurrentGameweek()` | DB 6쿼리 → 3쿼리 |
| `players/[playerId]/page.tsx` (L21, L68) | `getPlayerById()` | DB 2쿼리 → 1쿼리 |
| `players/[playerId]/page.tsx` (L24-26, L71-73) | `getTeamsByIds()`, `getPlayerSeasonStats()` | DB 4쿼리 → 2쿼리 |
| `matchday/[fixtureId]/page.tsx` (L24, L67) | `getFixtureById()` | DB 2쿼리 → 1쿼리 |
| `matchday/[fixtureId]/page.tsx` (L28, L72-75) | `getTeamsByIds()`, `getStandingsByTeamIds()` | DB 4쿼리 → 2쿼리 |

### 수정 파일

**`lib/repositories/fixture-repository.ts`**:
```typescript
import { cache } from "react";
// getCurrentGameweek, getFixtureById를 cache()로 래핑
// 함수 선언문 → const + cache(async) 형태로 변경
export const getCurrentGameweek = cache(async (): Promise<number> => { ... });
export const getFixtureById = cache(async (id: number): Promise<Fixture | null> => { ... });
// getFixturesByGameweek는 generateMetadata에서 미사용 → cache 불필요
```

**`lib/repositories/player-repository.ts`**:
```typescript
import { cache } from "react";
export const getPlayerById = cache(async (id: number): Promise<Player | null> => { ... });
export const getPlayerSeasonStats = cache(async (...): Promise<PlayerSeasonStats | null> => { ... });
// getAllPlayers, getPlayerSeasonStatsByIds, getMatchStatsByPlayerId → cache 불필요
```

**`lib/repositories/team-repository.ts`**:
```typescript
import { cache } from "react";
export const getTeamsByIds = cache(async (ids: number[]): Promise<Map<number, Team>> => { ... });
```

**`lib/repositories/standing-repository.ts`**:
```typescript
import { cache } from "react";
export const getStandingsByTeamIds = cache(async (...): Promise<Map<number, TeamStanding>> => { ... });
```

> **참고**: `cache()`는 인자를 `Object.is`로 비교한다. 배열 인자(`[1, 2]`)는 매번 새 참조이므로 캐시 미스가 발생할 수 있으나, 같은 요청 범위 내에서 `getFixtureById(id)` → `getTeamsByIds(teamIds)`처럼 원시값 인자 함수에서 주된 효과가 나타난다.

### 검증
- `npm run type-check && npm run build`
- 개발 서버에서 각 페이지 접근 시 Supabase Dashboard 쿼리 로그 감소 확인

---

## Task 026: 경기 상세 데이터 로딩 중복 제거

### 문제
`app/(app)/matchday/[fixtureId]/page.tsx` (L70-101)와 `app/api/matchday/fixture/route.ts` (L79-122)에 동일한 fixture 조립 로직(팀/순위/H2H/부상자 병렬 조회 + FixtureDetailData 생성) 중복.

### 구현

**새 파일: `lib/services/fixture-detail-service.ts`**
```typescript
import "server-only";

// Fixture 객체로부터 팀/순위/H2H/부상자를 병렬 조회하여 FixtureDetailData 조립
export async function assembleFixtureDetail(fixture: Fixture): Promise<FixtureDetailData | null> {
  const teamIds = [fixture.homeTeamId, fixture.awayTeamId].filter(Boolean);
  const [teamsMap, standingsMap, h2hResults, homeInjuries, awayInjuries] = await Promise.all([...]);
  // homeTeam/awayTeam 없으면 null 반환
  return { fixture, homeTeam, awayTeam, ... };
}
```

**`FixtureDetailData` 타입 이동**: `app/api/matchday/fixture/route.ts` (L24-33) → `lib/services/fixture-detail-service.ts`로 이동. route.ts와 page.tsx 모두 새 경로에서 import.

**수정 파일**:
- `lib/services/fixture-detail-service.ts` — **새 파일** (assembleFixtureDetail + FixtureDetailData 타입)
- `app/api/matchday/fixture/route.ts` — FixtureDetailData 타입 제거, assembleFixtureDetail 사용
- `app/(app)/matchday/[fixtureId]/page.tsx` — assembleFixtureDetail 사용, import 경로 변경
- `app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx` — FixtureDetailData import 경로 변경

### route.ts 리팩터링 후
```typescript
// 라이브 병합 로직은 route.ts에만 유지
let fixture = dbFixture;
if (dbFixture.status !== "FT" && ...) { fixture = liveFixture; }

// 공통 로직은 서비스 호출
const data = await assembleFixtureDetail(fixture);
if (!data) return 404;
```

### 검증
- `npm run type-check && npm run build`
- 경기 상세 페이지 SSR + API 폴링 정상 동작 확인
- 라이브 경기에서 실시간 데이터 병합 정상 확인

---

## Task 028: CSP 헤더 추가

### 수정 파일
- `next.config.ts` — CSP 헤더 1개 추가

### CSP 정책 (report-only 모드)

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cdn.sportmonks.com;
  font-src 'self';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
`.replace(/\n/g, " ").trim();
```

| 디렉티브 | 이유 |
|----------|------|
| `script-src 'unsafe-inline'` | next-themes 인라인 스크립트 (FOUC 방지) |
| `script-src 'unsafe-eval'` | Next.js dev 모드 HMR |
| `style-src 'unsafe-inline'` | global-error.tsx 인라인 스타일, sonner |
| `img-src cdn.sportmonks.com` | 선수/팀 이미지 |
| `connect-src *.supabase.co` | Supabase REST + Realtime WebSocket |

헤더 키: `Content-Security-Policy-Report-Only` (enforce 전 위반 모니터링)

### 검증
- `npm run build && npm start` — 프로덕션 모드에서 브라우저 콘솔 CSP 위반 경고 확인
- 모든 주요 페이지 (matchday, player, compare, fixture-detail) 순회
- 위반 없으면 `Content-Security-Policy`로 전환

---

## Task 030: 단위 테스트 (Vitest)

### vitest.config.ts 수정
`server-only` 패키지를 빈 모듈로 모킹 (테스트 환경에서 에러 방지):
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "."),
    "server-only": path.resolve(__dirname, "lib/__tests__/server-only-mock.ts"),
  },
},
```

### 테스트 파일 4개

**1. `lib/repositories/__tests__/mappers.test.ts`** — DB row → 앱 타입 변환 (7개 함수)
- `fixtureRowToFixture`: snake_case→camelCase, null team_id→0, null events→[]
- `playerRowToPlayer`: position 타입 캐스팅, null team_id→0
- `playerSeasonStatsRowToStats`: context JSONB 기본값, xg null→xgContext null
- `teamRowToTeam`, `standingRowToStanding`, `injuryRowToInjuredPlayer`, `playerMatchStatsRowToStats`

**2. `lib/services/sync/__tests__/calculate-context.test.ts`** — 순위/백분위 계산
- `computeRanks`, `computePercentile`을 `calculate-context.ts`에서 export 필요
- computeRanks: 내림차순 순위, 동점 처리, 빈 배열
- computePercentile: 1위→100, 꼴찌→0, 단독→100, 중간값 정확성

**3. `lib/api/sportmonks/__tests__/mappers.test.ts`** — API 매퍼
- `extractStatValue`: number/{ total }/{ average } 구조, 미존재→null, undefined→null
- `mapSmTeamToTeam`: short_code 없으면 name 앞 3글자
- `mapSmFixtureToFixture`: 상태 매핑, 스코어 추출, 이벤트 변환

**4. `app/(app)/matchday/__tests__/_utils.test.ts`** — 날짜 유틸
- `groupFixturesByDate`: 동일 날짜 그룹핑, 다른 날짜 분리, 날짜순 정렬
- `buildDateRange`: 빈 배열→"", 동일 날짜→단일, 다른 날짜→범위

### 추가 파일
- `lib/__tests__/server-only-mock.ts` — 빈 파일 (export {})
- `lib/services/sync/calculate-context.ts` — `computeRanks`, `computePercentile` export 추가

### 검증
- `npm run test` — 전체 테스트 통과

---

## Task 031: Sentry 에러 모니터링 연동

### 패키지 설치
```bash
npm install @sentry/nextjs
```

### 새 파일 4개
- `sentry.client.config.ts` — 클라이언트 초기화 (tracesSampleRate, browserTracing)
- `sentry.server.config.ts` — 서버 초기화
- `sentry.edge.config.ts` — Edge 런타임 초기화
- `instrumentation.ts` — Next.js instrumentation hook + `onRequestError`

### 수정 파일
- `next.config.ts` — `withSentryConfig()` 래핑, 소스맵 업로드 설정
- `app/error.tsx` (L16) — `console.error` → `Sentry.captureException(error)` 추가
- `app/global-error.tsx` — 동일
- `.env.local` — `NEXT_PUBLIC_SENTRY_DSN` 추가

### 환경 변수
```
NEXT_PUBLIC_SENTRY_DSN=<Sentry 프로젝트 DSN>
SENTRY_ORG=<조직명>
SENTRY_PROJECT=<프로젝트명>
SENTRY_AUTH_TOKEN=<CI용 토큰>
```

### 검증
- `npm run build` 성공
- 개발 서버에서 의도적 에러 발생 → Sentry 대시보드 이벤트 수신 확인

---

## 전체 검증 체크리스트

1. `npm run type-check` — TypeScript 타입 검사
2. `npm run lint` — ESLint 검사
3. `npm run build` — 프로덕션 빌드 성공
4. `npm run test` — 단위 테스트 전체 통과
5. `npm run dev` — 개발 서버 정상 동작
6. 주요 페이지 동작: matchday, fixture-detail, player-profile, compare
