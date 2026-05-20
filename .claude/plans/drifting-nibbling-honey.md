# Phase 3 첫 작업: 토큰 저장 + SportMonks API 서비스 레이어 + Supabase DB 스키마

## Context

Phase 2 (UI/UX) 완료 후, Phase 3 (백엔드 및 데이터 연동)을 시작합니다.
SportMonks API 토큰 검증 결과 정상 작동 확인. Starter(Trial) 플랜으로 PL(ID: 8) 데이터 접근 가능.
**단, xG/xA 데이터는 Starter 플랜에서 미지원** — nullable 처리 필요.

---

## Step 1: 토큰 저장 및 환경 설정

### 1-1. `.env.local`에 환경변수 추가

```
SPORTMONKS_API_KEY=NUoTdHJpsout4yCeQAqrwRJw9l0KHNeap31lDhPQTKoAprYUx79xj6rzn9vH
```

### 1-2. `next.config.ts` — SportMonks CDN 이미지 허용

- `images.remotePatterns`에 `cdn.sportmonks.com` 추가

### 1-3. `server-only` 패키지 설치

```bash
npm install server-only
```

### 1-4. `.env.example` 업데이트 (선택)

```
SPORTMONKS_API_KEY=your_sportmonks_api_key
```

---

## Step 2: SportMonks API 서비스 레이어 (`lib/api/sportmonks/`)

### 파일 구조

```
lib/api/sportmonks/
├── constants.ts    — 리그ID, 시즌ID, stat type_id 매핑
├── types.ts        — SportMonks Raw API 응답 타입
├── client.ts       — fetch 기반 HTTP 클라이언트 (server-only)
├── mappers.ts      — Raw → App 타입 변환
├── fixtures.ts     — 경기 API 함수
├── players.ts      — 선수 API 함수
├── teams.ts        — 팀/순위 API 함수
├── rounds.ts       — 라운드/게임위크 API 함수
└── index.ts        — re-export
```

### 데이터 흐름

```
SportMonks API → client.ts (fetch+auth) → types.ts (Raw 타입)
    → {fixtures,players,teams,rounds}.ts (도메인 서비스)
    → mappers.ts (Raw → App 타입 변환)
    → types/{player,fixture,team}.ts (앱 내부 타입)
```

### 2-1. `constants.ts` — 핵심 상수

- `SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3"`
- `PL_LEAGUE_ID = 8`, `CURRENT_SEASON_ID = 25583`
- `STAT_TYPE_ID`: Goals(52), Assists(79), Rating(118), KeyPasses(117), Dribbles(109), MinutesPlayed(119), ShotsTotal(42), ShotsOnTarget(86), Tackles(78), Interceptions(100), Passes(80), AccuratePasses(116), Appearances(321), BigChancesCreated(580) 등
- `EVENT_TYPE_ID`: Goal(14), OwnGoal(15), Penalty(16), Substitution(18), YellowCard(19), RedCard(20)
- `POSITION_MAP`: 24→GK, 25→DEF, 26→MID, 27→FWD + 세부 포지션(148~158) 매핑
- `LINEUP_TYPE_ID`: Starting(11), Bench(12), Sidelined(13)
- `SCORE_TYPE_ID`: Current(1525), FirstHalf(1), SecondHalf(2)

### 2-2. `types.ts` — SportMonks Raw 타입

- `SmApiResponse<T>`, `SmPaginatedResponse<T>` (pagination, rate_limit 포함)
- `SmTeam`, `SmPlayer`, `SmFixture`, `SmStanding`, `SmRound`
- `SmPlayerStatistic`, `SmStatDetail` (type_id + value 구조)
- `SmEvent`, `SmLineup`, `SmScore`, `SmFixtureStatistic`
- `SmFixtureParticipant` (meta.location: "home"|"away")

### 2-3. `client.ts` — HTTP 클라이언트

- `import "server-only"` — 클라이언트 번들링 방지
- `sportMonksFetch<T>(endpoint, options)` 함수
- **인증**: `Authorization` 헤더에 토큰 직접 전달
- **필터 형식**: `?filters=key:value;key:value` (세미콜론 구분, 검증 완료)
- **include 형식**: `?include=a;b.nested` (세미콜론 구분)
- Next.js `fetch` 캐싱 활용 (`revalidate`, `tags`)
- `AbortController` 타임아웃 (10초)
- `SportMonksApiError`, `RateLimitError` 에러 클래스

### 2-4. 도메인 서비스 함수 (주요)

**fixtures.ts:**

- `getFixturesByRound(roundId)` — 게임위크별 경기 (includes: participants, scores, events, lineups, statistics, state, round)
- `getFixtureById(fixtureId)` — 경기 상세
- `getLiveFixtures()` — 라이브 경기
- `getH2HFixtures(teamA, teamB)` — H2H 5경기

**players.ts:**

- `getPlayerById(playerId)` — 선수 상세 (statistics.details, teams.team, nationality, position)
- `searchPlayers(query)` — 이름 검색
- `getSquadByTeamAndSeason(teamId, seasonId)` — 팀 스쿼드

**teams.ts:**

- `getLeagueTeams(seasonId)` — PL 전체 팀
- `getTeamById(teamId)` — 팀 상세
- `getStandings(seasonId)` — 리그 순위표 (details, participant, form)

**rounds.ts:**

- `getSeasonRounds(seasonId)` — 시즌 전체 라운드
- `getCurrentRound()` — 현재 라운드

### 2-5. `mappers.ts` — 타입 변환

- `mapSmTeamToTeam(raw) → Team`
- `mapSmPlayerToPlayer(raw) → Player`
- `mapSmPlayerToSeasonStats(raw, season, contextData?) → PlayerSeasonStats`
  - xg/xa: Starter 플랜 미지원 → `null` 반환
  - extractStatValue(details, typeId) 헬퍼
- `mapSmFixtureToFixture(raw) → Fixture`
  - scores에서 CURRENT(1525) type_id로 최종 스코어 추출
  - events 매핑 (type_id → FixtureEventType)
  - statistics → FixtureLiveStats (팀별 분리)
  - lineups → Lineup (Starting/Bench 분리)
  - state.developer_name → FixtureStatus (NS/LIVE/FT)
- `mapSmStandingToTeamStanding(raw) → TeamStanding`
- `mapSmFixtureToH2H(raw) → H2HResult`

---

## Step 3: 타입 수정 (xG/xA nullable)

### 변경 대상 파일

- **`types/player.ts`**: `xg: number` → `xg: number | null`, `xgContext: StatContext` → `xgContext: StatContext | null` (xa도 동일)
- **`lib/mock/player-stats.ts`**: 더미 데이터에서 xg/xa 값 유지 (null 아님 — 더미는 가상 데이터)
- **UI 컴포넌트**: xG/xA null 시 "데이터 없음" 표시 또는 대체 지표(BigChancesCreated 등) 표시

---

## Step 4: Supabase DB 스키마

### 마이그레이션 파일 구조

```
supabase/migrations/
├── 0001_create_tables.sql    — 테이블 + 인덱스 + 트리거
├── 0002_rls_policies.sql     — RLS 정책
└── 0003_seed_glossary.sql    — 용어 사전 시드
```

### 테이블 목록 (8개)

| 테이블                | 설명                                     | PK                                    |
| --------------------- | ---------------------------------------- | ------------------------------------- |
| `teams`               | PL 20팀                                  | SportMonks team_id                    |
| `players`             | ~550명 선수                              | SportMonks player_id                  |
| `player_season_stats` | 시즌 누적 스탯 + context(JSONB)          | SERIAL (unique: player_id+season)     |
| `player_match_stats`  | 경기별 스탯                              | SERIAL (unique: player_id+fixture_id) |
| `fixtures`            | 경기 정보 (events/lineups/stats는 JSONB) | SportMonks fixture_id                 |
| `standings`           | 리그 순위표                              | SERIAL (unique: team_id+season)       |
| `glossary`            | 축구 용어 사전                           | text id (xg, xa, etc.)                |
| `injuries`            | 부상/결장                                | SERIAL                                |
| `sync_logs`           | 동기화 로그                              | SERIAL                                |

### 핵심 설계 결정

- **ID 체계**: SportMonks ID를 PK로 직접 사용 (별도 매핑 불필요)
- **복합 데이터**: events, lineups, live_stats는 JSONB (구조화 쿼리 불필요, 전체를 앱에 전달)
- **context**: player_season_stats.context JSONB에 순위/백분위/전년비교 저장
- **xG/xA**: `REAL NULL` (향후 플랜 업그레이드 시 자동 채워짐)
- **RLS**: 읽기 공개, 쓰기 service_role만
- **updated_at**: 트리거 자동 갱신
- **player_id_mapping**: Phase 3에서는 SportMonks만 사용하므로 생략 가능 (필요시 추가)

---

## Step 5: 검증용 디버그 API 라우트

```
app/api/debug/sportmonks/
├── fixtures/route.ts   — GET: 현재 라운드 경기 목록 반환
├── players/route.ts    — GET: 선수 검색 (?q=Salah)
└── standings/route.ts  — GET: PL 순위표 반환

app/api/health/route.ts — DB 연결 + API 키 확인
```

---

## xG/xA 미지원 대응 → nullable 유지 (확정)

1. `PlayerSeasonStats.xg/xa`를 `number | null`로 변경
2. `TeamLiveStats.xg`를 `number | null`로 변경
3. UI에서 null 시 "N/A" 표시
4. 매퍼에서 xG/xA detail이 존재하면 자동 추출하도록 코드 준비 (향후 플랜 업그레이드 대비)

---

## 수정 대상 기존 파일

| 파일               | 변경 내용                               |
| ------------------ | --------------------------------------- |
| `.env.local`       | `SPORTMONKS_API_KEY` 추가               |
| `next.config.ts`   | `cdn.sportmonks.com` 이미지 호스트 추가 |
| `types/player.ts`  | xg/xa nullable 변경                     |
| `types/fixture.ts` | TeamLiveStats.xg nullable 변경 (선택)   |
| `package.json`     | `server-only` 의존성 추가               |

## 신규 생성 파일

| 파일                                         | 설명            |
| -------------------------------------------- | --------------- |
| `lib/api/sportmonks/constants.ts`            | API 상수        |
| `lib/api/sportmonks/types.ts`                | Raw API 타입    |
| `lib/api/sportmonks/client.ts`               | HTTP 클라이언트 |
| `lib/api/sportmonks/fixtures.ts`             | 경기 서비스     |
| `lib/api/sportmonks/players.ts`              | 선수 서비스     |
| `lib/api/sportmonks/teams.ts`                | 팀 서비스       |
| `lib/api/sportmonks/rounds.ts`               | 라운드 서비스   |
| `lib/api/sportmonks/mappers.ts`              | 타입 변환       |
| `lib/api/sportmonks/index.ts`                | re-export       |
| `supabase/migrations/0001_create_tables.sql` | DB 스키마       |
| `supabase/migrations/0002_rls_policies.sql`  | RLS 정책        |
| `supabase/migrations/0003_seed_glossary.sql` | 용어 시드       |
| `app/api/debug/sportmonks/fixtures/route.ts` | 디버그 API      |
| `app/api/debug/sportmonks/players/route.ts`  | 디버그 API      |
| `app/api/health/route.ts`                    | 헬스체크        |

---

## 검증 방법

### API 서비스 레이어

1. `npm run dev` 후 `http://localhost:3000/api/debug/sportmonks/fixtures` → JSON 응답 확인
2. `http://localhost:3000/api/debug/sportmonks/players?q=Salah` → 선수 데이터 확인
3. `http://localhost:3000/api/debug/sportmonks/standings` → 순위표 확인

### DB 스키마 (Supabase MCP 사용 — 확정)

1. Supabase MCP `apply_migration`으로 마이그레이션 적용
2. `http://localhost:3000/api/health` → DB 연결 성공 확인
3. Supabase MCP `list_tables`로 테이블 생성 확인

### 타입 체크

```bash
npm run type-check   # TypeScript 에러 없음 확인
npm run validate     # 전체 검증
```
