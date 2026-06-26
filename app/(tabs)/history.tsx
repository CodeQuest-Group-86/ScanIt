import { AuthenticityBadge } from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import type { ScanResult } from '@/types';
import { formatPrice, formatRelativeTime } from '@/utils/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenShell from '@/components/ui/ScreenShell';
import { useTabBarInset } from '@/hooks/useTabBarInset';

export default function HistoryScreen() {
  const tabBarInset = useTabBarInset();
  const { history, loadHistory, isAnalyzing } = useScanStore();
  const { selectProduct } = useProductsStore();
  const { save, remove, isSaved } = useSavedStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan History</Text>
          <Text style={styles.subtitle}>{history.length} scan{history.length !== 1 ? 's' : ''}</Text>
        </View>

        {isAnalyzing && (
          <View style={styles.analyzingBanner}>
            <ActivityIndicator size="small" color={Colors.white} />
            <Text style={styles.analyzingText}>Analyzing scan…</Text>
          </View>
        )}

        <FlatList
          style={styles.list}
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ScanCard
              scan={item}
              saved={isSaved(item.product.id)}
              onPress={() => {
                selectProduct(item.product);
                router.push('/product-detail');
              }}
              onSave={() => isSaved(item.product.id) ? remove(item.product.id) : save(item.product)}
            />
          )}
          contentContainerStyle={
            history.length === 0
              ? [styles.emptyContainer, { paddingBottom: tabBarInset }]
              : [styles.listContent, { paddingBottom: tabBarInset }]
          }
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="scan-outline"
              title="No scans yet"
              description="Scan a product to see its price, where to buy it, and whether it's authentic."
              actionLabel="Scan Now"
              onAction={() => router.push('/(tabs)/scan')}
            />
          }
        />
      </View>
    </ScreenShell>
  );
}

function ScanCard({
  scan, saved, onPress, onSave,
}: {
  scan: ScanResult;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const { product, authenticityStatus, confidence, scannedAt } = scan;
  const bestSeller = product.sellers?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Product image */}
      <Image
        source={{ uri: product.imageUrl || `https://via.placeholder.com/80x80/E76F2E/FFFFFF?text=${product.brand?.[0] ?? 'P'}` }}
        style={styles.image}
      />

      {/* Main content */}
      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          </View>
          <TouchableOpacity onPress={onSave} style={styles.saveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Price + authenticity */}
        <View style={styles.metaRow}>
          <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
          <AuthenticityBadge status={authenticityStatus} />
        </View>

        {/* Best seller hotline */}
        {bestSeller && (
          <View style={styles.sellerRow}>
            <Ionicons name="storefront-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.sellerName} numberOfLines={1}>{bestSeller.name}</Text>
            {bestSeller.location ? <Text style={styles.sellerLocation}>· {bestSeller.location}</Text> : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${bestSeller.phone}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="call-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://wa.me/${bestSeller.whatsapp?.replace('+', '')}`)}
              style={{ marginLeft: Spacing.sm }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="logo-whatsapp" size={16} color={Colors.success} />
            </TouchableOpacity>
          </View>
        )}

        {/* Seller count + time + confidence */}
        <View style={styles.footerRow}>
          {product.sellers?.length > 1 && (
            <Text style={styles.moreText}>{product.sellers.length - 1} more seller{product.sellers.length > 2 ? 's' : ''}</Text>
          )}
          <Text style={styles.confidence}>{confidence}% match</Text>
          <Text style={styles.time}>{formatRelativeTime(scannedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  subtitle: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  analyzingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  analyzingText: { color: Colors.white, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  listContent: { padding: Spacing.lg, gap: Spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  image: { width: 80, height: 80, borderRadius: Radii.md, backgroundColor: Colors.border },
  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  brand: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: Typography.weights.medium },
  productName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text, lineHeight: 20 },
  saveBtn: { paddingTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  price: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sellerName: { fontSize: Typography.sizes.sm, color: Colors.text, fontWeight: Typography.weights.medium, flexShrink: 1 },
  sellerLocation: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  moreText: { fontSize: Typography.sizes.xs, color: Colors.accent, fontWeight: Typography.weights.medium },
  confidence: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  time: { marginLeft: 'auto', fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});
