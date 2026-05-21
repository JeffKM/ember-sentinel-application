import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { FlameParticle, SmokeParticle } from '../components/CCTVParticles';
import { useLiveKitStream } from '../hooks/useLiveKitStream';
import LiveKitVideoView from '../components/LiveKitVideoView';
import ConnectionStatusOverlay from '../components/ConnectionStatusOverlay';

// CCTV 시뮬레이션 폴백 컴포넌트
function CCTVSimulation({
  cameraName,
  locationText,
  deviceUuid,
}: {
  cameraName: string;
  locationText: string;
  deviceUuid: string;
}) {
  const [now, setNow] = useState(new Date());
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const fireBoxAnim = useRef(new Animated.Value(0)).current;
  const smokeBoxAnim = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // REC 점멸
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim]);

  // 화염 바운딩 박스 떨림
  useEffect(() => {
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(fireBoxAnim, { toValue: 2, duration: 800, useNativeDriver: true }),
        Animated.timing(fireBoxAnim, { toValue: -1, duration: 600, useNativeDriver: true }),
        Animated.timing(fireBoxAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    shake.start();
    return () => shake.stop();
  }, [fireBoxAnim]);

  // 연기 바운딩 박스 떨림
  useEffect(() => {
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(smokeBoxAnim, { toValue: -1, duration: 900, useNativeDriver: true }),
        Animated.timing(smokeBoxAnim, { toValue: 2, duration: 700, useNativeDriver: true }),
        Animated.timing(smokeBoxAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    shake.start();
    return () => shake.stop();
  }, [smokeBoxAnim]);

  // 스캔라인
  useEffect(() => {
    const scan = Animated.loop(
      Animated.timing(scanlineAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
    );
    scan.start();
    return () => scan.stop();
  }, [scanlineAnim]);

  const formatDate = (d: Date): string =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const formatTime = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  return (
    <View style={sim.container}>
      {/* ── 1층: 방 배경 ── */}
      {/* 천장 */}
      <View style={sim.ceiling} />
      {/* 벽면 */}
      <View style={sim.wallUpper} />
      <View style={sim.wallLower} />
      {/* 바닥 (타일 느낌) */}
      <View style={sim.floor}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[sim.floorTile, { left: `${i * 15}%` }]} />
        ))}
      </View>
      {/* 벽-바닥 경계선 */}
      <View style={sim.baseboard} />

      {/* 천장 형광등 2개 */}
      <View style={[sim.ceilingLight, { left: '20%' }]} />
      <View style={[sim.ceilingLight, { left: '60%' }]} />
      {/* 형광등 빛 반사 */}
      <View style={[sim.lightGlow, { left: '18%' }]} />
      <View style={[sim.lightGlow, { left: '58%' }]} />

      {/* 가구: 왼쪽 서버랙 */}
      <View style={sim.serverRack}>
        <View style={sim.rackShelf1} />
        <View style={sim.rackShelf2} />
        <View style={sim.rackShelf3} />
        <View style={[sim.rackLed, { top: 10 }]} />
        <View style={[sim.rackLed, { top: 30 }]} />
        <View style={[sim.rackLed, { top: 50 }]} />
      </View>

      {/* 가구: 중앙 테이블 */}
      <View style={sim.table}>
        <View style={sim.tableLeg1} />
        <View style={sim.tableLeg2} />
      </View>
      {/* 테이블 위 모니터 */}
      <View style={sim.monitor}>
        <View style={sim.monitorScreen} />
        <View style={sim.monitorStand} />
      </View>

      {/* 가구: 오른쪽 캐비닛 */}
      <View style={sim.cabinet}>
        <View style={sim.cabinetDoor1} />
        <View style={sim.cabinetDoor2} />
        <View style={sim.cabinetHandle1} />
        <View style={sim.cabinetHandle2} />
      </View>

      {/* 오른쪽 문 */}
      <View style={sim.door}>
        <View style={sim.doorFrame} />
        <View style={sim.doorHandle} />
      </View>

      {/* 왼쪽 벽 콘센트 */}
      <View style={sim.outlet} />

      {/* ── 2층: 불꽃 + 연기 이펙트 ── */}
      {/* 화재 발광 (바닥 주변 주황 글로우) */}
      <View style={sim.fireGlowLarge} />
      <View style={sim.fireGlowSmall} />

      {/* 불꽃 파티클들 (테이블 근처) */}
      <FlameParticle left={120} bottom={170} size={18} delay={0} color="rgba(255, 80, 0, 0.85)" />
      <FlameParticle left={135} bottom={175} size={22} delay={100} color="rgba(255, 160, 0, 0.8)" />
      <FlameParticle left={150} bottom={168} size={16} delay={200} color="rgba(255, 60, 0, 0.9)" />
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
      <FlameParticle left={145} bottom={160} size={24} delay={50} color="rgba(255, 50, 0, 0.9)" />
      <FlameParticle left={158} bottom={182} size={15} delay={250} color="rgba(255, 140, 0, 0.8)" />
      {/* 바닥 화염 */}
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

      {/* 연기 파티클들 (불꽃 위로 상승) */}
      <SmokeParticle left={110} bottom={220} size={40} delay={0} />
      <SmokeParticle left={140} bottom={230} size={50} delay={800} />
      <SmokeParticle left={155} bottom={215} size={35} delay={400} />
      <SmokeParticle left={125} bottom={240} size={45} delay={1200} />
      <SmokeParticle left={165} bottom={225} size={55} delay={600} />
      <SmokeParticle left={100} bottom={235} size={30} delay={1600} />
      <SmokeParticle left={175} bottom={210} size={38} delay={1000} />

      {/* 천장 연기 (정적, 넓게 깔림) */}
      <View style={sim.ceilingSmoke1} />
      <View style={sim.ceilingSmoke2} />
      <View style={sim.ceilingSmoke3} />

      {/* ── 3층: YOLO 바운딩 박스 ── */}
      {/* 화염 감지 박스 */}
      <Animated.View
        style={[sim.yoloBox, sim.yoloFire, { transform: [{ translateY: fireBoxAnim }] }]}
      >
        <View style={sim.yoloLabel}>
          <Text style={sim.yoloLabelText}>fire 0.94</Text>
        </View>
        {/* 박스 모서리 강조 */}
        <View style={[sim.yoloCorner, sim.cornerTL]} />
        <View style={[sim.yoloCorner, sim.cornerTR]} />
        <View style={[sim.yoloCorner, sim.cornerBL]} />
        <View style={[sim.yoloCorner, sim.cornerBR]} />
      </Animated.View>

      {/* 연기 감지 박스 */}
      <Animated.View
        style={[sim.yoloBox, sim.yoloSmoke, { transform: [{ translateX: smokeBoxAnim }] }]}
      >
        <View style={[sim.yoloLabel, sim.yoloSmokeLabel]}>
          <Text style={sim.yoloLabelText}>smoke 0.87</Text>
        </View>
      </Animated.View>

      {/* ── 4층: CCTV HUD 오버레이 ── */}
      {/* 스캔라인 */}
      <Animated.View
        style={[
          sim.scanline,
          {
            transform: [
              {
                translateY: scanlineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 500],
                }),
              },
            ],
          },
        ]}
      />

      {/* 상단 좌측: REC + 타임스탬프 */}
      <View style={sim.topLeft}>
        <View style={sim.recBadge}>
          <Animated.View style={[sim.recDot, { opacity: blinkAnim }]} />
          <Text style={sim.recText}>REC</Text>
        </View>
        <Text style={sim.timestamp}>
          {formatDate(now)} {formatTime(now)}
        </Text>
      </View>

      {/* 상단 우측: 카메라 정보 */}
      <View style={sim.topRight}>
        <Text style={sim.camId}>{deviceUuid}</Text>
        <Text style={sim.camLocation}>{locationText}</Text>
      </View>

      {/* 하단 좌측: 카메라명 */}
      <View style={sim.bottomLeft}>
        <Text style={sim.camName}>{cameraName}</Text>
      </View>

      {/* 하단 우측: 감지 상태 */}
      <View style={sim.bottomRight}>
        <View style={sim.detectBadge}>
          <Animated.View style={[sim.detectDot, { opacity: blinkAnim }]} />
          <Text style={sim.detectText}>FIRE DETECTED</Text>
        </View>
      </View>

      {/* 비네팅 효과 */}
      <View style={sim.vignette} />
    </View>
  );
}

type Props = StackScreenProps<RootStackParamList, 'CCTVLive'>;

export default function CCTVLiveScreen({ route, navigation }: Props) {
  const { camera, room } = route.params;

  const cameraName = camera.cameraEdgeAlias || '카메라';
  const locationText =
    `${camera.locationFloor || room?.floor || ''} ${camera.roomNumber || ''}`.trim();

  // LiveKit 실시간 스트리밍 연결
  const { connectionState, videoTrack, error, retry } = useLiveKitStream(
    camera.fireEventId ?? null,
  );

  // 스트리밍 중이면 초록색, 그 외 빨간색
  const isStreaming = connectionState === 'streaming';
  const liveBadgeColor = isStreaming ? '#2ECC40' : '#E31E24';

  // 시뮬레이션 폴백 조건: fireEventId 없거나, 에러/연결끊김 상태
  const showSimulation =
    !camera.fireEventId ||
    connectionState === 'idle' ||
    connectionState === 'error' ||
    connectionState === 'disconnected';

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
        <View style={[styles.liveBadge, { backgroundColor: liveBadgeColor }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Video Area — 3단계 폴백 체인 */}
      <View style={styles.videoContainer}>
        {/* 1. LiveKit 스트리밍 성공 → 실시간 영상 */}
        {isStreaming && videoTrack && <LiveKitVideoView videoTrack={videoTrack} />}

        {/* 2. 연결 중/재연결 중 → 상태 오버레이 */}
        {camera.fireEventId && !showSimulation && !isStreaming && (
          <ConnectionStatusOverlay
            connectionState={connectionState}
            error={error}
            onRetry={retry}
          />
        )}

        {/* 3. 폴백 → CCTVSimulation (데모 모드) */}
        {showSimulation && (
          <CCTVSimulation
            cameraName={cameraName}
            locationText={locationText}
            deviceUuid={camera.deviceUuid || 'CAM-DEMO'}
          />
        )}
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

// CCTV 시뮬레이션 스타일
const sim = StyleSheet.create({
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
  // 서버랙 (왼쪽)
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
  // 테이블 (중앙) — 화재 발생 지점
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
  // 캐비닛 (오른쪽)
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
  // 문 (오른쪽 벽)
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
  // 콘센트
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
  // 바운딩 박스 모서리 강조
  yoloCorner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#FF3B30',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  // ── HUD ──
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  topLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recText: {
    color: '#FF3B30',
    fontSize: 13,
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
    alignItems: 'flex-end',
  },
  camId: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  camLocation: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  camName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  detectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.6)',
    gap: 6,
  },
  detectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
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
