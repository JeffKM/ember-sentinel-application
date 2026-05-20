# Task 020: 라이브 스코어 실시간 시스템 고도화 (F002)

## Context

현재 API 라우트(`/api/matchday/fixtures`, `/api/matchday/fixture`)가 **Supabase DB만 조회**하지만, cron 동기화(`sync-fixtures`)는 **매일 06:00 UTC에만** 실행된다. 따라서 라이브 경기 중에도 DB의 `status`는 `"NS"` 그대로이며, `hasLive`가 절대 `true`가 되지 않아 60초 폴링이 사실상 비활성 상태다.

**해결 전략**: API 라우트에 "라이브 오버레이(live overlay)" 패턴 도입 — DB에서 기본 데이터를 가져온 후 SportMonks livescores API로 현재 진행 중인 경기 데이터를 병합한다.

---

## 구현 순서

### Step 1: sonner 설치 + Toaster 설정

- `npm install sonner`
- `app/layout.tsx` — `<Toaster richColors position="top-center" />` 추가 (ThemeProvider 안에)

### Step 2: 라이브 경기 서비스 레이어

**새 파일**: `lib/services/live/live-fixture-service.ts`

- `getLiveFixtures()` — `getLivePLFixtures()` 호출 + 서버 인메모리 캐시 (30초 TTL)
  - 다수 사용자 동시 요청 시 SportMonks API 1회만 호출
- `getLiveFixtureById(id)` — `getFixtureById()` 호출 (이미 60초 revalidate 캐시 설정됨)
- `mergeFixturesWithLive(dbFixtures, liveFixtures)` — DB 경기 목록에 라이브 데이터 덮어쓰기

**Rate Limit 안전성**: `getLivePLFixtures()` 30초 캐시 = 최대 120req/hr, 상세 최대 300req/hr → 합계 ~420req/hr (2000 제한의 21%)

### Step 3: 라이브 writeback 서비스

**새 파일**: `lib/services/live/live-writeback.ts`

- `writebackFinishedFixture(fixture)` — FT 경기를 DB에 즉시 반영 (admin client 사용)
- fire-and-forget 패턴 (API 응답 지연 없이 백그라운드 실행)

### Step 4: API 라우트 수정

**수정**: `app/api/matchday/fixtures/route.ts`

- DB 조회 후 해당 GW에 킥오프 시각이 지난 비FT 경기 존재 시 → `getLiveFixtures()` 호출 → `mergeFixturesWithLive()`로 병합
- FT 전환된 경기 감지 시 비동기 writeback

**수정**: `app/api/matchday/fixture/route.ts`

- DB 조회 후 킥오프 시각 지남 + 비FT → `getLiveFixtureById()` 호출하여 데이터 교체
- FT 전환 시 비동기 writeback

### Step 5: 스코어 변경 감지 훅

**새 파일**: `lib/hooks/use-score-change.ts`

- `useScoreChangeDetector()` — `prevScoresRef`로 이전 스코어 추적
- `isInitializedRef`로 첫 로드 시 false positive 방지 (initialData의 기존 스코어에 알림 발생 방지)
- `detectChanges(fixtures)` → `ScoreChange[]` 반환 (어느 팀이 득점했는지 포함)

### Step 6: 골 알림 + 스코어 플래시

**새 파일**: `app/(app)/matchday/_components/goal-notification.tsx`

- `showGoalNotification(change, teams)` — sonner toast로 골 알림 (`⚽ 팀명 골!`, 스코어 표시, 5초 duration)

**새 파일**: `app/(app)/matchday/_components/score-flash.tsx`

- `ScoreFlash` — 스코어 변경 시 2초간 `animate-pulse text-green-500` 적용

### Step 7: MatchdayContent에 스코어 변경 감지 통합

**수정**: `app/(app)/matchday/_components/matchday-content.tsx`

- `useScoreChangeDetector()` 훅 사용
- `useEffect`에서 `data.fixtures` 변경 시 `detectChanges()` → `showGoalNotification()` 트리거

### Step 8: FixtureCard 라이브 UI 강화

**수정**: `app/(app)/matchday/_components/fixture-card.tsx`

- 스코어 영역에 `LivePulse` 컴포넌트 추가 (카드 전체 pulse 아님)
- `ScoreFlash`로 스코어 숫자 감싸기 (목록 + 상세 모두 적용)
- Playwright 검증용 `data-live`, `data-fixture-id` 속성 추가

### Step 9: FixtureDetailContent — FT 전환 시 탭 자동 전환

**수정**: `app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx`

- `prevStatusRef`로 상태 전환 감지 (NS→LIVE: live탭, LIVE→FT: postmatch탭)
- `activeTab` + `setActiveTab` 상태 관리

**수정**: `app/(app)/matchday/[fixtureId]/_components/fixture-tabs.tsx`

- `defaultValue` → `value` + `onValueChange` 제어 컴포넌트로 전환
- props에 `activeTab`, `onTabChange` 추가

### Step 10: AutoRefreshIndicator 카운트다운

**수정**: `app/(app)/matchday/[fixtureId]/_components/auto-refresh-indicator.tsx`

- `status` prop 추가, LIVE 시 60초 카운트다운 타이머 표시
- LIVE 아닌 경우 렌더링하지 않음

**수정**: `app/(app)/matchday/[fixtureId]/_components/live-tab.tsx`

- `AutoRefreshIndicator`에 `status={fixture.status}` 전달

---

## 파일 변경 요약

| 구분    | 파일                                                                    | 변경 내용                           |
| ------- | ----------------------------------------------------------------------- | ----------------------------------- |
| 설치    | `package.json`                                                          | `sonner` 추가                       |
| 수정    | `app/layout.tsx`                                                        | Toaster 컴포넌트 추가               |
| 새 파일 | `lib/services/live/live-fixture-service.ts`                             | 라이브 경기 서비스 (캐시 + 머지)    |
| 새 파일 | `lib/services/live/live-writeback.ts`                                   | FT 경기 DB writeback                |
| 수정    | `app/api/matchday/fixtures/route.ts`                                    | 라이브 오버레이 머지 + FT writeback |
| 수정    | `app/api/matchday/fixture/route.ts`                                     | 라이브 데이터 교체 + FT writeback   |
| 새 파일 | `lib/hooks/use-score-change.ts`                                         | 스코어 변경 감지 훅                 |
| 새 파일 | `app/(app)/matchday/_components/goal-notification.tsx`                  | 골 알림 토스트                      |
| 새 파일 | `app/(app)/matchday/_components/score-flash.tsx`                        | 스코어 깜빡임                       |
| 수정    | `app/(app)/matchday/_components/matchday-content.tsx`                   | 스코어 감지 통합                    |
| 수정    | `app/(app)/matchday/_components/fixture-card.tsx`                       | pulse + data 속성                   |
| 수정    | `app/(app)/matchday/[fixtureId]/_components/fixture-detail-content.tsx` | FT 전환 탭 자동 변경                |
| 수정    | `app/(app)/matchday/[fixtureId]/_components/fixture-tabs.tsx`           | 제어 컴포넌트화                     |
| 수정    | `app/(app)/matchday/[fixtureId]/_components/auto-refresh-indicator.tsx` | 동적 카운트다운                     |
| 수정    | `app/(app)/matchday/[fixtureId]/_components/live-tab.tsx`               | status prop 전달                    |

---

## 엣지 케이스

| 시나리오                   | 처리                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| 이미 라이브 중인 경기 진입 | `isInitializedRef`로 첫 로드 시 골 알림 방지                        |
| 하프타임                   | `FIXTURE_STATE_MAP`에 `ht: "LIVE"`로 매핑 — 폴링 지속               |
| 동시 다수 경기             | 서버 인메모리 캐시로 API 1회 호출, 개별 스코어 추적                 |
| 탭 비활성                  | `refetchIntervalInBackground: false` 유지                           |
| SportMonks API 장애        | catch 블록에서 빈 배열/null 반환, DB fallback                       |
| FT 후 폴링                 | `useFixtureDetail`의 `status !== "LIVE" ? false` 로직으로 자동 중단 |

---

## 검증

1. **빌드 검증**: `npm run validate` (type-check + lint + format)
2. **기능 검증**: Playwright MCP로 `/matchday` 접근 → 라이브 경기 카드 pulse, FT 배지 확인
3. **API 검증**: `/api/matchday/fixtures?gw=N` 응답에서 `hasLive` 값 확인
4. **골 알림 검증**: Sonner toast 렌더링 확인 (실제 라이브 경기 필요 시 API 응답 모킹)
