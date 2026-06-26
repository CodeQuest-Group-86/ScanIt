import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/ProductCard';
import ScreenShell from '@/components/ui/ScreenShell';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { Colors, Spacing, Typography } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function SavedScreen() {
  const tabBarInset = useTabBarInset();
  const { savedProducts, remove } = useSavedStore();
  const { selectProduct } = useProductsStore();

  return (
    <ScreenShell>
      <View style={styles.container}>
        <Text style={styles.title}>Saved Products</Text>
        {savedProducts.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="Nothing saved yet"
            description="Save products to track their prices and find better deals nearby."
            actionLabel="Start Scanning"
            onAction={() => router.push('/(tabs)/scan')}
          />
        ) : (
          <FlatList
            style={styles.list}
            data={savedProducts}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => {
                  selectProduct(item);
                  router.push('/product-detail');
                }}
                onSave={() => remove(item.id)}
                isSaved
              />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  listContent: { paddingHorizontal: Spacing.lg, flexGrow: 1 },
});
