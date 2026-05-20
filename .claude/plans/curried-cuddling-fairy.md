# 코믹 디자인 시스템 앱 전체 적용 계획

## Context

홈(마케팅) 페이지는 코믹 디자인 시스템(Bangers 폰트, 3px 검정 테두리, 코믹 컬러 팔레트)으로 구현되어 있으나, 앱 내부 페이지들은 표준 shadcn/ui 스타일을 사용 중. 코믹 디자인 토큰은 `globals.css`에 이미 완비되어 있으므로, 앱 컴포넌트들이 이 토큰을 **실제로 사용하도록** className을 업데이트하는 작업.

## 핵심 원칙

- **shadcn Card 컴포넌트 자체는 수정하지 않음** — 각 사용처에서 className 오버라이드
- **코믹 카드 스타일 공식:** `rounded-[var(--comic-panel-radius)] border-[var(--comic-border-width)] border-comic-black bg-comic-white`
- **타이틀:** `font-[family-name:var(--font-bangers)]` + `text-comic-black`
- **서브텍스트/라벨:** `font-[family-name:var(--font-permanent-marker)]` + `text-comic-black/60`
- **수치/데이터:** `tabular-nums` 유지, Bangers 폰트
- **활성 상태:** `bg-comic-yellow text-comic-black`
- **다크모드:** comic-black/comic-white가 자동 반전되므로 별도 처리 불필요

---

## STEP 1: 앱 레이아웃 + 네비게이션 (3파일)

### 1-1. `app/(app)/layout.tsx`
- `<div className="flex min-h-screen flex-col">` → `bg-comic-white` 추가

### 1-2. `components/nav/app-header.tsx`
- header: `border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60` → `border-b-[var(--comic-border-width)] border-comic-black bg-comic-white`
- 로고: Fredoka → Bangers, `text-[length:var(--comic-text-2xl)]`, `tracking-[var(--comic-tracking-wide)]`, `text-comic-black`
- nav 링크: shadcn 둥근 스타일 → `rounded-[var(--comic-panel-radius)] border-[var(--comic-border-width)] border-comic-black font-[family-name:var(--font-bangers)] text-[length:var(--comic-text-sm)] tracking-[var(--comic-tracking-normal)]`
  - 활성: `bg-comic-yellow text-comic-black`
  - 비활성: `bg-comic-black text-comic-white hover:bg-comic-black/80`

### 1-3. `components/nav/mobile-tab-bar.tsx`
- nav: `border-t bg-background` → `border-t-[var(--comic-border-width)] border-comic-black bg-comic-white`
- 활성: `text-foreground` → `text-comic-black`, 아이콘 래퍼에 `bg-comic-yellow rounded-[var(--comic-panel-radius)]` 배경
- 비활성: `text-muted-foreground` → `text-comic-black/40`
- 라벨 폰트: `text-xs` → Bangers `text-[length:var(--comic-text-xs)]`

---

## STEP 2: 페이지 타이틀 통일 (5파일)

모든 페이지 타이틀을 동일한 코믹 패턴으로:

### 2-1. `app/(app)/matchday/_components/gameweek-header.tsx`
- `<h1>`: `text-2xl font-bold` → Bangers `text-[length:var(--comic-text-2xl)] leading-[var(--comic-leading-snug)] tracking-[var(--comic-tracking-wide)] text-comic-black`
- `<p>` 날짜: `text-sm text-muted-foreground` → PM `text-[length:var(--comic-body-base)] tracking-[var(--comic-tracking-wide)] text-comic-black/60`
- Button (이전/다음): `variant="ghost"` → `variant="outline"` + 코믹 보더

### 2-2. `app/(app)/squad/page.tsx`
- `<h1>`: Fredoka → Bangers, `text-3xl` → `text-[length:var(--comic-text-3xl)]`, `text-primary` → `text-comic-black`
- `<p>`: `text-sm text-muted-foreground` → PM 폰트 + `text-comic-black/60`

### 2-3. `app/(app)/compare/page.tsx`
- `<h1>`: `text-3xl font-bold` → Bangers + 코믹 토큰
- Suspense fallback Card들에 코믹 보더 추가

### 2-4. `app/(app)/gallery/page.tsx`
- `<h1>`: Fredoka → Bangers
- `<p>`: `text-sm text-muted-foreground` → PM 폰트
- Card (빈 상태): 코믹 보더 + `bg-comic-cream`
- 아이콘 래퍼: `rounded-full bg-primary/10` → `rounded-[var(--comic-panel-radius)] border-[var(--comic-border-width)] border-comic-black bg-comic-yellow`

### 2-5. `app/(app)/more/page.tsx`
- `<h1>`: `text-2xl font-bold` → Bangers + 코믹 토큰
- 설정 행: `rounded-lg border` → `rounded-[var(--comic-panel-radius)] border-[var(--comic-border-width)] border-comic-black bg-comic-white`
- 라벨: `text-sm font-medium` → PM 폰트

---

## STEP 3: 매치데이 카드 컴포넌트 (4파일)

### 3-1. `app/(app)/matchday/_components/fixture-card.tsx`
- Card: `hover:bg-muted/50` → `rounded-[...] border-[...] border-comic-black bg-comic-white hover:bg-comic-cream`
- LIVE: `border-green-500/50 bg-green-500/5` → `border-comic-green bg-comic-green/10`
- 팀명: `font-semibold` → Bangers `text-[length:var(--comic-text-sm)]`
- 스코어: `text-2xl font-bold tabular-nums` → Bangers `text-[length:var(--comic-text-2xl)] tabular-nums`
- 순위: `text-xs text-muted-foreground` → PM `text-[length:var(--comic-body-xs)] text-comic-black/50`
- FT 구분선: `border-t` → `border-t-[var(--comic-border-thin)] border-comic-black/20`

### 3-2. `app/(app)/matchday/_components/fixture-status-badge.tsx`
- NS: `Badge variant="secondary"` → outline + 코믹 보더 + `bg-comic-cream` + PM 폰트
- LIVE: `border-green-500/50 bg-green-500/10 text-green-600` → `border-comic-green bg-comic-green/20` + Bangers
- FT: `Badge variant="outline"` → `bg-comic-yellow` + Bangers

### 3-3. `app/(app)/matchday/_components/fixture-date-group.tsx`
- `<h2>`: `text-sm font-medium text-muted-foreground` → PM 폰트 + `text-comic-black/60`

### 3-4. `app/(app)/matchday/_components/fixture-card-skeleton.tsx`
- Card: `animate-pulse` → + 코믹 보더

---

## STEP 4: 스쿼드 카드 컴포넌트 (5파일)

### 4-1. `app/(app)/squad/_components/player-card.tsx`
- Card: `hover:bg-muted/50` → 코믹 보더 + `hover:bg-comic-cream`
- 이름: `font-semibold` → Bangers
- 포지션: `text-sm text-muted-foreground` → PM 폰트
- Badge: `variant="secondary"` → outline + 코믹 보더 + `bg-comic-yellow`

### 4-2. `app/(app)/squad/_components/player-card-skeleton.tsx`
- Card: bare → 코믹 보더

### 4-3. `app/(app)/squad/[playerId]/_components/player-header-card.tsx`
- Card: bare → 코믹 보더
- `<h1>`: `text-2xl font-bold` → Bangers `text-[length:var(--comic-text-3xl)]`
- 이미지 ring: `ring-2 ring-border` → `ring-[var(--comic-border-width)] ring-comic-black`
- Badge (등번호): `variant="secondary"` → `bg-comic-skyblue` + Bangers
- Badge (포지션): `variant="outline"` → `bg-comic-yellow` + Bangers
- 평균 평점: `text-3xl font-bold tabular-nums` → Bangers

### 4-4. `app/(app)/squad/[playerId]/_components/stat-context-card.tsx`
- Card: bare → 코믹 보더 + `bg-comic-cream`
- 레이블: `text-xs font-medium text-muted-foreground` → PM 폰트
- 수치: `text-2xl font-bold tabular-nums` → Bangers
- 순위: `text-xs font-medium` → PM 폰트

### 4-5. `app/(app)/squad/[playerId]/_components/stat-context-grid.tsx`
- 섹션 헤더: `text-sm font-semibold text-muted-foreground` → Bangers `text-[length:var(--comic-text-base)]`

---

## STEP 5: 경기 상세 컴포넌트 (8파일)

### 5-1. `app/(app)/matchday/[fixtureId]/_components/match-header.tsx`
- Card: `overflow-hidden` → + 코믹 보더
- LIVE: `border-green-500/50 bg-green-500/5` → `border-comic-green bg-comic-green/10`
- 스코어/팀명/순위/날짜: 코믹 폰트 전환

### 5-2~5-7. 서브 카드 컴포넌트들 (공통 패턴)

아래 6개 파일 모두 동일한 패턴 적용:
- `team-form-row.tsx`, `h2h-results.tsx`, `injury-list.tsx`, `standing-simulator.tsx`, `event-timeline.tsx`, `stat-bar.tsx`, `lineup-display.tsx`, `recent-form-sparkline.tsx`

공통 변경:
- `<Card>` bare → 코믹 보더
- `<CardTitle className="text-sm font-medium">` → Bangers `text-[length:var(--comic-text-sm)]`

### 5-8. `app/(app)/matchday/[fixtureId]/_components/fixture-tabs.tsx`
- TabsList/TabsTrigger에 코믹 스타일 (확인 필요)

---

## STEP 6: 비교 페이지 컴포넌트 (4파일)

### 6-1. `app/(app)/compare/_components/player-slot.tsx`
- Card: bare → 코믹 보더
- CardTitle: `text-sm font-medium` → Bangers + `colorClass` 유지

### 6-2. `app/(app)/compare/_components/compare-stat-table.tsx`
- Card: bare → 코믹 보더
- CardTitle: `text-sm font-medium` → Bangers

### 6-3. `app/(app)/compare/_components/compare-verdict.tsx`
- `rounded-lg border bg-muted/40` → 코믹 보더 + `bg-comic-yellow`

### 6-4. `app/(app)/compare/loading.tsx`
- Card들에 코믹 보더 추가

---

## 변경 파일 전체 목록 (~25개)

**레이아웃/네비 (3)**
1. `app/(app)/layout.tsx`
2. `components/nav/app-header.tsx`
3. `components/nav/mobile-tab-bar.tsx`

**페이지 타이틀 (5)**
4. `app/(app)/matchday/_components/gameweek-header.tsx`
5. `app/(app)/squad/page.tsx`
6. `app/(app)/compare/page.tsx`
7. `app/(app)/gallery/page.tsx`
8. `app/(app)/more/page.tsx`

**매치데이 카드 (4)**
9. `app/(app)/matchday/_components/fixture-card.tsx`
10. `app/(app)/matchday/_components/fixture-status-badge.tsx`
11. `app/(app)/matchday/_components/fixture-date-group.tsx`
12. `app/(app)/matchday/_components/fixture-card-skeleton.tsx`

**스쿼드 카드 (5)**
13. `app/(app)/squad/_components/player-card.tsx`
14. `app/(app)/squad/_components/player-card-skeleton.tsx`
15. `app/(app)/squad/[playerId]/_components/player-header-card.tsx`
16. `app/(app)/squad/[playerId]/_components/stat-context-card.tsx`
17. `app/(app)/squad/[playerId]/_components/stat-context-grid.tsx`

**경기 상세 (9)**
18. `app/(app)/matchday/[fixtureId]/_components/match-header.tsx`
19. `app/(app)/matchday/[fixtureId]/_components/team-form-row.tsx`
20. `app/(app)/matchday/[fixtureId]/_components/h2h-results.tsx`
21. `app/(app)/matchday/[fixtureId]/_components/injury-list.tsx`
22. `app/(app)/matchday/[fixtureId]/_components/standing-simulator.tsx`
23. `app/(app)/matchday/[fixtureId]/_components/event-timeline.tsx`
24. `app/(app)/matchday/[fixtureId]/_components/stat-bar.tsx`
25. `app/(app)/matchday/[fixtureId]/_components/lineup-display.tsx`
26. `app/(app)/squad/[playerId]/_components/recent-form-sparkline.tsx`

**비교 (4)**
27. `app/(app)/compare/_components/player-slot.tsx`
28. `app/(app)/compare/_components/compare-stat-table.tsx`
29. `app/(app)/compare/_components/compare-verdict.tsx`
30. `app/(app)/compare/loading.tsx`

---

## 검증 방법

1. `npm run dev` → 각 페이지 시각적 확인
   - `/matchday` — 게임위크 헤더, 경기 카드, 상태 배지
   - `/matchday/[id]` — 매치 헤더, 서브 카드들, 탭
   - `/squad` — 선수 카드 그리드
   - `/squad/[id]` — 선수 프로필 헤더, 스탯 카드
   - `/compare` — 비교 슬롯, 스탯 테이블, 판정
   - `/gallery` — 빈 상태 카드
   - `/more` — 설정 행
2. 다크모드 전환 확인 — 모든 페이지에서 comic-black/comic-white 반전 정상 동작
3. 모바일 반응형 확인 — 탭바, 카드 레이아웃
4. `npm run build` — 빌드 에러 없음 확인
