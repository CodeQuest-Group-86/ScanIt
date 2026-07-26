import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Visible tab bar height for the dual-island + hero scan dock.
 * Keep in sync with AnimatedGlassTabBar (islands ~64, elevated FAB ~68).
 */
export const TAB_BAR_HEIGHT = 90;

/**
 * Bottom padding so scroll content clears the custom glass tab bar + scan FAB.
 */
export function useTabBarInset(extra = 12): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + extra;
}
