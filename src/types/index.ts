// 도메인 모델
export interface Building {
  id: number;
  buildingName: string;
}

export interface Room {
  roomId: number;
  roomAlias: string;
  buildingName: string;
  floor: string;
  roomNumber: string;
  cameraCountPerRoom: number;
  fireEventCountPerRoom: number;
}

export interface RoomDetail {
  roomId: number;
  roomAlias: string;
  buildingName: string;
  floor: string;
  roomNumber: string;
  members: Member[];
  cameras: Camera[];
}

export interface Member {
  userId: number;
  nickname: string;
  email: string;
  profileImageUrl: string | null;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export interface Camera {
  cameraId: number;
  deviceUuid: string;
  cameraEdgeAlias: string;
  locationFloor: string;
  roomNumber: string;
  isFireOccurring: boolean;
  fireEventId: number | null;
}

export interface FireEvent {
  id: number;
  date: string;
  cameraId: number;
  detectionType: string;
  riskLevel: string;
}

export interface UserInfo {
  email?: string;
  nickname?: string;
  refreshToken?: string;
  isOfflineMode?: boolean;
  expiresIn?: number;
  provider?: string;
  isNewUser?: boolean;
  kakaoId?: number;
}

// API 응답
export interface RoomListResponse {
  content: Room[];
  totalPages: number;
  totalElements: number;
}

export interface RoomSummaryResponse {
  totalRoomCount: number;
  totalCameraCount: number;
  liveStreamCount: number;
  roomList: Room[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  userRole: string;
  email: string;
  nickname: string;
  isNewUser: boolean;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

export interface BuildingListResponse {
  buildingList: Building[];
}

// 네비게이션 파라미터
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RoomDetail: { room: Room };
  FireAlertDetail: { camera: Camera; room: RoomDetail | Room };
  CCTVLive: { camera: Camera; room: RoomDetail | Room };
  FireLocation: { camera: Camera; room: RoomDetail | Room };
  FireEventHistory: { camera: Camera; room: RoomDetail | Room };
  FireEventVideo: { event: FireEvent; camera: Camera; room: RoomDetail | Room };
};

// 시뮬레이션 데이터
export interface SimulationData {
  event: FireEvent;
  camera: Camera;
  room: RoomDetail;
}
