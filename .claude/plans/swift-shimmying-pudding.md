# SportMonks → API-Football 마이그레이션 계획

## Context

SportMonks API 토큰이 만료(2026-04-04)되어 더 이상 사용하지 않음. 무료 API-Football API(100 요청/일)로 전환하여 데이터 소스를 교체하고, ROADMAP.md에 새 Phase를 추가함.

**핵심 차이점**:
- Base URL: `api.sportmonks.com/v3` → `v3.football.api-sports.io`
- 인증: `Authorization` 헤더 → `x-apisports-key` 헤더
- PL League ID: 8 → 39
- 시즌 형식: ID(25583) → 연도(2025)
- 맨시티 Team ID: 9 → 50
- Include 방식: `?include=a;b` → 별도 엔드포인트 (`/fixtures/events`, `/fixtures/lineups`, `/fixtures/statistics`)
- Filter 방식: `?filters=k:v;k:v` → 표준 쿼리 파라미터 (`?league=39&season=2025`)
- 요청 제한: 2000/시간 → **100/일** (최적화 필수)

**DB 전환 전략**: 기존 데이터 전체 초기화 후 API-Football ID로 재적재

---

## Phase AF: API-Football 마이그레이션

### Task AF01: 공통 상수 모듈 분리

API 소스에 무관한 상수를 별도 파일로 추출하고 API-Football ID로 교체.

- `lib/constants/football.ts` 신규 생성
  - `PL_LEAGUE_ID = 39`, `CURRENT_SEASON = 2025`, `CURRENT_SEASON_LABEL = "2025/2026"`
  - `MCITY_TEAM_ID = 50` (API-Football 기준)
  - `CUP_LEAGUE_IDS` (FA Cup=45, EFL Cup=48, UCL=2)
  - `LEAGUE_NAME_MAP`, `POSITION_MAP` (문자열 "Goalkeeper"→"GK" 등)
  - `FIXTURE_STATUS_MAP` ("1H"/"2H"/"HT"→"LIVE", "FT"/"AET"→"FT", "PST"→"POSTP", "NS"→"NS")
- 기존 `lib/api/sportmonks/constants.ts`에서 import하던 **9개 파일**의 import 경로를 `lib/constants/football.ts`로 교체:
  - `lib/services/fixture-detail-service.ts` (CURRENT_SEASON_LABEL)
  - `lib/repositories/fixture-repository.ts` (MCITY_TEAM_ID)
  - `lib/repositories/player-repository.ts` (MCITY_TEAM_ID)
  - `app/api/matchday/fixtures/route.ts` (CURRENT_SEASON_LABEL)
  - `app/api/og/route.tsx` (CURRENT_SEASON_LABEL)
  - `app/(app)/ranking/page.tsx` (CURRENT_SEASON_LABEL)
  - `app/(app)/matchday/page.tsx` (CURRENT_SEASON_LABEL)
  - `app/(app)/matchday/_components/competition-badge.tsx` (CUP_LEAGUE_IDS)
  - `app/(app)/matchday/_utils.ts` (PL_LEAGUE_ID)

### Task AF02: DB 마이그레이션 — ID 체계 전환

- `supabase/migrations/0007_api_football_migration.sql` 신규
  - teams, players, player_season_stats, player_match_stats, fixtures, standings 테이블 데이터 TRUNCATE
  - fixtures.league_id DEFAULT 8→39 변경
  - sync_logs 리셋

### Task AF03: API-Football HTTP 클라이언트

- `lib/api/api-football/client.ts` 신규
  - `x-apisports-key` 헤더 인증
  - 표준 쿼리 파라미터 빌더 (`?key=value&key=value`)
  - Next.js fetch 캐싱 (revalidate, tags)
  - 에러 처리: `ApiFootballError`, `DailyLimitError`
  - 타임아웃 10초 기본

### Task AF04: Raw 타입 정의

- `lib/api/api-football/types.ts` 신규 (~15개 타입)
  - `AfApiResponse<T>` (get, parameters, errors, results, paging, response)
  - `AfFixture` (fixture.id, fixture.status, league, teams, goals, score)
  - `AfFixtureEvent` (type: "Goal"/"Card"/"subst", detail, player, team)
  - `AfFixtureLineup` (team, formation, startXI, substitutes)
  - `AfFixtureStatistic` (team, statistics[{type, value}])
  - `AfTeam`, `AfPlayer`, `AfPlayerStatistics`
  - `AfStanding`, `AfSquadPlayer`

### Task AF05: 매퍼 구현

- `lib/api/api-football/mappers.ts` 신규 (10+개 매퍼)
  - `mapAfFixtureToFixture()` — status.short→FixtureStatus, goals→score, league.round→gameweek
  - `mapAfTeamToTeam()` — team.code→shortName
  - `mapAfPlayerToPlayer()` — player.position 문자열→"GK"/"DEF"/"MID"/"FWD"
  - `mapAfPlayerToSeasonStats()` — statistics[0]에서 goals/assists/rating 추출
  - `mapAfEventToFixtureEvent()` — type 문자열→이벤트 타입
  - `mapAfStandingToTeamStanding()` — flat 구조 (SportMonks details 배열 파싱 불필요)
  - `mapAfFixtureToH2HResult()`
  - `parseRoundNumber()` — "Regular Season - 10" → 10

### Task AF06: API 서비스 함수

4개 모듈 신규 생성:

- `lib/api/api-football/fixtures.ts`
  - `getAllSeasonFixtures(season)` — `/fixtures?league=39&season=2025` (380경기 1요청)
  - `getFixtureById(id)` — `/fixtures?id=X`
  - `getFixtureEvents(id)` — `/fixtures/events?fixture=X`
  - `getFixtureLineups(id)` — `/fixtures/lineups?fixture=X`
  - `getFixtureStatistics(id)` — `/fixtures/statistics?fixture=X`
  - `getLiveFixtures()` — `/fixtures?live=all`
  - `getH2HFixtures(teamA, teamB)` — `/fixtures/headtohead?h2h=A-B&last=5`
  - `getTeamFixtures(teamId, season)` — `/fixtures?team=X&season=2025`
- `lib/api/api-football/players.ts`
  - `searchPlayers(query)` — `/players?search=X&league=39`
  - `getPlayerById(id, season)` — `/players?id=X&season=2025`
  - `getTeamSquad(teamId)` — `/players/squads?team=X`
  - `getLeaguePlayers(page, season)` — `/players?league=39&season=2025&page=N`
- `lib/api/api-football/teams.ts`
  - `getLeagueTeams(season)` — `/teams?league=39&season=2025`
  - `getStandings(season)` — `/standings?league=39&season=2025`
- `lib/api/api-football/rounds.ts`
  - `getSeasonRounds(season)` — `/fixtures/rounds?league=39&season=2025`
  - `getCurrentRound(season)` — `/fixtures/rounds?league=39&season=2025&current=true`
- `lib/api/api-football/index.ts` — barrel re-export

### Task AF07: 동기화 서비스 업데이트

- `lib/services/sync/sync-fixtures.ts`
  - **핵심 최적화**: 39 요청 → 1 요청 (`getAllSeasonFixtures()`)
  - import 교체: sportmonks → api-football
  - 컵 경기: `getTeamFixtures(MCITY_TEAM_ID)` 1 요청으로 전체 조회
- `lib/services/sync/sync-players.ts`
  - 스쿼드: `getTeamSquad()` 1 요청
  - 개별 선수 상세: DB 우선 확인, 없으면 API 호출 (일일 한도 고려 배치 10명)
- `lib/services/sync/sync-teams.ts`
  - import 교체, 로직 동일 (2 요청)
- `lib/services/sync/sync-stats.ts`
  - `getLeaguePlayers(page)` 페이지네이션 일괄 조회 (~25 요청/500명)
  - Cron 주기: 매일 → 주 1회
- `lib/services/sync/gameweek-assigner.ts`
  - `SmRound` 타입 의존 제거, `parseRoundNumber()` 유틸 사용
- `lib/services/sync/retry.ts`
  - `RateLimitError` → `DailyLimitError` 교체
- `lib/services/sync/db-mappers.ts`
  - import 경로만 교체 (앱 내부 타입은 동일)

### Task AF08: 라이브 서비스 업데이트

- `lib/services/live/live-fixture-service.ts`
  - import 교체: sportmonks → api-football
  - 캐시 TTL: 30초 → **120초** (일일 한도 절약)
  - `getFixtureById()` 시 events/statistics 별도 호출 (필요시만)
  - 조건부 폴링: 킥오프 ±30분 범위에서만 라이브 API 호출
- `lib/services/h2h.ts`
  - import 교체, 매퍼 교체

### Task AF09: Cron 라우트 + 디버그 라우트 업데이트

- `app/api/cron/sync-*` 4개 라우트: import 경로 교체
- Cron 스케줄 조정 (주석/문서):
  - sync-fixtures: 매일 → 주 2회
  - sync-stats: 매일 → 주 1회
- `app/api/debug/sportmonks/` → `app/api/debug/api-football/` 교체
  - fixtures, players, standings, live, quota(일일 사용량 확인) 5개 라우트

### Task AF10: 일일 요청 카운터 + 안전장치

- `lib/api/api-football/rate-limiter.ts` 신규
  - 인메모리 카운터 (00:00 UTC 초기화)
  - 90 요청 이후 비필수 호출 차단 + 경고 로그
  - `client.ts`에서 매 요청마다 카운트 증가

### Task AF11: 환경 변수 + 레거시 정리

- `.env.local`: `SPORTMONKS_API_KEY` → `API_FOOTBALL_KEY`
- `CLAUDE.md`: API 관련 설명 업데이트
- `lib/api/sportmonks/` 전체 디렉토리 삭제
- `lib/api/sportmonks/__tests__/mappers.test.ts` 삭제
- 잔여 "sportmonks" import 참조 grep으로 확인/제거
- `lib/api/api-football/__tests__/mappers.test.ts` 신규 작성

### Task AF12: 통합 테스트 및 검증

- API 연결 확인: `/api/debug/api-football/fixtures` → 380경기 반환
- 동기화 확인: Cron 수동 호출 → DB 데이터 확인
- 라이브 확인: 경기일 `/api/matchday/fixtures?gw=N` → 라이브 병합
- 빌드 검증: `npm run validate` + `npm run build`
- 일일 요청 수 모니터링: 테스트 후 100 이내 확인

---

## 작업 순서 (의존성)

```
AF01 (상수) ──┬── AF02 (DB 마이그레이션)
              │
              └── AF03 (클라이언트) → AF04 (타입) → AF05 (매퍼) → AF06 (서비스 함수)
                                                                       │
                                                        ┌──────────────┼──────────────┐
                                                        ▼              ▼              ▼
                                                  AF07 (동기화)   AF08 (라이브)   AF09 (라우트)
                                                        │              │              │
                                                        └──────────────┴──────────────┘
                                                                       │
                                                        ┌──────────────┼──────────┐
                                                        ▼              ▼          ▼
                                                  AF10 (카운터)  AF11 (정리)  AF12 (테스트)
```

## 100 요청/일 예산 배분

| 시나리오 | 요청 수 | 비고 |
|---------|---------|------|
| 주간 동기화 (경기+팀+순위) | ~3 | 1+1+1 |
| 주간 선수 통계 | ~25 | 20명/page × 25페이지 |
| 경기일 라이브 폴링 (2분 간격 × 2시간) | ~60 | 실제 경기 시간만 |
| H2H/상세 on-demand | ~10 | DB 캐시 우선 |
| **비경기일 합계** | **~5** | |
| **경기일 합계** | **~70** | 100 이내 |

## ROADMAP.md 변경사항

`docs/ROADMAP.md`에 Phase AF 추가:
- Phase N1 아래, Phase 8 위에 삽입
- 현재 상태 표시 업데이트
- 기능-Task 매핑 테이블에 F129 추가

## 검증 방법

1. `npm run type-check` — 타입 에러 없음
2. `npm run validate` — lint + format + type-check 통과
3. `npm run build` — 프로덕션 빌드 성공
4. `/api/debug/api-football/fixtures` 호출 → 응답 확인
5. `/api/debug/api-football/standings` 호출 → 순위표 확인
6. Cron 수동 실행 → DB 데이터 적재 확인
