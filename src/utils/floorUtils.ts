/**
 * 건물 층/방 관련 유틸리티
 */

// ─── 타입 정의 ─────────────────────────────────────────

export interface FloorInfo {
  /** 원본 값 (예: '5F', 'B1F') */
  raw: string;
  /** 화면 표시용 (예: '5층', 'B1층') */
  display: string;
  /** 정렬 키 (B1=-1, 1F=1, ...) */
  sortKey: number;
  /** 지하층 여부 */
  isBasement: boolean;
}

export type RoomSize = 'large' | 'normal' | 'small';

export interface FloorRoom {
  /** 방 번호 문자열 (예: '501', 'B103') */
  roomNumber: string;
  /** 화면 표시용 (예: '501호') */
  displayName: string;
  /** 화재 발생 여부 */
  hasFire: boolean;
  /** 카메라 수 */
  cameraCount: number;
  /** 방 크기 (코너: large, 끝: small, 일반: normal) */
  size: RoomSize;
  /** 위험도 (0~1) */
  riskLevel: number;
}

export interface FloorLayout {
  /** 상단 행 방 목록 */
  topRooms: FloorRoom[];
  /** 하단 행 방 목록 */
  bottomRooms: FloorRoom[];
}

// ─── 층 파싱 ──────────────────────────────────────────

/** 층 문자열 파싱 (예: '5F' → FloorInfo, 'B1F' → FloorInfo) */
export function parseFloor(floorStr: string): FloorInfo {
  const raw = floorStr.toUpperCase();

  // 지하층: 'B1F', 'B1', 'B2F' 등
  const basementMatch = raw.match(/^B(\d+)F?$/);
  if (basementMatch) {
    const level = parseInt(basementMatch[1], 10);
    return {
      raw,
      display: `B${level}층`,
      sortKey: -level,
      isBasement: true,
    };
  }

  // 지상층: '5F', '5', '12F' 등
  const floorMatch = raw.match(/^(\d+)F?$/);
  if (floorMatch) {
    const level = parseInt(floorMatch[1], 10);
    return {
      raw,
      display: `${level}층`,
      sortKey: level,
      isBasement: false,
    };
  }

  // 폴백: 숫자만 추출 시도
  const numOnly = parseInt(raw, 10);
  if (!isNaN(numOnly)) {
    return {
      raw,
      display: `${numOnly}층`,
      sortKey: numOnly,
      isBasement: false,
    };
  }

  // 파싱 실패 시 기본값
  return { raw, display: raw, sortKey: 0, isBasement: false };
}

// ─── 층 목록 생성 ─────────────────────────────────────

/** B1~12층 목록 반환 (총 13개) */
export function generateFloorList(): FloorInfo[] {
  const floors: FloorInfo[] = [];

  // B1층
  floors.push(parseFloor('B1F'));

  // 1층~12층
  for (let i = 1; i <= 12; i++) {
    floors.push(parseFloor(`${i}F`));
  }

  return floors;
}

// ─── 방 크기 결정 ─────────────────────────────────────

/** 방 인덱스(0~11)에 따라 크기 결정 */
function getRoomSize(index: number): RoomSize {
  // 코너방 (각 행의 첫 번째)
  if (index === 0 || index === 6) return 'large';
  // 끝방 (각 행의 마지막)
  if (index === 5 || index === 11) return 'small';
  return 'normal';
}

// ─── 방 목록 생성 ─────────────────────────────────────

/** 특정 층의 방 12개 생성 */
export function generateRoomsForFloor(
  floorInfo: FloorInfo,
  fireRoomNumber: string,
  cameraCounts?: Record<string, number>,
): FloorLayout {
  const rooms: FloorRoom[] = [];

  for (let i = 1; i <= 12; i++) {
    const roomNum = i.toString().padStart(2, '0');
    const roomNumber = floorInfo.isBasement
      ? `B${Math.abs(floorInfo.sortKey)}${roomNum}`
      : `${floorInfo.sortKey}${roomNum}`;

    const hasFire = roomNumber === fireRoomNumber;
    const cameraCount = cameraCounts?.[roomNumber] ?? 0;

    rooms.push({
      roomNumber,
      displayName: `${roomNumber}호`,
      hasFire,
      cameraCount,
      size: getRoomSize(i - 1),
      riskLevel: hasFire ? 1.0 : getRiskLevel(cameraCount),
    });
  }

  return {
    topRooms: rooms.slice(0, 6),
    bottomRooms: rooms.slice(6, 12),
  };
}

// ─── 위험도 판별 ──────────────────────────────────────

/** 카메라 수와 기타 요인으로 위험도 산출 (0~1) */
function getRiskLevel(cameraCount: number): number {
  if (cameraCount === 0) return 0.1;
  if (cameraCount === 1) return 0.3;
  if (cameraCount === 2) return 0.2;
  return 0.15;
}

/** 위험도 → 색상 */
export function getRiskColor(riskLevel: number): string {
  if (riskLevel >= 0.8) return '#E31E24'; // 빨강
  if (riskLevel >= 0.5) return '#FF8C00'; // 주황
  if (riskLevel >= 0.3) return '#FFD700'; // 노랑
  return '#4CAF50'; // 초록
}

/** 화재 방 위치 기반 대피 방향 결정 */
export function getEvacuationDirection(
  fireRoomNumber: string,
  allRooms: FloorRoom[],
): 'left' | 'right' | 'both' {
  const fireIndex = allRooms.findIndex((r) => r.roomNumber === fireRoomNumber);
  if (fireIndex === -1) return 'both';

  // 12개 방 기준: 0~5 상단, 6~11 하단
  const posInRow = fireIndex < 6 ? fireIndex : fireIndex - 6;

  if (posInRow <= 2) return 'right'; // 좌측에 화재 → 우측으로 대피
  return 'left'; // 우측에 화재 → 좌측으로 대피
}
