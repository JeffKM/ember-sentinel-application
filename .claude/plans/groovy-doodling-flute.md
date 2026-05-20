# Phase 2: ScoutLab Playwright 스크래퍼 구현

## Context

Phase 1 완료 상태:
- DB 스키마 (`0005_scoutlab_tables.sql`): 6개 테이블 (players, metrics, radar, action_maps, similarity, sync_logs)
- 타입 (`types/scoutlab.ts`): 완전한 타입 계층
- Repository (`lib/repositories/scoutlab-repository.ts`, `scoutlab-mappers.ts`): 7개 캐시 조회 + 3개 집계
- UI 스켈레톤 (`app/(app)/scouting/`): 10개 탭/페이지 레이아웃

ScoutLab(https://scoutlab.streamlit.app/)은 Streamlit WebSocket 기반 앱으로, iframe 안에 렌더링됨. Playwright headless 브라우저로 DOM을 파싱하여 데이터를 수집해야 함.

---

## Step 0: 마이그레이션 적용 + Position 제약 업데이트

### 0-1. `supabase db push` 실행
```bash
npx supabase db push
```

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

### 1-3. 파일 구조
```
scripts/scraper/
  main.ts              — CLI 엔트리 (인자 파싱 + 오케스트레이션)
  lib/
    supabase.ts        — 스크래퍼 전용 Supabase client (dotenv 로드)
    browser.ts         — Playwright 브라우저 launch + iframe 접근
    navigation.ts      — ScoutLab 필터 네비게이션 (시즌/리그/팀/선수 선택)
    parsers.ts         — DOM → 데이터 파싱 (선수 정보 + 메트릭)
    db.ts              — Supabase upsert (players, metrics, sync_logs)
    constants.ts       — URL, 카테고리 매핑, 포지션 매핑
    logger.ts          — 콘솔 프로그레스 출력
    types.ts           — 스크래퍼 내부 타입
```

---

## Step 2: 핵심 파일 상세

### 2-1. `scripts/scraper/lib/supabase.ts`
- `lib/supabase/admin.ts` 패턴 재사용 (service_role key)
- `import "server-only"` 제거, `dotenv/config` 로드
- 참조: `lib/supabase/admin.ts`

### 2-2. `scripts/scraper/lib/browser.ts`
- `@playwright/test`에서 `chromium` import (이미 설치됨)
- `launchBrowser(headless)` → `{ browser, page }`
- `navigateToScoutLab(page)` → iframe `Frame` 반환
- `waitForStreamlitReady(frame)` → stStatusWidget hidden 대기 + 500ms 안전 대기

### 2-3. `scripts/scraper/lib/navigation.ts`
ScoutLab DOM 구조:
- **시즌**: `radiogroup > button:has-text("25/26")` 클릭
- **사이드바 탭**: `button:has-text("Player Card")` 클릭
- **리그/팀/선수**: Streamlit combobox — `input[aria-label*="..."]` 클릭 → fill → `[role="option"]` 클릭

### 2-4. `scripts/scraper/lib/parsers.ts`
Player Card DOM 파싱 (`.playwright-mcp/page-2026-05-10T04-21-55-927Z.yml` 스냅샷 기반):
- 선수 정보: NATION, CLUB, AGE, HEIGHT, MINUTES
- 카테고리 백분위: "CATEGORY PERCENTILES" 하위 메트릭명 + 백분위
- Top 5 유사 선수 테이블

### 2-5. `scripts/scraper/lib/constants.ts`
- `SCOUTLAB_URL = "https://scoutlab.streamlit.app/"`
- `METRIC_TO_CATEGORY` 매핑 (Final Product→final_product, Shooting→shooting 등)
- 매핑 없는 메트릭 → `misc` fallback

### 2-6. `scripts/scraper/lib/db.ts`
- `upsertPlayer()` → `scoutlab_players` upsert (onConflict: name,team,season)
- `upsertMetrics()` → JSONB 카테고리별 구조 변환 후 upsert
- `writeSyncLog()` → `scoutlab_sync_logs` insert

### 2-7. `scripts/scraper/main.ts` — 오케스트레이션
```
1. CLI 인자: --season, --league, --team(선택), --player(선택), --headless, --dry-run
2. dotenv 로드 + Supabase client 생성
3. Playwright launch → ScoutLab 접속 → iframe Frame 획득
4. "Player Card" 탭 + 시즌 선택
5. 리그 선택 → 팀 목록 추출 → 반복:
   a. 팀 선택 → 선수 목록 추출 → 반복:
      i. 선수 선택 + Streamlit 로딩 대기
      ii. parsePlayerInfo() + parseMetrics() + parseSimilarPlayers()
      iii. upsertPlayer() → upsertMetrics()
      iv. 실패 시 로그 + continue (선수 단위 격리)
6. writeSyncLog() → 결과 요약 → browser.close()
```
- `node:util`의 `parseArgs()` 사용
- 각 선수 간 1초 딜레이
- `--dry-run`: 네비게이션만 테스트, DB 쓰기 스킵

---

## Step 3: 리스크 대응

| 리스크 | 대응 |
|--------|------|
| Streamlit WebSocket 끊김 | 페이지 새로고침 + 팀 단위 checkpoint |
| Rate limiting | 선수 간 1-2초 딜레이, `--delay` 옵션 |
| 메트릭 구조가 포지션마다 다름 | `misc` 카테고리 fallback |
| iframe 접근 실패 | `page.frames()` fallback |
| Minutes 천단위 구분자 | `replace(/[.,]/g, "")` 후 parseInt |

---

## 수정/생성 파일 목록

### 수정 대상
| 파일 | 변경 |
|------|------|
| `package.json` | `tsx` devDep, `scrape:scoutlab` 스크립트 |
| `types/scoutlab.ts` | `ScoutlabPosition`에 `"AM/W"` 추가 |

### 신규 생성
| 파일 | 설명 |
|------|------|
| `supabase/migrations/0006_scoutlab_amw_position.sql` | position CHECK에 AM/W 추가 |
| `scripts/scraper/main.ts` | CLI 엔트리 |
| `scripts/scraper/lib/supabase.ts` | 스크래퍼 Supabase client |
| `scripts/scraper/lib/browser.ts` | Playwright + iframe |
| `scripts/scraper/lib/navigation.ts` | ScoutLab 필터 |
| `scripts/scraper/lib/parsers.ts` | DOM 파싱 |
| `scripts/scraper/lib/db.ts` | Supabase upsert |
| `scripts/scraper/lib/constants.ts` | 상수 + 매핑 |
| `scripts/scraper/lib/logger.ts` | 프로그레스 |
| `scripts/scraper/lib/types.ts` | 내부 타입 |

---

## 참조 기존 파일
- `lib/supabase/admin.ts` — Supabase admin client 패턴
- `types/scoutlab.ts` — 도메인 타입
- `supabase/migrations/0005_scoutlab_tables.sql` — DB 스키마

---

## 검증 방법

1. **단일 선수**: `npm run scrape:scoutlab -- --player="Mohamed Salah" --headless=false`
2. **단일 팀**: `npm run scrape:scoutlab -- --team="Arsenal"`
3. **Dry run**: `npm run scrape:scoutlab -- --dry-run`
4. **DB 확인**: Supabase dashboard에서 데이터 확인
5. **타입 체크**: `npm run type-check` 통과
