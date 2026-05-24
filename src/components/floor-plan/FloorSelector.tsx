import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { FloorInfo } from '../../utils/floorUtils';

interface Props {
  floors: FloorInfo[];
  selectedFloor: FloorInfo;
  fireFloors: string[];
  onSelectFloor: (floor: FloorInfo) => void;
}

/** B1~12층 가로 스크롤 선택기 */
export default function FloorSelector({ floors, selectedFloor, fireFloors, onSelectFloor }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // 선택된 층으로 자동 스크롤
  useEffect(() => {
    const idx = floors.findIndex((f) => f.sortKey === selectedFloor.sortKey);
    if (idx >= 0 && scrollRef.current) {
      // 각 버튼 약 72px (60 + 12 gap)
      scrollRef.current.scrollTo({ x: Math.max(0, idx * 72 - 100), animated: true });
    }
  }, [selectedFloor, floors]);

  const isFireFloor = (floor: FloorInfo) =>
    fireFloors.some((f) => f.toUpperCase() === floor.raw.toUpperCase());

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {floors.map((floor) => {
        const isSelected = floor.sortKey === selectedFloor.sortKey;
        const hasFire = isFireFloor(floor);

        return (
          <TouchableOpacity
            key={floor.raw}
            style={[
              styles.button,
              isSelected && styles.buttonActive,
              hasFire && !isSelected && styles.buttonFire,
            ]}
            onPress={() => onSelectFloor(floor)}
          >
            <View style={styles.buttonInner}>
              <Text
                style={[
                  styles.buttonText,
                  isSelected && styles.buttonTextActive,
                  hasFire && !isSelected && styles.buttonTextFire,
                ]}
              >
                {floor.display}
              </Text>
              {hasFire && (
                <View style={[styles.fireIndicator, isSelected && styles.fireIndicatorActive]} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  buttonActive: {
    backgroundColor: '#FFFFFF',
  },
  buttonFire: {
    backgroundColor: '#3a2020',
    borderWidth: 1,
    borderColor: '#E31E24',
  },
  buttonInner: {
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
  },
  buttonTextActive: {
    color: '#1a1a2e',
  },
  buttonTextFire: {
    color: '#FF6B6B',
  },
  fireIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E31E24',
    marginTop: 4,
  },
  fireIndicatorActive: {
    backgroundColor: '#E31E24',
  },
});
