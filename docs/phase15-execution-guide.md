# Phase 15: 프로덕션 데모 환경 — 수동 작업 실행 가이드

> 각 태스크의 구체적 실행 절차를 순서대로 정리한 종합 가이드

---

## 실행 순서 요약

```
Day 1 — 준비:
  1. T-060: Firebase Console → google-services.json 다운로드 + 루트 배치
  2. T-061: eas build --platform android --profile preview (빌드 10~15분)
  3. T-055: edge-IoT 클론 → venv → YOLO 모델 준비 → macOS 호환 검증

Day 2 — 시뮬레이터 + 서버 연동:
  4. T-056: config.production.yaml 생성 (EC2 + LiveKit Cloud URL)
  5. T-058: 샘플 화재 영상 준비
  6. T-063: 서버에 macOS 시뮬레이터 카메라 디바이스 등록
  7. T-061: 빌드된 APK 실기기 설치 + 로그인 + FCM 토큰 등록

Day 3 — E2E 검증:
  8. T-066: FCM 푸시 알림 E2E (시뮬레이터 or 수동 API)
  9. T-064: 실시간 스트리밍 E2E (시뮬레이터 → LiveKit → 앱)
  10. T-065: Egress 녹화 → S3 → 앱 재생 (LiveKit Egress 지원 여부에 따라)

Day 4 — 데모 자료:
  11. T-067: 9개 화면 스크린샷 (scrcpy/ADB)
  12. T-068: GIF 3개 녹화 + 변환 (scrcpy + ffmpeg)
  13. T-057: macOS 실행 가이드 문서화
```

---

## 1. T-060: google-services.json 준비

### 왜 필요한가

Firebase FCM 푸시 알림이 실기기에서 동작하려면 Firebase 프로젝트와 앱을 연결하는 `google-services.json` 파일이 필수.
`app.json:50`에 이미 `"googleServicesFile": "./google-services.json"` 설정이 되어 있음.

### 실행 절차

```bash
# 1. Firebase Console 접속
open https://console.firebase.google.com/

# 2. 프로젝트: ***REMOVED_FIREBASE_PROJECT*** 선택

# 3. 좌측 상단 톱니바퀴 → "프로젝트 설정" 클릭

# 4. "일반" 탭 → 하단 "내 앱" 섹션
#    Android 앱 (com.embersentinel.app)이 없으면:
#    → "앱 추가" → Android 선택
#    → 패키지 이름: com.embersentinel.app
#    → 앱 닉네임: Ember Sentinel (선택)

# 5. SHA-1 인증서 확인 (Google 로그인에 필요)
cd /Users/jefflee/Projects/ember-sentinel
eas credentials --platform android

# 6. google-services.json 다운로드 + 프로젝트 루트에 배치
cp ~/Downloads/google-services.json ./google-services.json

# 7. 파일 내용 검증
cat google-services.json | grep package_name
# 출력: "package_name": "com.embersentinel.app" 이어야 함

cat google-services.json | grep project_id
# 출력: "project_id": "***REMOVED_FIREBASE_PROJECT***" 이어야 함

# 8. EAS Secrets에 등록 (빌드 서버에서 접근 가능하도록)
eas secret:create --scope project \
  --name GOOGLE_SERVICES_JSON \
  --type file \
  --value ./google-services.json
```

### 확인 포인트

- [ ] `google-services.json`이 프로젝트 루트에 존재
- [ ] `package_name` = `com.embersentinel.app`
- [ ] `project_id` = `***REMOVED_FIREBASE_PROJECT***`
- [ ] EAS Secret에 등록 완료

---

## 2. T-061: EAS Build Android APK

### 사전 요구사항

- T-060 완료 (google-services.json 배치)
- EAS CLI 설치: `npm install -g eas-cli`
- Expo 계정 로그인: `eas login`

### 빌드 프로필 (eas.json)

| 프로필        | 용도               | Android 빌드타입         |
| ------------- | ------------------ | ------------------------ |
| `development` | 개발용 (DevClient) | AAB (기본)               |
| `preview`     | 테스트 배포용      | **APK** (직접 설치 가능) |
| `production`  | 스토어 배포용      | AAB                      |

### 실행 절차

```bash
# 1. 프로젝트 연결 확인
cd /Users/jefflee/Projects/ember-sentinel
eas project:info

# 2. google-services.json 존재 확인
ls -la google-services.json

# 3. APK 빌드 시작 (preview 프로필)
eas build --platform android --profile preview
# → 약 10~15분 소요
# → 빌드 URL이 터미널에 출력됨

# 4. 빌드 상태 모니터링
eas build:list --platform android

# 5. 빌드 완료 후 APK 다운로드
eas build:view --platform android

# 6-A. ADB로 실기기 설치
adb install ~/Downloads/ember-sentinel-*.apk

# 6-B. 또는 QR 코드/URL로 직접 설치
#   빌드 완료 시 QR 코드가 터미널에 표시됨
#   Android 폰에서 QR 스캔 → APK 다운로드 → 설치
#   (설정 → 보안 → "출처를 알 수 없는 앱 허용" 필요)
```

### 빌드 실패 시 대안

```bash
# 대안 1: 로컬 네이티브 빌드
npx expo prebuild --clean
npx expo run:android --variant release

# 대안 2: 로컬 Gradle APK 빌드
npx expo prebuild --clean
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
adb install app/build/outputs/apk/release/app-release.apk
```

### 실기기 설치 확인

- [ ] 앱 실행 → 스플래시 → 로그인 화면 정상 표시
- [ ] Google/Kakao 소셜 로그인 성공
- [ ] 홈 화면에서 서버 데이터 로딩 (방 목록)
- [ ] 설정 → 앱 정보 → 알림 권한 허용됨 확인

---

## 3. T-055~T-058: edge-IoT macOS 시뮬레이터 설정

> 상세 가이드는 edge-IoT 레포의 [`docs/macos-simulator-guide.md`](../../edge-IoT/docs/macos-simulator-guide.md) 참조

### T-055: YOLO 모델 준비 및 macOS 호환 검증

```bash
cd /Users/jefflee/Projects/edge-IoT

# 가상환경 생성 및 의존성 설치
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# YOLO 모델 준비 (Google Drive에서 학습된 모델 다운로드)
# → experiments/yolov11n/weights/best.pt 에 배치
# macOS에서는 .pt(PyTorch) 모델 직접 사용 (NCNN은 ARM Linux 전용)

# macOS 호환성 검증
python -c "
from ultralytics import YOLO
model = YOLO('experiments/yolov11n/weights/best.pt')
print('모델 로딩 성공')
"

python -c "import livekit; print('LiveKit SDK:', livekit.__version__)"

# 웹캠 테스트 (시스템 설정 → 개인 정보 보호 → 카메라 허용 필요)
python -c "
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
print('웹캠:', '성공' if ret else '실패', frame.shape if ret else '')
cap.release()
"
```

### T-056: config.production.yaml 생성

edge-IoT 레포에 `config.production.yaml` 생성. 자세한 내용은 edge-IoT 레포 참조.

### T-058: 샘플 화재 영상 준비 ✅

**완료 상태**: fire-sample.mp4(6초, 1.2MB) 앱 번들링 + YOLO 탐지 데이터 추출 완료

```bash
# 1. 샘플 영상 → 앱 assets에 번들링 완료
#    assets/videos/fire-sample.mp4 (6초, 1.2MB)

# 2. YOLO 탐지 데이터 추출 (best.pt 모델로 72프레임 분석)
cd /Users/jefflee/Projects/edge-IoT
source venv/bin/activate
python -c "
from ultralytics import YOLO
import cv2, json

model = YOLO('experiments/yolov11n/weights/best.pt')
cap = cv2.VideoCapture('samples/fire-sample.mp4')
# → 72프레임 탐지 결과 → assets/videos/fire-sample-detections.json
"

# 3. 앱에서 자동 동작:
#    S3 URL 실패 시 → 번들 샘플 영상 재생 + YOLO 탐지 박스 실시간 오버레이
#    fire(빨강) / smoke(노랑) 바운딩 박스 + 클래스명·신뢰도 라벨
#    100ms 간격 프레임 동기화

# 4. 시뮬레이터 E2E 테스트
python simulator.py --config config.production.yaml --source samples/fire-sample.mp4
```

**구현 파일:**

- `assets/videos/fire-sample.mp4` — 6초 화재 샘플 영상
- `assets/videos/fire-sample-detections.json` — YOLO 72프레임 탐지 좌표 (normalized)
- `src/screens/FireEventVideoScreen.tsx` — 3단계 폴백 + 탐지 오버레이

---

## 4. T-063~T-066: 크로스 레포 E2E 검증

> 자동화된 E2E 검증 헬퍼 스크립트: [`scripts/e2e-verify.sh`](../scripts/e2e-verify.sh)

### 사전 요구사항

- EC2 서버 가동 중 (`<YOUR_SERVER_IP>:8080`)
- Android 실기기에 APK 설치 완료 (T-061)
- edge-IoT 시뮬레이터 macOS 설정 완료 (T-055~T-058)

### T-063: 서버에 시뮬레이터용 카메라 디바이스 등록

```bash
# e2e-verify.sh 사용
cd /Users/jefflee/Projects/ember-sentinel
./scripts/e2e-verify.sh

# 또는 수동으로:

# 1. JWT 토큰 준비 (앱 로그인 후 서버로부터 받은 토큰)
ACCESS_TOKEN="<userToken>"

# 2. 방 목록 확인
curl -s http://<YOUR_SERVER_IP>:8080/room/list/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# 3. 카메라 디바이스 등록
ROOM_ID=1
DEVICE_UUID=$(uuidgen)

curl -X POST http://<YOUR_SERVER_IP>:8080/room/${ROOM_ID}/camera-edge \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceUuid\": \"${DEVICE_UUID}\",
    \"cameraEdgeAlias\": \"macOS-Webcam-Simulator\"
  }"

# 4. 등록 확인
curl -s http://<YOUR_SERVER_IP>:8080/room/${ROOM_ID}/detail \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### T-064: 실시간 스트리밍 E2E 검증

**방법 A: 통합 E2E 검증 스크립트 (권장)**

```bash
cd /Users/jefflee/Projects/ember-sentinel
./scripts/e2e-verify.sh
# 메뉴 7) 전체 E2E 플로우 선택 — T-064/065/066 순서대로 검증
```

**방법 B: 수동 검증**

```bash
# 터미널 1: edge-IoT 시뮬레이터
cd /Users/jefflee/Projects/edge-IoT
source venv/bin/activate
python simulator.py --config config.production.yaml
# 웹캠 앞에 화재 이미지를 보여주거나, --source samples/fire-sample.mp4

# 터미널 2: 스트리밍 토큰 발급 확인
FIRE_EVENT_ID=<화재이벤트ID>
curl -s http://<YOUR_SERVER_IP>:8080/fire-event/${FIRE_EVENT_ID}/stream/subscribe \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
# token + url 필드가 반환되면 성공

# Android 실기기에서 확인:
# 1. FCM 푸시 알림 수신
# 2. 알림 탭 → FireAlertDetail
# 3. "CCTV 보기" → CCTVLiveScreen
# 4. LIVE 배지 초록색 = 스트리밍 중
```

**검증 항목:**

- [x] 스트리밍 구독 토큰 API 정상 발급 (`/fire-event/{id}/stream/subscribe`)
- [x] LiveKit Cloud 접근 가능 (<YOUR_LIVEKIT_URL>)
- [ ] CCTVLiveScreen에서 실시간 영상 표시 + LIVE 배지 초록색
- [ ] 시뮬레이터 중단 시 자동 재연결 시도 (최대 3회)

### T-065: Egress 녹화 → S3 → 앱 재생

```bash
# 방법 A: e2e-verify.sh 메뉴 6) 녹화 영상 검증
# → S3 Presigned URL 발급 + HEAD 요청으로 Content-Type/크기 자동 검증

# 방법 B: 수동 검증
# 시뮬레이터 스트리밍 종료 대기 (미감지 10초 또는 최대 30초)
# 서버 측: LiveKit Webhook → MediaRecord에 S3 경로 저장

# S3 Presigned URL 조회:
FIRE_EVENT_ID=<화재이벤트ID>
curl -s http://<YOUR_SERVER_IP>:8080/fire-event/${FIRE_EVENT_ID}/record \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# Presigned URL 유효성 검증 (HEAD 요청):
RECORD_URL="<위에서 받은 recordUrl>"
curl -sI "$RECORD_URL" | head -5
# HTTP 200 + Content-Type: video/mp4 이면 성공
```

**검증 항목:**

- [x] 녹화 URL API 정상 응답 (`/fire-event/{id}/record`)
- [x] S3 Presigned URL HEAD 요청 → HTTP 200
- [x] Content-Type: video/mp4 또는 video/webm
- [x] 앱 FireEventVideoScreen에서 영상 재생 (S3 실패 시 번들 샘플 영상 + YOLO 탐지 오버레이 폴백)

### T-066: FCM 푸시 알림 실기기 E2E

```bash
# 방법 A: e2e-verify.sh 메뉴 4) 화재 이벤트 발행 + FCM 검증
# → 발행 후 FCM 수신 체크리스트 자동 출력

# 방법 B: 시뮬레이터 트리거 (T-064와 동일)

# 방법 C: 수동 API 호출
DEVICE_UUID="<등록된 카메라 UUID>"
curl -X POST http://<YOUR_SERVER_IP>:8080/embedded/fire-event/publish \
  -H "Content-Type: application/json" \
  -H "X-Device-API-Key: <디바이스 API 키>" \
  -d "{
    \"deviceUuid\": \"${DEVICE_UUID}\",
    \"detectionType\": \"FIRE\",
    \"riskRank\": 3
  }"
```

**검증 항목:**

- [x] 화재 이벤트 발행 API 성공 (`/embedded/fire-event/publish`)
- [ ] 포그라운드: 커스텀 배너 알림 표시
- [ ] 백그라운드: 시스템 알림 트레이에 표시
- [ ] 알림 탭 → FireAlertDetail 화면 자동 이동
- [ ] Cold start (앱 종료 상태) → 알림 탭 → 앱 실행 + 화면 이동

### E2E 검증 체크리스트

- [ ] 시뮬레이터 콘솔에 "화재 감지" 로그 출력
- [ ] 시뮬레이터 콘솔에 "LiveKit 연결 완료" 로그
- [ ] 앱에서 FCM 알림 수신 (포그라운드 배너 / 백그라운드 시스템 알림)
- [ ] CCTVLiveScreen에서 실시간 영상 표시 + LIVE 배지 초록색
- [ ] 배너/알림 탭 → FireAlertDetail 자동 이동
- [x] 화재 이력 → 녹화 영상 재생 (S3 URL 또는 번들 샘플 영상 + YOLO 오버레이)
- [ ] Cold start(앱 종료)에서 알림 탭 → 앱 열림 → FireAlertDetail

---

## 5. T-067~T-068: 실기기 스크린샷/GIF 캡처

### 도구 설치

```bash
brew install scrcpy ffmpeg gifski
which adb || brew install android-platform-tools
```

### T-067: 9개 화면 스크린샷

> 자동화 스크립트: [`scripts/capture-screenshots.sh`](../scripts/capture-screenshots.sh)

```bash
# ADB 연결 확인
adb devices

# 자동화 스크립트 실행 (각 화면 이동 후 Enter)
./scripts/capture-screenshots.sh
```

| 파일명                 | 화면              |
| ---------------------- | ----------------- |
| `01-splash.png`        | 스플래시 화면     |
| `02-login.png`         | 로그인 화면       |
| `03-home.png`          | 홈 화면 (방 목록) |
| `04-room-detail.png`   | 방 상세           |
| `05-fire-alert.png`    | 화재 경보 상세    |
| `06-cctv-live.png`     | CCTV 실시간 영상  |
| `07-fire-location.png` | 화재 위치 평면도  |
| `08-fire-history.png`  | 화재 이벤트 이력  |
| `09-recording.png`     | 녹화 영상 재생    |

### T-068: GIF 3개 녹화

> 변환 스크립트: [`docs/demos/convert-demos.sh`](../docs/demos/convert-demos.sh)

```bash
# GIF 1: 화재 감지 → 푸시 알림 (8~10초)
scrcpy --record docs/demos/fire-alert-raw.mp4
# 앱에서 알림 수신 장면 녹화 → Ctrl+C

# GIF 2: CCTV 실시간 스트리밍 (10~15초)
scrcpy --record docs/demos/cctv-live-raw.mp4
# 앱에서 CCTV Live 화면 녹화 → Ctrl+C

# GIF 3: 녹화 영상 재생 (8~10초)
scrcpy --record docs/demos/recording-playback-raw.mp4
# 앱에서 녹화 영상 재생 장면 녹화 → Ctrl+C

# 일괄 GIF 변환
cd docs/demos && ./convert-demos.sh
```

---

## 주요 리스크 및 대응

| 리스크                            | 증상                    | 대응                                                                |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| LiveKit Cloud Egress 미지원       | T-065에서 녹화 URL 없음 | EC2에 LiveKit self-hosted 배포, 또는 스트리밍만 데모                |
| google-services.json SHA-1 불일치 | Google 로그인 실패      | `eas credentials --platform android`로 SHA-1 확인 → Firebase에 등록 |
| LiveKit Python SDK macOS 미지원   | import 에러             | `pip install livekit --upgrade`, 또는 ffmpeg RTMP 폴백              |
| EC2 서버 다운                     | API 호출 타임아웃       | `ssh ec2-user@<YOUR_SERVER_IP>` → Docker 재시작, 또는 앱 데모 모드  |
| scrcpy 연결 실패                  | ADB device not found    | USB 디버깅 활성화, `adb devices` 확인, USB 케이블 교체              |
