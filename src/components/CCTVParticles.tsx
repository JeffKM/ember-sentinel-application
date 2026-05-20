import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// 불꽃 파티클
export function FlameParticle({
  left,
  bottom,
  size,
  delay,
  color,
}: {
  left: number;
  bottom: number;
  size: number;
  delay: number;
  color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 600 + Math.random() * 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400 + Math.random() * 300,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        bottom,
        width: size,
        height: size * 1.5,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.8] }) },
          { scaleX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.2, 0.8] }) },
        ],
      }}
    />
  );
}

// 연기 파티클
export function SmokeParticle({
  left,
  bottom,
  size,
  delay,
}: {
  left: number;
  bottom: number;
  size: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(180, 180, 180, 0.25)',
        opacity: anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.4, 0.25, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 3)] }) },
          {
            translateX: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, size * 0.3, -size * 0.2],
            }),
          },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.5] }) },
        ],
      }}
    />
  );
}
