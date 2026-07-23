import AnimatedGlassTabBar from '@/components/ui/AnimatedGlassTabBar';
import { Colors } from '@/theme';
import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/stores/auth';

export default function TabLayout() {
  const { isInitialized, user } = useAuthStore();
  const [checked, setChecked] = React.useState(false);

  useEffect(() => {
    if (isInitialized) {
      setChecked(true);
      if (!user) {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isInitialized, user]);

  if (!checked || !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={props => <AnimatedGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen
        name="explore"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History' }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: 'Saved' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}
