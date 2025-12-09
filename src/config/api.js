import AsyncStorage from '@react-native-async-storage/async-storage';

// API 기본 설정
export const API_BASE_URL = 'http://ec2-35-94-89-39.us-west-2.compute.amazonaws.com:8080';

// 공통 요청 함수
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log('📤 요청 데이터:', options.body);
  }
  if (options.headers) {
    console.log('📋 요청 헤더:', JSON.stringify(options.headers, null, 2));
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'accept': '*/*',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);
    console.log('📋 응답 헤더:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 오류 응답: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 응답 본문을 텍스트로 먼저 읽기
    const responseText = await response.text();
    
    // 응답 본문이 비어있는 경우 (DELETE 요청 등)
    if (!responseText || responseText.trim() === '') {
      console.log('✅ API 응답 성공 (빈 응답)');
      return null;
    }

    // JSON 파싱 시도
    try {
      const data = JSON.parse(responseText);
      console.log('✅ API 응답 성공:', JSON.stringify(data, null, 2));
      return data;
    } catch (parseError) {
      // JSON 파싱 실패 (빈 응답 또는 잘못된 형식)
      if (parseError instanceof SyntaxError) {
        console.error('❌ JSON 파싱 실패:', parseError.message);
        console.log('응답 본문:', responseText);
        // 빈 응답으로 간주 (DELETE 등에서 정상적으로 발생할 수 있음)
        if (parseError.message.includes('Unexpected end') || parseError.message.includes('Unexpected token')) {
          console.log('✅ API 응답 성공 (빈 응답으로 처리)');
          return null;
        }
      }
      throw new Error('서버 응답을 파싱할 수 없습니다');
    }

  } catch (error) {
    console.error(`❌ API 요청 실패 (${endpoint}):`, error);
    
    if (error.name === 'AbortError') {
      throw new Error('요청 시간 초과 (10초)');
    } else if (error.message.includes('Network request failed')) {
      throw new Error('네트워크 연결 실패 - 서버에 연결할 수 없습니다');
    } else if (error.message.includes('fetch')) {
      throw new Error('네트워크 오류가 발생했습니다');
    }
    
    throw error;
  }
};

// 인증 토큰 가져오기
const getAuthToken = async () => {
  const token = await AsyncStorage.getItem('userToken');
  if (!token) {
    throw new Error('로그인이 필요합니다');
  }
  return token;
};

// 인증 헤더 생성
const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
  };
};

// Room 목록 조회 API
export const getRoomList = async (page = 0, size = 100) => {
  try {
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/list/me?page=${page}&size=${size}`, {
      method: 'GET',
      headers,
    });
    return response;
  } catch (error) {
    console.error('❌ Room 목록 조회 실패:', error);
    throw error;
  }
};

// Room 목록 요약 정보 조회 API
export const getRoomSummary = async (roomIds) => {
  try {
    const headers = await getAuthHeaders();
    const response = await apiRequest('/room/list/me/summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({ roomIds }),
    });
    return response;
  } catch (error) {
    console.error('❌ Room 요약 정보 조회 실패:', error);
    throw error;
  }
};

// Room 데이터 통합 조회 (목록 + 요약)
export const getRoomData = async () => {
  try {
    console.log('🔄 Room 데이터 통합 조회 시작...');
    
    // 1. Room 목록 조회
    console.log('📋 1단계: Room 목록 조회');
    const roomListResponse = await getRoomList();
    
    if (!roomListResponse.content || roomListResponse.content.length === 0) {
      console.log('ℹ️ 등록된 Room이 없습니다');
      return {
        totalRoomCount: 0,
        totalCameraCount: 0,
        liveStreamCount: 0,
        roomList: [],
      };
    }

    // 2. Room ID들 추출
    const roomIds = roomListResponse.content.map(room => room.roomId);
    console.log('🔢 추출된 Room IDs:', roomIds);

    // 3. Room 요약 정보 조회
    console.log('📊 2단계: Room 요약 정보 조회');
    const summaryResponse = await getRoomSummary(roomIds);
    
    console.log('✅ Room 데이터 통합 조회 완료');
    return summaryResponse;

  } catch (error) {
    console.error('❌ Room 데이터 통합 조회 실패:', error);
    throw error;
  }
};

// Room 세부 정보 조회 API
export const getRoomDetail = async (roomId) => {
  try {
    console.log(`🔍 Room 세부 정보 조회 시작 - Room ID: ${roomId}`);
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}/detail`, {
      method: 'GET',
      headers,
    });
    
    console.log('✅ Room 세부 정보 조회 완료');
    return response;
    
  } catch (error) {
    console.error(`❌ Room 세부 정보 조회 실패 (Room ID: ${roomId}):`, error);
    throw error;
  }
};

// 빌딩 목록 조회 API
export const getBuildingList = async () => {
  try {
    console.log('🏢 빌딩 목록 조회 시작...');
    
    const headers = await getAuthHeaders();
    const response = await apiRequest('/building/list', {
      method: 'GET',
      headers,
    });
    
    console.log('✅ 빌딩 목록 조회 완료');
    return response;
    
  } catch (error) {
    console.error('❌ 빌딩 목록 조회 실패:', error);
    throw error;
  }
};

// Room 추가 API
export const createRoom = async (buildingId, roomAlias, floor, roomNumber) => {
  try {
    console.log('➕ Room 추가 시작...');
    console.log('📋 Room 정보:', { buildingId, roomAlias, floor, roomNumber });
    
    const headers = await getAuthHeaders();
    const response = await apiRequest('/room', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        buildingId,
        roomAlias,
        floor,
        roomNumber,
      }),
    });
    
    console.log('✅ Room 추가 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room 추가 실패:', error);
    throw error;
  }
};

// Room에 사용자 추가 API
export const addUserToRoom = async (roomId, userEmail, role) => {
  try {
    console.log('➕ Room에 사용자 추가 시작...');
    console.log('📋 사용자 정보:', { roomId, userEmail, role });
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}/user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userEmail,
        role,
      }),
    });
    
    console.log('✅ Room에 사용자 추가 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room에 사용자 추가 실패:', error);
    throw error;
  }
};

// Room에서 사용자 삭제 API
export const removeUserFromRoom = async (roomId, userId) => {
  try {
    console.log('🗑️ Room에서 사용자 삭제 시작...');
    console.log('📋 삭제 정보:', { roomId, userId });
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}/user/${userId}`, {
      method: 'DELETE',
      headers,
    });
    
    console.log('✅ Room에서 사용자 삭제 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room에서 사용자 삭제 실패:', error);
    throw error;
  }
};

// Room 삭제 API
export const deleteRoom = async (roomId) => {
  try {
    console.log('🗑️ Room 삭제 시작...');
    console.log('📋 Room ID:', roomId);
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}`, {
      method: 'DELETE',
      headers,
    });
    
    console.log('✅ Room 삭제 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room 삭제 실패:', error);
    throw error;
  }
};

// Room에 카메라 추가 API
export const addCameraToRoom = async (roomId, deviceUuid, cameraEdgeAlias) => {
  try {
    console.log('➕ Room에 카메라 추가 시작...');
    console.log('📋 카메라 정보:', { roomId, deviceUuid, cameraEdgeAlias });
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}/camera-edge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        deviceUuid,
        cameraEdgeAlias,
      }),
    });
    
    console.log('✅ Room에 카메라 추가 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room에 카메라 추가 실패:', error);
    throw error;
  }
};

// Room에서 카메라 삭제 API
export const removeCameraFromRoom = async (roomId, cameraEdgeId) => {
  try {
    console.log('🗑️ Room에서 카메라 삭제 시작...');
    console.log('📋 삭제 정보:', { roomId, cameraEdgeId });
    
    const headers = await getAuthHeaders();
    const response = await apiRequest(`/room/${roomId}/camera-edge/${cameraEdgeId}`, {
      method: 'DELETE',
      headers,
    });
    
    console.log('✅ Room에서 카메라 삭제 완료');
    return response;
    
  } catch (error) {
    console.error('❌ Room에서 카메라 삭제 실패:', error);
    throw error;
  }
};

// 소셜 로그인 API들
export const googleLogin = async (accessToken) => {
  try {
    const response = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });
    return response;
  } catch (error) {
    console.error('❌ Google 로그인 API 실패:', error);
    throw error;
  }
};

export const kakaoLogin = async (accessToken) => {
  try {
    const response = await apiRequest('/auth/kakao', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });
    return response;
  } catch (error) {
    console.error('❌ Kakao 로그인 API 실패:', error);
    throw error;
  }
};

// 토큰 갱신 API
export const refreshToken = async () => {
  try {
    const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('리프레시 토큰이 없습니다');
    }

    const response = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    // 새로운 토큰들 저장
    if (response.accessToken) {
      await AsyncStorage.setItem('userToken', response.accessToken);
    }
    if (response.refreshToken) {
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
    }
    if (response.accessTokenExpiresIn) {
      const expiresAt = Date.now() + (response.accessTokenExpiresIn * 1000);
      await AsyncStorage.setItem('tokenExpiresAt', expiresAt.toString());
    }

    return response;
  } catch (error) {
    console.error('❌ 토큰 갱신 실패:', error);
    throw error;
  }
};

// FCM 토큰 저장 API
// POST /user/fcm/token
// Body: { "fcmToken": "string" }
export const saveFCMToken = async (fcmToken) => {
  try {
    console.log('📤 FCM 토큰 서버 저장 시작...');
    console.log('🔑 FCM 토큰:', fcmToken);
    
    const headers = await getAuthHeaders();
    const response = await apiRequest('/user/fcm/token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fcmToken }),
    });
    
    console.log('✅ FCM 토큰 서버 저장 완료');
    return response;
  } catch (error) {
    console.error('❌ FCM 토큰 서버 저장 실패:', error);
    throw error;
  }
};