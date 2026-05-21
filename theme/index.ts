import { Platform } from 'react-native';

export const Colors = {
  primary: '#E76F2E',
  accent: '#2FA4D7',
  text: '#3E2C23',
  surface: '#F5E9D8',
  white: '#FFFFFF',
  nearBlack: '#1A1512',
  textSecondary: '#7A6050',
  border: '#E8D5C0',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  overlay: 'rgba(0,0,0,0.5)',
  cardBg: '#FFFFFF',
} as const;

export const Typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
  card: 20,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radii: Radii,
  shadows: Shadows,
} as const;

export type ThemeColors = typeof Colors;
export type ThemeSpacing = typeof Spacing;
