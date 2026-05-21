import React from 'react';
import { StyleSheet } from 'react-native';
import { VideoView } from '@livekit/react-native';
import type { VideoTrack } from 'livekit-client';

interface LiveKitVideoViewProps {
  videoTrack: VideoTrack;
}

// LiveKit VideoView를 래핑하는 컴포넌트
export default function LiveKitVideoView({ videoTrack }: LiveKitVideoViewProps) {
  return (
    <VideoView
      videoTrack={videoTrack}
      style={StyleSheet.absoluteFill as any}
      objectFit="cover"
      zOrder={0}
    />
  );
}
