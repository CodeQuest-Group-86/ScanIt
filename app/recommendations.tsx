import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProductsStore } from '@/stores/products';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatPrice, formatDiscount } from '@/utils/format';
import type { Recommendation } from '@/types';

type SortKey = 'price' | 'distance';

export default function RecommendationsScreen() {
  const { recommendations, selectedProduct, loadRecommendations } = useProductsStore();
  const [sort, setSort] = React.useState<SortKey>('price');
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (selectedProduct && recommendations.length === 0) {
      setLoading(true);
      loadRecommendations(selectedProduct.id).finally(() => setLoading(false));
    }
  }, [selectedProduct]);

  const sorted = [...recommendations].sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    return parseFloat(a.seller.distance) - parseFloat(b.seller.distance);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recommendations</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scanned item info */}
      {selectedProduct && (
        <View style={styles.scannedCard}>
          <View style={styles.scannedLeft}>
            <Text style={styles.scannedLabel}>Scanned</Text>
            <Text style={styles.scannedName} numberOfLines={1}>{selectedProduct.name}</Text>
          </View>
          <Text style={styles.scannedPrice}>{formatPrice(selectedProduct.price, selectedProduct.currency)}</Text>
        </View>
      )}

      {/* Sort chips */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(['price', 'distance'] as SortKey[]).map(k => (
          <TouchableOpacity
            key={k}
            style={[styles.sortChip, sort === k && styles.sortChipActive]}
            onPress={() => setSort(k)}>
            <Text style={[styles.sortChipText, sort === k && styles.sortChipTextActive]}>
              {k === 'price' ? 'Price' : 'Proximity'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subTitle}>Cheaper near you</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState icon="location-outline" title="No nearby alternatives" description="We couldn't find cheaper sellers in your area right now." />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={r => r.id}
          renderItem={({ item }) => <RecommendationCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function RecommendationCard({ item }: { item: Recommendation }) {
  return (
    <View style={styles.card}>
      <View style={[styles.thumbnail, { backgroundColor: item.thumbnailColor }]}>
        <Text style={styles.thumbnailLetter}>{item.product.brand[0]}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.product.name}</Text>
        <View style={styles.sellerRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.sellerText}>{item.seller.name} · {item.seller.distance}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatPrice(item.price, item.product.currency)}</Text>
      </View>
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>{formatDiscount(item.discountPercent)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  scannedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  scannedLeft: { flex: 1 },
  scannedLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  scannedName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  scannedPrice: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textSecondary, textDecorationLine: 'line-through' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sortLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  sortChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  sortChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  sortChipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  sortChipTextActive: { color: Colors.white },
  subTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.md, gap: Spacing.md, ...Shadows.sm },
  thumbnail: { width: 56, height: 56, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  thumbnailLetter: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.white },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sellerText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  cardPrice: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  discountBadge: { backgroundColor: Colors.success + '20', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.pill },
  discountText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.success },
});
