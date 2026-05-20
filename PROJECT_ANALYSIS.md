# Ember Sentinel

> **AI 기반 실시간 화재/연기 감지 및 영상 스트리밍 통합 플랫폼**
>
> 컴퓨터 비전(CV) 기술로 화재를 실시간 탐지하고, 초기 대응을 위한 소화기 위치 알림 및 영상 스트리밍을 제공하는 End-to-End 솔루션

---

## 프로젝트 정보

| 항목 | 내용 |
|------|------|
| 분류 | 2025년 2학기 인하대학교 캡스톤디자인 |
| 팀명 | Last Dance |
| 지도교수 | 김정은 |
| 기업멘토 | 최형탁 |
| 팀원 | 이경민, 이정빈, 박인성 |
| 기간 | 2025년 2학기 |

### 레포지토리 구성

| 레포지토리 | 역할 | 기술 스택 |
|-----------|------|----------|
| [ember-sentinel-application](https://github.com/JeffKM/ember-sentinel-application) | 모바일 클라이언트 앱 | React Native 0.81 + Expo 54, JavaScript |
| [ember-sentinel-server](https://github.com/JeffKM/ember-sentinel-server) | 백엔드 API 서버 | Java 17, Spring Boot 3.5.7, PostgreSQL, Redis |
| [ember-sentinel-ai](https://github.com/JeffKM/ember-sentinel-ai) | AI 모델 학습/변환 | Python, YOLOv11n, NCNN |
| [Terraform-Bastion-Server](https://github.com/JeffKM/Terraform-Bastion-Server) | AWS 인프라 IaC | Terraform (HCL), AWS |
| [edge-IoT](https://github.com/JeffKM/edge-IoT) | 엣지 디바이스 | Python + Arduino C++ |

---

## 1. 개발 배경 및 동기

### 문제 인식

2023년 기준 화재 1건당 재산 피해액은 **1억 740만원**에 달하며, 화재로 인한 피해는 지속적으로 증가하고 있다. 기존 시스템은 화재를 **초기 단계에 감지하고 대응**하는 데 실패하고 있다.

### 기존 시스템의 한계

| 기존 시스템 | 문제점 |
|-----------|--------|
| **재래식 센서** | 화재의 결과물인 연기가 센서에 **물리적으로 도달**해야 작동 → 감지 지연 |
| **지능형 화재경보기** | 최신 탐지 기능을 갖추고 있으나, 알림이 **건물 내부로 제한** → 외부 대응 불가 |

### 해결 방향

- On-Device AI(컴퓨터 비전)로 **불꽃/연기를 실시간 영상에서 직접 탐지**하여 물리적 센서의 한계 극복
- 클라우드 푸시 알림 + 실시간 영상 스트리밍으로 **건물 외부에서도 즉각 대응** 가능
- 소화기에 부착된 엣지 디바이스를 통해 **소화기 위치 알림** 및 **현장 경보** 동시 제공

---

## 2. 설계 과정

### 2.1 사용자 시나리오 설계

화재 발생부터 초기 대응까지 **3단계 시나리오**를 먼저 정의하고, 이를 구현하기 위한 시스템을 역순으로 설계하였다.

**[1단계] 화재 감지 및 스트리밍 시작**
- 카메라가 주변 환경을 상시 모니터링
- On-Device AI가 불꽃 또는 연기를 **실시간 탐지**
- 탐지 즉시 **영상 스트리밍 활성화**, 클라우드에 알림 요청 전송
- 주변 소화기에 부착된 **엣지 디바이스로 BLE 통신**, 소화기 위치 알림

**[2단계] 알림 전송 및 사용자 연결**
- 클라우드가 사용자 스마트폰 앱으로 **FCM 푸시 알림** 발송
- 사용자는 앱 접속 후 **실시간 영상 스트리밍**에 접속

**[3단계] 초기 대응 및 자동 종료**
- 사용자: 실시간 영상을 통해 **화재의 위치와 규모 판단**
- 시스템: **상황 종료 시 스트리밍 자동 종료**

### 2.2 사용자 흐름도 (User Diagram) 설계

시나리오 기반으로 앱의 화면 구조와 분기 로직을 다이어그램으로 설계하였다.

```
사용자 ──► 스플래시 화면 ──► 로그인 화면 ──► 홈화면 (Room 목록)
                                              │
                                    ┌─────────┴──────────┐
                                    ▼                    ▼
                             Room 세부 화면          Room 생성 화면
                                    │
                       ┌────────────┴────────────┐
                       ▼                         ▼
              현재 이벤트 선택              과거 이벤트 선택
                       │                         │
                       ▼                         │
         if) 특정 카메라가 화재 감지?              │
              ┌───┴───┐                         │
             yes      no                        │
              │        │                        │
              │   "탐지되지 않음" 배너            │
              ▼                                 ▼
     화재 이벤트 기록 요약 정보 ◄────────────────┘
              │
         ┌────┴────┐
         ▼         ▼
    영상 재생   평면도 위치
      화면       화면

[ADMIN/EDITOR 전용 기능]
Room 세부 화면 ──► user 추가/제거
               ──► camera_edge 추가/제거

[푸시 알림 수신 경로]
사용자 ◄── 푸시 알림 수신 ──► 알림 탭 ──► 화재 이벤트 기록 요약 정보
```

### 2.3 SFU (Selective Forwarding Unit) 아키텍처 설계

실시간 영상 스트리밍에서 **1:N 전송**이 필요하기 때문에, P2P가 아닌 **SFU 방식**의 LiveKit 서버를 도입하였다.

```
Raspberry Pi (Publisher)
      │
      │  WebRTC 1:1 영상 전송
      ▼
┌─────────────┐
│  LiveKit     │
│  SFU Server  │
└──┬──┬──┬────┘
   │  │  │  WebRTC 1:N 영상 전송
   ▼  ▼  ▼
 App App App  (다수의 모바일 클라이언트)
```

**SFU 방식 선택 이유:**
- 엣지 디바이스는 1개의 업스트림만 전송하면 되므로 **리소스 절약**
- 서버가 N개의 다운스트림을 관리하므로 **수신자 수에 무관한 안정성**
- LiveKit Egress를 통해 서버 사이드에서 **녹화 + S3 저장**도 동시 처리

### 2.4 IoT Edge 아키텍처 설계

Fire Detection을 수행하는 **마스터 노드**와 소화기 위치를 알리는 **슬레이브 노드**로 역할을 분리하였다.

```
[마스터 노드 - Raspberry Pi 5]
  ┌─────────┐     streaming     ┌──────────────┐
  │ 전원 공급 │ ───────────────► │ 라즈베리파이 5  │
  └─────────┘                   └──────┬───────┘
                                       │
  ┌──────────────────┐                 │ if) fire detected
  │ 라즈베리파이       │  카메라 영상    │ wake & alarm
  │ 카메라 모듈       │ ──────────────►│
  └──────────────────┘                 │
                                       │ BLE 신호
                                       ▼
                            ┌────────────────┐    부저 알람
                            │ Arduino Nano    │ ──────────►  🔊
                            │ 33 BLE          │
                            └────────────────┘
                                       ▲
                            ┌────────────────┐
                            │ 전원 공급       │
                            │ (배터리 사용)   │
                            └────────────────┘
```

**하드웨어 구성:**

| 디바이스 | 구성 요소 |
|---------|----------|
| **Arduino Nano 33 BLE** (슬레이브) | 부저 모듈, 배터리 3.7V 10000mAh |
| **Raspberry Pi 5** (마스터) | 카메라 모듈, 배터리 3.7V 10000mAh, 충전기 |

**저전력 설계:**

| 최적화 항목 | 구현 내용 |
|-----------|----------|
| IDLE 상태 유지 | BLE 스캔만 활성화 → 평균 전류 **0.5~2mA**, 10,000mAh 배터리로 **1년 이상** 유지 |
| BLE 스캔 듀티 최적화 | 5초 간격, 80ms만 스캔 (**1.6% 듀티**), 프로젝트 ID (0xA55A) 수신 시 트리거 |
| 하드웨어 전력 최적화 | Power LED 제거 |

### 2.5 AWS 인프라 아키텍처 설계

실시간 스트리밍, API 서버, 데이터 저장을 분리된 AWS 서비스로 구성하고, Terraform으로 IaC 관리한다.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            AWS Cloud (us-west-2)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │  LiveKit 영역                                                 │            │
│  │  ┌───────────────┐    ┌──────────────────────┐               │            │
│  │  │ Network Load   │───►│ Amazon ECS            │◄── WebRTC ──┼─── Client  │
│  │  │ Balancer       │    │ (LiveKit Server)      │    송신       │   (App)   │
│  │  └───────────────┘    └───────┬──────────────┘               │            │
│  └───────────────────────────────┼──────────────────────────────┘            │
│                                  │ WebRTC                                    │
│                                  │ Webhook 요청                               │
│  ┌───────────────────────────────┼──────────────────────────────┐            │
│  │  API 서버 영역                 │                               │            │
│  │  ┌───────────────┐    ┌──────▼──────────────┐               │            │
│  │  │ Application    │───►│ Amazon ECS            │◄── REST API ─┼─── Client │
│  │  │ Load Balancer  │    │ (Spring Boot Server)  │              │   (App)   │
│  │  └───────────────┘    └──┬──────┬──────┬────┘               │            │
│  └──────────────────────────┼──────┼──────┼─────────────────────┘            │
│                             │      │      │                                  │
│      ┌──────────────────────┘      │      └──────────────────┐               │
│      ▼                             ▼                         ▼               │
│  ┌────────────────┐    ┌────────────────────┐    ┌─────────────────┐        │
│  │ Amazon          │    │ Amazon ElastiCache  │    │ Amazon RDS       │        │
│  │ S3 Standard     │    │ (Redis)             │    │ (PostgreSQL)     │        │
│  │ 영상 저장/조회   │    │ Bearer Token 관리   │    │ 메타 데이터 저장  │        │
│  └────────────────┘    └────────────────────┘    └─────────────────┘        │
│                                                                              │
│      ▲ LiveKit Egress를 활용한                                                │
│      │ 영상 녹화/전송                                                         │
│                                                              ◄── IaC ── Terraform
└──────────────────────────────────────────────────────────────────────────────┘
         ▲                                         ▲
         │ WebRTC                                   │ MQTT 메세지 발행
         │ fire detection                           │
         │ request/response                    ┌────┴───────┐
┌────────┴─────────────┐                      │ IoT Core    │
│  IoT Edge Computing  │                      │ → Amazon SNS│
│  (Raspberry Pi 5)    │                      │ → 모바일 앱  │
│  Fire Detection Model│                      └────────────┘
│  + BLE 경보           │
└──────────────────────┘
```

### 2.6 데이터베이스 스키마 설계

#### PostgreSQL 테이블 구조

**user**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| email | VARCHAR(255) | NOT NULL |
| nickname | VARCHAR(100) | NOT NULL |
| profile_image_url | VARCHAR(511) | |
| user_role | enum('USER', 'ADMIN') | NOT NULL |
| auth_type | enum('KAKAO', 'GOOGLE') | NOT NULL |
| endpoint_arn | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | NOT NULL |
| modified_at | TIMESTAMPTZ | NOT NULL |

**room**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| building_id | bigint | FK → building.id, NOT NULL |
| media_record_s3_bucket_dir_path | VARCHAR(511) | NOT NULL |
| room_alias | VARCHAR(100) | NOT NULL |
| building_location_floor | VARCHAR(10) | NOT NULL |
| room_number | VARCHAR(10) | |
| created_at | TIMESTAMPTZ | NOT NULL |
| modified_at | TIMESTAMPTZ | NOT NULL |

**user_room_membership** (N:M 조인 테이블)
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| user_id | bigint | PK, FK → user.id, NOT NULL |
| room_id | bigint | PK, FK → room.id, NOT NULL |
| membership_role | enum('VIEWER', 'EDITOR') | |
| joined_at | TIMESTAMPTZ | NOT NULL |

**building**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| building_name | VARCHAR(100) | |

**camera_edge**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| device_uuid | UUID | |
| room_id | bigint | FK → room.id, NOT NULL |
| camera_edge_alias | VARCHAR(128) | |
| created_at | TIMESTAMPTZ | NOT NULL |
| modified_at | TIMESTAMPTZ | NOT NULL |

**fire_event**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| fire_cause | enum('전기', '가스', '기타') | |
| risk_rank | bigint | NOT NULL |
| detection_type | enum('화재', '연기') | |
| camera_edge_id | bigint | FK → camera_edge.id, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

**media_stream**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| livekit_room_name | VARCHAR(255) | |
| fire_event_id | bigint | FK → fire_event.id, NOT NULL |
| streaming_status | enum('PENDING', 'LIVE', 'ENDED') | NOT NULL, default PENDING |
| created_at | TIMESTAMPTZ | NOT NULL |

**media_record**
| 컬럼 | 타입 | 제약조건 |
|------|------|---------|
| id | bigint | PK |
| s3_bucket_path | VARCHAR(511) | NOT NULL |
| fire_event_id | bigint | FK → fire_event.id, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

#### 엔티티 관계도 (ERD)

```
user ──1:N──► user_room_membership ◄──N:1── room
                                              │
building ──1:N──► room ──1:N──► camera_edge ──1:N──► fire_event
                                                         │
                                              ┌──────────┴──────────┐
                                              ▼                     ▼
                                        media_stream          media_record
                                     (실시간 스트리밍)        (S3 녹화 기록)
```

#### Redis 캐시 구조

| Key 패턴 | Value | TTL |
|---------|-------|-----|
| `user:<refresh_token>` | `<email>` | 2일 |
| `media-stream:<stream_key>` | `<stream_url>` | - |

---

## 3. 구현 상세

### 3.1 AI 모델 학습 및 엣지 배포 (ember-sentinel-ai)

#### 설계 의사결정

| 의사결정 | 선택 | 근거 |
|---------|------|------|
| 모델 아키텍처 | YOLOv11n | 경량 모델로 엣지 디바이스에서 실시간 추론 가능 |
| 추론 프레임워크 | NCNN | 모바일/ARM 최적화, half precision 지원으로 Raspberry Pi에서 고속 추론 |
| 데이터셋 | FASDD_CV | Fire and Smoke Detection Dataset, 화재/연기 2클래스 탐지에 특화 |

#### 학습 파이프라인

```
1. preprocessing.py  → FASDD_CV 데이터셋을 YOLO 형식으로 변환
                       (train/val/test 분할, data.yaml 생성)
2. eda.py            → 탐색적 데이터 분석
                       (바운딩 박스 면적/종횡비/너비/높이 분포 시각화)
3. train.py          → YOLOv11n 모델 학습
                       (사전학습: yolo11n.pt, 30 epochs, batch 32, imgsz 640)
4. inference.py      → 테스트셋 검증 (mAP, precision, recall)
5. export.py         → best.pt → NCNN 포맷 변환 (half precision, GPU)
                       → best_ncnn_model (엣지 디바이스 배포용)
```

#### 실험 결과

| Model | Epoch | AP_fire | AP_smoke | mAP@0.5 (%) |
|-------|-------|---------|----------|-------------|
| yolov11n | 5 | 0.867 | 0.696 | 78.1 |
| yolov11n | 10 | 0.902 | 0.698 | 80.0 |
| **yolov11n (NCNN)** | **10** | **0.876** | **0.866** | **87.1** |

- NCNN 변환 후 오히려 mAP가 **87.1%로 향상** (양자화로 인한 정규화 효과)
- 추론 속도: 약 **78.5ms** (Raspberry Pi 5 기준)

#### 의존성

```
ultralytics==8.3.230     # YOLOv11 학습 프레임워크
ncnn==1.0.20250916       # 엣지 최적화 추론 엔진
numpy==2.2.6             # 수치 연산
scikit-learn==1.7.2      # 데이터 분할
PyYAML==6.0.3            # YOLO 설정 파일 처리
tqdm==4.67.1             # 진행률 표시
```

---

### 3.2 엣지 IoT 디바이스 (edge-IoT)

#### 설계 의사결정

| 의사결정 | 선택 | 근거 |
|---------|------|------|
| 마스터 노드 | Raspberry Pi 5 | GPU 없이도 NCNN 추론 가능, 카메라 모듈 직결 |
| 슬레이브 노드 | Arduino Nano 33 BLE | 초저전력 BLE, 배터리 1년+ 운용 가능 |
| 스트리밍 프로토콜 | WebRTC (LiveKit) | 초저지연, SFU를 통한 1:N 전송 가능 |
| 엣지-서버 통신 | HTTP REST | 간단한 이벤트 발행에 적합, 양방향 불필요 |

#### 파일 구성 및 역할

| 파일 | 역할 |
|------|------|
| `main.py` | **핵심 엣지 애플리케이션** — YOLO 추론 + BLE 경보 + LiveKit 스트리밍 |
| `client.py` | 테스트용 WebRTC 스트리밍 클라이언트 |
| `arduino.ino` | Arduino 화재 경보기 (BLE 수신 + 부저 + LED 제어) |

#### main.py 핵심 로직

```
[카메라 영상 프레임]
      │
      ▼
[YOLO NCNN 추론] ─── fire / smoke 감지!
      │
      ├──── [BLE 전송] ──► Arduino Nano 33 BLE ──► 부저 알람 (10초)
      │
      └──── [HTTP POST] ──► API 서버 /embedded/fire-event/publish
                              │
                              ├── FireEvent DB 생성
                              ├── LiveKit 룸 생성 + Egress 녹화 시작
                              ├── FCM 푸시 알림 발송
                              └── LiveKit 토큰 응답
                                    │
                                    ▼
                          [WebRTC 스트리밍 시작]
                          LiveKit 서버로 영상 전송
                          (VP8 코덱, ARGB 프레임 변환)
```

**스트리밍 제어 파라미터:**
- 최대 스트리밍 시간: **30초**
- 쿨다운 시간: **60초** (재감지 방지)
- 자동 종료 조건: **10초간 화재 미감지** 시
- LiveKit 연결 타임아웃: **10초**

#### Arduino 경보기 (arduino.ino)

| 항목 | 값 |
|------|-----|
| BLE 서비스명 | `Nano33BLE-Fire` |
| BLE UUID | `12345678-1234-5678-1234-56789abcdef1` |
| 명령 `1` | 부저(12번 핀) + LED **500ms 간격 깜빡임** (10초간) |
| 명령 `0` | 하트비트 (연결 유지 확인) |

---

### 3.3 백엔드 API 서버 (ember-sentinel-server)

#### 설계 의사결정

| 의사결정 | 선택 | 근거 |
|---------|------|------|
| 아키텍처 패턴 | CQRS (Command/Query 분리) | 읽기/쓰기 책임 분리로 유지보수성 향상 |
| DB | PostgreSQL | 복잡한 관계형 데이터(건물-방-카메라-이벤트) 관리에 적합 |
| 캐싱 | Redis | Refresh Token TTL 관리, 스트림 키 캐싱 |
| 미디어 서버 | LiveKit | 오픈소스 SFU, Egress(녹화) 기능 내장, S3 직접 업로드 |
| 인증 | JWT + OAuth2 | 소셜 로그인(Google/Kakao) + 자체 토큰 발행 |

#### 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.5.7 + Spring WebFlux |
| ORM | Spring Data JPA (Hibernate) |
| DB | PostgreSQL 15.12 |
| 캐싱 | Redis (ElastiCache) |
| 실시간 스트리밍 | LiveKit Server SDK 0.10.1 |
| 푸시 알림 | Firebase Admin SDK 9.4.3 (FCM) |
| 클라우드 저장 | AWS S3 SDK 2.21.1 (Presigned URL) |
| 인증 | JWT (jjwt 0.11.5) + OAuth2 |
| API 문서 | Springdoc OpenAPI (Swagger UI) |
| 빌드/배포 | Gradle, Docker, GitHub Actions |

#### CQRS 도메인 구조

각 도메인은 `CommandController`/`QueryController`, `CommandService`/`QueryService`로 분리된다.

```
building/       - 건물 관리 (CRUD)
room/           - 방(공간) 관리 + 사용자-방 멤버십 (UserRoomMembership)
camera_edge/    - 엣지 카메라 디바이스 등록/관리 (deviceUuid 기반)
fire_event/     - 화재 이벤트 생성/조회/웹훅 처리 (핵심 도메인)
media/          - 미디어 스트림 (MediaStream) + 미디어 녹화 (MediaRecord)
user/           - 사용자 인증 (OAuth2: Google/Kakao/Email) + FCM 토큰 관리
security/       - JWT 인터셉터 기반 인증
common/         - FCM, LiveKit, Redis, S3 공통 서비스 + 예외 처리
```

#### 핵심 API 엔드포인트

**인증 (Auth)**
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/auth/google` | Google OAuth 로그인 (accessToken → JWT 발행) |
| POST | `/auth/kakao` | Kakao OAuth 로그인 (accessToken → JWT 발행) |
| POST | `/auth/email` | 이메일 로그인 |
| POST | `/auth/token/refresh` | JWT Refresh Token으로 재발행 |

**화재 이벤트 (Fire Event) — 핵심**
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/embedded/fire-event/publish` | 엣지 디바이스 → 화재 감지 이벤트 발행 (LiveKit 룸 생성 + Egress 녹화 시작 + FCM 알림) |
| POST | LiveKit Webhook | 스트리밍 상태 변경 이벤트 처리 (참가자 입/퇴장, Egress 완료) |

**방 관리 (Room)**
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/room/list/me` | 내 Room 목록 조회 (페이지네이션) |
| POST | `/room/list/me/summary` | Room 요약 정보 (배치 조회) |
| GET | `/room/{id}/detail` | Room 상세 (멤버/카메라 포함) |
| POST | `/room` | Room 생성 |
| DELETE | `/room/{id}` | Room 삭제 |
| POST | `/room/{id}/user` | Room에 사용자 추가 |
| DELETE | `/room/{id}/user/{userId}` | Room에서 사용자 제거 |
| POST | `/room/{id}/camera-edge` | Room에 카메라 추가 |
| DELETE | `/room/{id}/camera-edge/{cameraId}` | Room에서 카메라 제거 |

**기타**
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/building/list` | 건물 목록 조회 |
| POST | `/user/fcm/token` | FCM 디바이스 토큰 등록 |

#### CI/CD 파이프라인

```
dev 브랜치 push
  │
  ├──► CI (ci.yml)
  │    ├── 소스코드 체크아웃 (서브모듈 포함)
  │    ├── JDK 17 + Gradle 빌드
  │    └── JUnit 테스트 리포트 발행
  │
  └──► CD (dev-cd.yml)
       ├── Gradle 빌드 (spring.profiles.active=dev)
       ├── AWS OIDC 인증 (IAM Role)
       ├── Docker 이미지 빌드
       ├── Amazon ECR push (태그: latest-dev + commit SHA)
       └── SSM Send-Command로 EC2 배포
           (docker pull → docker stop → docker run)
           (ember-network Docker 네트워크, Redis 연결)
```

#### Dockerfile

```dockerfile
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY build/libs/*.jar app.jar
COPY src/main/resources/secrets/ember-sentinel-firebase-admin-sdk.json /app/
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/ember-sentinel-firebase-admin-sdk.json"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

---

### 3.4 모바일 앱 (ember-sentinel-application)

#### 설계 의사결정

| 의사결정 | 선택 | 근거 |
|---------|------|------|
| 프레임워크 | React Native + Expo 54 | 크로스 플랫폼 개발, OTA 업데이트, EAS Build |
| 아키텍처 | New Architecture 활성화 | Fabric + TurboModule로 네이티브 성능 향상 |
| 내비게이션 | React Navigation 7 (Stack) | 화재 알림 → 영상 → 이력의 선형 흐름에 적합 |
| 인증 | Google + Kakao 소셜 로그인 | 한국 사용자 커버리지 극대화 |
| 오프라인 지원 | AsyncStorage + 샘플 데이터 | 서버 연결 실패 시 그레이스풀 디그레이드 |

#### 디렉토리 구조

```
ember-sentinel/
├── App.js                          # 루트 컴포넌트 (내비게이션 + 인증)
├── app.json                        # Expo 설정
├── eas.json                        # EAS Build 프로필
├── metro.config.js                 # Metro 번들러
└── src/
    ├── config/
    │   ├── api.js                  # API 클라이언트 (Bearer 토큰, 10초 타임아웃)
    │   ├── firebase.js             # FCM 토큰 발급/등록/리스너
    │   └── socialLogin.js          # Google/Kakao OAuth 설정값
    ├── screens/
    │   ├── SplashScreen.js         # 스플래시 (2초, 로딩 애니메이션)
    │   ├── LoginScreen.js          # 소셜 로그인 + 역할별 테스트 로그인
    │   ├── HomeScreen.js           # Room 목록, 통계, CRUD, Pull-to-refresh
    │   ├── RoomDetailScreen.js     # 탭 UI (재실 인원/카메라), 멤버/카메라 관리
    │   ├── FireAlertDetailScreen.js # 화재 알림 상세, 액션 버튼
    │   ├── CCTVLiveScreen.js       # 실시간 영상 (LIVE 배지, 화재 경고 오버레이)
    │   ├── FireLocationScreen.js   # 건물 평면도, 층 선택기, 화재 호실 강조
    │   ├── FireEventHistoryScreen.js # 이벤트 이력 리스트
    │   └── FireEventVideoScreen.js # 녹화 영상 재생 (재생/일시정지, 프로그레스 바)
    ├── components/
    │   └── PushNotificationBanner.js # 포그라운드 알림 배너 (Spring 애니메이션)
    └── utils/
        ├── networkTest.js          # 네트워크 진단 (기본 네트워크 + 서버 연결)
        └── pushNotification.js     # 로컬/원격 푸시 전송
```

#### 화면 흐름

```
SplashScreen (2초)
  ↓
LoginScreen
  ↓ (Google/Kakao 소셜 로그인)
HomeScreen (Room 목록 + 통계)
  ├→ RoomDetailScreen (멤버/카메라 관리)
  └→ FireAlertDetailScreen (화재 알림 상세)
       ├→ CCTVLiveScreen (실시간 WebRTC 영상)
       ├→ FireLocationScreen (건물 평면도)
       └→ FireEventHistoryScreen (이벤트 이력)
            └→ FireEventVideoScreen (S3 녹화 영상 재생)
```

#### 인증 흐름

```
[소셜 로그인 (Google/Kakao)]
  │ 네이티브 SDK → accessToken 획득
  │ (Expo Go 환경: AuthSession 폴백)
  ▼
[POST /auth/google 또는 /auth/kakao]
  │ accessToken 전달
  ▼
[서버 응답: JWT + refreshToken + 사용자 정보]
  │ AsyncStorage에 저장
  ▼
[FCM 토큰 초기화 → 서버 등록]
  │ POST /user/fcm/token
  ▼
[HomeScreen 진입]

* 서버 연결 실패 시 → 오프라인 모드 자동 전환 (샘플 데이터)
* 역할 기반 권한: ADMIN/EDITOR → CRUD 가능, VIEWER → 조회만
```

#### FCM 푸시 알림 흐름

```
앱 시작 → initializeFCMToken()
  ├── 네이티브 FCM 토큰 시도 (getDevicePushTokenAsync)
  ├── 실패 시 Expo Push Token 폴백 (getExpoPushTokenAsync)
  └── 서버에 토큰 등록 (POST /user/fcm/token)

포그라운드 수신 → PushNotificationBanner (커스텀 애니메이션 배너)
  - 시스템 알림 비표시 (shouldShowAlert: false)
  - Spring 애니메이션으로 상단 슬라이드

백그라운드/종료 상태 → 시스템 알림 표시
  - 탭 시 앱 내 해당 화재 이벤트 화면으로 이동
```

#### 빌드 설정

| 프로필 | 용도 | 배포 방식 |
|-------|------|----------|
| development | 개발용 (Dev Client) | 내부 배포 |
| preview | QA/테스트 | 내부 배포 |
| production | 스토어 배포 | 자동 버전 증가 |

---

### 3.5 AWS 인프라 (Terraform-Bastion-Server)

#### 설계 의사결정

| 의사결정 | 선택 | 근거 |
|---------|------|------|
| IaC 도구 | Terraform | 선언적 인프라 관리, 상태 파일 기반 변경 추적 |
| 리전 | us-west-2 (Oregon) | LiveKit 미디어 서버 성능 고려 |
| LiveKit 인스턴스 | m5.xlarge | WebRTC 미디어 처리에 높은 CPU/네트워크 요구 |
| DB | RDS PostgreSQL | 관리형 서비스, 자동 백업, 스케일링 |
| 영상 저장 | S3 Standard | 대용량 영상 파일, Presigned URL로 보안 접근 |

#### 프로비저닝 리소스

| 리소스 | 타입/인스턴스 | 용도 |
|--------|-------------|------|
| EC2 - API Server | t3.medium | Spring Boot API 서버 (포트 8080) |
| EC2 - LiveKit Server | m5.xlarge | WebRTC 미디어 서버 (포트 7880, 7881, UDP 50000-60000) |
| RDS | db.t4g.micro, PostgreSQL 15.12 | ember_sentinel 데이터베이스 |
| S3 | Standard, Public access 차단 | 녹화 영상 저장 |
| ECR | 2개 레지스트리 | api-server, livekit-server Docker 이미지 |
| Security Groups | 3개 | API SG (22, 8080), LiveKit SG (22, 7880, 7881, UDP), RDS SG (5432) |

#### LiveKit 서버 구성

| 파일 | 역할 |
|------|------|
| `livekit.yaml.tftpl` | LiveKit 서버 설정 (API Key/Secret, Webhook URL → API 서버) |
| `egress.yaml.tftpl` | Egress(녹화) 서비스 설정 (S3 버킷, AWS 리전) |
| `docker-compose.livekit.yml` | LiveKit + Egress Docker Compose 구성 |
| `livekit_userdata.sh` | EC2 부팅 시 자동 설정 스크립트 |

#### Terraform Outputs

| Output | 설명 |
|--------|------|
| `livekit_server_public_ip` | LiveKit Server Public IP |
| `api_server_dev_public_ip` | API Server Public IP |
| `s3_bucket_name` | S3 버킷 이름 |
| `rds_endpoint` / `rds_port` | RDS 접속 정보 |
| `api_server_ecr_url` | API 서버 ECR 저장소 URL |
| `livekit_server_ecr_url` | LiveKit 서버 ECR 저장소 URL |

---

## 4. 전체 데이터 흐름

### 4.1 화재 감지 → 알림 → 영상 스트리밍 (메인 시나리오)

```
[1] 엣지 카메라 (Raspberry Pi 5)
     │ 영상 프레임
     ▼
[2] YOLO NCNN 모델 추론 (약 78.5ms)
     │ fire / smoke 감지
     ├────── BLE ──► [3] Arduino 부저 알람 (10초간)
     │
     ▼
[4] HTTP POST → API 서버 /embedded/fire-event/publish
     │
     ├── [5] FireEvent 엔티티 생성 (PostgreSQL)
     ├── [6] LiveKit 룸 생성 + Egress 녹화 시작 (→ S3)
     ├── [7] FCM 푸시 알림 → 해당 Room 모든 멤버의 모바일 앱
     └── [8] LiveKit 토큰 응답 → 엣지 디바이스
                                    │
                                    ▼
[9] WebRTC 영상 스트리밍 (VP8, 최대 30초)
     Raspberry Pi → LiveKit SFU Server → 1:N → 모바일 앱 클라이언트

[10] 스트리밍 종료 후
     LiveKit Egress → S3 (recordings/{roomName}.mp4)
     Webhook → API 서버 (streaming_status: ENDED)
```

### 4.2 녹화 영상 재생 흐름

```
모바일 앱 → GET /fire-event/{id}/media-record
     │
     ▼
API 서버 → S3 Presigned URL 생성
     │
     ▼
모바일 앱 → Presigned URL로 MP4 영상 재생
```

---

## 5. 레포지토리 간 연결 관계

| 출발 | 도착 | 연결 방식 | 설명 |
|------|------|-----------|------|
| ember-sentinel-ai | edge-IoT | NCNN 모델 파일 | `export.py`로 변환된 `best_ncnn_model`을 엣지 디바이스에 배포 |
| edge-IoT | ember-sentinel-server | HTTP REST | 화재 감지 시 `POST /embedded/fire-event/publish` 호출 |
| edge-IoT | LiveKit Server | WebRTC | API 서버에서 받은 토큰으로 영상 스트리밍 |
| edge-IoT | Arduino | BLE (Bluetooth) | 화재 감지 시 부저 알람 명령 전송 |
| ember-sentinel-server | LiveKit Server | LiveKit SDK | 룸 생성, Egress(녹화) 시작/중지 |
| LiveKit Server | ember-sentinel-server | Webhook (HTTP) | 참가자 입/퇴장, Egress 완료 이벤트 |
| LiveKit Egress | S3 | AWS SDK | 녹화 MP4 파일 S3 업로드 |
| ember-sentinel-server | 모바일 앱 | FCM Push + REST API | 화재 알림, 이벤트 조회, 건물/방 관리 |
| 모바일 앱 | LiveKit Server | WebRTC | 실시간 화재 현장 영상 시청 |
| Terraform | 모든 AWS 리소스 | IaC | EC2, RDS, S3, ECR, SG 프로비저닝 |
| GitHub Actions | ECR → EC2 | CI/CD | dev 브랜치 push 시 자동 빌드/배포 |

---

## 6. 기술 스택 종합

### 프론트엔드 (모바일)
| 항목 | 기술 |
|------|------|
| 프레임워크 | React Native 0.81 + Expo 54 (New Architecture) |
| 언어 | JavaScript, React 19 |
| 내비게이션 | React Navigation 7 (Stack Navigator) |
| 푸시 알림 | Firebase 12 (FCM) + Expo Notifications |
| 인증 | Google Sign-In, Kakao SDK |
| 로컬 저장소 | AsyncStorage |
| 빌드 | EAS Build (development / preview / production) |

### 백엔드
| 항목 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.5.7 + Spring WebFlux |
| 언어 | Java 17 |
| 아키텍처 | CQRS (Command/Query 분리) |
| DB | PostgreSQL 15.12 (RDS) |
| 캐싱 | Redis (ElastiCache) |
| 실시간 | LiveKit WebRTC (SFU) |
| 저장소 | AWS S3 (Presigned URL) |
| 인증 | JWT + OAuth2 (Google/Kakao/Email) |
| 컨테이너 | Docker (ECR) |
| CI/CD | GitHub Actions → ECR → EC2 (SSM) |
| API 문서 | Springdoc OpenAPI (Swagger UI) |

### AI / ML
| 항목 | 기술 |
|------|------|
| 모델 | YOLOv11n (Ultralytics 8.3.230) |
| 추론 엔진 | NCNN (엣지 최적화, half precision) |
| 감지 클래스 | fire, smoke (2클래스) |
| 데이터셋 | FASDD_CV |
| 성능 | mAP@0.5: **87.1%**, 추론 속도: **78.5ms** |

### 엣지 / IoT
| 항목 | 기술 |
|------|------|
| 마스터 노드 | Raspberry Pi 5 (카메라 + NCNN 추론) |
| 슬레이브 노드 | Arduino Nano 33 BLE (부저 + LED 경보) |
| 스트리밍 | LiveKit WebRTC (VP8 코덱) |
| 디바이스 통신 | BLE (1.6% 듀티, 1년+ 배터리) |

### 인프라 / DevOps
| 항목 | 기술 |
|------|------|
| IaC | Terraform (HCL) |
| 클라우드 | AWS (us-west-2) |
| 컴퓨팅 | EC2 (t3.medium API + m5.xlarge LiveKit) |
| DB | RDS PostgreSQL 15.12 |
| 캐시 | ElastiCache Redis |
| 저장소 | S3 Standard |
| 레지스트리 | ECR (api-server, livekit-server) |
| 미디어 서버 | LiveKit + Egress (Docker Compose) |
| CI/CD | GitHub Actions (OIDC → ECR → SSM → EC2) |

---

## 7. 기대 효과

| 효과 | 내용 |
|------|------|
| **신속 탐지 및 피해 최소화** | 초기 대응 시간 단축 (약 **78.5ms** 추론 소요), 인명/재산 피해 규모 최소화 |
| **건물 외부 알림** | FCM 푸시 알림 + 실시간 영상으로 건물 **외부에서도 즉각 대응** 가능 |
| **확장성 및 유지보수** | 소프트웨어 구조의 무관한 형태로 다양한 공간에 적용 가능, 모델 교체 시 추가 비용 없이 업데이트 |
| **저전력 IoT** | BLE 슬레이브 노드 1년+ 배터리 운용, 설치 및 유지 비용 최소화 |

---

## 8. 개발 명령어 참조

### 모바일 앱
```bash
npm start               # Expo 개발 서버
npm run android         # Android 빌드 및 실행
npm run ios             # iOS 빌드 및 실행
npm run web             # 웹 버전 실행

# EAS 빌드
eas build --platform android --profile development
eas build --platform android --profile production
```

### 백엔드 서버
```bash
./gradlew build                               # 빌드
./gradlew build -Dspring.profiles.active=dev   # dev 프로필 빌드
docker build -t ember-sentinel-server .        # Docker 이미지 빌드
```

### AI 모델
```bash
python preprocessing.py   # 데이터셋 전처리
python train.py           # 모델 학습 (30 epochs)
python inference.py       # 추론 테스트 (mAP 검증)
python export.py          # NCNN 포맷 변환 (엣지 배포용)
```

### 인프라
```bash
terraform init            # Terraform 초기화
terraform plan            # 변경 사항 미리보기
terraform apply           # AWS 인프라 프로비저닝
```
