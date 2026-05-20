# Task 021: 비교 카드 OG 이미지 생성 및 공유 (F010)

## Context

비교 페이지(`/compare?p1=X&p2=Y`)에서 두 선수 비교 결과를 소셜 미디어에 공유할 때 시각적인 OG 이미지가 필요하다. 현재 `ShareButton`의 onClick이 비어있고, 페이지에 동적 메타데이터가 없어 공유 시 기본 메타데이터만 표시된다.

**결정 사항**: OG 이미지 라벨은 영어(Goals, Assists 등), 공유는 이미지 다운로드만 구현.

---

## 구현 계획

### Step 1: OG 이미지 유틸리티 생성

**신규** `app/api/og/_lib/compare-utils.ts`

- `getStatWinner(v1, v2)` — 단일 스탯 승자 판정 ("player1" | "player2" | "draw" | null)
- `computeVerdictData(stats1, stats2, statDefs, p1Name, p2Name)` — 전체 판정 계산
- OG 전용 스탯 정의 `OG_STAT_DEFINITIONS` (영어 라벨: Goals, xG, Assists, Key Passes, Dribbles, Rating)

### Step 2: 배틀카드 JSX 레이아웃 생성

**신규** `app/api/og/_lib/battle-card.tsx`

- `renderBattleCard(props)` — satori용 JSX 반환 (React 컴포넌트 아님)
- 1200x630 다크 배경 고정 (`#0a0a0a` → `#1a1a2e` 그라데이션)
- 레이아웃: 선수 사진+이름+팀 | VS | 선수 사진+이름+팀 → 6개 스탯 비교 행 → Verdict → 워터마크
- 색상: HEX 하드코딩 (satori가 OKLCH 미지원)
- 승자: 해당 색상 + bold, 트로피 표시는 유니코드 ★
- 하단 "Compare on pitch-ac" 워터마크

### Step 3: OG 이미지 API Route Handler 생성

**신규** `app/api/og/route.tsx`

- `GET /api/og?p1=[id1]&p2=[id2]` → `ImageResponse` (PNG 1200x630)
- `next/og`의 `ImageResponse` 사용 (Next.js 내장, 별도 설치 불필요)
- 데이터 조회: `getPlayerById`, `getPlayerSeasonStats`, `getTeamsByIds` (기존 repository 재사용)
- 폰트: Geist Bold만 Google Fonts에서 fetch (영어 라벨이므로 한글 폰트 불필요)
- 에러 처리: 파라미터 누락(400), 선수/스탯 미발견(404)

### Step 4: `/compare` 페이지에 `generateMetadata` 추가

**수정** `app/(app)/compare/page.tsx`

- `generateMetadata` async 함수 추가
- `p1`, `p2` 모두 있으면: 동적 title(`Salah vs Haaland | pitch-ac`), og:image(`/api/og?p1=X&p2=Y`)
- 한쪽만/없으면: 기본 메타데이터 반환
- `openGraph` + `twitter` (summary_large_image) 설정

### Step 5: ShareButton 이미지 다운로드 구현

**수정** `app/(app)/compare/_components/share-button.tsx`

- props 확장: `player1Id`, `player2Id`, `player1Name`, `player2Name`
- fetch → blob → `<a download>` 패턴으로 PNG 다운로드
- 로딩 상태: `Loader2` 스피너
- 성공/실패: sonner toast 알림
- 아이콘: `Share2` → `Download`으로 변경

**수정** `app/(app)/compare/_components/compare-client.tsx`

- `ShareButton`에 player ID/name props 전달

---

## 변경 파일 목록

| 순서 | 파일 | 작업 |
|---:|---|---|
| 1 | `app/api/og/_lib/compare-utils.ts` | 신규 |
| 2 | `app/api/og/_lib/battle-card.tsx` | 신규 |
| 3 | `app/api/og/route.tsx` | 신규 |
| 4 | `app/(app)/compare/page.tsx` | 수정 |
| 5 | `app/(app)/compare/_components/share-button.tsx` | 수정 |
| 6 | `app/(app)/compare/_components/compare-client.tsx` | 수정 |

**기존 재사용 함수**:
- `getPlayerById` — `lib/repositories/player-repository.ts`
- `getPlayerSeasonStats` — `lib/repositories/player-repository.ts`
- `getTeamsByIds` — `lib/repositories/team-repository.ts`
- `CURRENT_SEASON_LABEL` — `lib/api/sportmonks/constants.ts`

---

## 검증

1. `npm run dev` 후 `/api/og?p1=[id1]&p2=[id2]` 접속 → PNG 이미지 렌더링 확인
2. 이미지에 선수 사진, 스탯 비교, "Compare on pitch-ac" 워터마크 표시 확인
3. `/compare?p1=[id1]&p2=[id2]` 페이지 소스에서 `<meta property="og:image">` 존재 확인
4. "Share as Image" 버튼 클릭 → PNG 파일 다운로드 확인
5. `npm run validate` (type-check + lint + format) 통과 확인
