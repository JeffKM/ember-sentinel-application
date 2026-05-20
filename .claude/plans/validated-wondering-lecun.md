# Phase S3: ScoutLab UI 페이지 구현 계획

## Context

ScoutLab은 Big 5 리그 선수 60+ 고급 메트릭 기반 스카우팅 분석 뷰이다.
- Phase S1에서 DB 6개 테이블, 타입 정의, Repository 10개 함수가 완성됨
- Phase S2에서 Playwright 스크래퍼로 데이터 수집 파이프라인 완성됨
- 현재 10개 탭의 placeholder만 존재 → **실제 데이터 연동 UI를 구현**해야 함

---

## 아키텍처 결정

### URL searchParams 기반 상태 관리
- 기존 `/compare/page.tsx` 패턴과 동일하게 Server Component에서 `searchParams: Promise<{...}>`를 await하여 repository 직접 호출
- Client Component에서 `useRouter` + `useSearchParams`로 URL 갱신
- 탭 간 이동 시 `playerId`, `season` 등 핵심 파라미터 유지

### 공통 searchParams 스키마
```
?playerId=123&season=25/26&mode=per90&adj=padj&league=Premier+League&team=Arsenal&pos=AM/W
```

### 차트 렌더링
- recharts v3.8 (유일한 차트 라이브러리), `dynamic(() => import(...), { ssr: false })` 패턴
- Action Maps만 SVG 커스텀 렌더링 (recharts로 피치 시각화 불가)

### 재사용할 기존 컴포넌트
- `PercentileBar` (`app/(app)/squad/[playerId]/_components/percentile-bar.tsx`) → 공용 위치로 이동하여 ScoutLab에서도 사용
- `PlayerSearchCombobox` 패턴 (`components/player-search-combobox.tsx`) → ScoutLab 선수용으로 별도 구현
- `Command` UI (`components/ui/command.tsx`) + `cmdk` 패키지 (설치됨)
- `PlayerRadarChart` 패턴 (`components/charts/player-radar-chart.tsx`) → ScoutLab 데이터 구조에 맞게 별도 구현

---

## Task 분할 (12개 Task, 권장 순서)

### Task S301: 공통 인프라 — Select 컴포넌트 + 필터 바 + searchParams 유틸

**새로 생성:**
- `components/ui/select.tsx` — `npx shadcn@latest add select` 후 코믹 토큰 재작성
- `app/(app)/scouting/_lib/scoutlab-search-params.ts` — searchParams 파싱 유틸
- `app/(app)/scouting/_lib/use-scoutlab-params.ts` — Client URL 갱신 훅
- `app/(app)/scouting/_lib/format-metric.ts` — 메트릭명 포매팅 유틸 (snake_case → Title Case)
- `app/(app)/scouting/_components/scoutlab-filter-bar.tsx` — 시즌/리그/팀/선수 필터 바 (Client)
- `app/(app)/scouting/_components/scoutlab-player-search.tsx` — ScoutLab 선수 검색 Combobox (cmdk 기반, `PlayerSearchCombobox` 패턴 참조하되 `ScoutlabPlayer` 타입 사용)
- `app/(app)/scouting/_components/scoutlab-mode-toggle.tsx` — P90/Total + Padj./Raw 토글
- `app/(app)/scouting/_components/scoutlab-position-filter.tsx` — CB/FB/MF/AM·W/FW 세그먼트 필터
- `components/percentile-bar.tsx` — 기존 `PercentileBar`를 공용 위치로 이동

**참조 파일:**
- `app/(app)/compare/_components/compare-client.tsx` — URL 갱신 패턴
- `components/player-search-combobox.tsx` — cmdk Combobox 패턴
- `app/(app)/squad/[playerId]/_components/percentile-bar.tsx` — 이동 원본
- `lib/repositories/scoutlab-repository.ts` → `getScoutlabFilterOptions()`

---

### Task S302: Player Card 페이지 (메인)

**수정:** `app/(app)/scouting/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/player-card-header.tsx` — 선수 카드 (이니셜 아바타 + 이름 + 국적 + 팀 + 나이 + 키 + 출장시간)
- `app/(app)/scouting/_components/metric-category-table.tsx` — 카테고리별 메트릭 테이블 (메트릭명 + 수치 + 백분위 바)

**설계:**
- Server Component, `searchParams` await → `getScoutlabPlayerById()` + `getScoutlabMetrics()` 병렬 호출
- 선수 미선택 시: 필터 바만 표시 + 안내 메시지
- 선수 선택 시: player-card-header + 11개 카테고리 메트릭 테이블 (2열 `md:grid-cols-2`)
- 각 메트릭 행: 메트릭명 + 수치(tabular-nums) + PercentileBar

**의존:** S301

---

### Task S303: Summary 페이지

**수정:** `app/(app)/scouting/summary/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/category-percentile-bars.tsx` — 10개 카테고리 평균 백분위 수평 진행 바

**설계:**
- 각 카테고리의 메트릭 `percentile` 평균 → 대표 백분위
- 레이아웃: 좌 player-card-header + 우 카테고리 진행 바
- PercentileBar 재사용 (90+=green, 70~89=skyblue, 50~69=yellow, <50=black/30)

**의존:** S301, S302 (player-card-header 재사용)

---

### Task S304: Radar 페이지

**수정:** `app/(app)/scouting/radar/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/scoutlab-radar-chart.tsx` — recharts RadarChart (Client)
- `app/(app)/scouting/_components/scoutlab-charts.tsx` — dynamic import 래퍼 (ssr: false)

**설계:**
- `getScoutlabRadar(playerId, season)` → `ScoutlabRadar.axes: ScoutlabRadarAxis[]`
- recharts `RadarChart` + `PolarAngleAxis` + `PolarGrid` + `Radar`
- 기존 `player-radar-chart.tsx` 패턴 참조
- 코믹 색상: stroke=`comic-skyblue`, fill=`comic-skyblue/25`

**의존:** S301

---

### Task S305: Progression 페이지

**수정:** `app/(app)/scouting/progression/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/progression-chart.tsx` — recharts LineChart (Client)
- `app/(app)/scouting/_components/progression-metric-select.tsx` — 카테고리/메트릭 드롭다운 (Client)

**설계:**
- `getScoutlabProgression(playerId, mode, adj)` → `ScoutlabMetrics[]`
- URL searchParams: `category`, `metric` 추가
- recharts `LineChart` x축=시즌, y축=메트릭 값
- 각 시즌 데이터 포인트에 dot + label

**의존:** S301, S304 (scoutlab-charts.tsx 공유)

---

### Task S306: Action Maps 페이지

**수정:** `app/(app)/scouting/action-maps/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/pitch-svg.tsx` — SVG 피치 배경 (105×68m 비율)
- `app/(app)/scouting/_components/action-map-overlay.tsx` — 피치 위 액션 라인 오버레이 (Client)
- `app/(app)/scouting/_components/action-map-grid.tsx` — 3개 피치 그리드 래퍼

**설계:**
- `getScoutlabActionMaps(playerId, season)` → 3가지 actionType(carries/passes/crosses)
- SVG 피치 + 좌표 변환 (0~1 → viewBox 매핑)
- progressive=핑크(`comic-pink`), threatening=사이안(`comic-skyblue`)
- 3열 그리드 `lg:grid-cols-3`
- 각 피치: 액션 수 + per90 수치 표시 (Bangers)

**의존:** S301

---

### Task S307: Scatter 페이지

**수정:** `app/(app)/scouting/scatter/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/scatter-plot.tsx` — recharts ScatterChart (Client)
- `app/(app)/scouting/_components/scatter-filter-panel.tsx` — X/Y축 카테고리+메트릭 선택 + 글로벌 필터 (Client)

**설계:**
- `getScatterData(xMetric, yMetric, xCat, yCat, filters)` → `ScoutlabScatterPoint[]`
- URL searchParams: `xCat`, `xMetric`, `yCat`, `yMetric`, `season`, `pos`, `minMin`, `maxAge`
- 리그별 색상: PL=skyblue, La Liga=yellow, Serie A=green, Bundesliga=red, Ligue 1=pink
- 커스텀 Tooltip: 선수명/팀/리그

**의존:** S301, S304 (scoutlab-charts.tsx 공유)

---

### Task S308: Similarity 페이지

**수정:** `app/(app)/scouting/similarity/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/similarity-table.tsx` — 유사 선수 테이블

**설계:**
- `getScoutlabSimilarity(playerId, season)` → `ScoutlabSimilarPlayer[]`
- 20명을 2열(10+10) 그리드 `md:grid-cols-2`
- 각 행: #순위 + 선수명 + 팀 + 리그 + 유사도 점수

**의존:** S301, S302 (player-card-header)

---

### Task S309: Ranking 페이지

**수정:** `app/(app)/scouting/ranking/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/ranking-table.tsx` — 랭킹 테이블
- `app/(app)/scouting/_components/ranking-filter-panel.tsx` — 카테고리+메트릭 선택 필터 (Client)

**설계:**
- `getRankingData(metric, category, filters, limit)` → `{ player, value, percentile }[]`
- 카테고리 선택 → 해당 카테고리 메트릭 목록 동적 갱신
- 상위 3명 `bg-comic-yellow/10` 강조
- 열: 순위 / 선수명 / 팀 / 리그 / 값

**의존:** S301

---

### Task S310: Compare 페이지

**수정:** `app/(app)/scouting/compare/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_components/scoutlab-compare-view.tsx` — 비교 뷰 조율 Client Component
- `app/(app)/scouting/_components/metric-compare-table.tsx` — 카테고리별 메트릭 나란히 비교

**설계:**
- URL searchParams: `p1`, `p2`, `s1`, `s2`
- 두 선수 메트릭 + 레이더 병렬 조회
- 카테고리별 메트릭 나란히 비교, 높은 값 강조
- ScoutLab 레이더 차트 2중 오버레이

**의존:** S301, S302 (player-card-header), S304 (radar chart)

---

### Task S311: Glossary 페이지 (독립)

**수정:** `app/(app)/scouting/glossary/page.tsx`
**새로 생성:**
- `app/(app)/scouting/_lib/scoutlab-glossary-data.ts` — 용어 정의 상수 배열

**설계:**
- 정적 콘텐츠, DB 조회 없음
- xG, npxG, xA, VAEP, xThreat 등 핵심 용어
- 11개 카테고리별 그루핑 (`SCOUTLAB_CATEGORY_LABELS` 사용)
- 각 용어를 Card로 감싸서 렌더링

**의존:** 없음

---

### Task S312: 탭 내비게이션 선수 컨텍스트 유지

**수정:** `app/(app)/scouting/_components/scouting-tab-nav.tsx`

**설계:**
- `useSearchParams()`로 현재 `playerId`, `season`, `mode`, `adj` 읽기
- 각 탭의 `href`에 파라미터 append
- 탭 간 이동 시 선수 선택 상태 유지

**의존:** S301

---

## 구현 순서 (DAG)

```
S301 (공통 인프라) ──┬── S302 (Player Card) ──┬── S303 (Summary)
                     │                         ├── S308 (Similarity)
                     │                         └── S310 (Compare)
                     ├── S304 (Radar) ──────────── S305 (Progression)
                     ├── S306 (Action Maps)
                     ├── S307 (Scatter)
                     ├── S309 (Ranking)
                     └── S312 (Tab 컨텍스트)

S311 (Glossary) ──── 독립 (언제든 가능)
```

**권장 순서:** S301 → S311 → S302 → S312 → S303 → S304 → S305 → S306 → S308 → S309 → S307 → S310

---

## 첫 번째 작업: ROADMAP.md 업데이트

`docs/ROADMAP.md`의 Phase S3 섹션(301~305행)을 아래 상세 Task 목록으로 교체한다.

---

## 검증 방법

1. `npm run dev` → 각 탭 페이지 접속 확인
2. 선수 검색 → 데이터 렌더링 확인 (DB에 스크래핑된 선수 존재 필수)
3. 탭 간 이동 시 searchParams 유지 확인
4. `npm run build` → 빌드 에러 없음
5. `npm run validate` → type-check + lint + format 통과
6. 반응형: 모바일/태블릿/데스크톱 레이아웃 확인
