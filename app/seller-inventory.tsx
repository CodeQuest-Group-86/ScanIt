import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productService } from '@/services/products';
import type { InventoryItem } from '@/types';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { formatPrice } from '@/utils/format';

export default function SellerInventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getInventory().then(res => {
      if (res.success) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const toggleListed = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, listed: !item.listed } : item));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/scan')}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{items.length}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{items.filter(i => i.listed).length}</Text>
          <Text style={styles.statLabel}>Listed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{items.reduce((s, i) => s + i.stock, 0)}</Text>
          <Text style={styles.statLabel}>Total Stock</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No inventory yet"
          description="Add your first product to start listing."
          actionLabel="Add Product"
          onAction={() => {}}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <InventoryCard item={item} onToggle={() => toggleListed(item.id)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function InventoryCard({ item, onToggle }: { item: InventoryItem; onToggle: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.colorBox}>
        <Text style={styles.colorBoxText}>{item.name[0]}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.category} · {item.stock} in stock</Text>
        <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={item.listed}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
        <Text style={[styles.listedLabel, item.listed ? styles.listedActive : styles.listedInactive]}>
          {item.listed ? 'Live' : 'Draft'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.md, gap: Spacing.md, ...Shadows.sm },
  colorBox: { width: 52, height: 52, borderRadius: Radii.md, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  colorBoxText: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  cardMeta: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  cardPrice: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  cardRight: { alignItems: 'center', gap: 4 },
  listedLabel: { fontSize: 11, fontWeight: Typography.weights.semibold },
  listedActive: { color: Colors.success },
  listedInactive: { color: Colors.textSecondary },
});
