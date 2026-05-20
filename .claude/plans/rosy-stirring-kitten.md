# Task 017: 경기 상세 데이터 연동 (F003, F004, F005)

## Context

경기 상세 페이지(`/matchday/[fixtureId]`)의 **UI는 완전히 구현**되어 있으나, 모든 데이터가 `lib/mock/` 더미 데이터를 사용 중이다. Task 016에서 매치데이 목록을 DB 실데이터로 전환한 것과 동일한 패턴으로, 경기 상세 페이지도 **Supabase DB + SportMonks API**로 전환한다.

## 데이터 소스 전략

| 데이터       | 소스                     | 비고                                                        |
| ------------ | ------------------------ | ----------------------------------------------------------- |
| Fixture 상세 | Supabase DB `fixtures`   | Cron 동기화됨 (events, liveStats, lineups 포함)             |
| Teams        | Supabase DB `teams`      | `getTeamsByIds()` 재사용                                    |
| Standings    | Supabase DB `standings`  | `getStandingsByTeamIds()` 재사용                            |
| H2H          | SportMonks API 직접 호출 | `getH2HFixtures()` + `mapSmFixtureToH2HResult()` (24h 캐시) |
| Injuries     | Supabase DB `injuries`   | 테이블 존재, Cron 미구현 → 빈 배열 fallback                 |
| 라이브 갱신  | API Route → DB 폴링      | LIVE 시 60초, 비라이브 시 폴링 없음                         |

## 구현 단계

### Step 1: Repository 함수 추가

**`lib/repositories/fixture-repository.ts`** — `getFixtureById(id)` 추가

```typescript
export async function getFixtureById(id: number): Promise<Fixture | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fixtures")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`fixture 조회 실패: ${error.message}`);
  if (!data) return null;
  return fixtureRowToFixture(data as FixtureRow);
}
```

**`lib/repositories/injury-repository.ts`** — 신규 생성

```typescript
export async function getInjuriesByTeamId(
  teamId: number,
): Promise<InjuredPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("injuries")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(`injuries 조회 실패: ${error.message}`);
  return (data ?? []).map(injuryRowToInjuredPlayer);
}
```

**`lib/repositories/mappers.ts`** — `InjuryRow` 타입 + `injuryRowToInjuredPlayer()` 매퍼 추가

**`lib/repositories/index.ts`** — 새 함수 re-export

### Step 2: H2H 서비스 함수

**`lib/services/h2h.ts`** — 신규 생성 (SportMonks API 직접 호출 → 앱 타입 변환)

```typescript
export async function fetchH2HResults(
  teamIdA: number,
  teamIdB: number,
): Promise<H2HResult[]> {
  const rawFixtures = await getH2HFixtures(teamIdA, teamIdB);
  return rawFixtures.map(mapSmFixtureToH2HResult).filter(Boolean);
}
```

기존 `lib/api/sportmonks/fixtures.ts`의 `getH2HFixtures()`와 `mappers.ts`의 `mapSmFixtureToH2HResult()` 재사용.

### Step 3: API 엔드포인트 생성

**`app/api/matchday/fixture/route.ts`** — GET `/api/matchday/fixture?id=N`

- fixture + teams + standings 조회 (DB)
- H2H 조회 (SportMonks API)
- injuries 조회 (DB)
- 응답 타입: `FixtureDetailData`

```typescript
export interface FixtureDetailData {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  homeStanding: TeamStanding | null;
  awayStanding: TeamStanding | null;
  h2hResults: H2HResult[];
  homeInjuries: InjuredPlayer[];
  awayInjuries: InjuredPlayer[];
}
```

### Step 4: TanStack Query 폴링 훅

**`lib/hooks/use-fixture-detail.ts`** — 신규 생성

- `use-matchday-fixtures.ts` 패턴 동일
- LIVE 경기: 60초 폴링 / 비라이브: 폴링 없음 (`false` 반환)
- `initialData`를 서버 → 클라이언트 브릿지로 사용

### Step 5: Client Component 래퍼

**`app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx`** — 신규 생성

- `matchday-content.tsx` 패턴 동일
- `useFixtureDetail(fixtureId, initialData)` 사용
- `MatchHeader` + `FixtureTabs`에 폴링 데이터 전달

### Step 6: page.tsx 수정

**`app/(app)/matchday/[fixtureId]/page.tsx`** — mock → 실제 데이터

- `import from "@/lib/mock"` → `import from "@/lib/repositories"` + `import { fetchH2HResults }`
- Server Component에서 초기 데이터 조회
- `FixtureDetailContent` 래퍼에 `initialData` 전달

## 파일 변경 목록

| #   | 파일                                                                    | 유형 | 설명                       |
| --- | ----------------------------------------------------------------------- | ---- | -------------------------- |
| 1   | `lib/repositories/fixture-repository.ts`                                | 수정 | `getFixtureById()` 추가    |
| 2   | `lib/repositories/injury-repository.ts`                                 | 신규 | 부상자 DB 조회             |
| 3   | `lib/repositories/mappers.ts`                                           | 수정 | `InjuryRow` + 매퍼 추가    |
| 4   | `lib/repositories/index.ts`                                             | 수정 | re-export 갱신             |
| 5   | `lib/services/h2h.ts`                                                   | 신규 | H2H API → 앱 타입 변환     |
| 6   | `app/api/matchday/fixture/route.ts`                                     | 신규 | 경기 상세 폴링 API         |
| 7   | `lib/hooks/use-fixture-detail.ts`                                       | 신규 | TanStack Query 훅          |
| 8   | `app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx` | 신규 | 폴링 Client Component 래퍼 |
| 9   | `app/(app)/matchday/[fixtureId]/page.tsx`                               | 수정 | mock → 실제 데이터 전환    |

## 검증 방법

1. `npm run type-check` — 타입 에러 없음 확인
2. `npm run lint` — lint 에러 없음 확인
3. `npm run dev` → `/matchday` → 실제 경기 카드 클릭 → 경기 상세 페이지에 실데이터 표시 확인
4. FT 경기: 포스트매치 탭에 최종 스탯 + 이벤트 표시 확인
5. NS 경기: 프리매치 탭에 H2H, 순위 시뮬레이터 표시 확인
6. H2H: SportMonks API에서 실제 맞대결 이력 반환 확인
7. Injuries: DB에 데이터 없으면 "부상 정보 없음" 표시 확인 (기존 UI 처리)
