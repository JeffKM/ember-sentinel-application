# Plan: API-Football → football-data.org 마이그레이션

## Context

API-Football(100요청/일) → football-data.org(10요청/분, 무료) 전환.
무료 플랜 제약으로 **라이브 스코어, 라인업, 경기 통계, 카드/교체 이벤트** 기능 제거.
DB는 ID 체계가 완전히 다르므로 **truncate + 재동기화** 전략 채택.

### football-data.org 무료 플랜 요약
- 인증: `X-Auth-Token` 헤더
- Rate limit: **분당 10회** (일일 제한 없음)
- 12개 대회 접근 (5대 리그 포함)
- 제공: 경기 일정/결과, 순위표, 득점 순위, 팀 스쿼드, 골 정보
- 미제공: 라이브 스코어, 라인업, 경기 통계(점유율/슈팅), 카드/교체 이벤트
- 리그 코드: PL, PD(La Liga), SA, BL1, FL1
- 이미지: `crests.football-data.org/{id}.svg` (SVG)

---

## TASK 분할 (9개)

### FD01: API 클라이언트 계층 생성 (`lib/api/football-data/`)

**신규 생성:**
- `lib/api/football-data/client.ts` — HTTP 래퍼 (`X-Auth-Token`, 분당 10회 rate limiter)
- `lib/api/football-data/types.ts` — Raw 타입 (FdMatch, FdTeam, FdStanding, FdScorer 등)
- `lib/api/football-data/fixtures.ts` — `getCompetitionMatches()`, `getMatchById()`, `getMatchesByDate()`
- `lib/api/football-data/teams.ts` — `getCompetitionTeams()`, `getTeamById()`
- `lib/api/football-data/standings.ts` — `getCompetitionStandings()`
- `lib/api/football-data/scorers.ts` — `getCompetitionScorers()`
- `lib/api/football-data/mappers.ts` — Raw→App 변환 (FdMatch→Fixture, FdTeam→Team, 등)
- `lib/api/football-data/rate-limiter.ts` — 슬라이딩 윈도우 분당 10회
- `lib/api/football-data/index.ts`

**핵심 변경점:**
- 상태 매핑: SCHEDULED/TIMED→NS, FINISHED/AWARDED→FT, POSTPONED→POSTP, IN_PLAY/PAUSED→NS(무료)
- 포지션 매핑: Goalkeeper→GK, Defence→DEF, Midfield→MID, Offence→FWD
- form 파싱: "W,W,D,L,W" (쉼표 구분)

**테스트:** 디버그 엔드포인트로 API 호출 + 매퍼 변환 결과 확인

---

### FD02: 상수 및 환경변수 업데이트

**수정 파일:**
- `lib/constants/football.ts` — 리그 ID/코드 전체 변경, LeagueConfig에 `code` 필드 추가
  - PL_LEAGUE_ID=39 → PL_COMPETITION_CODE="PL", PL_COMPETITION_ID=2021
  - MCITY_TEAM_ID=50 → 65 (football-data.org 기준)
  - TOP5_LEAGUES: id+code 업데이트 (2021/PL, 2014/PD, 2019/SA, 2002/BL1, 2015/FL1)
  - FIXTURE_STATUS_MAP: API-Football 상태→football-data.org 상태로 전환
  - POSITION_MAP: "Attacker"→"Offence" 등
- `.env.local` — `API_FOOTBALL_KEY` → `FOOTBALL_DATA_API_KEY`
- `app/api/health/route.ts` — 환경변수명 참조 변경
- `CLAUDE.md` — API 문서 업데이트

**테스트:** `npm run type-check`으로 참조 오류 확인

---

### FD03: 라이브 시스템 전체 제거

**삭제 파일 (12개):**
- `lib/services/live/live-fixture-service.ts`
- `lib/services/live/live-writeback.ts`
- `lib/hooks/use-score-change.ts`
- `app/(app)/matchday/_components/score-flash.tsx`
- `app/(app)/matchday/_components/goal-notification.tsx`
- `app/(app)/matchday/_components/live-pulse.tsx`
- `app/(app)/matchday/[fixtureId]/_components/live-tab.tsx`
- `app/(app)/matchday/[fixtureId]/_components/event-timeline.tsx`
- `app/(app)/matchday/[fixtureId]/_components/lineup-display.tsx`
- `app/(app)/matchday/[fixtureId]/_components/lineup-player-dot.tsx`
- `app/(app)/matchday/[fixtureId]/_components/stat-bar.tsx`
- `app/(app)/matchday/[fixtureId]/_components/auto-refresh-indicator.tsx`

**수정 파일:**
- `types/fixture.ts` — FixtureStatus에서 "LIVE" 제거, events→goals, liveStats/lineups/minute 제거
- `app/api/matchday/fixtures/route.ts` — 라이브 병합 로직 제거, hasLive 항상 false
- `app/api/matchday/fixture/route.ts` — 라이브 병합 제거
- `app/(app)/matchday/_components/matchday-content.tsx` — 스코어 감지/알림 제거
- `app/(app)/matchday/_components/fixture-card.tsx` — LivePulse/ScoreFlash/liveStats 제거
- `app/(app)/matchday/_components/fixture-status-badge.tsx` — LIVE 분기 제거
- `app/(app)/matchday/[fixtureId]/_components/fixture-tabs.tsx` — 3탭→2탭 (Pre/Post)
- `app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx` — 탭 자동전환 제거
- `app/(app)/matchday/[fixtureId]/_components/postmatch-tab.tsx` — StatBar/EventTimeline→간단 골 목록
- `app/(app)/matchday/[fixtureId]/_components/match-header.tsx` — ScoreFlash 제거
- `lib/hooks/use-fixture-detail.ts` — LIVE 폴링 제거
- `lib/hooks/use-matchday-fixtures.ts` — hasLive 분기 제거, 고정 5분 간격

**테스트:** 매치데이 페이지 로드 + 경기 상세 2탭 전환 확인 (`npm run build` 통과)

---

### FD04: 동기화 서비스 재작성

**수정 파일:**
- `lib/services/sync/sync-fixtures.ts` — `getCompetitionMatches(code, season)` 기반, matchday 직접 사용
- `lib/services/sync/sync-players.ts` — `getTeamById(id)` squad 포함, 개별 선수 상세 불가
- `lib/services/sync/sync-stats.ts` — `getCompetitionScorers()` 기반 (득점/어시 한정) 또는 축소
- `lib/services/sync/db-mappers.ts` — goals 필드 변경
- `lib/services/sync/gameweek-assigner.ts` — matchday 직접 제공으로 단순화
- `lib/services/sync/retry.ts` — DailyLimitError→RateLimitError

**Rate limit 대응:** 5대 리그 순차, 요청 간 7초 대기 (분당 8~9요청)

**테스트:** `/api/cron/sync-fixtures` 수동 호출 → DB 데이터 확인

---

### FD05: DB 마이그레이션 (ID 체계 전환)

**신규:** `supabase/migrations/0008_football_data_migration.sql`
- FK 순서대로 TRUNCATE (player_match_stats→player_season_stats→injuries→standings→fixtures→players→teams)
- fixtures status CHECK 업데이트: LIVE 제거
- league_id 기본값: 39→2021

**테스트:** 마이그레이션 적용 후 테이블 비어있는지 확인, sync 후 재적재 확인

---

### FD06: API Routes + 디버그 엔드포인트

**수정:** 매치데이 API routes (TASK 3에서 라이브 제거 후 캐시 헤더 단순화)
**삭제:** `app/api/debug/api-football/` 전체
**신규:** `app/api/debug/football-data/{matches,standings,quota,scorers}/route.ts`
**수정:** cron 라우트들의 import 경로 (sync 함수 내부 변경으로 자동 반영)

**테스트:** 각 디버그 엔드포인트 호출 확인

---

### FD07: 인프라 설정 (이미지, CSP)

**수정:**
- `next.config.ts` — 이미지 도메인: `media.api-sports.io` → `crests.football-data.org`, CSP 업데이트
- SVG 이미지이므로 `next/image` unoptimized 옵션 필요 여부 확인

**테스트:** 팀 로고 SVG 렌더링 + CSP 위반 없는지 확인

---

### FD08: H2H 서비스 DB 기반 전환

**수정:** `lib/services/h2h.ts` — API 호출 대신 DB fixtures 테이블에서 직접 H2H 조회
```
fixtures WHERE (home=A AND away=B) OR (home=B AND away=A) AND status=FT ORDER BY date DESC LIMIT 5
```
API 호출 0회로 rate limit 절약.

**테스트:** 경기 상세 페이지 H2H 섹션 확인

---

### FD09: 레거시 코드 삭제 + ROADMAP/CLAUDE.md 업데이트

**삭제:**
- `lib/api/api-football/` 전체 디렉토리
- `lib/services/live/` 전체 디렉토리

**수정:**
- `docs/ROADMAP.md` — Phase FD (football-data.org 마이그레이션) 추가
- `CLAUDE.md` — API 참조 업데이트

**테스트:** `npm run build` + `npm run validate` 통과

---

## 실행 순서

```
1. FD01 + FD03 (병행 — API 클라이언트 생성 & 라이브 제거)
2. FD02 + FD07 + FD08 (병행 — 상수/인프라/H2H, FD01 완료 후)
3. FD04 (동기화 — FD02 완료 후)
4. FD05 (DB 마이그레이션 — FD04 완료 후)
5. FD06 (API Routes — FD03+FD04 완료 후)
6. FD09 (정리 — 모든 TASK 완료 후)
```

## 검증 계획

각 TASK 완료마다:
1. `npm run type-check` — 타입 오류 확인
2. `npm run build` — 빌드 성공 확인
3. 해당 TASK의 기능별 테스트 (디버그 엔드포인트, 페이지 로드 등)

최종 통합 테스트:
1. 매치데이: 날짜별 5대 리그 경기 목록
2. 경기 상세: Pre-match / Post-match 2탭
3. 순위표: 정상 표시
4. `npm run validate` 전체 통과
