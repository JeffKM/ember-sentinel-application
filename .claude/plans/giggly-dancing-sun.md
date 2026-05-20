# Task 022: 성능 최적화 구현 계획

## Context

Phase 1~3 완료 후 전체 기능이 동작하는 상태이나, 성능 최적화가 미적용 상태. 주요 문제:
- **이미지**: `next/image`를 사용하나 5개 파일에서 `unoptimized` prop → Next.js Image Optimization 비활성화
- **번들**: recharts(~150KB gzip)가 정적 import → 초기 JS 번들에 포함
- **API 캐싱**: 폴링 API 엔드포인트에 Cache-Control 헤더 없음, TanStack Query staleTime 미설정
- **로딩 UX**: compare 페이지에 loading.tsx 없음, Suspense fallback이 단순 텍스트

---

## A. 이미지 최적화 — `unoptimized` 제거 + `sizes` 추가

5개 파일에서 `unoptimized` prop을 제거하고 `sizes`를 추가하여 Next.js Image Optimization 활성화.
`next.config.ts`에 `remotePatterns`(cdn.sportmonks.com, media.api-sports.io)이 이미 설정되어 있으므로 추가 설정 불필요.

**수정 파일 4개:**

| 파일 | 이미지 | 변경 |
|------|--------|------|
| `app/(app)/players/_components/player-card.tsx:52-59` | 선수 사진 80×80 | `unoptimized` 제거, `sizes="80px"` 추가 |
| `app/(app)/players/[playerId]/_components/player-header-card.tsx:33-39` | 선수 사진 fill (size-28=112px) | `unoptimized` 제거, `sizes="112px"` 추가 |
| `app/(app)/players/[playerId]/_components/player-header-card.tsx:53-59` | 팀 로고 fill (size-5=20px) | `unoptimized` 제거, `sizes="20px"` 추가 |
| `app/(app)/compare/_components/player-slot.tsx:47-53` | 선수 사진 fill (size-12=48px) | `unoptimized` 제거, `sizes="48px"` 추가 |
| `components/player-search-combobox.tsx:138-145` | 선수 사진 32×32 | `unoptimized` 제거, `sizes="32px"` 추가 |

**효과**: 원본 PNG/JPG → WebP 자동 변환 + 요청 사이즈에 맞춘 리사이징. 이미지당 ~80% 용량 절감.

---

## B. recharts 동적 로딩 — `next/dynamic`

recharts를 import하는 2개 컴포넌트를 부모에서 `next/dynamic`으로 교체. 컴포넌트 자체는 수정하지 않음.

**수정 파일 2개:**

### B-1. `app/(app)/players/[playerId]/page.tsx` (Server Component)

```tsx
// Before
import { PlayerRadarChart } from "@/components/charts/player-radar-chart";
import { RecentFormSparkline } from "./_components/recent-form-sparkline";

// After
import dynamic from "next/dynamic";

const PlayerRadarChart = dynamic(
  () => import("@/components/charts/player-radar-chart").then((m) => m.PlayerRadarChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-xl border bg-muted" />,
  },
);

const RecentFormSparkline = dynamic(
  () => import("./_components/recent-form-sparkline").then((m) => m.RecentFormSparkline),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-[120px] animate-pulse rounded bg-muted" />
      </div>
    ),
  },
);
```

### B-2. `app/(app)/compare/_components/compare-client.tsx` (Client Component)

```tsx
// Before (line 8)
import { PlayerRadarChart } from "@/components/charts/player-radar-chart";

// After
import dynamic from "next/dynamic";

const PlayerRadarChart = dynamic(
  () => import("@/components/charts/player-radar-chart").then((m) => m.PlayerRadarChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-xl border bg-muted" />,
  },
);
```

**효과**: recharts ~150KB gzip이 초기 번들에서 분리 → 별도 청크로 지연 로딩. 차트 미사용 시 코드 전혀 로드하지 않음.

---

## C. API 캐싱 — Cache-Control 헤더 + TanStack Query staleTime

### C-1. API 라우트 Cache-Control 헤더 추가 (2개 파일)

**`app/api/matchday/fixtures/route.ts`** (line 88-92):
- 라이브 경기 있음: `Cache-Control: public, s-maxage=10, stale-while-revalidate=30`
- 라이브 경기 없음: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

**`app/api/matchday/fixture/route.ts`** (line 124-128):
- LIVE 상태: `Cache-Control: public, s-maxage=10, stale-while-revalidate=30`
- 비라이브: `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`

### C-2. TanStack Query staleTime 추가 (2개 파일)

**`lib/hooks/use-matchday-fixtures.ts`**: `staleTime: 30_000` 추가
**`lib/hooks/use-fixture-detail.ts`**: `staleTime: 30_000` 추가

→ 30초간 fresh 상태 유지. 페이지 내 탭 전환이나 컴포넌트 재마운트 시 불필요한 네트워크 요청 차단.

---

## D. 비교 페이지 로딩 개선 — loading.tsx + Suspense fallback

### D-1. 신규 파일: `app/(app)/compare/loading.tsx`

선수 선택 슬롯 2개 + 안내 영역 스켈레톤. 기존 matchday/players 패턴과 일관.

### D-2. `app/(app)/compare/page.tsx` Suspense fallback 개선

```tsx
// Before (line 129)
<Suspense fallback={<p className="text-muted-foreground">로딩 중...</p>}>

// After — 선수 선택 슬롯 스켈레톤
<Suspense fallback={<CompareSlotsSkeleton />}>
```

스켈레톤은 인라인 또는 별도 컴포넌트로 Card 2개(선수 A/B 슬롯) 형태 구현.
`Card`, `CardContent`, `CardHeader` import 추가 필요.

---

## 수정 파일 요약

| # | 파일 경로 | 변경 유형 | 영역 |
|---|----------|----------|------|
| 1 | `app/(app)/players/_components/player-card.tsx` | unoptimized 제거 | A |
| 2 | `app/(app)/players/[playerId]/_components/player-header-card.tsx` | unoptimized 제거 ×2 | A |
| 3 | `app/(app)/compare/_components/player-slot.tsx` | unoptimized 제거 | A |
| 4 | `components/player-search-combobox.tsx` | unoptimized 제거 | A |
| 5 | `app/(app)/players/[playerId]/page.tsx` | dynamic import 적용 | B |
| 6 | `app/(app)/compare/_components/compare-client.tsx` | dynamic import 적용 | B |
| 7 | `app/api/matchday/fixtures/route.ts` | Cache-Control 헤더 | C |
| 8 | `app/api/matchday/fixture/route.ts` | Cache-Control 헤더 | C |
| 9 | `lib/hooks/use-matchday-fixtures.ts` | staleTime 추가 | C |
| 10 | `lib/hooks/use-fixture-detail.ts` | staleTime 추가 | C |
| 11 | `app/(app)/compare/loading.tsx` | **신규** 스켈레톤 | D |
| 12 | `app/(app)/compare/page.tsx` | Suspense fallback 개선 | D |

---

## 검증

1. `npm run type-check && npm run build` — 빌드 성공 확인
2. Playwright MCP 브라우저 검증:
   - `/players` → 선수 사진이 `/_next/image?url=...&w=80&q=75` 경유 확인 (A)
   - `/players/[id]` → Network 탭에서 recharts 청크가 별도 로딩되는지 확인 (B)
   - `/api/matchday/fixtures?gw=31` → Response Headers에 `Cache-Control` 존재 확인 (C)
   - `/compare` → loading.tsx 스켈레톤 표시 확인 (D)
   - 콘솔 에러 0개
