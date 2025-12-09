import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Import FCM functions
import { initializeFCMToken, setupNotificationListeners } from './src/config/firebase';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkLoginStatus();
    
    // FCM 알림 리스너 설정
    setupNotificationListeners((notification) => {
      // 알림 수신 시 처리할 로직 (필요시 커스터마이징)
      console.log('알림 수신:', notification);
    });
    
    // 앱 시작 시 FCM 토큰 초기화 시도
    // 로그인되어 있으면 자동으로 서버에 저장됨
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
        console.log('오류:', error.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    };
    
    initFCM();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Show splash screen for 2 seconds
      setTimeout(async () => {
        const userToken = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        setIsLoggedIn(!!userToken);
        setUserRole(role);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoading(false);
    }
  };

  const handleLogin = async (token, role, userInfo = {}) => {
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userRole', role);
    
    // 추가 사용자 정보 저장
    if (userInfo.email) {
      await AsyncStorage.setItem('userEmail', userInfo.email);
    }
    if (userInfo.nickname) {
      await AsyncStorage.setItem('userNickname', userInfo.nickname);
    }
    if (userInfo.refreshToken) {
      await AsyncStorage.setItem('refreshToken', userInfo.refreshToken);
    } else if (userInfo.isOfflineMode) {
      // 오프라인 모드인 경우 refreshToken을 제거
      await AsyncStorage.removeItem('refreshToken');
    }
    if (userInfo.expiresIn) {
      const expiresAt = Date.now() + (userInfo.expiresIn * 1000);
      await AsyncStorage.setItem('tokenExpiresAt', expiresAt.toString());
    }
    if (userInfo.provider) {
      await AsyncStorage.setItem('loginProvider', userInfo.provider);
    }
    if (userInfo.isNewUser !== undefined) {
      await AsyncStorage.setItem('isNewUser', userInfo.isNewUser.toString());
    }
    
    setUserRole(role);
    setIsLoggedIn(true);
    
    // 로그인 후 FCM 토큰 초기화 및 서버에 저장
    // 이미 토큰이 발급되어 있으면 서버에 저장만 시도
    const initFCMAfterLogin = async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔐 [${timestamp}] [Login Success]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('이벤트: 로그인 성공 후 FCM 토큰 발급 시작');
      console.log(`사용자 역할: ${role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      try {
        await initializeFCMToken();
      } catch (error) {
        const errorTimestamp = new Date().toLocaleTimeString();
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ [${errorTimestamp}] [Login Success]`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('이벤트: 로그인 후 FCM 토큰 등록 중 오류 발생');
        console.log('오류:', error.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    };
    
    initFCMAfterLogin();
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userNickname');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('tokenExpiresAt');
    await AsyncStorage.removeItem('loginProvider');
    await AsyncStorage.removeItem('isNewUser');
    setUserRole(null);
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home">
              {props => <HomeScreen {...props} onLogout={handleLogout} userRole={userRole} />}
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