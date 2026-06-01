// LiveKit 네이티브 모듈 등록 (시뮬레이터/Expo Go에서는 건너뜀)
// DOMException 폴리필 — livekit-client 내부에서 참조하므로 모듈 로드 전 필요
if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  } as typeof globalThis.DOMException;
}
try {
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
} catch {
  // 네이티브 빌드가 아닌 환경에서는 LiveKit 초기화 생략
}

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// 웹 전용: Expo 기본 CSS(overflow:hidden, 고정 높이) 오버라이드
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'ember-web-fixes';
  style.textContent = `
    html, body {
      height: auto !important;
      min-height: 100% !important;
    }
    body {
      overflow-y: auto !important;
    }
    #root {
      height: auto !important;
      min-height: 100vh;
      min-height: 100dvh;
    }
    video {
      object-fit: contain !important;
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);

  // expo-av가 JS로 video 크기를 원본 해상도로 설정하므로 MutationObserver로 강제 오버라이드
  const forceContain = (el: HTMLVideoElement) => {
    el.style.setProperty('object-fit', 'contain', 'important');
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('height', '100%', 'important');
  };
  // 이미 존재하는 video 요소에 적용
  document.querySelectorAll('video').forEach(forceContain);
  // 새로 추가되는 video 요소 감지
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLVideoElement) forceContain(node);
        if (node instanceof HTMLElement) {
          node.querySelectorAll('video').forEach(forceContain);
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { Notification } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import type { RootStackParamList } from './src/types';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import FireAlertDetailScreen from './src/screens/FireAlertDetailScreen';
import CCTVLiveScreen from './src/screens/CCTVLiveScreen';
import FireLocationScreen from './src/screens/FireLocationScreen';
import FireEventHistoryScreen from './src/screens/FireEventHistoryScreen';
import FireEventVideoScreen from './src/screens/FireEventVideoScreen';

// Import components
import PushNotificationBanner from './src/components/PushNotificationBanner';

// Import context & FCM
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { initializeFCMToken, setupNotificationListeners } from './src/config/firebase';
import { sendFireSimulationNotification } from './src/utils/pushNotification';

const Stack = createStackNavigator<RootStackParamList>();

// 알림 데이터에서 네비게이션 파라미터 추출
function extractNavParamsFromNotification(notification: Notification) {
  const data = (notification.request?.content?.data || {}) as Record<string, unknown>;

  // 서버 FCM 페이로드: type, fireEventId, cameraId, roomId 등
  if (data.type === 'fire_alert' || data.fireEventId) {
    return {
      screen: 'FireAlertDetail' as const,
      params: {
        camera: {
          cameraId: Number(data.cameraId) || 0,
          deviceUuid: (data.deviceUuid as string) || 'unknown',
          cameraEdgeAlias: (data.cameraAlias as string) || '화재 감지 카메라',
          locationFloor: (data.floor as string) || '',
          roomNumber: (data.roomNumber as string) || '',
          isFireOccurring: true,
          fireEventId: Number(data.fireEventId) || null,
        },
        room: {
          roomId: Number(data.roomId) || 0,
          roomAlias: (data.roomAlias as string) || '화재 발생 구역',
          buildingName: (data.buildingName as string) || '',
          floor: (data.floor as string) || '',
          roomNumber: (data.roomNumber as string) || '',
          cameraCountPerRoom: 1,
          fireEventCountPerRoom: 1,
        },
        event: {
          id: Number(data.fireEventId) || 0,
          date: (data.detectedAt as string) || new Date().toISOString(),
          cameraId: Number(data.cameraId) || 0,
          detectionType: (data.detectionType as string) || '화재 감지',
          riskLevel: (data.riskLevel as string) || '높음',
        },
      },
    };
  }

  // 로컬 시뮬레이션 알림: camera, room 객체가 data에 직접 포함
  if (data.camera && data.room) {
    const simData = data.simData as
      | { event?: RootStackParamList['FireAlertDetail']['event'] }
      | undefined;
    return {
      screen: 'FireAlertDetail' as const,
      params: {
        camera: data.camera as RootStackParamList['FireAlertDetail']['camera'],
        room: data.room as RootStackParamList['FireAlertDetail']['room'],
        event: simData?.event,
      },
    };
  }

  return null;
}

function AppNavigator() {
  const { isLoggedIn, isLoading, userRole, login, logout } = useAuth();
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [currentNotification, setCurrentNotification] = React.useState<Notification | null>(null);
  const bannerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 배너 표시 (5초 후 자동 닫기)
  const showBanner = React.useCallback((notification: Notification) => {
    // 이전 타이머 제거
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setCurrentNotification(notification);
    bannerTimerRef.current = setTimeout(() => {
      setCurrentNotification(null);
      bannerTimerRef.current = null;
    }, 5000);
  }, []);

  // 알림 탭 시 화면 이동 처리
  const handleNotificationNavigation = React.useCallback((notification: Notification) => {
    const navParams = extractNavParamsFromNotification(notification);
    if (navParams && navigationRef.current) {
      console.log('📍 알림 탭 → 화면 이동:', navParams.screen);
      navigationRef.current.navigate(navParams.screen, navParams.params);
    }
  }, []);

  React.useEffect(() => {
    // FCM 알림 리스너 설정 — 포그라운드 수신 + 알림 탭
    setupNotificationListeners(
      // 포그라운드 알림 수신 → 배너 표시
      (notification) => {
        console.log('알림 수신 → 배너 표시');
        showBanner(notification);
      },
      // 알림 탭 (백그라운드/포그라운드) → 화면 이동
      (notification) => {
        // 배너 닫기
        setCurrentNotification(null);
        handleNotificationNavigation(notification);
      },
    );

    // Cold start: 앱이 알림 탭으로 열린 경우 처리
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          console.log('🧊 Cold start 알림 감지');
          handleNotificationNavigation(response.notification);
        }
      })
      .catch(() => null);

    // 앱 시작 시 FCM 토큰 초기화 시도
    const initFCM = async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 [${timestamp}] [App Start]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('이벤트: 앱 시작 시 FCM 토큰 발급 시작');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      try {
        await initializeFCMToken();
      } catch (error) {
        const errorTimestamp = new Date().toLocaleTimeString();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ [${errorTimestamp}] [App Start]`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('이벤트: FCM 토큰 초기화 중 오류 발생');
        console.log('오류:', (error as Error).message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    };

    initFCM();

    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, [showBanner, handleNotificationNavigation]);

  // DEV 테스트 헬퍼 (CDP에서 호출 가능)
  React.useEffect(
    function () {
      if (__DEV__) {
        (globalThis as Record<string, unknown>).__emberTest = {
          login: function (role: string) {
            login('test-token', role, {
              email: role.toLowerCase() + '@test.com',
              nickname: role,
              provider: 'test',
              isOfflineMode: true,
            });
          },
          logout: function () {
            logout();
          },
          navigate: function (screen: string, params?: Record<string, unknown>) {
            if (navigationRef.current) (navigationRef.current as any).navigate(screen, params);
          },
          goBack: function () {
            if (navigationRef.current) navigationRef.current.goBack();
          },
          getState: function () {
            return JSON.stringify({
              isLoggedIn,
              userRole,
              navState: navigationRef.current ? navigationRef.current.getState() : null,
            });
          },
          simulateFire: async function () {
            const simData = await sendFireSimulationNotification();
            console.log('🔥 화재 시뮬레이션 발생:', simData.room.roomAlias);
            setTimeout(function () {
              if (navigationRef.current) {
                navigationRef.current.navigate('FireAlertDetail', {
                  camera: simData.camera,
                  room: simData.room,
                });
              }
            }, 3000);
            return simData;
          },
        };
      }
    },
    [isLoggedIn, userRole, login, logout],
  );

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={styles.container}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={login} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home">
                {(props) => <HomeScreen {...props} onLogout={logout} userRole={userRole} />}
              </Stack.Screen>
              <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
              <Stack.Screen name="FireAlertDetail" component={FireAlertDetailScreen} />
              <Stack.Screen name="CCTVLive" component={CCTVLiveScreen} />
              <Stack.Screen name="FireLocation" component={FireLocationScreen} />
              <Stack.Screen name="FireEventHistory" component={FireEventHistoryScreen} />
              <Stack.Screen name="FireEventVideo" component={FireEventVideoScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* 포그라운드 알림 배너 — NavigationContainer 위에 오버레이 */}
      <PushNotificationBanner
        notification={currentNotification}
        onClose={() => {
          setCurrentNotification(null);
          if (bannerTimerRef.current) {
            clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
          }
        }}
        onPress={(notification) => {
          setCurrentNotification(null);
          if (bannerTimerRef.current) {
            clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
          }
          handleNotificationNavigation(notification);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 480,
          width: '100%' as any,
          marginHorizontal: 'auto',
          minHeight: '100vh' as any,
        }
      : {}),
  },
});

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
