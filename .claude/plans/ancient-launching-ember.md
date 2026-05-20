# 선수 카드 스탯 제거 + 전체 앱 한국어→영어 전환

## Context

현재 선수 카드에 포지션별 스탯 뱃지(골/어시스트/평점)가 표시되어 카드 높이가 불일치함.
또한 앱 전체에 한국어가 하드코딩되어 있어, 추후 i18n 도입 전까지 영어로 통일하려 함.

---

## Task 1: 선수 카드 스탯 뱃지 제거

**수정 파일**: `app/(app)/squad/_components/player-card.tsx`

- `getPrimaryStat()` 함수 전체 삭제 (라인 20-46)
- Badge import 삭제
- Badge 렌더링 JSX 삭제 (라인 87-95)
- 결과: 모든 카드가 사진 + 이름 + 팀·포지션만 표시, 일관된 높이

---

## Task 2: 한국어 → 영어 전환 (코드 주석 제외, UI 텍스트만)

### 2-1. 네비게이션 메뉴
**파일**: `components/nav/nav-config.ts`
| 한국어 | 영어 |
|--------|------|
| 매치데이 | Matchday |
| 스쿼드 | Squad |
| 비교 | Compare |
| 갤러리 | Gallery |

### 2-2. 메타데이터 / SEO
**파일**: `app/layout.tsx`
- title: "pitch-ac | Man City Fan Site"
- description: "A cartoon fan site where Manchester City players come alive"
- keywords: 영어로 교체

**파일**: `app/(app)/squad/page.tsx` — metadata
**파일**: `app/(app)/matchday/page.tsx` — metadata
**파일**: `app/(app)/compare/page.tsx` — metadata
**파일**: `app/(app)/gallery/page.tsx` — metadata

### 2-3. 스쿼드 페이지
**파일**: `app/(app)/squad/page.tsx`
| 한국어 | 영어 |
|--------|------|
| 스쿼드 | Squad |
| 맨체스터 시티 {n}명의 선수 | Manchester City — {n} Players |

### 2-4. 선수 카드
**파일**: `app/(app)/squad/_components/player-card.tsx`
- "골", "어시스트", "평점", "리그 N위" → Task 1에서 뱃지 자체 삭제하므로 자동 해결

### 2-5. 검색
**파일**: `components/player-search-combobox.tsx`
| 한국어 | 영어 |
|--------|------|
| 선수 이름, 팀, 포지션으로 검색... | Search by name, team, or position... |
| 결과 없음 | No results |
| 최근 검색어 | Recent searches |
| 선수 | Players |

**파일**: `app/(app)/squad/_components/player-search-empty.tsx`
| 한국어 | 영어 |
|--------|------|
| "{query}"에 해당하는 선수를 찾을 수 없습니다 | No players found for "{query}" |

### 2-6. 선수 프로필 상세
**파일**: `app/(app)/squad/[playerId]/_components/player-header-card.tsx`
| 한국어 | 영어 |
|--------|------|
| 평균 평점 | Avg. Rating |
| 리그 {rank}위 · 상위 {pct}% | League #{rank} · Top {pct}% |

**파일**: `app/(app)/squad/[playerId]/_components/stat-context-grid.tsx`
| 한국어 | 영어 |
|--------|------|
| 골 | Goals |
| 어시스트 | Assists |
| 키패스 | Key Passes |
| 드리블 | Dribbles |
| 평균 평점 | Avg. Rating |
| 시즌 스탯 ({season}) | Season Stats ({season}) |

**파일**: `app/(app)/squad/[playerId]/_components/stat-context-card.tsx`
| 한국어 | 영어 |
|--------|------|
| 리그 {rank}위 | League #{rank} |

### 2-7. 매치데이
**파일**: `app/(app)/matchday/_components/fixture-card.tsx`
| 한국어 | 영어 |
|--------|------|
| {n}위 | #{n} |
| 점유율 | Possession |

**파일**: `app/(app)/matchday/_components/empty-gameweek.tsx`
| 한국어 | 영어 |
|--------|------|
| 이 게임위크에 경기 데이터가 없습니다 | No match data for this gameweek |

**파일**: `app/(app)/matchday/_components/gameweek-header.tsx`
| 한국어 | 영어 |
|--------|------|
| 이전 게임위크 | Previous gameweek |
| 다음 게임위크 | Next gameweek |

**파일**: `app/(app)/matchday/_components/goal-notification.tsx`
| 한국어 | 영어 |
|--------|------|
| ⚽ {team} 골! | ⚽ {team} Goal! |

### 2-8. 경기 상세 탭
**파일**: `app/(app)/matchday/[fixtureId]/_components/fixture-tabs.tsx`
| 한국어 | 영어 |
|--------|------|
| 프리매치 | Pre-match |
| 라이브 | Live |
| 포스트매치 | Post-match |

**파일**: `app/(app)/matchday/[fixtureId]/_components/live-tab.tsx`
| 한국어 | 영어 |
|--------|------|
| 경기 시작 전입니다. | Match hasn't started yet. |
| 실시간 스탯이 아직 제공되지 않습니다. | Live stats not yet available. |

**파일**: `app/(app)/matchday/[fixtureId]/_components/postmatch-tab.tsx`
| 한국어 | 영어 |
|--------|------|
| 경기가 아직 종료되지 않았습니다. | Match hasn't ended yet. |
| 경기 스탯 데이터가 없습니다. | No match stats available. |

### 2-9. H2H / 부상 / 폼 / 라인업 / 시뮬레이터
**파일**: `app/(app)/matchday/[fixtureId]/_components/h2h-results.tsx`
| 한국어 | 영어 |
|--------|------|
| H2H 전적 | H2H Records |
| H2H 데이터가 없습니다. | No H2H data available. |
| {n}승 | {n}W |
| {n}무 | {n}D |
| {n}패 | {n}L |

**파일**: `app/(app)/matchday/[fixtureId]/_components/injury-list.tsx`
| 한국어 | 영어 |
|--------|------|
| 부상자 없음 | No injuries |
| 부상/결장 | Injuries |

**파일**: `app/(app)/matchday/[fixtureId]/_components/team-form-row.tsx`
| 한국어 | 영어 |
|--------|------|
| 최근 5경기 폼 | Last 5 Matches |
| 데이터 없음 | No data |

**파일**: `app/(app)/matchday/[fixtureId]/_components/event-timeline.tsx`
| 한국어 | 영어 |
|--------|------|
| 이벤트 | Events |
| 이벤트가 없습니다. | No events. |

**파일**: `app/(app)/matchday/[fixtureId]/_components/lineup-display.tsx`
| 한국어 | 영어 |
|--------|------|
| 교체 선수 | Substitutes |
| 라인업 | Lineups |

**파일**: `app/(app)/matchday/[fixtureId]/_components/stat-bar.tsx`
| 한국어 | 영어 |
|--------|------|
| 팀 스탯 비교 | Team Stats |
| 점유율 | Possession |
| 슈팅 | Shots |
| 유효 슈팅 | Shots on Target |
| 코너킥 | Corners |
| 파울 | Fouls |

**파일**: `app/(app)/matchday/[fixtureId]/_components/standing-simulator.tsx`
| 한국어 | 영어 |
|--------|------|
| 홈팀 승 | Home Win |
| 무승부 | Draw |
| 원정팀 승 | Away Win |
| 순위 시뮬레이터 | Standing Simulator |
| 현재 | Current |
| 현재 {n}위 | Currently #{n} |
| 시나리오를 선택하면 예상 포인트를 확인할 수 있습니다. | Select a scenario to see projected points. |

### 2-10. 선수 비교
**파일**: `app/(app)/compare/page.tsx`
| 한국어 | 영어 |
|--------|------|
| 선수 비교 | Compare |
| 프리미어리그 선수 스탯을 비교해보세요 | Compare Premier League player stats |

**파일**: `app/(app)/compare/_components/compare-stat-table.tsx`
| 한국어 | 영어 |
|--------|------|
| 골, 어시스트, 키패스, 드리블, 평균 평점 | Goals, Assists, Key Passes, Dribbles, Avg. Rating |
| 리그 {rank}위 | League #{rank} |
| 스탯 비교 ({season}) | Stats Comparison ({season}) |

**파일**: `app/(app)/compare/_components/compare-verdict.tsx`
| 한국어 | 영어 |
|--------|------|
| 판정: 무승부 | Verdict: Draw |
| 판정: | Verdict: |
| 이(가) {n}개 항목에서 우위 | leads in {n} stats |

### 2-11. 에러 페이지
**파일**: `app/error.tsx`
| 한국어 | 영어 |
|--------|------|
| 오류 발생 | Error |
| 예상치 못한 오류가 발생했습니다 | An unexpected error occurred |
| 다시 시도 | Try Again |

**파일**: `app/not-found.tsx`
| 한국어 | 영어 |
|--------|------|
| 페이지를 찾을 수 없습니다 | Page Not Found |
| 요청한 페이지가 존재하지 않거나 이동되었습니다. | The requested page doesn't exist or has been moved. |
| 매치데이로 돌아가기 | Back to Matchday |

**파일**: `app/(app)/matchday/[fixtureId]/not-found.tsx`
| 한국어 | 영어 |
|--------|------|
| 경기를 찾을 수 없습니다 | Match Not Found |
| 요청한 경기 정보가 존재하지 않거나 아직 준비 중입니다. | The requested match doesn't exist or isn't available yet. |
| 매치데이로 돌아가기 | Back to Matchday |

### 2-12. 갤러리 페이지
**파일**: `app/(app)/gallery/page.tsx`
| 한국어 | 영어 |
|--------|------|
| 경기 하이라이트 카툰 카드 — 곧 공개됩니다 | Match highlight cartoon cards — Coming soon |
| 카툰 갤러리 준비 중 | Cartoon Gallery Coming Soon |
| 매치데이 카툰 카드, MVP 카드... | Matchday cartoon cards, MVP cards... coming soon. |

### 2-13. 더보기/설정
**파일**: `app/(app)/more/page.tsx`
| 한국어 | 영어 |
|--------|------|
| 설정 | Settings |
| 테마 | Theme |
| 계정 | Account |

---

## 수정하지 않는 항목
- **코드 주석**: 한국어 주석은 유지 (개발자용, UI에 노출 안 됨)
- **CLAUDE.md / ROADMAP.md**: 개발 문서는 한국어 유지

---

## 검증 방법
1. `npm run dev`로 개발 서버 실행
2. Playwright로 주요 페이지 스크린샷 확인:
   - `/matchday` — 네비, 탭, 카드 텍스트 영어 확인
   - `/squad` — 타이틀, 검색, 카드 높이 일관성 확인
   - `/compare` — 비교 텍스트 영어 확인
3. `npm run validate` — 타입 체크 + lint 통과 확인
