import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScanStore } from '@/stores/scan';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { AuthenticityBadge } from '@/components/Badge';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatPrice, formatConfidence } from '@/utils/format';
import type { AIAnalysisResult, AIModelResult } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── AI model icon map ───────────────────────────────────────────────────────
const MODEL_ICONS: Record<string, string> = {
  'HuggingFace Vision': 'eye-outline',
  'TensorFlow Lite': 'hardware-chip-outline',
  'MobileNet': 'phone-portrait-outline',
  'CLIP': 'images-outline',
  'ResNet-50': 'shield-checkmark-outline',
  'BERT': 'chatbubble-ellipses-outline',
};

const MODEL_COLORS: Record<string, string> = {
  'HuggingFace Vision': '#FF9000',
  'TensorFlow Lite': '#FF6F00',
  'MobileNet': '#00897B',
  'CLIP': '#7B1FA2',
  'ResNet-50': '#D32F2F',
  'BERT': '#1565C0',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: value, duration: 600, useNativeDriver: false, delay: 200 }).start();
  }, [value]);
  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.border, borderRadius: 3, flex: 1 },
  fill: { height: 6, borderRadius: 3 },
});

function ModelRow({ result }: { result: AIModelResult }) {
  const icon = MODEL_ICONS[result.model] ?? 'analytics-outline';
  const color = MODEL_COLORS[result.model] ?? Colors.accent;
  return (
    <View style={modelStyles.row}>
      <View style={[modelStyles.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={modelStyles.info}>
        <View style={modelStyles.labelRow}>
          <Text style={modelStyles.modelName}>{result.model}</Text>
          <Text style={[modelStyles.pct, { color }]}>{result.confidence}%</Text>
        </View>
        <ConfidenceBar value={result.confidence} color={color} />
        <Text style={modelStyles.label}>{result.label}</Text>
      </View>
    </View>
  );
}

const modelStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  info: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  pct: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  label: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ScanResultScreen() {
  const { currentResult, clearResult } = useScanStore();
  const { loadRecommendations, selectProduct } = useProductsStore();
  const { save, remove, isSaved } = useSavedStore();

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(bgAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(bgAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      clearResult();
      router.back();
    });
  };

  const handleRecommendations = () => {
    if (!currentResult) return;
    selectProduct(currentResult.product);
    loadRecommendations(currentResult.product.id);
    router.push('/recommendations' as never);
  };

  const handleSave = () => {
    if (!currentResult) return;
    if (isSaved(currentResult.product.id)) {
      remove(currentResult.product.id);
    } else {
      save(currentResult.product);
    }
  };

  if (!currentResult) {
    return (
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      </View>
    );
  }

  const { product, confidence, authenticityStatus, aiAnalysis } = currentResult;
  const bestPrice = product.sellers[0] ? product.price * 0.85 : product.price;
  const saved = isSaved(product.id);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.overlay, { opacity: bgAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Detection badge */}
        <View style={styles.detectionRow}>
          <View style={styles.detectedBadge}>
            <Text style={styles.detectedText}>DETECTED · {formatConfidence(confidence)}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Product image + info */}
          <View style={styles.productRow}>
            <Image
              source={{ uri: product.imageUrl || `https://via.placeholder.com/100x100/${Colors.primary.slice(1)}/FFFFFF?text=${product.brand[0]}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.location}>{product.sellers[0]?.location ?? 'Accra'}</Text>
              <View style={styles.statusRow}>
                <AuthenticityBadge status={authenticityStatus} />
                {product.sellers.length > 1 && (
                  <TouchableOpacity style={styles.altChip} onPress={handleRecommendations}>
                    <Text style={styles.altChipText}>{product.sellers.length} alternatives</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Warning */}
          {authenticityStatus !== 'authentic' && (
            <View style={[styles.warningBox, authenticityStatus === 'counterfeit' && styles.dangerBox]}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={authenticityStatus === 'counterfeit' ? Colors.danger : Colors.warning}
              />
              <Text style={[styles.warningText, authenticityStatus === 'counterfeit' && styles.dangerText]}>
                {authenticityStatus === 'counterfeit'
                  ? 'This product may be counterfeit. Do not purchase.'
                  : 'Authentication is uncertain. Verify before purchasing.'}
              </Text>
            </View>
          )}

          {/* ── AI Analysis Breakdown ── */}
          {aiAnalysis && <AIBreakdown analysis={aiAnalysis} />}

          {/* Price comparison */}
          <View style={styles.priceCard}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Current price</Text>
              <Text style={styles.currentPrice}>{formatPrice(product.price, product.currency)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Best nearby</Text>
              <Text style={styles.bestPrice}>{formatPrice(bestPrice, product.currency)}</Text>
              <Text style={styles.savingsText}>Save {formatPrice(product.price - bestPrice)}</Text>
            </View>
          </View>

          {/* Recommendations CTA */}
          <TouchableOpacity style={styles.recoCta} onPress={handleRecommendations} activeOpacity={0.85}>
            <Text style={styles.recoCtaText}>See Recommendations</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── AI Breakdown panel ──────────────────────────────────────────────────────

function AIBreakdown({ analysis }: { analysis: AIAnalysisResult }) {
  return (
    <View style={aiStyles.card}>
      <View style={aiStyles.header}>
        <Ionicons name="analytics-outline" size={16} color={Colors.accent} />
        <Text style={aiStyles.title}>AI Analysis Breakdown</Text>
        <View style={aiStyles.overallBadge}>
          <Text style={aiStyles.overallText}>{analysis.overallConfidence}% overall</Text>
        </View>
      </View>
      <ModelRow result={analysis.recognition} />
      <ModelRow result={analysis.similarity} />
      <ModelRow result={analysis.authenticity} />
    </View>
  );
}

const aiStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  overallBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  overallText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.accent,
  },
});

// ─── Main styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    ...Shadows.lg,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  detectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  detectedBadge: { backgroundColor: Colors.accent + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill },
  detectedText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.accent, letterSpacing: 0.5 },
  saveBtn: { padding: Spacing.sm },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  productRow: { flexDirection: 'row', gap: Spacing.md },
  productImage: { width: 96, height: 96, borderRadius: Radii.md },
  productInfo: { flex: 1, gap: 4 },
  brand: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, lineHeight: 22 },
  location: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  altChip: { backgroundColor: Colors.primary + '15', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.pill },
  altChipText: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: Typography.weights.semibold },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.warning + '15', borderRadius: Radii.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  dangerBox: { backgroundColor: Colors.danger + '15', borderLeftColor: Colors.danger },
  warningText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.warning, lineHeight: 20 },
  dangerText: { color: Colors.danger },
  priceCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.card, padding: Spacing.lg },
  priceItem: { flex: 1, alignItems: 'center', gap: 2 },
  priceLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  currentPrice: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text },
  bestPrice: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  savingsText: { fontSize: Typography.sizes.xs, color: Colors.success, fontWeight: Typography.weights.medium },
  priceDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  recoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.md,
    ...Shadows.md,
  },
  recoCtaText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
});
