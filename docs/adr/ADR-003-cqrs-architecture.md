# ADR-003: 백엔드에 CQRS 아키텍처 도입

## 상태

**Accepted** (2025-06)

## 맥락

Ember Sentinel 백엔드(Spring Boot)의 도메인별 요청 패턴을 분석한 결과:

| 도메인      | 쓰기(Command) 빈도             | 읽기(Query) 빈도                  | 비율  |
| ----------- | ------------------------------ | --------------------------------- | ----- |
| 화재 이벤트 | 낮음 (엣지 디바이스 감지 시만) | 높음 (이벤트 목록·상세·이력 조회) | 1:20+ |
| 방(Room)    | 낮음 (초기 설정 시)            | 높음 (홈 화면 목록·상세 조회)     | 1:50+ |
| 사용자      | 매우 낮음 (가입·프로필 수정)   | 보통 (인증·정보 조회)             | 1:10+ |

읽기와 쓰기의 빈도 차이가 크고, 두 작업의 최적화 방향이 다르다:

- **쓰기**: 데이터 무결성, 트랜잭션, 부수효과(FCM 알림, LiveKit Room 생성) 중심
- **읽기**: 응답 속도, DTO 변환, 페이징 최적화 중심

## 결정

**도메인별로 Command/Query를 분리하는 CQRS 패턴을 적용**한다.

### 구조

```
도메인/
├── command/
│   ├── XXXCommandController.java    // 생성/수정/삭제 API
│   ├── XXXCommandService.java       // 쓰기 비즈니스 로직
│   └── dto/
│       └── XXXCreateRequest.java    // Command DTO (Java record)
├── query/
│   ├── XXXQueryController.java      // 조회 API
│   ├── XXXQueryService.java         // 읽기 비즈니스 로직
│   └── dto/
│       └── XXXResponse.java         // Query DTO (Java record)
├── domain/
│   └── XXX.java                     // JPA 엔티티
└── repository/
    └── XXXRepository.java           // Spring Data JPA
```

### 적용 범위

- **논리적 분리만 적용**: 동일 DB, 동일 Repository를 공유하되 Controller/Service 계층에서 Command와 Query를 분리
- **이벤트 소싱 미적용**: 현재 규모에서는 불필요한 복잡도

## 대안 분석

### 전통적 레이어드 아키텍처 (단일 Service) — 기각

- 장점: 구조 단순, 학습 곡선 낮음
- 단점:
  - 하나의 Service 클래스가 CRUD 전부를 담당하여 비대해짐
  - 화재 이벤트 생성 시 부수효과(FCM, LiveKit)와 단순 조회 로직이 혼재
  - 읽기 최적화(페이징, 프로젝션)가 쓰기 로직과 얽힘

### 완전한 CQRS + 이벤트 소싱 — 기각

- 장점: 읽기/쓰기 DB 분리, 이벤트 리플레이 가능, 감사 로그 자동화
- 단점:
  - 5개 도메인의 학생 프로젝트에 과도한 인프라 복잡도
  - EventStore, 읽기 DB 동기화, Eventual Consistency 처리 필요
  - 팀 규모(4명)에 비해 운영 부담 과중

## 결정 근거

1. **관심사 분리**: 화재 이벤트 생성(FCM + LiveKit + DB 쓰기)과 이벤트 목록 조회를 명확히 분리하여 각 로직의 가독성과 테스트 용이성 향상
2. **독립적 최적화**: Query Service에서 읽기 전용 DTO, 페이징, 캐싱을 자유롭게 최적화 가능
3. **적절한 복잡도**: 논리적 분리만 적용하여 인프라 변경 없이 코드 구조만으로 이점 확보
4. **면접 시 설명력**: "읽기/쓰기 분리의 실익"을 코드 레벨에서 구체적으로 설명 가능

## 결과

### 긍정적

- `FireEventCommandService`(생성 + FCM + LiveKit)와 `FireEventQueryService`(목록·상세 조회)가 각각 100줄 이내로 유지
- 쓰기 테스트에서 FCM/LiveKit 모킹에 집중, 읽기 테스트에서 페이징/DTO 검증에 집중 가능
- 새 팀원이 코드 이해 시 Command/Query 폴더만으로 역할 파악 가능

### 부정적

- 단순 CRUD 도메인(Building)에도 Command/Query 분리 적용 시 보일러플레이트 증가
- Repository를 공유하므로 완전한 읽기/쓰기 독립 최적화는 불가
- 오버엔지니어링 논란 가능 — 규모 대비 구조가 무거울 수 있음

### 오버엔지니어링 인지

현재 프로젝트 규모에서 CQRS가 과할 수 있다는 점을 인지하고 있으며, 의도적으로 **논리적 분리 수준**에서만 적용했다. DB 분리나 이벤트 소싱은 트래픽이 10배 이상 증가하는 시점에 재검토한다.

### 트레이드오프 요약

```
관심사 분리 + 독립 테스트 + 코드 가독성  ←→  보일러플레이트 증가 + 오버엔지니어링 우려
```
