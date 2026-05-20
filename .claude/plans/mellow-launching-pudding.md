# PRD.md 수정 계획: API 전략 업데이트

## Context

SportMonks를 메인 API, API-Football을 보충 API로 사용하기로 결정. FPL API는 사용하지 않음.
PRD의 기술 스택, 데이터 모델, 그리고 API 매핑 정보를 업데이트해야 함.

## 변경 사항

### 1. 기술 스택 > 백엔드 & 데이터베이스 (L339~343)

**Before:**

```
- **Supabase** — PostgreSQL DB, 인증 ...
- **API-Football** (Ultra, $29/mo) — 라이브 스코어, 경기 일정, H2H, 선수 스탯, 라인업, 부상 정보
- **FPL API** (무료) — 선수별 xG, xA, xGI, ICT Index 보충
```

**After:**

```
- **Supabase** — PostgreSQL DB, 인증 (이메일 + Google OAuth 구현 완료), `@supabase/ssr` 기반
- **SportMonks API** (메인, European Basic €39/mo) — League ID: 8, 경기/라이브스코어, 선수 스탯, xG, 라인업, 부상, 순위, includes 시스템으로 중첩 데이터 조회
- **API-Football** (보충, Ultra $29/mo) — League ID: 39, SportMonks에서 커버되지 않는 H2H 상세, 예측, 추가 스탯 보충
```

### 2. 데이터 모델 > player_id_mapping 테이블 (L241~248)

**Before:**

```
| api_football_id | API-Football 선수 ID | Integer |
| fpl_id | FPL API 선수 ID | Integer |
```

**After:**

```
| sportmonks_id | SportMonks 선수 ID | Integer |
| api_football_id | API-Football 선수 ID | Integer |
```

### 3. 새 섹션 추가: "API 데이터 소스 매핑" (기술 스택 뒤, 정합성 검증 앞)

기능별로 어떤 API가 데이터를 제공하는지 매핑 테이블 추가:

| 데이터          | 메인 소스 (SportMonks)                                | 보충 소스 (API-Football) |
| --------------- | ----------------------------------------------------- | ------------------------ |
| 경기 일정/결과  | GET /fixtures (include: participants;scores;venue)    | /fixtures?league=39      |
| 라이브스코어    | GET /livescores (include: participants;scores;events) | /fixtures?live=all       |
| 경기 스탯       | GET /fixtures/{id} (include: statistics)              | /fixtures/statistics     |
| 라인업          | GET /fixtures/{id} (include: lineups)                 | /fixtures/lineups        |
| 경기 이벤트     | GET /fixtures/{id} (include: events)                  | /fixtures/events         |
| H2H             | GET /fixtures/head-to-head/{team1}/{team2}            | /fixtures/headtohead     |
| 선수 시즌 스탯  | GET /players/{id} (include: statistics)               | /players?league=39       |
| xG 데이터       | GET /fixtures/{id} (include: xGFixture)               | -                        |
| 부상/결장       | GET /players/{id} (include: sidelined)                | /injuries                |
| 팀 정보         | GET /teams/{id} (include: players)                    | /teams                   |
| 순위            | GET /standings/live/leagues/8                         | /standings?league=39     |
| 라운드/게임위크 | GET /rounds/seasons/{id}                              | /fixtures?round=         |

### 4. 새 섹션 추가: "데이터 동기화 전략" (API 매핑 뒤)

- 정적 데이터 (팀, 선수 기본정보): 시즌 초 1회 + 주 1회 Vercel Cron
- 시즌 스탯: 게임위크 종료 후 일간 Cron
- 경기 데이터: 매치데이 전날 프리매치 동기화
- 라이브 데이터: TanStack Query refetchInterval (60초 라이브, 5분 비라이브)
- xG/상세 스탯: 경기 종료 후 배치 동기화

## 수정 대상 파일

- `docs/PRD.md`

## 검증

- 변경 후 모든 기능 ID(F001~F014)가 API 매핑에 커버되는지 확인
- player_id_mapping에서 FPL 참조 완전 제거 확인
- 기술 스택에서 FPL API 참조 완전 제거 확인
