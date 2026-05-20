# Phase ML: 5대 리그 매치데이 확장

## Context

현재 매치데이 페이지는 맨시티(MCITY_TEAM_ID=50) 경기만 표시한다. 5대 리그(EPL/La Liga/Serie A/Bundesliga/Ligue 1) 전체 일정을 리그 탭 UI로 확장하고, DB 동기화 우선 전략으로 API 요청을 최소화한다.

**핵심 제약**: API-Football 무료 플랜 100요청/일 → 5개 리그 동기화 5요청, `live=all` 1요청으로 모든 리그 라이브 커버.

---

## Task 목록

### ML01: 5대 리그 상수 & 타입 정의

**파일**: `lib/constants/football.ts`

추가할 내용:
- `LeagueSlug` 타입: `"epl" | "laliga" | "seriea" | "bundesliga" | "ligue1"`
- `LeagueConfig` 인터페이스: `{ id, slug, name, shortName, country, maxRounds, teamsCount }`
- `TOP5_LEAGUES` 배열: 5개 리그 설정 (EPL=39/38R, La Liga=140/38R, Serie A=135/38R, Bundesliga=78/34R, Ligue 1=61/34R)
- `LEAGUE_BY_SLUG`, `LEAGUE_BY_ID` 매핑 객체
- `TOP5_LEAGUE_IDS` Set
- `DEFAULT_LEAGUE = "epl"`
- `LEAGUE_NAME_MAP` 에 5대 리그 추가

**테스트**:
- [ ] `npm run type-check` 통과
- [ ] `TOP5_LEAGUES.length === 5`, 각 slug ↔ id 양방향 조회 정상

---

### ML02: API-Football 클라이언트 확장

**파일**: `lib/api/api-football/fixtures.ts`

변경:
- `getAllSeasonFixtures(season)` → `getAllSeasonFixtures(leagueId, season)` (기본값 PL_LEAGUE_ID)
- `getFixturesByRound(round, season)` → `getFixturesByRound(round, leagueId, season)` (기본값 PL_LEAGUE_ID)
- 캐시 태그에 leagueId 포함: `season-fixtures-${leagueId}`

기존 호출부는 기본값으로 호환 유지.

**테스트**:
- [ ] `getAllSeasonFixtures()` → 기존 PL 동작 유지
- [ ] `getAllSeasonFixtures(78)` → Bundesliga 경기 반환 (디버그 API로 확인)
- [ ] `npm run type-check` 통과

---

### ML03: 5개 리그 시즌 일정 동기화

**파일**: `lib/services/sync/sync-fixtures.ts`

추가:
- `syncLeagueFixtures(leagueId)`: 단일 리그 동기화 (기존 syncFixtures 로직 기반, league_id 파라미터화)
- `syncAllLeagueFixtures()`: 5개 리그 순차 동기화 (5 API 요청)
- 기존 `syncFixtures()`는 `syncLeagueFixtures(PL_LEAGUE_ID)` 위임으로 리팩터링

**테스트**:
- [ ] `syncLeagueFixtures(39)` → PL 380경기 동기화
- [ ] `syncLeagueFixtures(78)` → Bundesliga 306경기 동기화
- [ ] `syncAllLeagueFixtures()` → 5개 결과, DB 확인: `SELECT league_id, COUNT(*) FROM fixtures GROUP BY league_id`
- [ ] POSTP 보존 로직 정상 동작

---

### ML04: Repository 리그별 조회

**파일**: `lib/repositories/fixture-repository.ts`

변경:
- `getCurrentGameweek()` → `getCurrentGameweek(leagueId)`: MCITY 필터 제거, `league_id` 필터로 교체
- `getFixturesByGameweek(gw)` → `getFixturesByGameweek(gw, leagueId)`: MCITY 필터 제거, `league_id` 필터 + 리그 전체 경기 반환

기본값 `PL_LEAGUE_ID`로 하위 호환 유지.

**테스트**:
- [ ] `getFixturesByGameweek(1)` → PL GW1 10경기 (기존 1~2경기에서 변경)
- [ ] `getFixturesByGameweek(1, 78)` → Bundesliga GW1 9경기
- [ ] `getCurrentGameweek(140)` → La Liga 현재 GW 반환
- [ ] 기존 경기 상세 페이지(`[fixtureId]/page.tsx`)의 `getFixtureById` 영향 없음

---

### ML05: 라이브 서비스 5대 리그 지원

**파일**: `lib/services/live/live-fixture-service.ts`

변경:
- `getLiveFixtures()`: MCITY 필터 → `TOP5_LEAGUE_IDS` 필터로 변경
- `filterLiveByLeague(liveFixtures, leagueId)` 함수 추가: 전체 라이브에서 특정 리그만 추출

API 비용 변경 없음 (`live=all`은 이미 모든 리그 조회).

**테스트**:
- [ ] 라이브 경기 중 `getLiveFixtures()` → 5대 리그 경기만 포함
- [ ] `filterLiveByLeague(fixtures, 78)` → Bundesliga 라이브만 반환
- [ ] 인메모리 캐시 120초 TTL 유지

---

### ML06: API 라우트 확장

**파일**: `app/api/matchday/fixtures/route.ts`

변경:
- URL: `?gw=N` → `?league=epl&gw=N` (league 기본값: `epl`)
- `MatchdayData` 인터페이스에 `leagueSlug`, `maxRounds` 필드 추가
- 리그 유효성 검증 (`LEAGUE_BY_SLUG[slug]` 존재 여부)
- GW 범위 검증: `1~leagueConfig.maxRounds` (Bundesliga=34)
- 라이브 병합: `filterLiveByLeague(allLive, leagueConfig.id)`

**테스트**:
- [ ] `GET /api/matchday/fixtures?league=epl&gw=15` → EPL GW15 10경기
- [ ] `GET /api/matchday/fixtures?league=bundesliga&gw=15` → Bundesliga GW15 9경기
- [ ] `GET /api/matchday/fixtures?league=invalid&gw=15` → 400
- [ ] `GET /api/matchday/fixtures?league=bundesliga&gw=35` → 400 (34라운드 초과)
- [ ] `GET /api/matchday/fixtures?gw=15` → EPL GW15 (하위 호환)

---

### ML07: TanStack Query Hook 확장

**파일**: `lib/hooks/use-matchday-fixtures.ts`

변경:
- `fetchMatchdayFixtures(gw)` → `fetchMatchdayFixtures(gw, leagueSlug)`
- `useMatchdayFixtures(gw, initialData)` → `useMatchdayFixtures(gw, leagueSlug, initialData)`
- `queryKey`: `["matchday", "fixtures", leagueSlug, gw]` (리그별 캐시 분리)

**테스트**:
- [ ] 리그 탭 변경 시 새 쿼리 실행 (queryKey 분리 확인)
- [ ] 동일 리그 GW 변경 시 올바른 캐시 히트

---

### ML08: 매치데이 페이지 SSR 확장

**파일**: `app/(app)/matchday/page.tsx`

변경:
- `searchParams`: `{ gw?, league? }` 확장
- `generateMetadata`: 리그 shortName 포함 (`EPL GW15 Matchday`)
- SSR: `getCurrentGameweek(leagueConfig.id)`, `getFixturesByGameweek(gw, leagueConfig.id)`
- `initialData`에 `leagueSlug`, `maxRounds` 포함
- JSX: `<LeagueTabs>` 추가, `<GameweekHeader>`에 리그 props 전달

**테스트**:
- [ ] `/matchday` → EPL 현재 GW (기본값)
- [ ] `/matchday?league=bundesliga` → Bundesliga 현재 GW
- [ ] `/matchday?league=laliga&gw=20` → La Liga GW20
- [ ] 브라우저에서 5개 탭 모두 클릭 → SSR 데이터 정상 로드

---

### ML09: 리그 탭 UI 컴포넌트

**파일**: `app/(app)/matchday/_components/league-tabs.tsx` (신규)

구현:
- `"use client"` 컴포넌트
- `TOP5_LEAGUES` 기반 5개 탭 렌더링
- `Link` 컴포넌트로 URL 네비게이션 (`/matchday?league=${slug}&gw=${gw}`)
- 활성 탭: `bg-comic-yellow` 스타일 (Ranking 탭과 동일 디자인 패턴)
- 모바일 가로 스크롤 `overflow-x-auto`

**테스트**:
- [ ] 5개 탭 모두 렌더링
- [ ] 활성 탭 `bg-comic-yellow` 스타일 적용
- [ ] 탭 클릭 → URL 변경 + 페이지 갱신
- [ ] 모바일: 가로 스크롤 동작

---

### ML10: GameweekHeader 리그 대응

**파일**: `app/(app)/matchday/_components/gameweek-header.tsx`

변경:
- Props에 `maxRounds`, `leagueSlug` 추가
- `MAX_GW = 38` 하드코딩 → `maxRounds` prop 사용
- 이전/다음 Link에 `league` 파라미터 유지: `/matchday?league=${leagueSlug}&gw=${gw±1}`

**테스트**:
- [ ] EPL: GW38 → 다음 비활성
- [ ] Bundesliga: GW34 → 다음 비활성
- [ ] GW 이동 시 리그 파라미터 유지

---

### ML11: MatchdayContent 확장

**파일**: `app/(app)/matchday/_components/matchday-content.tsx`

변경:
- `useMatchdayFixtures` 호출에 `initialData.leagueSlug` 전달

**테스트**:
- [ ] 리그별 폴링 분리 동작
- [ ] 라이브 경기 시 60초 폴링, 비라이브 시 300초

---

### ML12: 동기화 디버그 엔드포인트

**파일**: `app/api/debug/api-football/sync-leagues/route.ts` (신규)

구현:
- `GET /api/debug/api-football/sync-leagues` → `syncAllLeagueFixtures()` 실행
- production 환경 403 차단
- 응답: 리그별 결과 + 총 API 호출 수 + rate limiter 사용량

**테스트**:
- [ ] dev 환경 호출 → 5개 리그 동기화 결과 JSON
- [ ] production → 403

---

### ML13: 경기 상세 역링크 + Ranking 연동

**파일**: `app/(app)/matchday/[fixtureId]/` 관련, `ranking/_components/ranking-content.tsx`

변경:
- 경기 상세에서 "뒤로가기" Link에 `league` 파라미터 추가 (`LEAGUE_BY_ID[fixture.leagueId]`)
- Ranking `LEAGUES` 배열을 `TOP5_LEAGUES` 상수에서 파생하도록 리팩터링 (available은 EPL만 유지)

**테스트**:
- [ ] La Liga 경기 상세 → 뒤로 → `/matchday?league=laliga&gw=N`
- [ ] Ranking 탭 UI 기존과 동일 (EPL만 활성)

---

## 구현 순서 (의존성)

```
ML01 (상수) ──┬── ML02 (API 클라이언트) ─── ML03 (동기화) ─── ML12 (디버그)
              ├── ML04 (Repository) ─── ML05 (라이브) ─── ML06 (API 라우트) ─── ML07 (Hook)
              └── ML09 (리그 탭 UI) ─── ML08 (페이지 SSR) ─── ML10 (GW 헤더)
                                                             └── ML11 (Content)
ML13 (역링크+Ranking) ← ML01
```

**권장 순서**: ML01 → ML02 → ML03 → ML12 → ML04 → ML05 → ML06 → ML07 → ML09 → ML08 → ML10 → ML11 → ML13

---

## 주요 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `lib/constants/football.ts` | 수정 (5대 리그 상수 추가) |
| `lib/api/api-football/fixtures.ts` | 수정 (leagueId 파라미터) |
| `lib/services/sync/sync-fixtures.ts` | 수정 (다중 리그 동기화) |
| `lib/repositories/fixture-repository.ts` | 수정 (league_id 필터) |
| `lib/services/live/live-fixture-service.ts` | 수정 (5대 리그 필터) |
| `app/api/matchday/fixtures/route.ts` | 수정 (league 파라미터) |
| `lib/hooks/use-matchday-fixtures.ts` | 수정 (leagueSlug 추가) |
| `app/(app)/matchday/page.tsx` | 수정 (league searchParam) |
| `app/(app)/matchday/_components/league-tabs.tsx` | **신규** |
| `app/(app)/matchday/_components/gameweek-header.tsx` | 수정 (maxRounds prop) |
| `app/(app)/matchday/_components/matchday-content.tsx` | 수정 (leagueSlug 전달) |
| `app/api/debug/api-football/sync-leagues/route.ts` | **신규** |
| `app/(app)/ranking/_components/ranking-content.tsx` | 수정 (상수 연동) |
| `app/(app)/matchday/[fixtureId]/` 관련 | 수정 (역링크) |

---

## API 비용 분석

| 작업 | 요청 수 | 빈도 |
|------|---------|------|
| 5개 리그 동기화 | 5 | 시즌 시작 1회 (이후 주 1회) |
| 라이브 (`live=all`) | 1/120초 | 라이브 경기 있을 때만 |
| 경기 상세 | 1~3 | 사용자 요청 시 |
| **일일 예상** | **~27/100** | 충분한 여유 |

---

## 검증 (E2E)

1. `/api/debug/api-football/sync-leagues` 호출 → 5개 리그 DB 저장 확인
2. `/matchday` → EPL 기본 탭 + 전체 경기 카드 렌더링
3. 5개 리그 탭 전환 → 각 리그 라운드별 경기 목록 정상
4. GW 이전/다음 네비게이션 → 리그 유지 + 올바른 maxRounds 범위
5. `npm run validate` (type-check + lint + format) 통과
6. `npm run build` 성공

---

## ROADMAP.md 업데이트

Phase AF 아래에 "Phase ML: 5대 리그 매치데이" 섹션 추가. 기존 Phase 8-10은 그대로 유지.
