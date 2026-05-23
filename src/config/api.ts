import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RoomListResponse,
  RoomSummaryResponse,
  AuthResponse,
  TokenRefreshResponse,
  BuildingListResponse,
} from '../types';

// ─── API 에러 분류 체계 ──────────────────────────────────
export enum ApiErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  AUTH = 'AUTH',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  PARSE = 'PARSE',
  UNKNOWN = 'UNKNOWN',
}

const USER_MESSAGES: Record<ApiErrorType, string> = {
  [ApiErrorType.NETWORK]: '네트워크 연결 실패 - 서버에 연결할 수 없습니다',
  [ApiErrorType.TIMEOUT]: '요청 시간 초과 (10초)',
  [ApiErrorType.AUTH]: '로그인이 만료되었습니다. 다시 로그인해주세요',
  [ApiErrorType.FORBIDDEN]: '해당 기능에 대한 권한이 없습니다',
  [ApiErrorType.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다',
  [ApiErrorType.SERVER]: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
  [ApiErrorType.PARSE]: '서버 응답을 파싱할 수 없습니다',
  [ApiErrorType.UNKNOWN]: '알 수 없는 오류가 발생했습니다',
};

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get userMessage(): string {
    return USER_MESSAGES[this.type];
  }
}

// ─── 토큰 갱신 중복 방지 ─────────────────────────────────
let refreshPromise: Promise<TokenRefreshResponse> | null = null;

// API 기본 설정 — 환경 변수로 오버라이드 가능
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://***REMOVED_IP***:8080';

// 에러 분류 헬퍼
function classifyHttpError(status: number, body: string): ApiError {
  if (status === 401) return new ApiError(ApiErrorType.AUTH, `HTTP 401: ${body}`, status);
  if (status === 403) return new ApiError(ApiErrorType.FORBIDDEN, `HTTP 403: ${body}`, status);
  if (status === 404) return new ApiError(ApiErrorType.NOT_FOUND, `HTTP 404: ${body}`, status);
  if (status >= 500) return new ApiError(ApiErrorType.SERVER, `HTTP ${status}: ${body}`, status);
  return new ApiError(ApiErrorType.UNKNOWN, `HTTP ${status}: ${body}`, status);
}

// 공통 요청 함수
interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T | null> => {
  const { skipAuth, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`🌐 API 요청: ${fetchOptions.method || 'GET'} ${url}`);
  if (fetchOptions.body) {
    console.log('📤 요청 데이터:', fetchOptions.body);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 오류 응답: ${errorText}`);

      // 401이고 skipAuth가 아닌 경우 토큰 갱신 시도
      if (response.status === 401 && !skipAuth) {
        try {
          await performTokenRefresh();
          // 갱신 성공 시 원래 요청 재시도
          const newHeaders = await getAuthHeaders();
          return apiRequest<T>(endpoint, {
            ...options,
            skipAuth: true,
            headers: { ...fetchOptions.headers, ...newHeaders },
          });
        } catch {
          throw new ApiError(ApiErrorType.AUTH, '토큰 갱신 실패', 401);
        }
      }

      throw classifyHttpError(response.status, errorText);
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
      const data = JSON.parse(responseText) as T;
      console.log('✅ API 응답 성공:', JSON.stringify(data, null, 2));
      return data;
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        console.error('❌ JSON 파싱 실패:', parseError.message);
        if (
          parseError.message.includes('Unexpected end') ||
          parseError.message.includes('Unexpected token')
        ) {
          console.log('✅ API 응답 성공 (빈 응답으로 처리)');
          return null;
        }
      }
      throw new ApiError(ApiErrorType.PARSE, '서버 응답을 파싱할 수 없습니다');
    }
  } catch (error) {
    // 이미 ApiError인 경우 그대로 throw
    if (error instanceof ApiError) throw error;

    const err = error as Error & { name?: string };
    console.error(`❌ API 요청 실패 (${endpoint}):`, err);

    if (err.name === 'AbortError') {
      throw new ApiError(ApiErrorType.TIMEOUT, '요청 시간 초과 (10초)');
    } else if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
      throw new ApiError(ApiErrorType.NETWORK, '네트워크 연결 실패');
    }

    throw new ApiError(ApiErrorType.UNKNOWN, err.message || '알 수 없는 오류');
  }
};

// 인증 토큰 가져오기
const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem('userToken');
  if (!token) {
    throw new ApiError(ApiErrorType.AUTH, '로그인이 필요합니다');
  }
  return token;
};

// 인증 헤더 생성
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

// 토큰 갱신 (중복 방지)
const performTokenRefresh = async (): Promise<TokenRefreshResponse> => {
  // 이미 갱신 중이면 기존 Promise 반환
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new ApiError(ApiErrorType.AUTH, '리프레시 토큰이 없습니다');
      }

      const response = await apiRequest<TokenRefreshResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
        skipAuth: true,
      });

      if (!response) {
        throw new ApiError(ApiErrorType.AUTH, '토큰 갱신 응답이 비어있습니다');
      }

      // 새로운 토큰들 저장
      if (response.accessToken) {
        await AsyncStorage.setItem('userToken', response.accessToken);
      }
      if (response.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.refreshToken);
      }
      if (response.accessTokenExpiresIn) {
        const expiresAt = Date.now() + response.accessTokenExpiresIn * 1000;
        await AsyncStorage.setItem('tokenExpiresAt', expiresAt.toString());
      }

      return response;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── API 엔드포인트 함수들 ───────────────────────────────

// Room 목록 조회 API
export const getRoomList = async (page = 0, size = 100): Promise<RoomListResponse> => {
  const headers = await getAuthHeaders();
  const response = await apiRequest<RoomListResponse>(`/room/list/me?page=${page}&size=${size}`, {
    method: 'GET',
    headers,
  });
  return response!;
};

// Room 목록 요약 정보 조회 API
export const getRoomSummary = async (roomIds: number[]): Promise<RoomSummaryResponse> => {
  const headers = await getAuthHeaders();
  const response = await apiRequest<RoomSummaryResponse>('/room/list/me/summary', {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomIds }),
  });
  return response!;
};

// Room 데이터 통합 조회 (목록 + 요약)
export const getRoomData = async (): Promise<RoomSummaryResponse> => {
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
  const roomIds = roomListResponse.content.map((room) => room.roomId);
  console.log('🔢 추출된 Room IDs:', roomIds);

  // 3. Room 요약 정보 조회
  console.log('📊 2단계: Room 요약 정보 조회');
  const summaryResponse = await getRoomSummary(roomIds);

  console.log('✅ Room 데이터 통합 조회 완료');
  return summaryResponse;
};

// Room 세부 정보 조회 API
export const getRoomDetail = async (roomId: number): Promise<unknown> => {
  console.log(`🔍 Room 세부 정보 조회 시작 - Room ID: ${roomId}`);
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}/detail`, {
    method: 'GET',
    headers,
  });
  console.log('✅ Room 세부 정보 조회 완료');
  return response;
};

// 빌딩 목록 조회 API
export const getBuildingList = async (): Promise<BuildingListResponse> => {
  console.log('🏢 빌딩 목록 조회 시작...');
  const headers = await getAuthHeaders();
  const response = await apiRequest<BuildingListResponse>('/building/list', {
    method: 'GET',
    headers,
  });
  console.log('✅ 빌딩 목록 조회 완료');
  return response!;
};

// Room 추가 API
export const createRoom = async (
  buildingId: number,
  roomAlias: string,
  floor: string,
  roomNumber: string,
): Promise<unknown> => {
  console.log('➕ Room 추가 시작...');
  console.log('📋 Room 정보:', { buildingId, roomAlias, floor, roomNumber });
  const headers = await getAuthHeaders();
  const response = await apiRequest('/room', {
    method: 'POST',
    headers,
    body: JSON.stringify({ buildingId, roomAlias, floor, roomNumber }),
  });
  console.log('✅ Room 추가 완료');
  return response;
};

// Room에 사용자 추가 API
export const addUserToRoom = async (
  roomId: number,
  userEmail: string,
  role: string,
): Promise<unknown> => {
  console.log('➕ Room에 사용자 추가 시작...');
  console.log('📋 사용자 정보:', { roomId, userEmail, role });
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}/user`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userEmail, role }),
  });
  console.log('✅ Room에 사용자 추가 완료');
  return response;
};

// Room에서 사용자 삭제 API
export const removeUserFromRoom = async (roomId: number, userId: number): Promise<unknown> => {
  console.log('🗑️ Room에서 사용자 삭제 시작...');
  console.log('📋 삭제 정보:', { roomId, userId });
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}/user/${userId}`, {
    method: 'DELETE',
    headers,
  });
  console.log('✅ Room에서 사용자 삭제 완료');
  return response;
};

// Room 삭제 API
export const deleteRoom = async (roomId: number): Promise<unknown> => {
  console.log('🗑️ Room 삭제 시작...');
  console.log('📋 Room ID:', roomId);
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}`, {
    method: 'DELETE',
    headers,
  });
  console.log('✅ Room 삭제 완료');
  return response;
};

// Room에 카메라 추가 API
export const addCameraToRoom = async (
  roomId: number,
  deviceUuid: string,
  cameraEdgeAlias: string,
): Promise<unknown> => {
  console.log('➕ Room에 카메라 추가 시작...');
  console.log('📋 카메라 정보:', { roomId, deviceUuid, cameraEdgeAlias });
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}/camera-edge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ deviceUuid, cameraEdgeAlias }),
  });
  console.log('✅ Room에 카메라 추가 완료');
  return response;
};

// Room에서 카메라 삭제 API
export const removeCameraFromRoom = async (
  roomId: number,
  cameraEdgeId: number,
): Promise<unknown> => {
  console.log('🗑️ Room에서 카메라 삭제 시작...');
  console.log('📋 삭제 정보:', { roomId, cameraEdgeId });
  const headers = await getAuthHeaders();
  const response = await apiRequest(`/room/${roomId}/camera-edge/${cameraEdgeId}`, {
    method: 'DELETE',
    headers,
  });
  console.log('✅ Room에서 카메라 삭제 완료');
  return response;
};

// 소셜 로그인 API들
export const googleLogin = async (accessToken: string): Promise<AuthResponse> => {
  const response = await apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
    skipAuth: true,
  });
  console.log('🔑 [AUTH] Google 로그인 성공 — accessToken:', response!.accessToken);
  return response!;
};

export const kakaoLogin = async (accessToken: string): Promise<AuthResponse> => {
  const response = await apiRequest<AuthResponse>('/auth/kakao', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
    skipAuth: true,
  });
  console.log('🔑 [AUTH] Kakao 로그인 성공 — accessToken:', response!.accessToken);
  return response!;
};

// 토큰 갱신 API (공개 인터페이스)
export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  return performTokenRefresh();
};

// FCM 토큰 저장 API
export const saveFCMToken = async (fcmToken: string): Promise<unknown> => {
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
};

// ─── 스트리밍 API ───────────────────────────────────────

// 스트리밍 구독 토큰 발급 (LiveKit WebRTC 연결용)
export interface StreamTokenResponse {
  token: string;
  url?: string;
}

export const getStreamSubscribeToken = async (
  fireEventId: number,
): Promise<StreamTokenResponse> => {
  console.log(`📹 스트리밍 토큰 요청 - fireEventId: ${fireEventId}`);
  const headers = await getAuthHeaders();
  const response = await apiRequest<StreamTokenResponse>(
    `/fire-event/${fireEventId}/stream/subscribe`,
    {
      method: 'GET',
      headers,
    },
  );
  console.log('✅ 스트리밍 토큰 발급 완료');
  return response!;
};

// 화재 이벤트 녹화 영상 URL 조회
export interface RecordUrlResponse {
  recordUrl: string;
}

export const getFireEventRecordUrl = async (fireEventId: number): Promise<RecordUrlResponse> => {
  console.log(`🎥 녹화 영상 URL 요청 - fireEventId: ${fireEventId}`);
  const headers = await getAuthHeaders();
  const response = await apiRequest<RecordUrlResponse>(`/fire-event/${fireEventId}/record`, {
    method: 'GET',
    headers,
  });
  console.log('✅ 녹화 영상 URL 조회 완료');
  return response!;
};
