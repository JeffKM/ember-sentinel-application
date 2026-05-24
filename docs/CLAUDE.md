# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Ember Sentinel**은 Edge AI 카메라를 활용한 조기 화재·연기 감지 및 실시간 CCTV 모니터링 서비스이다. 인하대학교 캡스톤 디자인 프로젝트(팀: `inha-capstone-04`)로, 5개의 레포지토리가 하나의 시스템을 구성한다.

### 전체 시스템 아키텍처

```
[USB 카메라] → [Raspberry Pi + YOLOv11 (edge-IoT)]
                    │
                    ├── BLE → [Arduino Nano 33 BLE] → 부저 경보
                    │
                    ├── HTTP POST → [Spring Boot API 서버 (ember-sentinel-server)]
                    │                    ├── PostgreSQL (RDS)
                    │                    ├── Redis (토큰/캐시)
                    │                    └── FCM 푸시 알림 → [모바일 앱 (ember-sentinel)]
                    │
                    └── WebRTC → [LiveKit Cloud (SFU)]
                                    ├── 실시간 스트리밍 → [모바일 앱]
                                    └── Egress 녹화 → [S3]

[Terraform (Terraform-Bastion-Server)] → AWS 인프라 프로비저닝 (EC2, RDS, S3)
[ember-sentinel-ai] → YOLOv11 모델 학습/NCNN 변환 파이프라인
```

### 레포지토리 구성

| 레포지토리                   | 역할                          | 기술 스택                                                |
| ---------------------------- | ----------------------------- | -------------------------------------------------------- |
| **ember-sentinel** (현재)    | 모바일 앱 (React Native/Expo) | React Native 0.81, Expo 54, React 19, JavaScript         |
| **ember-sentinel-server**    | 백엔드 API 서버               | Java 17, Spring Boot 3.5, PostgreSQL, Redis, LiveKit, S3 |
| **ember-sentinel-ai**        | 화재/연기 감지 AI 모델 학습   | Python, YOLOv11n, Ultralytics, NCNN                      |
| **edge-IoT**                 | 엣지 디바이스 (Raspberry Pi)  | Python, OpenCV, LiveKit SDK, Bleak (BLE), YOLO NCNN      |
| **Terraform-Bastion-Server** | AWS 인프라 (IaC)              | Terraform, AWS (EC2, RDS, S3, ECR)                       |

---

## 모바일 앱 (ember-sentinel) — 현재 레포지토리

### 기술 스택

- **React Native** 0.81 + **Expo** 54 (New Architecture 활성화)
- **React** 19, **TypeScript**
- **React Navigation** 7 (Stack Navigator)
- **Firebase** 12 (FCM 푸시 알림) + Expo Notifications (폴백)
- **AsyncStorage** (로컬 상태 저장: 토큰, 사용자 정보, FCM 토큰)
- **소셜 로그인**: @react-native-google-signin, @react-native-kakao
- **Hermes** JS 엔진 활성화

### 개발 명령어

```bash
npm start               # Expo 개발 서버 실행
npm run android         # Android 빌드 및 실행 (expo run:android)
npm run ios             # iOS 빌드 및 실행 (expo run:ios)
npm run web             # 웹 버전 실행

# EAS 빌드
eas build --platform android --profile development
eas build --platform android --profile production
```

iOS 첫 빌드 전 `cd ios && pod install` 필요.

### 진입점 및 네비게이션

`App.js`가 루트 컴포넌트. 로그인 상태에 따라 조건부로 화면 스택을 렌더링한다:

- 미로그인: `LoginScreen`
- 로그인 후: `Home → RoomDetail → FireAlertDetail → CCTVLive → FireLocation → FireEventHistory → FireEventVideo`

### 디렉토리 구조

- `src/screens/` — 화면 컴포넌트 (9개: Splash, Login, Home, RoomDetail, FireAlertDetail, CCTVLive, FireLocation, FireEventHistory, FireEventVideo)
- `src/config/` — 설정 파일 (api.js, firebase.js, socialLogin.js)
- `src/components/` — 재사용 UI 컴포넌트 (PushNotificationBanner 등)
- `src/utils/` — 유틸리티 (networkTest.js, pushNotification.js)

### 인증 흐름

1. 소셜 로그인(Google/Kakao)으로 accessToken 획득
2. 백엔드 `POST /auth/google` 또는 `POST /auth/kakao`에 토큰 전달
3. 서버가 `userToken`(JWT), `refreshToken`, 사용자 정보 반환
4. AsyncStorage에 저장 후 FCM 토큰 초기화 및 서버 등록
5. `refreshToken` 없으면 오프라인 모드로 판단 → 샘플 데이터 사용

### API 클라이언트

`src/config/api.js`의 `apiRequest()`가 모든 API 호출을 처리한다. Bearer 토큰 인증, 10초 타임아웃, JSON 파싱을 내장한다. 백엔드 base URL은 이 파일 상단에 정의되어 있다. 방(Room) CRUD, 사용자/카메라 관리, 인증, FCM 토큰 등록 등 30개 이상의 API 함수를 제공한다.

### 푸시 알림

`src/config/firebase.js`에서 FCM 토큰 발급·등록·리스너 설정을 담당한다.

- 네이티브 빌드: Firebase 네이티브 토큰 사용
- Expo Go: Expo Push Token으로 폴백
- 포그라운드: `PushNotificationBanner` 커스텀 배너 표시 (시스템 알림 X)
- 백그라운드: 시스템 알림으로 처리
- iOS 시뮬레이터에서는 FCM 토큰 발급 불가 (실기기 필요)

### 빌드 관련 주의사항

- **Metro 설정**: `metro.config.js`에서 `unstable_enablePackageExports = false`로 새 아키텍처 호환성 문제 우회
- **Android Gradle**: Kotlin 컴파일 전에 R/BuildConfig 생성을 위한 빌드 순서 의존성이 추가되어 있음 (`android/app/build.gradle`)
- **Kakao SDK**: `android/build.gradle`에 Kakao Maven 저장소(`https://devrepo.kakao.com/...`) 설정 필요
- **Android SDK**: `android/local.properties`에 SDK 경로 설정 필요 (`./android-setup.sh`로 자동 구성 가능)
- **Hermes 엔진**: 활성화 상태 (gradle.properties)
- **번들 ID**: `com.embersentinel.app` (iOS/Android 공통)

### 레포에 포함되지 않는 필수 파일

- `google-services.json` — Firebase Android 설정 (프로젝트 루트에 배치)
- `ios/EmberSentinel/GoogleService-Info.plist` — Firebase iOS 설정
- `android/local.properties` — Android SDK 경로 (자동 생성)

---

## 백엔드 API 서버 (ember-sentinel-server)

- **GitHub**: `JeffKM/ember-sentinel-server` (기본 브랜치: `dev`)
- **조직**: `com.inha-capstone-04`

### 기술 스택

- **Java 17**, **Spring Boot 3.5**, Gradle
- **Spring Data JPA** + **PostgreSQL** (Hibernate ddl-auto: update)
- **Redis** (Lettuce — JWT Refresh Token, FCM 토큰 캐싱)
- **LiveKit** SDK 0.10.1 (WebRTC 실시간 스트리밍)
- **Firebase Admin SDK** 9.4.3 (FCM 푸시 알림)
- **AWS S3** SDK 2.21.1 (영상 녹화 Presigned URL)
- **Springdoc OpenAPI** (Swagger UI)
- **JWT** (jjwt 0.11.5) — Access Token + Refresh Token
- **Docker** (eclipse-temurin:17-jre)

### 아키텍처: 레이어드 + CQRS

각 도메인이 Command/Query 분리 패턴을 따른다:

- `XXXCommandController → XXXCommandService → Repository` (생성/수정/삭제)
- `XXXQueryController → XXXQueryService → Repository` (조회)
- Java `record`를 활용한 DTO 패턴

### 도메인 구조

| 도메인         | 설명                                                     |
| -------------- | -------------------------------------------------------- |
| `user/`        | 사용자, OAuth2 인증 (Google/Kakao/Email), JWT 발급       |
| `building/`    | 건물 CRUD                                                |
| `room/`        | 방(공간) CRUD, 멤버십 관리 (VIEWER/EDITOR 권한)          |
| `camera_edge/` | 카메라 엣지 디바이스 등록/삭제                           |
| `fire_event/`  | 화재 이벤트 기록, 임베디드 디바이스 → 서버 Publish       |
| `media/`       | 스트리밍(LiveKit) 관리, 녹화(S3) 관리                    |
| `common/`      | FCM, S3, Redis, LiveKit, JWT, 예외 처리, Swagger 설정    |
| `security/`    | AuthInterceptor (JWT 검증), CORS, @AuthorizedUser 리졸버 |

### 주요 API 엔드포인트

| 경로                                              | 설명                                                      | 인증         |
| ------------------------------------------------- | --------------------------------------------------------- | ------------ |
| `POST /auth/google`, `/auth/kakao`, `/auth/email` | 소셜/이메일 로그인                                        | 불필요       |
| `POST /auth/token/refresh`                        | JWT 재발급                                                | 불필요       |
| `GET /user/info`                                  | 사용자 정보                                               | JWT          |
| `POST /user/fcm/token`                            | FCM 토큰 등록                                             | JWT          |
| `GET /room/list/me`                               | 내 방 목록 (페이징)                                       | JWT          |
| `GET /room/{roomId}/detail`                       | 방 상세 (멤버, 카메라, 화재 상태)                         | JWT          |
| `POST /room`                                      | 방 생성                                                   | JWT          |
| `POST /room/{roomId}/camera-edge`                 | 카메라 등록                                               | JWT          |
| `POST /embedded/fire-event/publish`               | 화재 감지 이벤트 발행 (엣지 디바이스용)                   | 불필요       |
| `GET /fire-event/{id}/stream/subscribe`           | CCTV 라이브 시청 토큰                                     | JWT          |
| `GET /fire-event/{id}/record`                     | 녹화 영상 S3 Presigned URL                                | JWT          |
| `POST /livekit/webhook`                           | LiveKit 이벤트 수신 (participant join/leave, egress 종료) | LiveKit 서명 |

### 화재 이벤트 플로우

1. 엣지 디바이스가 화재 감지 → `POST /embedded/fire-event/publish`
2. 서버: FireEvent + MediaStream 생성 → LiveKit Room 생성 + Egress(녹화) 시작
3. FCM으로 해당 방 모든 멤버에게 비동기 푸시 알림 (`@Async`)
4. LiveKit Webhook:
   - `participant_joined` → 스트리밍 상태 LIVE
   - `participant_disconnected` → 스트리밍 상태 ENDED + Room 삭제
   - `egress_ended` → S3 녹화 경로를 MediaRecord에 저장

### DB 스키마 (JPA 엔티티 기반, 7개 테이블)

```
Building 1 ─── * Room 1 ─── * CameraEdge 1 ─── * FireEvent
                  │                                   │
                  * UserRoomMembership *              1 ── 1 MediaStream
                  │                                   1 ── 1 MediaRecord
               User *
```

- `users`: email, nickname, profile_image_url, user_role, auth_type, fcm_token
- `building`: building_name
- `room`: room_alias, building_location_floor, room_number, building_id(FK)
- `user_room_membership`: user_id(FK), room_id(FK), role (VIEWER/EDITOR), UNIQUE(user_id, room_id)
- `camera_edge`: device_uuid, camera_edge_alias, room_id(FK)
- `fire_event`: detection_type (FIRE/SMOKE), fire_cause, risk_rank, camera_edge_id(FK)
- `media_stream`: livekit_room_name, streaming_status (PENDING/LIVE/ENDED), fire_event_id(FK)
- `media_record`: s3_bucket_path, fire_event_id(FK)

### 빌드/실행

```bash
./gradlew build -Dspring.profiles.active=dev   # 빌드
./gradlew test                                  # 테스트
```

### CI/CD

- **CI** (`ci.yml`): `dev` push / `main` PR → Gradle 빌드 + 테스트
- **Dev CD** (`dev-cd.yml`): `dev` push → Docker 빌드 → AWS ECR → EC2 배포 (SSM)
- **Prod CD** (`prod-cd.yml`): `main` push → Docker 빌드 → AWS ECR → Prod EC2 배포
- AWS 인증: OIDC (GitHub Actions → IAM Role `inha-capstone-04-cicd-role`)

### 시크릿 관리

`src/main/resources/secrets/`가 별도 private 레포의 Git submodule로 관리된다. JWT, PostgreSQL, Redis, LiveKit, AWS S3, Firebase 설정이 포함된다.

---

## AI 모델 학습 (ember-sentinel-ai)

- **GitHub**: `JeffKM/ember-sentinel-ai` (기본 브랜치: `main`)

### 기술 스택

- **Python**, **YOLOv11n** (Ultralytics 8.3), **NCNN** (엣지 추론 엔진)
- 데이터셋: **FASDD_CV** (Fire And Smoke Detection Dataset)
- 감지 클래스: `fire` (0), `smoke` (1)

### ML 파이프라인

| 단계      | 스크립트           | 설명                                                                     |
| --------- | ------------------ | ------------------------------------------------------------------------ |
| 1. 전처리 | `preprocessing.py` | FASDD_CV 데이터셋을 Ultralytics 표준 구조로 변환, `fasdd_data.yaml` 생성 |
| 2. EDA    | `eda.py`           | 클래스 분포, 바운딩 박스 면적/종횡비 분석 → `eda_results/`               |
| 3. 학습   | `train.py`         | YOLOv11n 파인튜닝 (epochs=30, imgsz=640, batch=32, AMP, early stopping)  |
| 4. 변환   | `export.py`        | PyTorch → NCNN 포맷 (FP16 Half Precision)                                |
| 5. 평가   | `inference.py`     | NCNN 모델로 테스트셋 mAP/precision/recall 측정                           |

### 실행 명령어

```bash
python -m venv venv && source ./venv/bin/activate
pip install -r requirements.txt
python preprocessing.py   # 데이터 전처리
python train.py           # 모델 학습 (GPU 권장)
python export.py          # NCNN 변환
python inference.py       # 평가
```

### 외부 리소스 (Google Drive 다운로드 필요)

- **FASDD_CV.zip**: 데이터셋 → 프로젝트 루트에 배치
- **yolov11n.zip**: 학습된 모델 → `experiments/` 폴더에 배치

---

## 엣지 디바이스 (edge-IoT)

- **GitHub**: `JeffKM/edge-IoT` (기본 브랜치: `main`)

### 기술 스택

- **Python** (84.5%), **C++/Arduino** (15.5%)
- OpenCV, Ultralytics YOLO (NCNN), LiveKit Python SDK (WebRTC), Bleak (BLE)
- 하드웨어: Raspberry Pi + USB 카메라, Arduino Nano 33 BLE + 부저

### 구성 파일 (3개)

| 파일          | 역할                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `main.py`     | 핵심 시스템: 카메라 캡처 → YOLO 추론 → BLE 경보 → LiveKit 스트리밍 → 서버 이벤트 발행 |
| `client.py`   | 테스트용 LiveKit 스트리밍 클라이언트 (YOLO/BLE 없이 순수 스트리밍)                    |
| `arduino.ino` | Arduino 펌웨어: BLE로 명령 수신 → 부저 10초간 ON/OFF (0.5초 간격)                     |

### 동작 로직 (main.py)

1. USB 카메라에서 프레임 캡처 (640x480)
2. YOLOv11 NCNN 모델로 화재/연기 감지 (confidence ≥ 0.4)
3. **감지 시**: BLE로 Arduino에 경보 명령 전송 (쿨다운 10초)
4. **감지 시**: `POST /embedded/fire-event/publish`로 서버에 이벤트 발행 → LiveKit 토큰 수령
5. LiveKit에 WebRTC로 실시간 영상 스트리밍 (최대 30초, 미감지 10초 지속 시 자동 중단)
6. 스트리밍 재시작 딜레이: 60초

### 설정 (코드 하드코딩)

- LiveKit 서버: Terraform 코드에는 `ws://54.187.131.131:7880`이 남아있으나, 실제 운영은 **LiveKit Cloud** (`<YOUR_LIVEKIT_URL>`) 사용
- API 서버: `http://<YOUR_SERVER_IP>:8080` (ap-southeast-2)
- YOLO 모델: `./experiments/yolov11n/weights/best_ncnn_model`
- Arduino BLE MAC: `90:9F:4D:1A:35:A1`

---

## AWS 인프라 (Terraform-Bastion-Server)

- **GitHub**: `JeffKM/Terraform-Bastion-Server` (기본 브랜치: `main`)
- **로컬 경로**: `~/Projects/Terraform-Bastion-Server`

### 기술 스택

- **Terraform** (HCL), AWS Provider ~> 5.0
- AWS 리전: `ap-southeast-2` (시드니)
- Bastion EC2 내에서 Terraform 실행 (IAM Role 자동 상속)

### 실제 운영 중인 AWS 리소스 (2026.05 기준)

| 리소스                         | 사양                                | 용도                                 | 비용              |
| ------------------------------ | ----------------------------------- | ------------------------------------ | ----------------- |
| **EC2** (`ember-sentinel-api`) | t3.micro                            | Spring Boot API 서버 (단일 인스턴스) | 프리 티어 (무료)  |
| **RDS**                        | db.t4g.micro, PostgreSQL            | ember_sentinel DB                    | RDS 크레딧 적용   |
| **S3**                         | inha-capstone-04-s3-bucket-{random} | 녹화 영상 저장                       | 프리 티어 범위 내 |

> **참고**: Terraform 코드에는 EC2 2대(API t3.medium + LiveKit m5.xlarge) 구성이 정의되어 있으나,
> 실제로는 t3.micro 단일 인스턴스(`ember-sentinel-api`, IP: <YOUR_SERVER_IP>)만 운영 중이다.
> LiveKit은 별도 EC2 없이 동일 인스턴스 또는 외부 서비스로 처리하는 것으로 보인다.

### AWS 비용 현황

- **AWS 프리 티어** 크레딧: $100 (만료: 2027.05.21)
- **RDS 크레딧**: $20 (만료: 2027.05.21)
- **현재 실 청구액**: $0 (크레딧으로 충당)

### 디렉토리 구조

```
├── provider.tf          # AWS, Random, HTTP 프로바이더
├── variables.tf         # 입력 변수 (sensitive: db_password, livekit_api_key/secret)
├── main.tf              # 전체 리소스 정의
├── outputs.tf           # 배포 후 출력값 (IP, 엔드포인트, ECR URL)
└── templates/           # EC2 User Data 및 설정 파일 템플릿
    ├── api_server_userdata.sh
    ├── livekit_userdata.sh
    ├── livekit.yaml.tftpl
    ├── egress.yaml.tftpl
    └── docker-compose.livekit.yml
```

### 배포 명령어

```bash
terraform init
terraform plan -var-file="secrets.tfvars"
terraform apply -var-file="secrets.tfvars"
terraform destroy -var-file="secrets.tfvars"   # 인프라 전체 파괴
```

### 필수 입력 변수 (secrets.tfvars)

- `ec2_key_pair_name`, `existing_instance_profile_name`
- `my_bastion_ip`, `dev_ec2_cidr_blocks`, `target_vpc_id`
- `db_username`, `db_password` (sensitive)
- `livekit_api_key`, `livekit_api_secret` (sensitive)

---

## 크로스 레포지토리 데이터 흐름

```
1. [edge-IoT] YOLO 화재 감지
    → POST /embedded/fire-event/publish → [ember-sentinel-server]
    → 서버: FireEvent 생성 + LiveKit Room 생성 + Egress 시작
    → FCM 푸시 알림 → [ember-sentinel 모바일 앱]

2. [edge-IoT] LiveKit WebRTC 스트리밍
    → [LiveKit Cloud] (<YOUR_LIVEKIT_URL>)
    → [ember-sentinel 모바일 앱] GET /fire-event/{id}/stream/subscribe로 시청 토큰 발급

3. [LiveKit Cloud Egress] 녹화 종료
    → S3에 영상 저장
    → POST /livekit/webhook → [ember-sentinel-server] MediaRecord 업데이트
    → [ember-sentinel 모바일 앱] GET /fire-event/{id}/record로 Presigned URL 수령

4. [ember-sentinel-ai] 학습된 NCNN 모델
    → [edge-IoT] experiments/yolov11n/weights/best_ncnn_model에 배치하여 사용
```
