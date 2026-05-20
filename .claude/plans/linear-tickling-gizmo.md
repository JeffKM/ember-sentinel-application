# 사이트 네비게이션 구조 전면 개편

## Context

현재 네비게이션은 Matchday, Squad, Compare, Gallery, Scouting 5개 항목으로 구성되어 있으나, 프로젝트 방향을 5대 리그 데이터 플랫폼으로 전환하면서 구조를 **HOME, MATCHDAY, RANKING, NEWS, SCOUTING**으로 변경한다. Compare와 Gallery는 삭제하고, Squad도 완전 삭제한다 (선수 프로필은 Scouting으로 대체).

## 변경 요약

| 기존 | 신규 | 비고 |
|------|------|------|
| _(로고 클릭)_ | **HOME** (`/`) | 기존 마케팅 랜딩 페이지로 이동 |
| Matchday | **MATCHDAY** (`/matchday`) | 유지 (5대리그 확장은 별도) |
| Squad | _(삭제)_ | 페이지+컴포넌트 완전 삭제 |
| Compare | _(삭제)_ | 페이지 삭제 (OG API는 유지) |
| Gallery | _(삭제)_ | 페이지 삭제 |
| _(신규)_ | **RANKING** (`/ranking`) | 5대 리그 순위표 (현재 EPL만 데이터) |
| _(신규)_ | **NEWS** (`/news`) | Coming Soon placeholder |
| Scouting | **SCOUTING** (`/scouting`) | 유지 |

---

## 구현 단계

### Step 1: 네비게이션 설정 변경

**`components/nav/nav-config.ts`** — 항목 교체
- 아이콘: `Users, Swords, Image` 제거 → `Home, Trophy, Newspaper` 추가
- 항목: `[Home(/), Matchday(/matchday), Ranking(/ranking), News(/news), Scouting(/scouting)]`

**`components/nav/app-header.tsx`** — `isActive` 로직 수정
- HOME(`/`)은 `pathname === "/"` 일 때만 활성화 (기존 `startsWith`는 모든 경로 매칭)

**`components/nav/mobile-tab-bar.tsx`** — 동일한 `isActive` 수정

### Step 2: 마케팅 헤더 업데이트

**`app/(marketing)/_components/comic-header.tsx`** — navItems 변경
- 기존: HOME, PLAYERS(/squad), MATCHDAY, SHARE(/gallery)
- 변경: HOME, MATCHDAY, RANKING(/ranking), SCOUTING(/scouting)

### Step 3: 새 페이지 생성

**`app/(app)/ranking/page.tsx`** (신규)
- 서버 컴포넌트, 5대 리그 순위 탭 UI
- standings + teams 데이터 조회

**`app/(app)/ranking/_components/ranking-content.tsx`** (신규)
- 클라이언트 컴포넌트, shadcn `Tabs`로 리그 전환
- EPL 탭: 순위표 렌더링 / 나머지 4개: Coming Soon

**`app/(app)/ranking/_components/standings-table.tsx`** (신규)
- 순위 테이블: #, Team, P, W, D, L, GF, GA, GD, Pts, Form
- 팀 로고+이름, 폼 뱃지(W/D/L), 순위별 색상 하이라이트

**`app/(app)/news/page.tsx`** (신규)
- Coming Soon placeholder (Newspaper 아이콘 + 안내 메시지)

### Step 4: 데이터 레이어 보강

**`lib/repositories/standing-repository.ts`** — `getAllStandings` 함수 추가
```ts
// 시즌 전체 순위 조회 (position 오름차순)
export const getAllStandings = cache(async (season: string) => { ... });
```

**`lib/repositories/index.ts`** — `getAllStandings` export 추가

### Step 5: 기존 참조 수정

**`app/(app)/matchday/[fixtureId]/_components/player-name-link.tsx`**
- `href={/squad/${playerId}}` → `href={/scouting?playerId=${playerId}}`
- Scouting의 scoutlab-search-params.ts에서 playerId 파라미터 이미 지원됨

**`app/sitemap.ts`**
- `/squad`, `/compare` 제거, `/ranking`, `/scouting`, `/news` 추가
- `getAllPlayers` 임포트 및 동적 player routes 제거

**`app/robots.ts`**
- allow: `["/matchday", "/ranking", "/scouting", "/news"]`
- disallow에서 `/more` 제거

### Step 6: 디렉토리 삭제

1. `app/(app)/gallery/` (1파일)
2. `app/(app)/more/` (1파일)
3. `app/(app)/compare/` (page, loading, _components/ 내 5파일)
4. `app/(app)/squad/` (page, loading, [playerId]/, _components/ 전체)

### Step 7: SEO 리다이렉트 (next.config.ts)

```ts
redirects: [
  { source: '/squad', destination: '/scouting', permanent: true },
  { source: '/squad/:playerId', destination: '/scouting?playerId=:playerId', permanent: true },
  { source: '/compare', destination: '/scouting/compare', permanent: true },
  { source: '/gallery', destination: '/', permanent: true },
]
```

---

## 핵심 파일 목록

| 파일 | 작업 |
|------|------|
| `components/nav/nav-config.ts` | 수정 |
| `components/nav/app-header.tsx` | 수정 |
| `components/nav/mobile-tab-bar.tsx` | 수정 |
| `app/(marketing)/_components/comic-header.tsx` | 수정 |
| `app/(app)/ranking/page.tsx` | 신규 |
| `app/(app)/ranking/_components/ranking-content.tsx` | 신규 |
| `app/(app)/ranking/_components/standings-table.tsx` | 신규 |
| `app/(app)/news/page.tsx` | 신규 |
| `lib/repositories/standing-repository.ts` | 수정 |
| `lib/repositories/index.ts` | 수정 |
| `app/(app)/matchday/[fixtureId]/_components/player-name-link.tsx` | 수정 |
| `app/sitemap.ts` | 수정 |
| `app/robots.ts` | 수정 |
| `next.config.ts` | 수정 (리다이렉트) |
| `app/(app)/gallery/` | 삭제 |
| `app/(app)/more/` | 삭제 |
| `app/(app)/compare/` | 삭제 |
| `app/(app)/squad/` | 삭제 |

## 재사용할 기존 코드

- `standingRowToStanding` 매퍼 (`lib/repositories/mappers.ts:218`)
- `TeamStanding` 타입 (`types/team.ts:15`)
- `StandingRow` 타입 (`lib/repositories/mappers.ts:50`)
- shadcn `Tabs`, `Table` 컴포넌트 (`components/ui/`)
- 기존 gallery/page.tsx Coming Soon 패턴 → news 페이지 참조

## 주의사항

- `/app/api/og/` (OG 이미지 API)는 독립적 — 삭제하지 않음
- `/app/(app)/scouting/compare/`는 유지 (삭제 대상은 `/compare`만)
- standings DB에 `league_id` 컬럼 없음 → EPL만 표시, 5대 리그 확장 시 마이그레이션 필요

## 검증 방법

1. `npm run validate` — 타입 체크 + 린트 + 포맷 통합 검증
2. `npm run build` — 프로덕션 빌드 성공 확인
3. 브라우저에서 확인:
   - 데스크탑 헤더/모바일 탭바: 5개 메뉴 정상 표시
   - HOME 클릭 → 랜딩 페이지 이동
   - `/ranking` → 순위표 정상 렌더링
   - `/news` → Coming Soon 표시
   - `/squad` → `/scouting`으로 리다이렉트
   - `/compare` → `/scouting/compare`로 리다이렉트
   - matchday 경기 상세 내 선수 이름 클릭 → scouting으로 이동
