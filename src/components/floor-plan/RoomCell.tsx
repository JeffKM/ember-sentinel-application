import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { FloorRoom } from '../../utils/floorUtils';
import { getRiskColor } from '../../utils/floorUtils';

interface Props {
  room: FloorRoom;
}

/** 개별 방 셀 컴포넌트 */
export default function RoomCell({ room }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 화재 방 펄스 애니메이션
  useEffect(() => {
    if (!room.hasFire) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [room.hasFire, pulseAnim]);

  // 방 크기에 따른 flex 비율
  const flexValue = room.size === 'large' ? 1.5 : room.size === 'small' ? 0.8 : 1;

  const riskColor = getRiskColor(room.riskLevel);

  return (
    <Animated.View
      style={[
        styles.container,
        { flex: flexValue },
        room.hasFire && styles.containerFire,
        room.hasFire && { opacity: pulseAnim },
      ]}
    >
      {/* 카메라 아이콘 (우측 상단) */}
      {room.cameraCount > 0 && (
        <View style={styles.cameraTag}>
          <Text style={styles.cameraIcon}>cam</Text>
          <Text style={styles.cameraCount}>{room.cameraCount}</Text>
        </View>
      )}

      {/* 화재 아이콘 */}
      {room.hasFire && <Text style={styles.fireIcon}>🔥</Text>}

      {/* 방 번호 */}
      <Text style={[styles.roomNumber, room.hasFire && styles.roomNumberFire]} numberOfLines={1}>
        {room.displayName}
      </Text>

      {/* 위험도 바 (하단) */}
      <View style={styles.riskBarContainer}>
        <View
          style={[
            styles.riskBar,
            {
              backgroundColor: riskColor,
              width: `${Math.max(room.riskLevel * 100, 10)}%`,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  containerFire: {
    backgroundColor: '#FFE5E5',
    borderColor: '#E31E24',
    borderWidth: 2.5,
  },
  cameraTag: {
    position: 'absolute',
    top: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    gap: 2,
  },
  cameraIcon: {
    fontSize: 7,
    color: '#666',
  },
  cameraCount: {
    fontSize: 8,
    fontWeight: '700',
    color: '#555',
  },
  fireIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  roomNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  roomNumberFire: {
    color: '#E31E24',
    fontWeight: 'bold',
  },
  riskBarContainer: {
    position: 'absolute',
    bottom: 3,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: '#EEEEEE',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  riskBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
