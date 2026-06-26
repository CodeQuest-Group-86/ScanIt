import GlassCard from '@/components/GlassCard';
import LottieAnim, { type LottieSourceKey } from '@/components/ui/LottieAnim';
import type { CoachStep } from '@/hooks/useCoachMarks';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface CoachMarkOverlayProps {
  visible: boolean;
  step: CoachStep | null;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function CoachMarkOverlay({
  visible,
  step,
  stepNumber,
  totalSteps,
  onNext,
  onSkip,
}: CoachMarkOverlayProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [visible, pulse]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!visible || !step) return null;

  const isLast = stepNumber >= totalSteps;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
        )}

        <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} />

        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(120)}
          style={[styles.sheetWrap, cardAnim]}
        >
          <GlassCard intensity={72} tint="light" padded={false} style={styles.glassSheet}>
            <LinearGradient
              colors={['rgba(255,255,255,0.65)', 'rgba(255,248,240,0.35)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={styles.sheetInner}>
              {step.lottie && (
                <View style={styles.lottieWrap}>
                  <LottieAnim source={step.lottie as LottieSourceKey} size={100} />
                </View>
              )}

              <View style={styles.progressRow}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i + 1 === stepNumber && styles.progressDotActive,
                      i + 1 < stepNumber && styles.progressDotDone,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onSkip} hitSlop={12}>
                  <Text style={styles.skipText}>Skip tour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.88}>
                  <LinearGradient
                    colors={Colors.gradientPrimary as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.nextGradient}
                  >
                    <Text style={styles.nextText}>{isLast ? 'Got it!' : 'Next'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  androidBackdrop: {
    backgroundColor: 'rgba(18,16,14,0.55)',
  },
  sheetWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  glassSheet: {
    borderRadius: Radii.xxl,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  sheetInner: {
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  lottieWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  progressDotDone: {
    backgroundColor: Colors.primary + '66',
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  nextBtn: {
    borderRadius: Radii.pill,
    overflow: 'hidden',
    ...Shadows.primary,
  },
  nextGradient: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  nextText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
