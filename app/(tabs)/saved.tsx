import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/ProductCard';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import { Colors, Spacing, Typography } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { savedProducts, remove } = useSavedStore();
  const { selectProduct } = useProductsStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1 },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text, padding: Spacing.lg, paddingBottom: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
});
