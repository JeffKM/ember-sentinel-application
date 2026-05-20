# ScoutLab DB 데이터 적재 및 페이지 테스트 계획

## Context
ScoutLab Phase S3의 모든 UI 페이지(S301~S312)가 구현 완료되었지만, DB에 실제 데이터가 없어 테스트를 진행하지 못했다. 실제 PL 선수 + Big 5 리그 선수 데이터를 Supabase에 직접 적재하고 각 페이지를 검증한다.

## Step 0: ROADMAP.md 업데이트

Phase S3 완료 처리 + Phase S4 추가. 아래 내용을 ROADMAP.md에 반영한다.

### Phase S3 상태 변경
- `Phase S3: ScoutLab UI 페이지 구현 — 진행 중` → `Phase S3: ScoutLab UI 페이지 구현 — 완료 ✅`

### Phase S4 신규 추가 (Phase S3과 Phase 8 사이에 삽입)

```markdown
## Phase S4: ScoutLab 데이터 적재 및 통합 테스트 — 진행 중

- **Task S401: DB 데이터 초기화 및 선수 적재** ⬜
  - 기존 scoutlab 테이블 데이터 확인 및 시퀀스 리셋
  - PL 50명 + La Liga 10명 + Serie A 10명 + Bundesliga 10명 + Ligue 1 10명 = 90명 (25/26 시즌)
  - Progression 테스트용 24/25 시즌 10명 추가 (Salah, Haaland, Saka, Palmer, Rice 등)
  - ON CONFLICT (name, team, season) DO UPDATE로 멱등 적재

- **Task S402: 메트릭 데이터 적재 (scoutlab_metrics)** ⬜
  - 100명 × per90/padj 메트릭 (11개 카테고리 × 52개 메트릭 JSONB)
  - 포지션별 리얼리스틱 데이터 (FBref 기준 value + percentile)
  - FW: 높은 final_product/shooting, CB: 높은 defending/aerial, MF: 높은 passing/possession

- **Task S403: 레이더 + 액션맵 + 유사 선수 적재** ⬜
  - scoutlab_radar: 100명 × 10축 백분위 (카테고리 평균)
  - scoutlab_action_maps: 핵심 20명 × 3타입(carries/passes/crosses) = 60행
  - scoutlab_similarity: 핵심 20명 × 유사 선수 20명 JSONB

- **Task S404: Scatter/Ranking 페이지 playerId 하드코딩 수정** ⬜
  - scatter/page.tsx, ranking/page.tsx의 `getScoutlabMetrics(1, ...)` → 동적 조회로 변경

- **Task S405: 통합 테스트 (10개 페이지)** ⬜
  - Player Card: 선수 검색 + 11개 카테고리 메트릭 테이블 확인
  - Summary: 10개 카테고리 백분위 바 렌더링
  - Radar: 10축 레이더 차트
  - Progression: 2개 시즌(24/25, 25/26) 라인 차트
  - Action Maps: 3개 피치 (carries/passes/crosses) 라인 오버레이
  - Scatter: 90명 산점도 + 리그 색상 구분
  - Similarity: 20명 유사 선수 테이블
  - Ranking: 메트릭별 50명 랭킹
  - Compare: 2선수 레이더 오버레이 + 메트릭 비교
  - Glossary: 정적 데이터 (DB 무관)
  - 필터 동작: 리그/포지션/모드 토글 변경 시 데이터 갱신 확인
```

### 진행 상황 업데이트
```
Phase S3 완료 ✅ | Phase S4 진행 중
```

### 기능-Task 매핑 추가
```
| F124    | ScoutLab 데이터 적재     | Task S401~S403 |
| F125    | ScoutLab 통합 테스트     | Task S404~S405 |
```

## Step 1~9: 데이터 적재 및 테스트 (실행 계획)

(이전 계획 내용과 동일 - execute_sql로 순차 적재 후 페이지 테스트)

## 수정 대상 파일
- `docs/ROADMAP.md` — Phase S4 추가, 진행 상황 업데이트
- `app/(app)/scouting/scatter/page.tsx` — playerId=1 하드코딩 수정
- `app/(app)/scouting/ranking/page.tsx` — playerId=1 하드코딩 수정
