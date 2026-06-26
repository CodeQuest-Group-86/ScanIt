import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Visible tab bar row height (icons + labels, excluding safe-area inset). */
export const TAB_BAR_HEIGHT = 76;

/**
 * Bottom padding so scroll content clears the custom glass tab bar + scan FAB.
 */
export function useTabBarInset(extra = 12): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + extra;
}
