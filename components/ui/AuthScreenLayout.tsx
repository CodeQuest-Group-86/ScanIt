import GlassCard from '@/components/GlassCard';
import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import LottieAnim from '@/components/ui/LottieAnim';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export type AuthLottieKey = 'auth-login' | 'auth-signup' | 'auth-forgot' | 'auth-verify' | 'smart' | 'loading';

interface AuthScreenLayoutProps {
  lottie: AuthLottieKey;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  compact?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Shared auth shell — liquid glass backdrop, floating Lottie hero, glass form card.
 */
export default function AuthScreenLayout({
  lottie,
  title,
  subtitle,
  children,
  footer,
  headerExtra,
  compact = false,
  contentStyle,
}: AuthScreenLayoutProps) {
  const float = useSharedValue(0);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [float, glow]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value * -10 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.92 + glow.value * 0.12 }],
  }));

  const lottieSize = compact ? 130 : 160;

  return (
    <View style={styles.root}>
      <LiquidGlassBackground variant="warm" blur />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scroll, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <Animated.View entering={FadeInDown.springify().damping(18).stiffness(90)} style={styles.hero}>
              <Animated.View style={[styles.glowRing, ringStyle]} />
              <Animated.View style={[styles.lottieWrap, heroStyle]}>
                <GlassCard intensity={58} tint="light" padded={false} style={styles.lottieGlass}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.55)', `${Colors.primary}12`]}
                    style={styles.lottieGradient}
                  >
                    <LottieAnim source={lottie} size={lottieSize} />
                  </LinearGradient>
                </GlassCard>
              </Animated.View>

              <View style={styles.logoRow}>
                <Text style={styles.logoScan}>Scan</Text>
                <Text style={styles.logoIt}>It</Text>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {headerExtra}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
              <GlassCard intensity={52} tint="light" style={styles.formCard}>
                {children}
              </GlassCard>
            </Animated.View>

            {footer ? (
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.footer}>
                {footer}
              </Animated.View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    top: 8,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary + '22',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  lottieWrap: {
    marginBottom: Spacing.md,
  },
  lottieGlass: {
    borderRadius: Radii.xxxl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  lottieGradient: {
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.xxxl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  logoScan: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.black,
    color: Colors.text,
  },
  logoIt: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.black,
    color: Colors.primary,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  formCard: {
    gap: Spacing.lg,
    ...Shadows.md,
  },
  footer: {
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
});
