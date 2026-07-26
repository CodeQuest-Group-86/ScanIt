import { Colors, Radii, Spacing, Typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface ScanLoadingScreenProps {
  stage: string;
}

const FACTS = [
  "ScanIt checks prices across Ghana's top retailers in seconds.",
  "Every scan is checked for signs of counterfeit packaging.",
  "Point, snap, and ScanIt does the price-hunting for you.",
  "Your scan history is saved so you can revisit past finds anytime.",
  "Barcode or photo — ScanIt can identify almost anything you scan.",
];

const FACT_INTERVAL_MS = 2800;

/** Full-screen takeover shown while a capture is being analyzed — replaces the
 *  camera view entirely instead of overlaying it, so it reads as its own step. */
export default function ScanLoadingScreen({ stage }: ScanLoadingScreenProps) {
  const rotation = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false);
    ring1.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
    ring2.value = withDelay(600, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false));
  }, [ring1, ring2, rotation]);

  useEffect(() => {
    const id = setInterval(() => setFactIndex(i => (i + 1) % FACTS.length), FACT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const ringStyle1 = useAnimatedStyle(() => ({
    opacity: 1 - ring1.value,
    transform: [{ scale: 1 + ring1.value * 0.9 }],
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    opacity: 1 - ring2.value,
    transform: [{ scale: 1 + ring2.value * 0.9 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.screen}>
      <LinearGradient colors={Colors.gradientDark as [string, string]} style={StyleSheet.absoluteFill} />

      <View style={styles.loaderWrap}>
        <Animated.View style={[styles.pulseRing, ringStyle1]} />
        <Animated.View style={[styles.pulseRing, ringStyle2]} />
        <Animated.View style={[styles.spinner, spinStyle]} />
        <View style={styles.logoDot}>
          <Text style={styles.logoDotText}>SI</Text>
        </View>
      </View>

      <Animated.View key={stage} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
        <Text style={styles.stageText}>{stage}</Text>
      </Animated.View>

      <Animated.View
        key={factIndex}
        entering={FadeIn.delay(80).duration(400)}
        exiting={FadeOut.duration(250)}
        style={styles.factWrap}
      >
        <Text style={styles.factLabel}>DID YOU KNOW?</Text>
        <Text style={styles.factText}>{FACTS[factIndex]}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xl,
    zIndex: 50,
  },
  loaderWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  spinner: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.12)",
    borderTopColor: Colors.accent,
    borderRightColor: Colors.primary,
  },
  logoDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoDotText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.black,
  },
  stageText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    textAlign: "center",
  },
  factWrap: {
    alignItems: "center",
    gap: Spacing.xs,
    maxWidth: 300,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radii.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  factLabel: {
    color: Colors.accent,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  factText: {
    color: Colors.white + "CC",
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    lineHeight: 20,
  },
});
