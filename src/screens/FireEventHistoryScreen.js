import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar 
} from 'react-native';

export default function FireEventHistoryScreen({ route, navigation }) {
  const { camera, room } = route.params;

  // 샘플 화재 이벤트 데이터
  const fireEvents = [
    { id: 1, date: '2025-10-30 14:32:15' },
    { id: 2, date: '2025-10-28 09:15:42' },
    { id: 3, date: '2025-10-25 16:48:23' },
    { id: 4, date: '2025-10-22 11:20:56' },
    { id: 5, date: '2025-10-18 13:05:31' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>화재 이벤트 기록</Text>
          <Text style={styles.headerSubtitle}>{camera.cameraEdgeAlias || camera.name || '카메라'} · 201호 중앙</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>구역</Text>
          <Text style={styles.infoValue}>{room.roomAlias || room.name || '구역'}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>총 이벤트</Text>
          <Text style={styles.infoValue}>{fireEvents.length}건</Text>
        </View>
      </View>

      {/* Event List */}
      <ScrollView style={styles.content}>
        {fireEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => navigation.navigate('FireEventVideo', { 
              event, 
              camera, 
              room 
            })}
          >
            <View style={styles.eventIcon}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>화재 감지</Text>
              <Text style={styles.eventDate}>{event.date}</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    backgroundColor: '#1a1a2e',
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
  infoBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningIcon: {
    fontSize: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666666',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '300',
  },
});