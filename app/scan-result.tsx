import { AuthenticityBadge } from '@/components/Badge';
import GlassCard from '@/components/GlassCard';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import type { Seller } from '@/types';
import { buildProductGoogleUrl } from '@/utils/links';
import { formatPrice } from '@/utils/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated, Dimensions, Image, Linking, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

async function openExternal(url: string) {
  const can = await Linking.canOpenURL(url);
  if (can) await Linking.openURL(url);
}

export default function ScanResultScreen() {
  const { currentResult, clearResult, offlineMode } = useScanStore();
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
    ]).start(() => { clearResult(); router.back(); });
  };

  if (!currentResult) {
    return (
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      </View>
    );
  }

  const { product, authenticityStatus, googleSearchUrl, duckDuckGoSearchUrl } = currentResult;
  const googleUrl = googleSearchUrl ?? buildProductGoogleUrl(product.name, product.brand);

  const sellerPrices = product.sellers.filter(s => s.price && s.price > 0).map(s => s.price!);
  const currentPrice = product.price > 0 ? product.price : (sellerPrices[0] ?? 0);
  const bestPrice = sellerPrices.length > 0 ? Math.min(...sellerPrices) : currentPrice;
  const savings = currentPrice - bestPrice;
  const saved = isSaved(product.id);

  const handleRecommendations = () => {
    selectProduct(product);
    loadRecommendations(product.id);
    router.push('/recommendations');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.overlay, { opacity: bgAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Liquid glass background for the sheet */}
        {Platform.OS === 'ios' && (
          <BlurView intensity={60} tint="systemChromeMaterial" style={[StyleSheet.absoluteFill, styles.sheetBlur]} />
        )}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => saved ? remove(product.id) : save(product)} style={styles.saveBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Product image + identity */}
          <View style={styles.productRow}>
            <Image
              source={{ uri: product.imageUrl || currentResult.imageUri || `https://placehold.co/100x100/E76F2E/FFFFFF/png?text=${encodeURIComponent(product.name[0])}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.category}>{product.category}</Text>
              <View style={styles.statusRow}>
                <AuthenticityBadge status={authenticityStatus} />
                {product.verified && (
                  <View style={styles.verifiedChip}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Description */}
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {/* Search externally — opens device browser outside the app */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={[styles.searchBtn, styles.googleBtn]}
              onPress={() => openExternal(googleUrl)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color={Colors.white} />
              <Text style={styles.searchBtnText}>Search on Google</Text>
              <Ionicons name="open-outline" size={14} color={Colors.white + 'CC'} />
            </TouchableOpacity>
            {duckDuckGoSearchUrl ? (
              <TouchableOpacity
                style={[styles.searchBtn, styles.ddgBtn]}
                onPress={() => openExternal(duckDuckGoSearchUrl)}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={18} color={Colors.white} />
                <Text style={styles.searchBtnText}>DuckDuckGo</Text>
                <Ionicons name="open-outline" size={14} color={Colors.white + 'CC'} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Offline notice */}
          {offlineMode && (
            <View style={styles.offlineBox}>
              <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
              <Text style={styles.offlineText}>
                Identified with Gemini Vision · Sellers from DuckDuckGo search. Tap any store to open Google in your browser.
              </Text>
            </View>
          )}

          {/* Authenticity warning */}
          {authenticityStatus !== 'authentic' && (
            <View style={[styles.warningBox, authenticityStatus === 'counterfeit' && styles.dangerBox]}>
              <Ionicons name="warning-outline" size={18} color={authenticityStatus === 'counterfeit' ? Colors.danger : Colors.warning} />
              <Text style={[styles.warningText, authenticityStatus === 'counterfeit' && styles.dangerText]}>
                {authenticityStatus === 'counterfeit'
                  ? 'This product may be counterfeit. Do not purchase.'
                  : 'Authenticity uncertain. Verify before buying.'}
              </Text>
            </View>
          )}

          {/* Price comparison */}
          {(currentPrice > 0 || bestPrice > 0) && (
            <GlassCard padded={false} intensity={40} style={styles.priceCard}>
              <View style={styles.priceCardInner}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Current Price</Text>
                  <Text style={styles.currentPrice}>{formatPrice(currentPrice, product.currency)}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Best Nearby</Text>
                  <Text style={styles.bestPrice}>{formatPrice(bestPrice, product.currency)}</Text>
                  {savings > 0 && <Text style={styles.savingsText}>Save {formatPrice(savings)}</Text>}
                </View>
              </View>
            </GlassCard>
          )}

          {/* Specs */}
          {Object.keys(product.specs).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <GlassCard padded={false} intensity={30} style={styles.specsCard}>
                {Object.entries(product.specs).map(([key, val], i, arr) => (
                  <View key={key} style={[styles.specRow, i < arr.length - 1 && styles.specBorder]}>
                    <Text style={styles.specKey}>{key}</Text>
                    <Text style={styles.specVal}>{val}</Text>
                  </View>
                ))}
              </GlassCard>
            </View>
          )}

          {/* Where to buy — sellers */}
          {product.sellers.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where to Buy</Text>
              <Text style={styles.sectionHint}>Opens Google Search in your browser</Text>
              {product.sellers.map(s => <SellerRow key={s.id} seller={s} currency={product.currency} />)}
            </View>
          ) : !offlineMode && (
            <View style={styles.noSellersBox}>
              <Ionicons name="storefront-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.noSellersText}>No sellers listed yet for this product.</Text>
            </View>
          )}

          {/* Recommendations CTA */}
          {product.sellers.length > 1 && (
            <TouchableOpacity style={styles.recoCta} onPress={handleRecommendations} activeOpacity={0.85}>
              <Text style={styles.recoCtaText}>Compare All {product.sellers.length} Sellers</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function SellerRow({ seller, currency }: { seller: Seller; currency: string }) {
  const googleUrl = seller.url;
  const directUrl = seller.directUrl;

  return (
    <TouchableOpacity
      style={sellerStyles.row}
      onPress={() => googleUrl && openExternal(googleUrl)}
      activeOpacity={0.75}
      disabled={!googleUrl}
    >
      <View style={sellerStyles.left}>
        <View style={sellerStyles.nameRow}>
          <Text style={sellerStyles.name}>{seller.name}</Text>
          {seller.verified && <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />}
        </View>
        <Text style={sellerStyles.location}>{seller.location}{seller.distance && seller.distance !== 'N/A' ? ` · ${seller.distance}` : ''}</Text>
        {seller.price && seller.price > 0 && (
          <Text style={sellerStyles.price}>{formatPrice(seller.price, currency)}</Text>
        )}
        {seller.rating > 0 && (
          <View style={sellerStyles.ratingRow}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={sellerStyles.rating}>{seller.rating.toFixed(1)} ({seller.reviewCount})</Text>
          </View>
        )}
        <Text style={sellerStyles.googleHint}>Search on Google →</Text>
      </View>
      <View style={sellerStyles.actions}>
        {googleUrl ? (
          <TouchableOpacity style={[sellerStyles.btn, sellerStyles.googleBtn]} onPress={() => openExternal(googleUrl)}>
            <Ionicons name="logo-google" size={16} color={Colors.white} />
          </TouchableOpacity>
        ) : null}
        {directUrl ? (
          <TouchableOpacity style={[sellerStyles.btn, sellerStyles.visitBtn]} onPress={() => openExternal(directUrl)}>
            <Ionicons name="open-outline" size={16} color={Colors.white} />
          </TouchableOpacity>
        ) : null}
        {seller.phone && (
          <TouchableOpacity style={sellerStyles.btn} onPress={() => openExternal(`tel:${seller.phone}`)}>
            <Ionicons name="call" size={16} color={Colors.white} />
          </TouchableOpacity>
        )}
        {seller.whatsapp && (
          <TouchableOpacity style={[sellerStyles.btn, sellerStyles.waBtn]} onPress={() => openExternal(`https://wa.me/${seller.whatsapp.replace('+', '')}`)}>
            <Ionicons name="logo-whatsapp" size={16} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const sellerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  left: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  location: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  price: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  googleHint: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: Typography.weights.medium, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  waBtn: { backgroundColor: '#25D366' },
  visitBtn: { backgroundColor: Colors.accent },
  googleBtn: { backgroundColor: '#4285F4' },
});

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(250,245,238,0.85)' : Colors.white,
    borderTopLeftRadius: Radii.xxl, borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  sheetBlur: {
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  detectedBadge: { flex: 1, backgroundColor: Colors.accent + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, alignSelf: 'flex-start' },
  detectedText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.accent, letterSpacing: 0.5 },
  saveBtn: { padding: Spacing.sm },
  closeBtn: { padding: Spacing.sm },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  productRow: { flexDirection: 'row', gap: Spacing.md },
  productImage: { width: 96, height: 96, borderRadius: Radii.md, backgroundColor: Colors.border },
  productInfo: { flex: 1, gap: 4 },
  brand: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, lineHeight: 22 },
  category: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  description: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm },
  searchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radii.pill, ...Shadows.sm },
  googleBtn: { backgroundColor: '#4285F4' },
  ddgBtn: { backgroundColor: '#DE5833' },
  searchBtnText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.white },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.success + '15', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radii.pill },
  verifiedText: { fontSize: Typography.sizes.xs, color: Colors.success, fontWeight: Typography.weights.semibold },
  offlineBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.border, borderRadius: Radii.md, padding: Spacing.md },
  offlineText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 18 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.warning + '15', borderRadius: Radii.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  dangerBox: { backgroundColor: Colors.danger + '15', borderLeftColor: Colors.danger },
  warningText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.warning, lineHeight: 20 },
  dangerText: { color: Colors.danger },
  priceCard: { borderRadius: Radii.card },
  priceCardInner: { flexDirection: 'row', padding: Spacing.lg },
  priceItem: { flex: 1, alignItems: 'center', gap: 2 },
  priceLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  currentPrice: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text },
  bestPrice: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  savingsText: { fontSize: Typography.sizes.xs, color: Colors.success, fontWeight: Typography.weights.medium },
  priceDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  section: { gap: 0 },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.xs },
  sectionHint: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  specsCard: { borderRadius: Radii.md, overflow: 'hidden' },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.md },
  specBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  specKey: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, flex: 1 },
  specVal: { fontSize: Typography.sizes.sm, color: Colors.text, fontWeight: Typography.weights.medium, flex: 1, textAlign: 'right' },
  noSellersBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.md },
  noSellersText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  recoCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingVertical: Spacing.md, ...Shadows.md },
  recoCtaText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
});
