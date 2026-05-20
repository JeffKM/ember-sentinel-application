# Phase 2: UI/UX 완성 코드 리뷰 결과

## 리뷰 대상

Task 004~010 (매치데이, 경기 상세, 선수 검색, 선수 프로필, 레이더 차트, 비교 배틀카드, 용어 팝오버)

---

## 코드 리뷰 요약

전반적으로 아키텍처가 탄탄하고 TypeScript 타입 안전성이 높으며, 프로젝트 핵심 규칙("모든 숫자에 맥락")을 충실히 구현했습니다. Server/Client Component 경계 설정도 올바릅니다. 다만 즉시 수정이 필요한 버그 3건, 중간 수준의 개선 사항 5건이 발견되었습니다.

---

## 잘한 점

- **Server/Client 경계 명확**: `"use client"`는 꼭 필요한 3개 컴포넌트(`fixture-tabs`, `standing-simulator`, `compare-client`)에만 선언됨
- **StatContext 패턴 완벽 준수**: 모든 수치에 `rank + percentile + prevSeason` 3단계 맥락 동반
- **타입 안전성 우수**: `any` 사용 없음, 명시적 인터페이스, Union 타입 적절 활용
- **접근성 고려**: `PercentileBar`에 `role="meter"` + `aria-*`, `GlossaryPopover`에 `aria-label` 부여
- **컴포넌트 재사용**: `TeamFormBadge`, `PlayerNameLink`, `GlossaryPopover` 등 작은 단위 재사용 패턴 정착
- **반응형 스켈레톤 UI**: `loading.tsx`로 Suspense 경계 + 스켈레톤 완비

---

## 개선 필요 사항

### 심각도: 높음

#### 1. `stat-bar.tsx:40` — 조건문 양쪽 값이 동일 (버그)

- **문제**: 삼항 연산자의 두 분기가 `"rounded-l-full"`로 동일해 우측 바의 둥근 모서리 처리가 누락됨
- **영향**: 홈팀이 지고 있을 때 오른쪽 바의 좌측 끝이 각지게 표시됨 (시각적 버그)
- **해결방안**:

```tsx
// Before (버그)
homePercent >= awayPercent ? "rounded-l-full" : "rounded-l-full";

// After
className = "h-full bg-primary transition-all rounded-l-full";
```

#### 2. `event-timeline.tsx` — 배열 인덱스를 `key`로 사용

- **문제**: `.map((event, i) => <div key={i}>` 패턴 사용
- **영향**: 이벤트 목록이 변경(추가/삭제/정렬)될 때 잘못된 DOM 재사용으로 상태 오염 가능
- **해결방안**:

```tsx
// Before
sorted.map((event, i) => <div key={i}>

// After
sorted.map((event) => (
  <div key={`${event.minute}-${event.teamId}-${event.type}-${event.playerId ?? ""}`}>
))
```

#### 3. `team-form-row.tsx` — 타입 단언으로 런타임 오류 위험

- **문제**: `homeForm: string[]` → `result as "W" | "D" | "L"` 강제 캐스팅
- **영향**: 올바르지 않은 문자열이 들어올 경우 런타임 오류 발생 가능
- **해결방안**:

```tsx
// 타입 가드 추가
function isFormResult(v: string): v is "W" | "D" | "L" {
  return v === "W" || v === "D" || v === "L";
}

homeForm
  .filter(isFormResult)
  .map((result) => <TeamFormBadge key={result} result={result} />);
```

---

### 심각도: 중간

#### 4. `auto-refresh-indicator.tsx` — 불필요한 `"use client"`

- **문제**: 상태·이벤트 핸들러 없이 정적 텍스트만 반환하는데 `"use client"` 선언됨
- **해결방안**: `"use client"` 제거 → Server Component로 변경

#### 5. `PlayerCardGrid.tsx` — O(n×m) 팀 조회

- **문제**: 선수마다 `teams.find()` 호출 → 12선수 × 10팀 = 120회 순회
- **해결방안**:

```tsx
// 상위에서 Map으로 사전 처리
const teamMap = new Map(teams.map((t) => [t.id, t]));
// 이후 teamMap.get(player.teamId) 사용
```

#### 6. `compare-client.tsx` — 플레이어와 스탯 상태 이중 관리

- **문제**: `player1/player2/stats1/stats2` 4개 상태가 항상 쌍으로 변경되지만 개별 관리
- **해결방안**:

```tsx
// 관련 상태를 하나로 통합
interface PlayerSlotState {
  player: Player;
  stats: PlayerSeasonStats;
}
const [slot1, setSlot1] = useState<PlayerSlotState | undefined>(initialSlot1);
const [slot2, setSlot2] = useState<PlayerSlotState | undefined>(initialSlot2);
```

#### 7. `player-radar-chart.tsx:146` — `as unknown as` 이중 타입 단언

- **문제**: recharts 타입 호환성 때문에 `as unknown as Record<string, unknown>[]` 사용
- **해결방안**: 변환 함수의 반환 타입을 recharts가 기대하는 형태로 명시적 정의

---

### 심각도: 낮음

#### 8. 날짜 포맷팅 중복 (3개 파일)

`fixture-card.tsx`, `match-header.tsx`, `matchday/page.tsx`에서 동일한 `Intl.DateTimeFormat` 블록 반복:

```tsx
// lib/date-utils.ts로 추출
export function formatKickoffTime(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(dateStr));
}
```

#### 9. `COMPARE_STAT_DEFINITIONS` 위치

`compare-stat-table.tsx`에 정의된 상수를 `compare-verdict.tsx`에서도 import해 사용 중. `compare/constants.ts`로 분리 권장.

#### 10. `lineup-display.tsx` — 정렬 방향 주석과 코드 불일치

주석은 "왼쪽→오른쪽"이지만 `bCol - aCol` (내림차순)이므로 오른쪽→왼쪽 정렬. 주석 또는 정렬 기준 수정 필요.

---

## 추가 권장사항

- **`FixtureTabs` props 그룹화**: 현재 8개 props → 3개 그룹(`match`, `standings`, `prematchData`)으로 정리하면 가독성 향상
- **`POSITION_LABELS` 공통 상수화**: `PlayerHeaderCard`에만 정의되어 있으나 다른 컴포넌트에서도 포지션 표기 시 재사용 가능
- **`ScoreDisplay` 공통 컴포넌트**: `fixture-card`(2xl)와 `match-header`(4xl)에서 `homeScore – awayScore` 패턴이 반복되므로 `size` prop 있는 공통 컴포넌트로 추출 가능

---

## 수정 우선순위 요약

| 순위 | 파일                         | 작업                     |
| ---- | ---------------------------- | ------------------------ |
| 1    | `stat-bar.tsx:40`            | 조건문 버그 수정         |
| 2    | `event-timeline.tsx`         | `key` 안정화             |
| 3    | `team-form-row.tsx`          | 타입 가드 추가           |
| 4    | `auto-refresh-indicator.tsx` | `"use client"` 제거      |
| 5    | `compare-client.tsx`         | 상태 통합                |
| 6    | 날짜 포맷 함수               | `lib/date-utils.ts` 추출 |
