import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProductsStore } from '@/stores/products';
import { useSavedStore } from '@/stores/saved';
import ProductCard from '@/components/ProductCard';
import Chip from '@/components/Chip';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';

const CATEGORIES = ['All', 'Drinks', 'Snacks', 'Care'];
const RECENT_SEARCHES = ['Tropical Juice', 'Cocoa Spread', 'Mineral Water'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { search, searchResults, selectedCategory, setCategory, isLoading, selectProduct } = useProductsStore();
  const { save, remove, isSaved } = useSavedStore();

  const hasQuery = query.trim().length > 0;

  const handleSearch = () => {
    if (query.trim()) search(query.trim());
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    search(term);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
            <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={Colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => {}} style={styles.micBtn}>
              <Ionicons name="mic-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map(cat => (
            <Chip
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </ScrollView>

        {/* Results or initial state */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : hasQuery && searchResults.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No results found"
            description={`We couldn't find any products matching "${query}"`}
            actionLabel="Clear Search"
            onAction={() => setQuery('')}
          />
        ) : hasQuery ? (
          <FlatList
            data={searchResults}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => {
                  selectProduct(item);
                  router.push('/product-detail' as never);
                }}
                onSave={() => isSaved(item.id) ? remove(item.id) : save(item)}
                isSaved={isSaved(item.id)}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.initialState} showsVerticalScrollIndicator={false}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            {RECENT_SEARCHES.map(term => (
              <TouchableOpacity
                key={term}
                style={styles.recentItem}
                onPress={() => handleRecentSearch(term)}>
                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.recentText}>{term}</Text>
                <Ionicons name="arrow-forward-outline" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1 },
  searchRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchBarFocused: { borderColor: Colors.primary },
  searchInput: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text, paddingVertical: 4 },
  micBtn: { padding: 2 },
  chips: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initialState: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  recentTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.md },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  recentText: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text },
});
