# 컵 대회 지원 + 연기 경기(POSTP) 상태 구현

## Context

현재 매치데이 페이지는 PL 경기만 표시하고, 연기된 경기(postp)를 NS로 잘못 매핑한다.
GW31의 맨시티 vs 크리스탈팰리스가 연기됐지만 0-0/NS로 보이고, 같은 주에 열린 카라바오컵 결승(vs 아스날)은 아예 표시되지 않는 문제.

**목표**: 모든 맨시티 대회(PL, FA Cup, Carabao Cup, UCL, Community Shield 등) 경기를 GW 뷰에 통합 표시하고, 연기 상태를 정확히 반영.

---

## Phase 0: SportMonks API 접근 테스트 (선행 조건)

Starter 플랜에서 컵 대회 데이터 접근 가능 여부 확인.

- [ ] 디버그 엔드포인트 생성: `app/api/debug/sportmonks/cup-fixtures/route.ts`
  - `GET /football/fixtures/between/{start}/{end}` + `fixtureTeamIds:9` 필터 테스트
  - 또는 `GET /football/teams/9/fixtures` 엔드포인트 확인
  - 리그 검색으로 실제 league_id 확인: `GET /football/leagues/search/FA Cup`, `EFL Cup`, `Champions League`
- **결과에 따라**: API 접근 불가시 수동 데이터 입력 또는 대안 API 검토

---

## Phase 1: POSTP 상태 추가 (API와 독립적)

컵 대회 여부와 무관하게 바로 구현 가능.

### 1-1. DB 마이그레이션
- **새 파일**: `supabase/migrations/0004_cup_and_postp.sql`
```sql
-- status CHECK 제약 업데이트 (POSTP 추가)
ALTER TABLE fixtures DROP CONSTRAINT IF EXISTS fixtures_status_check;
ALTER TABLE fixtures ADD CONSTRAINT fixtures_status_check
  CHECK (status IN ('NS','LIVE','FT','POSTP'));

-- league_id 컬럼 (대회 구분)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS league_id INTEGER DEFAULT 8;
UPDATE fixtures SET league_id = 8 WHERE league_id IS NULL;
ALTER TABLE fixtures ALTER COLUMN league_id SET NOT NULL;

-- competition_name 컬럼 (표시용)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS competition_name TEXT;

-- gameweek NULL 허용 (컵 경기는 원래 GW 없음)
ALTER TABLE fixtures ALTER COLUMN gameweek DROP NOT NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_fixtures_league_id ON fixtures(league_id);
```

### 1-2. 타입 업데이트
- **`types/fixture.ts`**: `FixtureStatus`에 `"POSTP"` 추가
- **`Fixture`** 인터페이스: `gameweek: number | null`, `leagueId: number`, `competitionName: string | null` 추가

### 1-3. 상수 매핑
- **`lib/api/sportmonks/constants.ts`**:
  - `FIXTURE_STATE_MAP`에서 `postp: "POSTP"` (기존 `"NS"` → `"POSTP"`)
  - 컵 대회 리그 ID 상수 + `LEAGUE_NAME_MAP` 추가

### 1-4. 매퍼 업데이트
- **`lib/api/sportmonks/mappers.ts`**: `mapSmFixtureToFixture`에 `leagueId`, `competitionName` 매핑
- **`lib/repositories/mappers.ts`**: `FixtureRow`에 `league_id`, `competition_name` 추가
- **`lib/services/sync/db-mappers.ts`**: `fixtureToDbRow`에 새 필드 포함

### 1-5. UI — POSTP 배지
- **`fixture-status-badge.tsx`**:
  ```tsx
  if (status === "POSTP") {
    return <Badge className="...border-comic-red bg-comic-red/10 text-comic-red">POSTPONED</Badge>
  }
  ```
- **`fixture-card.tsx`**: POSTP 경기 카드 스타일 (반투명, 빨간 보더, 클릭 비활성화)

---

## Phase 2: 컵 대회 통합 (API 테스트 후)

### 2-1. SportMonks API 확장
- **`lib/api/sportmonks/fixtures.ts`**:
  - `getCupFixturesByTeam(teamId, startDate, endDate)` — 날짜 범위 내 맨시티 비-PL 경기 조회
  - `getLiveMCityFixtures()` — PL 필터 → 맨시티 참가 경기 전체로 확장

### 2-2. 게임위크 할당 알고리즘
- **새 파일**: `lib/services/sync/gameweek-assigner.ts`
  - `buildGameweekRanges(rounds)`: PL 38라운드 → 날짜 범위 배열
  - `assignGameweek(fixtureDate, ranges)`: 컵 경기 날짜 → 가장 가까운 PL GW 할당
  - 30일 초과 거리 → null (시즌 외)

### 2-3. Sync 서비스 확장
- **`lib/services/sync/sync-fixtures.ts`**:
  - 기존 PL 38라운드 동기화 유지
  - 새로 `syncCupFixtures()`: 컵 경기 조회 → GW 할당 → DB upsert

### 2-4. UI — 대회 배지
- **새 파일**: `app/(app)/matchday/_components/competition-badge.tsx`
  - PL 경기엔 표시 안 함, 컵 경기만 대회명 배지 (FA Cup, EFL Cup, UCL 등)
  - 대회별 색상 분기 (UCL=스카이블루, FA=빨강, EFL=초록)
- **`fixture-card.tsx`**: 카드 상단에 CompetitionBadge 렌더링

### 2-5. Repository & API 라우트
- **`fixture-repository.ts`**: `getCurrentGameweek`에서 POSTP 제외 처리
- **`app/api/matchday/fixtures/route.ts`**: `hasKickedOff`에 POSTP 제외

---

## 수정 대상 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `types/fixture.ts` | FixtureStatus에 POSTP, Fixture에 leagueId/competitionName |
| `lib/api/sportmonks/constants.ts` | POSTP 매핑, 컵 리그ID, LEAGUE_NAME_MAP |
| `lib/api/sportmonks/mappers.ts` | leagueId, competitionName 매핑 |
| `lib/api/sportmonks/fixtures.ts` | getCupFixturesByTeam, getLiveMCityFixtures |
| `lib/api/sportmonks/types.ts` | SmFixture에 league_id 필드 확인 |
| `lib/repositories/mappers.ts` | FixtureRow에 league_id, competition_name |
| `lib/repositories/fixture-repository.ts` | POSTP 고려 |
| `lib/services/sync/db-mappers.ts` | 새 필드 포함 |
| `lib/services/sync/sync-fixtures.ts` | 컵 동기화 추가 |
| `lib/services/live/live-fixture-service.ts` | 맨시티 전 대회 라이브 |
| `app/api/matchday/fixtures/route.ts` | POSTP 제외 |
| `fixture-status-badge.tsx` | POSTP 배지 |
| `fixture-card.tsx` | 대회 배지, POSTP 스타일 |
| `supabase/migrations/0004_cup_and_postp.sql` | 새 마이그레이션 |
| **새 파일**: `gameweek-assigner.ts` | GW 할당 알고리즘 |
| **새 파일**: `competition-badge.tsx` | 대회명 UI 배지 |
| **새 파일**: 디버그 엔드포인트 | API 테스트용 |

---

## 검증 방법

1. **DB**: `supabase migration up` → 스키마 변경 확인
2. **동기화**: sync API 실행 → POSTP 상태 경기가 올바르게 저장되는지 확인
3. **매치데이 페이지**: GW31 접속 → 크리스탈팰리스 경기 "POSTPONED" 표시 확인
4. **컵 경기**: 카라바오컵 결승이 GW31에 대회 배지와 함께 표시 확인
5. **빌드**: `npm run validate` (type-check + lint + format)
6. **Playwright**: POSTP 배지 + CompetitionBadge 스크린샷 확인
