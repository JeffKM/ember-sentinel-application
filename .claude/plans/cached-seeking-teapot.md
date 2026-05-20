# Task 016: 매치데이 데이터 연동 (F001, F002)

## Context

매치데이 대시보드(`/matchday`)가 현재 `lib/mock/` 더미 데이터를 사용 중. Task 011(DB), Task 012(API), Task 015(Cron)이 완료되어 Supabase DB에 실제 PL 경기 데이터가 동기화되고 있으므로, 더미 → 실제 DB 데이터로 전환하고 TanStack Query 기반 라이브 폴링을 구현한다.

---

## 구현 단계

### Step 1: TanStack Query 설치 및 Provider 설정

- `npm install @tanstack/react-query`
- **새 파일** `components/providers/query-provider.tsx` — QueryClientProvider (Client Component)
  - staleTime: 60초, refetchOnWindowFocus: false, retry: 2
- **수정** `app/(app)/layout.tsx` — QueryProvider 래핑 추가

### Step 2: DB → 앱 역방향 매퍼

- **새 파일** `lib/repositories/mappers.ts`
  - `fixtureRowToFixture()` — snake_case 컬럼 → camelCase. JSONB(events, live_stats, lineups)는 camelCase로 저장되어 있어 내부 변환 불필요
  - `teamRowToTeam()` — short_code→shortName, logo_url→logoUrl
  - `standingRowToStanding()` — goal_difference(GENERATED), form(JSONB) 등
- 참조: `lib/services/sync/db-mappers.ts`의 역방향

### Step 3: Repository 레이어

- **새 파일** `lib/repositories/fixture-repository.ts`
  - `getCurrentGameweek()` — LIVE 경기 gameweek → NS(미래) 가장 가까운 gameweek → FT(최근) gameweek → fallback 1
  - `getFixturesByGameweek(gw)` — `fixtures` 테이블 쿼리 + 매퍼
- **새 파일** `lib/repositories/team-repository.ts`
  - `getTeamsByIds(ids)` — IN 쿼리 → `Map<number, Team>`
- **새 파일** `lib/repositories/standing-repository.ts`
  - `getStandingsByTeamIds(ids, season)` — IN 쿼리 → `Map<number, TeamStanding>`
- **새 파일** `lib/repositories/index.ts` — re-export

### Step 4: 폴링용 API Route

- **새 파일** `app/api/matchday/fixtures/route.ts`
  - `GET /api/matchday/fixtures?gw=N`
  - 응답: `ApiResponse<MatchdayData>` (fixtures, teams, standings, gameweek, hasLive)
  - hasLive: `fixtures.some(f => f.status === "LIVE")` — 클라이언트 폴링 간격 결정용

### Step 5: 커스텀 훅 + Client Component

- **새 파일** `lib/hooks/use-matchday-fixtures.ts`
  - `useMatchdayFixtures(gameweek, initialData)`
  - `refetchInterval`: hasLive ? 60초 : 5분 (함수형 동적 전환)
  - `refetchIntervalInBackground: false` (비활성 탭 폴링 중단)
- **새 파일** `app/(app)/matchday/_components/matchday-content.tsx` (Client Component)
  - 훅 사용 + 날짜별 그룹핑 + FixtureCard 렌더링

### Step 6: matchday/page.tsx 리팩터링

- **수정** `app/(app)/matchday/page.tsx`
  - mock import 제거 → repository import
  - `DEFAULT_GW` 하드코딩 제거 → `getCurrentGameweek()` 호출
  - `groupFixturesByDate`, `buildDateRange` 별도 유틸로 추출
  - Server Component에서 DB 조회 → initialData 구성 → MatchdayContent에 전달

---

## 데이터 흐름

```
[SSR 초기 로드]
/matchday → page.tsx(SC) → Repository → Supabase DB → initialData → MatchdayContent(CC)

[폴링]
MatchdayContent(CC) → useMatchdayFixtures → fetch(/api/matchday/fixtures?gw=N) → Repository → Supabase DB → JSON → UI 갱신
```

## 파일 요약

| 구분       | 파일                                                  | 역할                         |
| ---------- | ----------------------------------------------------- | ---------------------------- |
| 새         | `components/providers/query-provider.tsx`             | TanStack Query Provider      |
| 새         | `lib/repositories/mappers.ts`                         | DB row → 앱 타입 매퍼        |
| 새         | `lib/repositories/fixture-repository.ts`              | fixtures 쿼리 + 현재 GW 감지 |
| 새         | `lib/repositories/team-repository.ts`                 | teams 배치 쿼리              |
| 새         | `lib/repositories/standing-repository.ts`             | standings 배치 쿼리          |
| 새         | `lib/repositories/index.ts`                           | re-export                    |
| 새         | `app/api/matchday/fixtures/route.ts`                  | 폴링용 API 엔드포인트        |
| 새         | `lib/hooks/use-matchday-fixtures.ts`                  | 매치데이 폴링 훅             |
| 새         | `app/(app)/matchday/_components/matchday-content.tsx` | 폴링 Client Component        |
| 수정       | `app/(app)/matchday/page.tsx`                         | mock → repository 교체       |
| 수정       | `app/(app)/layout.tsx`                                | QueryProvider 추가           |
| 수정 안 함 | FixtureCard, GameweekHeader 등                        | props 변경 없음              |

## 검증

1. `/matchday` 접속 → 실제 PL 팀명 렌더링 확인 (더미 아님)
2. 네트워크 탭에서 `/api/matchday/fixtures?gw=N` 폴링 요청 확인
3. 경기 없는 gameweek → EmptyGameweek 빈 상태 UI
4. 페이지 새로고침 → 데이터 일관성 유지
5. `?gw` 없이 접속 → 현재 gameweek 자동 감지
