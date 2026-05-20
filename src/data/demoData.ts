/**
 * 데모 모드용 중앙 집중형 샘플 데이터
 * 서버 연결 없이 전체 화면을 탐색할 수 있도록 한다.
 */

import type {
  Building,
  Room,
  RoomDetail,
  Member,
  Camera,
  FireEvent,
  SimulationData,
  RoomSummaryResponse,
} from '../types';

// ─── 빌딩 데이터 ────────────────────────────────────────
export const DEMO_BUILDINGS: Building[] = [
  { id: 1, buildingName: '본관 A동' },
  { id: 2, buildingName: '연구동 B동' },
  { id: 3, buildingName: '기숙사 C동' },
];

// ─── 방(Room) 목록 ─────────────────────────────────────
export const DEMO_ROOMS: Room[] = [
  {
    roomId: 1,
    roomAlias: 'A동 1층 서버실',
    buildingName: '본관 A동',
    floor: '1F',
    roomNumber: '101',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 1,
  },
  {
    roomId: 2,
    roomAlias: 'A동 3층 회의실',
    buildingName: '본관 A동',
    floor: '3F',
    roomNumber: '305',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 3,
    roomAlias: 'B동 2층 연구실',
    buildingName: '연구동 B동',
    floor: '2F',
    roomNumber: '201',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 4,
    roomAlias: 'B동 3층 실험실',
    buildingName: '연구동 B동',
    floor: '3F',
    roomNumber: '302',
    cameraCountPerRoom: 1,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 5,
    roomAlias: 'C동 1층 휴게실',
    buildingName: '기숙사 C동',
    floor: '1F',
    roomNumber: '103',
    cameraCountPerRoom: 1,
    fireEventCountPerRoom: 0,
  },
];

// ─── 방 상세 (멤버 + 카메라) ────────────────────────────
const DEMO_MEMBERS: Record<number, Member[]> = {
  1: [
    {
      userId: 1,
      nickname: '박인성',
      email: 'park@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 2,
      nickname: '이정빈',
      email: 'lee@example.com',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 3,
      nickname: '조현준',
      email: 'jo@example.com',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  2: [
    {
      userId: 1,
      nickname: '박인성',
      email: 'park@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 4,
      nickname: '김민지',
      email: 'kim@example.com',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 5,
      nickname: '최서연',
      email: 'choi@example.com',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  3: [
    {
      userId: 1,
      nickname: '박인성',
      email: 'park@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 6,
      nickname: '정다은',
      email: 'jung@example.com',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 7,
      nickname: '한승우',
      email: 'han@example.com',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  4: [
    {
      userId: 1,
      nickname: '박인성',
      email: 'park@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 8,
      nickname: '윤지호',
      email: 'yoon@example.com',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  5: [
    {
      userId: 1,
      nickname: '박인성',
      email: 'park@example.com',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 9,
      nickname: '송하린',
      email: 'song@example.com',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
};

const DEMO_CAMERAS: Record<number, Camera[]> = {
  1: [
    {
      cameraId: 1,
      deviceUuid: 'cam-a101-01',
      cameraEdgeAlias: '서버실 입구 캠',
      locationFloor: '1F',
      roomNumber: '101',
      isFireOccurring: true,
      fireEventId: 1001,
    },
    {
      cameraId: 2,
      deviceUuid: 'cam-a101-02',
      cameraEdgeAlias: '서버실 내부 캠',
      locationFloor: '1F',
      roomNumber: '101',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  2: [
    {
      cameraId: 3,
      deviceUuid: 'cam-a305-01',
      cameraEdgeAlias: '회의실 전면 캠',
      locationFloor: '3F',
      roomNumber: '305',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 4,
      deviceUuid: 'cam-a305-02',
      cameraEdgeAlias: '회의실 후면 캠',
      locationFloor: '3F',
      roomNumber: '305',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  3: [
    {
      cameraId: 5,
      deviceUuid: 'cam-b201-01',
      cameraEdgeAlias: '연구실 중앙 캠',
      locationFloor: '2F',
      roomNumber: '201',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 6,
      deviceUuid: 'cam-b201-02',
      cameraEdgeAlias: '연구실 출입구 캠',
      locationFloor: '2F',
      roomNumber: '201',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  4: [
    {
      cameraId: 7,
      deviceUuid: 'cam-b302-01',
      cameraEdgeAlias: '실험실 캠',
      locationFloor: '3F',
      roomNumber: '302',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  5: [
    {
      cameraId: 8,
      deviceUuid: 'cam-c103-01',
      cameraEdgeAlias: '휴게실 캠',
      locationFloor: '1F',
      roomNumber: '103',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
};

// ─── 화재 이벤트 ────────────────────────────────────────
export const DEMO_FIRE_EVENTS: FireEvent[] = [
  {
    id: 1,
    date: '2026-05-21 14:32:15',
    cameraId: 1,
    detectionType: '연기 감지',
    riskLevel: '높음',
  },
  {
    id: 2,
    date: '2026-05-19 09:15:42',
    cameraId: 1,
    detectionType: '화염 감지',
    riskLevel: '매우 높음',
  },
  {
    id: 3,
    date: '2026-05-15 16:48:23',
    cameraId: 3,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 4,
    date: '2026-05-12 11:20:56',
    cameraId: 2,
    detectionType: '온도 이상',
    riskLevel: '높음',
  },
  {
    id: 5,
    date: '2026-05-08 13:05:31',
    cameraId: 5,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 6,
    date: '2026-04-28 08:44:10',
    cameraId: 7,
    detectionType: '화염 감지',
    riskLevel: '매우 높음',
  },
  {
    id: 7,
    date: '2026-04-20 22:17:03',
    cameraId: 1,
    detectionType: '연기 감지',
    riskLevel: '높음',
  },
  {
    id: 8,
    date: '2026-04-15 15:33:29',
    cameraId: 4,
    detectionType: '온도 이상',
    riskLevel: '보통',
  },
  {
    id: 9,
    date: '2026-04-10 10:12:45',
    cameraId: 6,
    detectionType: '화염 감지',
    riskLevel: '높음',
  },
  {
    id: 10,
    date: '2026-04-01 07:58:18',
    cameraId: 8,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
];

// ─── 비디오 소스 ─────────────────────────────────────────
// 로컬 MP4가 있으면 require(), 없으면 null (화면에서 폴백 처리)
let cctvSource: number | null = null;
let fireEventSource: number | null = null;
try {
  cctvSource = require('../../assets/videos/demo-cctv.mp4');
} catch (e) {
  /* 파일 없음 — 폴백 */
}
try {
  fireEventSource = require('../../assets/videos/demo-fire-event.mp4');
} catch (e) {
  /* 파일 없음 — 폴백 */
}

export const DEMO_VIDEO_SOURCES: { cctvLive: number | null; fireEvent: number | null } = {
  cctvLive: cctvSource,
  fireEvent: fireEventSource,
};

// ─── 헬퍼 함수 ──────────────────────────────────────────

/** 홈 화면용 방 데이터 반환 */
export function getDemoRoomData(): RoomSummaryResponse {
  const totalCameras = DEMO_ROOMS.reduce((sum, r) => sum + r.cameraCountPerRoom, 0);
  const totalFires = DEMO_ROOMS.reduce((sum, r) => sum + r.fireEventCountPerRoom, 0);
  return {
    totalRoomCount: DEMO_ROOMS.length,
    totalCameraCount: totalCameras,
    liveStreamCount: totalFires,
    roomList: DEMO_ROOMS,
  };
}

/** 빌딩 목록 반환 */
export function getDemoBuildings(): Building[] {
  return DEMO_BUILDINGS;
}

/** 방 상세 정보 반환 */
export function getDemoRoomDetail(roomId: number): RoomDetail {
  const room = DEMO_ROOMS.find((r) => r.roomId === roomId) || DEMO_ROOMS[0];
  return {
    roomId: room.roomId,
    roomAlias: room.roomAlias,
    buildingName: room.buildingName,
    floor: room.floor,
    roomNumber: room.roomNumber,
    members: DEMO_MEMBERS[room.roomId] || DEMO_MEMBERS[1],
    cameras: DEMO_CAMERAS[room.roomId] || DEMO_CAMERAS[1],
  };
}

/** 카메라별 화재 이벤트 목록 반환 */
export function getDemoFireEvents(cameraId?: number): FireEvent[] {
  if (!cameraId) return DEMO_FIRE_EVENTS;
  const filtered = DEMO_FIRE_EVENTS.filter((e) => e.cameraId === cameraId);
  // 해당 카메라의 이벤트가 없으면 전체 이벤트 반환 (데모 목적)
  return filtered.length > 0 ? filtered : DEMO_FIRE_EVENTS;
}

/** 화재 시뮬레이션용 랜덤 이벤트 생성 */
export function simulateFireEvent(): SimulationData {
  const room = DEMO_ROOMS[Math.floor(Math.random() * DEMO_ROOMS.length)];
  const cameras = DEMO_CAMERAS[room.roomId] || [];
  const camera = cameras[0] || {
    cameraId: 1,
    cameraEdgeAlias: '카메라 1',
    locationFloor: room.floor,
    roomNumber: room.roomNumber,
  };
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return {
    event: {
      id: Date.now(),
      date: dateStr,
      cameraId: camera.cameraId,
      detectionType: '화염 감지',
      riskLevel: '매우 높음',
    },
    camera: {
      ...camera,
      isFireOccurring: true,
      fireEventId: Date.now(),
    },
    room: {
      roomId: room.roomId,
      roomAlias: room.roomAlias,
      buildingName: room.buildingName,
      floor: room.floor,
      roomNumber: room.roomNumber,
      members: DEMO_MEMBERS[room.roomId] || [],
      cameras: cameras,
    },
  };
}
