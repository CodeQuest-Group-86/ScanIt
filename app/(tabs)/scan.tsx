import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScanStore } from '@/stores/scan';
import ScanBracket from '@/components/ScanBracket';
import { Colors, Spacing, Typography, Radii } from '@/theme';

const MAX_SCANS = 3;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { analyze, isAnalyzing, flashEnabled, toggleFlash, sessionScans, canScan, currentResult } = useScanStore();

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const [facing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (currentResult) {
      router.push('/scan-result' as never);
    }
  }, [currentResult]);

  const handleCapture = async () => {
    if (!canScan) {
      Alert.alert(
        'Scan limit reached',
        `You can scan up to ${MAX_SCANS} products per session. Restart the app to reset.`,
        [{ text: 'OK' }]
      );
      return;
    }
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) await analyze(photo.uri);
    } catch {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Gallery access is required to pick images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      await analyze(result.assets[0].uri);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionInner}>
          <Ionicons name="camera-outline" size={72} color={Colors.white} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            ScanIt needs camera access to scan and identify products around you.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flashEnabled ? 'on' : 'off'}
      />

      {/* Dark overlay */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Scan Product</Text>
        <TouchableOpacity onPress={toggleFlash} style={styles.topBtn}>
          <Ionicons
            name={flashEnabled ? 'flash' : 'flash-off-outline'}
            size={24}
            color={flashEnabled ? Colors.primary : Colors.white}
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Scan frame */}
      <View style={styles.scanArea} pointerEvents="none">
        <ScanBracket size={240} color={Colors.primary} />
        {/* Animated scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            { transform: [{ translateY: scanLineTranslate }] },
          ]}
        />
      </View>

      {/* Helper text */}
      <View style={styles.helperWrap} pointerEvents="none">
        <View style={styles.helperPill}>
          <Text style={styles.helperText}>Align product within the frame · Hold steady</Text>
        </View>
      </View>

      {/* Session limit notice */}
      {!canScan && (
        <View style={styles.limitBanner} pointerEvents="none">
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={styles.limitText}>Session scan limit reached ({MAX_SCANS}/{MAX_SCANS})</Text>
        </View>
      )}

      {/* Analyzing pill */}
      {isAnalyzing && (
        <View style={styles.analyzingPill} pointerEvents="none">
          <Text style={styles.analyzingText}>AI analyzing…</Text>
        </View>
      )}

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity onPress={handleGallery} style={styles.sideBtn}>
          <Ionicons name="images-outline" size={26} color={Colors.white} />
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableOpacity
          style={[styles.shutter, (!canScan || isAnalyzing) && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={!canScan || isAnalyzing}
          activeOpacity={0.8}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/scan-history' as never)} style={styles.sideBtn}>
          <Ionicons name="time-outline" size={26} color={Colors.white} />
          {sessionScans > 0 && (
            <View style={styles.scanCountBadge}>
              <Text style={styles.scanCountText}>{sessionScans}</Text>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  permissionContainer: { flex: 1, backgroundColor: Colors.nearBlack },
  permissionInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.lg },
  permissionTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.white, textAlign: 'center' },
  permissionBody: { fontSize: Typography.sizes.md, color: Colors.white + '99', textAlign: 'center', lineHeight: 24 },
  grantBtn: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.md, marginTop: Spacing.md },
  grantBtnText: { color: Colors.white, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  backLink: { marginTop: Spacing.sm },
  backLinkText: { color: Colors.white + '80', fontSize: Typography.sizes.md },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, zIndex: 10 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.white },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
    opacity: 0.9,
  },
  helperWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  helperPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.pill },
  helperText: { color: Colors.white, fontSize: Typography.sizes.sm, textAlign: 'center' },
  limitBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.warning + '30', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginHorizontal: Spacing.lg, borderRadius: Radii.md, marginBottom: Spacing.md },
  limitText: { color: Colors.warning, fontSize: Typography.sizes.sm, flex: 1 },
  analyzingPill: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: Colors.nearBlack + 'DD', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: Colors.accent },
  analyzingText: { color: Colors.accent, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, paddingTop: Spacing.md },
  sideBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  scanCountBadge: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  scanCountText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary },
});
