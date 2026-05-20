import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserInfo } from '../types';
import { initializeFCMToken } from '../config/firebase';

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  userRole: string | null;
  userEmail: string | null;
  userNickname: string | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: string, userInfo?: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: true,
    userRole: null,
    userEmail: null,
    userNickname: null,
  });

  // 초기 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        setTimeout(async () => {
          const userToken = await AsyncStorage.getItem('userToken');
          const role = await AsyncStorage.getItem('userRole');
          const email = await AsyncStorage.getItem('userEmail');
          const nickname = await AsyncStorage.getItem('userNickname');
          setState({
            isLoggedIn: !!userToken,
            isLoading: false,
            userRole: role,
            userEmail: email,
            userNickname: nickname,
          });
        }, 2000);
      } catch (error) {
        console.error('Error checking login status:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkLoginStatus();
  }, []);

  const login = useCallback(async (token: string, role: string, userInfo: UserInfo = {}) => {
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userRole', role);

    if (userInfo.email) {
      await AsyncStorage.setItem('userEmail', userInfo.email);
    }
    if (userInfo.nickname) {
      await AsyncStorage.setItem('userNickname', userInfo.nickname);
    }
    if (userInfo.refreshToken) {
      await AsyncStorage.setItem('refreshToken', userInfo.refreshToken);
    } else if (userInfo.isOfflineMode) {
      await AsyncStorage.removeItem('refreshToken');
    }
    if (userInfo.expiresIn) {
      const expiresAt = Date.now() + userInfo.expiresIn * 1000;
      await AsyncStorage.setItem('tokenExpiresAt', expiresAt.toString());
    }
    if (userInfo.provider) {
      await AsyncStorage.setItem('loginProvider', userInfo.provider);
    }
    if (userInfo.isNewUser !== undefined) {
      await AsyncStorage.setItem('isNewUser', userInfo.isNewUser.toString());
    }

    setState({
      isLoggedIn: true,
      isLoading: false,
      userRole: role,
      userEmail: userInfo.email ?? null,
      userNickname: userInfo.nickname ?? null,
    });

    // 로그인 후 FCM 토큰 초기화
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
      console.log('오류:', (error as Error).message);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userNickname');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('tokenExpiresAt');
    await AsyncStorage.removeItem('loginProvider');
    await AsyncStorage.removeItem('isNewUser');
    setState({
      isLoggedIn: false,
      isLoading: false,
      userRole: null,
      userEmail: null,
      userNickname: null,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
