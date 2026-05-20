# Task 029 E2E 테스트 항목 제거

## Context
UI 변경 계획이 있어 E2E 테스트를 지금 작성하면 UI 수정 시 다시 수정해야 하므로, Phase 5-A에서 Task 029(E2E 테스트 자동화)를 제거한다.

## 변경 파일
- `docs/ROADMAP.md`

## 변경 사항

1. **Task 029 항목 삭제** (605~609행)
   - `- **Task 029: E2E 테스트 자동화 (Playwright 코드)**` 블록 전체 제거

2. **하단 진행 상황 업데이트** (708행)
   - `Task 025~031 예정` → `Task 025~028, 030~031 예정`

## 검증
- `npm run validate` 통과 확인 (MD 파일이므로 format:check만 해당)
