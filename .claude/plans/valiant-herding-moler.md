# PL Data Platform MVP Product Plan

## Context

PL(Premier League) fan들은 선수/경기 데이터를 확인하기 위해 평균 3~5개 사이트를 방문해야 한다. FBref, WhoScored, Transfermarkt, SofaScore 등 데이터가 파편화되어 있고, 고급 지표(xG, xA)는 맥락 없이 숫자만 나열되어 해석하기 어렵다. 1인 개발자가 4~8주 내에 25/26 시즌 중 출시할 수 있는 글로벌(영어) 광고 기반 무료 플랫폼 MVP를 기획한다.

**핵심 제약**: 1인 개발 | 4~8주 | 라이브 데이터 필수 | 영어 UI | 광고 기반 무료

---

## 1. Product Vision & Positioning

**한 줄 설명**: "Every stat tells a story." -- PL 선수/경기 데이터를 맥락과 시각적 재미로 해석해주는 데이터 플랫폼

**핵심 가치 제안**:
| 가치 | 설명 |
|------|------|
| 원스톱 데이터 | 3~5개 사이트를 돌아다닐 필요 없이 한 곳에서 모든 핵심 데이터 |
| 맥락 해석 | 모든 숫자에 리그 순위, 백분위, 전년 비교 중 최소 1개 맥락 |
| 시각적 재미 | 스프레드시트가 아닌 카드/차트/그래프 기반 현대적 UI |
| 공유 가능성 | 배틀카드/프로필 카드를 이미지로 생성하여 SNS 바이럴 |

**차별화 포지셔닝**: "FBref의 데이터 깊이를 FotMob의 직관적 UX로, 거기에 맥락 해석을 더한 서비스"

```
          Deep Analysis
               ^
    FBref *    |      * pitch-ac (target)
               |
 ─────────────+────────────────> Visual/Intuitive UI
               |
 Transfermarkt*|    * FotMob
               |    * SofaScore
          Simple Data
```

### Target User Personas

**Alex (24, US)** -- Casual Fan

- 매주 1~2경기 시청, "Saka has 15 goals... Is that good?"
- Needs: 빠른 프리뷰, 스탯 의미 파악, 친구와 공유할 콘텐츠
- 모바일 위주, 경기 전후 5~10분 사용

**Priya (29, India)** -- Data-savvy Fan

- 매 라운드 모든 경기 체크, 커뮤니티 논쟁 활발 참여
- Needs: 선수 비교 근거, 라이브 스탯 추적, 포스트매치 분석
- 데스크탑+모바일 혼용, 경기 중 세컨드 스크린

**Tom (21, UK)** -- Newbie Fan

- 올해부터 PL에 빠짐, FPL 시작, 데이터 용어 어려움
- Needs: 쉬운 용어 설명, 선수 강약점 한눈에, FPL 참고
- 모바일 100%, 짧은 세션, 검색 유입

---

## 2. Core Features (MVP Scope)

### P0 -- Must Have (4~6주, 총 28일)

| #    | Feature                                | Days | Description                                         |
| ---- | -------------------------------------- | ---- | --------------------------------------------------- |
| P0-1 | Matchday Dashboard - Round View + Live | 5    | 게임위크별 경기 목록, 라이브 스코어, 상태별 카드    |
| P0-2 | Match Detail - Pre/Live/Post           | 7    | 폼, H2H, 부상자, 라이브 스탯 바, 이벤트 타임라인    |
| P0-3 | Player Profile                         | 6    | 헤더 카드, 컨텍스트 스탯, 레이더 차트, 최근 폼      |
| P0-4 | Player Comparison Battle Card          | 5    | 2명 비교, 레이더 오버레이, 지표별 승자, 이미지 공유 |
| P0-5 | Player Search                          | 2    | Fuzzy search, 자동완성                              |
| P0-6 | Glossary Popovers                      | 1    | xG, xA 등 15~20개 용어 설명 팝오버                  |
| P0-7 | Global Layout + Nav                    | 2    | 데스크탑 헤더 + 모바일 하단 탭                      |

### P0-1. Matchday Dashboard

```
GAMEWEEK 28                           [< GW27  GW29 >]
Sat 15 Mar - Mon 17 Mar 2026

-- Saturday 15 Mar ──────────────────────────────────

  Arsenal  2 - 1  Man City  FT
  Saka 23', Havertz 67' | Haaland 45'
  xG: 1.8 vs 1.2  Poss: 54% vs 46%

  Liverpool  * LIVE 62'  Chelsea
  1 - 0  |  Salah 34'
  [View Live Stats ->]

  Spurs  vs  Everton  17:30 KO
  Form: WWDLW vs LLDWL
  [Pre-match Preview ->]
```

- API: `GET /fixtures?league=39&season=2025&round=...` + `GET /fixtures?live=all`
- Polling: 라이브 경기 시 60초, 비경기 시 5분

### P0-2. Match Detail

**Pre-match**: 양팀 폼(최근 5), H2H(최근 5), 부상/결장, 순위 시뮬레이션(이기면 O위)
**Live**: 라이브 스탯 바(점유율, 슈팅, xG), 이벤트 타임라인(골+xG, 교체, 카드), 라인업
**Post-match**: 최종 스탯 비교, 이벤트 요약

### P0-3. Player Profile

```
[Photo]  Bukayo Saka
         Arsenal | #7 | RW | England
         "Top 3 winger in PL. Goals up 40% from last year."

  Goals          15
  ████████████████████░░ 3rd in PL | Top 2% | Last season: 11 (+4)

  xG             12.8
  Outperforming xG by +2.2 (clinical)  [? What is xG?]

  Assists        8
  ████████████████░░░░░ 7th in PL | Top 5% | Last season: 6 (+2)

  [Radar Chart: Saka vs Position Average]
  Strengths: Dribbling, Shooting | Weakness: Physicality

  [Recent Form Sparkline - Last 10 matches]
  Trend: Rising (last 5 avg: 7.9)
```

### P0-4. Player Comparison

```
  Bukayo Saka  vs  Son Heung-min

  [Radar Chart Overlay]

                  Saka        Son
  Goals           15 trophy     11
  xG             12.8 trophy    9.2
  Assists          8 trophy      7
  Key Passes      2.4          2.8 trophy
  Dribbles/90     3.2 trophy   1.8
  Avg Rating      7.6 trophy   7.2

  Verdict: Saka leads in 5/6 categories
  [Share as Image]  [Copy Link]
```

### P1 -- Fast Follow (MVP 이후 2~4주)

| Feature                                          | Days |
| ------------------------------------------------ | ---- |
| 선수 폼 트렌드 차트 (Recharts 라인 차트)         | 2    |
| 포스트매치 상세 리뷰 (MOM, 핵심 순간, 순위 변동) | 3    |
| SNS 공유 OG 이미지 최적화                        | 3    |
| 선수 비교 3명 확장                               | 2    |
| 팀 프로필 페이지                                 | 4    |
| 포지션 내 랭킹                                   | 2    |

### P2 -- Future

- xG 흐름 차트 (시간대별 누적 xG)
- 시즌 스토리라인 (득점왕 레이스, 강등 경쟁)
- 알림 기능 (관심 선수/팀)
- 커뮤니티 (인기 비교 랭킹)
- AI 경기 예측

---

## 3. Information Architecture

### Sitemap & URL Structure

```
pitch-ac/
  /                          -> /matchday redirect
  /matchday                  -> 현재 게임위크
  /matchday/[gameweek]       -> 특정 게임위크 (예: /matchday/28)
  /matchday/[gw]/[fixtureId] -> 개별 경기 상세
  /players                   -> 선수 검색/리스트
  /players/[playerId]        -> 선수 프로필
  /compare?p1={id1}&p2={id2} -> 선수 비교
  /about                     -> 서비스 소개
  /privacy                   -> 개인정보 처리방침
```

### Navigation

- **Desktop**: 상단 고정 헤더 -- Logo | Matchday | Players | Compare | [Theme Toggle]
- **Mobile**: 하단 탭 바 (4탭) -- Matchday | Players | Compare | More

---

## 4. UX Design Principles

### Principle 1: "Every number needs a neighbor"

모든 숫자에 리그 순위 / 백분위 / 전년 비교 중 최소 1개를 함께 표시.
`<ContextStat>` 재사용 컴포넌트로 통일.

### Principle 2: "3-second insight"

색상 코드(초록/노랑/빨강), Progressive Disclosure(요약->상세->원본)

### Principle 3: "Share-worthy design"

비교 카드/프로필 카드 OG 이미지 생성, 워터마크 브랜딩

### Principle 4: "Jargon-friendly"

xG, xA 등 전문 용어에 `[?]` 팝오버 (1줄 정의 + 비유 + 예시)

### Visual Direction

- **다크 모드 우선** (스포츠 = 야간 시청 환경)
- OKLCH 색상 (이미 구축), 카드 기반 레이아웃
- **모바일 퍼스트** 반응형 (핵심 유저가 모바일)

---

## 5. Data Architecture

### Data Sourcing Strategy

| Role    | API                      | Cost            | Data                                                   |
| ------- | ------------------------ | --------------- | ------------------------------------------------------ |
| Main    | **API-Football** (Ultra) | $29/mo          | 라이브 스코어, 일정, H2H, 선수 기본 스탯, 라인업, 부상 |
| xG      | **FPL API**              | Free            | 선수별 xG, xA, xGI, ICT Index                          |
| xG Deep | **Understat**            | Free (scraping) | 팀별 xG 트렌드 (Supabase 캐싱)                         |

**API-Football 일일 요청량**: 경기일 ~2,000~3,000 / 비경기일 ~100 (제한 7,500/day -- 충분)

### Supabase Schema (Core Tables)

```sql
-- teams: 20개 PL 팀 (시즌 시작 1회 동기화)
-- players: ~550명 선수 (주 1회 동기화)
-- player_id_mapping: API-Football <-> FPL ID 매핑
-- player_season_stats: 시즌 스탯 + 맥락 데이터(rank, percentile, prev_season)
-- player_match_stats: 경기별 스탯
-- fixtures: 경기 정보 + 라이브 스탯/이벤트 (JSONB)
-- glossary: 용어 사전
```

상세 스키마 DDL은 구현 시 마이그레이션 파일로 작성.

### Caching Strategy

| Data             | TTL    | Refresh               |
| ---------------- | ------ | --------------------- |
| 팀/선수 기본정보 | 7일    | 주간 배치             |
| 시즌 스탯 + 맥락 | 24시간 | 일간 배치 (05:00 UTC) |
| 경기 일정        | 1시간  | 경기일 단축           |
| 라이브 경기      | 60초   | 폴링 갱신             |
| FPL xG/xA        | 24시간 | 일간 배치             |

### Player ID Mapping Strategy

1. 초기: 이름(악센트 제거, 소문자) + 팀명 기반 자동 매칭 스크립트
2. 수동 검증: 자동 매핑 실패 ~20~30명
3. 유지: 이적 시즌 주간 재검증

---

## 6. Technical Design

### Next.js App Router Structure

```
app/
├── layout.tsx                       # Root (ThemeProvider, QueryProvider, 폰트)
├── globals.css
├── (app)/                           # Main app route group
│   ├── layout.tsx                   # App layout (Nav, Footer)
│   ├── page.tsx                     # / -> /matchday redirect
│   ├── matchday/
│   │   ├── page.tsx                 # 현재 GW (Server Component)
│   │   └── [gameweek]/
│   │       ├── page.tsx             # 특정 GW
│   │       └── [fixtureId]/
│   │           └── page.tsx         # 경기 상세
│   ├── players/
│   │   ├── page.tsx                 # 선수 검색
│   │   └── [playerId]/page.tsx      # 선수 프로필
│   └── compare/page.tsx             # 선수 비교
├── (auth)/auth/                     # Auth (이미 구축)
├── (marketing)/                     # About, Privacy
├── api/
│   ├── fixtures/live/route.ts       # 라이브 데이터 프록시
│   ├── fixtures/[fixtureId]/
│   │   ├── stats/route.ts
│   │   └── events/route.ts
│   ├── players/search/route.ts
│   ├── players/[playerId]/route.ts
│   ├── compare/route.ts
│   ├── og/                          # OG 이미지 생성 (@vercel/og)
│   └── cron/                        # 배치 동기화 (Vercel Cron)
│       ├── sync-daily/route.ts
│       └── sync-weekly/route.ts
└── not-found.tsx
```

### Server vs Client Components

| Component          | Type   | Reason                         |
| ------------------ | ------ | ------------------------------ |
| 매치데이 경기 목록 | Server | 초기 HTML, SEO                 |
| 라이브 스코어 폴링 | Client | TanStack Query refetchInterval |
| 프리매치 프리뷰    | Server | 정적 데이터                    |
| 라이브 스탯 바     | Client | 60초 폴링                      |
| 선수 프로필 전체   | Server | SEO critical                   |
| 레이더 차트        | Client | Recharts 인터랙션              |
| 팝오버/Tooltip     | Client | 사용자 인터랙션                |
| 선수 검색          | Client | 입력 이벤트                    |

### Realtime: Polling (NOT WebSocket)

```
Client (TanStack Query, 60s) -> GET /api/fixtures/live
  -> API Route: Supabase 캐시 조회 (60초 이내? 반환 : API-Football 호출 -> 갱신 -> 반환)
```

### State Management

| Layer        | Tool              | Use                     |
| ------------ | ----------------- | ----------------------- |
| Server state | TanStack Query v5 | API 데이터, 캐싱, 폴링  |
| Client state | Zustand v5        | 비교 선수 목록, UI 상태 |
| URL state    | useSearchParams   | 비교 선수 ID, 게임위크  |

---

## 7. Revenue Model

### Ad Strategy (Google AdSense)

| Location             | Format                 | When       |
| -------------------- | ---------------------- | ---------- |
| 매치데이 리스트 하단 | Banner 728x90 / 320x50 | MVP 출시   |
| 선수 프로필 중간     | Native ad              | MAU 1,000+ |
| 비교 결과 하단       | Banner                 | MAU 1,000+ |

**월 수익 예측** (보수적):

- MAU 10K x RPM $3~5 = $30~50
- MAU 50K x RPM $5~8 = $250~400
- MAU 100K x RPM $8~12 = $800~1,200

### Future Premium ($4.99/mo, MAU 50K+ 이후 검토)

Free: 매치데이, 기본 프로필, 2명 비교, 60초 라이브
Premium: 광고 제거, 3명 비교, 30초 라이브, CSV 내보내기

---

## 8. Growth Strategy

### User Acquisition

1. **Reddit**: r/PremierLeague (2.5M), r/FantasyPL (700K), r/soccer (4.5M)
   - 매주 데이터 카드 포스트, "I built a tool that..." 론칭
2. **Twitter/X**: 매치데이 데이터 카드, #PLStats, FPL 인플루언서
3. **Product Hunt**: Sports 카테고리 론칭

### SEO Strategy

| Keyword Pattern               | Page           |
| ----------------------------- | -------------- |
| `{player} stats`              | Player Profile |
| `{player} vs {player}`        | Compare        |
| `{team} vs {team} preview`    | Pre-match      |
| `premier league gameweek {n}` | Matchday       |
| `xg meaning football`         | Glossary       |

- Server Components -> HTML 직접 렌더링 (크롤러 친화)
- 동적 `generateMetadata()`, JSON-LD (SportsEvent, Person)
- sitemap.xml 자동 생성

### Viral Elements

- 비교 배틀카드 이미지 공유 + "Compare on pitch-ac" 워터마크
- URL에 상태 인코딩 (`/compare?p1=276&p2=184`)
- OG 이미지 동적 생성

---

## 9. Success Metrics

### MVP Validation (론칭 후 4주)

| Metric                    | Target     |
| ------------------------- | ---------- |
| WAU (Weekly Active Users) | 500+       |
| 선수 프로필 체류 시간     | > 90s      |
| 비교 카드 생성 수         | > 200/week |
| 비교 공유 전환율          | > 10%      |
| 매치데이 재방문율         | > 30%      |
| Bounce Rate               | < 60%      |

### Long-term

| Metric        | 3 months | 6 months |
| ------------- | -------- | -------- |
| MAU           | 5,000    | 30,000   |
| SEO 유입 비율 | 30%      | 50%      |
| 월 광고 수익  | $0       | $100+    |

---

## 10. Development Roadmap

### Sprint 1 (Week 1~2): Infrastructure & Data Pipeline

- [ ] Supabase 테이블 스키마 마이그레이션
- [ ] API-Football 클라이언트 모듈 (`lib/api-football/client.ts`)
- [ ] FPL API 클라이언트 모듈 (`lib/fpl/client.ts`)
- [ ] 선수 ID 매핑 스크립트 & 검증
- [ ] Vercel Cron 일간/주간 동기화 Job
- [ ] Route Group 구조 + 글로벌 레이아웃 + 네비게이션

**Checkpoint**: Supabase에 20팀, ~550명 선수, 현재 시즌 스탯 적재

### Sprint 2 (Week 3~4): Matchday Dashboard (Core MVP)

- [ ] 매치데이 라운드 뷰 (게임위크별 경기 목록)
- [ ] 라이브 스코어 폴링 (TanStack Query, 60초)
- [ ] 경기 상세: 프리매치 (폼, H2H, 부상자, 순위 시뮬)
- [ ] 경기 상세: 라이브 (스탯 바, 이벤트 타임라인, 라인업)
- [ ] 경기 상세: 포스트매치 (최종 스탯)

**Checkpoint**: 실제 경기일에 라이브 데이터 60초 갱신 확인

### Sprint 3 (Week 5~6): Player Profile & Search

- [ ] 선수 검색 (Supabase full-text search)
- [ ] 선수 프로필: 헤더 카드 + 컨텍스트 스탯 카드
- [ ] 선수 프로필: 레이더 차트 (포지션 평균 오버레이)
- [ ] 선수 프로필: 최근 폼 스파크라인
- [ ] 지표 설명 팝오버 시스템

**Checkpoint**: 아무 PL 선수 검색 -> 모든 수치에 맥락 표시

### Sprint 4 (Week 7~8): Comparison & Launch

- [ ] 선수 비교 (2명) + 레이더 오버레이 + 스탯 테이블
- [ ] 비교 카드 이미지 생성 (@vercel/og)
- [ ] SEO: generateMetadata, sitemap.xml, JSON-LD
- [ ] Google Analytics + Vercel Analytics
- [ ] Production deploy (Vercel)
- [ ] Reddit / Product Hunt launch

**Checkpoint**: 프로덕션 URL 접근 가능, 비교 카드 이미지 공유 가능

### Sprint 5+ (Post-launch): Feedback & P1

- 사용자 피드백 수집 & 반영
- Core Web Vitals 최적화
- P1 기능 순차 추가

---

## 11. Required Packages (추가 설치)

```bash
npm install recharts @tanstack/react-query zustand date-fns @vercel/og
npx shadcn@latest add popover tooltip tabs select separator skeleton command dialog progress
```

---

## 12. Key Files to Modify

| File                     | Change                                           |
| ------------------------ | ------------------------------------------------ |
| `app/layout.tsx`         | Route Group 분리, QueryProvider 추가             |
| `app/globals.css`        | 차트 색상, 스포츠 컨텍스트 색상 확장             |
| `next.config.ts`         | 이미지 도메인(API-Football 선수 사진), Cron 설정 |
| `lib/supabase/server.ts` | Service Layer 기반 패턴 유지                     |
| `components.json`        | shadcn/ui 추가 컴포넌트 참조                     |

## Verification

1. **데이터 파이프라인**: Supabase에 선수/경기 데이터 확인 (SQL 쿼리)
2. **라이브 폴링**: 실제 경기일에 60초 갱신 테스트
3. **선수 프로필**: 아무 선수 프로필에서 맥락 데이터 표시 확인
4. **비교 카드**: 이미지 생성 & 다운로드 테스트
5. **모바일**: Chrome DevTools 반응형 테스트
6. **SEO**: Google Rich Results Test로 구조화 데이터 검증
7. **성능**: Lighthouse Score 90+ (Performance, SEO)
