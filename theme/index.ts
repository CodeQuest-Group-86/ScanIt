import { Platform } from 'react-native';

export const Colors = {
  // Brand
  primary: '#E8682A',
  primaryLight: '#FF8C4A',
  primaryDark: '#C4521A',
  accent: '#1A9ED4',
  accentLight: '#4DBFED',

  // Backgrounds
  surface: '#FAF0E4',
  surfaceDeep: '#F2E0C8',
  white: '#FFFFFF',
  nearBlack: '#12100E',
  cardBg: '#FFFFFF',

  // Text
  text: '#1E1410',
  textSecondary: '#7A6050',
  textMuted: '#A89080',

  // UI
  border: '#E8D5C0',
  borderLight: '#F0E4D4',

  // Semantic
  success: '#16A34A',
  successLight: '#22C55E',
  warning: '#D97706',
  warningLight: '#F59E0B',
  danger: '#DC2626',
  dangerLight: '#EF4444',

  // Gradient arrays (use with expo-linear-gradient)
  gradientPrimary: ['#FF8C4A', '#E8682A', '#C4521A'] as string[],
  gradientHero: ['#FF9A5C', '#E8682A'] as string[],
  gradientAccent: ['#4DBFED', '#1A9ED4'] as string[],
  gradientSurface: ['#FFF8F0', '#FAF0E4'] as string[],
  gradientDark: ['#2C1F14', '#12100E'] as string[],
  gradientSuccess: ['#22C55E', '#16A34A'] as string[],
  gradientCard: ['#FFFFFF', '#FFF8F2'] as string[],

  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.25)',
  overlayDark: 'rgba(0,0,0,0.7)',
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
    display: 38,
    hero: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
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
  hero: 56,
} as const;

export const Radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  pill: 999,
  card: 20,
} as const;

export const Shadows = {
  xs: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  xl: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 16,
  },
  primary: {
    shadowColor: '#E8682A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  accent: {
    shadowColor: '#1A9ED4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
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

/** Liquid glass preset tokens */
export const Glass = {
  /** Default card blur intensity (iOS BlurView) */
  intensity: 55,
  /** Warm tint matching the app's surface palette */
  tint: 'light' as const,
  /** Inner border highlight colour */
  borderColor: 'rgba(255,255,255,0.55)',
  /** Android fallback background */
  androidBg: 'rgba(250,240,228,0.82)',
  /** Sheet / modal blur intensity */
  sheetIntensity: 65,
  /** Stat card intensity */
  statIntensity: 45,
  /** Form card intensity */
  formIntensity: 50,
} as const;

export type ThemeColors = typeof Colors;
export type ThemeSpacing = typeof Spacing;
