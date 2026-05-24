/**
 * 데모 모드용 중앙 집중형 샘플 데이터
 * 서버 연결 없이 전체 화면을 탐색할 수 있도록 한다.
 * 인하대학교 캠퍼스 환경 기반으로 구성.
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

// ─── 빌딩 데이터 (인하대학교 실제 건물명) ─────────────────
export const DEMO_BUILDINGS: Building[] = [
  { id: 1, buildingName: '하이테크센터' },
  { id: 2, buildingName: '정석학술정보관' },
  { id: 3, buildingName: '2호관' },
  { id: 4, buildingName: '60주년기념관' },
  { id: 5, buildingName: '학생회관' },
];

// ─── 방(Room) 목록 ─────────────────────────────────────
export const DEMO_ROOMS: Room[] = [
  {
    roomId: 1,
    roomAlias: '하이테크 5층 IoT 연구실',
    buildingName: '하이테크센터',
    floor: '5F',
    roomNumber: '501',
    cameraCountPerRoom: 3,
    fireEventCountPerRoom: 1,
  },
  {
    roomId: 2,
    roomAlias: '2호관 전자공학과 실험실',
    buildingName: '2호관',
    floor: '4F',
    roomNumber: '407',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 3,
    roomAlias: '정석 3층 서버실',
    buildingName: '정석학술정보관',
    floor: '3F',
    roomNumber: '302',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 2,
  },
  {
    roomId: 4,
    roomAlias: '60주년 기계공학과 실습실',
    buildingName: '60주년기념관',
    floor: '2F',
    roomNumber: '204',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 5,
    roomAlias: '학생회관 지하 조리실',
    buildingName: '학생회관',
    floor: 'B1F',
    roomNumber: 'B103',
    cameraCountPerRoom: 1,
    fireEventCountPerRoom: 1,
  },
  {
    roomId: 6,
    roomAlias: '하이테크 3층 캡스톤 랩',
    buildingName: '하이테크센터',
    floor: '3F',
    roomNumber: '305',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 0,
  },
  {
    roomId: 7,
    roomAlias: '2호관 화학공학과 실험실',
    buildingName: '2호관',
    floor: '3F',
    roomNumber: '312',
    cameraCountPerRoom: 2,
    fireEventCountPerRoom: 1,
  },
];

// ─── 방 상세 (멤버 + 카메라) ────────────────────────────
const DEMO_MEMBERS: Record<number, Member[]> = {
  1: [
    {
      userId: 1,
      nickname: '김정민 (관리자)',
      email: 'jmkim@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 2,
      nickname: '이서준',
      email: 'sjlee@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 3,
      nickname: '박지현',
      email: 'jhpark@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 4,
      nickname: '최윤호',
      email: 'yhchoi@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  2: [
    {
      userId: 5,
      nickname: '정해민 (조교)',
      email: 'hmjung@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 6,
      nickname: '송다영',
      email: 'dysong@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 7,
      nickname: '한승우',
      email: 'swhan@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
    {
      userId: 8,
      nickname: '윤지호',
      email: 'jhyoon@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
    {
      userId: 9,
      nickname: '강민서',
      email: 'mskang@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  3: [
    {
      userId: 10,
      nickname: '이동혁 (시설팀)',
      email: 'dhlee@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 11,
      nickname: '김태훈',
      email: 'thkim@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 12,
      nickname: '조은비',
      email: 'ebjo@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  4: [
    {
      userId: 13,
      nickname: '박상현 (교수)',
      email: 'shpark@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 14,
      nickname: '유지원',
      email: 'jwyu@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 15,
      nickname: '나현준',
      email: 'hjnah@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 16,
      nickname: '임수빈',
      email: 'sblim@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
    {
      userId: 17,
      nickname: '오태양',
      email: 'tyoh@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
    {
      userId: 18,
      nickname: '서민재',
      email: 'mjseo@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  5: [
    {
      userId: 19,
      nickname: '권영수 (시설관리)',
      email: 'yskwon@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 20,
      nickname: '장미라',
      email: 'mrjang@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 21,
      nickname: '배준혁',
      email: 'jhbae@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  6: [
    {
      userId: 1,
      nickname: '김정민 (관리자)',
      email: 'jmkim@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 22,
      nickname: '문하영',
      email: 'hymoon@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 23,
      nickname: '신동현',
      email: 'dhshin@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 24,
      nickname: '백서연',
      email: 'sybaek@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
  7: [
    {
      userId: 25,
      nickname: '황진우 (조교)',
      email: 'jwhwang@inha.edu',
      profileImageUrl: null,
      role: 'ADMIN',
    },
    {
      userId: 26,
      nickname: '고은채',
      email: 'ecko@inha.edu',
      profileImageUrl: null,
      role: 'EDITOR',
    },
    {
      userId: 27,
      nickname: '남기태',
      email: 'ktnam@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
    {
      userId: 28,
      nickname: '전소율',
      email: 'syjeon@inha.edu',
      profileImageUrl: null,
      role: 'VIEWER',
    },
  ],
};

const DEMO_CAMERAS: Record<number, Camera[]> = {
  1: [
    {
      cameraId: 1,
      deviceUuid: 'rpi-iot-501-entrance',
      cameraEdgeAlias: 'IoT랩 출입구',
      locationFloor: '5F',
      roomNumber: '501',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 2,
      deviceUuid: 'rpi-iot-501-workbench',
      cameraEdgeAlias: 'IoT랩 작업대',
      locationFloor: '5F',
      roomNumber: '501',
      isFireOccurring: true,
      fireEventId: 1001,
    },
    {
      cameraId: 3,
      deviceUuid: 'rpi-iot-501-storage',
      cameraEdgeAlias: 'IoT랩 자재보관함',
      locationFloor: '5F',
      roomNumber: '501',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  2: [
    {
      cameraId: 4,
      deviceUuid: 'rpi-ee-407-main',
      cameraEdgeAlias: '전자과 실험대 A',
      locationFloor: '4F',
      roomNumber: '407',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 5,
      deviceUuid: 'rpi-ee-407-soldering',
      cameraEdgeAlias: '전자과 납땜 구역',
      locationFloor: '4F',
      roomNumber: '407',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  3: [
    {
      cameraId: 6,
      deviceUuid: 'rpi-lib-302-rack-a',
      cameraEdgeAlias: '서버 랙 A열',
      locationFloor: '3F',
      roomNumber: '302',
      isFireOccurring: true,
      fireEventId: 1005,
    },
    {
      cameraId: 7,
      deviceUuid: 'rpi-lib-302-rack-b',
      cameraEdgeAlias: '서버 랙 B열',
      locationFloor: '3F',
      roomNumber: '302',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  4: [
    {
      cameraId: 8,
      deviceUuid: 'rpi-me-204-cnc',
      cameraEdgeAlias: '기계과 CNC 가공기 옆',
      locationFloor: '2F',
      roomNumber: '204',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 9,
      deviceUuid: 'rpi-me-204-welding',
      cameraEdgeAlias: '기계과 용접 실습대',
      locationFloor: '2F',
      roomNumber: '204',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  5: [
    {
      cameraId: 10,
      deviceUuid: 'rpi-cafe-b103-kitchen',
      cameraEdgeAlias: '조리실 가스레인지 상단',
      locationFloor: 'B1F',
      roomNumber: 'B103',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  6: [
    {
      cameraId: 11,
      deviceUuid: 'rpi-cap-305-main',
      cameraEdgeAlias: '캡스톤랩 중앙',
      locationFloor: '3F',
      roomNumber: '305',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 12,
      deviceUuid: 'rpi-cap-305-3dprinter',
      cameraEdgeAlias: '캡스톤랩 3D프린터',
      locationFloor: '3F',
      roomNumber: '305',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
  7: [
    {
      cameraId: 13,
      deviceUuid: 'rpi-chem-312-hood',
      cameraEdgeAlias: '화학과 흄후드 A',
      locationFloor: '3F',
      roomNumber: '312',
      isFireOccurring: false,
      fireEventId: null,
    },
    {
      cameraId: 14,
      deviceUuid: 'rpi-chem-312-storage',
      cameraEdgeAlias: '화학과 시약 보관함',
      locationFloor: '3F',
      roomNumber: '312',
      isFireOccurring: false,
      fireEventId: null,
    },
  ],
};

// ─── 화재 이벤트 ────────────────────────────────────────
export const DEMO_FIRE_EVENTS: FireEvent[] = [
  {
    id: 1001,
    date: '2026-05-24 09:47:32',
    cameraId: 2,
    detectionType: '연기 감지',
    riskLevel: '높음',
  },
  {
    id: 1002,
    date: '2026-05-23 15:12:05',
    cameraId: 6,
    detectionType: '화염 감지',
    riskLevel: '매우 높음',
  },
  {
    id: 1003,
    date: '2026-05-22 11:35:18',
    cameraId: 10,
    detectionType: '화염 감지',
    riskLevel: '매우 높음',
  },
  {
    id: 1004,
    date: '2026-05-20 17:08:44',
    cameraId: 13,
    detectionType: '연기 감지',
    riskLevel: '높음',
  },
  {
    id: 1005,
    date: '2026-05-24 10:15:03',
    cameraId: 6,
    detectionType: '연기 감지',
    riskLevel: '높음',
  },
  {
    id: 1006,
    date: '2026-05-18 08:22:56',
    cameraId: 5,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 1007,
    date: '2026-05-15 14:50:31',
    cameraId: 8,
    detectionType: '화염 감지',
    riskLevel: '높음',
  },
  {
    id: 1008,
    date: '2026-05-12 20:33:17',
    cameraId: 1,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 1009,
    date: '2026-05-10 10:05:42',
    cameraId: 4,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 1010,
    date: '2026-05-07 16:28:09',
    cameraId: 9,
    detectionType: '화염 감지',
    riskLevel: '매우 높음',
  },
  {
    id: 1011,
    date: '2026-05-03 13:44:55',
    cameraId: 11,
    detectionType: '연기 감지',
    riskLevel: '보통',
  },
  {
    id: 1012,
    date: '2026-04-28 09:17:23',
    cameraId: 14,
    detectionType: '화염 감지',
    riskLevel: '높음',
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

/** 데모 방 ID인지 확인 */
export function isDemoRoomId(roomId: number): boolean {
  return DEMO_ROOMS.some((r) => r.roomId === roomId);
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

/** 특정 층의 데모 방/카메라 정보 반환 (평면도용) */
export function getDemoRoomsForFloor(floor: string): {
  cameraCounts: Record<string, number>;
  fireRooms: string[];
} {
  const cameraCounts: Record<string, number> = {};
  const fireRooms: string[] = [];

  // 모든 방을 순회하며 해당 층의 카메라/화재 정보 수집
  for (const room of DEMO_ROOMS) {
    if (room.floor.toUpperCase() === floor.toUpperCase()) {
      cameraCounts[room.roomNumber] = room.cameraCountPerRoom;
      const cameras = DEMO_CAMERAS[room.roomId] || [];
      const hasActiveFire = cameras.some((c) => c.isFireOccurring);
      if (hasActiveFire || room.fireEventCountPerRoom > 0) {
        fireRooms.push(room.roomNumber);
      }
    }
  }

  return { cameraCounts, fireRooms };
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
