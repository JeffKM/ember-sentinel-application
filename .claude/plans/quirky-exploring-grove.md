# pitch-ac 전체 코드 리뷰 + Playwright MCP 테스트 + 향후 로드맵

## Context

pitch-ac는 PL(프리미어리그) 데이터 플랫폼으로, Phase 1~4 (Task 001~023) 전체 완료 후 Vercel에 프로덕션 배포된 상태입니다 (pitch-ac.vercel.app). 배포 후 첫 전체 코드 리뷰와 사용자 플로우 테스트를 수행하여 코드 품질, 안정성, UX를 검증하고 향후 개발 방향을 수립합니다.

---

## Step 1: 전체 코드 리뷰 수행

`/code-reviewer` 스킬을 사용하여 다음 영역별로 전체 코드를 리뷰합니다.

### 1-1. 아키텍처 & 코드 품질
- Route Groups 구조 (`(app)`, `(auth)`) 적절성
- 레이어드 아키텍처 일관성 (SportMonks API → Service → Repository → Page)
- Server Component vs Client Component 경계 명확성
- TypeScript 타입 안정성 (타입 단언 남용 여부)
- 에러 핸들링 패턴 일관성
- 코드 중복 식별 (경기 상세 데이터 로딩 등)

### 1-2. 보안
- API 키 노출 방지 (`server-only` 사용 확인)
- CSP 헤더 부재 확인
- Debug API 프로덕션 접근 차단 확인
- Cron 인증 (CRON_SECRET) 적절성
- 보안 헤더 (X-Frame-Options, X-Content-Type-Options 등)

### 1-3. 성능
- 번들 최적화 (dynamic import, tree shaking)
- N+1 쿼리 방지 확인
- 캐싱 전략 (HTTP Cache-Control, TanStack Query, 인메모리 캐시)
- 이미지 최적화 (next/image)
- Suspense 경계 적절성

### 1-4. SEO / 접근성
- generateMetadata 설정 완성도
- robots.ts, sitemap.ts 확인
- aria 속성, 시맨틱 HTML, 키보드 탐색

### 주요 검토 파일
- `app/(app)/compare/page.tsx` — title 중복 버그 의심
- `app/api/matchday/fixture/route.ts` — 데이터 로딩 중복
- `app/(app)/matchday/[fixtureId]/page.tsx` — 동일 로직 중복
- `next.config.ts` — CSP 헤더 부재
- `lib/repositories/mappers.ts` — 타입 단언 검토
- `lib/api/sportmonks/constants.ts` — 시즌 상수 일관성

---

## Step 2: Playwright MCP 프로덕션 사이트 테스트

프로덕션 배포 사이트(https://pitch-ac.vercel.app)에서 Playwright MCP 도구로 10개 핵심 사용자 플로우를 직접 테스트합니다.

### 테스트 시나리오

| # | 시나리오 | 검증 항목 |
|---|---------|---------|
| 1 | **메인 → 매치데이 리디렉션** | `/` 접속 → `/matchday` 자동 이동, GW 경기 목록 렌더링 |
| 2 | **GW 네비게이션** | 이전/다음 버튼 클릭 → GW 변경, 경기 목록 갱신 |
| 3 | **경기 상세 진입** | 경기 카드 클릭 → 상세 페이지, 탭 자동 선택 (FT→포스트매치) |
| 4 | **프리매치 탭** | H2H 데이터, 순위 시뮬레이터, 부상자 표시 |
| 5 | **선수 검색** | 검색 입력 → 자동완성 → 카드 클릭 → 프로필 이동 |
| 6 | **선수 프로필** | 스탯 카드 + 맥락 (순위/백분위) + 레이더 차트 + 비교 버튼 |
| 7 | **선수 비교** | 2명 선택 → 스탯 테이블 + 레이더 오버레이 + 공유 버튼 |
| 8 | **테마 토글** | Light/Dark 전환 정상 동작 |
| 9 | **모바일 반응형** | 375x812 뷰포트에서 하단 탭 바, 데스크탑 헤더 숨김 |
| 10 | **404 에러** | 존재하지 않는 경기/선수 → 404 페이지 표시 |

### 공통 검증
- 각 페이지 콘솔 에러 0건 확인
- 페이지 로드 후 실데이터 렌더링 확인
- 스크린샷 캡처 (증거용)

---

## Step 3: 발견된 이슈 수정

코드 리뷰 + 테스트에서 발견된 이슈 중 즉시 수정 가능한 항목 처리:

- **비교 페이지 title 중복 버그** (`compare/page.tsx`의 generateMetadata)
- 기타 경미한 버그 (발견 시)

---

## Step 4: 향후 Phase 5 로드맵 제안

### Phase 5-A: 안정성 및 품질 (우선순위: 높음)
| Task | 설명 |
|------|------|
| 024 | 비교 페이지 title 중복 수정 |
| 025 | E2E 테스트 자동화 (Playwright 코드 작성) |
| 026 | 단위 테스트 (Vitest — 매퍼, 유틸, 서비스) |
| 027 | 에러 모니터링 연동 (Sentry) |
| 028 | CSP 헤더 추가 |
| 029 | 경기 상세 데이터 로딩 중복 제거 |

### Phase 5-B: 사용자 경험 향상 (우선순위: 중)
| Task | 설명 |
|------|------|
| 030 | 즐겨찾기 팀/선수 (로그인 사용자) |
| 031 | 리그 순위표 전체 뷰 페이지 |
| 032 | 서버 사이드 선수 검색 + 무한 스크롤 |
| 033 | 선수 비교 히스토리 (최근 비교 목록) |

### Phase 5-C: 분석 기능 확장 (우선순위: 중)
| Task | 설명 |
|------|------|
| 034 | API 플랜 업그레이드 (xG/xA 활성화, 4/4 만료 대비) |
| 035 | 폼 분석 대시보드 (최근 N경기 추이 차트) |
| 036 | 포지션별 선수 비교 (같은 포지션 내 순위) |

### Phase 5-D: 플랫폼 확장 (장기)
| Task | 설명 |
|------|------|
| 037 | PWA (오프라인 캐시, 푸시 알림) |
| 038 | i18n (영어 지원) |
| 039 | 소셜 기능 (댓글, 예측 투표) |
| 040 | 관리자 대시보드 (sync 모니터링) |

---

## 검증 방법

- 코드 리뷰: 주요 파일 직접 읽기 + 패턴 분석
- Playwright MCP: 프로덕션 사이트 직접 브라우저 조작 + 스크린샷
- 이슈 수정: `npm run validate` (type-check + lint + format) 통과 확인
- 로드맵: ROADMAP.md 또는 별도 문서로 정리
