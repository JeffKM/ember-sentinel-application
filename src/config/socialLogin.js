// Expo proxy redirect URI (네이티브/웹 공통 고정)
export const AUTH_REDIRECT_URI = 'https://auth.expo.io/@jeffkm/ember-sentinel';

// 소셜 로그인 설정
// 실제 앱에서는 이 값들을 환경 변수나 보안 저장소에 저장해야 합니다

export const GOOGLE_CONFIG = {
  // Web 클라이언트 ID - AuthSession에서 사용
  // Redirect URI: https://auth.expo.io/@jeffkm/ember-sentinel
  clientId: '***REMOVED_GOOGLE_WEB_CLIENT***',
  
  // Expo Go용 클라이언트 ID
  // Google Console에서 bundle identifier/package name = "host.exp.exponent"로 생성 필요
  // 생성 후 아래 주석을 해제하고 클라이언트 ID를 입력하세요
  // expoClientId: 'YOUR_EXPO_GO_CLIENT_ID_HERE',
  
  // Standalone app용 클라이언트 ID
  // iOS: bundle identifier = "com.embersentinel.app"
  // Android: package name = "com.embersentinel.app"
  iosClientId: '***REMOVED_GOOGLE_IOS_CLIENT***', // iOS 클라이언트 ID로 교체 필요
  androidClientId: '***REMOVED_GOOGLE_ANDROID_CLIENT***',
  
  // Expo 앱의 리디렉션 URI (Native/Web 겸용)
  redirectUri: AUTH_REDIRECT_URI,
};

export const KAKAO_CONFIG = {
  // Kakao Developers에서 발급받은 REST API 키
  appKey: '***REMOVED_KAKAO_KEY***',
  redirectUri: AUTH_REDIRECT_URI,
};

// 설정 완료 상태:
// ✅ Google Web 클라이언트 ID: 설정됨
// ✅ Google Android 클라이언트 ID: 설정됨
// ✅ Kakao REST API 키: 설정됨
// ✅ Redirect URI: https://auth.expo.io/@jeffkm/ember-sentinel