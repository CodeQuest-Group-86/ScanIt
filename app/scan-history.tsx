import { AuthenticityBadge } from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import type { ScanResult } from '@/types';
import { formatPrice, formatRelativeTime } from '@/utils/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScanHistoryScreen() {
  const { history, loadHistory } = useScanStore();
  const { user } = useAuthStore();
  const { selectProduct } = useProductsStore();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (user && history.length === 0) {
      setLoading(true);
      loadHistory(user.id).finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No scans yet"
          description="Your scan history will appear here after you scan products."
          actionLabel="Scan Now"
          onAction={() => router.push('/(tabs)/scan')}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <HistoryCard
              scan={item}
              onPress={() => {
                selectProduct(item.product);
                router.push('/product-detail');
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function HistoryCard({ scan, onPress }: { scan: ScanResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Ionicons name="scan-outline" size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.productName} numberOfLines={1}>{scan.product.name}</Text>
        <Text style={styles.brand}>{scan.product.brand}</Text>
        <View style={styles.row}>
          <AuthenticityBadge status={scan.authenticityStatus} />
          <Text style={styles.time}>{formatRelativeTime(scan.scannedAt)}</Text>
        </View>
      </View>
      <Text style={styles.price}>{formatPrice(scan.product.price, scan.product.currency)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.md, gap: Spacing.md, ...Shadows.sm },
  iconWrap: { width: 48, height: 48, borderRadius: Radii.md, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  productName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  brand: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  time: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  price: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
});
