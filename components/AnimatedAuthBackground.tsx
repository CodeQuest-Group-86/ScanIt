/**
 * AnimatedAuthBackground
 *
 * Renders a rich dark warm gradient with 5 softly drifting colour blobs.
 * Designed to sit behind the liquid-glass auth cards.
 * Uses react-native-reanimated for smooth, GPU-driven movement.
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

interface BlobProps {
  colors: [string, string, ...string[]];
  size: number;
  top: number;
  left: number;
  toX: number;
  toY: number;
  toScale: number;
  dur: number;
  delay: number;
  opacity: number;
}

function FloatingBlob({ colors, size, top, left, toX, toY, toScale, dur, delay, opacity }: BlobProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);

  useEffect(() => {
    tx.value = withDelay(
      delay,
      withRepeat(withTiming(toX, { duration: dur, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
    ty.value = withDelay(
      delay + 350,
      withRepeat(withTiming(toY, { duration: dur * 1.3, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
    sc.value = withDelay(
      delay + 700,
      withRepeat(withTiming(toScale, { duration: dur * 1.65, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
    ],
    opacity,
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2 },
        animStyle,
      ]}
    >
      <LinearGradient
        colors={colors}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

export default function AnimatedAuthBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep warm dark base */}
      <LinearGradient
        colors={['#1C0D05', '#2E1208', '#180A04']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {/* Blob 1 — primary orange, top-left */}
      <FloatingBlob
        colors={['#FF8C4A', '#E8682A']}
        size={370} top={-115} left={-95}
        toX={30} toY={24} toScale={1.1}
        dur={6200} delay={0} opacity={0.55}
      />
      {/* Blob 2 — accent blue, right-center */}
      <FloatingBlob
        colors={['#4DBFED', '#1A9ED4']}
        size={310} top={H * 0.38} left={W - 165}
        toX={-24} toY={30} toScale={1.09}
        dur={7800} delay={900} opacity={0.4}
      />
      {/* Blob 3 — warm gold, bottom-left */}
      <FloatingBlob
        colors={['#FFD166', '#F59E0B']}
        size={240} top={H * 0.62} left={-55}
        toX={34} toY={-20} toScale={1.13}
        dur={8300} delay={1600} opacity={0.33}
      />
      {/* Blob 4 — deep orange, upper-right */}
      <FloatingBlob
        colors={['#E8682A', '#C4521A']}
        size={175} top={H * 0.16} left={W - 110}
        toX={-20} toY={34} toScale={1.07}
        dur={5700} delay={500} opacity={0.29}
      />
      {/* Blob 5 — teal accent, lower-right */}
      <FloatingBlob
        colors={['#22D3EE', '#0EA5E9']}
        size={195} top={H * 0.76} left={W - 90}
        toX={-30} toY={-24} toScale={1.1}
        dur={7100} delay={2100} opacity={0.26}
      />
    </View>
  );
}
