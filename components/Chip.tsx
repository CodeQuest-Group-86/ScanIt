import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  color?: string;
}

export default function Chip({ label, active = false, onPress, style, color }: ChipProps) {
  const activeColor = color ?? Colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        active ? { backgroundColor: activeColor, borderColor: activeColor, ...Shadows.sm } : styles.inactive,
        style,
      ]}>
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: { backgroundColor: Colors.white, borderColor: Colors.border },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  labelActive: { color: Colors.white },
  labelInactive: { color: Colors.textSecondary },
});
