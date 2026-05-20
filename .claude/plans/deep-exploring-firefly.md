# Task 006: 선수 검색 페이지 UI (F011) 구현 계획

## Context

현재 `/players` 페이지는 12명 선수를 단순 리스트로 나열만 하고 있음.
PRD F011 요구사항에 따라 검색 자동완성, 최근 검색어, 선수 카드 그리드, 빈 상태 UI를 구현해야 함.
이 검색 컴포넌트는 Task 009 (선수 비교 배틀카드)에서도 재사용되므로 공용 컴포넌트로 분리.

---

## Step 1: 의존성 설치

```bash
npx shadcn@latest add command popover
mkdir -p hooks
```

- `command`: cmdk 기반 검색 자동완성
- `popover`: Command 드롭다운 래퍼
- `hooks/`: 최근 검색어 커스텀 훅 디렉토리

## Step 2: mock 데이터 개선

**파일**: `lib/mock/players.ts`

- `searchPlayers()` 함수에 팀명/포지션 검색 추가 (현재 이름+국적만)
- `getTeamById` import하여 팀명 매칭 지원

## Step 3: 최근 검색어 훅

**새 파일**: `hooks/use-recent-searches.ts`

- `useSyncExternalStore` 기반 localStorage 관리 (SSR 호환)
- `addSearch(term)`, `clearSearches()` 제공
- 최대 5개 저장, 중복 제거

## Step 4: 공용 선수 검색 콤보박스

**새 파일**: `components/player-search-combobox.tsx` ("use client")

- `Command` + `Popover` 조합 (shadcn Combobox 패턴)
- Props: `players`, `teams`, `onSelect`, `onSearch`, `recentSearches`, `onRecentClick`
- 포커스 시 Popover 열림
- 입력 없음 → "최근 검색어" CommandGroup 표시
- 입력 시 → cmdk 내장 fuzzy 필터로 자동완성 (CommandItem `value`에 이름+팀+포지션+국적 조합)
- 드롭다운 아이템: 선수 사진(32px) + 이름 + 팀약칭·포지션
- CommandEmpty: "결과 없음" 표시
- Task 009 재사용 대비

## Step 5: 선수 카드 컴포넌트

**새 파일들** (`app/(app)/players/_components/`):

### `player-card.tsx`

- Card + Link(`/players/[playerId]`) + hover 효과 (fixture-card 패턴)
- 선수 사진 (80x80, rounded-full) + 이름 + 팀약칭·포지션
- 포지션별 핵심 스탯 1개 + 맥락 표시 (Badge)
  - FWD: 골 + 리그 순위
  - MID: 어시스트 + 리그 순위
  - DEF/GK: 평균 평점 + 리그 순위

### `player-card-grid.tsx`

- 반응형 그리드: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

### `player-card-skeleton.tsx`

- animate-pulse 기반 카드 스켈레톤

### `player-search-empty.tsx`

- 아이콘 + "결과 없음" 메시지 (empty-gameweek 패턴)

## Step 6: 페이지 오케스트레이터

**새 파일**: `app/(app)/players/_components/player-search-page.tsx` ("use client")

- 상태 관리: `searchResults` (검색 결과 또는 전체 목록), `searchQuery`
- 검색 콤보박스 + 결과 그리드 통합
- 자동완성 아이템 선택 → 해당 선수만 그리드에 표시 + 최근 검색어 저장
- Enter 검색 → searchPlayers 결과를 그리드에 표시
- 초기 상태: 전체 12명 선수 그리드 표시
- 빈 결과: PlayerSearchEmpty 컴포넌트

## Step 7: 페이지 수정

**수정 파일**: `app/(app)/players/page.tsx`

- Server Component 유지
- mockPlayers, mockTeams, mockPlayerSeasonStats를 props로 전달
- `<PlayerSearchPage>` Client Component 렌더링

**새 파일**: `app/(app)/players/loading.tsx`

- 검색 필드 + 카드 그리드 스켈레톤

---

## 파일 목록 요약

| 파일                                                     | 작업 | 타입               |
| -------------------------------------------------------- | ---- | ------------------ |
| `lib/mock/players.ts`                                    | 수정 | searchPlayers 개선 |
| `hooks/use-recent-searches.ts`                           | 생성 | Client Hook        |
| `components/player-search-combobox.tsx`                  | 생성 | Client (공용)      |
| `app/(app)/players/_components/player-card.tsx`          | 생성 | Server-compatible  |
| `app/(app)/players/_components/player-card-grid.tsx`     | 생성 | Server-compatible  |
| `app/(app)/players/_components/player-card-skeleton.tsx` | 생성 | Server-compatible  |
| `app/(app)/players/_components/player-search-empty.tsx`  | 생성 | Server-compatible  |
| `app/(app)/players/_components/player-search-page.tsx`   | 생성 | Client             |
| `app/(app)/players/page.tsx`                             | 수정 | Server             |
| `app/(app)/players/loading.tsx`                          | 생성 | Server             |

## 참조 파일 (기존 패턴)

- `app/(app)/matchday/_components/fixture-card.tsx` — Card + Link + Image + hover 패턴
- `app/(app)/matchday/_components/empty-gameweek.tsx` — 빈 상태 패턴
- `app/(app)/matchday/loading.tsx` — 스켈레톤 패턴
- `lib/mock/index.ts` — re-export 구조

## 검증 계획

1. `npm run type-check` — TypeScript 컴파일 에러 없음
2. `npm run lint` — ESLint 통과
3. 개발 서버에서 `/players` 접속 → 시각적 확인
4. Playwright로 ROADMAP 검증 항목 8개 수행:
   - 검색 입력 필드 표시
   - 최근 검색어 드롭다운
   - "Sal" 입력 → "Salah" 자동완성
   - 드롭다운에 팀명·포지션 표시
   - 존재하지 않는 이름 → "결과 없음"
   - 자동완성 클릭 → 카드 그리드에 선수 표시
   - 카드에 이름·팀·포지션·스탯 표시
   - 카드 클릭 → `/players/[playerId]` 이동
