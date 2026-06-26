import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import LottieAnim from '@/components/ui/LottieAnim';
import { useAuthStore } from '@/stores/auth';
import { Colors, Typography } from '@/theme';
import { warmUpBackend } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

export default function EntryPoint() {
  const { isInitialized, user } = useAuthStore();

  useEffect(() => {
    warmUpBackend();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

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
  }, [isInitialized, user]);

  return (
    <View style={styles.container}>
      <LiquidGlassBackground variant="warm" blur />
      <Animated.View entering={FadeIn.duration(500)} style={styles.content}>
        <LottieAnim source="loading" size={160} loop />
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.logo}>
          <Text style={styles.logoScan}>Scan</Text>
          <Text style={styles.logoIt}>It</Text>
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(450)} style={styles.tagline}>
          Waking up…
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { flexDirection: 'row', marginTop: 8 },
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
  },
});
