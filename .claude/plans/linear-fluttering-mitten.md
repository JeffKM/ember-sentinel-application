# 매치데이 Fixture 데이터 적재 계획

## Context

매치데이 페이지에 경기 일정이 표시되지 않는 문제. API-Football 마이그레이션(0007)에서 데이터가 TRUNCATE된 이후 Cron이 실행되지 않아 DB가 비어있는 상태. 기존 동기화 엔드포인트를 활용하여 데이터를 적재해야 함.

## 실행 계획

### Step 1: 5대 리그 Fixtures + Teams 적재 (필수)

개발 서버 실행 중인 상태에서:

```bash
curl -s http://localhost:3000/api/debug/api-football/sync-leagues | jq
```

- `syncAllLeagueFixtures()` 호출 → 5대 리그 순차 동기화
- **5 API 요청** 소모 (일일 100회 중)
- fixtures 테이블 + teams 테이블 동시 적재 (fixture 응답에서 팀 정보 자동 추출)
- 이것만으로 매치데이 페이지 정상 동작

### Step 2: PL 순위표 적재 (선택, 권장)

```bash
curl -s http://localhost:3000/api/cron/sync-teams | jq
```

- `syncTeams()` + `syncStandings()` 호출
- **2 API 요청** 추가 소모
- standings 테이블 적재 → 매치데이에서 팀 순위 표시 가능

### Step 3: 편의 스크립트 추가

`package.json`에 추가:

```json
"seed:fixtures": "curl -sf http://localhost:3000/api/debug/api-football/sync-leagues && curl -sf http://localhost:3000/api/cron/sync-teams"
```

이후 `npm run seed:fixtures`로 한 번에 실행 가능 (개발 서버 실행 필수).

## 수정 대상 파일

- `package.json` — `seed:fixtures` 스크립트 추가 (1줄)

## 검증 방법

```bash
# 1. API 사용량 확인
curl http://localhost:3000/api/debug/api-football/quota

# 2. 매치데이 페이지 확인
# http://localhost:3000/matchday 접속하여 오늘 날짜 경기 노출 확인

# 3. (선택) DB 직접 확인 — Supabase Dashboard에서 fixtures 테이블 row count
```

## 비고

- 총 API 요청: 7회 (100회/일 한도 중 7%)
- 시즌: 2025/2026 (CURRENT_SEASON = 2025)
- 오늘(2026-05-11)은 시즌 막바지이므로 대부분 FT 상태일 것
