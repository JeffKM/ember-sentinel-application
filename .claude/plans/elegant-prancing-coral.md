# Task 005: 경기 상세 페이지 UI (F003, F004, F005)

## Context

매치데이 대시보드(Task 004)에서 경기 카드 클릭 시 이동하는 경기 상세 페이지 UI를 구현한다. 현재 `/matchday/[fixtureId]/page.tsx`에는 팀명+스코어 텍스트만 있는 기본 구현만 존재. 프리매치(F003), 라이브(F004), 포스트매치(F005) 3개 탭으로 경기 상태별 정보를 제공해야 한다.

---

## Step 1: 사전 준비

### 1-1. shadcn/ui 컴포넌트 설치

```bash
npx shadcn@latest add tabs separator
```

### 1-2. 타입 추가 (`types/fixture.ts`)

```typescript
export interface H2HResult {
  fixtureId: number;
  date: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
}

export interface InjuredPlayer {
  playerId: number;
  playerName: string;
  teamId: number;
  reason: string;
  expectedReturn: string | null;
}
```

### 1-3. Mock 데이터 추가

- `lib/mock/h2h.ts` — 팀 쌍별 최근 5경기 H2H 결과 (6경기에 대응하는 5쌍)
- `lib/mock/injuries.ts` — 팀별 부상/결장 선수 (팀당 1~2명)
- `lib/mock/index.ts` — re-export 추가

### 1-4. 검증: `npm run validate`

---

## Step 2: 경기 헤더

### 파일: `app/(app)/matchday/[fixtureId]/_components/match-header.tsx`

- 기존 `fixture-card.tsx` 패턴 확장 (로고/스코어/배지 레이아웃)
- GW + 날짜(KST) 표시
- 양팀 로고(64x64) + 풀네임 + 스코어(`text-4xl tabular-nums`)
- `FixtureStatusBadge` 재활용 (`../../_components/fixture-status-badge`에서 import)
- 양팀 순위 정보 (`N위 · Npts`)
- LIVE 경기: Card에 `border-green-500/50` 강조

### 파일: `page.tsx` 리팩토링

- 모든 데이터 조회 (fixture, teams, standings, h2h, injuries)
- `defaultTab` 결정: NS→"prematch", LIVE→"live", FT→"postmatch"
- MatchHeader + FixtureTabs 렌더링

---

## Step 3: 탭 구조

### 파일: `[fixtureId]/_components/fixture-tabs.tsx` — **Client Component**

- shadcn/ui `Tabs` 사용 (접근성 자동 보장, 키보드 네비게이션)
- `defaultValue={defaultTab}`로 경기 상태별 자동 선택
- 3개 탭: "프리매치" / "라이브" (LIVE시 LivePulse 포함) / "포스트매치"
- 각 탭 콘텐츠를 `TabsContent` 안에 배치

### 빈 껍데기 생성

- `prematch-tab.tsx`, `live-tab.tsx`, `postmatch-tab.tsx`

---

## Step 4: 프리매치 탭

### 4-1. `team-form-badge.tsx`

- W/D/L 결과별 색상 Badge
  - W: `bg-green-500/15 text-green-600 border-green-500/30`
  - D: `bg-yellow-500/15 text-yellow-600 border-yellow-500/30`
  - L: `bg-red-500/15 text-red-600 border-red-500/30`

### 4-2. `team-form-row.tsx`

- Card 안에 양팀 최근 5경기 폼을 `grid grid-cols-2`로 나란히 표시
- `TeamStanding.form` 배열 사용

### 4-3. `h2h-results.tsx`

- H2H 최근 5경기 결과 리스트 (날짜 + 스코어 + W/D/L 배지)
- 하단에 Separator + 통산 전적 요약 (N승 / N무 / N패)
- 빈 데이터 시 "H2H 데이터가 없습니다" 표시

### 4-4. `injury-list.tsx`

- 양팀 부상/결장 선수를 `grid grid-cols-2`로 표시
- 빨간 아이콘 + 선수 이름(링크) + 부상 사유
- 빈 경우 "부상자 없음"

### 4-5. `standing-simulator.tsx` — **Client Component**

- 승/무/패 3개 버튼 (`useState`로 시나리오 관리)
- 선택 시 양팀 예상 포인트 변화 표시 (+3/+1/+0)
- 현재 순위 텍스트 (실제 순위 변동은 Phase 3에서 전체 순위표 DB 연동 후)

### 4-6. `player-name-link.tsx` — 공용 컴포넌트

- `<Link href="/players/{playerId}">` 래퍼
- `hover:underline hover:text-primary` 스타일

---

## Step 5: 라이브 탭

### 5-1. `stat-bar.tsx` — 커스텀 대결형 수평 바

- shadcn Progress는 단방향이라 부적합 → 커스텀 div 구현
- 양쪽 수치 + 라벨 + 비율 기반 너비 바
- 6개 스탯: 점유율, 슈팅, 유효 슈팅, xG, 코너킥, 파울
- NS 경기에서는 "경기 시작 전입니다" 빈 상태

### 5-2. `event-timeline.tsx`

- 이벤트를 시간순 정렬
- 홈팀 이벤트 → 왼쪽 정렬, 어웨이 → 오른쪽 정렬, 중앙에 분 표시
- 아이콘: goal→`CircleDot`, substitution→`ArrowLeftRight`, yellow_card→`div bg-yellow-400`, red_card→`div bg-red-500`
- 골 이벤트에 xG 수치 표시
- 선수 이름은 `PlayerNameLink`로 프로필 링크

### 5-3. `lineup-display.tsx` + `lineup-player-dot.tsx` — 포메이션 시각화

- 초록 배경(`bg-gradient-to-b from-green-600 to-green-700`) 피치에 `grid` 좌표 기반 선수 배치
- 등번호 원형 도트 + 선수 성(last name)
- `aspect-[3/4]` 비율, `absolute` 포지셔닝
- 포메이션 문자열 파싱으로 행별 열 수 계산
- 교체 선수 목록은 피치 아래 리스트로 표시
- 홈/어웨이 `grid grid-cols-1 md:grid-cols-2`

### 5-4. `auto-refresh-indicator.tsx` — **Client Component**

- `RefreshCw` 아이콘 + "60초마다 갱신" 텍스트
- 실제 폴링은 Phase 3(Task 017)에서 구현, UI만 배치

---

## Step 6: 포스트매치 탭

### 6-1. 최종 스탯 비교

- `StatBar` 컴포넌트 재활용 (라이브 탭과 동일 6개 스탯)
- NS/LIVE 경기에서는 "경기가 아직 종료되지 않았습니다" 빈 상태

### 6-2. 주요 이벤트 요약

- `EventTimeline` 재활용 (전체 이벤트 표시)

---

## Step 7: 마무리

- `loading.tsx` 스켈레톤 개선 (헤더+탭 형태 반영)
- 모든 경기 상태별 테스트: `/matchday/5001`(FT), `/matchday/5003`(LIVE), `/matchday/5005`(NS)
- 모바일(375px) / 데스크탑(1280px) 반응형 확인
- 다크 모드 확인
- `npm run validate` 최종 확인

---

## 파일 구조 요약

```
app/(app)/matchday/[fixtureId]/
├── page.tsx                    ← 수정 (데이터 조회 + MatchHeader + FixtureTabs)
├── loading.tsx                 ← 수정 (스켈레톤 개선)
├── not-found.tsx               ← 유지
└── _components/
    ├── match-header.tsx        ← 신규 (경기 헤더)
    ├── fixture-tabs.tsx        ← 신규 (Client: 탭 네비게이션)
    ├── prematch-tab.tsx        ← 신규 (프리매치 탭 조립)
    ├── live-tab.tsx            ← 신규 (라이브 탭 조립)
    ├── postmatch-tab.tsx       ← 신규 (포스트매치 탭 조립)
    ├── team-form-badge.tsx     ← 신규 (W/D/L 배지)
    ├── team-form-row.tsx       ← 신규 (양팀 폼 비교)
    ├── h2h-results.tsx         ← 신규 (H2H 전적)
    ├── injury-list.tsx         ← 신규 (부상자 목록)
    ├── standing-simulator.tsx  ← 신규 (Client: 순위 시뮬)
    ├── stat-bar.tsx            ← 신규 (대결형 수평 바)
    ├── event-timeline.tsx      ← 신규 (이벤트 타임라인)
    ├── lineup-display.tsx      ← 신규 (포메이션 시각화)
    ├── lineup-player-dot.tsx   ← 신규 (선수 도트)
    ├── auto-refresh-indicator.tsx ← 신규 (Client: 갱신 표시)
    └── player-name-link.tsx    ← 신규 (선수 프로필 링크)

types/fixture.ts                ← 수정 (H2HResult, InjuredPlayer 추가)
lib/mock/h2h.ts                 ← 신규
lib/mock/injuries.ts            ← 신규
lib/mock/index.ts               ← 수정 (re-export 추가)
```

## 재활용 대상

- `../../_components/fixture-status-badge.tsx` — 경기 상태 배지
- `../../_components/live-pulse.tsx` — 라이브 펄스 애니메이션
- `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button` — 기존 설치
- `@/lib/utils` — `cn()` 유틸리티

## 설계 결정

| 항목            | 결정                                                       | 근거                                        |
| --------------- | ---------------------------------------------------------- | ------------------------------------------- |
| 탭              | shadcn/ui Tabs (Radix)                                     | 접근성 자동 보장, 프로젝트 일관성           |
| 스탯 바         | 커스텀 div 대결형                                          | shadcn Progress는 단방향                    |
| 라인업          | 포메이션 그리드 시각화                                     | grid 데이터 존재, 시각적 차별화             |
| 순위 시뮬       | 포인트 변화만                                              | 빅6만 mock 데이터 존재, 순위 변동은 Phase 3 |
| 자동 갱신       | UI만 배치                                                  | 실제 폴링은 Phase 3(Task 017)               |
| Client 컴포넌트 | fixture-tabs, standing-simulator, auto-refresh-indicator만 | 최소한으로 제한                             |

## 검증

1. `/matchday/5001` (FT) → 포스트매치 탭 자동 선택, 스탯+이벤트 표시
2. `/matchday/5003` (LIVE) → 라이브 탭 자동 선택, 스탯 바+타임라인+라인업
3. `/matchday/5005` (NS) → 프리매치 탭 자동 선택, 폼+H2H+부상자
4. 탭 클릭 전환 정상 동작
5. 선수 이름 클릭 → `/players/[playerId]` 이동
6. 모바일/데스크탑 반응형
7. 다크 모드
8. `npm run validate` 통과
