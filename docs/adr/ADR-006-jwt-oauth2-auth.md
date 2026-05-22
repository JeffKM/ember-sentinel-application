# ADR-006: JWT + OAuth2 인증 전략

## 상태

**Accepted** (2025-04)

## 맥락

모바일 앱 사용자 인증과 엣지 디바이스 API 인증을 설계해야 한다. 주요 요구사항:

1. **소셜 로그인**: Google, Kakao OAuth2 지원 (이메일 로그인은 보조)
2. **Stateless**: 모바일 앱은 서버 세션에 의존하지 않아야 함
3. **보안**: 토큰 탈취 시 피해 최소화
4. **자동 갱신**: 사용자 경험을 위해 재로그인 빈도 최소화

### 후보 인증 방식

| 방식                             | 상태 관리           | 모바일 적합성    | 확장성 |
| -------------------------------- | ------------------- | ---------------- | ------ |
| **JWT (Access + Refresh Token)** | Stateless (+ Redis) | 높음             | 높음   |
| **서버 세션 + 쿠키**             | Stateful            | 낮음 (쿠키 제약) | 보통   |
| **OAuth2 Token Relay**           | 외부 IdP 의존       | 높음             | 높음   |

## 결정

**JWT Access Token + Refresh Token + Redis 조합**을 사용한다.

### 인증 흐름 설계

```
1. 클라이언트: 소셜 로그인 → OAuth2 Access Token 획득
2. 서버: POST /auth/google (또는 /auth/kakao)
   → 소셜 토큰 검증 → 사용자 생성/조회
   → JWT Access Token (30분) + Refresh Token (7일) 발급
3. 클라이언트: API 요청 시 Authorization: Bearer {accessToken}
4. 서버: AuthInterceptor에서 JWT 서명 검증 + 만료 확인
5. Access Token 만료 시: POST /auth/token/refresh
   → Refresh Token 검증 → 새 Access Token + 새 Refresh Token 발급
   → 이전 Refresh Token 즉시 무효화 (회전 정책)
```

### 토큰 정책

| 항목               | 값                                   | 근거                                               |
| ------------------ | ------------------------------------ | -------------------------------------------------- |
| Access Token 만료  | 30분                                 | 탈취 시 피해 시간 제한                             |
| Refresh Token 만료 | 7일                                  | 1주 간격 재로그인은 수용 가능한 UX                 |
| Refresh Token 저장 | Redis (TTL 7일)                      | 강제 만료·회전 정책 지원                           |
| Refresh Token 회전 | 사용 시 즉시 재발급 + 이전 토큰 삭제 | 토큰 재사용 공격 방어                              |
| 서명 알고리즘      | HS256 (HMAC-SHA256)                  | 단일 서버 환경에서 충분, RS256 대비 검증 속도 빠름 |

### 엣지 디바이스 인증

엣지 디바이스(`POST /embedded/fire-event/publish`)는 JWT 대신 **API Key 인증**을 사용한다:

- `X-Device-API-Key` 헤더로 사전 등록된 디바이스 키 검증
- 디바이스에 OAuth2 로그인 흐름 불필요
- Rate Limiting (1분 1회)으로 남용 방지

## 대안 분석

### 서버 세션 + 쿠키 — 기각

- 장점: 구현 단순, 서버에서 세션 완전 제어
- 단점:
  - 모바일 앱에서 쿠키 관리가 불편 (WebView 아닌 네이티브 HTTP)
  - 서버 스케일아웃 시 세션 동기화 필요 (Sticky Session 또는 Redis)
  - REST API의 Stateless 원칙에 위배

### OAuth2 Token Relay (소셜 토큰 직접 사용) — 기각

- 장점: 서버에서 자체 토큰 발급 불필요
- 단점:
  - 소셜 IdP(Google/Kakao) 가용성에 완전 의존
  - 토큰 만료 정책을 자체 제어 불가
  - API 요청마다 소셜 IdP 토큰 검증 호출 → 지연 증가

### Access Token만 사용 (Refresh Token 없이) — 기각

- 장점: 구현 단순
- 단점:
  - 짧은 만료(30분) → 빈번한 재로그인 필요 (UX 저하)
  - 긴 만료(7일) → 토큰 탈취 시 장기간 악용 가능
  - Refresh Token으로 두 요구사항을 동시 충족

## 결과

### 긍정적

- Stateless JWT로 서버 확장성 확보 + Redis로 Refresh Token 강제 만료 가능
- Refresh Token 회전 정책으로 토큰 재사용 공격 효과적 방어
- 소셜 로그인 후 자체 JWT 발급으로 IdP 독립적 API 인증
- `@AuthorizedUser` 어노테이션으로 컨트롤러에서 인증 사용자 편리하게 접근

### 부정적

- Redis 의존성 추가 (Refresh Token 저장)
- JWT는 발급 후 취소 불가 → Access Token 만료까지 강제 로그아웃 불가
- HS256은 단일 키 공유 → 마이크로서비스 확장 시 RS256/ES256 전환 필요

### 트레이드오프 요약

```
Stateless 확장성 + 자동 토큰 갱신 + 회전 보안  ←→  Redis 의존 + 즉시 토큰 취소 불가
```
