import { Colors, Radii, Spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  explore: { active: 'home', inactive: 'home-outline' },
  history: { active: 'time', inactive: 'time-outline' },
  saved: { active: 'bookmark', inactive: 'bookmark-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

const SPRING_SNAP = { damping: 14, stiffness: 300, mass: 0.68 };
const SPRING_SOFT = { damping: 16, stiffness: 210, mass: 0.78 };
const SPRING_BOUNCE = { damping: 11, stiffness: 340, mass: 0.6 };

const ISLAND_RADIUS = 28;
const ISLAND_HEIGHT = 64;
const FAB_SIZE = 68;
const FAB_OVERHANG = 18;

/** Visible chrome height. Keep in sync with useTabBarInset. */
export const TAB_BAR_CHROME_HEIGHT = Math.max(ISLAND_HEIGHT, FAB_SIZE + FAB_OVERHANG - 8) + 8;

type TabRoute = BottomTabBarProps['state']['routes'][number];

function GlassIsland({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.islandShadow}>
      <View style={styles.island}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />
        )}

        <LinearGradient
          colors={[
            'rgba(255,253,250,0.78)',
            'rgba(255,244,232,0.48)',
            'rgba(255,236,220,0.32)',
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Specular top highlight */}
        <View style={styles.islandTopEdge} />
        <View style={styles.islandTopWash} />

        {/* Soft inner bottom carve */}
        <View style={styles.islandBottomEdge} />

        <View style={styles.islandRow}>{children}</View>
      </View>
    </View>
  );
}

function AnimatedTabItem({
  label,
  focused,
  iconName,
  onPress,
}: {
  label: string;
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING_SNAP);
  }, [focused, progress]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -1.5], Extrapolation.CLAMP) },
      {
        scale:
          interpolate(progress.value, [0, 1], [1, 1.06], Extrapolation.CLAMP) *
          (1 - press.value * 0.09),
      },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
  }));

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [1.5, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
    ],
  }));

  const color = focused ? Colors.primary : Colors.textMuted;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      onPressIn={() => {
        press.value = withSpring(1, SPRING_SOFT);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING_SOFT);
      }}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconStage, stageStyle]}>
        <Animated.View style={[styles.activeGlow, glowStyle]} />
        <Animated.View style={[styles.activeCapsule, capsuleStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.7)',
              'rgba(255,156,90,0.22)',
              'rgba(232,104,42,0.14)',
            ]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
        <Ionicons name={iconName} size={21} color={color} />
      </Animated.View>

      <Animated.View style={labelStyle}>
        <Text style={[styles.label, focused && styles.labelActive, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function ScanFab() {
  const breathe = useSharedValue(1);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const press = useSharedValue(0);
  const sheen = useSharedValue(0);
  const iconTilt = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    ringA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );

    ringB.value = withDelay(
      950,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    sheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breathe, ringA, ringB, sheen]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathe.value * (1 - press.value * 0.12) },
      { rotate: `${interpolate(press.value, [0, 1], [0, -6], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringA.value, [0, 0.15, 1], [0.55, 0.3, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(ringA.value, [0, 1], [1, 1.58], Extrapolation.CLAMP) }],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringB.value, [0, 0.15, 1], [0.38, 0.18, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(ringB.value, [0, 1], [1, 1.82], Extrapolation.CLAMP) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.5, 1], [0.12, 0.32, 0.12], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(sheen.value, [0, 1], [-20, 20], Extrapolation.CLAMP) },
      { rotate: '-20deg' },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [1, 1.045], [0.4, 0.62], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(breathe.value, [1, 1.045], [1, 1.1], Extrapolation.CLAMP) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(press.value, [0, 1], [1, 0.92], Extrapolation.CLAMP) },
      { rotate: `${iconTilt.value}deg` },
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        iconTilt.value = withSequence(
          withTiming(-8, { duration: 80 }),
          withSpring(0, SPRING_BOUNCE),
        );
        router.push('/(tabs)/scan');
      }}
      onPressIn={() => {
        press.value = withSpring(1, SPRING_BOUNCE);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING_SOFT);
      }}
      style={styles.scanFabWrap}
      accessibilityRole="button"
      accessibilityLabel="Scan product"
    >
      <Animated.View style={[styles.scanHalo, haloStyle]} />
      <Animated.View style={[styles.scanPulseRing, ringAStyle]} />
      <Animated.View style={[styles.scanPulseRingOuter, ringBStyle]} />

      <Animated.View style={[styles.scanFabOuter, fabStyle]}>
        {/* Frosted glass rim */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.98)',
            'rgba(255,220,190,0.55)',
            'rgba(255,255,255,0.4)',
            'rgba(255,180,120,0.65)',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          style={styles.scanFabRim}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        >
          <LinearGradient
            colors={['#FF9A5C', '#E8682A', '#C4521A'] as [string, string, ...string[]]}
            style={styles.scanFabGradient}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          >
            <View style={styles.scanFabSpecular} />
            <Animated.View style={[styles.scanFabSheen, sheenStyle]} />
            <View style={styles.scanFabInnerRing} />
            <Animated.View style={iconStyle}>
              <Ionicons name="scan" size={29} color={Colors.white} />
            </Animated.View>
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function renderTab(
  route: TabRoute,
  state: BottomTabBarProps['state'],
  descriptors: BottomTabBarProps['descriptors'],
  navigation: BottomTabBarProps['navigation'],
) {
  const { options } = descriptors[route.key];
  const label = (options.title ?? route.name) as string;
  const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);
  const icons = TAB_ICONS[route.name] ?? TAB_ICONS.explore;
  const iconName = isFocused ? icons.active : icons.inactive;

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <AnimatedTabItem
      key={route.key}
      label={label}
      focused={isFocused}
      iconName={iconName}
      onPress={onPress}
    />
  );
}

export default function AnimatedGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withSpring(1, { damping: 17, stiffness: 150, mass: 0.92 });
  }, [appear]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: interpolate(appear.value, [0, 1], [36, 0], Extrapolation.CLAMP) },
      { scale: interpolate(appear.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  const currentRoute = state.routes[state.index];
  if (currentRoute?.name === 'scan') {
    return null;
  }

  const visibleRoutes = state.routes.filter(r => r.name !== 'scan');
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

  return (
    <View pointerEvents="box-none" style={[styles.container, { paddingBottom: bottomPad }]}>
      <Animated.View style={[styles.bar, shellStyle]} pointerEvents="box-none">
        {/* Soft floor glow under the whole nav */}
        <View style={styles.floorGlow} pointerEvents="none" />

        <View style={styles.row}>
          {/* Left island — Home + History */}
          <View style={styles.islandWrap}>
            <GlassIsland>
              {leftRoutes.map(route => renderTab(route, state, descriptors, navigation))}
            </GlassIsland>
          </View>

          {/* Center hero scan orb */}
          <View style={styles.centerWrap}>
            <ScanFab />
          </View>

          {/* Right island — Saved + Profile */}
          <View style={styles.islandWrap}>
            <GlassIsland>
              {rightRoutes.map(route => renderTab(route, state, descriptors, navigation))}
            </GlassIsland>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 440,
    paddingTop: 6,
  },
  floorGlow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 2,
    height: 22,
    borderRadius: 40,
    backgroundColor: 'rgba(62, 44, 35, 0.12)',
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  islandWrap: {
    flex: 1,
  },
  centerWrap: {
    width: FAB_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the hero orb slightly above the glass islands
    marginBottom: 10,
  },
  islandShadow: {
    borderRadius: ISLAND_RADIUS,
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 14,
    backgroundColor: 'transparent',
  },
  island: {
    borderRadius: ISLAND_RADIUS,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.16)' : 'transparent',
    minHeight: ISLAND_HEIGHT,
  },
  androidGlass: {
    backgroundColor: 'rgba(255,250,244,0.97)',
  },
  islandTopEdge: {
    position: 'absolute',
    top: 1,
    left: 14,
    right: 14,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  islandTopWash: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  islandBottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(232, 180, 140, 0.28)',
  },
  islandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 9,
    minHeight: ISLAND_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
    minWidth: 56,
  },
  iconStage: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 36,
    height: 26,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,140,74,0.32)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 9,
  },
  activeCapsule: {
    position: 'absolute',
    width: 42,
    height: 30,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,140,74,0.1)',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '700',
    letterSpacing: 0.08,
  },
  scanFabWrap: {
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHalo: {
    position: 'absolute',
    width: FAB_SIZE + 18,
    height: FAB_SIZE + 18,
    borderRadius: (FAB_SIZE + 18) / 2,
    backgroundColor: 'rgba(232,104,42,0.2)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
  },
  scanPulseRing: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,140,74,0.5)',
  },
  scanPulseRingOuter: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,74,0.3)',
  },
  scanFabOuter: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  scanFabRim: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanFabSpecular: {
    position: 'absolute',
    top: 4,
    left: 11,
    right: 11,
    height: '36%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scanFabSheen: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  scanFabInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    margin: 1,
  },
});
