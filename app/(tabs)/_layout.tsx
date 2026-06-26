import AnimatedGlassTabBar from '@/components/ui/AnimatedGlassTabBar';
import { Colors } from '@/theme';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
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
