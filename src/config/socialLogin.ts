// Expo proxy redirect URI (네이티브/웹 공통 고정)
export const AUTH_REDIRECT_URI: string = 'https://auth.expo.io/@jeffkm/ember-sentinel';

// 소셜 로그인 설정
// 실제 앱에서는 이 값들을 환경 변수나 보안 저장소에 저장해야 합니다

interface GoogleConfig {
  clientId: string;
  iosClientId: string;
  androidClientId: string;
  redirectUri: string;
}

interface KakaoConfig {
  appKey: string;
  redirectUri: string;
}

export const GOOGLE_CONFIG: GoogleConfig = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  redirectUri: AUTH_REDIRECT_URI,
};

export const KAKAO_CONFIG: KakaoConfig = {
  appKey: process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '',
  redirectUri: AUTH_REDIRECT_URI,
};
