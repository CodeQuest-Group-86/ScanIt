import Button from '@/components/Button';
import GlassCard from '@/components/GlassCard';
import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import LottieAnim, { type LottieSourceKey } from '@/components/ui/LottieAnim';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  lottie: LottieSourceKey;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    id: 's1',
    title: 'Scan any product',
    subtitle:
      'Point your camera at anything — no barcode needed. Our AI identifies it instantly and finds Ghana prices.',
    lottie: 'scan',
    accent: Colors.primary,
  },
  {
    id: 's2',
    title: 'Compare prices instantly',
    subtitle:
      'See live prices from Jumia, Tonaton, Kikuu, and local markets. Verify authenticity before you buy.',
    lottie: 'shopping',
    accent: Colors.accent,
  },
  {
    id: 's3',
    title: 'Shop smarter',
    subtitle:
      'Save products, get recommendations, and call sellers directly — all in one sleek app.',
    lottie: 'smart',
    accent: Colors.primary,
  },
];

function SlideItem({ item, index, scrollX }: { item: Slide; index: number; scrollX: SharedValue<number> }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const lottieStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const rotateY = interpolate(scrollX.value, inputRange, [12, 0, -12], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 900 }, { scale }, { rotateY: `${rotateY}deg` }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.lottieCard, lottieStyle]}>
        <GlassCard intensity={60} tint="light" padded={false} glowColor="rgba(255,255,255,0.7)" style={styles.lottieGlass}>
          <LinearGradient
            colors={[`${item.accent}18`, 'rgba(255,255,255,0.5)']}
            style={styles.lottieGradient}
          >
            <LottieAnim source={item.lottie} size={Math.min(200, SCREEN_HEIGHT * 0.24)} />
          </LinearGradient>
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const complete = async () => {
    await AsyncStorage.setItem('scanit_onboarding_complete', 'true');
    router.replace('/(auth)/sign-in');
  };

  const next = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      complete();
    }
  };

  return (
    <View style={styles.root}>
      <LiquidGlassBackground variant="warm" blur />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.skip} onPress={complete}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.listArea}>
          <AnimatedFlatList
            ref={flatListRef}
            data={SLIDES}
            keyExtractor={i => i.id}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item, index }) => (
              <SlideItem item={item} index={index} scrollX={scrollX} />
            )}
          />
        </View>

        <View style={styles.footer}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.footerAndroid]} />
          )}
          <LinearGradient
            colors={['rgba(255,255,255,0.55)', 'rgba(250,240,228,0.85)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.footerInner}>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <AnimatedDot key={i} active={i === activeIndex} />
              ))}
            </View>

            {activeIndex === SLIDES.length - 1 ? (
              <Button label="Get Started" onPress={complete} fullWidth size="lg" />
            ) : (
              <Button label="Next" onPress={next} fullWidth size="lg" />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function AnimatedDot({ active }: { active: boolean }) {
  const dotWidth = useSharedValue(active ? 28 : 8);

  React.useEffect(() => {
    dotWidth.value = withSpring(active ? 28 : 8, { damping: 14, stiffness: 200 });
  }, [active, dotWidth]);

  const style = useAnimatedStyle(() => ({
    width: dotWidth.value,
    backgroundColor: active ? Colors.primary : Colors.border,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  skip: { alignSelf: 'flex-end', padding: Spacing.lg, zIndex: 2 },
  skipText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  slide: {
    width,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  lottieCard: {
    marginBottom: Spacing.xl,
  },
  lottieGlass: {
    borderRadius: Radii.xxxl,
    ...Shadows.lg,
  },
  lottieGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radii.xxxl,
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    maxWidth: width - Spacing.xxxl * 2,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  footerAndroid: {
    backgroundColor: 'rgba(250,240,228,0.9)',
  },
  footerInner: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignItems: 'center',
    height: 12,
  },
  dot: {
    height: 8,
    borderRadius: Radii.pill,
  },
});
