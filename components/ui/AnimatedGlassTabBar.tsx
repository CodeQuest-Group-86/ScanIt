import { Colors, Radii, Shadows, Spacing } from '@/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  explore: { active: 'home', inactive: 'home-outline' },
  history: { active: 'time', inactive: 'time-outline' },
  saved: { active: 'bookmark', inactive: 'bookmark-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

function AnimatedTabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.28, { damping: 8, stiffness: 280 }),
        withSpring(1.08, { damping: 12, stiffness: 200 }),
      );
      translateY.value = withSpring(-3, { damping: 14 });
    } else {
      scale.value = withSpring(1, { damping: 14 });
      translateY.value = withSpring(0, { damping: 14 });
    }
  }, [focused, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
}

function ScanFab() {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400 }),
        withTiming(1, { duration: 1400 }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(withTiming(0.75, { duration: 1400 }), withTiming(0.35, { duration: 1400 })),
      -1,
      false,
    );
  }, [pulse, glow]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Pressable onPress={() => router.push('/(tabs)/scan')} style={styles.scanFabWrap}>
      <Animated.View style={[styles.scanFabOuter, fabStyle]}>
        <LinearGradient
          colors={Colors.gradientPrimary as [string, string, ...string[]]}
          style={styles.scanFabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.scanFabRing} />
          <Ionicons name="scan" size={30} color={Colors.white} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function AnimatedGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(r => r.name !== 'scan');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBar]} />
      )}

      <View style={styles.topHighlight} />

      <View style={styles.row}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);
          const color = isFocused ? Colors.primary : Colors.textSecondary;
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.explore;
          const iconName = isFocused ? icons.active : icons.inactive;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const showScanAfter = index === 1;

          return (
            <React.Fragment key={route.key}>
              <Pressable
                onPress={onPress}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                <AnimatedTabIcon name={iconName} focused={isFocused} color={color} />
                <Text style={[styles.label, { color }, isFocused && styles.labelActive]}>{label}</Text>
                {isFocused && <View style={styles.activePill} />}
              </Pressable>
              {showScanAfter && <ScanFab />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  androidBar: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.8)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 64,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
  activePill: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  scanFabWrap: {
    marginTop: -28,
    marginHorizontal: -4,
    zIndex: 10,
  },
  scanFabOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  scanFabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  scanFabRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
