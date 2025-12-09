# Google Sign-In SDK 설정 가이드

이 가이드는 `@react-native-google-signin/google-signin`을 사용하여 Google 로그인을 구현하는 방법입니다.

## ⚠️ 중요 사항

**이 방법은 Development Build에서만 작동합니다. Expo Go에서는 작동하지 않습니다.**

## 1. 패키지 설치

```bash
npm install @react-native-google-signin/google-signin
```

## 2. Google Cloud Console 설정

### 2.1. iOS 클라이언트 ID

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **APIs & Services** > **Credentials**로 이동
3. **Create Credentials** > **OAuth client ID** 선택
4. **Application type**: iOS
5. **Name**: Ember Sentinel iOS
6. **Bundle ID**: `com.embersentinel.app` (app.json의 `ios.bundleIdentifier` 참조)

**Client ID**: `src/config/socialLogin.js`의 `iosClientId`에 설정

### 2.2. Android 클라이언트 ID

1. **Create Credentials** > **OAuth client ID** 선택
2. **Application type**: Android
3. **Name**: Ember Sentinel Android
4. **Package name**: `com.embersentinel.app` (app.json의 `android.package` 참조)
5. **SHA-1 certificate fingerprint**: (필요시 추가)

**Client ID**: `src/config/socialLogin.js`의 `androidClientId`에 설정

### 2.3. Web 클라이언트 ID

1. **Create Credentials** > **OAuth client ID** 선택
2. **Application type**: Web application
3. **Name**: Ember Sentinel Web
4. **Authorized redirect URIs**: (필요시 추가)

**Client ID**: `src/config/socialLogin.js`의 `clientId`에 설정

## 3. 네이티브 빌드 생성

Development build를 생성해야 합니다:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

또는 EAS Build 사용:

```bash
# Development build
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

## 4. 코드 설정

`src/screens/LoginScreen.js`에서 Google Sign-In이 이미 구현되어 있습니다:

```javascript
GoogleSignin.configure({
  iosClientId: GOOGLE_CONFIG.iosClientId,
  webClientId: GOOGLE_CONFIG.clientId,
});
```

## 5. 테스트

1. Development build 앱 실행
2. "구글로 계속하기" 버튼 클릭
3. Google 계정 선택 및 로그인

## 6. 문제 해결

### "Google Sign-In은 Development Build에서만 작동합니다" 메시지
- Expo Go를 사용 중입니다. Development build를 생성하세요.

### "PLAY_SERVICES_NOT_AVAILABLE" 오류 (Android)
- Google Play Services가 설치되어 있는지 확인
- 에뮬레이터가 아닌 실제 기기에서 테스트

### "SIGN_IN_CANCELLED" 오류
- 사용자가 로그인을 취소했습니다. 정상 동작입니다.

### iOS에서 작동하지 않음
- `app.json`의 `ios.bundleIdentifier`가 Google Cloud Console의 Bundle ID와 일치하는지 확인
- `GoogleService-Info.plist` 파일이 `ios/` 디렉토리에 있는지 확인

## 7. Expo Go 사용 시

Expo Go를 계속 사용하려면 `expo-auth-session`을 사용해야 합니다. 하지만 `redirect_uri_mismatch` 문제가 발생할 수 있습니다.

## 참고 자료

- [@react-native-google-signin/google-signin 문서](https://github.com/react-native-google-signin/google-signin)
- [Expo Development Build 가이드](https://docs.expo.dev/development/introduction/)












