# 컵 경기 GW 할당 알고리즘 수정

## Context

FA Cup 3월 7일 경기(NEW vs MCI)가 GW31(3월 21일)에 잘못 할당됨. GW29(3월 4일)에 가까우므로 GW29에 할당되어야 함.

**근본 원인**: `assignGameweek()`가 PL 전체 팀의 라운드 `starting_at~ending_at` midpoint 기준으로 GW를 찾는데, 라운드 범위가 일정 변경/연기로 매우 넓어져 midpoint가 왜곡됨.

**해결**: 맨시티의 실제 PL 경기 날짜를 DB에서 조회하여 GW별 "앵커"로 사용. 컵 경기를 가장 가까운 앵커에 할당.

## 변경 파일

### 1. `lib/services/sync/gameweek-assigner.ts`
- `McityPlAnchor` 인터페이스 추가: `{ gameweek: number; date: Date }`
- `assignGameweekByAnchors(fixtureDate, anchors)` 함수 추가: 앵커 날짜 기준 최근접 GW 반환
- 기존 `buildGameweekRanges`, `assignGameweek`는 디버그용으로 유지

### 2. `lib/services/sync/sync-fixtures.ts` — `syncCupFixtures()`
- PL 라운드 대신 DB에서 맨시티 PL 경기 조회 (`league_id=8, home/away=MCITY_TEAM_ID`)
- `McityPlAnchor[]` 빌드 후 `assignGameweekByAnchors()` 사용
- PL 경기가 DB에 없으면 기존 라운드 기반 fallback 유지

### 3. `app/api/debug/sportmonks/cup-fixtures/route.ts`
- 새 앵커 기반 할당 결과도 응답에 포함 (기존 midpoint 결과와 비교 가능)

### 4. DB 즉시 수정
- FA Cup 3/7 경기(id: 19676913)의 gameweek을 31→29로 직접 UPDATE

## 검증
1. DB UPDATE 후 `localhost:3000/matchday?gw=31`에서 FA Cup 경기 사라짐 확인
2. `localhost:3000/matchday?gw=29`에서 FA Cup 경기 표시 확인
3. `/api/debug/sportmonks/cup-fixtures`에서 앵커 기반 할당 결과 검증
