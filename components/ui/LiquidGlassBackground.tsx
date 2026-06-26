import { Colors } from '@/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Variant = 'warm' | 'dark' | 'cool';

interface LiquidGlassBackgroundProps {
  variant?: Variant;
  style?: ViewStyle;
  /** Extra blur layer on top of blobs */
  blur?: boolean;
  children?: React.ReactNode;
}

const BLOB_CONFIG = [
  { color: 'rgba(232,104,42,0.45)', size: 280, x: -60, y: -40, phase: 0 },
  { color: 'rgba(26,158,212,0.35)', size: 240, x: 180, y: 120, phase: 1 },
  { color: 'rgba(255,140,74,0.3)', size: 200, x: 40, y: 380, phase: 2 },
  { color: 'rgba(255,200,150,0.4)', size: 260, x: 220, y: 520, phase: 3 },
] as const;

const VARIANT_GRADIENTS: Record<Variant, [string, string, string]> = {
  warm: ['#FFF8F0', '#FAF0E4', '#F2E0C8'],
  dark: ['#1a120e', '#12100E', '#0a0806'],
  cool: ['#F0F8FF', '#E8F4FA', '#FAF0E4'],
};

function LiquidBlob({
  color,
  size,
  baseX,
  baseY,
  phase,
}: {
  color: string;
  size: number;
  baseX: number;
  baseY: number;
  phase: number;
}) {
  const drift = useSharedValue(0);
  const morph = useSharedValue(0);

  useEffect(() => {
    const delay = phase * 400;
    const t = setTimeout(() => {
      drift.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 5000 + phase * 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 5000 + phase * 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      morph.value = withRepeat(
        withTiming(1, { duration: 7000 + phase * 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [drift, morph, phase]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: baseX + interpolate(drift.value, [0, 1], [-28, 32]) },
      { translateY: baseY + interpolate(drift.value, [0, 1], [18, -24]) },
      { scale: interpolate(morph.value, [0, 1], [0.92, 1.12]) },
      { rotate: `${interpolate(morph.value, [0, 1], [-8, 12])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        style,
        {
          width: size,
          height: size,
          borderRadius: size * 0.42,
          backgroundColor: color,
        },
      ]}
    />
  );
}

/**
 * Animated liquid-glass backdrop — drifting colour blobs + optional blur veil.
 */
export default function LiquidGlassBackground({
  variant = 'warm',
  style,
  blur = true,
  children,
}: LiquidGlassBackgroundProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [shimmer]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.03, 0.08]),
  }));

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={VARIANT_GRADIENTS[variant]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {BLOB_CONFIG.map((b, i) => (
        <LiquidBlob
          key={i}
          color={variant === 'dark' ? b.color.replace(/0\.\d+\)/, '0.25)') : b.color}
          size={b.size}
          baseX={b.x}
          baseY={b.y}
          phase={b.phase}
        />
      ))}

      <Animated.View style={[styles.shimmerVeil, veilStyle]} pointerEvents="none" />

      {blur && Platform.OS === 'ios' && (
        <BlurView intensity={12} tint={variant === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      )}

      {blur && Platform.OS === 'android' && (
        <View style={[StyleSheet.absoluteFill, styles.androidVeil]} />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  shimmerVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  androidVeil: {
    backgroundColor: 'rgba(250,240,228,0.15)',
  },
});
