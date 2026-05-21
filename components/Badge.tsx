import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { AuthenticityStatus } from '@/types';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, color = Colors.primary, textColor = Colors.white, style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

interface AuthenticityBadgeProps {
  status: AuthenticityStatus;
  style?: ViewStyle;
}

const AUTHENTICITY_CONFIG: Record<AuthenticityStatus, { label: string; color: string }> = {
  authentic: { label: '✓ Authentic', color: Colors.success },
  suspicious: { label: '⚠ Suspicious', color: Colors.warning },
  counterfeit: { label: '✗ Counterfeit', color: Colors.danger },
};

export function AuthenticityBadge({ status, style }: AuthenticityBadgeProps) {
  const { label, color } = AUTHENTICITY_CONFIG[status];
  return <Badge label={label} color={color} style={style} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  label: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
});
