import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { FlameParticle, SmokeParticle } from '../components/CCTVParticles';
import { getFireEventRecordUrl } from '../config/api';

// expo-video 동적 import — 로드 실패 시 정적 목업으로 폴백
let ExpoVideoView: React.ComponentType<any> | null = null;
let useVideoPlayer: ((source: any, setup?: (player: any) => void) => any) | null = null;
try {
  const expoVideo = require('expo-video');
  ExpoVideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch (e) {
  console.log('expo-video 로드 실패, 정적 목업으로 폴백');
}

const canPlayVideo = !!(ExpoVideoView && useVideoPlayer);

// S3 Presigned URL 영상 재생 컴포넌트
function S3VideoPlayer({
  url,
  isPlaying,
  onToggle,
}: {
  url: string;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  const player = useVideoPlayer!(url, (p: any) => {
    p.loop = true;
  });

  React.useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.9} onPress={onToggle}>
      {ExpoVideoView && (
        <ExpoVideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      )}
    </TouchableOpacity>
  );
}

// 녹화 영상 시뮬레이션 폴백 컴포넌트
function RecordedVideoSimulation({
  cameraName,
  eventDate,
  isPlaying,
  onToggle,
}: {
  cameraName: string;
  eventDate: string;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  const fireBoxAnim = useRef(new Animated.Value(0)).current;
  const smokeBoxAnim = useRef(new Animated.Value(0)).current;
  const playIconAnim = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;

  // 재생 시 바운딩 박스 애니메이션
  useEffect(() => {
    if (!isPlaying) return;
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(fireBoxAnim, { toValue: 2, duration: 800, useNativeDriver: true }),
        Animated.timing(fireBoxAnim, { toValue: -1, duration: 600, useNativeDriver: true }),
        Animated.timing(fireBoxAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    shake.start();
    return () => shake.stop();
  }, [isPlaying, fireBoxAnim]);

  useEffect(() => {
    if (!isPlaying) return;
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(smokeBoxAnim, { toValue: -1, duration: 900, useNativeDriver: true }),
        Animated.timing(smokeBoxAnim, { toValue: 2, duration: 700, useNativeDriver: true }),
        Animated.timing(smokeBoxAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    shake.start();
    return () => shake.stop();
  }, [isPlaying, smokeBoxAnim]);

  // 재생 아이콘 페이드
  useEffect(() => {
    Animated.timing(playIconAnim, {
      toValue: isPlaying ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, playIconAnim]);

  return (
    <TouchableOpacity style={rec.container} activeOpacity={0.9} onPress={onToggle}>
      {/* ── 1층: 방 배경 ── */}
      <View style={rec.ceiling} />
      <View style={rec.wallUpper} />
      <View style={rec.wallLower} />
      <View style={rec.floor}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[rec.floorTile, { left: `${i * 15}%` }]} />
        ))}
      </View>
      <View style={rec.baseboard} />

      {/* 형광등 */}
      <View style={[rec.ceilingLight, { left: '20%' }]} />
      <View style={[rec.ceilingLight, { left: '60%' }]} />
      <View style={[rec.lightGlow, { left: '18%' }]} />
      <View style={[rec.lightGlow, { left: '58%' }]} />

      {/* 서버랙 (왼쪽) */}
      <View style={rec.serverRack}>
        <View style={rec.rackShelf1} />
        <View style={rec.rackShelf2} />
        <View style={rec.rackShelf3} />
        <View style={[rec.rackLed, { top: 10 }]} />
        <View style={[rec.rackLed, { top: 30 }]} />
        <View style={[rec.rackLed, { top: 50 }]} />
      </View>

      {/* 테이블 (중앙) — 화재 지점 */}
      <View style={rec.table}>
        <View style={rec.tableLeg1} />
        <View style={rec.tableLeg2} />
      </View>
      <View style={rec.monitor}>
        <View style={rec.monitorScreen} />
        <View style={rec.monitorStand} />
      </View>

      {/* 캐비닛 (오른쪽) */}
      <View style={rec.cabinet}>
        <View style={rec.cabinetDoor1} />
        <View style={rec.cabinetDoor2} />
        <View style={rec.cabinetHandle1} />
        <View style={rec.cabinetHandle2} />
      </View>

      {/* 문 */}
      <View style={rec.door}>
        <View style={rec.doorFrame} />
        <View style={rec.doorHandle} />
      </View>

      {/* 콘센트 */}
      <View style={rec.outlet} />

      {/* ── 2층: 불꽃 + 연기 이펙트 ── */}
      <View style={rec.fireGlowLarge} />
      <View style={rec.fireGlowSmall} />

      {/* 불꽃 파티클 (재생 중에만 애니메이션) */}
      {isPlaying && (
        <>
          <FlameParticle
            left={120}
            bottom={170}
            size={18}
            delay={0}
            color="rgba(255, 80, 0, 0.85)"
          />
          <FlameParticle
            left={135}
            bottom={175}
            size={22}
            delay={100}
            color="rgba(255, 160, 0, 0.8)"
          />
          <FlameParticle
            left={150}
            bottom={168}
            size={16}
            delay={200}
            color="rgba(255, 60, 0, 0.9)"
          />
          <FlameParticle
            left={110}
            bottom={180}
            size={14}
            delay={300}
            color="rgba(255, 200, 0, 0.75)"
          />
          <FlameParticle
            left={165}
            bottom={172}
            size={20}
            delay={150}
            color="rgba(255, 100, 0, 0.85)"
          />
          <FlameParticle
            left={128}
            bottom={185}
            size={12}
            delay={400}
            color="rgba(255, 220, 50, 0.7)"
          />
          <FlameParticle
            left={145}
            bottom={160}
            size={24}
            delay={50}
            color="rgba(255, 50, 0, 0.9)"
          />
          <FlameParticle
            left={158}
            bottom={182}
            size={15}
            delay={250}
            color="rgba(255, 140, 0, 0.8)"
          />
          <FlameParticle
            left={115}
            bottom={155}
            size={10}
            delay={350}
            color="rgba(255, 100, 20, 0.6)"
          />
          <FlameParticle
            left={170}
            bottom={158}
            size={11}
            delay={180}
            color="rgba(255, 120, 0, 0.65)"
          />
        </>
      )}

      {/* 연기 파티클 (재생 중에만 애니메이션) */}
      {isPlaying && (
        <>
          <SmokeParticle left={110} bottom={220} size={40} delay={0} />
          <SmokeParticle left={140} bottom={230} size={50} delay={800} />
          <SmokeParticle left={155} bottom={215} size={35} delay={400} />
          <SmokeParticle left={125} bottom={240} size={45} delay={1200} />
          <SmokeParticle left={165} bottom={225} size={55} delay={600} />
          <SmokeParticle left={100} bottom={235} size={30} delay={1600} />
          <SmokeParticle left={175} bottom={210} size={38} delay={1000} />
        </>
      )}

      {/* 천장 연기 (정적) */}
      <View style={rec.ceilingSmoke1} />
      <View style={rec.ceilingSmoke2} />
      <View style={rec.ceilingSmoke3} />

      {/* ── 3층: YOLO 바운딩 박스 (재생 중에만) ── */}
      {isPlaying && (
        <>
          <Animated.View
            style={[rec.yoloBox, rec.yoloFire, { transform: [{ translateY: fireBoxAnim }] }]}
          >
            <View style={rec.yoloLabel}>
              <Text style={rec.yoloLabelText}>fire 0.91</Text>
            </View>
            <View style={[rec.yoloCorner, rec.cornerTL]} />
            <View style={[rec.yoloCorner, rec.cornerTR]} />
            <View style={[rec.yoloCorner, rec.cornerBL]} />
            <View style={[rec.yoloCorner, rec.cornerBR]} />
          </Animated.View>

          <Animated.View
            style={[rec.yoloBox, rec.yoloSmoke, { transform: [{ translateX: smokeBoxAnim }] }]}
          >
            <View style={[rec.yoloLabel, rec.yoloSmokeLabel]}>
              <Text style={rec.yoloLabelText}>smoke 0.83</Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* ── 4층: HUD 오버레이 ── */}
      {/* 상단 좌측: REC + 날짜 */}
      <View style={rec.topLeft}>
        <View style={rec.recBadge}>
          <Text style={rec.recIcon}>⏺</Text>
          <Text style={rec.recText}>REC</Text>
        </View>
        <Text style={rec.timestamp}>{eventDate}</Text>
      </View>

      {/* 상단 우측: 카메라명 */}
      <View style={rec.topRight}>
        <Text style={rec.camName}>{cameraName}</Text>
      </View>

      {/* 중앙: 재생/일시정지 오버레이 */}
      <Animated.View style={[rec.playOverlay, { opacity: playIconAnim }]}>
        <View style={rec.playCircle}>
          <Text style={rec.playTriangle}>▶</Text>
        </View>
        <Text style={rec.playLabel}>탭하여 재생</Text>
      </Animated.View>

      {/* 하단 우측: 감지 배지 (재생 중에만) */}
      {isPlaying && (
        <View style={rec.bottomBar}>
          <View style={rec.detectBadge}>
            <Text style={rec.detectText}>FIRE DETECTED</Text>
          </View>
        </View>
      )}

      {/* 비네팅 */}
      <View style={rec.vignette} />
    </TouchableOpacity>
  );
}

type Props = StackScreenProps<RootStackParamList, 'FireEventVideo'>;

export default function FireEventVideoScreen({ route, navigation }: Props) {
  const { event, camera, room } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const totalDuration = 135; // 2:15

  // S3 Presigned URL 비동기 로딩
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchRecordUrl = async () => {
      setUrlLoading(true);
      setUrlError(false);
      try {
        const response = await getFireEventRecordUrl(event.id);
        if (!cancelled && response?.recordUrl) {
          setRecordUrl(response.recordUrl);
        }
      } catch (err) {
        console.log('녹화 URL 조회 실패, 시뮬레이션으로 폴백:', err);
        if (!cancelled) setUrlError(true);
      } finally {
        if (!cancelled) setUrlLoading(false);
      }
    };

    fetchRecordUrl();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 재생 시 경과 시간 카운트
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= totalDuration) return 0;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const formatElapsed = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const cameraName = camera.cameraEdgeAlias || '카메라';
  // S3 URL이 있고 expo-video 사용 가능하면 S3 영상 재생
  const showS3Video = canPlayVideo && !!recordUrl && !urlError;
  const progressPercent = (elapsed / totalDuration) * 100;

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
          <Text style={styles.headerSubtitle}>
            {cameraName} · {room?.roomAlias || '구역'}
          </Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <Text style={styles.downloadText}>⬇︎ 녹화 영상</Text>
        </TouchableOpacity>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {urlLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>녹화 영상 로딩 중...</Text>
          </View>
        ) : showS3Video ? (
          <S3VideoPlayer url={recordUrl!} isPlaying={isPlaying} onToggle={handleTogglePlay} />
        ) : (
          <RecordedVideoSimulation
            cameraName={cameraName}
            eventDate={event.date}
            isPlaying={isPlaying}
            onToggle={handleTogglePlay}
          />
        )}
      </View>

      {/* Video Controls */}
      <View style={styles.controls}>
        <View style={styles.progressBar}>
          <Text style={styles.timeText}>{formatElapsed(elapsed)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.progressThumb, { left: `${Math.min(progressPercent, 97)}%` }]} />
          </View>
          <Text style={styles.timeText}>2:15</Text>
        </View>

        <TouchableOpacity style={styles.playButton} onPress={handleTogglePlay}>
          <Text style={styles.playButtonIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 녹화 영상 시뮬레이션 스타일
const rec = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d120d',
    overflow: 'hidden',
  },
  // ── 방 배경 ──
  ceiling: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#181e18',
  },
  wallUpper: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#1a201a',
  },
  wallLower: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: '15%',
    backgroundColor: '#161c16',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#222a22',
  },
  floorTile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  baseboard: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2a322a',
  },
  // 형광등
  ceilingLight: {
    position: 'absolute',
    top: 8,
    width: 70,
    height: 6,
    backgroundColor: '#3a4a3a',
    borderRadius: 3,
  },
  lightGlow: {
    position: 'absolute',
    top: 14,
    width: 80,
    height: 40,
    backgroundColor: 'rgba(200, 220, 200, 0.04)',
    borderRadius: 40,
  },
  // 서버랙
  serverRack: {
    position: 'absolute',
    bottom: '40%',
    left: 16,
    width: 55,
    height: 120,
    backgroundColor: '#1a1f1a',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a332a',
  },
  rackShelf1: {
    position: 'absolute',
    top: 20,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#333',
  },
  rackShelf2: {
    position: 'absolute',
    top: 45,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#333',
  },
  rackShelf3: {
    position: 'absolute',
    top: 70,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#333',
  },
  rackLed: {
    position: 'absolute',
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2ECC40',
  },
  // 테이블
  table: {
    position: 'absolute',
    bottom: '40%',
    left: '28%',
    width: 110,
    height: 10,
    backgroundColor: '#2a2520',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#3a3530',
  },
  tableLeg1: {
    position: 'absolute',
    bottom: -40,
    left: 8,
    width: 6,
    height: 40,
    backgroundColor: '#2a2520',
  },
  tableLeg2: {
    position: 'absolute',
    bottom: -40,
    right: 8,
    width: 6,
    height: 40,
    backgroundColor: '#2a2520',
  },
  // 모니터
  monitor: {
    position: 'absolute',
    bottom: '52%',
    left: '33%',
    width: 50,
    height: 35,
    backgroundColor: '#111',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#333',
  },
  monitorScreen: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 6,
    backgroundColor: '#0a1a2a',
    borderRadius: 1,
  },
  monitorStand: {
    position: 'absolute',
    bottom: -8,
    left: '35%',
    width: 14,
    height: 8,
    backgroundColor: '#222',
  },
  // 캐비닛
  cabinet: {
    position: 'absolute',
    bottom: '40%',
    right: 50,
    width: 60,
    height: 80,
    backgroundColor: '#1e2320',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a302a',
  },
  cabinetDoor1: {
    position: 'absolute',
    top: 4,
    left: 3,
    width: 24,
    bottom: 4,
    backgroundColor: '#222820',
    borderRadius: 2,
  },
  cabinetDoor2: {
    position: 'absolute',
    top: 4,
    right: 3,
    width: 24,
    bottom: 4,
    backgroundColor: '#222820',
    borderRadius: 2,
  },
  cabinetHandle1: {
    position: 'absolute',
    top: '45%',
    left: 25,
    width: 3,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#555',
  },
  cabinetHandle2: {
    position: 'absolute',
    top: '45%',
    right: 25,
    width: 3,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#555',
  },
  // 문
  door: {
    position: 'absolute',
    bottom: '40%',
    right: 6,
    width: 36,
    height: 110,
    backgroundColor: '#242a28',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#353d38',
  },
  doorFrame: {
    position: 'absolute',
    top: -2,
    left: -3,
    right: -3,
    bottom: -2,
    borderWidth: 2,
    borderColor: '#303830',
    borderRadius: 3,
  },
  doorHandle: {
    position: 'absolute',
    right: 5,
    top: '55%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#778',
  },
  outlet: {
    position: 'absolute',
    top: '48%',
    left: 10,
    width: 10,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  // ── 화재 이펙트 ──
  fireGlowLarge: {
    position: 'absolute',
    bottom: '35%',
    left: '26%',
    width: 140,
    height: 120,
    backgroundColor: 'rgba(255, 80, 0, 0.12)',
    borderRadius: 70,
  },
  fireGlowSmall: {
    position: 'absolute',
    bottom: '38%',
    left: '30%',
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 120, 0, 0.1)',
    borderRadius: 40,
  },
  // 천장 연기
  ceilingSmoke1: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(160, 160, 160, 0.08)',
    borderRadius: 25,
  },
  ceilingSmoke2: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '20%',
    height: 35,
    backgroundColor: 'rgba(140, 140, 140, 0.06)',
    borderRadius: 20,
  },
  ceilingSmoke3: {
    position: 'absolute',
    top: 25,
    left: '25%',
    width: '40%',
    height: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 15,
  },
  // ── YOLO 바운딩 박스 ──
  yoloBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
  },
  yoloFire: {
    bottom: '30%',
    left: '25%',
    width: 120,
    height: 100,
    borderColor: '#FF3B30',
  },
  yoloSmoke: {
    top: '12%',
    left: '15%',
    width: 200,
    height: 130,
    borderColor: '#FFD60A',
    borderStyle: 'dashed',
  },
  yoloLabel: {
    position: 'absolute',
    top: -22,
    left: -2,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  yoloSmokeLabel: {
    backgroundColor: 'rgba(200, 170, 0, 0.9)',
  },
  yoloLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  yoloCorner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#FF3B30',
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },
  // ── HUD ──
  topLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  recIcon: {
    color: '#FF3B30',
    fontSize: 10,
  },
  recText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  topRight: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  camName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    color: '#FFFFFF',
    fontSize: 28,
    marginLeft: 4,
  },
  playLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  detectBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.6)',
  },
  detectText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 20,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    pointerEvents: 'none',
  },
});

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 16,
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
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
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginLeft: -6,
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
  playButtonIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});
