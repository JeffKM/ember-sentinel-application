# Task 018: 선수 데이터 연동 (F006, F007, F008, F011)

## Context

선수 검색 페이지(`/players`)와 프로필 페이지(`/players/[playerId]`)가 하드코딩된 12명의 모의 데이터로 동작 중. DB에는 이미 `players`, `player_season_stats`, `player_match_stats` 테이블이 있고 sync 서비스로 실데이터가 저장되어 있음. Task 016/017과 동일한 패턴(Repository → DB → Server Component)으로 모의 데이터를 실제 DB 데이터로 교체하는 것이 목표.

## 변경 파일 목록

| 파일                                                   | 동작     | 설명                                                                           |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `lib/repositories/mappers.ts`                          | 수정     | PlayerRow, PlayerSeasonStatsRow, PlayerMatchStatsRow 타입 + 변환 함수 3개 추가 |
| `lib/repositories/player-repository.ts`                | **신규** | 5개 DB 쿼리 함수                                                               |
| `lib/repositories/team-repository.ts`                  | 수정     | `getAllTeams()` 함수 추가                                                      |
| `lib/repositories/index.ts`                            | 수정     | player-repository + getAllTeams re-export                                      |
| `app/(app)/players/page.tsx`                           | 수정     | mock → DB 조회 (SSR)                                                           |
| `app/(app)/players/_components/player-search-page.tsx` | 수정     | mock searchPlayers → 인라인 filterPlayers, seasonStatsMap props 추가           |
| `app/(app)/players/_components/player-card-grid.tsx`   | 수정     | mock import 제거, seasonStatsMap props 수신                                    |
| `app/(app)/players/[playerId]/page.tsx`                | 수정     | mock → repository 호출, Promise.all 병렬 조회                                  |

## 단계별 구현

### 단계 1: DB Row 타입 + 변환 함수 (`mappers.ts`)

기존 패턴(FixtureRow → Fixture)을 따라 3개 추가:

- `PlayerRow` → `playerRowToPlayer()` — position 캐스팅, snake_case → camelCase
- `PlayerSeasonStatsRow` → `playerSeasonStatsRowToStats()` — context JSONB에서 각 스탯의 StatContext 추출, xg/xa null 처리
- `PlayerMatchStatsRow` → `playerMatchStatsRowToStats()`

context JSONB 키 이름은 `db-mappers.ts`의 `seasonStatsToDbRow()`에서 camelCase(`goals`, `assists`, `keyPasses` 등)로 저장하므로 동일 키로 접근.

### 단계 2: `player-repository.ts` 신규 생성

기존 repository 패턴(createClient → select → mapper) 그대로:

```
getAllPlayers()                    → Player[]                          검색 페이지 SSR 전체 로드
getPlayerById(id)                 → Player | null                     프로필 페이지
getPlayerSeasonStats(playerId, season) → PlayerSeasonStats | null     프로필 시즌 스탯
getPlayerSeasonStatsByIds(ids, season)  → Map<number, PlayerSeasonStats>  검색 카드 배치 조회 (N+1 방지)
getMatchStatsByPlayerId(playerId)      → PlayerMatchStats[]           최근 10경기 폼 스파크라인
```

### 단계 3: `team-repository.ts`에 `getAllTeams()` 추가 + index.ts re-export

검색 페이지에서 전체 팀 목록이 필요 (combobox에서 팀명 표시용). 기존 `getTeamsByIds` 패턴과 동일.

### 단계 4: 검색 페이지 DB 연동

**page.tsx**: `mockPlayers`/`mockTeams` → `getAllPlayers()` + `getAllTeams()` + `getPlayerSeasonStatsByIds()` (Promise.all)

- `seasonStatsMap`을 `Record<number, PlayerSeasonStats>`로 Client에 전달 (Map은 serialization 불가)

**player-search-page.tsx**: `searchPlayers` mock import 제거 → 인라인 `filterPlayers()` 함수로 교체 (이름/팀/포지션/국적 필터). `seasonStatsMap` props를 `PlayerCardGrid`에 전달.

**player-card-grid.tsx**: `getPlayerSeasonStats` mock import 제거 → props의 `seasonStatsMap[player.id]`로 조회.

### 단계 5: 프로필 페이지 DB 연동

**[playerId]/page.tsx**: mock 4개 함수 → repository 3개 함수로 교체

- `getPlayerById(id)` → player
- Promise.all: `getTeamsByIds([teamId])`, `getPlayerSeasonStats(id, CURRENT_SEASON_LABEL)`, `getMatchStatsByPlayerId(id)`
- `notFound()` 패턴 유지

### 단계 6: 검증

1. `npm run type-check` — 타입 에러 확인
2. `npm run build` — SSR 빌드 확인
3. Playwright MCP로 브라우저 검증:
   - `/players`에서 실제 선수 데이터 표시 확인
   - "Salah" 검색 → Mohamed Salah 결과 표시
   - 실제 player ID로 `/players/[id]` 접속 → DB 스탯 렌더링
   - 존재하지 않는 ID → 404 표시 (500 아님)
4. mock 파일은 `compare` 페이지에서 여전히 사용하므로 삭제하지 않음

## 참고: context 기본값 이슈

현재 sync 시점에서 context가 `DEFAULT_STAT_CONTEXT (rank:0, percentile:0, prevSeason:null)`로 저장됨. 카드에 "리그 0위"가 표시될 수 있음. Task 019(맥락 데이터 계산 엔진)에서 해결 예정이므로 이번 scope에서는 rank=0일 때 맥락 텍스트를 숨기는 처리만 추가.
