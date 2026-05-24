import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LiveKitVideoViewProps {
  videoTrack: any;
}

// LiveKit VideoView를 래핑하는 컴포넌트 (네이티브 모듈 지연 로딩)
export default function LiveKitVideoView({ videoTrack }: LiveKitVideoViewProps) {
  try {
    const { VideoView } = require('@livekit/react-native');
    return (
      <VideoView
        videoTrack={videoTrack}
        style={StyleSheet.absoluteFill as any}
        objectFit="cover"
        zOrder={0}
      />
    );
  } catch {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fallback]}>
        <Text style={styles.fallbackText}>LiveKit 네이티브 모듈을 사용할 수 없습니다</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#999',
    fontSize: 14,
  },
});
