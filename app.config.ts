import type { ExpoConfig, ConfigContext } from 'expo/config';

const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || 'DUMMY_KAKAO_KEY';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ember Sentinel',
  slug: 'ember-sentinel',
  owner: 'jeffkm',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FF3B30',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.embersentinel.app',
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            `com.googleusercontent.apps.${googleIosClientId}`,
            'com.embersentinel.app',
          ],
        },
        {
          CFBundleURLSchemes: [`kakao${kakaoKey}`],
        },
      ],
      CFBundleAllowMixedLocalizations: true,
      KAKAO_APP_KEY: kakaoKey,
      LSApplicationQueriesSchemes: ['kakaokompassauth', 'storykompassauth', 'kakaolink'],
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          'exp.direct': {
            NSIncludesSubdomains: true,
            NSExceptionAllowsInsecureHTTPLoads: true,
          },
        },
      },
    },
    bitcode: false,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF3B30',
    },
    package: 'com.embersentinel.app',
    googleServicesFile: './google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          {
            scheme: `com.googleusercontent.apps.${googleAndroidClientId}`,
          },
          {
            scheme: 'com.embersentinel.app',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: [
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WAKE_LOCK',
      'android.permission.BLUETOOTH',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#FF3B30',
        sounds: [],
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
        },
      },
    ],
    [
      '@react-native-kakao/core',
      {
        nativeAppKey: kakaoKey,
        android: {
          authCodeHandlerActivity: true,
        },
        ios: {
          handleKakaoOpenUrl: true,
        },
      },
    ],
    'expo-video',
    [
      '@livekit/react-native-expo-plugin',
      {
        android: {
          audioType: 'media',
        },
      },
    ],
    '@config-plugins/react-native-webrtc',
  ],
  notification: {
    icon: './assets/icon.png',
    color: '#FF3B30',
  },
  extra: {
    eas: {
      projectId: '00cbed1f-25b5-426c-8c56-0c85d7598b6b',
    },
  },
});
