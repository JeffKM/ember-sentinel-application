# Phase 1: 애플리케이션 골격 구축 — 구현 계획

## Context

pitch-ac는 PL 데이터 플랫폼으로, 현재 Supabase 스타터킷 상태. 인증 플로우만 구현되어 있고 PL 관련 기능은 전무. Phase 1에서 Route Group 기반 앱 구조를 잡고, 타입/더미 데이터를 정의하고, 글로벌 내비게이션을 구현하여 Phase 2 UI 작업의 토대를 마련한다.

**핵심 발견**: 루트 `proxy.ts`가 `middleware` 대신 `proxy`로 export되어 Next.js 미들웨어가 현재 작동하지 않음. 이를 수정해야 함.

---

## Task 001: Route Groups 재구성 및 페이지 스캐폴딩

### 목표 디렉토리 구조

```
app/
├── layout.tsx                     # 루트 레이아웃 (수정: 메타데이터, lang)
├── page.tsx                       # / → /matchday 리다이렉트
├── globals.css                    # 유지
├── (auth)/auth/                   # 인증 라우트 (기존 auth/ 이동)
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   ├── sign-up-success/page.tsx
│   ├── forgot-password/page.tsx
│   ├── update-password/page.tsx
│   ├── error/page.tsx
│   ├── confirm/route.ts
│   └── callback/route.ts
├── (app)/                         # 앱 본체
│   ├── layout.tsx                 # 헤더 + 콘텐츠 + 탭바
│   ├── matchday/page.tsx
│   ├── matchday/[fixtureId]/page.tsx
│   ├── players/page.tsx
│   ├── players/[playerId]/page.tsx
│   ├── compare/page.tsx
│   └── more/page.tsx              # 모바일 More 탭
└── (marketing)/                   # 향후 랜딩페이지용 (비어있음)
middleware.ts                      # 신규 생성 (proxy.ts → middleware.ts)
```

### Step 1-A: 스타터킷 파일 삭제

| 삭제 대상                                | 이유                              |
| ---------------------------------------- | --------------------------------- |
| `components/hero.tsx`                    | 스타터킷 히어로                   |
| `components/deploy-button.tsx`           | Vercel 배포 버튼                  |
| `components/env-var-warning.tsx`         | 환경변수 경고                     |
| `components/next-logo.tsx`               | Next.js 로고                      |
| `components/supabase-logo.tsx`           | Supabase 로고                     |
| `components/tutorial/` (5개 파일)        | 튜토리얼 전체                     |
| `app/protected/` (layout.tsx + page.tsx) | protected 라우트 (→ `(app)` 대체) |

### Step 1-B: `lib/utils.ts` 정리

`hasEnvVars` export 제거. `cn()` 함수만 유지.

### Step 1-C: Auth 라우트 이동

`app/auth/*` → `app/(auth)/auth/*`로 전체 이동. Route Group이므로 URL `/auth/login` 등은 동일하게 유지됨. `@/` 기반 import이므로 파일 내용 수정 불필요.

### Step 1-D: middleware.ts 생성

루트 `proxy.ts` (현재 `export async function proxy`) → `middleware.ts`로 교체. 함수명을 `middleware`로 변경.

```ts
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

루트 `proxy.ts`는 삭제.

### Step 1-E: `lib/supabase/proxy.ts` 인증 로직 수정

PRD에 따르면 데이터 조회는 공개. 미인증 사용자 전체 리다이렉트를 제거하고 특정 보호 경로만 리다이렉트하도록 변경.

```ts
// 변경 전 (51~61행): 모든 경로에서 미인증 → /auth/login 리다이렉트
// 변경 후:
const protectedPaths = ["/settings", "/favorites"];
const isProtectedPath = protectedPaths.some((path) =>
  request.nextUrl.pathname.startsWith(path),
);

if (isProtectedPath && !user) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}
```

### Step 1-F: `app/layout.tsx` 수정

- `title`: `"pitch-ac | PL 데이터 플랫폼"`
- `description`: `"프리미어리그 선수·경기 데이터를 맥락과 함께 시각적으로"`
- `lang="en"` → `lang="ko"`

### Step 1-G: `app/page.tsx` 리다이렉트로 교체

```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/matchday");
}
```

### Step 1-H: `(app)` 페이지 플레이스홀더 생성

6개 파일: `(app)/layout.tsx`, `matchday/page.tsx`, `matchday/[fixtureId]/page.tsx`, `players/page.tsx`, `players/[playerId]/page.tsx`, `compare/page.tsx`, `more/page.tsx`

- 동적 라우트는 `params: Promise<{ id: string }>` + `await params` 패턴 (Next.js 15+)
- 각 페이지는 제목 + 설명 텍스트만 포함하는 최소 플레이스홀더

### Step 1-I: 리다이렉트 경로 수정

- `components/login-form.tsx:44` — `router.push("/protected")` → `router.push("/matchday")`
- `app/(auth)/auth/callback/route.ts:9` — `"/protected"` → `"/matchday"`
- `app/(auth)/auth/callback/route.ts:13` — `"/protected"` → `"/matchday"`

### Step 1-J: 빌드 검증

`npm run validate` 실행하여 타입 체크 + lint + format 통과 확인.

---

## Task 002: TypeScript 타입 정의 및 더미 데이터 구축

### 타입 파일 (6개)

| 파일                | 핵심 타입                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `types/team.ts`     | `Team`, `TeamStanding`, `MatchResult`                                                             |
| `types/player.ts`   | `Player`, `Position`, `ContextualStat`, `PlayerSeasonStats`, `PlayerMatchStats`, `RadarAttribute` |
| `types/fixture.ts`  | `Fixture`, `FixtureStatus`, `FixtureEvent`, `FixtureLiveStats`, `Lineup`, `LineupPlayer`          |
| `types/glossary.ts` | `GlossaryTerm`                                                                                    |
| `types/api.ts`      | `ApiResponse<T>`, `PaginatedResponse<T>`                                                          |
| `types/index.ts`    | 배럴 re-export                                                                                    |

**핵심 패턴** — `ContextualStat`: 모든 숫자에 맥락(리그 순위, 백분위, 전년 비교) 동반.

```ts
export interface ContextualStat {
  value: number;
  label: string;
  leagueRank: number | null;
  percentile: number | null;
  previousSeason: number | null;
}
```

### 더미 데이터 (5개)

| 파일                   | 내용                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `lib/mock/teams.ts`    | 6팀 (Arsenal, Man City, Liverpool, Chelsea, Spurs, Man United) |
| `lib/mock/players.ts`  | 12명 + PlayerSeasonStats (GK 1, DEF 3, MID 4, FWD 4)           |
| `lib/mock/fixtures.ts` | GW30 6경기 (FINISHED 3, LIVE 1, SCHEDULED 2) + events          |
| `lib/mock/glossary.ts` | 15개 축구 용어 (xG, xA, xGI 등)                                |
| `lib/mock/index.ts`    | 배럴 re-export                                                 |

**실제 PL 선수명 사용**: Saka, Haaland, Salah, Palmer, De Bruyne, Saliba, Van Dijk 등.

---

## Task 003: 글로벌 내비게이션 구현

### 컴포넌트 구조

```
components/layout/
├── app-header.tsx         # 데스크탑 상단 헤더 (Server Component)
├── nav-links.tsx          # 메뉴 링크 (Client - usePathname)
├── mobile-tab-bar.tsx     # 모바일 하단 탭 (Client)
└── mobile-tab-item.tsx    # 탭 개별 아이템 (Client)
```

### 데스크탑 헤더 (`app-header.tsx`)

- Server Component (AuthButton이 서버에서 인증 상태 확인)
- sticky top-0, border-b, backdrop-blur
- 좌: 로고 "pitch-ac" → `/matchday` | 중: NavLinks | 우: ThemeSwitcher + AuthButton
- `hidden md:block`으로 모바일에서 숨김

### 모바일 탭 바 (`mobile-tab-bar.tsx`)

- Client Component
- fixed bottom-0, border-t
- 4탭: Matchday (Calendar), Players (Users), Compare (Swords), More (Ellipsis)
- `md:hidden`으로 데스크탑에서 숨김
- lucide-react 아이콘 개별 import

### 활성 상태 판별

`usePathname()` + `pathname.startsWith(href)` → `/matchday/123`에서도 Matchday 탭 활성.

### `(app)/layout.tsx` 최종 구조

```tsx
<div className="flex min-h-screen flex-col">
  <AppHeader /> {/* 데스크탑 */}
  <main className="flex-1">
    <div className="container py-6">{children}</div>
  </main>
  <MobileTabBar /> {/* 모바일 */}
  <div className="h-14 md:hidden" /> {/* 탭바 높이 여백 */}
</div>
```

### `more/page.tsx`

모바일 More 탭용 간단한 설정 페이지: 테마 토글 + 인증 버튼.

### globals.css 추가

```css
@layer utilities {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## 구현 순서 요약

```
1. 스타터킷 파일 삭제 (hero, deploy-button, env-var-warning, logos, tutorial/, protected/)
2. lib/utils.ts에서 hasEnvVars 제거
3. app/auth/ → app/(auth)/auth/ 이동
4. middleware.ts 생성 + 루트 proxy.ts 삭제
5. lib/supabase/proxy.ts 인증 로직 수정
6. app/layout.tsx 메타데이터/lang 수정
7. app/page.tsx 리다이렉트로 교체
8. (app) 레이아웃 + 플레이스홀더 페이지들 생성
9. login-form.tsx, callback/route.ts 리다이렉트 경로 수정
10. npm run validate ✓
11. types/ 타입 파일 생성 (6개)
12. lib/mock/ 더미 데이터 생성 (5개)
13. npm run type-check ✓
14. components/layout/ 내비게이션 컴포넌트 생성 (4개)
15. (app)/layout.tsx → 최종 버전 교체
16. more/page.tsx 생성
17. globals.css에 pb-safe 추가
18. npm run validate ✓
19. 개발 서버에서 라우팅/내비게이션 수동 확인
```

## 검증 방법

1. `npm run validate` — 타입 체크 + lint + format 통과
2. `npm run dev` → 브라우저에서:
   - `/` 접속 시 `/matchday`로 리다이렉트 확인
   - 각 페이지 (`/matchday`, `/players`, `/compare`, `/more`) 접근 확인
   - `/matchday/123`, `/players/456` 동적 라우트 확인
   - `/auth/login` 접근 확인 (인증 라우트 URL 유지)
   - 데스크탑: 상단 헤더 표시, 활성 메뉴 하이라이트
   - 모바일 (375px): 하단 탭 바 표시, 헤더 숨김
   - 테마 토글 동작 확인
3. `npm run build` — 프로덕션 빌드 성공 확인

## 수정 대상 파일 목록

| 작업 | 파일                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 삭제 | `components/hero.tsx`, `deploy-button.tsx`, `env-var-warning.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `tutorial/` (5파일), `app/protected/` (2파일), 루트 `proxy.ts` |
| 수정 | `app/layout.tsx`, `app/page.tsx`, `lib/utils.ts`, `lib/supabase/proxy.ts`, `components/login-form.tsx`, `app/(auth)/auth/callback/route.ts`, `app/globals.css`          |
| 이동 | `app/auth/*` → `app/(auth)/auth/*` (8파일)                                                                                                                              |
| 생성 | `middleware.ts`, `app/(app)/layout.tsx`, 6개 페이지, `types/` (6파일), `lib/mock/` (5파일), `components/layout/` (4파일)                                                |
