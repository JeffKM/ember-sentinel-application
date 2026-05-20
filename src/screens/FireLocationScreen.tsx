import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';

interface FloorRoom {
  id: string;
  name: string;
  hasFire: boolean;
}

type Props = StackScreenProps<RootStackParamList, 'FireLocation'>;

export default function FireLocationScreen({ route, navigation }: Props) {
  const { camera, room } = route.params;
  const [selectedFloor, setSelectedFloor] = useState('3층');

  const floors = ['1층', '2층', '3층', '4층', '5층', '6층'];

  // 층별 호실 데이터 생성 함수
  const getRoomsForFloor = (floor: string): FloorRoom[] => {
    const floorNumber = floor.replace('층', '');
    const startRoom = parseInt(floorNumber) * 100 + 1;

    return [
      { id: `${startRoom}`, name: `${startRoom}호`, hasFire: false },
      { id: `${startRoom + 1}`, name: `${startRoom + 1}호`, hasFire: false },
      { id: `${startRoom + 2}`, name: `${startRoom + 2}호`, hasFire: false },
      { id: `${startRoom + 3}`, name: `${startRoom + 3}호`, hasFire: false },
      {
        id: `${startRoom + 4}`,
        name: `${startRoom + 4}호`,
        hasFire: selectedFloor === '3층' && `${startRoom + 4}호` === '305호',
      },
      { id: `${startRoom + 5}`, name: `${startRoom + 5}호`, hasFire: false },
    ];
  };

  const rooms = getRoomsForFloor(selectedFloor);
  const fireRoom = rooms.find((r) => r.hasFire);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>건물 평면도</Text>
          <Text style={styles.headerSubtitle}>
            {selectedFloor === '3층' ? '3층 305호 화재 발생' : `${selectedFloor} 평면도`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Floor Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.floorSelector}
        contentContainerStyle={styles.floorSelectorContent}
      >
        {floors.map((floor) => (
          <TouchableOpacity
            key={floor}
            style={[styles.floorButton, selectedFloor === floor && styles.floorButtonActive]}
            onPress={() => setSelectedFloor(floor)}
          >
            <Text
              style={[
                styles.floorButtonText,
                selectedFloor === floor && styles.floorButtonTextActive,
              ]}
            >
              {floor}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Building Map */}
      <View style={styles.mapContainer}>
        <View style={styles.floorPlan}>
          {/* Top Row */}
          <View style={styles.roomRow}>
            {rooms.slice(0, 3).map((room) => (
              <View key={room.id} style={styles.room}>
                <Text style={styles.roomNumber}>{room.name}</Text>
              </View>
            ))}
          </View>

          {/* Corridor Label */}
          <View style={styles.corridor}>
            <Text style={styles.corridorText}>복도</Text>
          </View>

          {/* Bottom Row */}
          <View style={styles.roomRow}>
            {rooms.slice(3, 6).map((room) => (
              <View key={room.id} style={[styles.room, room.hasFire && styles.roomFire]}>
                {room.hasFire && <Text style={styles.fireIcon}>🔥</Text>}
                <Text style={[styles.roomNumber, room.hasFire && styles.roomNumberFire]}>
                  {room.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fire Alert Card - Below floor plan */}
        {fireRoom && (
          <View style={styles.fireAlertCard}>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeIcon}>🚨</Text>
              <Text style={styles.alertBadgeText}>화재 지점</Text>
            </View>
            <Text style={styles.fireAlertMessage}>
              {selectedFloor} 복도에서 화재가 발생했습니다.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#CCCCCC',
    marginTop: 4,
  },
  floorSelector: {
    maxHeight: 60,
    marginBottom: 20,
  },
  floorSelectorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  floorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  floorButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  floorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999999',
  },
  floorButtonTextActive: {
    color: '#1a1a2e',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floorPlan: {
    backgroundColor: '#E5E5E5',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  fireAlertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fireAlertMessage: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
  roomRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  room: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomFire: {
    backgroundColor: '#FFE5E5',
    borderColor: '#E31E24',
    borderWidth: 3,
  },
  roomNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  roomNumberFire: {
    color: '#E31E24',
    fontWeight: 'bold',
  },
  fireIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  corridor: {
    backgroundColor: '#D0D0D0',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  corridorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  alertBadgeIcon: {
    fontSize: 16,
  },
  alertBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
