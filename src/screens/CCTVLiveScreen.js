import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar 
} from 'react-native';

export default function CCTVLiveScreen({ route, navigation }) {
  const { camera, room } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>CCTV 실시간 영상</Text>
          <Text style={styles.headerSubtitle}>3층 동쪽 복도</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {/* Video Info Overlay */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoInfoText}>2025.09.30{'\n'}14:34:22</Text>
          <Text style={styles.videoInfoText}>CAM-A302</Text>
          <Text style={styles.videoInfoText}>3F East</Text>
        </View>

        {/* Fire Warning Alert */}
        <View style={styles.fireWarning}>
          <View style={styles.fireWarningIcon}>
            <Text style={styles.warningSymbol}>⚠️</Text>
          </View>
          <View>
            <Text style={styles.fireWarningTitle}>카메라 #{camera.cameraEdgeAlias || camera.name || '1'}</Text>
            <Text style={styles.fireWarningSubtitle}>실시간 스트리밍 중...</Text>
          </View>
        </View>
      </View>

      {/* Bottom Alert */}
      <View style={styles.bottomAlert}>
        <View style={styles.alertContent}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>화재 위험 감지</Text>
            <Text style={styles.alertMessage}>
              현재 위치에서 연기가 계속 감지되고 있습니다.{'\n'}안전한 곳으로 대피하세요.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  videoInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  fireWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
    gap: 16,
  },
  fireWarningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningSymbol: {
    fontSize: 32,
  },
  fireWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  fireWarningSubtitle: {
    fontSize: 13,
    color: '#FFCCCC',
  },
  bottomAlert: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  alertContent: {
    flexDirection: 'row',
    gap: 12,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E31E24',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});