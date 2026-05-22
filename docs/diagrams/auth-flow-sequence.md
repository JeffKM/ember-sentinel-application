# 인증 흐름 시퀀스 다이어그램

> ADR 참조: [ADR-006 JWT + OAuth2 인증 전략](../adr/ADR-006-jwt-oauth2-auth.md)

## 1. 소셜 로그인 → JWT 발급

```mermaid
sequenceDiagram
    autonumber
    participant User as 사용자
    participant App as 모바일 앱<br/>(React Native)
    participant Google as Google OAuth2
    participant Kakao as Kakao OAuth2
    participant API as API 서버<br/>(Spring Boot)
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over User, Redis: 시나리오 A: Google 로그인

    User->>App: Google 로그인 버튼 터치
    App->>Google: OAuth2 인증 요청<br/>(@react-native-google-signin)
    Google-->>User: Google 로그인 화면
    User->>Google: 계정 선택 + 동의
    Google-->>App: Google Access Token

    App->>API: POST /auth/google<br/>{accessToken}
    API->>Google: 토큰 검증 (userinfo API)
    Google-->>API: {email, name, picture}
    API->>DB: 사용자 조회 (email)

    alt 신규 사용자
        API->>DB: INSERT users<br/>(email, nickname, profileImage, authType=GOOGLE)
    else 기존 사용자
        API->>DB: 프로필 정보 업데이트
    end

    API->>API: JWT Access Token 생성 (30분)
    API->>API: Refresh Token 생성 (UUID)
    API->>Redis: Refresh Token 저장<br/>(KEY: refreshToken:{userId}, TTL: 7일)
    API-->>App: {userToken, refreshToken, userInfo}

    App->>App: AsyncStorage에 토큰 저장

    Note over User, Redis: 시나리오 B: Kakao 로그인

    User->>App: Kakao 로그인 버튼 터치
    App->>Kakao: OAuth2 인증 요청<br/>(@react-native-kakao)
    Kakao-->>User: Kakao 로그인 화면
    User->>Kakao: 계정 로그인 + 동의
    Kakao-->>App: Kakao Access Token
    App->>API: POST /auth/kakao<br/>{accessToken}
    API->>Kakao: 토큰 검증 (user/me API)
    Kakao-->>API: {id, email, nickname, profileImage}
    API->>DB: 사용자 조회/생성
    API->>Redis: Refresh Token 저장
    API-->>App: {userToken, refreshToken, userInfo}
```

## 2. API 요청 시 JWT 인증

```mermaid
sequenceDiagram
    autonumber
    participant App as 모바일 앱
    participant API as API 서버
    participant Interceptor as AuthInterceptor
    participant Service as Service 계층

    App->>API: GET /room/list/me<br/>Authorization: Bearer {accessToken}
    API->>Interceptor: 인터셉터 진입

    Interceptor->>Interceptor: JWT 서명 검증 (HS256)

    alt 토큰 유효
        Interceptor->>Interceptor: userId, email 추출
        Interceptor->>API: @AuthorizedUser 리졸버로 사용자 정보 주입
        API->>Service: 비즈니스 로직 실행
        Service-->>API: 결과 데이터
        API-->>App: 200 OK + 응답 데이터
    else 토큰 만료
        Interceptor-->>App: 401 Unauthorized<br/>{code: "TOKEN_EXPIRED"}
    else 토큰 위변조
        Interceptor-->>App: 401 Unauthorized<br/>{code: "INVALID_TOKEN"}
    end
```

## 3. Access Token 갱신 (Refresh Token 회전)

```mermaid
sequenceDiagram
    autonumber
    participant App as 모바일 앱
    participant API as API 서버
    participant Redis as Redis
    participant DB as PostgreSQL

    Note over App, DB: Access Token 만료 시

    App->>API: POST /auth/token/refresh<br/>{refreshToken}

    API->>Redis: Refresh Token 조회<br/>(KEY: refreshToken:{value})

    alt Refresh Token 유효
        API->>Redis: 기존 Refresh Token 삭제 (회전 정책)
        API->>DB: 사용자 정보 조회
        API->>API: 새 Access Token 생성 (30분)
        API->>API: 새 Refresh Token 생성 (UUID)
        API->>Redis: 새 Refresh Token 저장<br/>(TTL: 7일)
        API-->>App: {userToken, refreshToken}
        App->>App: AsyncStorage 토큰 갱신
    else Refresh Token 만료/무효
        API-->>App: 401 Unauthorized<br/>{code: "REFRESH_TOKEN_EXPIRED"}
        App->>App: 로그인 화면으로 이동
    end
```

## 4. FCM 토큰 등록

```mermaid
sequenceDiagram
    autonumber
    participant App as 모바일 앱
    participant Firebase as Firebase SDK
    participant API as API 서버
    participant DB as PostgreSQL

    Note over App, DB: 로그인 성공 직후

    App->>Firebase: FCM 토큰 요청

    alt 네이티브 빌드
        Firebase-->>App: Firebase 네이티브 토큰
    else Expo Go
        Firebase-->>App: Expo Push Token (폴백)
    end

    App->>API: POST /user/fcm/token<br/>Authorization: Bearer {accessToken}<br/>{fcmToken}
    API->>DB: users.fcm_token 업데이트
    API-->>App: 200 OK
```

## 토큰 정책 요약

| 항목                  | 값                                    | 비고                       |
| --------------------- | ------------------------------------- | -------------------------- |
| Access Token 알고리즘 | HS256                                 | 단일 서버에 적합           |
| Access Token 만료     | 30분                                  | 탈취 시 피해 시간 제한     |
| Refresh Token 형식    | UUID v4                               | JWT 아님 (서버에서만 검증) |
| Refresh Token 만료    | 7일                                   | Redis TTL로 관리           |
| Refresh Token 저장    | Redis                                 | 강제 만료·회전 지원        |
| 회전 정책             | 사용 시 즉시 새 토큰 발급 + 이전 삭제 | 재사용 공격 방어           |
| FCM 토큰              | users 테이블에 저장                   | 로그인 시 갱신             |
