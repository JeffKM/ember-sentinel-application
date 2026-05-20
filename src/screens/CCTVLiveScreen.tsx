import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { DEMO_VIDEO_SOURCES } from '../data/demoData';

// expo-video 를 동적 import — 로드 실패 시 정적 목업으로 폴백
let VideoView: React.ComponentType<any> | null = null;
let useVideoPlayer: ((source: any, setup?: (player: any) => void) => any) | null = null;
try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch (e) {
  console.log('expo-video 로드 실패, 정적 목업으로 폴백');
}

// 비디오 사용 가능 여부
const canPlayVideo = VideoView && useVideoPlayer && DEMO_VIDEO_SOURCES.cctvLive;

interface VideoPlayerProps {
  source: number;
}

function VideoPlayer({ source }: VideoPlayerProps) {
  const player = useVideoPlayer!(source, (p: any) => {
    p.loop = true;
    p.play();
  });

  const VideoViewComponent = VideoView!;
  return (
    <VideoViewComponent
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

type Props = StackScreenProps<RootStackParamList, 'CCTVLive'>;

export default function CCTVLiveScreen({ route, navigation }: Props) {
  const { camera, room } = route.params;
  const [videoError, setVideoError] = useState(false);

  const cameraName = camera.cameraEdgeAlias || '카메라';
  const locationText =
    `${camera.locationFloor || room?.floor || ''} ${camera.roomNumber || ''}`.trim();

  // 현재 시각 표시
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d: Date): string =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const formatTime = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  const showVideo = canPlayVideo && !videoError;

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
          <Text style={styles.headerSubtitle}>{locationText}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {showVideo ? (
          <VideoPlayer source={DEMO_VIDEO_SOURCES.cctvLive!} />
        ) : (
          /* 정적 목업 폴백 */
          <View style={styles.fireWarning}>
            <View style={styles.fireWarningIcon}>
              <Text style={styles.warningSymbol}>⚠️</Text>
            </View>
            <View>
              <Text style={styles.fireWarningTitle}>{cameraName}</Text>
              <Text style={styles.fireWarningSubtitle}>실시간 스트리밍 중...</Text>
            </View>
          </View>
        )}

        {/* Video Info Overlay */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoInfoText}>
            {formatDate(now)}
            {'\n'}
            {formatTime(now)}
          </Text>
          <Text style={styles.videoInfoText}>{camera.deviceUuid || 'CAM-DEMO'}</Text>
          <Text style={styles.videoInfoText}>{locationText}</Text>
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
