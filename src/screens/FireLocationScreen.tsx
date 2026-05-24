import React, { useState, useMemo } from 'react';
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
import {
  parseFloor,
  generateFloorList,
  generateRoomsForFloor,
  getEvacuationDirection,
} from '../utils/floorUtils';
import type { FloorInfo } from '../utils/floorUtils';
import { getDemoRoomsForFloor } from '../data/demoData';
import FloorSelector from '../components/floor-plan/FloorSelector';
import FloorPlanView from '../components/floor-plan/FloorPlanView';
import EvacuationOverlay from '../components/floor-plan/EvacuationOverlay';

type Props = StackScreenProps<RootStackParamList, 'FireLocation'>;

export default function FireLocationScreen({ route, navigation }: Props) {
  const { camera, room } = route.params;

  // 카메라 데이터에서 화재 층/호실 추출
  const fireFloorRaw = camera?.locationFloor || room?.floor || '3F';
  const fireRoomNumber = camera?.roomNumber || room?.roomNumber || '305';
  const fireFloorInfo = useMemo(() => parseFloor(fireFloorRaw), [fireFloorRaw]);

  // 층 목록 (B1~12층)
  const floors = useMemo(() => generateFloorList(), []);

  // 현재 선택된 층
  const [selectedFloor, setSelectedFloor] = useState<FloorInfo>(fireFloorInfo);

  // 대피 경로 토글
  const [showEvacuation, setShowEvacuation] = useState(false);

  // 화재 발생 층 목록 (인디케이터용)
  const fireFloors = useMemo(() => [fireFloorRaw], [fireFloorRaw]);

  // 선택된 층의 방 레이아웃
  const floorLayout = useMemo(() => {
    const demoData = getDemoRoomsForFloor(
      selectedFloor.isBasement
        ? `B${Math.abs(selectedFloor.sortKey)}F`
        : `${selectedFloor.sortKey}F`,
    );
    return generateRoomsForFloor(selectedFloor, fireRoomNumber, demoData.cameraCounts);
  }, [selectedFloor, fireRoomNumber]);

  // 대피 방향
  const evacuationDir = useMemo(() => {
    const allRooms = [...floorLayout.topRooms, ...floorLayout.bottomRooms];
    return getEvacuationDirection(fireRoomNumber, allRooms);
  }, [floorLayout, fireRoomNumber]);

  // 현재 층에 화재가 있는지
  const isFireFloor = selectedFloor.sortKey === fireFloorInfo.sortKey;

  // 헤더 부제목
  const subtitle = isFireFloor
    ? `${fireFloorInfo.display} ${fireRoomNumber}호 화재 발생`
    : `${selectedFloor.display} 평면도`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>건물 평면도</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 층 선택기 */}
      <FloorSelector
        floors={floors}
        selectedFloor={selectedFloor}
        fireFloors={fireFloors}
        onSelectFloor={setSelectedFloor}
      />

      {/* 메인 콘텐츠 */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 평면도 */}
        <FloorPlanView
          layout={floorLayout}
          floorDisplay={selectedFloor.display}
          isBasement={selectedFloor.isBasement}
        />

        {/* 대피 경로 토글 */}
        {isFireFloor && (
          <TouchableOpacity
            style={[styles.evacuationToggle, showEvacuation && styles.evacuationToggleActive]}
            onPress={() => setShowEvacuation((v) => !v)}
          >
            <Text style={styles.evacuationToggleText}>
              {showEvacuation ? '🟢 대피 경로 숨기기' : '🚨 대피 경로 보기'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 대피 경로 오버레이 */}
        {isFireFloor && <EvacuationOverlay direction={evacuationDir} visible={showEvacuation} />}

        {/* 화재 알림 카드 */}
        {isFireFloor && (
          <View style={styles.fireAlertCard}>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeIcon}>🚨</Text>
              <Text style={styles.alertBadgeText}>화재 지점</Text>
            </View>
            <Text style={styles.fireAlertMessage}>
              {fireFloorInfo.display} {fireRoomNumber}호에서 화재가 발생했습니다.
            </Text>
            {camera && (
              <View style={styles.fireDetailRow}>
                <Text style={styles.fireDetailLabel}>감지 카메라</Text>
                <Text style={styles.fireDetailValue}>
                  {camera.cameraEdgeAlias || `카메라 ${camera.cameraId}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 범례 카드 */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>범례</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E31E24' }]} />
              <Text style={styles.legendText}>화재 발생</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendIcon}>cam</Text>
              <Text style={styles.legendText}>카메라 설치</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendIcon}>🚪</Text>
              <Text style={styles.legendText}>비상구</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendRiskBar}>
                <View style={styles.legendRiskFill} />
              </View>
              <Text style={styles.legendText}>위험도</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  evacuationToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: '#444',
  },
  evacuationToggleActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  evacuationToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  fireAlertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  fireAlertMessage: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
  fireDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  fireDetailLabel: {
    fontSize: 13,
    color: '#999',
  },
  fireDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  legendCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
    maxWidth: 400,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#AAAAAA',
    marginBottom: 10,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '40%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendIcon: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  legendText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  legendRiskBar: {
    width: 24,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    overflow: 'hidden',
  },
  legendRiskFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
});
