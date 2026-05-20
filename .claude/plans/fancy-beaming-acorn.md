# PL 선수 데이터 동기화 → Scouting 페이지 연동

## Context

Scouting 페이지가 `scoutlab_players` 테이블에서 선수 목록을 읽지만, 이 테이블이 비어있어 선수 검색이 불가능한 상태.
football-data.org API의 `/competitions/PL/teams` 엔드포인트로 PL 20팀의 전체 스쿼드(약 500명)를 **1회 API 호출**로 가져올 수 있음.
가져온 데이터를 `players` 테이블과 `scoutlab_players` 테이블 양쪽에 저장하고, scorers 데이터로 보강.

### 한계
- football-data.org 무료 티어는 상세 메트릭(xG, xA, 백분위 등) 미제공
- Scouting 페이지에서 선수 검색/선택은 가능하지만, 메트릭 탭들은 데이터 없이 빈 상태로 표시됨
- 포지션 매핑이 축소됨: API 4가지(GK/Defence/Midfield/Offence) → scoutlab 7가지 중 3가지(CB/MF/FW)만 자동 배정

---

## 작업 1: ROADMAP.md 업데이트

`docs/ROADMAP.md`에 새 Phase 추가:

**위치**: Phase RK 다음, Phase 8 이전에 삽입

```markdown
## Phase PD: PL 선수 데이터 동기화 — 진행 중

football-data.org squad 엔드포인트로 PL 20팀의 전체 선수 데이터를 `players` + `scoutlab_players` 테이블에 동기화. Scouting 페이지에서 선수 검색이 가능하도록 기반 데이터 적재.

- **Task PD01: 포지션 매핑 + 시즌 변환 유틸** ⬜
  - `lib/constants/football.ts`: `SCOUTLAB_POSITION_MAP` (GK→null, Defence→CB, Midfield→MF, Offence→FW)
  - `lib/constants/football.ts`: `toScoutlabSeason()` ("2025/2026" → "25/26")

- **Task PD02: 나이 계산 유틸** ⬜
  - `lib/api/football-data/mappers.ts`: `calculateAge(dateOfBirth)` 함수

- **Task PD03: 선수 동기화 핵심 로직** ⬜
  - `lib/services/sync/sync-players.ts`: stub → 실제 구현
  - `getCompetitionTeams("PL")` 1회 호출 → 20팀 ~500명 squad
  - teams 테이블 upsert (FK 보장) → players 테이블 upsert (GK 포함) → scoutlab_players 테이블 upsert (GK 제외)
  - scorers 보강: 등번호 + 출전시간 근사값

- **Task PD04: 디버그 엔드포인트** ⬜
  - `app/api/debug/football-data/sync-players/route.ts`: 신규
  - `app/api/debug/football-data/sync/route.ts`: syncPlayers 호출 추가

- **Task PD05: 데이터 동기화 실행 + 검증** ⬜
  - 디버그 엔드포인트 호출로 PL 선수 데이터 적재
  - `/scouting` 페이지에서 선수 검색 작동 확인
```

**기능-Task 매핑 테이블에 추가:**
```
| F134    | PL 선수 데이터 동기화    | Task PD01~PD05 |
```

**최종 업데이트/진행 상황 라인 수정:**
- 날짜: 2026-05-12
- Phase PD 추가

---

## 범위

이 계획은 **작업 1(ROADMAP.md 업데이트)만** 수행합니다.
작업 2(코드 구현)는 별도 진행합니다.
