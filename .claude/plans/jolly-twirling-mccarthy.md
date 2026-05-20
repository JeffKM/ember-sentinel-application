# pitch-ac 피벗: 맨체스터 시티 카툰 팬사이트

## Context

pitch-ac는 기술적으로 우수한 PL 데이터 인프라를 갖추고 있지만, FotMob/FBref와 경쟁하는 "데이터 뷰어"로는 사용자를 모을 수 없다. 사용자의 실제 행동(커뮤니티 여론 형성, 쇼트폼 소비, 감독 시뮬레이션)에서 발견한 핵심 인사이트는 **"데이터를 보는 게 아니라 데이터로 자기 표현을 하고 싶다"**는 것이다.

**피벗 방향**: PL 전체 데이터 플랫폼 → **맨시티 전용 카툰 스타일 팬사이트**
- UI 전체를 카툰/일러스트 스타일로 전환
- 선수 카툰 캐릭터가 실시간 데이터/이벤트에 따라 표정과 대사가 바뀜
- 경기 하이라이트를 카툰화해서 인스타/틱톡/유튜브로 바이럴
- 아트 에셋은 사용자가 Midjourney/나노바나나 등으로 직접 제작

---

## Phase 0: 문서 업데이트 (PRD + ROADMAP)

### 0-1. `docs/PRD.md` 전면 재작성
기존 PL 전체 PRD → 맨시티 카툰 팬사이트 PRD로 교체:
- **목적**: 맨시티 팬이 경기 데이터를 카툰 캐릭터로 체험하고 공유하는 팬사이트
- **사용자**: 맨시티 팬 (한국어 사용자 우선)
- **핵심 기능**: 카툰 포메이션 뷰, 실시간 감정 반응, 공유 카드 생성
- 기존 F001~F014 → 새로운 기능 ID 재정의
- 기존 페이지 구조 → 맨시티 전용 구조로 변경
- 데이터 모델에 `cartoon_assets`, `speech_bubbles` 테이블 추가
- 기술 스택에 Lottie, Supabase Storage 추가

### 0-2. `docs/ROADMAP.md` 재구성
- **Phase 5 전체 삭제** (5-A, 5-B, 5-C, 5-D 모두)
- Phase 1~4 기존 완료 내용은 "레거시 완료" 섹션으로 축소
- 새로운 Phase 구성:
  - **Phase 6: 맨시티 팬사이트 기반 전환** (필터링 + 브랜딩)
  - **Phase 7: 카툰 에셋 시스템 구축** (타입 + DB + 엔진 + 컴포넌트)
  - **Phase 8: 카툰 매치데이** (포메이션 뷰 + 실시간 반응)
  - **Phase 9: 바이럴 콘텐츠 엔진** (갤러리 + 공유 카드)
  - **Phase 10: 에셋 확충 & 폴리시**

---

## Phase 1: 맨시티 팬사이트 기반 전환

PL 전체 → 맨시티 전용 필터링 + 브랜딩. 카툰 에셋 없이 뼈대 먼저.

### 1-1. 맨시티 팀 ID 상수 추가
- **파일**: `lib/api/sportmonks/constants.ts`
- SportMonks에서 맨시티 team_id 확인 후 상수 추가
- `export const MCITY_TEAM_ID = ???;` (debug API로 확인)

### 1-2. Repository 필터링
- **`lib/repositories/fixture-repository.ts`**
  - `getFixturesByGameweek()`: `.or('home_team_id.eq.${MCITY_TEAM_ID},away_team_id.eq.${MCITY_TEAM_ID}')` 필터 추가
  - `getCurrentGameweek()`: 맨시티 경기 기준으로 판정
- **`lib/repositories/player-repository.ts`**
  - `getAllPlayers()`: `.eq("team_id", MCITY_TEAM_ID)` 필터 추가

### 1-3. 브랜딩 & 테마 변경
- **`app/globals.css`**: 맨시티 컬러로 변경
  - primary: sky blue (`oklch(0.65 0.12 230)`)
  - secondary: navy (`oklch(0.25 0.06 260)`)
  - accent: gold
- **`app/layout.tsx`**: 메타데이터 변경 (사이트명, 설명, OG)
- 카툰풍 둥근 폰트 추가 (Fredoka 또는 Baloo 2)

### 1-4. 네비게이션 재구성
- **`components/nav/nav-config.ts`**: 메뉴 항목 변경
  - 매치데이 → 매치데이 (유지)
  - 선수 → 스쿼드 (리네이밍)
  - 비교 → 비교 (유지)
  - 더보기 → 갤러리 (카툰 콘텐츠)
- **라우트**: `/players` → `/squad` 리네이밍

### 1-5. 매치데이 UX 전환
- 기존: GW 전체 경기 10개 목록
- 변경: **맨시티 경기 1개 포커스 뷰** (해당 GW에 맨시티 경기만)
- `app/(app)/matchday/page.tsx` 및 `_components/matchday-content.tsx` 수정

---

## Phase 2: 카툰 에셋 시스템 구축

### 2-1. 타입 정의
- **신규**: `types/cartoon.ts`

```typescript
export type CartoonMood =
  | "neutral" | "happy" | "celebrating" | "angry"
  | "sad" | "shocked" | "tired" | "injured"
  | "focused" | "laughing" | "crying" | "thinking";

export type CartoonTrigger =
  | "goal_scored" | "goal_conceded" | "assist"
  | "red_card" | "yellow_card" | "substitution_in"
  | "substitution_out" | "match_win" | "match_loss"
  | "high_rating" | "low_rating" | "halftime" | "prematch";

export interface CartoonAsset {
  playerId: number;
  mood: CartoonMood;
  imageUrl: string;
  thumbUrl: string;
}

export interface SpeechBubble {
  playerId: number;
  trigger: CartoonTrigger;
  text: string;
}
```

### 2-2. DB 테이블 추가
- **신규**: `supabase/migrations/0003_cartoon_tables.sql`
- `cartoon_assets` 테이블: player_id + mood → image_url 매핑
- `speech_bubbles` 테이블: player_id + trigger → 대사 텍스트

### 2-3. 감정 상태 결정 엔진
- **신규**: `lib/services/cartoon/mood-engine.ts`
- 입력: 선수ID, 경기 이벤트, 경기 상태, 스코어
- 출력: `CartoonMood`
- 우선순위: 직접 이벤트(골/카드) > 팀 상황(승/패) > 기본(focused/neutral)

### 2-4. 에셋 저장소
- **Supabase Storage** 버킷: `cartoon-assets/`
- 구조: `players/{playerId}/{mood}.webp` + `{mood}-thumb.webp`
- WebP 포맷, 전신(400x500) + 썸네일(100x125)
- **신규**: `lib/services/cartoon/asset-resolver.ts` — 선수+감정 → URL

### 2-5. 카툰 UI 컴포넌트
- **신규**: `components/cartoon/cartoon-avatar.tsx` — 아바타 + 감정 표시
- **신규**: `components/cartoon/speech-bubble.tsx` — 말풍선 UI
- **신규**: `components/cartoon/mood-transition.tsx` — 감정 전환 애니메이션 (CSS transition)
- `next.config.ts`: Supabase Storage 이미지 도메인 추가

### 2-6. 초기 에셋 적용
- 최소 **5명 × 3감정**(neutral, celebrating, sad) = 15개 이미지로 시작
- 스쿼드 페이지(`/squad`)의 선수 카드에 카툰 아바타 적용
- 선수 프로필 페이지에 카툰 캐릭터 전체 일러스트 표시

---

## Phase 3: 카툰 매치데이 (핵심)

### 3-1. 카툰 포메이션 피치 뷰
- **수정**: `app/(app)/matchday/[fixtureId]/_components/lineup-display.tsx`
- 기존 `LineupPlayerDot`(등번호 원형) → `CartoonAvatar`로 교체
- **신규**: `components/cartoon/cartoon-pitch.tsx`
  - 카툰 스타일 피치 배경 (SVG/이미지)
  - 기존 `lineup-display.tsx`의 grid 파싱 + 행 그룹핑 로직 재활용
  - 각 선수 위치에 카툰 아바타 배치

### 3-2. 실시간 감정 반응
- **신규**: `hooks/use-cartoon-mood.ts`
  - TanStack Query 폴링 데이터를 받아 각 선수의 현재 감정 계산
  - `mood-engine.ts`의 `resolvePlayerMood()` 호출
- 기존 60초 폴링(`lib/hooks/use-matchday-fixtures.ts`) 재활용
- 골 발생 → 해당 선수 `celebrating` + 대사 버블 ("시티 DNA! ⚽")
- 실점 → GK `shocked`, 전체 `sad` (3초 후 `focused` 복귀)
- 경기 종료 → 승리 시 `happy`/`laughing`, 패배 시 `sad`/`crying`

### 3-3. 이벤트 리액션 오버레이
- **신규**: `components/cartoon/reaction-overlay.tsx`
- 골, 레드카드 등 고임팩트 이벤트 시 풀스크린 카툰 오버레이 (2~3초)
- 선수 시그니처 세러머니 이미지/짧은 애니메이션
- 기존 `goal-notification.tsx`의 sonner toast를 카툰 오버레이로 대체

### 3-4. 매치 헤더 카툰화
- **수정**: `app/(app)/matchday/[fixtureId]/_components/match-header.tsx`
- 팀 로고 옆에 대표 카툰 캐릭터 (맨시티 쪽)
- 스코어 표시를 카툰 스타일로

---

## Phase 4: 바이럴 콘텐츠 엔진

### 4-1. 카툰 갤러리 페이지
- **신규**: `app/(app)/gallery/page.tsx`
- 경기 후 자동 생성된 카툰 카드 목록
- "오늘의 MVP", "매치 결과", "베스트 모먼트" 카드

### 4-2. 공유용 카툰 카드 이미지 생성
- **수정**: `app/api/og/route.tsx` — 기존 satori 패턴 확장
- **신규**: `app/api/cartoon/share/route.tsx`
  - 매치 결과 카드, MVP 카드, 비교 배틀카드
  - 카툰 아바타 + 스탯 + 대사를 합성한 이미지
  - 모든 이미지에 pitch-ac 브랜딩 워터마크

### 4-3. SNS 공유 최적화
- Web Share API 통합 (모바일 네이티브 공유)
- 카카오톡, 인스타 스토리, 트위터 최적화 사이즈
- 이미지 다운로드 버튼

---

## Phase 5: 에셋 확충 & 폴리시

- 전체 스쿼드 (~25명) × 12개 감정 = ~300개 에셋 완성
- 선수별 시그니처 세러머니 이미지
- 이벤트별 짧은 애니메이션 (Lottie 또는 CSS)
- 성능 최적화 (프리로드, 스프라이트 시트 검토)
- 다크모드 카툰 변형

---

## 기존 코드 활용 맵

```
[유지] SportMonks API 클라이언트/매퍼    → 맨시티 필터만 추가
[유지] Supabase DB 9개 테이블           → 그대로 + cartoon 2테이블 추가
[유지] 실시간 폴링 (TanStack Query)      → 카툰 감정 계산의 데이터 소스
[유지] 라이브스코어 시스템               → 카툰 반응의 트리거
[유지] OG 이미지 생성 (satori)          → 카툰 카드 생성으로 확장
[유지] 인증 시스템                      → 사용자 기능 기반
[유지] Cron sync 전체                   → 데이터 동기화 유지
[수정] fixture-repository              → 맨시티 경기 필터링
[수정] player-repository               → 맨시티 선수 필터링
[수정] lineup-display                  → 카툰 피치 뷰로 교체
[수정] globals.css                     → 맨시티 테마
[수정] nav-config                      → 맨시티 메뉴
[신규] types/cartoon.ts                → 카툰 타입 시스템
[신규] cartoon/ 서비스 + 컴포넌트        → 핵심 새 기능
```

---

## 핵심 변경 파일 (우선순위순)

1. `lib/api/sportmonks/constants.ts` — MCITY_TEAM_ID 추가
2. `lib/repositories/fixture-repository.ts` — 맨시티 경기 필터링
3. `lib/repositories/player-repository.ts` — 맨시티 선수 필터링
4. `app/globals.css` — 맨시티 컬러 테마
5. `app/layout.tsx` — 브랜딩, 메타데이터, 폰트
6. `components/nav/nav-config.ts` — 네비게이션 재구성
7. `types/cartoon.ts` — 카툰 타입 정의 (신규)
8. `lib/services/cartoon/mood-engine.ts` — 감정 엔진 (신규)
9. `components/cartoon/cartoon-avatar.tsx` — 카툰 아바타 (신규)
10. `app/(app)/matchday/[fixtureId]/_components/lineup-display.tsx` — 카툰 피치

---

## 검증 방법

### Phase 1 검증
- `npm run dev` → `/matchday`에서 맨시티 경기만 표시되는지 확인
- `/squad`에서 맨시티 선수만 표시되는지 확인
- 테마 색상이 sky blue/navy로 적용되었는지 확인
- `npm run validate` 통과

### Phase 2 검증
- Supabase Storage에 카툰 에셋 업로드 후 이미지 로딩 확인
- `/squad` 페이지에서 카툰 아바타가 정상 표시되는지 확인
- `resolvePlayerMood()` 유닛 테스트: 이벤트별 올바른 감정 반환

### Phase 3 검증
- 라이브 경기 시 `/matchday/[fixtureId]`에서 카툰 피치 표시
- 골 발생 시 해당 선수 카툰이 `celebrating`으로 전환되는지
- 경기 종료 시 결과에 따른 감정 전환 확인
- 모바일(375px)에서 카툰 피치 레이아웃 깨지지 않는지

### Phase 4 검증
- `/api/cartoon/share` → 카툰 카드 이미지 정상 생성
- 갤러리 페이지에서 카드 목록 표시
- Web Share API로 모바일 공유 동작 확인
- Playwright로 주요 플로우 스크린샷 캡처

---

## 한 문장 정리

> **pitch-ac = 맨시티 선수들이 카툰 캐릭터로 살아 움직이는 팬사이트. 경기 데이터가 캐릭터의 표정과 대사가 되고, 그 순간이 공유 가능한 콘텐츠가 된다.**
