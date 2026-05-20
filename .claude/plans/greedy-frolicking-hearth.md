# Phase 1~2 전체 코드 리뷰

## Context

Phase 1(애플리케이션 골격 구축) 및 Phase 2(UI/UX 완성, Task 004~010) 완료 시점에서 전체 코드베이스의 품질을 점검합니다. Phase 3(백엔드 연동) 진입 전 기술 부채를 정리하고, 안정적인 기반을 확보하기 위한 코드 리뷰입니다.

**리뷰 범위**: `app/`, `components/`, `lib/`, `types/`, `hooks/`, `middleware.ts` — 총 106개 파일

---

## 코드 리뷰 요약

전반적으로 아키텍처가 잘 설계되어 있고, Server/Client Component 분리, TypeScript 타입 안전성, Tailwind v4 활용이 우수합니다. 다만 입력 검증, 에러 처리, 일부 로직 정확성에서 개선이 필요합니다.

**종합 점수: 8/10**

---

## 잘한 점

- **Server/Client Component 분리가 명확**: 모든 페이지가 Server Component로 데이터를 준비하고, 인터랙션이 필요한 부분만 Client Component로 분리
- **TypeScript 타입 설계 우수**: `StatContext`로 모든 수치에 맥락(순위/백분위/전년비교)을 강제하는 설계가 프로젝트 철학에 부합
- **컴포넌트 재사용성**: `PlayerSearchCombobox`, `GlossaryPopover`를 공용화하여 3개 페이지에서 재사용
- **Discriminated Union 패턴**: `PlayerRadarChart`의 `ProfileModeProps | CompareModeProps` 설계가 타입 안전
- **날짜 유틸 중앙화**: `lib/date-utils.ts`로 KST 기반 포맷 함수를 추출하여 일관성 확보
- **Tailwind v4 올바른 활용**: 커스텀 CSS 없이 유틸리티 클래스만 사용, CSS 변수 기반 다크모드 지원
- **접근성 기본 구현**: `aria-label`, 시맨틱 HTML(`<header>`, `<nav>`), `role="meter"` 등 적용

---

## 개선 필요 사항

### 심각도: 높음

#### 1. `percentile-bar.tsx:31` — 백분위 값 범위 미검증

- **문제**: `percentile` prop에 0~100 범위 검증 없음. 100 초과 시 프로그레스 바가 컨테이너를 넘침
- **영향**: UI 레이아웃 깨짐
- **해결방안**:

```typescript
export function PercentileBar({ percentile }: PercentileBarProps) {
  const clamped = Math.max(0, Math.min(100, percentile));
  // 이후 clamped 사용
```

#### 2. `player-radar-chart.tsx:75` — 레이더 차트 배열 길이 불일치 시 크래시

- **문제**: `toCompareChartData()`에서 `data2[i].value` 접근 시 배열 길이가 다르면 `undefined` 접근으로 크래시
- **영향**: 비교 페이지 전체 에러
- **해결방안**:

```typescript
function toCompareChartData(data1: RadarDataPoint[], data2: RadarDataPoint[]) {
  const minLen = Math.min(data1.length, data2.length);
  return data1.slice(0, minLen).map((p, i) => ({
    dimension: p.dimension,
    label: p.label,
    player1: p.value,
    player2: data2[i].value,
  }));
}
```

`toProfileChartData()`에도 동일하게 `radarData.positionAverage[i]` 검증 필요 (line 67)

#### 3. `proxy.ts:35` — `getClaims()` 에러 미처리

- **문제**: `await supabase.auth.getClaims()`가 네트워크 오류 시 throw하면 미들웨어 전체가 500 에러
- **영향**: 인증 서비스 장애 시 모든 페이지 접근 불가
- **해결방안**:

```typescript
let user = null;
try {
  const { data } = await supabase.auth.getClaims();
  user = data?.claims;
} catch {
  // 인증 서비스 실패 시 비인증 사용자로 처리
}
```

#### 4. 동적 라우트 파라미터 검증 부재

- **파일**: `matchday/[fixtureId]/page.tsx`, `players/[playerId]/page.tsx`
- **문제**: `Number(fixtureId)`가 `NaN`을 반환할 수 있으나 검증 없이 mock 함수에 전달
- **영향**: 잘못된 URL 접근 시 예측 불가능한 동작
- **해결방안**:

```typescript
const id = Number(playerId);
if (isNaN(id) || id <= 0) notFound();
```

---

### 심각도: 중간

#### 5. `date-utils.ts:42` — `formatH2HDate()`에 `timeZone` 누락

- **문제**: 다른 5개 함수는 모두 `timeZone: "Asia/Seoul"`을 설정하지만 이 함수만 누락. 서버 타임존에 따라 날짜가 달라질 수 있음
- **해결방안**: `timeZone: "Asia/Seoul"` 추가

#### 6. `compare-verdict.tsx` — 영어 텍스트 혼용

- **문제**: "Verdict", "Draw", "leads in", "each", "categories" 등 영어 텍스트 사용. CLAUDE.md의 한국어 규칙 위반
- **해결방안**:

```typescript
{isDraw ? (
  <span className="text-muted-foreground">
    평가: 무승부 ({player1Wins}/{COMPARE_STAT_DEFINITIONS.length}개 동점)
  </span>
) : (
  <span>
    평가:{" "}
    <span className={cn(isPlayer1Leading ? "text-chart-1" : "text-chart-2")}>
      {leader.name}
    </span>
    이(가) {leadCount}/{COMPARE_STAT_DEFINITIONS.length}개 항목에서 우위
  </span>
)}
```

#### 7. `live-tab.tsx` / `postmatch-tab.tsx` — `liveStats` null 시 빈 UI

- **문제**: `fixture.liveStats`가 null일 때 `StatBar`에 빈 데이터가 전달되거나, 컴포넌트가 조건 없이 렌더링됨
- **해결방안**: 명시적 null 체크 + 안내 메시지 추가

```typescript
{fixture.liveStats ? (
  <StatBar ... />
) : (
  <p className="text-center text-sm text-muted-foreground">
    실시간 스탯이 아직 제공되지 않습니다.
  </p>
)}
```

#### 8. `lineup-display.tsx:40` — 열 정렬 방향 검증 필요

- **문제**: `return bCol - aCol`로 내림차순 정렬. `justify-around` 컨텍스트에서 큰 col이 왼쪽에 배치되어, 피치 위 선수 좌우 배치가 반전될 수 있음
- **해결방안**: 실제 피치 렌더링을 확인하여 `aCol - bCol`(오름차순)로 변경 필요 여부 판단. 정렬 방향을 올바르게 확정 후 주석도 일치시키기

#### 9. `recent-form-sparkline.tsx:128` — YAxis 도메인 하드코딩

- **문제**: `domain={[5, 10]}`으로 고정. 극단적으로 낮은 평점(예: 4.5) 시 차트에서 잘림
- **해결방안**: 데이터 기반 동적 도메인 계산

```typescript
const minRating = Math.min(...chartData.map((d) => d.rating));
const maxRating = Math.max(...chartData.map((d) => d.rating));
// domain={[Math.max(0, Math.floor(minRating) - 1), Math.min(10, Math.ceil(maxRating) + 1)]}
```

#### 10. `use-recent-searches.ts:12` — `JSON.parse` 실패 시 조용한 에러

- **문제**: localStorage에 손상된 데이터가 있을 때 빈 배열 반환만 하고 손상 데이터를 제거하지 않음. 같은 에러 반복 발생
- **해결방안**:

```typescript
catch {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
```

#### 11. `oauth-buttons.tsx` — 에러 시 로딩 상태 미복구

- **문제**: Google OAuth 버튼 클릭 후 에러 발생 시 `isLoading` 상태가 `true`로 유지되어 버튼이 영구 비활성화
- **해결방안**: `catch` 블록에 `setIsLoading(false)` 추가

#### 12. `update-password-form.tsx` — 함수명 부정확

- **문제**: `handleForgotPassword`라는 이름이 실제 동작(비밀번호 업데이트)과 불일치
- **해결방안**: `handlePasswordUpdate`로 변경

---

### 심각도: 낮음

#### 13. `compare-verdict.tsx:21` — 부동소수점 비교

- **문제**: `stats1[key] > stats2[key]`에서 xG, 평균평점 등 소수점 값을 `>` 연산자로 비교. `7.0000001 > 7.0` 같은 미세한 차이가 승패를 결정할 수 있음
- **해결방안**: 현재 더미 데이터에서는 문제 없으나, 실제 API 데이터 연동 시 epsilon 비교 고려

#### 14. `percentile-bar.tsx:23` — ARIA role 부적합

- **문제**: `role="meter"`는 W3C 스펙에서 현재 값을 표시하는 게이지용. 프로그레스 바에는 `role="progressbar"`가 더 적합
- **해결방안**: `role="progressbar"`로 변경

#### 15. `compare-stat-table.tsx:175` — 불필요한 `in` 연산자

- **문제**: `"format" in def ? def.format : undefined`는 동작하지만 불필요하게 복잡. `def`의 타입이 `as const`로 고정되어 있으므로 optional chaining으로 단순화 가능
- **해결방안**:

```typescript
format={def.format}
glossaryId={def.glossaryId}
```

`COMPARE_STAT_DEFINITIONS`의 타입을 `as const` 제거 후 optional property로 재정의하거나, 현재 방식 유지 시 `(def as any).format` 대신 현재 `in` 패턴이 더 안전

#### 16. Player 미니 프로필 렌더링 중복

- **파일**: `player-card.tsx`, `player-slot.tsx`
- **문제**: 선수 사진 + 이름 + 팀/포지션 렌더링이 두 컴포넌트에서 유사하게 반복
- **해결방안**: Phase 3에서 실제 API 데이터 연동 시 공용 `PlayerMiniProfile` 컴포넌트 추출 고려

---

## 추가 권장사항

### 아키텍처

- **에러 바운더리**: Phase 3에서 API 연동 시 `error.tsx` 파일을 각 라우트 그룹에 추가하여 에러 격리
- **환경변수 검증**: Supabase 클라이언트에서 `process.env.NEXT_PUBLIC_SUPABASE_URL!` non-null assertion 대신 런타임 검증 추가

### 접근성

- 색상으로만 구분하는 UI에 텍스트/아이콘 보조 수단 추가 (비교 테이블의 chart-1/chart-2 구분)
- `FixtureStatusBadge`의 "FT" 등 약어에 `aria-label="Full Time"` 추가

### 테스트

- `data-testid` 속성이 레이더 차트에만 있음. 주요 인터랙티브 요소에 확대 필요
- Phase 3 이전에 `date-utils.ts` 단위 테스트 추가 권장 (KST 경계값 테스트)

---

## 수정 계획

아래 순서로 수정합니다 (의존성 고려):

| 순서 | 파일                            | 이슈 번호 | 작업                        |
| ---- | ------------------------------- | --------- | --------------------------- |
| 1    | `percentile-bar.tsx`            | #1        | 백분위 값 클램핑            |
| 2    | `player-radar-chart.tsx`        | #2        | 배열 길이 검증              |
| 3    | `lib/supabase/proxy.ts`         | #3        | getClaims try-catch         |
| 4    | `matchday/[fixtureId]/page.tsx` | #4        | 파라미터 NaN 검증           |
| 5    | `players/[playerId]/page.tsx`   | #4        | 파라미터 NaN 검증           |
| 6    | `lib/date-utils.ts`             | #5        | formatH2HDate timeZone 추가 |
| 7    | `compare-verdict.tsx`           | #6        | 영어 → 한국어               |
| 8    | `live-tab.tsx`                  | #7        | liveStats null 처리         |
| 9    | `postmatch-tab.tsx`             | #7        | liveStats null 처리         |
| 10   | `lineup-display.tsx`            | #8        | 열 정렬 방향 확인/수정      |
| 11   | `recent-form-sparkline.tsx`     | #9        | YAxis 동적 도메인           |
| 12   | `use-recent-searches.ts`        | #10       | 손상 데이터 제거            |
| 13   | `oauth-buttons.tsx`             | #11       | 로딩 상태 복구              |
| 14   | `update-password-form.tsx`      | #12       | 함수명 변경                 |
| 15   | `percentile-bar.tsx`            | #14       | ARIA role 변경              |

---

## 검증 방법

1. `npm run validate` — TypeScript 타입 체크 + ESLint + Prettier 통합 검증
2. `npm run build` — 프로덕션 빌드 성공 확인
3. 수동 확인:
   - `/matchday/invalid-id` 접속 → 404 페이지 표시 확인
   - `/players/abc` 접속 → 404 페이지 표시 확인
   - `/compare?p1=110&p2=120` → 비교 페이지 정상 렌더링 + 한국어 Verdict 확인
   - 브라우저 DevTools → 콘솔 에러 없음 확인
