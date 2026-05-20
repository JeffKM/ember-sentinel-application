# Task 005: 경기 상세 페이지 UI — Playwright MCP 검증 계획

## Context

Task 005(경기 상세 페이지 UI)는 커밋 `4296a8d`에서 이미 구현 완료되었으나, ROADMAP에 정의된 10개 Playwright 검증 항목이 미수행 상태. Playwright MCP 도구로 브라우저에서 직접 검증하고, 결과를 ROADMAP에 반영한다.

## 사전 조건

- 개발 서버 실행: `npm run dev` (localhost:3000)

## 검증 대상 더미 데이터

| fixtureId | 상태 | 대진                    | 스코어     |
| --------- | ---- | ----------------------- | ---------- |
| 5001      | FT   | Arsenal vs Chelsea      | 2-1        |
| 5003      | LIVE | Man United vs Tottenham | 1-1 (72분) |
| 5005      | NS   | Man City vs Arsenal     | 예정       |

## 검증 단계 (3그룹, 10개 항목)

### 그룹 A: FT 경기 — `/matchday/5001` (검증 #1, #2, #3, #4, #8, #10)

**A-1.** `browser_navigate` → `http://localhost:3000/matchday/5001`
**A-2.** `browser_snapshot` → 헤더 + 탭 + 포스트매치 탭 내용 검증

- [#1] "Arsenal", "Chelsea", 스코어 "2", "1", "FT" 배지 존재
- [#2] "프리매치", "라이브", "포스트매치" 탭 3개 존재
- [#8] 포스트매치 탭(기본 활성): 점유율 "58"/"42", "슈팅", "xG" 등 스탯 라벨 존재

**A-3.** `browser_click` → "프리매치" 탭
**A-4.** `browser_snapshot` → 프리매치 탭 내용 검증

- [#3] W/D/L 배지 텍스트 존재
- [#4] "H2H" 섹션 + "부상" 섹션 렌더링 확인 ("Ben White", "Thiago Silva" 등)

**A-5.** `browser_click` → 이벤트 타임라인 또는 부상 목록의 선수 이름 링크
**A-6.** `browser_snapshot` → URL이 `/players/[playerId]`로 변경 확인

- [#10] 선수 이름 클릭 → `/players/[playerId]` 이동 성공

### 그룹 B: LIVE 경기 — `/matchday/5003` (검증 #5, #6, #7)

**B-1.** `browser_navigate` → `http://localhost:3000/matchday/5003`
**B-2.** `browser_snapshot` → 라이브 탭(기본 활성) 내용 검증

- [#5] 점유율 "54"/"46", 스탯 바 존재
- [#6] "60초마다 자동 갱신" 텍스트 존재
- [#7] 이벤트 타임라인: "Bruno Fernandes"(38분), "James Maddison"(64분) 존재

### 그룹 C: NS 경기 — `/matchday/5005` (검증 #9)

**C-1.** `browser_navigate` → `http://localhost:3000/matchday/5005`
**C-2.** `browser_snapshot` → NS 상태 기본 탭 검증

- [#9] 프리매치 탭이 기본 선택 — "최근 5경기 폼" 콘텐츠 표시, "vs" 텍스트 존재

## 총 Playwright MCP 호출

navigate 3회 + snapshot 4회 + click 2회 = **총 9회**

## 완료 후 작업

- ROADMAP.md의 Task 005 검증 항목을 ✅/⏭️로 업데이트
- Task 005 상태를 "완료"로 변경
