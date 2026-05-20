# Task 004: 매치데이 대시보드 UI (F001)

## Context

현재 매치데이 페이지(`app/(app)/matchday/page.tsx`)는 팀명+스코어+상태를 텍스트 리스트로 보여주는 최소한의 스캐폴딩 상태. Task 004에서 게임위크 네비게이션, 날짜별 경기 카드 그룹핑, 상태별 UI 차별화, 라이브 펄스 애니메이션, 스켈레톤 로딩 등 실제 매치데이 대시보드 UI를 완성한다.

## 수정/생성 파일 목록

| 파일                                                       | 작업 | 설명                                                  |
| ---------------------------------------------------------- | ---- | ----------------------------------------------------- |
| `next.config.ts`                                           | 수정 | images.remotePatterns 추가 (api-sports.io 팀 로고)    |
| `app/(app)/matchday/page.tsx`                              | 수정 | searchParams 기반 GW 읽기, 날짜 그룹핑, 컴포넌트 조립 |
| `app/(app)/matchday/loading.tsx`                           | 생성 | 스켈레톤 UI                                           |
| `app/(app)/matchday/_components/gameweek-header.tsx`       | 생성 | "use client", GW 네비게이션 (이전/다음 화살표)        |
| `app/(app)/matchday/_components/fixture-card.tsx`          | 생성 | 경기 카드 (상태별 UI 분기)                            |
| `app/(app)/matchday/_components/fixture-date-group.tsx`    | 생성 | 날짜별 그룹 래퍼                                      |
| `app/(app)/matchday/_components/fixture-status-badge.tsx`  | 생성 | NS/LIVE/FT 상태 배지                                  |
| `app/(app)/matchday/_components/live-pulse.tsx`            | 생성 | 라이브 펄스 인디케이터 (animate-ping)                 |
| `app/(app)/matchday/_components/empty-gameweek.tsx`        | 생성 | 경기 없음 빈 상태                                     |
| `app/(app)/matchday/_components/fixture-card-skeleton.tsx` | 생성 | 카드 스켈레톤                                         |

## 구현 계획

### Step 1: next.config.ts — 이미지 remotePatterns 추가

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "media.api-sports.io", pathname: "/football/**" },
  ],
},
```

### Step 2: 소형 컴포넌트 (의존성 없음)

**`live-pulse.tsx`** — 라이브 경기 펄스 인디케이터

- `animate-ping` (Tailwind 내장) 으로 초록 원형 펄스
- Server Component

**`fixture-status-badge.tsx`** — 상태별 배지

- Props: `{ status, minute, kickoffTime }`
- NS → `<Badge variant="secondary">{킥오프시간}</Badge>`
- LIVE → 초록 배경 Badge + LivePulse + `{minute}'`
- FT → `<Badge variant="outline">FT</Badge>`

**`empty-gameweek.tsx`** — 경기 없는 GW

- CalendarX2 아이콘 + "이 게임위크에 경기 데이터가 없습니다" 텍스트

**`fixture-card-skeleton.tsx`** — 카드 스켈레톤

- Card + animate-pulse 플레이스홀더 (팀 로고 원형 + 팀명 + 스코어 영역)

### Step 3: FixtureCard — 경기 카드 컴포넌트

Props: `{ fixture, homeTeam, awayTeam, homeStanding?, awayStanding? }`

**레이아웃** (shadcn Card 기반):

```
[로고] ARS (2위)  |  2 - 1  |  CHE (4위) [로고]
                  |  [FT]   |
              xG 2.18 - 1.12        ← FT만
           점유율 58% - 42%         ← FT만
```

상태별 차이:

- **NS**: 스코어 대신 킥오프 시간 표시, xG/점유율 없음
- **LIVE**: 스코어 표시, 카드 보더 `border-green-500/50`, xG/점유율 없음
- **FT**: 스코어 + 하단에 xG/점유율 미리보기

전체 카드를 `<Link href={/matchday/${id}}>` 로 감싸 클릭 시 상세 페이지 이동.
팀명 아래 순위 표시로 맥락 데이터 규칙 준수. `next/image`로 팀 로고 표시.

### Step 4: FixtureDateGroup — 날짜별 그룹 래퍼

Props: `{ dateLabel, children }`

- 날짜 레이블: `text-sm font-medium text-muted-foreground` (예: "토요일, 3월 15일")
- children으로 FixtureCard 목록 렌더

### Step 5: GameweekHeader — 게임위크 네비게이션 ("use client")

Props: `{ gameweek, dateRange, hasPrev, hasNext }`

- `useRouter()` + `router.push(/matchday?gw=N)` 방식
- GW 범위: 1~38, 범위 바깥 버튼 disabled
- 중앙: `<h1>Gameweek {N}</h1>` + 날짜 범위 서브텍스트
- 좌/우: ChevronLeft/ChevronRight 아이콘 버튼

searchParams 기반의 이점: URL 공유 가능, 브라우저 히스토리 지원, Server Component 유지.

### Step 6: loading.tsx — 스켈레톤 페이지

- GW 헤더 스켈레톤 + 날짜 그룹 스켈레톤 2개 + 각 그룹 내 FixtureCardSkeleton 3개

### Step 7: page.tsx — 전체 조립

```
1. searchParams에서 gw 파라미터 읽기 (기본값 28)
2. getFixturesByGameweek(gw) 호출
3. 날짜별 그룹핑 (Intl.DateTimeFormat 'ko-KR' 사용)
4. 날짜 범위 계산 (첫 경기~마지막 경기 날짜)
5. GameweekHeader + FixtureDateGroup > FixtureCard 렌더
6. 경기 0개면 EmptyGameweek 렌더
```

날짜 그룹핑 유틸: page.tsx 파일 내 헬퍼 함수로 구현 (외부 파일 불필요).
`Intl.DateTimeFormat('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' })` 사용.

## 기존 재사용 자산

- `getFixturesByGameweek()`, `getTeamById()`, `getStandingByTeamId()` — `@/lib/mock`
- `Card`, `CardContent` — `@/components/ui/card`
- `Badge` — `@/components/ui/badge`
- `Button` — `@/components/ui/button`
- `cn()` — `@/lib/utils`
- `ChevronLeft`, `ChevronRight`, `CalendarX2` — `lucide-react`

## 검증 방법

1. `npm run dev` → `/matchday` 접속
2. "Gameweek 28" 헤더 + 날짜 범위 표시 확인
3. 이전/다음 화살표 클릭 시 GW 번호 변경 (GW27 → 빈 상태)
4. 6개 경기 카드가 3개 날짜 그룹으로 분리 렌더링
5. FT 카드: "FT" 배지 + xG + 점유율 표시
6. LIVE 카드: 녹색 보더 + 펄스 애니메이션 + 진행 분
7. NS 카드: 킥오프 시간 표시
8. 카드 클릭 → `/matchday/[fixtureId]` 이동
9. `npm run build` 성공 (타입 에러 없음)
10. `npm run validate` 통과
