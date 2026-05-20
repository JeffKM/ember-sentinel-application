# CLAUDE.md 개선 계획

## Context

현재 CLAUDE.md(121줄)가 참고 자료의 모범 사례와 괴리가 있음:

- 공식 문서 권장: **200줄 미만**, 짧을수록 좋음
- "계획된" 항목(미설치 스택, 미래 구조)이 노이즈로 작용
- 글로벌 `~/.claude/CLAUDE.md`와 중복 (strict, Server Components, camelCase 등)
- 상세 디렉토리 트리가 Claude가 직접 탐색 가능한 정보를 토큰으로 소비
- `.claude/rules/` 미활용 → 모든 지침이 항상 로드됨

**목표**: 항상 로드되는 컨텍스트를 121줄 → ~55줄로 줄이고, 나머지는 관련 파일 작업 시에만 조건부 로드.

---

## 변경 1: CLAUDE.md 재작성 (~55줄)

**파일**: `/Users/jefflee/workspace/pitch-ac/CLAUDE.md`

### 제거 항목과 이유

| 제거 내용                              | 이유                                     |
| -------------------------------------- | ---------------------------------------- |
| "This file provides guidance..." 첫 줄 | Claude가 이미 CLAUDE.md 용도를 앎        |
| MVP 기능 상세 설명                     | 한 줄 요약으로 축소                      |
| 계획된 추가 스택 (미설치)              | 존재하지 않는 것은 노이즈                |
| 현재 디렉토리 구조 트리                | Claude가 직접 탐색 가능                  |
| 계획된 디렉토리 구조                   | 아직 존재하지 않음                       |
| Path Aliases 섹션                      | `tsconfig.json`에서 확인 가능            |
| 레이어드 아키텍처 (향후)               | 글로벌에 이미 있고, 아직 미구현          |
| TypeScript strict, any 금지            | 글로벌 CLAUDE.md에 이미 정의             |
| Server Components 우선                 | 글로벌에 이미 정의                       |
| lucide-react 개별 임포트               | 글로벌에 이미 정의                       |
| next-themes, shadcn 상세               | `components.json` + 글로벌에서 확인 가능 |

### 새 CLAUDE.md 구조

```markdown
# pitch-ac

PL(프리미어리그) 선수·경기 데이터를 맥락과 함께 시각적으로 보여주는 데이터 플랫폼.
핵심 기능: 선수 프로필(스탯+맥락), 선수 비교 배틀카드, 매치데이 대시보드.
현재 상태: Supabase 스타터킷 기반, 인증 플로우 구현됨. MVP 개발 초기 단계.

## 개발 명령어

npm run dev # 개발 서버
npm run build # 프로덕션 빌드
npm run lint # ESLint 검사

## 기술 스택 특이사항

- Tailwind CSS **v3** 사용 (글로벌 설정의 v4와 다름 — v3 문법 사용할 것)
- Next.js `cacheComponents: true` 활성화 (`next.config.ts`)
- shadcn/ui 설정은 `components.json` 참조
- Supabase 인증: `@supabase/ssr` 기반, `lib/supabase/proxy.ts`로 세션 관리

## 프로젝트 규칙

- default export 대신 named export (page.tsx, layout.tsx 등 Next.js 규약 파일은 예외)
- 모든 숫자 데이터에 맥락 함께 표시 (리그 순위, 백분위, 전년 비교 중 최소 1개)
- 축구 전문 용어(xG, xA 등)에는 설명 팝오버 제공
- 커스텀 CSS 파일 금지, Tailwind 유틸리티 클래스만 사용
- `@/*` path alias 사용

## Supabase 인증

- 브라우저: `@/lib/supabase/client` (Client Component)
- 서버: `@/lib/supabase/server` (매 요청마다 새 인스턴스 생성 필수)
- 세션 갱신: `lib/supabase/proxy.ts`의 `updateSession()`

## 환경 변수

`.env.local` 필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Summary Instructions

대화 압축 시 반드시 유지할 내용:

1. PL 데이터 플랫폼, 모든 숫자에 맥락 필수
2. Tailwind v3 사용 (v4 아님)
3. Supabase 서버 클라이언트는 매 요청마다 새 인스턴스
```

---

## 변경 2: `.claude/rules/` 규칙 파일 생성

### 파일 2-1: `.claude/rules/supabase.md`

**경로 범위**: `lib/supabase/**`, `app/auth/**`, `middleware.ts`

```yaml
---
paths:
  - "lib/supabase/**"
  - "app/auth/**"
  - "middleware.ts"
---
```

**내용**: Supabase 클라이언트 사용 패턴 상세

- Fluid Compute 호환: 서버 클라이언트를 전역 변수에 저장 금지
- `proxy.ts`: `createServerClient`와 `supabase.auth.getClaims()` 사이에 코드 삽입 금지
- Server Component에서 `setAll` 호출 시 에러 무시 패턴 (정상 동작)
- 새 NextResponse 생성 시 쿠키 복사 필수 (세션 동기화)
- 미인증 사용자 리다이렉트: `/auth/login` (루트 `/`는 예외)

### 파일 2-2: `.claude/rules/ui-components.md`

**경로 범위**: `components/**`, `app/**/page.tsx`, `app/**/layout.tsx`

```yaml
---
paths:
  - "components/**"
  - "app/**/page.tsx"
  - "app/**/layout.tsx"
---
```

**내용**: UX 원칙 + UI 규칙

- 모든 숫자에 맥락: 단독 숫자 표시 금지, 비교 대상과 함께
- 3초 안에 핵심 파악: 색상·아이콘·크기로 정보 우선순위 시각화
- 공유하고 싶은 디자인: 배틀카드·프로필의 SNS 공유 최적화
- 초보 팬도 환영: 전문 용어에 설명 팝오버
- shadcn/ui 추가: `npx shadcn@latest add <component>`
- 다크모드: class 기반 (next-themes), CSS 변수는 `app/globals.css`

### 파일 2-3: `.claude/rules/api-routes.md`

**경로 범위**: `app/api/**`, `lib/services/**`, `lib/repositories/**`

```yaml
---
paths:
  - "app/api/**"
  - "lib/services/**"
  - "lib/repositories/**"
---
```

**내용**: API 설계 규칙 (해당 경로가 생길 때 자동 적용)

- 레이어드 아키텍처: API Route → Service → Repository
- `ApiResponse<T> = { data: T | null; error: string | null }` 래퍼
- DTO 패턴 사용
- try-catch 필수, 적절한 HTTP 상태 코드
- DB 트랜잭션 처리

---

## 변경 3: 글로벌 `~/.claude/CLAUDE.md` 수정

**파일**: `/Users/jefflee/.claude/CLAUDE.md` (20줄)

Tailwind CSS v4 → 프로젝트별 버전이 다를 수 있으므로 수정:

```diff
 ## 기술 스택
-- CSS: Tailwind CSS v4
+- CSS: Tailwind CSS (버전은 프로젝트별 package.json 확인)
```

**이유**: 글로벌 설정에 특정 버전을 고정하면 v3 프로젝트에서 v4 문법을 잘못 사용할 수 있음.

---

## 사용자 결정 반영

- **글로벌 CLAUDE.md**: 함께 수정 (Tailwind 버전 충돌 해결)
- **data-display.md**: 생략 (해당 디렉토리 생성 시 추가)

---

## 검증 방법

1. `npm run build` — 빌드 정상 확인 (CLAUDE.md 변경은 코드에 영향 없음)
2. `/memory` 명령으로 로드되는 파일 확인
3. `lib/supabase/server.ts` 수정 작업 시 `supabase.md` 규칙이 로드되는지 확인
4. `components/` 작업 시 `ui-components.md` 규칙이 로드되는지 확인
