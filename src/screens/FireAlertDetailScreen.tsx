import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';

type Props = StackScreenProps<RootStackParamList, 'FireAlertDetail'>;

export default function FireAlertDetailScreen({ route, navigation }: Props) {
  const { camera, room } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E31E24" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.headerTitle}>화재 알림</Text>
          </View>
          <Text style={styles.headerSubtitle}>2분 전</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Camera Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📷</Text>
            <Text style={styles.cardHeaderText}>감지 카메라</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>구역</Text>
            <Text style={styles.infoValue}>{room.roomAlias || '구역'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>카메라</Text>
            <View style={styles.cameraInfo}>
              <Text style={styles.infoValue}>{camera.cameraEdgeAlias || '카메라'}</Text>
              <View style={styles.dangerBadge}>
                <Text style={styles.dangerBadgeText}>화재</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>위치</Text>
            <Text style={styles.infoValue}>{camera.locationFloor || '-'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>감지 시간</Text>
            <Text style={styles.infoValue}>14:32:15</Text>
          </View>
        </View>

        {/* Situation Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>상황 설명</Text>
          <Text style={styles.descriptionText}>
            305호 중앙에서 작은 불이 감지되었습니다. 화재가 확실한 수 있으니 즉시 대피하시고, 아래
            버튼을 통해 현장 영상을 확인하거나 화재 위치를 확인하세요.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CCTVLive', { camera, room })}
        >
          <Text style={styles.primaryButtonText}>화재 영상 보기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('FireLocation', { camera, room })}
        >
          <Text style={styles.secondaryButtonText}>화재 위치 보기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E31E24',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardHeaderIcon: {
    fontSize: 18,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E31E24',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666666',
    width: 80,
  },
  infoValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  cameraInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dangerBadge: {
    backgroundColor: '#E31E24',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dangerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 24,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#E31E24',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E31E24',
  },
  secondaryButtonText: {
    color: '#E31E24',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
