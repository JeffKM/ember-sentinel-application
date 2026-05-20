# 홈 화면 리디자인 — 5대 리그 데이터 허브

## Context

현재 홈 화면은 **맨시티 전용 팬 사이트**로 구성되어 있지만, 실제 사이트는 **5대 리그 데이터 허브**로 발전했다.
- 메타데이터: "Man City Fan Site" / "Manchester City players come alive"
- 콘텐츠: Etihad Stadium, Haaland 스탯(하드코딩), Man City vs United(하드코딩)
- 실제 기능: Matchday(5대 리그 경기), Ranking(5대 리그 순위), ScoutLab(60+ 메트릭 분석)

**목표**: 코믹 디자인 시스템(패널, Bangers 폰트, 종이 질감, 보더)을 유지하면서 실제 DB 데이터를 연동하고 5대 리그 균등 콘텐츠로 전환한다.

---

## 새 패널 구성

```
┌─────────────────────────────────────────────────┐
│  히어로 배너 (skyblue) — 풀폭                     │
│  "5-LEAGUE DATA HUB" + 오늘 경기 요약 카운트      │
└─────────────────────────────────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│  TODAY'S MATCHES     │ │  LEAGUE LEADERS      │
│  (white)             │ │  (cream)             │
│  오늘 경기 4~6개     │ │  5대 리그 각 1위 팀  │
│  미니 경기 카드       │ │  로고+팀명+승점      │
│  → /matchday         │ │  → /ranking          │
└──────────────────────┘ └──────────────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TOP SCORERS  │ │ SCOUTLAB     │ │ QUICK LINKS  │
│ (yellow)     │ │ (green)      │ │ (white)      │
│ PL 득점 TOP3 │ │ 기능 소개    │ │ 3대 기능     │
│ → /scouting  │ │ → /scouting  │ │ 빠른 접근    │
└──────────────┘ └──────────────┘ └──────────────┘
┌─────────────────────────────────────────────────┐
│  CTA 배너 (yellow) — 풀폭                       │
│  동적 문구 + 액션 링크                            │
└─────────────────────────────────────────────────┘
```

모바일(md 미만)에서는 모든 패널이 1열 풀폭으로 스택된다.

---

## 구현 단계

### Step 1: 메타데이터 + 헤더/푸터 수정

**파일**: `app/layout.tsx`
- title: `"pitch-ac | Man City Fan Site"` → `"pitch-ac | 5-League Football Data Hub"`
- description: 5대 리그 데이터 플랫폼 설명으로 변경
- keywords: Manchester City 편향 제거, 5대 리그 키워드 추가
- locale: `en_US` → `ko_KR`

**파일**: `app/(marketing)/_components/comic-header.tsx`
- navItems의 MATCHDAY sub: `"LIVE!"` → `"TODAY"` (라이브 기능 제거됨)

**파일**: `app/(marketing)/_components/comic-footer.tsx`
- `{ title: "CITY!", sub: "EST. 1894", accent: true }` → `{ title: "DATA", sub: "5 LEAGUES", accent: true }`

### Step 2: 공유 컴포넌트 이동

`CompetitionBadge`와 `FixtureStatusBadge`를 홈에서도 사용하기 위해 공유 경로로 이동:

- `app/(app)/matchday/_components/competition-badge.tsx` → `components/football/competition-badge.tsx`
- `app/(app)/matchday/_components/fixture-status-badge.tsx` → `components/football/fixture-status-badge.tsx`
- 기존 matchday 페이지의 import 경로 업데이트

### Step 3: 홈 페이지를 async 서버 컴포넌트로 전환

**파일**: `app/(marketing)/page.tsx`

```typescript
export default async function HomePage() {
  const todayDate = getTodayDateKey(); // KST 기준

  // 병렬 데이터 조회
  const [fixtures, standingsMap] = await Promise.all([
    getFixturesByDate(todayDate),
    getAllLeagueStandings(CURRENT_SEASON_LABEL),
  ]);

  // 필요한 팀 ID 수집 → 팀 정보 조회
  const teamIds = collectTeamIds(fixtures, standingsMap);
  const teamsMap = await getTeamsByIds(teamIds);

  return (
    <div className="min-h-screen paper-texture">
      <ComicHeader />
      <ComicHomeContent
        fixtures={fixtures}
        standingsMap={standingsMap}
        teamsMap={teamsMap}
      />
      <ComicFooter />
    </div>
  );
}
```

- `getFixturesByDate`: `lib/repositories/fixture-repository.ts` (기존)
- `getAllLeagueStandings`: `lib/repositories/standing-repository.ts` (기존)
- `getTeamsByIds`: `lib/repositories/team-repository.ts` (기존)

### Step 4: 새 패널 컴포넌트 구현

모든 컴포넌트는 `app/(marketing)/_components/`에 생성. 기존 `ComicPanel`, `ComicPanelHeading`, `ComicPanelTitle` 재사용.

| 새 컴포넌트 | 역할 | 데이터 |
|---|---|---|
| `comic-home-content.tsx` | 전체 그리드 조립 (기존 `comic-home.tsx` 대체) | props로 전달 |
| `hero-banner.tsx` | 상단 히어로 (경기 카운트 동적 표시) | fixtures.length |
| `today-matches-panel.tsx` | 오늘 경기 목록 (최대 6개) | fixtures, teamsMap |
| `mini-fixture-card.tsx` | 홈용 축소 경기 카드 | fixture, home/away team |
| `league-leaders-panel.tsx` | 5대 리그 각 1위 팀 | standingsMap, teamsMap |
| `top-scorers-panel.tsx` | PL 득점 TOP 3 (**Suspense 래핑**) | football-data.org API |
| `scoutlab-spotlight.tsx` | ScoutLab 기능 소개 (정적) | 없음 |
| `quick-links-panel.tsx` | Matchday/Ranking/ScoutLab 빠른 링크 | 없음 |
| `cta-banner.tsx` | 하단 CTA (동적 문구) | fixtures.length |

### Step 5: Top Scorers 패널 (Suspense 분리)

`getCompetitionScorers("PL")`은 외부 API 호출이므로 별도 서버 컴포넌트로 분리하고 Suspense로 감싼다:

```typescript
// comic-home-content.tsx 내부
<Suspense fallback={<TopScorersSkeleton />}>
  <TopScorersPanel />  {/* 내부에서 자체 데이터 fetch */}
</Suspense>
```

- API 캐시: `revalidate: 3600` (1시간, 이미 구현됨)
- rate limit: PL만 호출 (1회/시간) → 부담 최소
- API 실패 시: "TOP SCORERS UNAVAILABLE" 폴백 표시

### Step 6: 빈 상태/에러 처리

- **경기 없는 날**: 히어로 배너에 "NO MATCHES TODAY" + CTA를 `/ranking`으로 변경
- **TodayMatchesPanel**: fixtures가 비면 "Rest day! Check out the standings." + 링크
- **LeagueLeadersPanel**: standings가 비면 "STANDINGS COMING SOON" 표시
- **TopScorersPanel**: ErrorBoundary로 감싸서 API 실패 시 패널 대체 UI

### Step 7: 기존 코드 정리

- `app/(marketing)/_components/comic-home.tsx` 삭제 (comic-home-content.tsx로 대체)
- 삭제되는 내부 컴포넌트: `PlayerBadge`, `StatCard`, `ActionBadge`, `FormationMarker`

---

## 수정 대상 파일 요약

| 파일 | 작업 |
|---|---|
| `app/layout.tsx` | 메타데이터 수정 (title, description, keywords, OG) |
| `app/(marketing)/page.tsx` | async 서버 컴포넌트로 전환 + 데이터 fetch |
| `app/(marketing)/_components/comic-home.tsx` | **삭제** → `comic-home-content.tsx`로 대체 |
| `app/(marketing)/_components/comic-header.tsx` | MATCHDAY sub: "LIVE!" → "TODAY" |
| `app/(marketing)/_components/comic-footer.tsx` | "CITY! EST. 1894" → "DATA / 5 LEAGUES" |
| `app/(app)/matchday/_components/competition-badge.tsx` | `components/football/`로 이동 |
| `app/(app)/matchday/_components/fixture-status-badge.tsx` | `components/football/`로 이동 |
| matchday 관련 import 경로들 | 새 경로로 업데이트 |

**새로 생성 (9개 파일)**:
- `components/football/competition-badge.tsx` (이동)
- `components/football/fixture-status-badge.tsx` (이동)
- `app/(marketing)/_components/comic-home-content.tsx`
- `app/(marketing)/_components/hero-banner.tsx`
- `app/(marketing)/_components/today-matches-panel.tsx`
- `app/(marketing)/_components/mini-fixture-card.tsx`
- `app/(marketing)/_components/league-leaders-panel.tsx`
- `app/(marketing)/_components/top-scorers-panel.tsx`
- `app/(marketing)/_components/scoutlab-spotlight.tsx`
- `app/(marketing)/_components/quick-links-panel.tsx`
- `app/(marketing)/_components/cta-banner.tsx`

---

## 재사용하는 기존 코드

| 기존 코드 | 위치 | 용도 |
|---|---|---|
| `ComicPanel` | `(marketing)/_components/comic-panel.tsx` | 모든 패널 래퍼 |
| `ComicPanelHeading` | 위와 동일 | 히어로 배너 제목 |
| `ComicPanelTitle` | 위와 동일 | 각 패널 제목 |
| `getFixturesByDate` | `lib/repositories/fixture-repository.ts` | 오늘 경기 조회 |
| `getAllLeagueStandings` | `lib/repositories/standing-repository.ts` | 5대 리그 순위 |
| `getTeamsByIds` | `lib/repositories/team-repository.ts` | 팀 정보 (로고) |
| `getCompetitionScorers` | `lib/api/football-data/scorers.ts` | PL 득점 순위 |
| `TOP5_LEAGUES` | `lib/constants/football.ts` | 리그 상수 |
| `Badge` | `components/ui/badge.tsx` | 범용 배지 |

---

## 검증 방법

1. `npm run validate` (type-check + lint + format) 통과 확인
2. `npm run dev`로 홈 화면 렌더링 확인
3. 경기 있는 날: Today's Matches 패널에 실제 경기 카드 표시 확인
4. 경기 없는 날: 빈 상태 UI 확인 (날짜를 변경하여 테스트)
5. League Leaders 패널: 5대 리그 각 1위 팀 표시 확인
6. Top Scorers: API 응답 시 득점 순위 표시, 실패 시 폴백 UI
7. 모바일 뷰 (DevTools 반응형 모드): 1열 스택 레이아웃 확인
8. 다크 모드 전환: 코믹 패널 색상 정상 적용 확인
9. 메타데이터: 브라우저 탭 제목이 "pitch-ac | 5-League Football Data Hub"로 변경 확인
