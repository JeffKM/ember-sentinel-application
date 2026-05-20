# Task 008: 레이더 차트 컴포넌트 구현 (F007)

## Context

선수 프로필 페이지에 능력치 레이더 차트를 추가하고, 선수 비교 페이지에서도 2명의 선수를 비교하는 레이더 차트를 표시해야 한다. recharts v3.8.0이 이미 설치되어 있고, `RadarData` 타입과 12명 선수의 더미 데이터가 완비되어 있다. 기존 `RecentFormSparkline`의 recharts 사용 패턴을 따른다.

## 구현 계획

### Step 1: `components/charts/player-radar-chart.tsx` 생성

핵심 레이더 차트 Client Component. Discriminated union props로 2가지 모드 지원.

**Props 설계:**

```typescript
// 프로필 모드: 선수 vs 포지션 평균
interface ProfileModeProps {
  mode: "profile";
  radarData: RadarData;
  playerName: string;
}
// 비교 모드: 선수 vs 선수
interface CompareModeProps {
  mode: "compare";
  player1: { name: string; data: RadarDataPoint[] };
  player2: { name: string; data: RadarDataPoint[] };
}
type PlayerRadarChartProps = ProfileModeProps | CompareModeProps;
```

**recharts 구성:**

- `RadarChart` + `PolarGrid` + `PolarAngleAxis` + `PolarRadiusAxis` + `Radar` x2 + `Tooltip` + `Legend`
- 색상: dataset1 = `var(--chart-1)`, dataset2 = `var(--chart-2)` (CSS 변수, 다크모드 자동 대응)
- `Radar` 렌더링 순서: 뒤(포지션평균/player2, fillOpacity=0.15) → 앞(선수/player1, fillOpacity=0.25)
- `PolarRadiusAxis` domain=[0, 100], tick=false (눈금 숨김)

**반응형 크기:**

```tsx
<div className="h-[250px] sm:h-[300px] lg:h-[350px]">
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart ...>
```

**강점/약점 라벨** (프로필 모드에서만):

- 강점: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200` Badge
- 약점: `variant="outline"` + `text-destructive` Badge

**커스텀 Tooltip:** 기존 RecentFormSparkline 패턴 따라 `bg-popover border shadow-md` 스타일

**data-testid 부여:** `radar-chart-container`, `strength-labels`, `weakness-labels`

### Step 2: `app/(app)/players/[playerId]/page.tsx` 수정

`StatContextGrid`와 `RecentFormSparkline` 사이에 레이더 차트 삽입:

```tsx
import { PlayerRadarChart } from "@/components/charts/player-radar-chart";

// StatContextGrid 아래, RecentFormSparkline 위에:
{
  seasonStats && (
    <PlayerRadarChart
      mode="profile"
      radarData={seasonStats.radarData}
      playerName={player.name}
    />
  );
}
```

### Step 3: `app/(app)/compare/page.tsx` 수정

Playwright 검증을 위해 `?p1=X&p2=Y` 쿼리 파라미터로 비교 모드 레이더 차트 표시:

- `searchParams`에서 `p1`, `p2` 파싱 (Next.js 16 `Promise<>` 패턴)
- 두 선수 모두 유효하면 `PlayerRadarChart mode="compare"` 렌더링
- 선수 미선택 시 안내 메시지 표시
- Task 009에서 본격적인 비교 UI(자동완성 슬롯, 스탯 테이블 등)를 구현할 예정이므로, 여기서는 레이더 차트만 배치

## 수정 파일 목록

| 파일                                       | 작업                                 |
| ------------------------------------------ | ------------------------------------ |
| `components/charts/player-radar-chart.tsx` | 신규 생성                            |
| `app/(app)/players/[playerId]/page.tsx`    | import + 레이더 차트 렌더링 추가     |
| `app/(app)/compare/page.tsx`               | searchParams 파싱 + 비교 모드 렌더링 |

## 참조 파일 (수정 없음)

- `types/radar.ts` — RadarData, RadarDataPoint, RadarDimension 타입
- `lib/mock/player-stats.ts` — mockPlayerSeasonStats (radarData 포함)
- `app/(app)/players/[playerId]/_components/recent-form-sparkline.tsx` — recharts 패턴 참조

## 검증 방법

1. `npm run type-check` — TypeScript 컴파일 에러 없음
2. `npm run lint` — ESLint 통과
3. `npm run dev` 후 수동 확인:
   - `/players/110` (Salah) → 레이더 차트 SVG + 강점/약점 라벨 표시
   - `/compare?p1=110&p2=111` → 비교 모드 레이더 차트 표시
   - 모바일(375px), 데스크탑(1280px) 반응형 확인
4. Playwright 테스트 (ROADMAP 검증 항목 기준)
