import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One app, three variants that can be installed side by side.
 * APP_VARIANT is set per EAS build profile (eas.json) or in the shell for local runs.
 *
 * PLACEHOLDER identifiers: Requirements "Store submission" says the client must own the bundle ID and
 * package name. `com.nanobeauty.app` is a stand-in until the client supplies the official IDs
 * (DECISIONS.md). Change BASE_ID here only — every variant derives from it.
 */
const BASE_ID = 'com.nanobeauty.app';
const VARIANTS = {
  development: { suffix: '.dev', name: 'Nano Beauty Dev', scheme: 'nanobeauty-dev' },
  staging: { suffix: '.staging', name: 'Nano Beauty Staging', scheme: 'nanobeauty-staging' },
  production: { suffix: '', name: 'Nano Beauty', scheme: 'nanobeauty' },
} as const;
type Variant = keyof typeof VARIANTS;

function resolveVariant(raw: string | undefined): Variant {
  const value = raw ?? 'development';
  if (!(value in VARIANTS)) throw new Error(`APP_VARIANT must be one of ${Object.keys(VARIANTS).join(', ')}`);
  return value as Variant;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const { suffix, name, scheme } = VARIANTS[variant];
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || undefined;
  // Non-development builds must point at a real API; development falls back to the Metro host.
  if (variant !== 'development' && !apiUrl) {
    throw new Error(`EXPO_PUBLIC_API_URL is required for APP_VARIANT=${variant}`);
  }

  return {
    ...config,
    name,
    slug: 'nano-beauty',
    owner: process.env.EXPO_OWNER,
    version: '1.0.0',
    scheme,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    ios: {
      bundleIdentifier: `${BASE_ID}${suffix}`,
      // D39: staff long forms have a tablet layout.
      supportsTablet: true,
      config: { usesNonExemptEncryption: false },
    },
    android: {
      package: `${BASE_ID}${suffix}`,
      adaptiveIcon: {
        backgroundImage: './assets/android-icon-background.png',
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: true,
    },
    plugins: ['expo-router', 'expo-status-bar', 'expo-secure-store'],
    experiments: { typedRoutes: true },
    extra: {
      appVariant: variant,
      apiUrl: apiUrl ?? null,
      ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
    },
  };
};
