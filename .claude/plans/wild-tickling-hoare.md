# Phase PD: PL 선수 데이터 동기화 구현 계획

## Context

football-data.org의 `/competitions/PL/teams` 엔드포인트는 각 팀의 `squad` 배열을 제공한다 (선수 ~25명/팀, 총 ~500명). 현재 `syncPlayers()`는 stub 상태이며, scouting 페이지(`/scouting`)는 `scoutlab_players` 테이블에 데이터가 있어야 선수 검색이 작동한다. Phase PD는 이 squad 데이터를 `players` + `scoutlab_players` 테이블에 동기화하여 scouting 기반 데이터를 적재한다.

---

## Task PD01: 포지션 매핑 + 시즌 변환 유틸

### 변경 파일
- `lib/constants/football.ts` — 상수 추가
- `lib/constants/__tests__/football.test.ts` — 신규 (테스트)

### 구현
```typescript
// lib/constants/football.ts에 추가

/** football-data.org 포지션 → ScoutLab 포지션 (GK → null: scoutlab 제외) */
export const SCOUTLAB_POSITION_MAP: Record<string, string | null> = {
  Goalkeeper: null,
  Defence: "CB",
  Defender: "CB",
  Midfield: "MF",
  Midfielder: "MF",
  Offence: "FW",
  Attacker: "FW",
};

/** 시즌 레이블 → ScoutLab 시즌 형식 ("2025/2026" → "25/26") */
export function toScoutlabSeason(seasonLabel: string): string {
  const [start, end] = seasonLabel.split("/");
  return `${start.slice(-2)}/${end.slice(-2)}`;
}
```

### 테스트 (`lib/constants/__tests__/football.test.ts`)
- `SCOUTLAB_POSITION_MAP`: GK→null, Defence/Defender→CB, Midfield/Midfielder→MF, Offence/Attacker→FW
- `toScoutlabSeason`: "2025/2026"→"25/26", "2024/2025"→"24/25", 일반적인 형식 검증

---

## Task PD02: 나이 계산 유틸

### 변경 파일
- `lib/api/football-data/mappers.ts` — 함수 추가
- `lib/api/football-data/__tests__/mappers.test.ts` — 신규 (테스트)

### 구현
```typescript
// lib/api/football-data/mappers.ts에 추가

/** 생년월일 → 현재 나이 (만 나이) */
export function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

### 테스트 (`lib/api/football-data/__tests__/mappers.test.ts`)
- 생년월일 기반 나이 계산 (기본 케이스)
- 아직 생일 안 지난 경우 (age - 1)
- 오늘이 생일인 경우

---

## Task PD03: 선수 동기화 핵심 로직

### 변경 파일
- `lib/api/football-data/mappers.ts` — 매퍼 함수 2개 추가
- `lib/services/sync/sync-players.ts` — stub → 실제 구현
- `lib/services/sync/__tests__/sync-players.test.ts` — 신규 (테스트)

### 매퍼 함수 (mappers.ts)
```typescript
/** FdSquadPlayer → Player (players 테이블용) */
export function mapFdSquadPlayerToPlayer(
  raw: FdSquadPlayer, teamId: number, teamName: string
): Player

/** FdSquadPlayer → scoutlab_players DB row (GK 제외 후 호출) */
export function mapFdSquadPlayerToScoutlabRow(
  raw: FdSquadPlayer, teamName: string, league: string, season: string
): ScoutlabPlayerRow
```

### syncPlayers 로직 (sync-players.ts)
```
1. getCompetitionTeams("PL") 호출 → 20팀 squad 취득
2. getCompetitionScorers("PL") 호출 → 득점자 정보 (등번호 + 출전경기수)
3. scorers Map 생성: playerId → { shirtNumber, playedMatches }
4. teams 테이블 upsert (FK 보장, 기존 syncTeams 패턴 재사용)
5. 전체 squad 순회:
   a. players 테이블 upsert (GK 포함) — POSITION_MAP 사용
   b. scoutlab_players 테이블 upsert (GK 제외) — SCOUTLAB_POSITION_MAP 사용
      - scorers에 있으면 등번호 보강
      - minutes_played: scorers의 playedMatches × 90 (근사값)
6. 결과 로그 기록
```

### 테스트 (`lib/services/sync/__tests__/sync-players.test.ts`)
- `mapFdSquadPlayerToPlayer`: 각 포지션 매핑 정확성, teamId 연결
- `mapFdSquadPlayerToScoutlabRow`: GK 제외 전제, 필드 매핑, 나이 계산
- scorers 보강 로직: 등번호/분 계산 (출전 × 90)
- `syncPlayers` 전체 흐름: API 호출 + DB upsert 모킹 (vi.mock)
  - 성공 케이스: teams + players + scoutlab_players 모두 upsert
  - GK는 players에만 삽입, scoutlab에 없음 검증
  - API 에러 시 error SyncResult 반환

---

## Task PD04: 디버그 엔드포인트

### 변경/신규 파일
- `app/api/debug/football-data/sync-players/route.ts` — 신규
- `app/api/debug/football-data/sync/route.ts` — syncPlayers 호출 추가

### 구현
```typescript
// sync-players/route.ts — 독립 디버그 엔드포인트
export async function GET() {
  if (process.env.NODE_ENV === "production") return 403;
  const result = await syncPlayers();
  return NextResponse.json({ result });
}

// sync/route.ts — 기존에 syncPlayers 호출 추가
const playerResult = await syncPlayers();
return { fixtures, standings, players: playerResult };
```

### 테스트
- 디버그 엔드포인트는 프로덕션 차단 로직만 확인 (간단한 단위 테스트)
- `app/api/debug/football-data/__tests__/sync-players-route.test.ts` — 신규

---

## Task PD05: 데이터 동기화 실행 + 검증

수동 실행 단계 (코드 변경 없음):
1. `npm run dev` 후 `/api/debug/football-data/sync-players` 호출
2. Supabase Dashboard에서 `players` 테이블 ~500행 확인
3. `scoutlab_players` 테이블에서 GK 제외 ~400행 확인
4. `/scouting` 페이지에서 Premier League 선수 검색 작동 확인

---

## 파일 변경 요약

| 파일 | 작업 |
|------|------|
| `lib/constants/football.ts` | `SCOUTLAB_POSITION_MAP`, `toScoutlabSeason()` 추가 |
| `lib/constants/__tests__/football.test.ts` | 신규 — PD01 테스트 |
| `lib/api/football-data/mappers.ts` | `calculateAge()`, `mapFdSquadPlayerToPlayer()`, `mapFdSquadPlayerToScoutlabRow()` 추가 |
| `lib/api/football-data/__tests__/mappers.test.ts` | 신규 — PD02+PD03 매퍼 테스트 |
| `lib/services/sync/sync-players.ts` | stub → 실제 동기화 구현 |
| `lib/services/sync/__tests__/sync-players.test.ts` | 신규 — PD03 통합 테스트 |
| `app/api/debug/football-data/sync-players/route.ts` | 신규 — PD04 엔드포인트 |
| `app/api/debug/football-data/sync/route.ts` | syncPlayers 호출 추가 |
| `app/api/debug/football-data/__tests__/sync-players-route.test.ts` | 신규 — PD04 테스트 |
| `docs/ROADMAP.md` | Phase PD 태스크 완료 체크 |

## 재사용 기존 코드

- `getCompetitionTeams()` — `lib/api/football-data/teams.ts`
- `getCompetitionScorers()` — `lib/api/football-data/scorers.ts`
- `mapFdTeamToTeam()` + `teamToDbRow()` — teams upsert 패턴
- `playerToDbRow()` — `lib/services/sync/db-mappers.ts`
- `POSITION_MAP` — `lib/constants/football.ts`
- `createAdminClient()` — `lib/supabase/admin.ts`
- `SyncResult`, `writeSyncLog()`, `extractErrorMessage()` — `lib/services/sync/log.ts`

## 검증

```bash
npm run test          # 새 테스트 전체 통과
npm run validate      # type-check + lint + format 통과
npm run build         # 프로덕션 빌드 성공
```
