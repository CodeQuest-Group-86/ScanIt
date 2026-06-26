import { useTabBarInset } from '@/hooks/useTabBarInset';
import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface TabScrollViewProps extends ScrollViewProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Set false on screens without the bottom tab bar */
  withTabBarInset?: boolean;
}

/**
 * ScrollView tuned for tab screens — flex fill, correct bottom inset, smooth bounce.
 */
export default function TabScrollView({
  children,
  contentContainerStyle,
  withTabBarInset = true,
  style,
  ...props
}: TabScrollViewProps) {
  const bottomInset = useTabBarInset();

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        withTabBarInset && { paddingBottom: bottomInset },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
});
