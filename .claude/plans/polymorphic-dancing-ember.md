# 코믹 디자인 시스템 전체 통일 계획

## Context

홈 페이지는 코믹(카툰) 디자인 토큰으로 완전히 구현되어 있지만, 나머지 앱 페이지들(비교, 매치데이 상세, 스쿼드 등)에 shadcn 기본 색상(text-muted-foreground, bg-muted, bg-primary, text-green-600, text-chart-1 등)이 잔존. 스크린샷에서 확인되는 것처럼 디자인 불일치가 명확하므로, 홈 페이지 기준으로 모든 페이지를 통일한다.

## 변환 규칙

| shadcn 토큰 | → 코믹 토큰 |
|---|---|
| `text-muted-foreground` | `text-comic-black/50` |
| `bg-muted` | `bg-comic-cream` |
| `bg-primary` | `bg-comic-skyblue` |
| `text-primary` / `hover:text-primary` | `text-comic-skyblue` / `hover:text-comic-skyblue` |
| `bg-card` | `bg-comic-white` |
| `text-green-600 dark:text-green-400` | `text-comic-green` |
| `text-yellow-600 dark:text-yellow-400` | `text-comic-yellow` |
| `text-red-600 dark:text-red-400` / `text-red-500` | `text-comic-red` |
| `border-green-500/30 bg-green-500/15` | `border-comic-green/30 bg-comic-green/15` |
| `border-yellow-500/30 bg-yellow-500/15` | `border-comic-yellow/30 bg-comic-yellow/15` |
| `border-red-500/30 bg-red-500/15` | `border-comic-red/30 bg-comic-red/15` |
| `text-chart-1` | `text-comic-skyblue` |
| `text-chart-2` | `text-comic-red` |
| `bg-muted-foreground/30` | `bg-comic-black/30` |
| `bg-popover` | `bg-comic-white` |
| `text-sm` (텍스트) | `font-[family-name:var(--font-permanent-marker)] text-[length:var(--comic-body-base)]` |
| `text-xs` (텍스트) | `font-[family-name:var(--font-permanent-marker)] text-[length:var(--comic-body-xs)]` |
| `font-medium` / `font-semibold` / `font-bold` (텍스트) | 코믹 폰트 적용 시 제거 (Bangers/Permanent Marker는 weight 1개) |
| `border-b` (구분선) | `border-b-[var(--comic-border-thin)] border-comic-black/20` |
| Button variant="outline"/"default" | 코믹 버튼 스타일 (인라인) |
| Badge variant="default"/"destructive"/"secondary" | 코믹 배지 스타일 (인라인) |

## 수정 파일 목록 (총 ~24개)

### 그룹 1: 비교 페이지 (4파일)

1. **`app/(app)/compare/page.tsx`** (L141,144)
   - `bg-muted` → `bg-comic-cream`

2. **`app/(app)/compare/_components/compare-client.tsx`** (L17)
   - `bg-muted` → `bg-comic-cream`

3. **`app/(app)/compare/_components/compare-stat-table.tsx`** (L87,119,170,171,175)
   - `border-b` → `border-b-[var(--comic-border-thin)] border-comic-black/20`
   - `text-chart-1` → `text-comic-skyblue`
   - `text-chart-2` → `text-comic-red`

4. **`app/(app)/compare/_components/compare-verdict.tsx`** (L40,48)
   - `text-muted-foreground` → `text-comic-black/50`
   - `text-chart-1` → `text-comic-skyblue`
   - `text-chart-2` → `text-comic-red`

### 그룹 2: 비교 페이지 (player-slot, search combobox)

5. **`app/(app)/compare/_components/player-slot.tsx`** (L9,68-76)
   - Button 제거, X 아이콘 클릭 인라인 버튼으로 교체

6. **`components/player-search-combobox.tsx`** (L74,99,118,148)
   - `text-muted-foreground` → `text-comic-black/50`
   - Button 트리거 스타일 코믹 토큰으로 변경

### 그룹 3: Fixture Detail 컴포넌트 (9파일)

7. **`app/(app)/matchday/[fixtureId]/_components/stat-bar.tsx`**
   - `text-muted-foreground` → `text-comic-black/50`
   - `bg-muted` → `bg-comic-cream`
   - `bg-primary` → `bg-comic-skyblue`
   - `bg-muted-foreground/30` → `bg-comic-black/30`
   - `text-sm`/`text-xs` → 코믹 폰트 토큰

8. **`app/(app)/matchday/[fixtureId]/_components/standing-simulator.tsx`**
   - Button → 인라인 코믹 버튼
   - `text-muted-foreground` → `text-comic-black/50`
   - `text-green-600 dark:text-green-400` → `text-comic-green`
   - `text-sm`/`text-xs` → 코믹 폰트 토큰

9. **`app/(app)/matchday/[fixtureId]/_components/team-form-badge.tsx`**
   - `border-green-500/30 bg-green-500/15 text-green-600` → `border-comic-green/30 bg-comic-green/15 text-comic-green`
   - 동일하게 yellow, red 변환
   - `text-xs font-bold` → 코믹 폰트 토큰

10. **`app/(app)/matchday/[fixtureId]/_components/h2h-results.tsx`**
    - `text-muted-foreground` → `text-comic-black/50`
    - `text-green-600 dark:text-green-400` → `text-comic-green`
    - `text-yellow-600 dark:text-yellow-400` → `text-comic-yellow`
    - `text-red-600 dark:text-red-400` → `text-comic-red`
    - Separator → 코믹 분리선

11. **`app/(app)/matchday/[fixtureId]/_components/injury-list.tsx`**
    - `text-muted-foreground` → `text-comic-black/50`
    - `text-red-500` → `text-comic-red`
    - `text-sm`/`text-xs` → 코믹 폰트 토큰

12. **`app/(app)/matchday/[fixtureId]/_components/team-form-row.tsx`**
    - `text-muted-foreground` → `text-comic-black/50`
    - `text-xs` → 코믹 폰트 토큰

13. **`app/(app)/matchday/[fixtureId]/_components/live-tab.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트

14. **`app/(app)/matchday/[fixtureId]/_components/postmatch-tab.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트

15. **`app/(app)/matchday/[fixtureId]/_components/player-name-link.tsx`**
    - `hover:text-primary` → `hover:text-comic-skyblue`

16. **`app/(app)/matchday/[fixtureId]/_components/auto-refresh-indicator.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트

### 그룹 4: 스쿼드 페이지 (3파일)

17. **`app/(app)/squad/_components/player-search-empty.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트

18. **`app/(app)/squad/[playerId]/_components/stat-context-card.tsx`** (L39)
    - `text-sm text-muted-foreground` → 코믹 폰트 토큰

19. **`app/(app)/squad/[playerId]/_components/recent-form-sparkline.tsx`**
    - `text-muted-foreground` → `text-comic-black/50`
    - `bg-popover` → `bg-comic-white`
    - Badge variant → 코믹 배지 인라인
    - recharts fill/stroke의 `var(--muted-foreground)` → `var(--comic-black)` 50% opacity
    - `var(--primary)` → `var(--comic-skyblue)`

### 그룹 5: 에러/404/Empty 페이지 (4파일)

20. **`app/error.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트
    - Button → 코믹 인라인 버튼

21. **`app/not-found.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트
    - Button → 코믹 인라인 버튼

22. **`app/(app)/matchday/[fixtureId]/not-found.tsx`**
    - 동일 변환

23. **`app/(app)/matchday/_components/empty-gameweek.tsx`**
    - `text-muted-foreground` → `text-comic-black/50` + 코믹 폰트

### 그룹 6: 공통 컴포넌트 (1파일)

24. **`components/glossary-popover.tsx`**
    - `text-muted-foreground` → `text-comic-black/50`
    - `hover:text-foreground` → `hover:text-comic-black`

### 그룹 7: 로딩/스켈레톤 페이지 (6파일)

25. **`app/(app)/compare/loading.tsx`** — `bg-muted` → `bg-comic-cream`
26. **`app/(app)/matchday/loading.tsx`** — `bg-muted` → `bg-comic-cream`
27. **`app/(app)/matchday/[fixtureId]/loading.tsx`** — `bg-muted`/`bg-card` → `bg-comic-cream`/`bg-comic-white`
28. **`app/(app)/matchday/_components/fixture-card-skeleton.tsx`** — `bg-muted` → `bg-comic-cream`
29. **`app/(app)/squad/_components/player-card-skeleton.tsx`** — `bg-muted` → `bg-comic-cream`
30. **`app/(app)/squad/loading.tsx`** — `bg-muted` → `bg-comic-cream`
31. **`app/(app)/squad/[playerId]/loading.tsx`** — `bg-muted`/`bg-card` → `bg-comic-cream`/`bg-comic-white`
32. **`app/(app)/squad/[playerId]/_components/player-charts.tsx`** — `bg-muted`/`bg-card` → `bg-comic-cream`/`bg-comic-white`

### 그룹 8: design-system.md 업데이트

33. **`docs/design-system.md`**
    - 홈 페이지 중심으로 재구성
    - 변환 규칙 테이블 추가
    - shadcn 시멘틱 색상 금지 규칙 명시화

## UI 컴포넌트(components/ui/) 처리 방침

shadcn UI 기본 컴포넌트(`card.tsx`, `tabs.tsx`, `button.tsx`, `badge.tsx` 등)는 **수정하지 않는다**. 이유:
- shadcn 업데이트 시 충돌 가능
- 앱 사용처에서 코믹 클래스를 직접 지정하는 방식이 더 명시적

대신 사용처에서 shadcn 기본 variant 대신 코믹 스타일을 인라인으로 적용한다.

## 실행 순서

1. 그룹 8: design-system.md 업데이트 (참조 문서 먼저)
2. 그룹 1-2: 비교 페이지 (스크린샷에서 가장 눈에 띄는 문제)
3. 그룹 3: Fixture Detail 컴포넌트
4. 그룹 4: 스쿼드 페이지
5. 그룹 5: 에러/404 페이지
6. 그룹 6: 공통 컴포넌트
7. 그룹 7: 로딩/스켈레톤

## 검증

- `npm run build` — 빌드 성공 확인
- `npm run type-check` — 타입 에러 없음
- Playwright 스크린샷: 비교 페이지, 매치데이 상세, 스쿼드, 404 페이지
- shadcn 색상 잔존 검색: `grep -r "text-muted-foreground\|bg-muted\|text-green-600\|text-red-500" app/ components/ --include="*.tsx" | grep -v "components/ui/"` → 0건
