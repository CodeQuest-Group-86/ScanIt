/**
 * app/(tabs)/scan.tsx
 *
 * Main scan screen. Supports two modes:
 *   1. BARCODE mode (default) — camera auto-detects barcodes as you point at them.
 *      No button press needed. Instant 99%-accurate product lookup.
 *   2. PHOTO mode — press shutter to take a photo, AI models analyse it, then
 *      the backend keyword-matches the AI label to a product.
 *
 * Switching between modes: tap the barcode/camera icon in the bottom bar.
 */

import PaywallModal from '@/components/PaywallModal';
import ScanBracket from '@/components/ScanBracket';
import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScanMode = 'barcode' | 'photo';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('photo');

  const {
    analyze,
    analyzeBarcode,
    isAnalyzing,
    flashEnabled,
    toggleFlash,
    currentResult,
    analyzingStage,
    error,
    offlineMode,
    dailyScansUsed,
    dailyScansLimit,
    isPremium,
  } = useScanStore();

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView>(null);

  // Remember if a barcode was already scanned this session (prevent double-fire)
  const lastBarcode = useRef<string | null>(null);

  // Animate the scan line
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
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Navigate to result screen when result is ready
  useEffect(() => {
    if (currentResult) {
      lastBarcode.current = null; // reset for next scan
      router.push('/scan-result');
    }
  }, [currentResult]);

  // Show error alerts — but NOT for offline mode or special error codes
  useEffect(() => {
    if (!error || offlineMode) return;
    if (error === 'invalid_object') return; // handled by banner
    if (error === 'auth_required') {
      Alert.alert('Sign in required', 'Please sign in to scan products.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/sign-in') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Scan failed', error);
  }, [error, offlineMode]);

  // Reset last barcode when mode changes
  useEffect(() => {
    lastBarcode.current = null;
  }, [mode]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCapture = async () => {
    if (isAnalyzing || !cameraRef.current) return;
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
      Alert.alert('Permission denied', 'Gallery access is required.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!picked.canceled && picked.assets[0]) await analyze(picked.assets[0].uri);
  };

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (isAnalyzing) return;
      if (lastBarcode.current === result.data) return; // already scanning this code
      lastBarcode.current = result.data;
      await analyzeBarcode(result.data);
    },
    [isAnalyzing, analyzeBarcode],
  );

  // ── Permission screens ────────────────────────────────────────────────────

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionInner}>
          <Ionicons name="camera-outline" size={72} color={Colors.white} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            ScanIt needs camera access to scan and identify products.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const scansLeft = Math.max(0, dailyScansLimit - dailyScansUsed);

  return (
    <View style={styles.container}>
      <PaywallModal />

      {/* Camera — barcode scanning active only in barcode mode */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashEnabled ? 'on' : 'off'}
        barcodeScannerSettings={
          mode === 'barcode'
            ? { barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39', 'upc_a', 'upc_e'] }
            : undefined
        }
        onBarcodeScanned={mode === 'barcode' && !isAnalyzing ? handleBarcodeScanned : undefined}
      />

      <View style={styles.overlay} pointerEvents="none" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.modeToggle}>
          <Text style={styles.modeLabel}>
            {mode === 'barcode' ? 'Barcode Mode' : 'Photo Mode'}
          </Text>
          {!isPremium && (
            <View style={[styles.quotaBadge, scansLeft === 0 && styles.quotaBadgeEmpty]}>
              <Ionicons name="scan-outline" size={10} color={scansLeft === 0 ? Colors.danger : Colors.white} />
              <Text style={[styles.quotaText, scansLeft === 0 && styles.quotaTextEmpty]}>
                {scansLeft === 0 ? 'Limit reached' : `${scansLeft} scan${scansLeft === 1 ? '' : 's'} left`}
              </Text>
            </View>
          )}
        </View>

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
        <ScanBracket size={240} color={mode === 'barcode' ? Colors.accent : Colors.primary} />
        <Animated.View
          style={[
            styles.scanLine,
            {
              backgroundColor: mode === 'barcode' ? Colors.accent : Colors.primary,
              transform: [{ translateY: scanLineTranslate }],
            },
          ]}
        />
      </View>

      {/* Helper text */}
      {!isAnalyzing && (
        <View style={styles.helperWrap} pointerEvents="none">
          <View style={styles.helperPill}>
            <Text style={styles.helperText}>
              {mode === 'barcode'
                ? 'Point at barcode · Auto-detects'
                : 'Point at product · Press shutter'}
            </Text>
          </View>
        </View>
      )}

      {/* Analysing indicator */}
      {isAnalyzing && (
        <View style={styles.analyzingPill} pointerEvents="none">
          <View style={styles.analyzingDot} />
          <Text style={styles.analyzingText}>{analyzingStage ?? 'Identifying product…'}</Text>
        </View>
      )}

      {/* Offline warning banner */}
      {offlineMode && !isAnalyzing && (
        <View style={styles.offlineBanner} pointerEvents="none">
          <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
          <Text style={styles.offlineText}>
            Gemini Vision + DuckDuckGo · Tap sellers to open Google in your browser.
          </Text>
        </View>
      )}

      {/* Invalid object banner */}
      {error === 'invalid_object' && !isAnalyzing && (
        <TouchableOpacity
          style={styles.invalidBanner}
          onPress={() => useScanStore.getState().clearResult()}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.invalidText}>Can&apos;t identify object — try a clearer shot</Text>
          <Ionicons name="close" size={16} color="#ffffff99" />
        </TouchableOpacity>
      )}

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {/* Gallery (photo mode only) */}
        <TouchableOpacity
          onPress={mode === 'photo' ? handleGallery : undefined}
          style={[styles.sideBtn, mode !== 'photo' && styles.sideBtnHidden]}
          disabled={isAnalyzing || mode !== 'photo'}
        >
          {mode === 'photo' && (
            <Ionicons
              name="images-outline"
              size={26}
              color={isAnalyzing ? Colors.white + '40' : Colors.white}
            />
          )}
        </TouchableOpacity>

        {/* Shutter (photo mode) / Barcode indicator (barcode mode) */}
        {mode === 'photo' ? (
          <TouchableOpacity
            style={[styles.shutter, isAnalyzing && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        ) : (
          <View style={styles.barcodeIndicator}>
            <Ionicons name="barcode-outline" size={40} color={isAnalyzing ? Colors.accent + '60' : Colors.accent} />
            <Text style={styles.barcodeHint}>Auto-scanning…</Text>
          </View>
        )}

        {/* Mode toggle */}
        <TouchableOpacity
          onPress={() => setMode(m => (m === 'barcode' ? 'photo' : 'barcode'))}
          style={styles.sideBtn}
          disabled={isAnalyzing}
        >
          <Ionicons
            name={mode === 'barcode' ? 'camera-outline' : 'barcode-outline'}
            size={26}
            color={isAnalyzing ? Colors.white + '40' : Colors.white}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  // Permission
  permissionContainer: { flex: 1, backgroundColor: Colors.nearBlack },
  permissionInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.lg },
  permissionTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.white, textAlign: 'center' },
  permissionBody: { fontSize: Typography.sizes.md, color: Colors.white + '99', textAlign: 'center', lineHeight: 24 },
  grantBtn: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.md },
  grantBtnText: { color: Colors.white, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, zIndex: 10 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modeToggle: { alignItems: 'center', gap: 4 },
  modeLabel: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.white },
  quotaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.pill },
  quotaBadgeEmpty: { backgroundColor: Colors.danger + '30', borderWidth: 1, borderColor: Colors.danger + '80' },
  quotaText: { fontSize: 10, color: Colors.white, fontWeight: Typography.weights.semibold },
  quotaTextEmpty: { color: Colors.danger },

  // Scan area
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanLine: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, borderRadius: 1, opacity: 0.9 },

  // Helper
  helperWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  helperPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.pill },
  helperText: { color: Colors.white, fontSize: Typography.sizes.sm },

  // Analysing
  analyzingPill: { position: 'absolute', top: '45%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.nearBlack + 'EE', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: Colors.accent },
  analyzingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  analyzingText: { color: Colors.accent, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },

  // Offline banner
  offlineBanner: { position: 'absolute', top: 100, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.warning + '60' },
  offlineText: { flex: 1, color: Colors.warning, fontSize: Typography.sizes.xs, lineHeight: 16 },
  // Invalid object banner
  invalidBanner: { position: 'absolute', top: 100, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#C0392B', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radii.md },
  invalidText: { flex: 1, color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, paddingTop: Spacing.md },
  sideBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  sideBtnHidden: { opacity: 0 },

  // Shutter (photo mode)
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary },

  // Barcode indicator (barcode mode)
  barcodeIndicator: { alignItems: 'center', gap: 4 },
  barcodeHint: { color: Colors.accent, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
});
