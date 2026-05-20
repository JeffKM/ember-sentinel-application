# Task 015: 데이터 동기화 Cron 시스템 구축

## Context

SportMonks API에서 가져온 PL 데이터를 Supabase DB에 주기적으로 동기화하는 Cron 시스템이 필요하다. 현재 API 서비스 레이어(`lib/api/sportmonks/`)와 DB 스키마(9개 테이블)는 완성되어 있으나, 데이터를 실제로 DB에 저장하는 동기화 파이프라인이 없다. 이 시스템이 구축되면 Task 016(매치데이 데이터 연동)부터 DB 데이터를 활용한 UI 렌더링이 가능해진다.

## 핵심 설계 결정

1. **Supabase admin 클라이언트**: 기존 cookie 기반 `server.ts`는 Cron에서 사용 불가 → `lib/supabase/admin.ts`에 service_role key 기반 클라이언트 생성
2. **toDbRow 패턴**: 기존 매퍼(`mappers.ts`)는 수정하지 않고, DB 저장용 snake_case 변환 함수를 별도로 작성 (`db-mappers.ts`)
3. **Idempotency**: 모든 DB 쓰기가 upsert(ON CONFLICT)이므로 중복 실행해도 안전
4. **부분 실패 허용**: syncPlayers는 팀별 독립 처리, 한 팀 실패 시 나머지 계속 진행

## 파일 생성 목록

### 1. `lib/supabase/admin.ts` — service_role admin 클라이언트

- `createAdminClient()` 함수
- `SUPABASE_SERVICE_ROLE_KEY` 환경변수 사용
- `autoRefreshToken: false, persistSession: false`

### 2. `lib/services/sync/auth.ts` — Cron 인증

- `verifyCronAuth(request)`: `Authorization: Bearer <CRON_SECRET>` 헤더 검증
- 개발 환경에서는 인증 스킵

### 3. `lib/services/sync/log.ts` — sync_logs 유틸

- `SyncResult` 타입 + `writeSyncLog()` 함수

### 4. `lib/services/sync/db-mappers.ts` — 앱 타입 → DB row 변환

| 함수                   | 입력 타입         | 대상 테이블         | 주의사항                                     |
| ---------------------- | ----------------- | ------------------- | -------------------------------------------- |
| `teamToDbRow()`        | Team              | teams               | shortName → short_code                       |
| `playerToDbRow()`      | Player            | players             | number → jersey_number                       |
| `seasonStatsToDbRow()` | PlayerSeasonStats | player_season_stats | context 필드들을 JSONB 하나로 합침           |
| `fixtureToDbRow()`     | Fixture           | fixtures            | events/liveStats/lineups는 JSONB             |
| `standingToDbRow()`    | TeamStanding      | standings           | **goal_difference GENERATED 컬럼 제외 필수** |

### 5. `lib/services/sync/retry.ts` — rate limit 재시도 래퍼

- `withRetry(fn, maxRetries=1)`: RateLimitError 시 대기 후 1회 재시도

### 6~9. 동기화 서비스 함수

| 파일               | 함수                | API 호출                                                | 예상 요청수 |
| ------------------ | ------------------- | ------------------------------------------------------- | ----------- |
| `sync-teams.ts`    | `syncTeams()`       | `getLeagueTeams()`                                      | 1           |
| `sync-teams.ts`    | `syncStandings()`   | `getStandings()`                                        | 1           |
| `sync-players.ts`  | `syncPlayers()`     | `getLeagueTeams()` + `getSquadByTeamAndSeason()` × 20팀 | 21          |
| `sync-fixtures.ts` | `syncFixtures()`    | `getSeasonFixtures()` × ~8페이지                        | ~8          |
| `sync-stats.ts`    | `syncSeasonStats()` | `getSeasonPlayerStats()` × ~10페이지                    | ~10         |

흐름: API fetch → 기존 매퍼로 앱 타입 변환 → toDbRow로 DB 행 변환 → supabase.upsert() → writeSyncLog()

### 10. `lib/services/sync/index.ts` — re-export

### 11~14. Cron API 라우트 (`app/api/cron/`)

| 라우트                   | 호출 함수                     | maxDuration |
| ------------------------ | ----------------------------- | ----------- |
| `sync-teams/route.ts`    | syncTeams() + syncStandings() | 60s         |
| `sync-players/route.ts`  | syncPlayers()                 | 60s         |
| `sync-fixtures/route.ts` | syncFixtures()                | 60s         |
| `sync-stats/route.ts`    | syncSeasonStats()             | 60s         |

공통 패턴:

- `export const dynamic = "force-dynamic"`
- `verifyCronAuth()` → sync 함수 호출 → JSON 응답 `{ ok, results, timestamp }`

### 15. `vercel.json` — Cron 스케줄

```json
{
  "crons": [
    { "path": "/api/cron/sync-teams", "schedule": "0 4 * * 1" },
    { "path": "/api/cron/sync-players", "schedule": "0 5 * * 1" },
    { "path": "/api/cron/sync-fixtures", "schedule": "0 6 * * *" },
    { "path": "/api/cron/sync-stats", "schedule": "0 7 * * *" }
  ]
}
```

- 팀/선수: 주 1회 월요일 (시즌 중 변동 적음)
- 경기/스탯: 매일 (게임위크 결과 반영)
- 1시간 간격으로 배치하여 rate limit 분산
- 일간 최대 ~41 API 요청 (한도 2000 대비 2%)

### 16. 환경변수 추가

| 변수명                      | 용도                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | admin 클라이언트 인증 (Supabase 대시보드 > Settings > API) |
| `CRON_SECRET`               | Vercel Cron 인증 (임의 생성)                               |

## 검증 방법

1. `npm run type-check` — 타입 에러 없음 확인
2. `npm run build` — 빌드 성공 확인
3. 로컬에서 각 엔드포인트 수동 호출:
   ```bash
   curl http://localhost:3000/api/cron/sync-teams
   curl http://localhost:3000/api/cron/sync-players
   curl http://localhost:3000/api/cron/sync-fixtures
   curl http://localhost:3000/api/cron/sync-stats
   ```
4. Supabase 대시보드에서 테이블 데이터 확인
5. sync_logs 테이블에 성공/에러 로그 기록 확인
6. 인증 테스트: `Authorization` 헤더 없이 프로덕션에서 401 반환 확인
