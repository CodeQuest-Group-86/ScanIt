import LiquidGlassBackground from '@/components/ui/LiquidGlassBackground';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenShellProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  variant?: 'warm' | 'dark' | 'cool';
}

/** Full-screen liquid glass backdrop + safe area wrapper for tab screens. */
export default function ScreenShell({
  children,
  edges = ['top'],
  style,
  variant = 'warm',
}: ScreenShellProps) {
  return (
    <View style={styles.root}>
      <LiquidGlassBackground variant={variant} blur />
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
