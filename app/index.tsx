import ScanBracket from '@/components/ScanBracket';
import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import { useAuthStore } from '@/stores/auth';
import { Colors, Spacing, Typography } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BRACKET_SIZE = 168;

/**
 * Floor for how long the splash stays up, purely so the entrance animation
 * doesn't get cut off if auth state resolves instantly. Navigation must NOT
 * wait on the backend — it's on Render's free tier and can cold-start for
 * 30-200s; that warm-up already runs in the background from app/_layout.tsx
 * and screens that hit the API handle their own loading/error states.
 */
const MIN_SPLASH_MS = 900;

export default function EntryPoint() {
  const { isInitialized, user } = useAuthStore();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const scanLine = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    scanLine.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [scanLine, glow]);

  useEffect(() => {
    if (!isInitialized || !minTimeElapsed) return;

    const check = async () => {
      const onboardingDone = await AsyncStorage.getItem('scanit_onboarding_complete');
      if (!onboardingDone) {
        router.replace('/(onboarding)');
      } else if (user) {
        router.replace('/(tabs)/explore');
      } else {
        router.replace('/(auth)/sign-in');
      }
    };
    check();
  }, [isInitialized, minTimeElapsed, user]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLine.value, [0, 1], [-58, 58]) }],
    opacity: interpolate(scanLine.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.3, 0.65]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.9, 1.1]) }],
  }));

  return (
    <View style={styles.container}>
      <LiquidGlassBackground variant="warm" blur />

      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(450)} style={styles.markWrap}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <ScanBracket size={BRACKET_SIZE} color={Colors.primary} thickness={3} cornerLength={30} />
          <View style={styles.markCenter}>
            <Ionicons name="shield-checkmark" size={50} color={Colors.primary} />
          </View>
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(250).springify().damping(14)} style={styles.logo}>
          <Text style={styles.logoScan}>Scan</Text>
          <Text style={styles.logoIt}>It</Text>
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(420)} style={styles.tagline}>
          Know it&apos;s real before you buy it
        </Animated.Text>

        <Animated.View entering={FadeIn.delay(650)} style={styles.statusRow}>
          <PulsingDots />
        </Animated.View>
      </View>
    </View>
  );
}

function Dot({ t, offset }: { t: SharedValue<number>; offset: number }) {
  const style = useAnimatedStyle(() => {
    const local = (t.value + offset) % 1;
    return { opacity: interpolate(local, [0, 0.3, 0.6, 1], [0.25, 1, 0.25, 0.25]) };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function PulsingDots() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [t]);

  return (
    <View style={styles.dotsRow}>
      <Dot t={t} offset={0} />
      <Dot t={t} offset={0.33} />
      <Dot t={t} offset={0.66} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },

  markWrap: {
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  glow: {
    position: 'absolute',
    width: BRACKET_SIZE + 36,
    height: BRACKET_SIZE + 36,
    borderRadius: (BRACKET_SIZE + 36) / 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  markCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  logo: { flexDirection: 'row' },
  logoScan: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.black,
    color: Colors.text,
  },
  logoIt: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.black,
    color: Colors.primary,
  },
  tagline: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});
