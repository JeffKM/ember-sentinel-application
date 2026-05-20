# ScoutLab P90/Total, Padj./Raw 토글 + 포지션 비교 그룹 구현

## Context

현재 ScoutLab의 P90/Total, Padj./Raw 토글 UI는 존재하지만 실제로 동작하지 않음.
스크래퍼가 `per90+padj` 조합만 저장하기 때문에 다른 조합 선택 시 데이터 없음.
또한 포지션 토글은 원본(scoutlab.streamlit.app)에서는 **비교 그룹 변경** 역할이지만,
pitch-ac에서는 단순 검색 필터로만 동작 중.

**목표**: 원본 ScoutLab과 동일하게 4가지 mode/adjustment 조합 + 5가지 포지션 비교 그룹이 모두 동작하도록 구현.

---

## Phase 1: DB 스키마 변경

**파일**: `supabase/migrations/0009_scoutlab_comparison_position.sql`

- `scoutlab_metrics`에 `comparison_position TEXT NOT NULL DEFAULT 'AM/W'` 컬럼 추가
- CHECK 제약: `('CB', 'FB', 'MF', 'AM/W', 'FW')`
- 기존 UNIQUE 제약 삭제 후 재생성: `UNIQUE (player_id, season, mode, adjustment, comparison_position)`
- 기존 데이터: 각 선수의 실제 포지션값을 `comparison_position`으로 업데이트

---

## Phase 2: 스크래퍼 — mode/adjustment 토글 지원

**수정 파일**:
- `scripts/scraper/lib/navigation.ts` — 토글 함수 추가
- `scripts/scraper/lib/db.ts` — `upsertMetrics`에 mode/adjustment/comparisonPosition 파라미터 추가
- `scripts/scraper/main.ts` — 메인 루프에 4가지 조합 순회 추가

### 2.1 navigation.ts — 토글 함수 추가

```typescript
// P90/Total 토글 (Streamlit segmented control)
export async function toggleMode(iframe, page, mode: "P90" | "Total")

// Padj./Raw 토글
export async function toggleAdjustment(iframe, page, adj: "Padj." | "Raw")

// 포지션 비교 그룹 토글
export async function toggleComparisonPosition(iframe, page, pos: "CB" | "FB" | "MF" | "AM/W" | "FW")
```

Streamlit segmented control 선택자: `[data-testid="stBaseButton-segmented_control"]`
활성 버튼: `[data-testid="stBaseButton-segmented_controlActive"]`

각 토글 후 `waitForStreamlitUpdate()` 호출하여 데이터 갱신 대기.

### 2.2 db.ts — upsertMetrics 확장

```typescript
export async function upsertMetrics(
  supabase, playerId, season, grouped,
  mode: "per90" | "total",                    // 추가
  adjustment: "padj" | "raw",                 // 추가
  comparisonPosition: "CB"|"FB"|"MF"|"AM/W"|"FW"  // 추가
)
```

`onConflict`를 `"player_id,season,mode,adjustment,comparison_position"`으로 변경.

### 2.3 main.ts — 메인 루프 수정

각 선수 선택 후:
```
for (mode of ["P90", "Total"]):
  toggleMode(iframe, page, mode)
  for (adj of ["Padj.", "Raw"]):
    toggleAdjustment(iframe, page, adj)
    for (pos of ["CB", "FB", "MF", "AM/W", "FW"]):
      toggleComparisonPosition(iframe, page, pos)
      metrics = parseMetrics(iframe)
      upsertMetrics(supabase, playerId, season, grouped, mode, adj, pos)
```

**CLI 옵션 추가** (점진적 스크래핑 지원):
- `--mode=per90` — 특정 mode만 스크래핑
- `--adjustment=padj` — 특정 adjustment만 스크래핑
- `--skip-positions` — 포지션 비교 그룹 스크래핑 생략 (선수 기본 포지션만)

**예상 소요 시간**: 선수당 ~20 토글 × ~3초 = ~60초. 500명 기준 약 8시간.
점진적으로 `--mode=per90 --skip-positions` 등으로 나눠 실행 가능.

---

## Phase 3: 타입 & 상수 업데이트

**수정 파일**:
- `types/index.ts` (또는 해당 위치) — `ScoutlabComparisonPosition` 타입 추가
- `app/(app)/scouting/_lib/scoutlab-constants.ts` — `VALID_COMPARISON_POSITIONS`, `COMPARISON_POSITION_LABELS` 추가

```typescript
export type ScoutlabComparisonPosition = "CB" | "FB" | "MF" | "AM/W" | "FW";

export const VALID_COMPARISON_POSITIONS = ["CB", "FB", "MF", "AM/W", "FW"] as const;

export const COMPARISON_POSITION_LABELS: Record<ScoutlabComparisonPosition, string> = {
  CB: "Centre-Backs",
  FB: "Full-Backs",
  MF: "Midfielders",
  "AM/W": "Att Mid/Wingers",
  FW: "Forwards",
};
```

---

## Phase 4: 프론트엔드 — 포지션 토글을 비교 그룹 선택기로 변경

### 4.1 URL 파라미터 추가

**수정 파일**:
- `app/(app)/scouting/_lib/scoutlab-search-params.ts` — `comparisonPosition` 파라미터 추가
- `app/(app)/scouting/_lib/use-scoutlab-params.ts` — `comparisonPosition` 상태 추가

`ScoutlabPageParams`에 `comparisonPosition: ScoutlabComparisonPosition | null` 추가.
null이면 선수의 기본 포지션 사용.

### 4.2 포지션 필터 → 비교 그룹 선택기로 변경

**수정 파일**: `app/(app)/scouting/_components/scoutlab-position-filter.tsx`

- 포지션 옵션을 원본과 동일하게 5개로 변경: CB, FB, MF, AM/W, FW
- "All" 옵션 제거 (원본에도 없음)
- `setParams({ position: ... })` → `setParams({ comparisonPosition: ... })`
- 기본 선택: 현재 선수의 포지션 (props로 전달)

### 4.3 메트릭 조회에 comparisonPosition 적용

**수정 파일**:
- `lib/repositories/scoutlab-repository.ts` — `getScoutlabMetrics`에 `comparisonPosition` 파라미터 추가
- `app/(app)/scouting/page.tsx` — comparisonPosition을 메트릭 조회에 전달

```typescript
export const getScoutlabMetrics = cache(
  async (
    playerId: number,
    season: string,
    mode: ScoutlabMode = "per90",
    adjustment: ScoutlabAdjustment = "padj",
    comparisonPosition: ScoutlabComparisonPosition = "AM/W",  // 추가
  ) => {
    // .eq("comparison_position", comparisonPosition) 추가
  }
);
```

page.tsx에서:
```typescript
const comparisonPos = params.comparisonPosition ?? selectedPlayer?.position ?? "AM/W";
const metrics = await getScoutlabMetrics(
  selectedPlayer.id, params.season, params.mode, params.adjustment, comparisonPos
);
```

### 4.4 검색에서 position 필터 제거

**수정 파일**: `app/(app)/scouting/page.tsx`

`searchScoutlabPlayers` 호출에서 `position` 필터 제거.
포지션 토글은 이제 비교 그룹 역할만 하므로, 검색은 모든 포지션의 선수를 보여줌.

### 4.5 헤더에 비교 그룹 표시

**수정 파일**: `app/(app)/scouting/_components/player-card-header.tsx` 또는 `metric-category-table.tsx`

원본처럼 "PERCENTILE VS [POSITION GROUP] · BIG 5 LEAGUES · PER 90 MINUTES" 서브타이틀 추가.
mode가 "total"이면 "PER 90 MINUTES" 대신 "TOTAL" 표시.

---

## Phase 5: Summary/Compare 등 하위 페이지 대응

**수정 파일**:
- `app/(app)/scouting/summary/page.tsx`
- `app/(app)/scouting/compare/page.tsx`

각 하위 페이지의 메트릭 조회에도 comparisonPosition 전달.

---

## 수정 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/0009_*.sql` | comparison_position 컬럼 추가 |
| `scripts/scraper/lib/navigation.ts` | toggleMode, toggleAdjustment, toggleComparisonPosition 함수 |
| `scripts/scraper/lib/db.ts` | upsertMetrics 파라미터 확장 |
| `scripts/scraper/main.ts` | 20가지 조합 순회 루프 + CLI 옵션 |
| `types/index.ts` | ScoutlabComparisonPosition 타입 |
| `app/(app)/scouting/_lib/scoutlab-constants.ts` | 비교 포지션 상수 |
| `app/(app)/scouting/_lib/scoutlab-search-params.ts` | comparisonPosition 파싱 |
| `app/(app)/scouting/_lib/use-scoutlab-params.ts` | comparisonPosition 상태 |
| `app/(app)/scouting/_components/scoutlab-position-filter.tsx` | 비교 그룹 선택기 |
| `app/(app)/scouting/_components/player-card-header.tsx` | 비교 그룹 서브타이틀 |
| `lib/repositories/scoutlab-repository.ts` | getScoutlabMetrics 쿼리 확장 |
| `app/(app)/scouting/page.tsx` | comparisonPosition 전달 + position 필터 제거 |
| `app/(app)/scouting/summary/page.tsx` | comparisonPosition 전달 |
| `app/(app)/scouting/compare/page.tsx` | comparisonPosition 전달 |

---

## 검증 방법

1. **DB 확인**: `scoutlab_metrics`에 20가지 조합 행이 저장되는지 확인
2. **P90/Total 토글**: 토글 시 값이 변하는지 확인 (P90은 소수점, Total은 큰 정수)
3. **Padj./Raw 토글**: 토글 시 특히 Defending 카테고리 값이 변하는지 확인
4. **포지션 비교 그룹**: 같은 선수에서 포지션 변경 시 **값은 동일하고 백분위만 변하는지** 확인
5. **서브타이틀**: "PERCENTILE VS [POSITION] · BIG 5 LEAGUES · PER 90 MINUTES" 정확히 표시되는지
6. **스크래퍼 CLI**: `--mode`, `--adjustment`, `--skip-positions` 옵션이 정상 동작하는지
