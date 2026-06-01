import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_CONFIG, KAKAO_CONFIG } from '../config/socialLogin';
import { API_BASE_URL } from '../config/api';
import { confirmAlert, infoAlert } from '../utils/webAlert';
import type { UserInfo } from '../types';

// 네이티브 전용 SDK 동적 로딩 (웹에서 crash 방지)
function getNativeAuthModules() {
  try {
    return {
      GoogleSignin: require('@react-native-google-signin/google-signin').GoogleSignin,
      statusCodes: require('@react-native-google-signin/google-signin').statusCodes,
      initializeKakaoSDK: require('@react-native-kakao/core').initializeKakaoSDK,
      kakaoSDKLogin: require('@react-native-kakao/user').login,
      getKakaoProfile: require('@react-native-kakao/user').me,
      available: true as const,
    };
  } catch {
    return { available: false as const } as any;
  }
}

const isWeb = Platform.OS === 'web';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLogin: (token: string, role: string, userInfo?: UserInfo) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState<boolean>(false);

  // Expo Go를 사용하는지 확인 (development build가 아닌 경우)
  const isExpoGo: boolean = Constants.appOwnership === 'expo';

  // 웹 또는 Expo Go에서는 네이티브 SDK 사용 불가
  const isNativeSDKAvailable = !isWeb && !isExpoGo;

  // Google Sign-In 초기화
  useEffect(() => {
    if (!isNativeSDKAvailable) return;

    const nativeAuth = getNativeAuthModules();
    if (!nativeAuth.available) return;

    // Development build에서만 Google Sign-In 초기화
    nativeAuth.GoogleSignin.configure({
      webClientId: GOOGLE_CONFIG.clientId,
      iosClientId: GOOGLE_CONFIG.iosClientId,
      offlineAccess: false,
    });

    // 카카오 SDK 초기화 (비동기 처리)
    const initKakaoSDK = async () => {
      try {
        let bundleId: string = 'unknown';
        try {
          if (Platform.OS === 'ios') {
            try {
              bundleId = Application.applicationId || 'unknown';
            } catch (e) {
              bundleId =
                (Constants.manifest as any)?.ios?.bundleIdentifier ||
                (Constants.manifest2 as any)?.extra?.expoClient?.ios?.bundleIdentifier ||
                'unknown';
            }
          } else {
            bundleId =
              Application.applicationId ||
              (Constants.manifest as any)?.android?.package ||
              'unknown';
          }
        } catch (bundleIdError) {
          bundleId =
            (Constants.manifest as any)?.ios?.bundleIdentifier ||
            (Constants.manifest2 as any)?.extra?.expoClient?.ios?.bundleIdentifier ||
            'unknown';
        }

        console.log('🔍 카카오 SDK 초기화 - Bundle ID:', bundleId);

        await nativeAuth.initializeKakaoSDK(KAKAO_CONFIG.appKey);
        console.log('✅ 카카오 SDK 초기화 완료');
      } catch (error) {
        console.error('❌ 카카오 SDK 초기화 실패:', error);
      }
    };

    initKakaoSDK();
  }, [isNativeSDKAvailable]);

  // 구글 로그인 처리
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 웹 또는 Expo Go에서는 AuthSession 사용
      if (!isNativeSDKAvailable) {
        console.log('🔄 웹/Expo Go 환경에서 AuthSession으로 구글 로그인 시도...');

        try {
          const redirectUri = AuthSession.makeRedirectUri({});

          console.log('🔗 Redirect URI:', redirectUri);

          const request = new AuthSession.AuthRequest({
            clientId: GOOGLE_CONFIG.clientId,
            scopes: ['openid', 'profile', 'email'],
            responseType: AuthSession.ResponseType.Code,
            redirectUri: redirectUri,
            extraParams: {},
            state: 'google_login',
          });

          const result = await request.promptAsync({
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          });

          console.log('📱 AuthSession 결과:', result);

          if (result.type === 'success') {
            confirmAlert(
              '환경 제한',
              '현재 환경에서는 완전한 구글 로그인이 제한됩니다.\n\n오프라인 모드로 진행합니다.',
              () => {
                onLogin('expo_go_token', 'admin', {
                  email: 'test@example.com',
                  nickname: 'Expo Go 사용자',
                  provider: 'google',
                  isOfflineMode: true,
                });
              },
            );
          } else {
            infoAlert('로그인 취소', '구글 로그인이 취소되었습니다.');
          }
        } catch (authError) {
          console.error('AuthSession 오류:', authError);
          infoAlert(
            '환경 제한',
            '현재 환경에서는 구글 로그인이 제한됩니다.\n\n테스트 로그인을 사용해주세요.',
          );
        }

        setLoading(false);
        return;
      }

      const nativeAuth = getNativeAuthModules();
      if (!nativeAuth.available) {
        setLoading(false);
        infoAlert('오류', '네이티브 인증 모듈을 로드할 수 없습니다.');
        return;
      }

      console.log('🔑 구글 로그인 시작...');

      if (Platform.OS === 'android') {
        await nativeAuth.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const userInfo = await nativeAuth.GoogleSignin.signIn();

      if ((userInfo as any)?.type === 'cancelled' || !(userInfo as any)?.data) {
        console.log('ℹ️ 구글 로그인 취소됨');
        setLoading(false);
        return;
      }

      console.log('✅ 구글 로그인 성공:', userInfo);

      const tokens = await nativeAuth.GoogleSignin.getTokens();
      console.log('🔑 토큰 정보:', {
        hasAccessToken: !!tokens?.accessToken,
        hasIdToken: !!tokens?.idToken,
      });

      const accessToken = tokens?.accessToken;
      if (accessToken) {
        console.log('✅ 구글 로그인 성공! 서버 연결을 시도합니다...');

        confirmAlert(
          '로그인 방식 선택',
          '구글 로그인이 성공했습니다!\n\n서버에 연결하시겠습니까?',
          async () => {
            try {
              console.log('📤 서버로 토큰 전송 중...');
              console.log('🌐 서버 URL:', `${API_BASE_URL}/auth/google`);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: {
                  accept: '*/*',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
              }

              const loginResponse = await response.json();
              console.log('✅ 서버 연결 성공!');

              onLogin(loginResponse.accessToken, 'admin', {
                email: (userInfo as any)?.data?.user?.email,
                nickname: (userInfo as any)?.data?.user?.name,
                provider: 'google',
                refreshToken: loginResponse.refreshToken,
                expiresIn: loginResponse.accessTokenExpiresIn,
                isNewUser: loginResponse.isNewUser,
              });
            } catch (serverError) {
              console.log('❌ 서버 연결 실패, 오프라인 모드로 전환');
              infoAlert(
                '서버 연결 실패',
                '서버에 연결할 수 없습니다.\n오프라인 모드로 진행합니다.',
                () => {
                  onLogin(accessToken, 'admin', {
                    email: (userInfo as any)?.data?.user?.email,
                    nickname: (userInfo as any)?.data?.user?.name,
                    provider: 'google',
                    isOfflineMode: true,
                  });
                },
              );
            }
          },
          () => {
            console.log('🔄 사용자가 오프라인 모드 선택');
            onLogin(accessToken, 'admin', {
              email: (userInfo as any)?.data?.user?.email,
              nickname: (userInfo as any)?.data?.user?.name,
              provider: 'google',
              isOfflineMode: true,
            });
          },
        );
      } else {
        throw new Error('액세스 토큰을 받을 수 없습니다.');
      }
    } catch (error: any) {
      setLoading(false);
      console.error('❌ 구글 로그인 오류:', error);

      const nativeAuth = getNativeAuthModules();
      if (
        error.message?.includes('URL schemes') ||
        error.message?.includes('configuration') ||
        (nativeAuth.available && error.code === nativeAuth.statusCodes.SIGN_IN_CANCELLED)
      ) {
        console.log('🔄 구글 로그인 설정 문제 감지, 오프라인 모드 제공');

        confirmAlert(
          '구글 로그인 제한',
          '현재 환경에서는 구글 로그인이 제한됩니다.\n\n오프라인 모드로 진행하시겠습니까?',
          () => {
            onLogin('offline_google_token', 'admin', {
              email: 'google.user@example.com',
              nickname: '구글 사용자 (오프라인)',
              provider: 'google',
              isOfflineMode: true,
            });
          },
        );
        return;
      }

      let errorMessage = '구글 로그인 중 오류가 발생했습니다.';
      if (error.message) {
        errorMessage += `\n\n오류: ${error.message}`;
      }

      infoAlert('로그인 실패', errorMessage);
    }
  };

  // 카카오 로그인 처리
  const handleKakaoLogin = async () => {
    if (!isNativeSDKAvailable) {
      confirmAlert(
        '환경 제한',
        '현재 환경에서는 카카오 로그인이 제한됩니다.\n\n오프라인 모드로 진행하시겠습니까?',
        () => {
          onLogin('expo_go_kakao_token', 'editor', {
            email: 'kakao@example.com',
            nickname: '카카오 사용자 (오프라인)',
            provider: 'kakao',
            isOfflineMode: true,
          });
        },
      );
      return;
    }

    const nativeAuth = getNativeAuthModules();
    if (!nativeAuth.available) {
      infoAlert('오류', '네이티브 인증 모듈을 로드할 수 없습니다.');
      return;
    }

    try {
      setLoading(true);
      console.log('🔑 카카오 로그인 시작...');

      const tokenResult = await nativeAuth.kakaoSDKLogin();
      console.log('✅ 카카오 토큰 결과:', tokenResult);

      if (tokenResult?.accessToken) {
        console.log('✅ 카카오 로그인 성공! 서버 연결을 시도합니다...');

        let profile: any = null;
        try {
          profile = await nativeAuth.getKakaoProfile();
        } catch (profileError) {
          console.log('⚠️ 카카오 프로필 가져오기 실패:', profileError);
        }

        const userEmail = profile?.kakaoAccount?.email;
        const userNickname = profile?.kakaoAccount?.profile?.nickname;

        confirmAlert(
          '로그인 방식 선택',
          '카카오 로그인이 성공했습니다!\n\n서버에 연결하시겠습니까?',
          async () => {
            try {
              console.log('📤 서버로 카카오 토큰 전송 중...');

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const response = await fetch(`${API_BASE_URL}/auth/kakao`, {
                method: 'POST',
                headers: {
                  accept: '*/*',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: tokenResult.accessToken }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
              }

              const loginResponse = await response.json();
              console.log('✅ 카카오 서버 연결 성공!');

              onLogin(loginResponse.accessToken, 'editor', {
                email: userEmail,
                nickname: userNickname,
                kakaoId: profile?.id,
                provider: 'kakao',
                refreshToken: loginResponse.refreshToken,
                expiresIn: loginResponse.accessTokenExpiresIn,
                isNewUser: loginResponse.isNewUser,
              });
            } catch (serverError) {
              console.log('❌ 카카오 서버 연결 실패, 오프라인 모드로 전환');
              infoAlert(
                '서버 연결 실패',
                '서버에 연결할 수 없습니다.\n오프라인 모드로 진행합니다.',
                () => {
                  onLogin(tokenResult.accessToken, 'editor', {
                    email: userEmail,
                    nickname: userNickname,
                    kakaoId: profile?.id,
                    provider: 'kakao',
                    isOfflineMode: true,
                  });
                },
              );
            }
          },
          () => {
            console.log('🔄 사용자가 카카오 오프라인 모드 선택');
            onLogin(tokenResult.accessToken, 'editor', {
              email: userEmail,
              nickname: userNickname,
              kakaoId: profile?.id,
              provider: 'kakao',
              isOfflineMode: true,
            });
          },
        );
      } else {
        throw new Error('카카오 액세스 토큰을 받을 수 없습니다.');
      }
    } catch (error: any) {
      setLoading(false);
      console.error('❌ 카카오 로그인 오류:', error);

      console.log('🔄 카카오 로그인 문제 감지, 오프라인 모드 제공');

      confirmAlert(
        '카카오 로그인 제한',
        '현재 환경에서는 카카오 로그인이 제한됩니다.\n\n오프라인 모드로 진행하시겠습니까?',
        () => {
          onLogin('offline_kakao_token', 'editor', {
            email: 'kakao.user@example.com',
            nickname: '카카오 사용자 (오프라인)',
            provider: 'kakao',
            isOfflineMode: true,
          });
        },
      );
    }
  };
  const handleRoleLogin = (role: 'admin' | 'editor' | 'viewer') => {
    const roleNames: Record<string, string> = {
      admin: '관리자',
      editor: '편집자',
      viewer: '사용자',
    };

    confirmAlert(
      `${roleNames[role]} 로그인`,
      `${roleNames[role]} 계정으로 로그인하시겠습니까?`,
      () => {
        onLogin(`${role}-token-` + Date.now(), role);
      },
    );
  };

  return (
    <LinearGradient
      colors={['#FF6B35', '#FF3B30', '#E31E24']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* White Card Container */}
        <View style={styles.whiteCard}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Ember Sentinel</Text>
          <Text style={styles.subtitle}>실시간 화재 감지 모니터링</Text>
          <Text style={styles.tagline}>Always Watching, Always Protected</Text>

          {isWeb && (
            <View style={styles.expoGoNotice}>
              <Text style={styles.expoGoNoticeText}>🌐 웹 데모 버전</Text>
              <Text style={styles.expoGoNoticeSubText}>
                아래 역할별 테스트 로그인을 이용해주세요
              </Text>
            </View>
          )}

          {!isWeb && isExpoGo && (
            <View style={styles.expoGoNotice}>
              <Text style={styles.expoGoNoticeText}>📱 Expo Go 환경에서 실행 중</Text>
              <Text style={styles.expoGoNoticeSubText}>소셜 로그인 기능이 제한됩니다</Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text style={styles.loadingText}>로그인 중...</Text>
            </View>
          )}

          {!isWeb && (
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, loading && styles.disabledButton]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={styles.socialButtonIcon}>G</Text>
                <Text style={styles.socialButtonText}>구글로 계속하기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.kakaoButton, loading && styles.disabledButton]}
                onPress={handleKakaoLogin}
                disabled={loading}
              >
                <Text style={styles.socialButtonIcon}>K</Text>
                <Text style={styles.socialButtonText}>카카오로 계속하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isWeb && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Role-based login section */}
        <View style={styles.roleLoginContainer}>
          <Text style={styles.roleLoginTitle}>역할별 로그인</Text>
          <Text style={styles.roleLoginSubtitle}>아래에서 역할을 선택하여 테스트 로그인하세요</Text>

          <TouchableOpacity
            style={[styles.roleButton, styles.adminButton]}
            onPress={() => handleRoleLogin('admin')}
          >
            <Text style={styles.roleIcon}>👑</Text>
            <Text style={styles.roleButtonText}>관리자 (Admin)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.editorButton]}
            onPress={() => handleRoleLogin('editor')}
          >
            <Text style={styles.roleIcon}>✏️</Text>
            <Text style={styles.roleButtonText}>편집자 (Editor)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.viewerButton]}
            onPress={() => handleRoleLogin('viewer')}
          >
            <Text style={styles.roleIcon}>👁️</Text>
            <Text style={styles.roleButtonText}>사용자 (Viewer)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  socialButtonsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderWidth: 1.5,
    borderColor: '#FEE500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  socialButtonIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },
  dividerText: {
    color: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 14,
    opacity: 0.8,
  },
  expoGoNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  expoGoNoticeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  expoGoNoticeSubText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  roleLoginContainer: {
    width: '100%',
    marginTop: 24,
  },
  roleLoginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  roleLoginSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  adminButton: {
    backgroundColor: '#FF9500',
  },
  editorButton: {
    backgroundColor: '#5856D6',
  },
  viewerButton: {
    backgroundColor: '#007AFF',
  },
  roleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
