# Phase 3 코드 리뷰 & DB 검증 — 종합 보고서

## Context

Phase 3 (백엔드 및 데이터 연동) 전체 코드와 Supabase DB를 종합 리뷰.
코드 품질, 성능, 보안, 아키텍처, 데이터 정합성을 검증하고 개선 사항을 도출한다.

---

## 1. DB 실데이터 검증 결과

### 테이블별 현황

| 테이블              | 행 수   | 평가 | 비고                                                                           |
| ------------------- | ------- | ---- | ------------------------------------------------------------------------------ |
| teams               | **22**  | ⚠️   | PL 20팀 + 강등팀 2팀(Luton Town, Sheffield Utd) 잔존                           |
| players             | **50**  | ⚠️   | Arsenal(20), Everton(20), Bournemouth(5), Burnley(5)만 존재. **17팀 선수 0명** |
| player_season_stats | **50**  | ⚠️   | 50명만 — sync-stats의 BATCH_SIZE=50 + offset 미지원 때문                       |
| player_match_stats  | **0**   | 🔴   | **Cron 미구현** — 최근 폼 스파크라인 데이터 없음                               |
| fixtures            | **380** | ✅   | GW1~38 완전, gameweek=0 없음, 누락팀 없음                                      |
| standings           | **20**  | ✅   | 정확                                                                           |
| glossary            | **20**  | ✅   | 시드 정상                                                                      |
| injuries            | **0**   | ⚠️   | Cron 미구현 (API에서도 제한적)                                                 |
| sync_logs           | **24**  | ✅   | 정상 기록                                                                      |

### 맥락 데이터 품질

- context: 50/50 모두 계산됨 ✅
- radar_data: 50/50 모두 존재 ✅
- xg/xa: 전부 NULL (Starter 플랜 제한, 예상대로) ✅
- prevSeason: 전부 null (2024/2025 데이터 미존재, 정상) ✅
- **순위 정확성 검증 통과**: Saka FWD 골 1위(16골), Havertz 2위(13골), Eze/KDH MID 골 공동2위(6골) — Standard Competition Ranking 정확 ✅

### 인덱스 현황

- `player_season_stats_player_id_season_key` UNIQUE INDEX 존재 → 복합 인덱스 커버됨 ✅
- `standings_team_id_season_key` UNIQUE INDEX 존재 → 복합 인덱스 커버됨 ✅
- `player_match_stats_player_id_fixture_id_key` UNIQUE INDEX 존재 ✅
- 누락: `fixtures(gameweek, status)` 복합 인덱스 (getCurrentGameweek 최적화용, 380행이므로 현재 긴급하진 않음)

---

## 2. 발견된 문제 (심각도순)

### 🔴 Critical — 즉시 수정

#### C1. compare 페이지 mock 데이터 미연동

- **파일**: `app/(app)/compare/page.tsx:3-8`
- **문제**: `mockPlayers`, `mockTeams`를 import해서 사용. 실DB 데이터가 아닌 더미 데이터로 선수 검색됨
- **영향**: 비교 페이지에서 실제 PL 선수 검색/선택 불가능
- **수정**:

  ```typescript
  // AS-IS: import { mockPlayers, mockTeams } from "@/lib/mock";
  // TO-BE: repository에서 실데이터 조회
  import { getAllPlayers } from "@/lib/repositories/player-repository";
  import { getAllTeams } from "@/lib/repositories/team-repository";
  ```

  - `compare-client.tsx`의 `getPlayerSeasonStats()` 호출도 mock → API/repository로 변경 필요

#### C2. sync-stats.ts offset 미지원 → 매번 동일 50명만 처리

- **파일**: `lib/services/sync/sync-stats.ts:23-27`
- **문제**: `.order("id").limit(50)` — 항상 ID가 가장 작은 50명만 반복 동기화
- **영향**: 50명 이상의 선수 시즌 스탯이 영원히 갱신 안 됨
- **수정**: offset 기반 배치 처리 또는 전체 선수 순회 로직 추가
  ```typescript
  // 방법 1: 전체 선수 ID 조회 후 배치 처리
  const { data: allPlayers } = await supabase.from("players").select("id");
  // 50명씩 잘라서 순차 처리
  ```

#### C3. player_match_stats 동기화 Cron 미구현 (0행)

- **문제**: 스파크라인(최근 10경기 폼)에 필요한 데이터가 0건
- **영향**: 선수 프로필의 "최근 폼" 섹션이 빈 상태
- **수정**: `sync-match-stats` Cron 작업 추가 또는 기존 sync-fixtures에서 함께 추출

#### C4. players 50명만 동기화됨 — 17팀 선수 0명

- **파일**: `lib/services/sync/sync-players.ts`
- **문제**: 현재 라운드 events/lineups에서 추출한 player_id만 처리 + BATCH_SIZE=50 제한
- **영향**: 대부분의 팀 선수가 DB에 없어 검색/프로필 접근 불가
- **수정**: `getSquadByTeamAndSeason()` 활용하여 20팀 전체 스쿼드 동기화

### 🟡 Important — 가까운 미래 수정

#### I1. calculate-context.ts 순차 UPDATE → 배치 처리

- **파일**: `lib/services/sync/calculate-context.ts:250-270`
- **문제**: N명 선수 × 1 UPDATE = N번 DB 왕복 (현재 50명이라 큰 문제 없으나, 전체 동기화 후 500명+면 병목)
- **수정**: upsert 배치로 전환
  ```typescript
  const updateRows = rows.map((row) => ({
    id: row.id,
    context: contextMap.get(row.player_id),
    radar_data: updatedRadar,
  }));
  await supabase
    .from("player_season_stats")
    .upsert(updateRows, { onConflict: "id" });
  ```

#### I2. getCurrentGameweek() 3개 순차 쿼리

- **파일**: `lib/repositories/fixture-repository.ts:15-52`
- **문제**: LIVE → NS → FT 순서로 최악 3번 왕복
- **수정**: `Promise.all`로 3개 동시 실행 후 우선순위 판단

#### I3. sync-players/sync-stats 에러 무시

- **파일**: `sync-players.ts`, `sync-stats.ts`의 `catch { continue }`
- **문제**: 개별 선수 실패 시 로그 없이 조용히 건너뜀 → 디버깅 불가
- **수정**: 실패 카운트 추적 + errorMessage에 기록

#### I4. teams 22행 — 강등팀 잔존

- **문제**: Luton Town(id:115), Sheffield United(id:21)는 현시즌 PL 팀이 아님. standing_count=0
- **원인**: sync-fixtures가 과거 시즌 경기 참가팀도 upsert
- **수정**: 강등팀 정리 SQL 또는 현시즌 팀만 필터링

### 🟢 Nice to Have — 장기 개선

#### N1. 프로덕션 에러 메시지 노출

- **파일**: 모든 API 라우트의 catch 블록
- **문제**: `error.message`가 클라이언트에 그대로 전달됨
- **수정**: 프로덕션에서는 일반 메시지, 개발에서는 상세 메시지

#### N2. sync_logs 보관 정책 없음

- **문제**: 무한 증가 (현재 24행, 아직 미미)
- **수정**: 30일 이상 자동 삭제 함수 또는 Cron 추가

#### N3. retry.ts maxRetries 기본값 1

- **파일**: `lib/services/sync/retry.ts`
- **수정**: 2~3으로 상향

---

## 3. 아키텍처 & 코드 품질 평가

### 강점 (유지할 것)

| 항목                    | 점수 | 근거                                                   |
| ----------------------- | ---- | ------------------------------------------------------ |
| **레이어드 아키텍처**   | 9/10 | Repository → Service → API Route 일관 준수             |
| **Server/Client 분리**  | 9/10 | SSR initialData → TanStack Query 폴링 패턴 우수        |
| **N+1 방지**            | 9/10 | `getPlayerSeasonStatsByIds`, `getTeamsByIds` 배치 조회 |
| **에러 처리**           | 8/10 | notFound(), catch(()=>[]) 폴백, 일관된 응답 래퍼       |
| **타입 안전성**         | 8/10 | Row ↔ App 타입 매퍼, strict 모드                       |
| **TanStack Query 활용** | 9/10 | hasLive 동적 폴링, 백그라운드 비활성화                 |
| **Cron 인증**           | 9/10 | CRON_SECRET 기반, 개발환경 스킵                        |
| **RLS 정책**            | 9/10 | 읽기 공개, 쓰기 service_role, sync_logs 격리           |
| **DB 설계**             | 8/10 | UNIQUE 제약=복합인덱스, GENERATED 컬럼, JSONB 적절     |

### 약점 (개선 필요)

| 항목                | 점수 | 근거                                  |
| ------------------- | ---- | ------------------------------------- |
| **데이터 커버리지** | 3/10 | 50/550명, 3/20팀만 동기화됨           |
| **Cron 완성도**     | 5/10 | player_match_stats, injuries 미동기화 |
| **배치 최적화**     | 6/10 | calculate-context 순차 UPDATE         |
| **보안 세부**       | 7/10 | 프로덕션 에러 메시지 노출             |

---

## 4. 수정 계획

### Step 1: compare 페이지 실데이터 연동 (C1)

- `app/(app)/compare/page.tsx` — mock import 제거, repository 함수로 교체
- `app/(app)/compare/_components/compare-client.tsx` — mock `getPlayerSeasonStats` → API 호출 또는 서버에서 전달

### Step 2: sync-stats offset 버그 수정 (C2)

- `lib/services/sync/sync-stats.ts` — 전체 선수 ID 조회 후 BATCH_SIZE씩 나눠 처리
- Cron maxDuration 고려 (60초 제한)

### Step 3: sync-players 전체 스쿼드 동기화 (C4)

- `lib/services/sync/sync-players.ts` — 20팀 `getSquadByTeamAndSeason` 순차 호출
- 팀별 독립 처리로 부분 실패 허용

### Step 4: calculate-context 배치 UPDATE (I1)

- `lib/services/sync/calculate-context.ts:250-270` — upsert 배치로 전환

### Step 5: getCurrentGameweek 병렬화 (I2)

- `lib/repositories/fixture-repository.ts:15-52` — Promise.all + 우선순위 판정

### Step 6: 에러 로깅 보완 (I3)

- `sync-players.ts`, `sync-stats.ts` — 실패 카운터 + errorMessage 기록

### Step 7: 강등팀 정리 (I4)

- standings 없는 팀 삭제 또는 current_season 필터 추가

---

## 5. 검증 방법

### 코드 수정 후

```bash
npm run type-check    # TypeScript 에러 확인
npm run lint          # ESLint 통과
npm run build         # 빌드 성공 확인
```

### DB 검증 (수정 후 Cron 수동 실행)

```sql
-- sync-players 후: 전체 선수 수 확인
SELECT COUNT(*) FROM players;  -- 목표: 400+

-- sync-stats 후: 전체 스탯 수 확인
SELECT COUNT(*) FROM player_season_stats;  -- 목표: 400+

-- compare 페이지: mock 잔재 확인
-- grep -r "lib/mock" app/(app)/compare/  → 0건이어야 함
```

### Playwright MCP 브라우저 검증

- `/compare` → 실제 PL 선수 검색 가능 여부 확인
- `/players` → 50명 이상 선수 카드 렌더링 확인
- `/players/[실제ID]` → 맥락 스탯 정상 표시 확인
