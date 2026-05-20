# 매치데이 날짜 기반 네비게이션 전환

## Context
현재 매치데이 페이지는 Gameweek(라운드) + 리그 탭 기반 네비게이션으로, "Gameweek 1"처럼 특정 리그의 특정 라운드 경기만 표시. 데이터가 없는 라운드에 진입하면 빈 화면이 보임. 네이버 스포츠 일정처럼 **날짜를 선택하면 해당 날짜의 모든 5대 리그 경기가 리그별로 그룹핑**되어 보이도록 전환.

## URL 변경
- **현재**: `/matchday?league=epl&gw=10`
- **변경**: `/matchday?date=2026-05-11` (기본값: 오늘 KST)

## 수정할 파일

### 1. `lib/date-utils.ts` — 날짜 유틸 함수 추가
- `getTodayDateKey()`: 오늘 KST 기준 YYYY-MM-DD 반환
- `isValidDateKey(dateStr)`: YYYY-MM-DD 형식 검증
- `addDays(dateStr, days)`: 날짜 덧셈 (KST 기준)
- `formatStripDate(dateStr)`: 날짜 스트립용 짧은 레이블 `{ day: "11일", weekday: "일" }`

### 2. `lib/repositories/fixture-repository.ts` — 날짜 기반 조회 추가
- `getFixturesByDate(dateStr)` 함수 추가
  - KST 날짜 00:00~23:59를 UTC로 변환하여 범위 쿼리
  - `TOP5_LEAGUE_IDS`로 5대 리그만 필터
  - `order: date asc`

### 3. `lib/repositories/index.ts` — re-export 추가
- `getFixturesByDate` export 추가

### 4. `app/api/matchday/fixtures/route.ts` — API 라우트 전환
- `MatchdayData` 타입: `gameweek`/`leagueSlug`/`maxRounds` 제거 → `date: string` 추가
- GET 핸들러: `?league=epl&gw=10` → `?date=2026-05-11`
- `getFixturesByGameweek` → `getFixturesByDate` 호출
- 라이브 병합: `filterLiveByLeague` 제거, `getLiveFixtures()` 결과를 직접 `mergeFixturesWithLive`에 전달

### 5. `lib/hooks/use-matchday-fixtures.ts` — 폴링 훅 전환
- 시그니처: `(gameweek, leagueSlug, initialData)` → `(date, initialData)`
- queryKey: `["matchday", "fixtures", date]`
- fetch URL: `/api/matchday/fixtures?date=${date}`

### 6. `app/(app)/matchday/_utils.ts` — 리그별 그루핑 추가
- `groupFixturesByLeague(fixtures)` 함수 추가
  - `TOP5_LEAGUES` 순서(EPL → La Liga → Serie A → Bundesliga → Ligue 1) 유지
  - 경기 없는 리그는 생략
- 기존 `groupFixturesByDate`, `buildDateRange`는 유지 (fixture detail 등에서 사용 가능)

### 7. `app/(app)/matchday/page.tsx` — 메인 페이지 전환
- `searchParams`: `{ gw?, league? }` → `{ date? }`
- 기본값: `getTodayDateKey()` (오늘 KST)
- `LeagueTabs` + `GameweekHeader` 제거 → `DateStrip` 추가
- `getFixturesByGameweek` → `getFixturesByDate` 호출
- `EmptyGameweek` → `EmptyMatchday` (날짜 정보 전달)

### 8. `app/(app)/matchday/_components/matchday-content.tsx` — 그루핑 전환
- `groupFixturesByDate` → `groupFixturesByLeague`
- `FixtureDateGroup` → `LeagueFixtureGroup`
- 폴링 훅 호출: `useMatchdayFixtures(initialData.date, initialData)`

### 9. `app/(app)/matchday/loading.tsx` — 스켈레톤 업데이트
- GW 헤더 스켈레톤 → 날짜 스트립 + 리그 그룹 스켈레톤

### 10. `app/globals.css` — scrollbar-hide 유틸리티 추가
```css
@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

## 새로 추가할 파일

### 1. `app/(app)/matchday/_components/date-strip.tsx` — 날짜 스트립
- 오늘 ± 7일 (총 15일) 수평 스크롤
- 오늘 강조, 선택 날짜 `comic-yellow` 배경
- 좌우 화살표 (ChevronLeft/Right)
- `useEffect`로 선택 날짜 가운데 자동 스크롤
- Client Component (useRef, useEffect 사용)

### 2. `app/(app)/matchday/_components/league-fixture-group.tsx` — 리그별 그룹 래퍼
- `leagueConfig.shortName` + `leagueConfig.country` 헤더
- Server Component (순수 마크업)

### 3. `app/(app)/matchday/_components/empty-matchday.tsx` — 빈 상태
- "5월 11일 일요일에 예정된 경기가 없습니다" 형태
- `EmptyGameweek`를 대체

## 삭제할 파일
- `app/(app)/matchday/_components/gameweek-header.tsx` (DateStrip으로 대체)
- `app/(app)/matchday/_components/league-tabs.tsx` (모든 리그를 한 화면에 표시)
- `app/(app)/matchday/_components/empty-gameweek.tsx` (EmptyMatchday로 대체)

## 변경하지 않는 파일
- `app/(app)/matchday/[fixtureId]/` — fixture detail은 fixture ID 기반, 변경 불필요
- `lib/services/live/live-fixture-service.ts` — `getLiveFixtures()`는 이미 5대 리그 전체 반환
- `lib/repositories/fixture-repository.ts`의 기존 함수 — fixture detail 등에서 사용

## 주의사항
- KST 날짜 경계: 서버/클라이언트 모두 `Asia/Seoul` 타임존 기준
- 라이브 오버레이: fixture ID 기반 병합이므로 날짜 전환과 무관하게 정상 동작
- 골 알림: 5대 리그 전체 폴링으로 더 많은 골 알림 발생 (의도된 동작)
- API-Football 호출 증가 없음: `getLiveFixtures()` 120초 캐시는 기존과 동일

## 검증
1. `/matchday` 접속 → 오늘 날짜의 5대 리그 경기 표시, 리그별 그룹핑
2. 날짜 스트립 날짜 클릭 → URL 변경, 해당 날짜 경기로 전환
3. 경기 없는 날짜 → EmptyMatchday 표시
4. 라이브 경기 존재 시 60초 폴링, 골 알림 정상 동작
5. `npm run validate` 통과
