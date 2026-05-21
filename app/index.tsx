import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/theme';

export default function EntryPoint() {
  const { isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const check = async () => {
      const onboardingDone = await AsyncStorage.getItem('scanit_onboarding_complete');
      if (!onboardingDone) {
        router.replace('/(onboarding)' as never);
      } else if (user) {
        router.replace('/(tabs)/explore' as never);
      } else {
        router.replace('/(auth)/sign-in' as never);
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
