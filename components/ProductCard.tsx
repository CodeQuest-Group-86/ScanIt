import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Product } from '@/types';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import { AuthenticityBadge } from './Badge';
import { formatPrice } from '@/utils/format';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  compact?: boolean;
}

export default function ProductCard({ product, onPress, onSave, isSaved = false, compact = false }: ProductCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, Shadows.md, compact && styles.compact]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: product.imageUrl || `https://via.placeholder.com/100x100/${Colors.primary.slice(1)}/FFFFFF?text=${product.brand[0]}` }}
          style={styles.image}
          resizeMode="cover"
        />
        {product.verified && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
          <AuthenticityBadge status={product.authenticity} />
        </View>
        {!compact && product.sellers.length > 0 && (
          <Text style={styles.sellers}>
            {product.sellers.length} {product.sellers.length === 1 ? 'seller' : 'sellers'}
          </Text>
        )}
      </View>
      {onSave && (
        <TouchableOpacity onPress={onSave} style={styles.save} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? Colors.primary : Colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  compact: { padding: Spacing.sm },
  imageWrap: { position: 'relative' },
  image: { width: 72, height: 72, borderRadius: Radii.md },
  verifiedDot: { position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.white, borderRadius: 10 },
  info: { flex: 1, gap: 3 },
  brand: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  price: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  sellers: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  save: { padding: Spacing.xs },
});
