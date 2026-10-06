// Nano Beauty design tokens for React Native / TypeScript.
// Generated from project/tokens.json. Do not edit by hand.
// Light and dark follow the OS appearance (useColorScheme). Values are dp/pt.

export const primitive = {
  'porcelain-0': '#FFFFFF',
  'porcelain-50': '#FBF8F4',
  'porcelain-100': '#F5F0EA',
  'porcelain-200': '#ECE5DC',
  'porcelain-300': '#DDD3C7',
  'stone-400': '#A39A92',
  'stone-500': '#857B74',
  'stone-600': '#6B625C',
  'stone-700': '#4F4843',
  'violet-50': '#F6F3FB',
  'violet-100': '#EEE9F6',
  'violet-200': '#DDD4EC',
  'violet-300': '#C4B7E3',
  'violet-400': '#A594D6',
  'violet-500': '#8575B0',
  'violet-600': '#65568A',
  'violet-700': '#54477A',
  'violet-900': '#2C2540',
  'plum-800': '#463E55',
  'plum-900': '#2F2939',
  'ink-950': '#231D30',
  'night-950': '#17131C',
  'night-900': '#1F1A25',
  'night-850': '#28222F',
  'night-800': '#342D3C',
  'night-700': '#4A4254',
  'mist-300': '#BDB3C4',
  'mist-500': '#8E8499',
  'teal-100': '#E1F0EF',
  'teal-300': '#7CC5C4',
  'teal-700': '#1F6A6E',
  'teal-900': '#12302F',
  'ochre-100': '#FAEED8',
  'ochre-300': '#E3B563',
  'ochre-700': '#8A5A12',
  'ochre-900': '#36280F',
  'brick-100': '#FBE5E1',
  'brick-300': '#F0A095',
  'brick-700': '#A8322D',
  'brick-900': '#3E1B19',
  'slate-100': '#E5ECF7',
  'slate-300': '#A3BCE6',
  'slate-700': '#3C5A8A',
  'slate-900': '#1A2436',
} as const;

export const light = {
  bg: primitive['porcelain-50'],
  surface: primitive['porcelain-0'],
  surfaceMuted: primitive['porcelain-100'],
  surfaceRaised: primitive['porcelain-0'],
  surfaceBrand: primitive['plum-800'],
  surfaceTint: primitive['violet-100'],
  surfacePressed: primitive['porcelain-300'],
  line: primitive['porcelain-200'],
  lineStrong: primitive['stone-500'],
  ink: primitive['ink-950'],
  inkDisplay: primitive['plum-800'],
  inkMuted: primitive['stone-600'],
  inkDisabled: primitive['stone-400'],
  onBrand: primitive['porcelain-50'],
  primary: primitive['violet-600'],
  primaryPressed: primitive['violet-700'],
  onPrimary: primitive['porcelain-0'],
  onTint: primitive['violet-700'],
  focus: primitive['violet-600'],
  success: primitive['teal-700'],
  successSoft: primitive['teal-100'],
  warning: primitive['ochre-700'],
  warningSoft: primitive['ochre-100'],
  danger: primitive['brick-700'],
  dangerSoft: primitive['brick-100'],
  onDanger: primitive['porcelain-0'],
  info: primitive['slate-700'],
  infoSoft: primitive['slate-100'],
  staff: primitive['plum-900'],
  onStaff: primitive['porcelain-100'],
  scrim: '#231D3066',
} as const;

export const dark = {
  bg: primitive['night-950'],
  surface: primitive['night-900'],
  surfaceMuted: primitive['night-850'],
  surfaceRaised: primitive['night-850'],
  surfaceBrand: primitive['plum-800'],
  surfaceTint: primitive['violet-900'],
  surfacePressed: primitive['night-800'],
  line: primitive['night-800'],
  lineStrong: primitive['mist-500'],
  ink: primitive['porcelain-100'],
  inkDisplay: primitive['porcelain-100'],
  inkMuted: primitive['mist-300'],
  inkDisabled: primitive['night-700'],
  onBrand: primitive['porcelain-50'],
  primary: primitive['violet-400'],
  primaryPressed: primitive['violet-300'],
  onPrimary: primitive['night-950'],
  onTint: primitive['violet-200'],
  focus: primitive['violet-300'],
  success: primitive['teal-300'],
  successSoft: primitive['teal-900'],
  warning: primitive['ochre-300'],
  warningSoft: primitive['ochre-900'],
  danger: primitive['brick-300'],
  dangerSoft: primitive['brick-900'],
  onDanger: primitive['night-950'],
  info: primitive['slate-300'],
  infoSoft: primitive['slate-900'],
  staff: primitive['plum-900'],
  onStaff: primitive['porcelain-100'],
  scrim: '#0A080DB3',
} as const;

export type ColorRole = keyof typeof light;

export const space = {
  '0-5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;
export const size = {
  touchMin: 48,
  controlSm: 36,
  controlMd: 48,
  controlLg: 56,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  tabbarHeight: 64,
  contentMax: 560,
} as const;

// Font files: ship Fraunces and Sora as static TTFs via expo-font (Google Fonts, SIL OFL).
// RN cannot address variable axes reliably, so each style names the static instance to load.
export const fontFamily = {
  serif: { light: 'Fraunces-Light', regular: 'Fraunces-Regular', italic: 'Fraunces-Italic' },
  sans: { regular: 'Sora-Regular', medium: 'Sora-Medium', semibold: 'Sora-SemiBold' },
} as const;
export const typography = {
  displayLg: { fontFamily: 'Fraunces-Light', fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  displayMd: { fontFamily: 'Fraunces-Light', fontSize: 32, lineHeight: 38, letterSpacing: -0.48 },
  titleLg: { fontFamily: 'Fraunces-Regular', fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  titleMd: { fontFamily: 'Fraunces-Regular', fontSize: 21, lineHeight: 28, letterSpacing: 0 },
  accentItalic: { fontFamily: 'Fraunces-Italic', fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  headline: { fontFamily: 'Sora-SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.09 },
  bodyLg: { fontFamily: 'Sora-Regular', fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  body: { fontFamily: 'Sora-Regular', fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  labelLg: { fontFamily: 'Sora-SemiBold', fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  label: { fontFamily: 'Sora-Medium', fontSize: 14, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: 'Sora-Regular', fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  overline: { fontFamily: 'Sora-SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: 0.96, textTransform: 'uppercase' },
  amount: { fontFamily: 'Sora-SemiBold', fontSize: 22, lineHeight: 28, letterSpacing: -0.22, fontVariant: ['tabular-nums'] },
} as const;

// Motion: proposals until Phase 5 device review. Respect AccessibilityInfo.isReduceMotionEnabled().
export const duration = {
  none: 0,
  feedback: 120,
  state: 180,
  reveal: 240,
  overlay: 280,
  navigation: 320,
  reduced: 80,
} as const;
export const easing = {
  enter: [0.2, 0, 0, 1] as const, // Easing.bezier(...)
  exit: [0.4, 0, 1, 1] as const, // Easing.bezier(...)
  state: [0.2, 0, 0, 1] as const, // Easing.bezier(...)
  linear: [0, 0, 1, 1] as const, // Easing.bezier(...)
} as const;

export const elevation = {
  card: { light: { shadowColor: '#231D30', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, dark: { borderWidth: 1, borderColor: primitive['night-800'] } },
  overlay: { light: { shadowColor: '#231D30', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 }, dark: { shadowColor: '#000000', shadowOpacity: 0.7, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 } },
} as const;

export const themes = { light, dark } as const;
