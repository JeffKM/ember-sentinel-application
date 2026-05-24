import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Direction = 'left' | 'right' | 'both';

interface Props {
  direction: Direction;
  visible: boolean;
}

/** 대피 경로 오버레이 */
export default function EvacuationOverlay({ direction, visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* 대피 방향 화살표 */}
      <View style={styles.arrowRow}>
        {(direction === 'left' || direction === 'both') && (
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>← EXIT</Text>
            <View style={styles.arrowLine} />
          </View>
        )}
        {direction === 'both' && <View style={{ flex: 1 }} />}
        {(direction === 'right' || direction === 'both') && (
          <View style={[styles.arrowContainer, styles.arrowRight]}>
            <View style={styles.arrowLine} />
            <Text style={styles.arrowText}>EXIT →</Text>
          </View>
        )}
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E31E24' }]} />
          <Text style={styles.legendText}>화재 지점</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>대피 경로</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF8C00' }]} />
          <Text style={styles.legendText}>주의 구역</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
    maxWidth: 400,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowRight: {
    marginLeft: 'auto',
  },
  arrowText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: '#4CAF50',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#CCCCCC',
  },
});
