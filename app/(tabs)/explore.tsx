import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useScanStore } from '@/stores/scan';
import { useSavedStore } from '@/stores/saved';
import ProductCard from '@/components/ProductCard';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatPrice, formatDiscount } from '@/utils/format';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { history } = useScanStore();
  const { savedProducts, save, remove, isSaved } = useSavedStore();
  const { priceAlerts, loadPriceAlerts, unreadNotificationsCount, loadNotifications } = useProductsStore();

  useEffect(() => {
    loadPriceAlerts();
    loadNotifications();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications' as never)}
            style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Scan CTA */}
        <TouchableOpacity
          style={styles.scanCta}
          onPress={() => router.push('/(tabs)/scan')}
          activeOpacity={0.88}>
          <View>
            <Text style={styles.scanCtaTitle}>Scan a Product</Text>
            <Text style={styles.scanCtaSubtitle}>Point camera at any item</Text>
          </View>
          <View style={styles.scanIconWrap}>
            <Ionicons name="scan-outline" size={32} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Price Drop Alerts */}
        {priceAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Drop Alerts</Text>
            {priceAlerts.map(alert => (
              <Card key={alert.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <View style={styles.alertLeft}>
                    <Ionicons name="trending-down" size={20} color={Colors.success} />
                    <View style={styles.alertText}>
                      <Text style={styles.alertProduct} numberOfLines={1}>{alert.productName}</Text>
                      <Text style={styles.alertPrices}>
                        <Text style={styles.oldPrice}>{formatPrice(alert.oldPrice)}</Text>
                        {'  '}
                        <Text style={styles.newPrice}>{formatPrice(alert.newPrice)}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dropBadge}>
                    <Text style={styles.dropText}>{formatDiscount(alert.dropPercent)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Scans */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              <TouchableOpacity onPress={() => router.push('/scan-history' as never)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {history.slice(0, 2).map(scan => (
              <ProductCard
                key={scan.id}
                product={scan.product}
                onPress={() => {
                  useProductsStore.getState().selectProduct(scan.product);
                  router.push('/product-detail' as never);
                }}
                onSave={() => isSaved(scan.product.id) ? remove(scan.product.id) : save(scan.product)}
                isSaved={isSaved(scan.product.id)}
              />
            ))}
          </View>
        )}

        {/* Saved highlights */}
        {savedProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Products</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/saved')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {savedProducts.slice(0, 2).map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onPress={() => {
                  useProductsStore.getState().selectProduct(p);
                  router.push('/product-detail' as never);
                }}
                onSave={() => remove(p.id)}
                isSaved
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {history.length === 0 && savedProducts.length === 0 && (
          <View style={styles.emptySection}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="scan-outline" size={48} color={Colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Ready to scan?</Text>
            <Text style={styles.emptyBody}>
              Scan your first product to see price comparisons, authenticity checks, and more.
            </Text>
            <Button label="Scan Now" onPress={() => router.push('/(tabs)/scan')} style={styles.emptyBtn} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  greeting: { fontSize: Typography.sizes.md, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  name: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  notifBtn: { position: 'relative', padding: Spacing.sm },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  scanCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  scanCtaTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.white, marginBottom: 2 },
  scanCtaSubtitle: { fontSize: Typography.sizes.sm, color: Colors.white + 'CC' },
  scanIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white + '20', alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.md },
  seeAll: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  alertCard: { marginBottom: Spacing.sm },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  alertText: { flex: 1 },
  alertProduct: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  alertPrices: { fontSize: Typography.sizes.sm, marginTop: 2 },
  oldPrice: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  newPrice: { color: Colors.primary, fontWeight: Typography.weights.bold },
  dropBadge: { backgroundColor: Colors.success + '20', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.pill },
  dropText: { color: Colors.success, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  emptySection: { alignItems: 'center', paddingVertical: Spacing.section, gap: Spacing.md },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyBody: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: Spacing.sm },
});
