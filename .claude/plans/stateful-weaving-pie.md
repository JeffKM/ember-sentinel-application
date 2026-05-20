# Task 007: 선수 프로필 페이지 UI 구현 계획

## Context

현재 `/app/(app)/players/[playerId]/page.tsx`는 선수 이름과 기본 정보만 텍스트로 표시하는 최소 구현 상태. ROADMAP의 Task 007은 **맥락 스탯 카드 그리드**, **최근 폼 스파크라인**, **Compare 버튼**, **용어 설명 팝오버**, **스켈레톤 UI**를 포함한 완성된 선수 프로필 페이지를 요구한다.

---

## 1. 패키지 설치

- `recharts` — 스파크라인 차트 (현재 미설치)
- shadcn/ui `progress` — 설치하지 않음, Tailwind 커스텀 바로 구현 (기존 `stat-bar.tsx` 패턴 일관성)
- shadcn/ui `tooltip` — 설치하지 않음, 기존 `Popover` 활용

## 2. 파일 구조

### 생성할 파일 (8개)

```
app/(app)/players/[playerId]/_components/
  player-header-card.tsx        # 헤더 카드 (Server)
  stat-context-card.tsx         # 개별 맥락 스탯 카드 (Server)
  stat-context-grid.tsx         # 스탯 카드 그리드 컨테이너 (Server)
  percentile-bar.tsx            # 백분위 프로그레스 바 (Server)
  season-delta-indicator.tsx    # 전년 비교 ↑↓ 표시 (Server)
  glossary-popover.tsx          # [?] 용어 설명 팝오버 (Client)
  recent-form-sparkline.tsx     # 최근 폼 스파크라인 차트 (Client)
  compare-button.tsx            # Compare 버튼 (Server)
```

### 수정할 파일 (3개)

```
app/(app)/players/[playerId]/page.tsx     # 데이터 조회 확장 + 컴포넌트 조합
app/(app)/players/[playerId]/loading.tsx  # 완전한 스켈레톤 UI
lib/mock/player-stats.ts                  # 경기별 더미 데이터 확장 (10경기/선수)
```

## 3. 컴포넌트 상세

### 3-A. `player-header-card.tsx` (Server)

- Props: `{ player: Player; team: Team; seasonStats?: PlayerSeasonStats }`
- Card에 선수 사진(120px, rounded-full) + 이름(h1) + 클럽 로고&이름 + 등번호/포지션(Badge) + 국적
- 반응형: `flex flex-col items-center sm:flex-row sm:items-start gap-6`

### 3-B. `stat-context-card.tsx` (Server)

- Props: `{ label: string; value: number; format?: (v: number) => string; context: StatContext; glossaryId?: string }`
- Card 내부 구성:
  1. label + GlossaryPopover (glossaryId 있을 때만)
  2. value (크게, tabular-nums)
  3. `리그 {rank}위` 텍스트
  4. PercentileBar
  5. SeasonDeltaIndicator

### 3-C. `stat-context-grid.tsx` (Server)

- Props: `{ seasonStats: PlayerSeasonStats }`
- 7개 스탯 정의 배열 순회 → StatContextCard 렌더링
- 그리드: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`
- 스탯 목록: 골, 어시스트, xG(glossary), xA(glossary), 키패스(glossary), 드리블(glossary), 평균 평점

### 3-D. `percentile-bar.tsx` (Server)

- Props: `{ percentile: number }`
- Tailwind 커스텀 바 (div + width style)
- 색상 분기: 90+→green, 70~89→primary, 50~69→yellow, <50→muted

### 3-E. `season-delta-indicator.tsx` (Server)

- Props: `{ currentValue: number; prevSeasonValue: number | null; format?: (v: number) => string }`
- prevSeason null → "첫 시즌" Badge
- 증가 → TrendingUp (green) + `+{delta}`
- 감소 → TrendingDown (red) + `-{delta}`
- 동일 → Minus (gray) + "동일"

### 3-F. `glossary-popover.tsx` (Client — "use client")

- Props: `{ glossaryId: string }`
- `getGlossaryTermById(glossaryId)` 호출 → definition/analogy/example 표시
- CircleHelp 아이콘(lucide-react) + Popover

### 3-G. `recent-form-sparkline.tsx` (Client — "use client")

- Props: `{ matchStats: PlayerMatchStats[] }`
- Recharts LineChart (height=120)
- X축: 최근 10경기, Y축: 5~10 (rating)
- 기준선: y=7.0 (점선)
- 트렌드 계산: 전반부 평균 vs 후반부 평균 → 상승세/하락세/유지 Badge

### 3-H. `compare-button.tsx` (Server)

- Props: `{ playerId: number }`
- `Link href="/compare?p1={playerId}"` + Button(variant=outline) + GitCompareArrows 아이콘

## 4. 데이터 흐름

```
page.tsx (Server)
  ├── getPlayerById(id) → Player | notFound
  ├── getTeamById(teamId) → Team | notFound
  ├── getPlayerSeasonStats(id) → PlayerSeasonStats | undefined
  └── getMatchStatsByPlayer(id) → PlayerMatchStats[]
       │
       ▼ props 전달
  <PlayerHeaderCard />
  <StatContextGrid />          → <StatContextCard /> ×7
                                    ├── <PercentileBar />
                                    ├── <SeasonDeltaIndicator />
                                    └── <GlossaryPopover /> [Client Island]
  <RecentFormSparkline />      [Client]
  <CompareButton />
```

## 5. 더미 데이터 확장

`lib/mock/player-stats.ts`의 `mockPlayerMatchStats`에 주요 선수(110~112, 103~109) 각각 8~9개 경기 추가 (fixtureId: 4991~4999). 기존 1~2경기 + 추가분으로 총 10경기 확보. 각 경기별 rating 값은 자연스러운 변동 패턴 (6.0~9.5 범위).

## 6. 로딩 스켈레톤 (loading.tsx)

실제 페이지 레이아웃과 일치하는 스켈레톤:

- 헤더 카드 스켈레톤 (사진 원형 + 텍스트 블록)
- 스탯 그리드 스켈레톤 (2x4 카드 7개)
- 스파크라인 스켈레톤 (120px 높이 블록)
- 버튼 스켈레톤

## 7. 구현 순서

1. `npm install recharts`
2. 더미 데이터 확장 (`player-stats.ts`)
3. 기본 서브컴포넌트: `percentile-bar`, `season-delta-indicator`, `compare-button`
4. `glossary-popover` (Client)
5. `stat-context-card` + `stat-context-grid`
6. `player-header-card`
7. `recent-form-sparkline` (Client + Recharts)
8. `page.tsx` 수정 (전체 통합)
9. `loading.tsx` 수정 (스켈레톤)
10. Playwright 검증

## 8. Playwright 검증 체크리스트

1. `/players/110` 접속 → "Mohamed Salah" + "Liverpool" + "FWD" 렌더링
2. 스탯 카드 그리드 최소 4개 (골/어시스트/xG/xA)
3. 각 스탯 카드에 "위" 텍스트 포함 (리그 순위)
4. 각 스탯 카드에 백분위 프로그레스 바 존재
5. 전년 비교 방향 아이콘 (↑/↓) 표시
6. [?] 아이콘 버튼 존재 (xG, xA 등)
7. 스파크라인 SVG 요소 렌더링
8. "선수 비교" 버튼 클릭 → `/compare?p1=110` URL 이동
9. 스켈레톤 UI 표시 확인

## 핵심 참조 파일

- `app/(app)/players/[playerId]/page.tsx` — 수정 대상 (현재 30줄)
- `lib/mock/player-stats.ts` — 더미 데이터 확장 대상 (현재 614줄)
- `lib/mock/glossary.ts` — 용어 팝오버 데이터 (15개 용어, `getGlossaryTermById`)
- `app/(app)/matchday/[fixtureId]/_components/stat-bar.tsx` — 비율 바 스타일 참고
- `components/ui/popover.tsx` — 기존 Popover 컴포넌트
- `types/player.ts` — Player, PlayerSeasonStats, StatContext, PlayerMatchStats 타입
