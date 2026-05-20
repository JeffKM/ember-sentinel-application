# Task 019: 맥락 데이터 계산 엔진 구현

## Context

현재 `player_season_stats.context` JSONB에는 placeholder 값(`{rank: 0, percentile: 0, prevSeason: null}`)만 저장되어 있고, `radar_data.positionAverage`도 모두 50 고정이다. UI는 이미 `rank > 0`이면 "리그 N위" 표시, `percentile > 0`이면 백분위 바 표시, `prevSeason`에 따라 전년 비교를 보여주도록 구현되어 있으므로, **계산 엔진만 구현하면 UI가 자동으로 맥락 데이터를 표시**한다.

## 구현 전략

DB에 저장된 모든 선수의 시즌 스탯을 한번에 조회 → 메모리 내에서 포지션별 순위/백분위 계산 → context JSONB + radar_data JSONB 일괄 UPDATE. 기존 sync 서비스 패턴(SyncResult, writeSyncLog, verifyCronAuth)을 그대로 따른다.

---

## Step 1: `lib/services/sync/calculate-context.ts` 생성 (핵심)

**신규 파일** — 계산 엔진 메인 로직

### 함수 구조:

```
calculateContext(): Promise<SyncResult>
├── Step 1: 현재 시즌 전체 player_season_stats + players.position JOIN 조회
├── Step 2: 전년 시즌(2024/2025) player_season_stats 조회 (prevSeason용)
├── Step 3: 포지션별(GK/DEF/MID/FWD) 그룹핑
├── Step 4: 5개 메트릭별 포지션 내 순위/백분위 계산
├── Step 5: 레이더 positionAverage 실제 포지션 평균으로 갱신
└── Step 6: player_season_stats.context + radar_data 일괄 UPDATE
```

### 계산 알고리즘:

- **순위**: Standard Competition Ranking (동점 시 같은 순위, 다음 순위 건너뜀)
  - 예: [19, 19, 14, 10] → rank [1, 1, 3, 4]
- **백분위**: `Math.round(((totalCount - rank) / (totalCount - 1)) * 100)`
  - 1위 → 100, 꼴찌 → 0, 1명이면 100
- **전년 비교**: `prevSeason = prev시즌동일메트릭값 ?? null`
- **대상 메트릭**: goals, assists, keyPasses, dribbles, averageRating (xG/xA는 NULL이므로 제외)
- **레이더 평균**: 같은 포지션 선수들의 `radar_data.player` 각 dimension 평균

### 주요 유틸 함수:

- `computeRanks(entries: {playerId, value}[]): Map<playerId, rank>` — 내림차순 정렬, 동점 처리
- `computePercentile(rank, totalCount): number` — 백분위 공식
- `computePositionAverageRadar(byPosition): Map<position, RadarDataPoint[]>` — 포지션별 레이더 평균

### 참조 파일:

- `lib/services/sync/log.ts` — SyncResult, writeSyncLog, extractErrorMessage
- `lib/supabase/admin.ts` — createAdminClient()
- `types/player.ts` — StatContext, PlayerPosition
- `types/radar.ts` — RadarData, RadarDataPoint, RadarDimension

---

## Step 2: `app/api/cron/calculate-context/route.ts` 생성

**신규 파일** — Cron 엔드포인트

기존 `app/api/cron/sync-stats/route.ts` 패턴 그대로 복제:

- `maxDuration = 60`
- `verifyCronAuth(request)` 인증
- `calculateContext()` 호출
- JSON 응답 반환

---

## Step 3: `lib/services/sync/index.ts` 수정

기존 export에 한 줄 추가:

```typescript
export { calculateContext } from "./calculate-context";
```

---

## Step 4: `vercel.json` 수정

sync-stats(07:00 UTC) 완료 후 30분 뒤 실행:

```json
{ "path": "/api/cron/calculate-context", "schedule": "30 7 * * *" }
```

---

## 수정 대상 파일 요약

| 파일                                      | 작업                            |
| ----------------------------------------- | ------------------------------- |
| `lib/services/sync/calculate-context.ts`  | **신규 생성** — 계산 엔진 핵심  |
| `app/api/cron/calculate-context/route.ts` | **신규 생성** — Cron 엔드포인트 |
| `lib/services/sync/index.ts`              | **수정** — export 1줄 추가      |
| `vercel.json`                             | **수정** — cron 스케줄 1개 추가 |

**UI 변경 없음** — 기존 `stat-context-card.tsx`의 `rank > 0`, `percentile > 0` 조건이 자동으로 계산 결과를 표시

---

## 엣지 케이스

| 케이스                  | 처리                                   |
| ----------------------- | -------------------------------------- |
| 포지션 내 선수 1명      | percentile=100, rank=1                 |
| 동점자                  | Standard Competition Ranking (1,1,3,4) |
| xG/xA null              | CONTEXT_METRICS에서 제외               |
| 전년 시즌 데이터 없음   | prevSeason=null → UI "첫 시즌" 배지    |
| radar_data 빈 객체      | positionAverage 갱신 스킵              |
| player_season_stats 0건 | 조기 리턴 (에러 아님)                  |

---

## 검증 방법

1. **로컬 실행**: `curl http://localhost:3000/api/cron/calculate-context` → `{ok: true, result: {recordsSynced: N}}`
2. **DB 확인**: `player_season_stats.context`에서 `rank > 0`, `percentile > 0` 값 확인
3. **Playwright MCP 브라우저 검증**:
   - 선수 프로필 → 골 스탯 카드에 "리그 N위" 텍스트 표시 확인
   - 백분위 프로그레스 바 값 0~100 범위 확인
   - 전년 비교 ↑/↓ 또는 "첫 시즌" 표시 확인
   - 레이더 차트에서 포지션 평균 오버레이가 50이 아닌 실제 값 확인
