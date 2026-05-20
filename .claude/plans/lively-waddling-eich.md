# Task 002: TypeScript 타입 정의 및 더미 데이터 구축

## Context

Phase 2 UI 개발(Task 004~010)과 Phase 3 백엔드 연동(Task 011~)의 기반이 되는 타입 시스템과 더미 데이터를 구축한다. 현재 각 페이지는 placeholder 텍스트만 표시하는 상태이며, 타입 정의 없이는 UI 개발을 시작할 수 없다.

## 파일 구조

```
types/
  api.ts           — ApiResponse<T>, ApiErrorResponse, PaginatedResponse<T>
  team.ts          — Team, TeamStanding
  player.ts        — Player, PlayerPosition, PlayerSeasonStats, PlayerMatchStats, PlayerIdMapping
  fixture.ts       — Fixture, FixtureStatus, FixtureEvent, FixtureLiveStats, Lineup 등
  glossary.ts      — GlossaryTerm
  radar.ts         — RadarDimension, RadarDataPoint, RadarData
  index.ts         — 전체 re-export

lib/mock/
  teams.ts         — 6개 팀 + getTeamById 헬퍼
  players.ts       — 12명 선수 + searchPlayers 헬퍼
  player-stats.ts  — 시즌 스탯(12) + 경기별 스탯(~120)
  fixtures.ts      — GW28 6경기 (FT 2, LIVE 2, NS 2)
  glossary.ts      — 축구 용어 15개
  index.ts         — 전체 re-export
```

## 타입 정의 핵심 설계

### 1. `types/api.ts`

- `ApiResponse<T>` — `{ data: T; error: null; timestamp: string }`
- `ApiErrorResponse` — `{ data: null; error: { code, message }; timestamp }`
- `PaginatedResponse<T>` — data 배열 + PaginationMeta
- `ApiResult<T>` = `ApiResponse<T> | ApiErrorResponse` (유니온으로 타입 내로잉 지원)

### 2. `types/team.ts`

- `Team` — id, name, shortName(3자), logoUrl, season
- `TeamStanding` — teamId, position, played, won, drawn, lost, goalsFor/Against, points, form(W/D/L[])

### 3. `types/player.ts`

- `PlayerPosition` = `"GK" | "DEF" | "MID" | "FWD"`
- `Player` — id, name, photoUrl, teamId, position, number, nationality
- `PlayerSeasonStats` — 핵심 수치 7개(goals, assists, xg, xa, keyPasses, dribbles, averageRating) 각각에 rank/percentile/prevSeason 맥락 필드 포함. radarData: RadarData 참조
  - PRD에는 goals만 맥락 필드가 명시되어 있지만, "모든 숫자에 맥락" 규칙을 충족하기 위해 전체 수치에 확장
  - prevSeason은 `number | null` (신규 선수 대응)
- `PlayerMatchStats` — fixtureId, rating, goals, assists, minutesPlayed
- `PlayerIdMapping` — sportmonksId, apiFootballId, verified

### 4. `types/radar.ts`

- `RadarDimension` = `"pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical"` (6축)
- `RadarDataPoint` — dimension, value(0-100), label
- `RadarData` — player[], positionAverage[], strengths[], weaknesses[]

### 5. `types/fixture.ts`

- `FixtureStatus` = `"NS" | "LIVE" | "FT"`
- `FixtureEvent` — type(goal/substitution/yellow_card/red_card), minute, teamId, playerId, playerName, xg?(골 이벤트용)
- `TeamLiveStats` — possession, shots, shotsOnTarget, xg, corners, fouls 등
- `FixtureLiveStats` — `{ home: TeamLiveStats; away: TeamLiveStats }` (홈/어웨이 분리)
- `LineupPlayer` — playerId, playerName, number, position, grid?
- `Lineup` — formation, startXI[], substitutes[]
- `Fixture` — homeScore/awayScore는 `number | null` (NS일 때 null), liveStats/lineups도 nullable

### 6. `types/glossary.ts`

- `GlossaryTerm` — id, term, definition, analogy, example

## 더미 데이터 내용

### 팀 (6개) — 빅6 실제 ID 사용

Arsenal(42), Chelsea(49), Liverpool(40), Man City(50), Man United(33), Tottenham(47)

### 선수 (12명) — 포지션별 분포

- GK 2: Ramsdale(ARS), Alisson(LIV)
- DEF 3: Saliba(ARS), Van Dijk(LIV), James(CHE)
- MID 4: Odegaard(ARS), De Bruyne(MCI), Bruno(MUN), Maddison(TOT)
- FWD 3: Salah(LIV), Haaland(MCI), Saka(ARS)

### 경기 (GW28, 6경기)

| fixture | 홈 vs 어웨이            | status | score |
| ------- | ----------------------- | ------ | ----- |
| 5001    | Arsenal vs Chelsea      | FT     | 2-1   |
| 5002    | Liverpool vs Man City   | FT     | 3-2   |
| 5003    | Man United vs Tottenham | LIVE   | 1-1   |
| 5004    | Chelsea vs Liverpool    | LIVE   | 0-0   |
| 5005    | Man City vs Arsenal     | NS     | —     |
| 5006    | Tottenham vs Man United | NS     | —     |

- FT 경기: events(3-5개), liveStats(완전), lineups(선발11+교체) 포함
- LIVE 경기: events(1-2개), liveStats(진행중), lineups 포함
- NS 경기: events=[], liveStats=null, lineups=null, score=null

### 용어 (15개)

xG, xA, xGI, Possession, Key Pass, Progressive Pass, Shot on Target, Clean Sheet, Dribble, Tackle, Aerial Duel, Pass Accuracy, Through Ball, Cross, Interception

### 헬퍼 함수 (각 mock 파일 내부)

- `getTeamById`, `getPlayerById`, `searchPlayers`, `getFixturesByGameweek` 등
- Phase 2 Server Component에서 데이터 조회 시뮬레이션으로 사용

## 페이지 수정 (최소한)

Playwright 검증("실제 PL 팀명 텍스트 확인")을 위한 최소 수정만 수행:

- `app/(app)/matchday/page.tsx` — mockFixtures + mockTeams import → "Gameweek 28" + 경기 목록(홈 vs 어웨이) 텍스트 표시
- `app/(app)/players/page.tsx` — mockPlayers import → 선수 이름/팀/포지션 리스트 표시
- `app/(app)/compare/page.tsx` — mockPlayers import → 데이터 준비 확인 텍스트
- `app/(app)/players/[playerId]/page.tsx` — getPlayerById import → 선수 기본 정보 표시
- `app/(app)/matchday/[fixtureId]/page.tsx` — getFixtureById import → 경기 기본 정보 표시

## 구현 순서

1. `types/` — api.ts → radar.ts → team.ts → glossary.ts → player.ts → fixture.ts → index.ts
2. `lib/mock/` — teams.ts → players.ts → player-stats.ts → fixtures.ts → glossary.ts → index.ts
3. 페이지 수정 — matchday → players → compare → 동적 라우트
4. 검증 — `npm run validate` + `npm run build`

## 코딩 규약

- named export만 사용 (page.tsx의 default export는 예외)
- camelCase 프로퍼티 (DB snake_case → Phase 3 매퍼에서 변환)
- `@/*` path alias
- 한국어 주석
- TypeScript strict mode 호환

## 검증

1. `npm run type-check` — 타입 에러 없음
2. `npm run lint` — ESLint 통과
3. `npm run format:check` — Prettier 통과
4. `npm run build` — 빌드 성공
5. 수동 확인: `/matchday`에서 "Arsenal", "Chelsea" 텍스트 표시, 콘솔 에러 없음
