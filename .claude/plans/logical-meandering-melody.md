# Phase 2: ScoutLab Playwright 스크래퍼 구현 계획

## Context

Phase 1 완료 (DB 스키마 + 타입 + Repository + 네비게이션). 이제 ScoutLab 데이터를 실제로 수집하기 위한 Playwright 스크래퍼를 구현한다. ScoutLab은 Streamlit WebSocket 기반 앱이며, iframe 안에 렌더링되므로 Playwright headless 브라우저로 DOM을 직접 파싱해야 한다.

---

## Step 0: 마이그레이션 적용 + Position 제약 업데이트

### 0-1. `supabase db push` 실행
```bash
npx supabase db push
```
`0005_scoutlab_tables.sql`이 원격 DB에 적용된다.

### 0-2. Position CHECK constraint 업데이트 — `supabase/migrations/0006_scoutlab_amw_position.sql`
ScoutLab이 "AM/W"를 단일 포지션으로 사용하므로 허용 추가.
```sql
ALTER TABLE scoutlab_players DROP CONSTRAINT IF EXISTS scoutlab_players_position_check;
ALTER TABLE scoutlab_players ADD CONSTRAINT scoutlab_players_position_check
  CHECK (position IN ('CB', 'FB', 'MF', 'AM', 'W', 'AM/W', 'FW'));
```

### 0-3. 타입 업데이트 — `types/scoutlab.ts`
```typescript
export type ScoutlabPosition = "CB" | "FB" | "MF" | "AM" | "W" | "AM/W" | "FW";
```

다시 `supabase db push` 실행.

---

## Step 1: 인프라 설정

### 1-1. `tsx` 설치
```bash
npm install -D tsx
```

### 1-2. `package.json` 스크립트 추가
```json
"scrape:scoutlab": "tsx scripts/scraper/main.ts"
```

### 1-3. 파일 구조 생성
```
scripts/scraper/
  main.ts              — CLI 엔트리 (인자 파싱 + 오케스트레이션)
  lib/
    supabase.ts        — 스크래퍼 전용 Supabase client (server-only 없음)
    browser.ts         — Playwright 브라우저 launch + iframe 접근
    navigation.ts      — ScoutLab 필터 네비게이션 (시즌/리그/팀/선수 선택)
    parsers.ts         — DOM → 데이터 파싱 (선수 정보 + 메트릭)
    db.ts              — Supabase upsert (scoutlab_players, _metrics, _sync_logs)
    constants.ts       — URL, 카테고리 매핑, 포지션 매핑 상수
    logger.ts          — 콘솔 프로그레스 출력
    types.ts           — 스크래퍼 내부 타입
```

---

## Step 2: 핵심 파일 상세

### 2-1. `scripts/scraper/lib/supabase.ts`
`lib/supabase/admin.ts`와 동일하되 `import "server-only"` 제거. `dotenv/config` 로 환경변수 로드.
```typescript
import { createClient } from "@supabase/supabase-js";
export function createScraperClient() { ... }
```
- 참조: `lib/supabase/admin.ts` (동일 로직, server-only만 제거)

### 2-2. `scripts/scraper/lib/browser.ts`
- `@playwright/test`에서 `chromium` import (이미 설치됨, 별도 패키지 불필요)
- `launchBrowser(headless)` → `{ browser, page }`
- `navigateToScoutLab(page)` → iframe `Frame` 반환
  - DOM: `generic > generic > iframe[active]` (`.playwright-mcp/` 스냅샷 확인됨)
  - `page.waitForSelector('iframe')` → `contentFrame()`
- `waitForStreamlitReady(frame)` → `stStatusWidget` hidden 대기 + 500ms 안전 대기

### 2-3. `scripts/scraper/lib/navigation.ts`
ScoutLab DOM 구조 (스냅샷 기반):
- **시즌**: `radiogroup > button:has-text("25/26")` 클릭
- **사이드바 탭**: `button:has-text("Player Card")` 클릭
- **리그/팀/선수**: Streamlit combobox — `input[aria-label*="League"]` 클릭 → fill → `[role="option"]` 클릭

핵심 함수:
- `selectSeason(frame, "25/26")`
- `selectComboboxOption(frame, "League", "Premier League")`
- `getComboboxOptions(frame, "Club")` → 팀 목록 동적 추출
- `selectPlayer(frame, "Mohamed Salah")`

### 2-4. `scripts/scraper/lib/parsers.ts`
Player Card DOM (스냅샷 `.playwright-mcp/page-2026-05-10T04-21-55-927Z.yml`):

**선수 정보 영역:**
```
"NATION:" → "FRA", "CLUB:" → "Bayern München", "AGE:" → "24 yrs",
"HEIGHT:" → "184 cm", "MINUTES:" → "2.198"
```
- Minutes 파싱: `"2.198"` → `replace(/[.,]/g, "")` → `2198`

**카테고리 백분위 영역:**
```
"CATEGORY PERCENTILES" 아래:
  generic > generic(메트릭명) + generic(백분위 숫자)
  "↳ " 접두사 = 하위 카테고리
```
예시: `"Final Product" → "99"`, `"↳ Volume" → "98"`

**Top 5 유사 선수:**
```
"Top 5 Most Similar Players" 테이블
각 행: rank, 선수이름, "18, AM/W, Barcelona", score
```

### 2-5. `scripts/scraper/lib/constants.ts`
- `SCOUTLAB_URL = "https://scoutlab.streamlit.app/"`
- `METRIC_TO_CATEGORY` — 메트릭명 → DB 카테고리 매핑 (첫 실행 후 보정)
  - "Final Product" → `final_product`, "Shooting/Volume/Shot Creation/Quality of Chances/Quality of Finishing" → `shooting`
  - "Receiving" → `possession`, "Creation/Via Carries(creation)/Via Passes(creation)/Crossing" → `creation`
  - "Dribbling" → `ball_carrying`, "Progression/Via Carries(progression)/Via Passes(progression)" → `passing`
  - "Passing Accuracy" → `passing`, "Active Defending/Defensive Duels/Defensive Actions/Possession Models" → `defending`
  - "Aerial" → `aerial`, "Set Pieces" → `set_pieces`
  - 매핑 없는 메트릭 → `misc` fallback

### 2-6. `scripts/scraper/lib/db.ts`
기존 sync 패턴 (`lib/services/sync/sync-teams.ts`) 참조:
- `upsertPlayer(supabase, data)` → `scoutlab_players` upsert, onConflict `"name,team,season"`, id 반환
- `upsertMetrics(supabase, playerId, season, metrics)` → JSONB 카테고리별 구조 변환 후 `scoutlab_metrics` upsert
  - **주의**: Player Card에서는 `value` 미제공 → `value: 0`, `percentile`만 저장
- `writeSyncLog(supabase, params)` → `scoutlab_sync_logs` insert (기존 `sync_logs`와 스키마 다름)

### 2-7. `scripts/scraper/lib/logger.ts`
```
[12/550] Arsenal > Saka... OK (1.2s)
[13/550] Arsenal > Ødegaard... FAIL: timeout
```

### 2-8. `scripts/scraper/main.ts` — 핵심 오케스트레이션
```
1. CLI 인자: --season, --league, --team(선택), --player(선택), --headless, --dry-run
2. dotenv 로드 + Supabase client 생성
3. Playwright 브라우저 launch → ScoutLab 접속 → iframe Frame 획득
4. "Player Card" 탭 + 시즌 선택
5. 리그 선택 → 팀 목록 추출 → 반복:
   a. 팀 선택 → 선수 목록 추출 → 반복:
      i. 선수 선택 + Streamlit 로딩 대기
      ii. parsePlayerInfo() + parseMetrics() + parseSimilarPlayers()
      iii. upsertPlayer() → upsertMetrics()
      iv. 실패 시 로그 + continue (선수 단위 격리)
6. writeSyncLog() → 결과 요약 출력 → browser.close()
```

- `node:util`의 `parseArgs()` 사용 (외부 의존성 없음)
- 각 선수 간 1초 딜레이 (rate limiting 방지)
- `--dry-run`: 네비게이션만 테스트, DB 쓰기 스킵

---

## Step 3: 잠재 리스크 + 대응

| 리스크 | 대응 |
|--------|------|
| Streamlit WebSocket 끊김 (장시간) | 페이지 새로고침 + 팀 단위 checkpoint |
| Streamlit 커뮤니티 rate limiting | 선수 간 1-2초 딜레이, `--delay` 옵션 |
| 메트릭 구조가 포지션마다 다름 | `misc` 카테고리 fallback + 첫 실행 후 매핑 보정 |
| iframe 접근 실패 | `page.frames()` fallback, URL 기반 frame 탐색 |
| Minutes 천단위 구분자 (유럽식 `.` vs `,`) | `replace(/[.,]/g, "")` 후 parseInt |

---

## 수정 대상 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `package.json` | `tsx` devDep 추가, `scrape:scoutlab` 스크립트 추가 |
| `types/scoutlab.ts` | `ScoutlabPosition`에 `"AM/W"` 추가 |
| `supabase/migrations/0005_scoutlab_tables.sql` | (변경 없음, 이미 완료) |

## 신규 생성 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/0006_scoutlab_amw_position.sql` | position CHECK constraint에 AM/W 추가 |
| `scripts/scraper/main.ts` | CLI 엔트리 + 오케스트레이션 |
| `scripts/scraper/lib/supabase.ts` | 스크래퍼 전용 Supabase client |
| `scripts/scraper/lib/browser.ts` | Playwright 브라우저 + iframe 헬퍼 |
| `scripts/scraper/lib/navigation.ts` | ScoutLab 필터 네비게이션 |
| `scripts/scraper/lib/parsers.ts` | DOM 데이터 파싱 |
| `scripts/scraper/lib/db.ts` | Supabase upsert 로직 |
| `scripts/scraper/lib/constants.ts` | 상수 + 매핑 |
| `scripts/scraper/lib/logger.ts` | 콘솔 프로그레스 |
| `scripts/scraper/lib/types.ts` | 내부 타입 |

---

## 검증 방법

1. **단일 선수**: `npm run scrape:scoutlab -- --season=25/26 --league="Premier League" --team="Liverpool" --player="Mohamed Salah" --headless=false`
2. **단일 팀**: `npm run scrape:scoutlab -- --season=25/26 --league="Premier League" --team="Arsenal"`
3. **Dry run**: `npm run scrape:scoutlab -- --season=25/26 --league="Premier League" --dry-run`
4. **DB 확인**: Supabase dashboard에서 `scoutlab_players`, `scoutlab_metrics`, `scoutlab_sync_logs` 데이터 확인
5. **타입 체크**: `npm run type-check` 통과
