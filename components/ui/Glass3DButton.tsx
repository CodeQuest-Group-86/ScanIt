import { Colors, Radii, Shadows } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface Glass3DButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable glass CTA with subtle 3D tilt on press.
 */
export default function Glass3DButton({ onPress, children, style, disabled }: Glass3DButtonProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${pressed.value * 4}deg` },
      { scale: 1 - pressed.value * 0.03 },
      { translateY: pressed.value * 2 },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 300 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 18, stiffness: 280 });
      }}
      style={[styles.wrap, animStyle, style, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={Colors.gradientPrimary as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View style={styles.glassHighlight} />
        {children}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.primary,
  },
  gradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  disabled: {
    opacity: 0.5,
  },
});
