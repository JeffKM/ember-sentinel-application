# Task 003: 글로벌 내비게이션 구현 (F013)

## Context

현재 `app/(app)/layout.tsx`에 인라인으로 작성된 헤더/탭바 스켈레톤을 실제 내비게이션 컴포넌트로 교체한다. 데스크탑 상단 고정 헤더(로고, 메뉴 링크, 테마 토글, 인증 버튼)와 모바일 하단 탭 바(4탭)를 구현하여 모든 (app) 라우트에서 일관된 내비게이션을 제공한다.

## 파일 변경 목록

| 파일                                | 동작 | 설명                                       |
| ----------------------------------- | ---- | ------------------------------------------ |
| `components/nav/nav-config.ts`      | 신규 | 내비게이션 경로/라벨/아이콘 공유 설정      |
| `components/nav/app-header.tsx`     | 신규 | 데스크탑 상단 고정 헤더 (Client Component) |
| `components/nav/mobile-tab-bar.tsx` | 신규 | 모바일 하단 탭 바 (Client Component)       |
| `app/(app)/layout.tsx`              | 수정 | 인라인 코드를 컴포넌트 호출로 교체         |

## 구현 단계

### Step 1: `components/nav/nav-config.ts`

내비게이션 항목 데이터를 한 곳에서 관리하는 설정 파일.

- `NavItem` 타입: `{ href, label, icon: LucideIcon }`
- `mainNavItems` (데스크탑 3개): Matchday(`Calendar`), Players(`Trophy`), Compare(`Swords`)
- `mobileNavItems` (모바일 4개): 위 3개 + More(`MoreHorizontal`)
- named export

### Step 2: `components/nav/app-header.tsx`

데스크탑 상단 고정 헤더. `"use client"` — `usePathname()`으로 활성 링크 감지.

- **로고**: `<Link href="/matchday">pitch-ac</Link>`
- **메뉴 링크**: `mainNavItems` 순회, 활성 상태 → `bg-accent text-accent-foreground`
- **우측 영역**: `ThemeSwitcher` (직접 import) + `authSlot` (props로 전달받음)
- **반응형**: `hidden md:block` (모바일에서 숨김)
- **기존 스타일 유지**: `sticky top-0 z-50 border-b bg-background/95 backdrop-blur`

핵심 — `AuthButton`은 Server Component(async)이므로 Client Component에서 직접 import 불가. layout.tsx(Server Component)에서 렌더링 후 `authSlot: ReactNode` prop으로 전달.

### Step 3: `components/nav/mobile-tab-bar.tsx`

모바일 하단 탭 바. `"use client"` — `usePathname()`으로 활성 탭 감지.

- **4탭**: `mobileNavItems` 순회, 아이콘(20px) + 라벨(xs)
- **활성 상태**: `text-foreground` + `strokeWidth: 2.5` + `font-medium`
- **비활성**: `text-muted-foreground` + `strokeWidth: 2`
- **반응형**: `md:hidden` (데스크탑에서 숨김)
- **기존 스타일 유지**: `fixed bottom-0 z-50 border-t bg-background`

### Step 4: `app/(app)/layout.tsx` 수정

```tsx
// 변경 전: 인라인 <header>, <nav> + ThemeSwitcher/AuthButton 직접 사용
// 변경 후: AppHeader(authSlot), MobileTabBar 컴포넌트 호출
```

- `AppHeader`에 `authSlot={<Suspense><AuthButton /></Suspense>}` 전달
- `MobileTabBar` 단순 렌더링
- 하단 여백 `<div className="h-14 md:hidden" />` 유지

### 활성 링크 감지 로직

```ts
const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
```

- `/matchday` → Matchday 활성
- `/matchday/123` → Matchday 활성
- `/players/456` → Players 활성

## 검증

```bash
npm run type-check   # TypeScript 에러 없음
npm run lint         # ESLint 통과
npm run build        # 빌드 성공
npm run dev          # 수동 테스트
```

수동 확인 항목:

- 데스크탑(md+): 상단 헤더 표시, 하단 탭 바 숨김
- 모바일(<md): 상단 헤더 숨김, 하단 탭 바 표시
- 로고 클릭 → /matchday 이동
- 각 메뉴/탭 클릭 → 해당 경로 이동 + 활성 스타일 적용
- 테마 토글 → dark↔light 전환
- 미인증 상태 → "Sign in", "Sign up" 버튼 표시
