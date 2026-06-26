import { AuthenticityBadge } from '@/components/Badge';
import GlassCard from '@/components/GlassCard';
import CoachMarkOverlay from '@/components/ui/CoachMarkOverlay';
import Glass3DButton from '@/components/ui/Glass3DButton';
import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import LottieAnim from '@/components/ui/LottieAnim';
import TabScrollView from '@/components/ui/TabScrollView';
import { HOME_COACH_STEPS, useCoachMarks } from '@/hooks/useCoachMarks';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { ScanResult } from '@/types';
import { formatPrice, formatRelativeTime } from '@/utils/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { history, loadHistory } = useScanStore();
  const { unreadNotificationsCount, loadNotifications } = useProductsStore();
  const { save, remove, isSaved } = useSavedStore();
  const coach = useCoachMarks(HOME_COACH_STEPS);

  useEffect(() => {
    loadNotifications();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const authenticScans = history.filter(s => s.authenticityStatus === 'authentic').length;
  const suspiciousScans = history.filter(s => s.authenticityStatus !== 'authentic').length;

  return (
    <View style={styles.root}>
      <LiquidGlassBackground variant="warm" blur />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <TabScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color={Colors.text} />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Glass3DButton onPress={() => router.push('/(tabs)/scan')} style={styles.scanCta}>
            <View style={styles.scanCtaText}>
              <Text style={styles.scanCtaTitle}>Scan a Product</Text>
              <Text style={styles.scanCtaSubtitle}>Point camera · prices, sellers & authenticity</Text>
            </View>
            <View style={styles.scanIconWrap}>
              <Ionicons name="scan-outline" size={32} color={Colors.white} />
            </View>
          </Glass3DButton>

          {history.length > 0 && (
            <GlassCard intensity={48} tint="light" padded={false} style={styles.statsRow}>
              <View style={styles.statsInner}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{history.length}</Text>
                  <Text style={styles.statLabel}>Total scans</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: Colors.success }]}>{authenticScans}</Text>
                  <Text style={styles.statLabel}>Authentic</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: Colors.warning }]}>{suspiciousScans}</Text>
                  <Text style={styles.statLabel}>Suspicious</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {history.slice(0, 3).map(scan => (
                <RecentScanCard
                  key={scan.id}
                  scan={scan}
                  saved={isSaved(scan.product.id)}
                  onPress={() => {
                    useProductsStore.getState().selectProduct(scan.product);
                    router.push('/product-detail');
                  }}
                  onSave={() => (isSaved(scan.product.id) ? remove(scan.product.id) : save(scan.product))}
                />
              ))}
            </View>
          )}

          {history.length === 0 && (
            <GlassCard intensity={50} style={styles.emptyWrap}>
              <LottieAnim source="scan" size={140} />
              <Text style={styles.emptyTitle}>Ready to scan?</Text>
              <Text style={styles.emptyBody}>
                Point your camera at any product to see what it is, where to buy it, the price, and whether it&apos;s genuine.
              </Text>
            </GlassCard>
          )}
        </TabScrollView>
      </SafeAreaView>

      <CoachMarkOverlay
        visible={coach.isVisible}
        step={coach.activeStep}
        stepNumber={coach.stepNumber}
        totalSteps={coach.totalSteps}
        onNext={coach.dismiss}
        onSkip={coach.skipAll}
      />
    </View>
  );
}

function RecentScanCard({
  scan,
  saved,
  onPress,
  onSave,
}: {
  scan: ScanResult;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const { product, authenticityStatus, scannedAt } = scan;
  const bestSeller = product.sellers?.[0];

  return (
    <GlassCard intensity={42} tint="light" padded={false} style={styles.scanCard}>
      <TouchableOpacity style={styles.scanCardInner} onPress={onPress} activeOpacity={0.8}>
        <Image
          source={{
            uri:
              product.imageUrl ||
              `https://via.placeholder.com/64x64/E76F2E/FFFFFF?text=${product.brand?.[0] ?? 'P'}`,
          }}
          style={styles.scanThumb}
        />
        <View style={styles.scanInfo}>
          <View style={styles.scanTop}>
            <Text style={styles.scanName} numberOfLines={1}>
              {product.name}
            </Text>
            <TouchableOpacity onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={saved ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.scanMeta}>
            <Text style={styles.scanPrice}>{formatPrice(product.price, product.currency)}</Text>
            <AuthenticityBadge status={authenticityStatus} />
          </View>
          {bestSeller && (
            <View style={styles.scanSeller}>
              <Ionicons name="storefront-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.scanSellerName} numberOfLines={1}>
                {bestSeller.name}
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${bestSeller.phone}`)} style={styles.callBtn}>
                <Ionicons name="call-outline" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.scanTime}>{formatRelativeTime(scannedAt)}</Text>
        </View>
      </TouchableOpacity>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: Typography.sizes.md, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  name: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  notifBtn: { position: 'relative', padding: Spacing.sm },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  scanCta: { marginBottom: Spacing.xl },
  scanCtaText: { flex: 1 },
  scanCtaTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.white, marginBottom: 2 },
  scanCtaSubtitle: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  scanIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statsRow: { marginBottom: Spacing.xl },
  statsInner: { flexDirection: 'row', padding: Spacing.lg },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  seeAll: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  emptyWrap: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyBody: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  scanCard: { marginBottom: Spacing.md },
  scanCardInner: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md },
  scanThumb: { width: 64, height: 64, borderRadius: Radii.md, backgroundColor: Colors.border },
  scanInfo: { flex: 1, gap: 4 },
  scanTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  scanName: { flex: 1, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text },
  scanMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scanPrice: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  scanSeller: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanSellerName: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  callBtn: { padding: 2 },
  scanTime: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});
