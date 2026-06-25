import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'extraLight' | 'systemMaterial' | 'systemChromeMaterial';
  padded?: boolean;
  /** Accent glow color (rgba string). Defaults to warm white. */
  glowColor?: string;
}

/**
 * Liquid Glass card — frosted blur with a subtle inner border + glow.
 * On Android, BlurView is not fully supported so we fall back to a
 * semi-transparent surface with an inner highlight border.
 */
export default function GlassCard({
  children,
  style,
  intensity = 55,
  tint = 'light',
  padded = true,
  glowColor = 'rgba(255,255,255,0.55)',
}: GlassCardProps) {
  const inner = [styles.inner, padded && styles.padded, { borderColor: glowColor }, style];

  if (Platform.OS === 'android') {
    return (
      <View style={[styles.androidFallback, padded && styles.padded, style]}>
        <View style={[StyleSheet.absoluteFill, styles.androidHighlight]} />
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={[styles.blur, style && { borderRadius: (style as any).borderRadius ?? Radii.xl }]}>
      <View style={inner}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  inner: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.lg,
  },
  // Android fallback — semi-transparent warm surface
  androidFallback: {
    backgroundColor: 'rgba(250,240,228,0.82)',
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  androidHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radii.xl,
  },
});
