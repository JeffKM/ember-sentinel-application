# Phase RK: Ranking 5대 리그 확장

## Context

Ranking 페이지가 현재 EPL만 활성화되어 있고 나머지 4개 리그(La Liga, Serie A, Bundesliga, Ligue 1)는 Lock 아이콘 + "Coming Soon"으로 잠겨있다. 5대 리그 모두 순위표를 보여주도록 확장한다.

**핵심 문제**: `standings` 테이블에 `league_id` 컬럼이 없어 리그별 필터링 불가. 팀 데이터는 fixtures sync가 이미 5대 리그 팀을 upsert하고 있어 별도 처리 불필요.

---

## Task RK01: DB 마이그레이션 — standings.league_id 추가

**수정 파일**: `supabase/migrations/0009_standings_league_id.sql` (신규)

```sql
ALTER TABLE standings ADD COLUMN IF NOT EXISTS league_id INTEGER NOT NULL DEFAULT 2021;
CREATE INDEX IF NOT EXISTS idx_standings_league_id ON standings(league_id);
```

- 기존 `(team_id, season)` UNIQUE 제약 유지 (팀 ID가 리그별로 고유)
- DEFAULT 2021(PL) — 기존 데이터 자동 적용
- Supabase MCP `apply_migration`으로 적용

**검증**: `execute_sql`로 컬럼 존재 + 인덱스 확인

---

## Task RK02: 타입/매퍼 업데이트

### `types/team.ts` — TeamStanding에 leagueId 추가
```typescript
leagueId: number;
```

### `lib/repositories/mappers.ts` — StandingRow + standingRowToStanding
- `StandingRow`에 `league_id: number` 추가
- `standingRowToStanding()`에서 `leagueId: row.league_id` 매핑

### `lib/api/football-data/mappers.ts` — mapFdStandingToTeamStanding
- `leagueId` 파라미터 추가 (기본값 2021)
- 반환값에 `leagueId` 포함

### `lib/services/sync/db-mappers.ts` — standingToDbRow
- `standing.leagueId` → `league_id` 포함

**검증**: `npm run type-check`

---

## Task RK03: Sync 서비스 확장

### `lib/services/sync/sync-teams.ts`

1. `syncStandings(leagueCode, leagueId)` — leagueId 파라미터 추가, `mapFdStandingToTeamStanding(raw, leagueId)` 전달
2. `syncAllLeagueStandings()` — `league.id`를 `syncStandings`에 전달
3. `syncAllLeagueTeams()` (신규) — 5대 리그 팀 순차 동기화 (rate-limiter가 자동 대기)

### `lib/services/sync/index.ts` — syncAllLeagueTeams re-export

### `app/api/cron/sync-teams/route.ts`
- `syncTeams()` + `syncStandings()` → `syncAllLeagueTeams()` + `syncAllLeagueStandings()`

### `app/api/debug/football-data/standings/route.ts`
- `?code=PL` 쿼리 파라미터 지원 (기본값 PL)

**Rate limit**: 팀 5요청 + 순위 5요청 = 10요청/분 (슬라이딩 윈도우가 자동 대기)

**검증**: `npm run validate` + debug sync 엔드포인트 호출

---

## Task RK04: Repository 리그별 순위 조회

### `lib/repositories/standing-repository.ts`

```typescript
/** 5대 리그 전체 순위 조회 → Map<leagueId, TeamStanding[]> */
export const getAllLeagueStandings = cache(...)
```

- `standings` 테이블에서 `league_id IN (5대리그 ID)` + `season` 조건
- position 오름차순 정렬
- 결과를 `Map<number, TeamStanding[]>`로 그루핑

### `lib/repositories/index.ts` — getAllLeagueStandings export 추가

**검증**: `npm run type-check`

---

## Task RK05: Ranking 페이지 UI 업데이트

### `app/(app)/ranking/page.tsx`
- `getAllStandings()` → `getAllLeagueStandings()` 교체
- `standingsMap: Map<number, TeamStanding[]>` 전달

### `app/(app)/ranking/_components/ranking-content.tsx`
- `Lock` import + Coming Soon 카드 제거
- 모든 리그 탭 활성화 (`disabled` 속성 제거)
- props: `standingsMap: Map<number, TeamStanding[]>`
- 각 탭에서 `standingsMap.get(league.id)` → `StandingsTable` 렌더
- 빈 데이터 시 empty state 표시

### `app/(app)/ranking/_components/standings-table.tsx`
- `leagueId` prop 추가
- `getPositionClass(position, leagueId)` — 리그별 하이라이트 규칙:

| 리그 | UCL(파랑) | UEL(주황) | UECL(초록) | 강등PO(연빨) | 강등(빨강) |
|------|-----------|-----------|------------|-------------|-----------|
| EPL | 1-4 | 5 | — | — | 18-20 |
| La Liga | 1-4 | 5 | 6 | — | 18-20 |
| Serie A | 1-4 | 5 | 6 | — | 18-20 |
| Bundesliga | 1-4 | 5 | 6 | 16 | 17-18 |
| Ligue 1 | 1-3 | 4 | — | 16 | 17-18 |

- 범례 동적 표시 (UECL, 강등PO가 있는 리그만)

**검증**: `npm run build` + 브라우저에서 5개 탭 전환 확인

---

## Task RK06: 데이터 동기화 + 통합 검증

1. debug sync 엔드포인트(`/api/debug/football-data/sync`) 호출 — 5대 리그 fixtures+standings 동기화
2. Supabase `execute_sql`로 검증:
   ```sql
   SELECT league_id, COUNT(*) FROM standings WHERE season='2025/2026' GROUP BY league_id;
   ```
   - 예상: 2021(20), 2014(20), 2019(20), 2002(18), 2015(18) = 총 96행
3. 브라우저에서 각 리그 탭 순위표 확인
4. `npm run validate` + `npm run build` 통과 확인

---

## Task RK07: ROADMAP.md 업데이트

`docs/ROADMAP.md`에 Phase RK 섹션 추가 + 기능-Task 매핑 테이블 갱신.

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/0009_standings_league_id.sql` | 신규: league_id 컬럼 + 인덱스 |
| `types/team.ts` | TeamStanding에 leagueId 필드 추가 |
| `lib/repositories/mappers.ts` | StandingRow.league_id + standingRowToStanding 매핑 |
| `lib/api/football-data/mappers.ts` | mapFdStandingToTeamStanding에 leagueId 파라미터 |
| `lib/services/sync/db-mappers.ts` | standingToDbRow에 league_id 포함 |
| `lib/services/sync/sync-teams.ts` | syncStandings/syncAllLeagueStandings leagueId 전달, syncAllLeagueTeams 추가 |
| `lib/services/sync/index.ts` | syncAllLeagueTeams re-export |
| `lib/repositories/standing-repository.ts` | getAllLeagueStandings 함수 추가 |
| `lib/repositories/index.ts` | getAllLeagueStandings export |
| `app/(app)/ranking/page.tsx` | getAllLeagueStandings 사용, standingsMap 전달 |
| `app/(app)/ranking/_components/ranking-content.tsx` | 모든 리그 활성화, Lock/Coming Soon 제거 |
| `app/(app)/ranking/_components/standings-table.tsx` | leagueId prop, 리그별 하이라이트 규칙, 동적 범례 |
| `app/api/cron/sync-teams/route.ts` | syncAllLeagueTeams + syncAllLeagueStandings |
| `app/api/debug/football-data/standings/route.ts` | ?code 쿼리 파라미터 |
| `docs/ROADMAP.md` | Phase RK 섹션 추가 |
