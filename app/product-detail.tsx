import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { useScanStore } from '@/stores/scan';
import { AuthenticityBadge } from '@/components/Badge';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatPrice } from '@/utils/format';
import type { Seller } from '@/types';

export default function ProductDetailScreen() {
  const { selectedProduct } = useProductsStore();
  const { save, remove, isSaved } = useSavedStore();
  const isPremium = useScanStore(s => s.isPremium);

  if (!selectedProduct) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textSecondary }}>Product not found</Text>
      </SafeAreaView>
    );
  }

  const saved = isSaved(selectedProduct.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{selectedProduct.name}</Text>
        <TouchableOpacity
          onPress={() => saved ? remove(selectedProduct.id) : save(selectedProduct)}
          style={styles.saveBtn}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <Image
          source={{ uri: selectedProduct.imageUrl || `https://via.placeholder.com/400x300/${Colors.primary.slice(1)}/FFFFFF?text=${selectedProduct.brand}` }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{selectedProduct.brand}</Text>
              <Text style={styles.name}>{selectedProduct.name}</Text>
            </View>
            {isPremium ? (
              <AuthenticityBadge status={selectedProduct.authenticity} />
            ) : (
              <TouchableOpacity style={styles.lockedBadge} onPress={() => router.push('/subscribe')} activeOpacity={0.8}>
                <Ionicons name="lock-closed" size={11} color={Colors.textSecondary} />
                <Text style={styles.lockedBadgeText}>Authenticity</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(selectedProduct.price, selectedProduct.currency)}</Text>
            <Text style={styles.sellerCount}>from {selectedProduct.sellers.length} {selectedProduct.sellers.length === 1 ? 'seller' : 'sellers'}</Text>
          </View>

          <Text style={styles.description}>{selectedProduct.description}</Text>
        </View>

        {/* Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsCard}>
            {Object.entries(selectedProduct.specs).map(([key, val], i, arr) => (
              <View key={key} style={[styles.specRow, i < arr.length - 1 && styles.specBorder]}>
                <Text style={styles.specKey}>{key}</Text>
                <Text style={styles.specVal}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sellers */}
        {selectedProduct.sellers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sellers & Hotlines</Text>
            {selectedProduct.sellers.map(seller => (
              <SellerCard key={seller.id} seller={seller} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  const hasPhone = !!seller.phone;
  const hasWhatsapp = !!seller.whatsapp;

  return (
    <View style={styles.sellerCard}>
      <View style={styles.sellerInfo}>
        <View style={styles.sellerNameRow}>
          <Text style={styles.sellerName}>{seller.name}</Text>
          {seller.verified && (
            <View style={styles.verifiedChip}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.accent} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.sellerMeta}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.sellerLocation}>{seller.location} · {seller.distance}</Text>
        </View>
        {seller.reviewCount > 0 && (
          <View style={styles.sellerMeta}>
            <Ionicons name="star" size={13} color={Colors.warning} />
            <Text style={styles.sellerRating}>{seller.rating} ({seller.reviewCount} reviews)</Text>
          </View>
        )}
      </View>
      <View style={styles.contactBtns}>
        <TouchableOpacity
          style={[styles.contactBtn, !hasPhone && styles.contactBtnDisabled]}
          onPress={() => hasPhone && Linking.openURL(`tel:${seller.phone}`)}
          disabled={!hasPhone}>
          <Ionicons name="call-outline" size={18} color={hasPhone ? Colors.primary : Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactBtn, !hasWhatsapp && styles.contactBtnDisabled]}
          onPress={() => hasWhatsapp && Linking.openURL(`https://wa.me/${seller.whatsapp.replace('+', '')}`)}
          disabled={!hasWhatsapp}>
          <Ionicons name="logo-whatsapp" size={18} color={hasWhatsapp ? Colors.success : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  saveBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing.xxxl },
  image: { width: '100%', height: 260, backgroundColor: Colors.border },
  infoCard: { backgroundColor: Colors.white, margin: Spacing.lg, borderRadius: Radii.card, padding: Spacing.lg, gap: Spacing.md, ...Shadows.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  brand: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  price: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  sellerCount: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  description: { fontSize: Typography.sizes.md, color: Colors.textSecondary, lineHeight: 22 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.md },
  specsCard: { backgroundColor: Colors.white, borderRadius: Radii.card, overflow: 'hidden', ...Shadows.sm },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  specBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface },
  specKey: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  specVal: { fontSize: Typography.sizes.sm, color: Colors.text, fontWeight: Typography.weights.semibold },
  sellerCard: { backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', ...Shadows.sm },
  sellerInfo: { flex: 1, gap: 3 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sellerName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.accent + '15', paddingHorizontal: Spacing.xs + 2, paddingVertical: 2, borderRadius: Radii.pill },
  verifiedText: { fontSize: 11, color: Colors.accent, fontWeight: Typography.weights.semibold },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerLocation: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  sellerRating: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  contactBtns: { flexDirection: 'row', gap: Spacing.sm },
  contactBtn: { width: 40, height: 40, borderRadius: Radii.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  contactBtnDisabled: { opacity: 0.4 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.pill },
  lockedBadgeText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary },
});
