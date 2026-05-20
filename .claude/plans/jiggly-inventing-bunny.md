# 포지션별 비교 그룹 스크래핑 + Similarity 데이터 수집

## Context

현재 `scoutlab_metrics` 1,452건은 모두 `comparison_position=AM/W`만 보유.
`--skip-positions`로 실행했기 때문에 나머지 4개 포지션(CB, FB, MF, FW) 데이터가 없음.
또한 `scoutlab_similarity`에 유사 선수 데이터가 비어있거나 score=0으로 하드코딩.
Similarity Score 탭에서 20명의 유사 선수 + 실제 점수를 수집해야 함.

## 변경 파일

1. `scripts/scraper/lib/types.ts` — `positions` 필드 추가
2. `scripts/scraper/main.ts` — `--positions` CLI 플래그 + `--similarity-only` 모드 추가
3. `scripts/scraper/lib/parsers.ts` — `parseSimilarPlayersFromTab()` 함수 추가 (Similarity Score 탭 파싱)
4. `scripts/scraper/lib/db.ts` — `upsertSimilarity` 수정 (20명 지원, score 포함)

## 구현 상세

### Step 1: `--positions` CLI 플래그 추가

**`scripts/scraper/lib/types.ts`**:
```typescript
export interface ScraperOptions {
  // ... 기존 필드
  positions?: string[]; // 특정 포지션만 스크래핑 (e.g., ["CB", "FB", "MF", "FW"])
  similarityOnly: boolean; // similarity만 수집 (메트릭 스킵)
}
```

**`scripts/scraper/main.ts`** — `parseCliArgs()`:
- `--positions=CB,FB,MF,FW` → 쉼표 분리 → 유효성 검증
- `--similarity-only` → boolean

**`scrapeAllCombinations()`** 수정:
```typescript
const positions = opts.positions?.length
  ? opts.positions
  : opts.skipPositions
    ? ["AM/W"]
    : [...ALL_COMPARISON_POSITIONS];
```

### Step 2: Similarity Score 탭 파싱

**`scripts/scraper/lib/parsers.ts`** — `parseSimilarPlayersFromTab()`:

스크린샷 기반 DOM 구조:
- "20 Most Similar Players" 헤더
- 2열 테이블: 각 행에 # | PLAYER(이름+정보) | SCORE
- 선수 정보: "19, AM/W, Barcelona" 형식

파싱 로직:
1. "Similarity Score" 탭으로 이동
2. "20 Most Similar" 텍스트 대기
3. 테이블 행 파싱 (rank, name, info, score)
4. score를 0~1 소수로 변환 (84 → 0.84)
5. "Player Card" 탭으로 복귀

```typescript
export async function parseSimilarPlayersFromTab(
  iframe: FrameLocator,
  page: Page,
): Promise<ParsedSimilarPlayer[]> {
  // 1. Similarity Score 탭 클릭
  // 2. "20 Most Similar" 대기
  // 3. SCORE 컬럼 값 + PLAYER 정보 파싱
  // 4. Player Card 탭 복귀
}
```

### Step 3: `--similarity-only` 모드 구현

**`main.ts`** — 새 함수 `scrapeSimilarityOnly()`:
- 모든 팀/선수 순회
- 각 선수: Similarity Score 탭 → 파싱 → DB 저장
- 메트릭 스크래핑 스킵
- per90/padj/AM/W 등 모드 토글 불필요

### Step 4: 기존 similarity 수집 로직 개선

**`main.ts`** — `parseAndSave()`:
- 기존: `const isDefault = mode === "per90" && adjustment === "padj"` → Player Card에서 Top 5만 파싱
- 변경: similarity 수집을 `scrapeAllCombinations`에서 1회만 호출 (탭 전환 방식)
- `scrapeAllCombinations` 시작 시 Similarity Score 탭 파싱 → DB 저장 → Player Card로 복귀 → 메트릭 루프

**`scripts/scraper/lib/db.ts`** — `upsertSimilarity()`:
- 기존: 5명 → 20명 지원 (변경 불필요, JSONB 배열이라 유연)
- score: 실제 값 저장 (0.84 등)

### Step 5: ParsedSimilarPlayer 타입 확장

**`scripts/scraper/lib/types.ts`**:
```typescript
export interface ParsedSimilarPlayer {
  rank: number;
  name: string;
  info: string; // "19, AM/W, Barcelona"
  score?: number; // 0~1 소수 (Similarity Score 탭에서 수집 시)
}
```

**`scripts/scraper/lib/db.ts`** — `upsertSimilarity()`:
- `score: s.score ?? 0` 으로 기존 호환 유지

## 실행 계획

### 포지션 스크래핑 (4개 조합 × 4포지션)

```bash
# per90+padj — 4 missing positions
npm run scrape:scoutlab -- --mode=per90 --adjustment=padj --positions=CB,FB,MF,FW

# per90+raw — 4 missing positions
npm run scrape:scoutlab -- --mode=per90 --adjustment=raw --positions=CB,FB,MF,FW

# total+padj — 4 missing positions
npm run scrape:scoutlab -- --mode=total --adjustment=padj --positions=CB,FB,MF,FW

# total+raw — 4 missing positions
npm run scrape:scoutlab -- --mode=total --adjustment=raw --positions=CB,FB,MF,FW
```

각 실행: ~359명 × 4포지션 ≈ 1,436 작업 → ~5시간/회
총: ~20시간 (순차 실행)

### Similarity 수집

```bash
# similarity만 별도 수집 (메트릭 스킵)
npm run scrape:scoutlab -- --similarity-only
```

~359명 × 1회 = ~1.5시간

## 검증

1. `--positions=CB --mode=per90 --adjustment=padj --player="Mohamed Salah"` 단건 테스트
2. `--similarity-only --player="Mohamed Salah"` 단건 테스트
3. DB 확인: `scoutlab_metrics`에 새 comparison_position 레코드 생성 확인
4. DB 확인: `scoutlab_similarity`에 20명 + score > 0 확인
5. 프론트엔드: `/scouting/similarity?playerId=X` 페이지에서 점수 표시 확인
