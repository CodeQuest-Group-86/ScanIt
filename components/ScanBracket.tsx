import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

interface ScanBracketProps {
  size?: number;
  color?: string;
  thickness?: number;
  cornerLength?: number;
}

export default function ScanBracket({
  size = 240,
  color = Colors.primary,
  thickness = 3,
  cornerLength = 32,
}: ScanBracketProps) {
  const corner = { width: cornerLength, height: cornerLength };

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Top-left */}
      <View style={[styles.corner, { top: 0, left: 0 }]}>
        <View style={[styles.cornerH, corner, { borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: 4, borderColor: color }]} />
      </View>
      {/* Top-right */}
      <View style={[styles.corner, { top: 0, right: 0 }]}>
        <View style={[styles.cornerH, corner, { borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: 4, borderColor: color }]} />
      </View>
      {/* Bottom-left */}
      <View style={[styles.corner, { bottom: 0, left: 0 }]}>
        <View style={[styles.cornerH, corner, { borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: 4, borderColor: color }]} />
      </View>
      {/* Bottom-right */}
      <View style={[styles.corner, { bottom: 0, right: 0 }]}>
        <View style={[styles.cornerH, corner, { borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: 4, borderColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  corner: { position: 'absolute' },
  cornerH: {},
});
