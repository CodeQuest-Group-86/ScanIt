import { Colors, Radii } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function AuthMotionBackground() {
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 7600,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 7600,
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ]),
    );

    driftLoop.start();
    pulseLoop.start();

    return () => {
      driftLoop.stop();
      pulseLoop.stop();
    };
  }, [drift, pulse]);

  const beamShift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-34, 36],
  });
  const beamShiftAlt = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [42, -28],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.34],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={Colors.gradientSurface as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.beam,
          styles.beamPrimary,
          { transform: [{ translateX: beamShift }, { rotate: '-13deg' }] },
        ]}
      />
      <Animated.View
        style={[
          styles.beam,
          styles.beamAccent,
          { transform: [{ translateX: beamShiftAlt }, { rotate: '15deg' }] },
        ]}
      />
      <Animated.View
        style={[
          styles.scanHalo,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }, { rotate: '-8deg' }],
          },
        ]}
      >
        <View style={styles.scanCornerTop} />
        <View style={styles.scanCornerBottom} />
      </Animated.View>
      <View style={styles.gridLineA} />
      <View style={styles.gridLineB} />
    </View>
  );
}

const styles = StyleSheet.create({
  beam: {
    position: 'absolute',
    left: -48,
    right: -48,
    height: 138,
    borderRadius: Radii.xxxl,
  },
  beamPrimary: {
    top: 68,
    backgroundColor: 'rgba(232,104,42,0.15)',
  },
  beamAccent: {
    bottom: 90,
    backgroundColor: 'rgba(0,167,200,0.14)',
  },
  scanHalo: {
    position: 'absolute',
    top: 118,
    alignSelf: 'center',
    width: 238,
    height: 238,
    borderRadius: Radii.xxxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scanCornerTop: {
    position: 'absolute',
    top: 26,
    left: 26,
    width: 62,
    height: 62,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.accentLight,
    borderTopLeftRadius: Radii.lg,
  },
  scanCornerBottom: {
    position: 'absolute',
    right: 26,
    bottom: 26,
    width: 62,
    height: 62,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: Colors.primaryLight,
    borderBottomRightRadius: Radii.lg,
  },
  gridLineA: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 258,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  gridLineB: {
    position: 'absolute',
    left: 58,
    right: 58,
    bottom: 210,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
});
