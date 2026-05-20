# Google 로그인 코드 리뷰 — nextjs-16 & supabase-postgres-best-practices 스킬 기반

## Context

Google OAuth 로그인이 이미 구현 완료되어 빌드/린트/타입체크 통과. 두 스킬 기준으로 재검토하여 발견된 개선사항을 수정한다.

## 리뷰 결과

### 1. [보안] Open Redirect 취약점 — `app/auth/callback/route.ts`

**문제**: `next` 쿼리 파라미터를 검증 없이 리다이렉트에 사용. 공격자가 `?next=https://evil.com`으로 외부 사이트로 리다이렉트 가능.

```typescript
// 현재 (위험)
const next = searchParams.get("next") ?? "/protected";
return NextResponse.redirect(`${origin}${next}`);
```

**수정**: `next`가 `/`로 시작하는 내부 경로인지 검증 + `new URL()` 패턴 사용 (Next.js 16 Route Handler 권장)

```typescript
const next = searchParams.get("next") ?? "/protected";
// 내부 경로만 허용 (//evil.com 방지)
const safePath =
  next.startsWith("/") && !next.startsWith("//") ? next : "/protected";
return NextResponse.redirect(new URL(safePath, request.url));
```

### 2. [Next.js 16] 리다이렉트 패턴 — `app/auth/callback/route.ts`

**문제**: 문자열 결합 `${origin}/auth/error?error=...` 대신 Next.js 16 스킬 권장 `new URL()` 생성자 사용 필요.

**수정**: 모든 `NextResponse.redirect()` 호출을 `new URL()` 패턴으로 통일

### 3. [코드 품질] OAuth 버튼 에러 핸들링 — `components/oauth-buttons.tsx`

**문제**: `handleGoogleLogin`에 try-catch 없음. `signInWithOAuth` 실패 시 로딩 상태가 해제되지 않음.

**수정**: try-catch 추가 + 에러 시 `setIsLoading(false)` 호출

### 4. [UI] 로딩 인디케이터 개선 — `components/oauth-buttons.tsx`

**문제**: `<span className="animate-spin">...</span>`은 부자연스러움. 프로젝트가 lucide-react를 사용하므로 `Loader2` 아이콘 활용.

**수정**: `Loader2` 아이콘으로 교체

## 수정 파일 목록

| 파일                           | 수정 내용                                  |
| ------------------------------ | ------------------------------------------ |
| `app/auth/callback/route.ts`   | open redirect 방지 + `new URL()` 패턴 적용 |
| `components/oauth-buttons.tsx` | try-catch 에러 핸들링 + Loader2 아이콘     |

> `login-form.tsx`, `sign-up-form.tsx`는 수정 불필요 (OAuth 컴포넌트를 올바르게 사용 중)

## Supabase 스킬 리뷰 결과

이번 변경은 Supabase Auth SDK(`signInWithOAuth`, `exchangeCodeForSession`)만 사용하며 직접적인 DB 쿼리/RLS 정책 변경이 없어 추가 수정사항 없음. 향후 OAuth 사용자 프로필 테이블 연동 시 RLS 정책 설정 필요.

## 검증 방법

1. `npm run type-check`
2. `npm run lint`
3. `npm run build`
