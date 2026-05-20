/**
 * 간단한 네트워크 테스트 유틸리티
 * expo start 환경에서도 작동하도록 설계
 */
import { API_BASE_URL } from '../config/api';

/**
 * 기본 네트워크 연결 테스트
 */
export const testBasicNetwork = async () => {
  try {
    console.log('🌐 기본 네트워크 연결 테스트 중...');
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ 기본 네트워크 연결 정상');
      return true;
    } else {
      console.log('⚠️ 기본 네트워크 연결 불안정');
      return false;
    }
  } catch (error) {
    console.log('❌ 기본 네트워크 연결 실패:', error.message);
    return false;
  }
};

/**
 * 서버 연결 테스트
 */
export const testServerConnection = async () => {
  const serverUrl = API_BASE_URL;
  
  try {
    console.log('🔗 서버 연결 테스트 중...');
    console.log('🌐 대상:', serverUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(serverUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'accept': '*/*',
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📡 서버 응답: ${response.status} ${response.statusText}`);
    
    if (response.status >= 200 && response.status < 500) {
      console.log('✅ 서버 연결 확인됨');
      return true;
    } else {
      console.log(`⚠️ 서버 응답 상태: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 서버 연결 실패:', error.message);
    
    if (error.name === 'AbortError') {
      console.log('⏰ 서버 응답 시간 초과');
    } else if (error.message.includes('Network request failed')) {
      console.log('🔍 네트워크 문제 진단:');
      console.log('  - Expo Go 환경에서는 HTTP 요청이 제한될 수 있음');
      console.log('  - 네이티브 빌드 필요할 수 있음');
      console.log('  - 서버 상태 확인 필요');
    }
    
    return false;
  }
};

/**
 * 종합 네트워크 진단
 */
export const runNetworkDiagnostics = async () => {
  console.log('🔍 네트워크 진단 시작...\n');
  
  const results = {
    basicNetwork: false,
    serverConnection: false,
    timestamp: new Date().toISOString()
  };
  
  // 1. 기본 네트워크 테스트
  results.basicNetwork = await testBasicNetwork();
  
  // 2. 서버 연결 테스트
  results.serverConnection = await testServerConnection();
  
  // 3. 결과 요약
  console.log('\n📊 네트워크 진단 결과:');
  console.log(`  기본 네트워크: ${results.basicNetwork ? '✅ 정상' : '❌ 실패'}`);
  console.log(`  서버 연결: ${results.serverConnection ? '✅ 정상' : '❌ 실패'}`);
  
  if (!results.basicNetwork) {
    console.log('\n💡 권장사항: 인터넷 연결을 확인해주세요');
  } else if (!results.serverConnection) {
    console.log('\n💡 권장사항: 네이티브 빌드를 시도해보세요 (expo run:ios/android)');
  }
  
  return results;
};










