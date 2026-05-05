// Tokens derived from DESIGN.md frontmatter. This is the only source of colors,
// typography, radii, and spacing. No raw hex codes elsewhere in the codebase.

export const palette = {
  surface: '#fbf9f9',
  surfaceDim: '#dbdad9',
  surfaceBright: '#fbf9f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3f3',
  surfaceContainer: '#efeded',
  surfaceContainerHigh: '#e9e8e7',
  surfaceContainerHighest: '#e3e2e2',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#3e4946',
  inverseSurface: '#303031',
  inverseOnSurface: '#f2f0f0',
  outline: '#6e7976',
  outlineVariant: '#bec9c5',
  surfaceTint: '#046b5e',
  primary: '#004f45',
  onPrimary: '#ffffff',
  primaryContainer: '#00695c',
  onPrimaryContainer: '#94e5d5',
  inversePrimary: '#84d5c5',
  secondary: '#5d5f5e',
  onSecondary: '#ffffff',
  secondaryContainer: '#dcdddc',
  onSecondaryContainer: '#5f6161',
  tertiary: '#703321',
  onTertiary: '#ffffff',
  tertiaryContainer: '#8d4a36',
  onTertiaryContainer: '#ffcabb',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryFixed: '#a0f2e1',
  primaryFixedDim: '#84d5c5',
  onPrimaryFixed: '#00201b',
  onPrimaryFixedVariant: '#005046',
  background: '#fbf9f9',
  onBackground: '#1b1c1c',
  // Semantic, derived
  warningContainer: '#fff3cd',
  onWarningContainer: '#5c4400',
  successContainer: '#d4edda',
  onSuccessContainer: '#0f5132',
} as const;

export const spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  md: 16,
  lg: 24,
  xl: 32,
  containerMargin: 20,
  gutter: 12,
} as const;

export const radius = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  displayLg: { fontFamily: 'Inter', fontSize: 36, fontWeight: '700' as const, lineHeight: 43, letterSpacing: -0.72 },
  headlineMd: { fontFamily: 'Inter', fontSize: 24, fontWeight: '600' as const, lineHeight: 31 },
  bodyBase: { fontFamily: 'Inter', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontFamily: 'Inter', fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelCaps: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.6 },
  currencyDisplay: { fontFamily: 'Inter', fontSize: 32, fontWeight: '700' as const, lineHeight: 32 },
} as const;

export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const tokens = { palette, spacing, radius, typography, elevation } as const;
export type Tokens = typeof tokens;
