import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors, Shadows } from '@/theme';

function ScanTabButton() {
  return (
    <TouchableOpacity
      style={styles.scanButton}
      onPress={() => router.push('/(tabs)/scan')}
      activeOpacity={0.85}>
      <View style={styles.scanButtonInner}>
        <Ionicons name="scan-outline" size={28} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
}

/** Frosted glass tab bar background — iOS only; Android gets solid white. */
function GlassTabBarBackground() {
  if (Platform.OS !== 'ios') return null;
  return (
    <BlurView
      intensity={70}
      tint="systemChromeMaterial"
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarBackground: GlassTabBarBackground,
        tabBarStyle: {
          // Transparent so the blur shows through on iOS
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.white,
          borderTopWidth: Platform.OS === 'ios' ? 0 : 0,
          // Subtle top border as glass edge highlight
          borderTopColor: 'rgba(255,255,255,0.5)',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          ...Shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: () => <ScanTabButton />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
