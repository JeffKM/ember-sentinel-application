import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFCMToken } from './api';

// Firebase 설정 — .env에서 EXPO_PUBLIC_FIREBASE_* 환경변수 참조
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Firebase 초기화
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// 알림 핸들러 설정
// 포그라운드에서는 커스텀 배너만 표시하고 시스템 알림은 표시하지 않음
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // 커스텀 배너만 표시
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// FCM 토큰 발급 함수
// Expo에서는 expo-notifications를 사용하되, Firebase와 연동
export const getFCMToken = async (): Promise<string | null> => {
  const startTimestamp = new Date().toLocaleTimeString();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔑 [${startTimestamp}] [FCM Token Issuance]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('이벤트: FCM 토큰 발급 시작');
  console.log(`플랫폼: ${Platform.OS}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 알림 권한 요청 (iOS에서는 권한이 먼저 필요)
    console.log('📋 알림 권한 확인 중...');
    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermissions.status;

    console.log(`현재 권한 상태: ${finalStatus}`);
    if (existingPermissions.ios) {
      console.log(`iOS 권한 상세:`, JSON.stringify(existingPermissions.ios, null, 2));
    }

    if (finalStatus !== 'granted') {
      console.log('📋 알림 권한 요청 중...');
      const permissionResponse = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
          allowProvisional: false,
          // allowAnnouncements: deprecated in newer expo-notifications
        },
      });

      finalStatus = permissionResponse.status;
      console.log(`권한 요청 응답 상태: ${finalStatus}`);

      if (permissionResponse.ios) {
        console.log(`iOS 권한 요청 응답:`, JSON.stringify(permissionResponse.ios, null, 2));
      }

      // 권한이 여전히 부여되지 않은 경우
      if (finalStatus !== 'granted') {
        const errorTimestamp = new Date().toLocaleTimeString();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ [${errorTimestamp}] [FCM Token Issuance]`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('이벤트: 알림 권한이 거부됨 또는 결정되지 않음');
        console.log(`권한 상태: ${finalStatus}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (finalStatus === 'undetermined') {
          console.log('권한이 아직 결정되지 않았습니다.');
          console.log('다음 시도에서 권한 다이얼로그가 표시될 수 있습니다.');
        } else if (finalStatus === 'denied') {
          console.log('권한이 거부되었습니다.');
          console.log('iOS 설정에서 알림 권한을 허용해주세요:');
          console.log('설정 > Ember Sentinel > 알림');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return null;
      }
    }

    console.log('✅ 알림 권한 확인됨');

    // 네이티브 FCM 토큰 발급 시도 (안드로이드/iOS 네이티브 토큰)
    // iOS에서는 실제 기기에서만 토큰을 받을 수 있음
    let fcmToken: string | null = null;

    try {
      console.log('🔐 네이티브 FCM 토큰 발급 시도 중...');
      console.log(`플랫폼: ${Platform.OS}`);

      // 타임아웃 설정 (10초)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FCM 토큰 발급 타임아웃 (10초)')), 10000),
      );

      const tokenPromise = Notifications.getDevicePushTokenAsync();
      const deviceToken = await Promise.race([tokenPromise, timeoutPromise]);

      console.log('✅ 네이티브 토큰 응답 받음');
      console.log('토큰 데이터:', deviceToken);

      if (!deviceToken || !deviceToken.data) {
        throw new Error('토큰 데이터가 없습니다');
      }

      fcmToken = deviceToken.data as string;

      const timestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ [${timestamp}] [FCM Token - Native]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        JSON.stringify(
          {
            event: 'Native FCM Token received',
            token: fcmToken,
            tokenType: 'native',
            firebaseProjectId: firebaseConfig.projectId,
            platform: Platform.OS,
          },
          null,
          2,
        ),
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return fcmToken;
    } catch (nativeError) {
      const errorTimestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`❌ [${errorTimestamp}] [FCM Token Issuance - Native Error]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('이벤트: 네이티브 FCM 토큰 발급 실패');
      console.log('에러 타입:', (nativeError as Error).name);
      console.log('에러 메시지:', (nativeError as Error).message);

      if ((nativeError as Error).stack) {
        console.log('스택 트레이스:', (nativeError as Error).stack);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // iOS 시뮬레이터 체크
      if (Platform.OS === 'ios' && (nativeError as Error).message) {
        const errorMsg = (nativeError as Error).message.toLowerCase();
        if (
          errorMsg.includes('simulator') ||
          errorMsg.includes('aps-environment') ||
          errorMsg.includes('no valid') ||
          errorMsg.includes('invalid')
        ) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`⚠️ [${errorTimestamp}] [FCM Token Issuance]`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('이벤트: iOS 시뮬레이터 또는 설정 문제');
          console.log('에러:', (nativeError as Error).message);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️ iOS 시뮬레이터에서는 FCM 토큰을 받을 수 없습니다.');
          console.log('⚠️ 실제 iOS 기기에서 테스트하세요.');
          console.log('⚠️ 또는 아래 설정을 확인하세요:');
          console.log('   1. Xcode에서 Push Notifications capability 활성화');
          console.log('   2. Firebase에서 iOS 앱이 등록되어 있는지 확인');
          console.log('   3. GoogleService-Info.plist 파일이 있는지 확인');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return null;
        }
      }

      console.log('⚠️ 네이티브 FCM 토큰 발급 실패, Expo Push Token으로 대체 시도...');
      console.log('에러:', (nativeError as Error).message);

      // 네이티브 토큰 발급 실패 시 Expo Push Token 사용
      try {
        const expoProjectId =
          (Constants.expoConfig as any)?.extra?.eas?.projectId ||
          (Constants.manifest as any)?.extra?.eas?.projectId ||
          (Constants.expoConfig as any)?.extra?.expoClient?.projectId ||
          undefined;

        console.log('🔐 Expo Push Token 발급 중...');
        const expoToken = await Notifications.getExpoPushTokenAsync({
          projectId: expoProjectId,
        });

        fcmToken = expoToken.data;

        const timestamp = new Date().toLocaleTimeString();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ [${timestamp}] [FCM Token - Expo]`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(
          JSON.stringify(
            {
              event: 'Expo Push Token received (fallback)',
              token: fcmToken,
              tokenType: 'expo',
              firebaseProjectId: firebaseConfig.projectId,
              platform: Platform.OS,
              note: 'Using Expo Push Token as fallback. Native FCM token unavailable.',
            },
            null,
            2,
          ),
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return fcmToken;
      } catch (expoError) {
        console.error('❌ Expo Push Token 발급도 실패:', (expoError as Error).message);
        throw expoError;
      }
    }
  } catch (error) {
    const errorTimestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ [${errorTimestamp}] [FCM Token Issuance]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('이벤트: FCM 토큰 발급 실패');
    console.log('에러 타입:', (error as Error).name);
    console.log('에러 메시지:', (error as Error).message);

    // aps-environment 에러는 시뮬레이터나 entitlements 설정 문제일 수 있음
    if ((error as Error).message && (error as Error).message.includes('aps-environment')) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️ aps-environment 에러: entitlements 설정을 확인하세요.');
      console.log('⚠️ iOS 시뮬레이터에서는 푸시 토큰을 얻을 수 없습니다.');
      console.log('⚠️ 실제 기기에서 테스트하거나, 안드로이드에서 테스트하세요.');
      console.log('⚠️ 빌드를 다시 실행하세요: npx expo run:ios');
    }

    if ((error as Error).stack) {
      console.log('스택 트레이스:', (error as Error).stack);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }
};

// FCM 토큰을 서버에 저장하는 함수
// 로그인 후 또는 토큰이 갱신되었을 때 호출
export const registerFCMTokenToServer = async (fcmToken: string): Promise<boolean> => {
  try {
    if (!fcmToken) {
      console.warn('⚠️ FCM 토큰이 없어 서버에 저장할 수 없습니다.');
      return false;
    }

    // 로그인 여부 확인
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      const timestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ℹ️ [${timestamp}] [FCM Token Registration]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        JSON.stringify(
          {
            event: 'FCM Token saved locally (not logged in)',
            fcmToken: fcmToken,
          },
          null,
          2,
        ),
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // 로그인 전이더라도 토큰을 로컬에 저장
      await AsyncStorage.setItem('fcmToken', fcmToken);
      return false;
    }

    // 서버에 토큰 저장
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📤 [${timestamp}] [FCM Token Registration]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'Registering FCM Token to Server',
          fcmToken: fcmToken,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await saveFCMToken(fcmToken);

    // 성공적으로 저장되면 로컬에도 저장
    await AsyncStorage.setItem('fcmToken', fcmToken);
    await AsyncStorage.setItem('fcmTokenRegisteredAt', Date.now().toString());

    const successTimestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ [${successTimestamp}] [FCM Token Registration]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'FCM Token successfully saved to server',
          fcmToken: fcmToken,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  } catch (error) {
    const errorTimestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ [${errorTimestamp}] [FCM Token Registration]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'FCM Token server registration failed',
          fcmToken: fcmToken,
          error: (error as Error).message,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    // 네트워크 오류 등으로 실패해도 로컬에는 저장
    await AsyncStorage.setItem('fcmToken', fcmToken);
    return false;
  }
};

// FCM 토큰 초기화 및 서버 저장
// 앱 시작 시 또는 로그인 후 호출하여 토큰을 발급하고 서버에 저장
export const initializeFCMToken = async (): Promise<string | null> => {
  try {
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔄 [${timestamp}] [FCM Token Initialization]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FCM 토큰 초기화 시작...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 이미 저장된 토큰이 있는지 확인
    const savedToken = await AsyncStorage.getItem('fcmToken');

    // 새로운 토큰 발급
    const fcmToken = await getFCMToken();

    if (!fcmToken) {
      const errorTimestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`❌ [${errorTimestamp}] [FCM Token Initialization]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('이벤트: FCM 토큰 발급 실패');
      console.log('원인: getFCMToken()이 null을 반환했습니다.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('가능한 원인:');
      console.log('1. iOS 시뮬레이터에서 실행 중 (실제 기기 필요)');
      console.log('2. 알림 권한이 거부됨');
      console.log('3. 네트워크 연결 문제');
      console.log('4. Expo 프로젝트 설정 문제');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return null;
    }

    // 토큰이 변경되었거나 처음 발급받은 경우
    if (savedToken !== fcmToken) {
      const newTokenTimestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🆕 [${newTokenTimestamp}] [FCM Token Initialization]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        JSON.stringify(
          {
            event: 'New FCM Token issued',
            previousToken: savedToken || 'none',
            newToken: fcmToken,
          },
          null,
          2,
        ),
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // 서버에 저장 시도
      await registerFCMTokenToServer(fcmToken);
    } else {
      const existingTokenTimestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ℹ️ [${existingTokenTimestamp}] [FCM Token Initialization]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        JSON.stringify(
          {
            event: 'Existing FCM Token validated',
            fcmToken: fcmToken,
          },
          null,
          2,
        ),
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // 기존 토큰이지만 서버에 등록되지 않았을 수 있으므로 다시 시도
      const registeredAt = await AsyncStorage.getItem('fcmTokenRegisteredAt');
      if (!registeredAt) {
        const retryTimestamp = new Date().toLocaleTimeString();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔄 [${retryTimestamp}] [FCM Token Initialization]`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(
          JSON.stringify(
            {
              event: 'Retrying server registration for existing token',
              fcmToken: fcmToken,
            },
            null,
            2,
          ),
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        await registerFCMTokenToServer(fcmToken);
      }
    }

    return fcmToken;
  } catch (error) {
    const errorTimestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ [${errorTimestamp}] [FCM Token Initialization]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'FCM Token initialization failed',
          error: (error as Error).message,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }
};

// 푸시 알림 수신 리스너 설정
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (notification: Notifications.Notification) => void,
): void => {
  // 포그라운드에서 알림 수신 시
  Notifications.addNotificationReceivedListener((notification) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔔 [${timestamp}] [PushNotification]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'Notification received',
          title: notification.request?.content?.title,
          body: notification.request?.content?.body,
          data: notification.request?.content?.data,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // 알림 탭 시 (백그라운드/포그라운드 공통)
  Notifications.addNotificationResponseReceivedListener((response) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👆 [${timestamp}] [PushNotification]`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      JSON.stringify(
        {
          event: 'Notification tapped',
          title: response.notification.request?.content?.title,
          body: response.notification.request?.content?.body,
          data: response.notification.request?.content?.data,
        },
        null,
        2,
      ),
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const notification = response.notification;
    if (onNotificationTapped) {
      onNotificationTapped(notification);
    }
  });
};

export default app;
