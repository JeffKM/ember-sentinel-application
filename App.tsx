import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { NavigationContainerRef } from '@react-navigation/native';
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

// Import context & FCM
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { initializeFCMToken, setupNotificationListeners } from './src/config/firebase';
import { sendFireSimulationNotification } from './src/utils/pushNotification';

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isLoggedIn, isLoading, userRole, login, logout } = useAuth();
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList>>(null);

  React.useEffect(() => {
    // FCM 알림 리스너 설정
    setupNotificationListeners((notification) => {
      console.log('알림 수신:', notification);
    });

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
  }, []);

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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
