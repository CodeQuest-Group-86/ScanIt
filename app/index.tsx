import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/theme';
import { warmUpBackend } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function EntryPoint() {
  const { isInitialized, user } = useAuthStore();

  useEffect(() => {
    warmUpBackend(); // fire-and-forget — wakes Render free tier in background
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
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
});
