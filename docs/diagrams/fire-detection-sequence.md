# 화재 감지 → 알림 → 스트리밍 시퀀스 다이어그램

> ADR 참조: [ADR-001 SFU/LiveKit](../adr/ADR-001-sfu-livekit.md), [ADR-002 YOLOv11n](../adr/ADR-002-yolov11n-ncnn.md), [ADR-008 Egress 녹화](../adr/ADR-008-webrtc-egress-recording.md)

## 전체 흐름

```mermaid
sequenceDiagram
    autonumber
    participant Camera as USB 카메라
    participant Edge as 엣지 디바이스<br/>(Raspberry Pi 5)
    participant Arduino as Arduino Nano 33 BLE<br/>(부저 경보)
    participant API as API 서버<br/>(Spring Boot)
    participant DB as PostgreSQL
    participant Redis as Redis
    participant LiveKit as LiveKit SFU 서버
    participant S3 as AWS S3 / MinIO
    participant FCM as Firebase FCM
    participant App as 모바일 앱<br/>(React Native)

    Note over Camera, App: 1단계: 화재 감지

    Camera->>Edge: 프레임 캡처 (640×480)
    Edge->>Edge: YOLOv11n NCNN 추론<br/>(~78.5ms/프레임)
    Edge->>Edge: confidence ≥ 0.4 → 화재/연기 감지

    Note over Camera, App: 2단계: 로컬 경보

    Edge->>Arduino: BLE 경보 명령 전송
    Arduino->>Arduino: 부저 10초간 ON/OFF<br/>(0.5초 간격)

    Note over Camera, App: 3단계: 서버 이벤트 발행

    Edge->>API: POST /embedded/fire-event/publish<br/>{cameraEdgeId, detectionType, fireCause, riskRank}
    API->>DB: FireEvent 생성
    API->>DB: MediaStream 생성 (상태: PENDING)
    API->>LiveKit: Room 생성 요청
    LiveKit-->>API: Room 생성 완료
    API->>LiveKit: Room Composite Egress 시작
    LiveKit-->>API: Egress ID 반환
    API-->>Edge: 200 OK + LiveKit Token

    Note over Camera, App: 4단계: 푸시 알림 (비동기)

    API-)FCM: 해당 방 멤버 전체에 푸시 알림 (@Async)
    FCM-)App: 화재 감지 알림<br/>{title, body, fireEventId}
    App->>App: 포그라운드: 배너 표시<br/>백그라운드: 시스템 알림

    Note over Camera, App: 5단계: 실시간 스트리밍

    Edge->>LiveKit: WebRTC 연결 + 영상 발행
    LiveKit->>API: Webhook: participant_joined
    API->>DB: MediaStream 상태 → LIVE

    App->>API: GET /fire-event/{id}/stream/subscribe
    API-->>App: LiveKit 시청 토큰
    App->>LiveKit: WebRTC 연결 + 영상 구독
    LiveKit->>App: 실시간 영상 스트리밍 (SFU 포워딩)

    Note over Camera, App: 6단계: 스트리밍 종료 + 녹화 저장

    Edge->>Edge: 미감지 10초 지속 → 스트리밍 중단
    Edge->>LiveKit: Room 퇴장
    LiveKit->>API: Webhook: participant_disconnected
    API->>DB: MediaStream 상태 → ENDED
    API->>LiveKit: Room 삭제 요청

    LiveKit->>S3: Egress 녹화 파일 업로드 (MP4)
    LiveKit->>API: Webhook: egress_ended<br/>{s3BucketPath}
    API->>DB: MediaRecord 생성 (S3 경로 저장)

    Note over Camera, App: 7단계: 녹화 영상 재생

    App->>API: GET /fire-event/{id}/record
    API->>S3: Presigned URL 생성 (1시간 유효)
    API-->>App: Presigned URL
    App->>S3: MP4 영상 다운로드 및 재생
```

## 타이밍 요약

| 구간                             | 예상 소요 시간 |
| -------------------------------- | -------------- |
| 카메라 캡처 → YOLO 감지          | ~78.5ms        |
| 감지 → BLE 경보                  | ~200ms         |
| 감지 → 서버 이벤트 발행          | ~300ms         |
| 서버 → FCM 푸시 알림             | ~1-3초         |
| 서버 → LiveKit Room 생성         | ~500ms         |
| 엣지 → LiveKit 스트리밍 시작     | ~1-2초         |
| **화재 감지 → 모바일 알림 수신** | **~2-5초**     |

## 주요 설계 결정

1. **FCM 비동기 전송**: `@Async`로 푸시 알림을 비동기 처리하여 API 응답 지연 방지
2. **Egress 자동 시작**: Room 생성과 동시에 Egress를 시작하여 녹화 누락 방지
3. **자동 스트리밍 종료**: 미감지 10초 지속 시 자동 중단 + 재시작 60초 딜레이로 반복 방지
4. **Presigned URL**: S3 직접 접근 대신 시간 제한 URL로 영상 접근 제어
