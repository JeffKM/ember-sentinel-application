import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RoomCell from './RoomCell';
import type { FloorLayout } from '../../utils/floorUtils';

interface Props {
  layout: FloorLayout;
  floorDisplay: string;
  isBasement: boolean;
}

/** 건물 평면도 레이아웃 */
export default function FloorPlanView({ layout, floorDisplay, isBasement }: Props) {
  return (
    <View style={styles.outerWall}>
      {/* 층 표시 + 출입구 */}
      <View style={styles.entranceRow}>
        <Text style={styles.floorLabel}>{floorDisplay}</Text>
        <View style={styles.entranceGate}>
          <Text style={styles.entranceText}>{isBasement ? '▼ 지하 계단' : '▼ 출입구'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 평면도 내부 */}
      <View style={styles.innerArea}>
        {/* 상단 행: 6개 방 */}
        <View style={styles.roomRow}>
          {layout.topRooms.map((room) => (
            <RoomCell key={room.roomNumber} room={room} />
          ))}
        </View>

        {/* 복도 영역: 계단 + 복도 + 엘리베이터 */}
        <View style={styles.corridorArea}>
          {/* 계단실 */}
          <View style={styles.stairwell}>
            <Text style={styles.facilityIcon}>🪜</Text>
            <Text style={styles.facilityLabel}>계단</Text>
          </View>

          {/* 복도 */}
          <View style={styles.corridor}>
            <View style={styles.corridorLine} />
            <Text style={styles.corridorText}>복 도</Text>
            <View style={styles.corridorLine} />
          </View>

          {/* 엘리베이터 */}
          <View style={styles.elevator}>
            <Text style={styles.facilityIcon}>E/V</Text>
            <Text style={styles.facilityLabel}>승강기</Text>
          </View>
        </View>

        {/* 하단 행: 6개 방 */}
        <View style={styles.roomRow}>
          {layout.bottomRooms.map((room) => (
            <RoomCell key={room.roomNumber} room={room} />
          ))}
        </View>
      </View>

      {/* 비상구 */}
      <View style={styles.exitRow}>
        <View style={styles.exitLeft}>
          <Text style={styles.exitIcon}>🚪</Text>
          <Text style={styles.exitText}>비상구</Text>
        </View>
        <View style={styles.exitRight}>
          <Text style={styles.exitIcon}>🚪</Text>
          <Text style={styles.exitText}>비상구</Text>
        </View>
      </View>
    </View>
  );
}

const WALL_COLOR = '#8B7355';
const WALL_INNER = '#E8E0D4';

const styles = StyleSheet.create({
  outerWall: {
    backgroundColor: WALL_COLOR,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#6B5B45',
    padding: 3,
    width: '100%',
    maxWidth: 400,
  },
  entranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  floorLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    width: 40,
  },
  entranceGate: {
    backgroundColor: '#A0522D',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D2B48C',
  },
  entranceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  innerArea: {
    backgroundColor: WALL_INNER,
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  roomRow: {
    flexDirection: 'row',
    gap: 5,
  },
  corridorArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  stairwell: {
    width: 44,
    height: 40,
    backgroundColor: '#D4C4A8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B0A080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corridor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D9D0C0',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  corridorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B0A080',
  },
  corridorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 4,
  },
  elevator: {
    width: 44,
    height: 40,
    backgroundColor: '#C0C0C0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityIcon: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
  },
  facilityLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 1,
  },
  exitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  exitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exitIcon: {
    fontSize: 14,
  },
  exitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
