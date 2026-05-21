import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProductsStore } from '@/stores/products';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatRelativeTime } from '@/utils/format';
import type { Notification } from '@/types';

const NOTIF_ICONS: Record<Notification['type'], keyof typeof Ionicons.glyphMap> = {
  price_alert: 'trending-down-outline',
  new_seller: 'storefront-outline',
  system: 'information-circle-outline',
};

const NOTIF_COLORS: Record<Notification['type'], string> = {
  price_alert: Colors.success,
  new_seller: Colors.accent,
  system: Colors.primary,
};

export default function NotificationsScreen() {
  const { notifications, loadNotifications } = useProductsStore();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    setLoading(true);
    loadNotifications().finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications"
          description="You're all caught up! Price alerts and updates will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={({ item }) => <NotifCard notif={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function NotifCard({ notif }: { notif: Notification }) {
  const color = NOTIF_COLORS[notif.type];
  const icon = NOTIF_ICONS[notif.type];
  return (
    <View style={[styles.card, !notif.read && styles.cardUnread]}>
      {!notif.read && <View style={styles.unreadDot} />}
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(notif.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.md, gap: Spacing.md, ...Shadows.sm, position: 'relative' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  unreadDot: { position: 'absolute', top: Spacing.md, right: Spacing.md, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  iconWrap: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  info: { flex: 1, gap: 3 },
  notifTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  notifBody: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  notifTime: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
});
