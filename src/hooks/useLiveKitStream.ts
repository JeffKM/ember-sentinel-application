import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  type VideoTrack as LKVideoTrack,
} from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { getStreamSubscribeToken } from '../config/api';

// LiveKit Cloud URL (토큰 응답에 url이 없을 때 폴백)
const LIVEKIT_CLOUD_URL = 'wss://***REMOVED_LIVEKIT_URL***';

// 연결 상태 머신
export type StreamConnectionState =
  | 'idle'
  | 'fetching_token'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface UseLiveKitStreamResult {
  connectionState: StreamConnectionState;
  videoTrack: LKVideoTrack | null;
  error: string | null;
  retry: () => void;
}

const MAX_RETRIES = 3;

export function useLiveKitStream(fireEventId: number | null): UseLiveKitStreamResult {
  const [connectionState, setConnectionState] = useState<StreamConnectionState>('idle');
  const [videoTrack, setVideoTrack] = useState<LKVideoTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const cleanup = useCallback(async () => {
    if (roomRef.current) {
      roomRef.current.removeAllListeners();
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    try {
      await AudioSession.stopAudioSession();
    } catch {
      // 오디오 세션 정지 실패 무시
    }
  }, []);

  const connect = useCallback(async () => {
    if (!fireEventId || !mountedRef.current) return;

    // 기존 연결 정리
    await cleanup();

    setError(null);
    setVideoTrack(null);
    setConnectionState('fetching_token');

    try {
      // 1. 토큰 발급
      const { token, url } = await getStreamSubscribeToken(fireEventId);
      if (!mountedRef.current) return;

      // 2. 오디오 세션 시작 (미디어 모드)
      await AudioSession.startAudioSession();

      // 3. Room 생성
      setConnectionState('connecting');
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // 이벤트 리스너 등록
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (!mountedRef.current) return;
        switch (state) {
          case ConnectionState.Connected:
            setConnectionState('connected');
            retryCountRef.current = 0;
            break;
          case ConnectionState.Reconnecting:
            setConnectionState('reconnecting');
            break;
          case ConnectionState.Disconnected:
            setConnectionState('disconnected');
            setVideoTrack(null);
            break;
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (!mountedRef.current) return;
        if (track.kind === Track.Kind.Video) {
          setVideoTrack(track as LKVideoTrack);
          setConnectionState('streaming');
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (!mountedRef.current) return;
        if (track.kind === Track.Kind.Video) {
          setVideoTrack(null);
          setConnectionState('connected');
        }
      });

      // 4. 연결 (구독 전용 — publish 안 함)
      await room.connect(url || LIVEKIT_CLOUD_URL, token);

      if (!mountedRef.current) {
        await room.disconnect();
        return;
      }

      // 이미 퍼블리시 중인 트랙이 있으면 구독
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (
            publication.kind === Track.Kind.Video &&
            publication.isSubscribed &&
            publication.track
          ) {
            setVideoTrack(publication.track as LKVideoTrack);
            setConnectionState('streaming');
          }
        });
      });
    } catch (err) {
      if (!mountedRef.current) return;

      const message = err instanceof Error ? err.message : '연결 실패';
      console.error('LiveKit 연결 오류:', message);

      // 자동 재시도
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log(`LiveKit 재시도 ${retryCountRef.current}/${MAX_RETRIES}`);
        setConnectionState('reconnecting');
        setTimeout(() => {
          if (mountedRef.current) connect();
        }, 2000 * retryCountRef.current);
      } else {
        setError(message);
        setConnectionState('error');
      }
    }
  }, [fireEventId, cleanup]);

  // 수동 재시도
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;

    if (fireEventId) {
      connect();
    } else {
      setConnectionState('idle');
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [fireEventId, connect, cleanup]);

  return { connectionState, videoTrack, error, retry };
}
