# pitch-ac 다음 단계 분석

## Context

Phase 1~4(Task 001~023) 전부 완료. 코드베이스는 프로덕션 배포 준비가 된 상태.
현재 "앞으로 진행해야 할 일"을 3가지 영역으로 분류.

---

## 1. 실제 Vercel 배포 (즉시, 코드 불필요)

ROADMAP Task 023이 "코드 준비"였다면, 이 단계는 실제 Vercel 대시보드에서 수행하는 작업.

**체크리스트:**
- [ ] Vercel 프로젝트 연결 (`vercel link` 또는 GitHub import)
- [ ] 환경변수 4개 설정 (`.env.example` 참고):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SPORTMONKS_API_KEY`
  - `CRON_SECRET` (`openssl rand -base64 32`로 생성)
- [ ] Cron Jobs 활성화 확인 (`vercel.json` 5개 잡)
- [ ] `/api/health` 접속 → `{"ok":true}` 확인
- [ ] 도메인 연결 (보유 시)
- [ ] 첫 수동 Cron 트리거 → 실제 데이터 동기화

---

## 2. Task 023 범위 외 항목 (단기, 코드 필요)

Task 023 구현 시 의도적으로 제외한 항목들.

### 2-A. Sentry 에러 모니터링
- `@sentry/nextjs` 설치
- `sentry.client.config.ts`, `sentry.server.config.ts` 설정
- `app/error.tsx`의 `console.error` → Sentry 캡처로 교체
- Sentry DSN 환경변수 추가
- **가치**: 프로덕션 에러를 실시간으로 파악 가능

### 2-B. CSP (Content Security Policy) 헤더
- `next.config.ts` headers()에 CSP 추가
- 허용 도메인: `cdn.sportmonks.com`, `fonts.googleapis.com`, Supabase URL
- **복잡도**: 허용 도메인 열거 및 검증 필요 (테스트 필수)

---

## 3. Phase 5: 신규 기능 후보 (중기)

현재 플랫폼의 핵심 기능(F001~F014)은 모두 구현됨. 사용자 피드백 전 추가할 수 있는 기능.

### 3-A. 인증 강화 (낮은 복잡도)
- `lib/supabase/proxy.ts`의 `protectedPaths: []` → 실제 보호 경로 추가
- 예: `/compare` 공유 기능은 로그인 필요
- 현재 미들웨어 코드는 이미 준비됨, 경로 목록만 추가하면 됨

### 3-B. React.cache() 메모이제이션 (중간 복잡도)
- `generateMetadata`와 페이지 컴포넌트 간 중복 DB 쿼리 제거
- `getPlayerById`, `getFixtureById` 등 repository 함수를 `React.cache()`로 래핑
- **가치**: 동일 요청 내 중복 쿼리 제거 → 응답 속도 개선

### 3-C. 트렌딩 선수 / 주간 하이라이트 (높은 복잡도)
- 최근 경기 기준 가장 좋은 성적을 낸 선수 자동 집계
- 매치데이 대시보드에 "이번 주 주목 선수" 섹션 추가
- 의존: `player_match_stats` 데이터 충분히 쌓인 후 유효

### 3-D. 선수 검색 성능 개선 (중간 복잡도)
- 현재: `getAllPlayers()` 전체 로드 후 클라이언트 필터링 (N명 선수 전체 전송)
- 개선: `/api/players/search?q=` 서버사이드 검색 엔드포인트 + debounce
- **가치**: 선수 수 증가 시 번들 크기/응답 시간 문제 예방

---

## 추천 순서

```
1. Vercel 배포 (즉시, 코드 없음)
2. 배포 후 /api/health 검증 + 첫 Cron 수동 실행
3. Sentry 연동 (에러 가시성 확보 후 다른 작업 진행 권장)
4. protectedPaths 설정 (간단, 빠른 보안 개선)
5. React.cache() 메모이제이션 (성능 개선)
6. 나머지 Phase 5 기능 (사용자 피드백 기반 우선순위 결정)
```
