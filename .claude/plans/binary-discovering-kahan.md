# Task 009: 선수 비교 배틀카드 UI (F009) 구현 계획

## Context

선수 비교 페이지(`/compare`)가 현재 기초 스캐폴딩 상태(레이더 차트만 렌더)이며, Task 009에서 완전한 배틀카드 UI를 구현해야 한다.
Task 006(PlayerSearchCombobox)과 Task 008(PlayerRadarChart compare 모드)이 이미 완성되어 재사용 가능.

---

## 파일 구조

```
app/(app)/compare/
├── page.tsx                         # 재구성 — async Server Component
└── _components/
    ├── compare-client.tsx           # "use client" — 핵심 조율자, URL 동기화
    ├── player-slot.tsx              # "use client" — 선수 슬롯 (미니카드 or 검색창)
    ├── compare-stat-table.tsx       # "use client" — 6행 스탯 비교 테이블
    ├── compare-verdict.tsx          # Server-compatible — Verdict 텍스트
    └── share-button.tsx             # "use client" — Share as Image 버튼 (UI만)
```

---

## 구현 단계

### Step 1: page.tsx 재구성

`app/(app)/compare/page.tsx`를 `async` Server Component로 변경. `searchParams`에서 `p1/p2`를 읽어 초기 선수/스탯 데이터를 조회한 뒤 `CompareClient`에 props로 전달.

- `getPlayerById`, `getPlayerSeasonStats` — 초기 데이터 조회
- `mockPlayers`, `mockTeams` — 검색용 전체 목록 전달
- `Suspense` 유지

### Step 2: player-slot.tsx

각 선수 슬롯(A/B). 두 가지 상태 분기:

- **미선택**: `PlayerSearchCombobox` 렌더 (`components/player-search-combobox.tsx` 재사용)
- **선택됨**: 미니 프로필 카드 (사진 + 이름 + 팀 + 포지션 + X 버튼)

Props: `label`, `player`, `team`, `allPlayers`, `teams`, `onSelect`, `onClear`, `colorClass`

### Step 3: compare-stat-table.tsx

6행 스탯 비교 테이블. `STAT_DEFINITIONS` 배열로 6개 지표를 정의 (기존 `stat-context-grid.tsx`의 패턴 활용):

| 지표      | key             | format       |
| --------- | --------------- | ------------ |
| 골        | `goals`         | 정수         |
| xG        | `xg`            | `toFixed(1)` |
| 어시스트  | `assists`       | 정수         |
| 키패스    | `keyPasses`     | 정수         |
| 드리블    | `dribbles`      | 정수         |
| 평균 평점 | `averageRating` | `toFixed(1)` |

각 행 레이아웃: `grid-cols-[1fr_auto_1fr]`

- 좌측: 선수 A 수치 (text-right) + 리그 순위
- 중앙: 지표명 + Trophy 아이콘 (`lucide-react/Trophy`, 승자 쪽 색상 `text-chart-1` or `text-chart-2`)
- 우측: 선수 B 수치 (text-left) + 리그 순위
- 승자 수치는 `font-bold` 처리

GlossaryPopover는 Task 010에서 공유 컴포넌트로 리팩토링 예정이므로 이번에는 미포함.

### Step 4: compare-verdict.tsx

승자 판정 로직:

- 6개 지표 각각에서 수치가 더 큰 선수가 해당 카테고리 승자
- 총 우위 카테고리 수 집계
- "Verdict: {이름} leads in N/6 categories" 텍스트
- 동점 시: "Verdict: Draw (3/3 each)"
- 리더 이름에 `text-chart-1` or `text-chart-2` 색상 적용

### Step 5: share-button.tsx

`Share as Image` 버튼 UI만 배치. `Share2` 아이콘(lucide-react). Phase 4에서 실제 기능 구현 예정. `disabled` prop으로 선수 미선택 시 비활성화.

### Step 6: compare-client.tsx (핵심)

`"use client"` 조율자 컴포넌트. 구성:

1. **상태 관리**: `useState`로 `player1`, `player2`, `stats1`, `stats2` 관리
2. **URL 동기화**: `useRouter` + `useSearchParams`
   - 선수 선택 시 `router.push(/compare?p1=X&p2=Y, { scroll: false })`
   - `initialPlayer*`, `initialStats*` props를 초기값으로 사용 (URL 직접 접속 지원)
3. **선수 선택 핸들러**: `getPlayerById`, `getPlayerSeasonStats`로 즉시 데이터 조회 (mock 함수는 동기적)
4. **레이아웃 조립**:
   - 선수 슬롯 2개 (`grid-cols-1 sm:grid-cols-2`)
   - `PlayerRadarChart` compare 모드 (양 선수 선택 시)
   - `CompareStatTable` (양 선수 선택 시)
   - `CompareVerdict` (양 선수 선택 시)
   - `ShareButton` (하단)
   - 미선택 안내 텍스트 (빈 상태)

---

## 재사용 파일

| 파일                                       | 용도                                         |
| ------------------------------------------ | -------------------------------------------- |
| `components/player-search-combobox.tsx`    | `PlayerSlot` 내 자동완성 검색                |
| `components/charts/player-radar-chart.tsx` | compare 모드 레이더 차트                     |
| `lib/mock/players.ts`                      | `mockPlayers`, `getPlayerById`               |
| `lib/mock/player-stats.ts`                 | `getPlayerSeasonStats`                       |
| `lib/mock/teams.ts`                        | `mockTeams`, `getTeamById`                   |
| `types/player.ts`                          | `Player`, `PlayerSeasonStats`, `StatContext` |

---

## 반응형 레이아웃

| 영역             | 모바일                           | 데스크탑              |
| ---------------- | -------------------------------- | --------------------- |
| 선수 슬롯        | `grid-cols-1` 세로               | `sm:grid-cols-2` 가로 |
| 레이더 차트      | 기존 반응형 유지 (250/300/350px) | 동일                  |
| 스탯 비교 테이블 | 전체 너비, `max-w-2xl mx-auto`   | 동일                  |
| Share 버튼       | `w-full`                         | `w-auto`, 중앙 정렬   |

---

## 검증 방법

1. `npm run dev` → `/compare` 접속 → 선수 A/B 검색 슬롯 2개 확인
2. 각 슬롯에서 이름 입력 → 자동완성 드롭다운 → 선수 선택
3. 양 선수 선택 후: 레이더 차트 + 스탯 비교 테이블(6행) + Verdict 텍스트 확인
4. 각 행에 트로피 아이콘 표시 확인
5. URL `?p1=[id1]&p2=[id2]` 형태 업데이트 확인
6. `/compare?p1=110&p2=111` 직접 접속 → 두 선수 자동 로드 확인
7. "Share as Image" 버튼 존재 확인
8. `npm run validate` 통과 확인
9. Playwright 테스트로 ROADMAP의 9개 검증 항목 확인
