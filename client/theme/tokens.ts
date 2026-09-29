export const palette = {
  brandBlue: '#019EEC',
  brandYellow: '#FFB600',
} as const;

const light = {
  bg: '#F4F5F7',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8FA',
  surfaceSunken: '#EDEFF3',
  surfaceInverse: '#16181D',

  border: '#E5E8ED',
  borderStrong: '#D2D7DF',
  borderFocus: '#019EEC',

  text: '#111318',
  textSecondary: '#5C6470',
  textTertiary: '#8B929E',
  textInverse: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  accent: '#0079C8',
  accentHover: '#0365A8',
  accentPressed: '#0A578F',
  accentSoft: '#E6F2FB',
  accentSoftBorder: '#B7DCF4',
  accentText: '#015C99',

  success: '#12794F',
  successSoft: '#E3F5EC',
  successBorder: '#B4E2CC',

  danger: '#C4342B',
  dangerSoft: '#FCEBE9',
  dangerBorder: '#F2C4BF',

  warning: '#8A5300',
  warningSoft: '#FCF2E0',
  warningBorder: '#F0DAB0',

  info: '#4A5A6A',
  infoSoft: '#EEF1F5',

  overlay: 'rgba(17, 19, 24, 0.45)',
  skeleton: '#E9ECF1',
} as const;

const dark = {
  bg: '#0C0D10',
  bgElevated: '#16181D',
  surface: '#16181D',
  surfaceMuted: '#1D2026',
  surfaceSunken: '#101216',
  surfaceInverse: '#F4F5F7',

  border: '#282C33',
  borderStrong: '#3A404A',
  borderFocus: '#4FC3FF',

  text: '#F2F4F7',
  textSecondary: '#A8B0BC',
  textTertiary: '#7B8493',
  textInverse: '#111318',
  textOnAccent: '#FFFFFF',

  accent: '#3FB6F2',
  accentHover: '#63C4F6',
  accentPressed: '#8AD3F9',
  accentSoft: '#0E2735',
  accentSoftBorder: '#1C455C',
  accentText: '#7FD0F7',

  success: '#4ECB8D',
  successSoft: '#0F2A1E',
  successBorder: '#1D4A34',

  danger: '#FF8A80',
  dangerSoft: '#33110F',
  dangerBorder: '#55221E',

  warning: '#E0B252',
  warningSoft: '#2B2110',
  warningBorder: '#4A3A1B',

  info: '#A8B0BC',
  infoSoft: '#1D2026',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#22262D',
} as const;

export type ThemeColors = typeof light;
export type ColorScheme = 'light' | 'dark';

export const colorSets: Record<ColorScheme, ThemeColors> = { light, dark };

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export const fontSize = {
  caption: 12,
  footnote: 13,
  subhead: 15,
  body: 16,
  headline: 17,
  title3: 20,
  title2: 24,
  title1: 28,
  display: 34,
  mono: 17,
  monoLarge: 21,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const lineHeight = {
  caption: 16,
  footnote: 18,
  subhead: 20,
  body: 22,
  headline: 22,
  title3: 26,
  title2: 30,
  title1: 34,
  display: 40,
  mono: 26,
  monoLarge: 32,
} as const;

export const monoFont = {
  ios: 'Menlo',
  android: 'monospace',
  web: 'monospace',
} as const;

export const layout = {
  screenPadding: spacing.lg,
  contentMaxWidth: 560,
  headerHeight: 52,
  headerPaddingTop: spacing.sm,
  touchTarget: 44,
  borderWidth: 1,
  focusBorderWidth: 2,
  hairline: 0.5,
} as const;

export const motion = {
  fast: 120,
  normal: 200,
  pressOpacity: 0.6,
} as const;

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  layout: typeof layout;
  isDark: boolean;
};
