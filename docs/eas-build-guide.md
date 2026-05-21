# EAS Build 실기기 배포 가이드

> Ember Sentinel 모바일 앱을 실제 Android 디바이스에 설치하는 단계별 가이드

---

## 사전 요구사항

- Node.js 20+
- EAS CLI: `npm install -g eas-cli`
- Expo 계정 로그인: `eas login`
- Firebase 프로젝트 설정 완료

---

## 1단계: google-services.json 준비 (T-060)

### Firebase Console에서 다운로드

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. `Ember Sentinel` 프로젝트 선택
3. **프로젝트 설정** → **일반** → **내 앱** → Android 앱 (`com.embersentinel.app`)
4. `google-services.json` 다운로드
5. 프로젝트 루트에 배치:

```bash
cp ~/Downloads/google-services.json ./google-services.json
```

> `app.json:50`에 이미 `"googleServicesFile": "./google-services.json"` 설정됨

### EAS Secrets 등록

빌드 서버에서 `google-services.json`에 접근할 수 있도록 EAS Secrets에 등록:

```bash
# 파일 내용을 시크릿으로 등록
eas secret:create --scope project \
  --name GOOGLE_SERVICES_JSON \
  --type file \
  --value ./google-services.json
```

---

## 2단계: EAS Build 설정 확인 (T-059)

### eas.json 프로필

`eas.json`에 3개 빌드 프로필이 설정되어 있습니다:

| 프로필        | 용도               | Android 빌드타입         |
| ------------- | ------------------ | ------------------------ |
| `development` | 개발용 (DevClient) | AAB (기본)               |
| `preview`     | 테스트 배포용      | **APK** (직접 설치 가능) |
| `production`  | 스토어 배포용      | AAB                      |

### 환경변수

모든 프로필에 `EXPO_PUBLIC_API_BASE_URL`이 설정되어 있습니다:

```
EXPO_PUBLIC_API_BASE_URL=http://***REMOVED_IP***:8080
```

> `src/config/api.ts:52`에서 `process.env.EXPO_PUBLIC_API_BASE_URL`로 참조

---

## 3단계: Android APK 빌드 (T-061)

### preview 프로필로 APK 빌드

```bash
eas build --platform android --profile preview
```

빌드 완료까지 약 10~15분 소요. 완료 후 APK 다운로드 링크가 제공됩니다.

### 빌드 상태 확인

```bash
eas build:list --platform android
```

### APK 다운로드 및 설치

```bash
# 빌드 완료 후 APK URL 확인
eas build:view --platform android

# Android 디바이스에 ADB로 설치
adb install <다운로드된.apk>
```

또는 빌드 완료 시 제공되는 QR 코드/URL을 Android 디바이스에서 직접 열어 설치합니다.

---

## 4단계: 실기기 설치 확인

### 필수 확인사항

1. **네트워크**: Android 디바이스가 EC2 서버(`***REMOVED_IP***:8080`)에 접근 가능한 네트워크에 연결
2. **Google Play Services**: FCM 알림 수신을 위해 Google Play Services 설치 필요
3. **알림 권한**: 앱 최초 실행 시 알림 권한 허용

### 동작 검증 체크리스트

- [ ] 앱 실행 → 스플래시 → 로그인 화면 정상 표시
- [ ] Google/Kakao 소셜 로그인 성공
- [ ] 홈 화면에서 서버 데이터 로딩 (방 목록)
- [ ] FCM 푸시 알림 수신 (화재 시뮬레이션 시)
- [ ] CCTV 실시간 스트리밍 시청 (LiveKit WebRTC)
- [ ] 녹화 영상 재생 (S3 Presigned URL)

---

## 트러블슈팅

### LiveKit WebRTC가 Expo Go에서 동작하지 않음

LiveKit은 네이티브 모듈이므로 Expo Go에서 사용 불가. 반드시 EAS Build 또는 로컬 네이티브 빌드가 필요합니다.

```bash
# 로컬 네이티브 빌드 (EAS Build 실패 시 대안)
npx expo prebuild --clean
npx expo run:android
```

### EAS Build 실패: 네이티브 의존성 문제

```bash
# prebuild로 네이티브 프로젝트 생성 후 로컬 빌드
npx expo prebuild --clean
cd android && ./gradlew assembleRelease
```

### google-services.json 누락 에러

```
Error: google-services.json not found
```

→ 프로젝트 루트에 `google-services.json` 파일이 있는지 확인. `.gitignore`에 포함되어 있으므로 수동 배치 필요.

---

## iOS TestFlight 배포 (T-062, 선택)

```bash
# iOS 빌드 (Apple Developer 계정 필요)
eas build --platform ios --profile preview

# TestFlight에 제출
eas submit --platform ios
```

> iOS는 Apple Developer Program ($99/년) 가입이 필요합니다.
