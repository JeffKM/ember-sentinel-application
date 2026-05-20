# Tailwind CSS v3 → v4 마이그레이션

## Context

pitch-ac 프로젝트가 Supabase 스타터킷 기본값인 Tailwind CSS v3를 사용 중. 특별한 이유 없이 v3를 유지하고 있어 v4(CSS-first 설정, OKLCH 색상)로 업그레이드한다. 프로젝트가 MVP 초기 단계이고 설정이 표준적이라 마이그레이션 위험이 낮다.

---

## Step 1: 공식 업그레이드 도구 실행

```bash
npx @tailwindcss/upgrade@latest
```

자동 처리 항목:

- `@tailwind base/components/utilities` → `@import "tailwindcss"`
- `tailwind.config.ts` → CSS `@theme` 블록 변환
- `postcss.config.mjs` 업데이트
- `!leading-tight` → `leading-tight!` (v4 접미사 방식)
- 패키지 업데이트 (`tailwindcss` v4, `@tailwindcss/postcss` 설치, `autoprefixer` 제거)

**실행 후 결과를 검토하고 아래 목표 상태와 비교하여 수동 조정한다.**

## Step 2: 패키지 정리

자동 도구가 처리하지 못한 부분 수동 처리:

```bash
npm uninstall tailwindcss-animate
npm install -D tw-animate-css
npm install -D prettier-plugin-tailwindcss@latest
```

| 제거                  | 사유                                                |
| --------------------- | --------------------------------------------------- |
| `tailwindcss-animate` | deprecated, `tw-animate-css`로 대체                 |
| `autoprefixer`        | v4 `@tailwindcss/postcss`에 내장 (자동 도구가 처리) |

| 추가/업데이트                        | 사유                               |
| ------------------------------------ | ---------------------------------- |
| `tw-animate-css`                     | tailwindcss-animate의 v4 호환 대체 |
| `prettier-plugin-tailwindcss@latest` | v4 호환 최신 버전                  |

## Step 3: `app/globals.css` 수정

자동 도구 결과를 shadcn/ui v4 공식 neutral 테마로 수동 조정.

**목표 상태:**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... shadcn/ui neutral 테마 OKLCH 값 전체 */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... 다크 모드 OKLCH 값 전체 */
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

핵심 변경:

- `@tailwind` → `@import "tailwindcss"` + `@import "tw-animate-css"`
- `@custom-variant dark` — v3의 `darkMode: ["class"]` 대체
- `@theme inline` — `tailwind.config.ts`의 colors/borderRadius 대체
- CSS 변수 값: bare HSL(`0 0% 100%`) → OKLCH(`oklch(1 0 0)`)
- `outline-ring/50` 추가 (shadcn/ui v4 기본)

## Step 4: `tailwind.config.ts` 삭제

모든 설정이 `globals.css`의 `@theme inline`으로 이전되었으므로 삭제.

## Step 5: `postcss.config.mjs` 수정

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

## Step 6: `prettier.config.mjs` 수정

```diff
- tailwindConfig: "./tailwind.config.ts",
+ tailwindStylesheet: "./app/globals.css",
```

## Step 7: 컴포넌트 수정 (2개)

### `components/deploy-button.tsx:16`

```diff
- fill="hsl(var(--background)/1)"
+ fill="var(--background)"
```

### `components/hero.tsx:21`

```diff
- className="... !leading-tight ..."
+ className="... leading-tight! ..."
```

(자동 도구가 처리할 수 있으나 확인 필요)

## Step 8: `eslint.config.mjs` 수정

`tailwind.config.ts` 삭제에 따라 ESLint 예외 목록에서 제거:

```diff
  files: [
    ...
    "next.config.ts",
-   "tailwind.config.ts",
    "postcss.config.mjs",
    ...
  ],
```

## Step 9: CLAUDE.md 업데이트

**`/Users/jefflee/workspace/pitch-ac/CLAUDE.md` 변경:**

```diff
- - Tailwind CSS **v3** 사용 (글로벌 설정의 v4와 다름 — v3 문법 사용할 것)
+ - Tailwind CSS **v4** 사용 (CSS-first 설정, `@theme inline` 방식)
+ - tailwind.config.ts 없음 — 모든 테마 설정은 `app/globals.css`에 정의
+ - 색상: OKLCH 색상 공간, 애니메이션: tw-animate-css
```

Summary Instructions도 업데이트:

```diff
- 2. Tailwind v3 사용 (v4 아님)
+ 2. Tailwind v4 사용 (CSS-first, @theme inline)
```

**코드 품질 자동화 섹션의 Prettier 설명도 반영:**

```diff
- - **Prettier** — `prettier.config.mjs` (prettier-plugin-tailwindcss 포함)
+ - **Prettier** — `prettier.config.mjs` (prettier-plugin-tailwindcss, tailwindStylesheet 방식)
```

## Step 10: 포매팅 및 검증

```bash
npm run format
npm run lint:fix
npm run validate    # type-check + lint + format:check
npm run build       # 프로덕션 빌드 확인
```

## Step 11: 커밋

```
🔧 chore: Tailwind CSS v3 → v4 마이그레이션

- tailwindcss v4, @tailwindcss/postcss, tw-animate-css 설치
- tailwindcss v3, tailwindcss-animate, autoprefixer 제거
- tailwind.config.ts 삭제 → globals.css @theme inline 블록으로 이전
- CSS 변수 HSL → OKLCH 전환 (shadcn/ui neutral 테마)
- postcss.config.mjs: @tailwindcss/postcss로 변경
- prettier.config.mjs: tailwindStylesheet 옵션으로 변경
- !leading-tight → leading-tight! (v4 접미사 방식)
- hsl(var(--background)/1) → var(--background)
```

---

## 수정 대상 파일

| 파일                                 | 작업                         |
| ------------------------------------ | ---------------------------- |
| `app/globals.css`                    | 전면 재작성 (가장 중대)      |
| `postcss.config.mjs`                 | 플러그인 교체                |
| `tailwind.config.ts`                 | **삭제**                     |
| `prettier.config.mjs`                | tailwindStylesheet 변경      |
| `eslint.config.mjs`                  | tailwind.config.ts 참조 제거 |
| `components/deploy-button.tsx`       | hsl(var()) → var()           |
| `components/hero.tsx`                | !important 접미사            |
| `CLAUDE.md`                          | v3 → v4 문서 업데이트        |
| `package.json` / `package-lock.json` | 패키지 변경                  |

## 유지 (변경 없음)

- `lib/utils.ts` — cn() 함수 v4 호환
- `tailwind-merge` — v3.3.0 v4 지원
- `class-variance-authority` — 변경 없음
- `components.json` — config가 이미 빈 문자열
- `next.config.ts` — 영향 없음
- shadcn/ui 컴포넌트 — 기존 유지 (클래스명 동일하게 매핑)
