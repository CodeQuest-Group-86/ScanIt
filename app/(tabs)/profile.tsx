import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { productService } from '@/services/products';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { getInitials, formatPrice } from '@/utils/format';
import type { InventoryItem } from '@/types';

interface RowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { unreadNotificationsCount } = useProductsStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    setLoadingInventory(true);
    productService.getInventory().then(res => {
      if (res.success) setInventory(res.data);
      setLoadingInventory(false);
    });
  }, [user]);

  if (!user) return null;

  const sellerTotalProducts = inventory.length;
  const sellerActiveListings = inventory.filter(i => i.listed).length;
  const sellerTotalStock = inventory.reduce((s, i) => s + i.stock, 0);

  const consumerRows: RowItem[] = [
    { icon: 'time-outline', label: 'Scan history', onPress: () => router.push('/scan-history' as never) },
    { icon: 'bookmark-outline', label: 'Saved products', onPress: () => router.push('/(tabs)/saved') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/notifications' as never), badge: unreadNotificationsCount },
    { icon: 'help-circle-outline', label: 'Help & support', onPress: () => router.push('/help' as never) },
  ];

  const sellerRows: RowItem[] = [
    { icon: 'cube-outline', label: 'Manage inventory', onPress: () => router.push('/seller-inventory' as never) },
    { icon: 'list-outline', label: 'My listings', onPress: () => router.push('/seller-inventory' as never) },
    { icon: 'add-circle-outline', label: 'Add product', onPress: () => router.push('/(tabs)/scan') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings' as never)} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{getInitials(user.name)}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user.role === 'seller' ? 'Seller' : 'Consumer'}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile' as never)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

         {/* Stats */}
        {user.role === 'seller' ? (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingInventory ? '...' : sellerTotalProducts}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingInventory ? '...' : sellerActiveListings}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingInventory ? '...' : sellerTotalStock}</Text>
              <Text style={styles.statLabel}>In Stock</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.scansCount}</Text>
              <Text style={styles.statLabel}>Scans</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.savedCount}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPrice(user.totalSaved)}</Text>
              <Text style={styles.statLabel}>Total saved</Text>
            </View>
          </View>
        )}

        {/* Seller rows */}
        {user.role === 'seller' && (
          <View style={[styles.card, styles.section]}>
            <Text style={styles.sectionLabel}>Seller Tools</Text>
            {sellerRows.map((row, i) => (
              <RowButton key={row.label} item={row} last={i === sellerRows.length - 1} />
            ))}
          </View>
        )}

        {/* Main rows */}
        <View style={[styles.card, styles.section]}>
          {consumerRows.map((row, i) => (
            <RowButton key={row.label} item={row} last={i === consumerRows.length - 1} />
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function RowButton({ item, last }: { item: RowItem; last: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={item.onPress}
      activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={item.icon} size={20} color={item.danger ? Colors.danger : Colors.primary} />
      </View>
      <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>{item.label}</Text>
      {item.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  pageTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  settingsBtn: { padding: Spacing.sm },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  initials: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.white },
  userName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.text },
  userEmail: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  rolePill: { backgroundColor: Colors.accent + '20', paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radii.pill },
  roleText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.semibold },
  editBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radii.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xs + 2, marginTop: Spacing.xs },
  editBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  statDivider: { width: 1, backgroundColor: Colors.border, height: '100%' },
  section: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radii.card, overflow: 'hidden', ...Shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface },
  rowIcon: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text, fontWeight: Typography.weights.medium },
  rowLabelDanger: { color: Colors.danger },
  badge: { backgroundColor: Colors.danger, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  signOutText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.danger },
});
