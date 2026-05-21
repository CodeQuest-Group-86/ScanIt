import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, ViewToken
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScanBracket from '@/components/ScanBracket';
import Button from '@/components/Button';
import { Colors, Spacing, Typography, Radii } from '@/theme';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  showBracket?: boolean;
}

const SLIDES: Slide[] = [
  {
    id: 's1',
    title: 'Scan any product',
    subtitle: 'Just point your camera at any product — no barcode or QR code needed. Our AI identifies it instantly.',
    icon: 'camera-outline',
    iconColor: Colors.primary,
    showBracket: true,
  },
  {
    id: 's2',
    title: 'Compare prices instantly',
    subtitle: 'Verify authenticity and find cheaper sellers nearby. Never overpay for the same product again.',
    icon: 'pricetag-outline',
    iconColor: Colors.accent,
  },
  {
    id: 's3',
    title: 'Shop smarter',
    subtitle: 'Get smart recommendations, vendor hotlines, and real-time price alerts — all in one app.',
    icon: 'bulb-outline',
    iconColor: Colors.primary,
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      complete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={complete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.illustrationWrap}>
              {item.showBracket ? (
                <View style={styles.bracketContainer}>
                  <ScanBracket size={180} color={Colors.primary} />
                  <View style={styles.iconInBracket}>
                    <Ionicons name={item.icon} size={64} color={item.iconColor} />
                  </View>
                </View>
              ) : (
                <View style={[styles.iconCircle, { backgroundColor: item.iconColor + '20' }]}>
                  <Ionicons name={item.icon} size={80} color={item.iconColor} />
                </View>
              )}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        {activeIndex === SLIDES.length - 1 ? (
          <Button label="Get Started" onPress={complete} fullWidth size="lg" />
        ) : (
          <Button label="Next" onPress={next} fullWidth size="lg" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  skip: { alignSelf: 'flex-end', padding: Spacing.lg },
  skipText: { fontSize: Typography.sizes.md, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  slide: { width, paddingHorizontal: Spacing.xxxl, alignItems: 'center', paddingTop: Spacing.section },
  illustrationWrap: { marginBottom: Spacing.xxxl },
  bracketContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  iconInBracket: { position: 'absolute' },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.extrabold, color: Colors.text, textAlign: 'center', marginBottom: Spacing.md },
  subtitle: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  footer: { padding: Spacing.xl, gap: Spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { height: 8, borderRadius: Radii.pill },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotInactive: { width: 8, backgroundColor: Colors.border },
});
