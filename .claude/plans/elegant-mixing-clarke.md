# Phase FD: football-data.org 마이그레이션 계획

## Context

API-Football(100요청/일 무료 플랜, 토큰 만료 예정) → football-data.org(10요청/분 무료 플랜)으로 전환.
무료 티어 제약으로 라이브 스코어, 라인업, 경기 통계, 카드/교체 이벤트 기능 제거 필요.
마이그레이션 후 5대 리그 2025-2026 시즌 전체 경기를 DB에 적재.

## 실행 순서

### FD01: API 클라이언트 계층 생성 + API 키 테스트
**생성**: `lib/api/football-data/` (client, types, fixtures, teams, standings, scorers, mappers, rate-limiter, index)

- Base URL: `https://api.football-data.org/v4/`
- 인증: `X-Auth-Token` 헤더 (`FOOTBALL_DATA_API_KEY`)
- Rate limiter: 분당 10회 슬라이딩 윈도우 (타임스탬프 배열)
- 주요 엔드포인트:
  - `GET /v4/competitions/{code}/matches` — 리그 전체 경기
  - `GET /v4/competitions/{code}/standings` — 순위표
  - `GET /v4/competitions/{code}/teams` — 팀 목록
  - `GET /v4/competitions/{code}/scorers` — 득점 순위
  - `GET /v4/matches/{id}` — 단일 경기
- Competition codes: PL, PD(La Liga), SA, BL1, FL1
- 매퍼: `mapFdMatchToFixture`, `mapFdTeamToTeam`, `mapFdStandingToTeamStanding`
- **테스트**: 디버그 엔드포인트로 각 API 호출 검증

### FD02: 상수 및 환경변수 업데이트
**수정**: `lib/constants/football.ts`, `.env.local`, `CLAUDE.md`

- `PL_LEAGUE_ID`: 39 → 2021
- `MCITY_TEAM_ID`: 50 → 65
- `LeagueConfig`에 `code` 필드 추가 ("PL", "PD", "SA", "BL1", "FL1")
- `TOP5_LEAGUES[].id`: 39→2021, 140→2014, 135→2019, 78→2002, 61→2015
- `FIXTURE_STATUS_MAP`: SCHEDULED/TIMED→"NS", IN_PLAY/PAUSED→"LIVE", FINISHED→"FT", POSTPONED→"POSTP"
- `CUP_LEAGUE_IDS`: 제거 (무료 티어에서 컵 동기화 스코프 외)
- 환경변수: `API_FOOTBALL_KEY` → `FOOTBALL_DATA_API_KEY`

### FD03: 라이브 시스템 전체 제거
**삭제**: `lib/services/live/`, 라이브 컴포넌트 10+개, `lib/hooks/use-score-change.ts`
**수정**: `types/fixture.ts`, matchday 컴포넌트 15+개, API routes 2개

- `Fixture` 타입: `minute`, `liveStats`, `lineups` 필드 제거
- `FixtureEventType`: goal만 유지 (substitution/yellow_card/red_card 제거)
- `TeamLiveStats`, `FixtureLiveStats`, `LineupPlayer`, `Lineup` 인터페이스 삭제
- API routes: 라이브 데이터 병합, writeback 로직 제거
- 매치데이 UI: ScoreFlash, GoalNotification, LivePulse, AutoRefreshIndicator 삭제
- FixtureTabs: Live 탭 제거 → Pre-match / Post-match 2탭 구성
- PostmatchTab: StatBar 제거, 이벤트 타임라인은 goals만 표시
- `FixtureRow`, `fixtureToDbRow`, `fixtureRowToFixture`: 해당 필드 제거

### FD05: DB 마이그레이션 (ID 체계 전환)
**생성**: `supabase/migrations/0008_football_data_migration.sql`

- TRUNCATE CASCADE 전체 테이블 (teams, fixtures, standings, players 등)
- DROP COLUMN: `fixtures.minute`, `fixtures.live_stats`, `fixtures.lineups`
- `fixtures.league_id` DEFAULT: 39 → 2021
- "LIVE" 상태는 유지 (향후 유료 전환 대비)

### FD07: 인프라 설정 (이미지 도메인, CSP)
**수정**: `next.config.ts`

- `images.remotePatterns`: `media.api-sports.io` → `crests.football-data.org`
- `dangerouslyAllowSVG: true` 추가 (football-data.org는 SVG 크레스트 제공)
- CSP `img-src`: `media.api-sports.io` → `crests.football-data.org`

### FD04: 동기화 서비스 재작성
**수정**: `lib/services/sync/sync-fixtures.ts`, `sync-teams.ts`

- `syncLeagueFixtures(league)` → `getCompetitionMatches(league.code)` 호출
- `matchday` 필드 직접 사용 (parseRoundNumber 불필요)
- 팀 정보: 응답의 `homeTeam.tla`/`homeTeam.crest` 활용
- `syncAllLeagueStandings()` 추가: 5대 리그 순위 동기화
- `syncCupFixtures()` 제거 (무료 티어 스코프 외)
- 선수 동기화: scorers 엔드포인트로 축소 또는 보류

### FD06: 디버그 엔드포인트 + 초기 데이터 적재
**삭제**: `app/api/debug/api-football/` 전체
**생성**: `app/api/debug/football-data/{fixtures,standings,teams,quota,sync}/route.ts`

- 동기화 트리거 엔드포인트로 5대 리그 전체 적재 실행
- 각 디버그 엔드포인트로 API 응답 및 적재 결과 검증

### FD08: H2H 서비스 DB 기반 전환
**수정**: `lib/services/h2h.ts` 또는 `lib/services/fixture-detail-service.ts`

- API 호출 → DB 쿼리로 전환: `fixtures` 테이블에서 두 팀 맞대결 조회
- `status='FT'` AND 양 팀 조건 → 최근 5경기 반환

### FD09: 레거시 코드 삭제 + 최종 검증
**삭제**: `lib/api/api-football/` 전체 디렉토리 (9개 파일)

- `npm run validate` 통합 검증
- Grep으로 "api-football", "api-sports", "ApiFootball" 잔존 확인
- ROADMAP.md Phase FD 전체 ✅ 처리

## 검증 계획

각 태스크 완료 시:
1. `npm run type-check` — 타입 에러 없음
2. `npm run build` — 빌드 성공
3. 해당 기능 동작 확인 (디버그 엔드포인트 / 브라우저)
4. ROADMAP.md 해당 Task ✅ 업데이트

최종 검증:
- `npm run validate` 통과
- 매치데이 페이지 정상 렌더링 (5대 리그 경기 표시)
- 순위표 페이지 정상 표시
- 팀 로고(SVG) 정상 렌더링
