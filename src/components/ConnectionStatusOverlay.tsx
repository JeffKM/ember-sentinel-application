import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { StreamConnectionState } from '../hooks/useLiveKitStream';

interface ConnectionStatusOverlayProps {
  connectionState: StreamConnectionState;
  error: string | null;
  onRetry: () => void;
}

const STATE_MESSAGES: Partial<Record<StreamConnectionState, string>> = {
  fetching_token: '스트리밍 연결 준비 중...',
  connecting: '서버에 연결 중...',
  connected: '영상 트랙 대기 중...',
  reconnecting: '재연결 중...',
};

// 연결 상태별 오버레이 UI
export default function ConnectionStatusOverlay({
  connectionState,
  error,
  onRetry,
}: ConnectionStatusOverlayProps) {
  // streaming 상태면 오버레이 표시 안 함
  if (connectionState === 'streaming' || connectionState === 'idle') {
    return null;
  }

  const isLoading = ['fetching_token', 'connecting', 'connected', 'reconnecting'].includes(
    connectionState,
  );
  const isError = connectionState === 'error' || connectionState === 'disconnected';

  return (
    <View style={styles.container}>
      {isLoading && (
        <>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.message}>{STATE_MESSAGES[connectionState]}</Text>
        </>
      )}

      {isError && (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMessage}>
            {connectionState === 'disconnected' ? '연결이 끊어졌습니다' : error || '연결 실패'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 16,
    fontFamily: 'monospace',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorMessage: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
