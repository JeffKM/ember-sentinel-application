import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar 
} from 'react-native';

export default function FireEventVideoScreen({ route, navigation }) {
  const { event, camera, room } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>화재 이벤트 영상</Text>
          <Text style={styles.headerSubtitle}>{camera.name} · 201호 중앙</Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <Text style={styles.downloadText}>⬇︎ 녹화 영상</Text>
        </TouchableOpacity>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {/* Video Info Overlay */}
        <View style={styles.videoInfo}>
          <View style={styles.videoInfoLeft}>
            <Text style={styles.videoInfoIcon}>🕐</Text>
            <Text style={styles.videoInfoText}>{event.date}</Text>
          </View>
          <Text style={styles.videoInfoText}>{camera.name}</Text>
        </View>

        {/* Fire Warning Alert */}
        <View style={styles.fireWarning}>
          <View style={styles.fireWarningIcon}>
            <Text style={styles.warningSymbol}>⚠️</Text>
          </View>
          <View>
            <Text style={styles.fireWarningTitle}>{camera.name}</Text>
            <Text style={styles.fireWarningSubtitle}>화재 감지 녹화 영상</Text>
          </View>
        </View>
      </View>

      {/* Video Controls */}
      <View style={styles.controls}>
        <View style={styles.progressBar}>
          <Text style={styles.timeText}>0:32</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '20%' }]} />
            <View style={styles.progressThumb} />
          </View>
          <Text style={styles.timeText}>2:15</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => setIsPlaying(!isPlaying)}
        >
          <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
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
  downloadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
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
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  videoInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  fireWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
  },
  fireWarningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    width: 40,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginHorizontal: 12,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 6 }],
  },
  playButton: {
    alignSelf: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});