import { fontFamily, typography } from '@nano/design-tokens';
import * as Font from 'expo-font';
import type { TextStyle } from 'react-native';

// D-QA-02: the six brand fonts are committed (assets/fonts) and always used. No system-font fallback.
// Static require() so Metro bundles them; app.config.ts also embeds them natively through the expo-font plugin.
export const BRAND_FONTS: readonly string[] = [...Object.values(fontFamily.serif), ...Object.values(fontFamily.sans)];

const FONT_FILES: Record<string, number> = {
  'Fraunces-Light': require('../../assets/fonts/Fraunces-Light.ttf'),
  'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
  'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
  'Sora-Regular': require('../../assets/fonts/Sora-Regular.ttf'),
  'Sora-Medium': require('../../assets/fonts/Sora-Medium.ttf'),
  'Sora-SemiBold': require('../../assets/fonts/Sora-SemiBold.ttf'),
};

const ALL_FONTS: ReadonlySet<string> = new Set(BRAND_FONTS);

/** Loads all six faces. Rejects (red box in development) when any is missing or fails: never a silent fallback. */
export async function loadBrandFonts(): Promise<ReadonlySet<string>> {
  const missing = BRAND_FONTS.filter((name) => FONT_FILES[name] == null);
  if (missing.length > 0) throw new Error(`Brand font files missing from fonts.ts: ${missing.join(', ')}`);
  await Font.loadAsync(FONT_FILES);
  const notLoaded = BRAND_FONTS.filter((name) => !Font.isLoaded(name));
  if (notLoaded.length > 0) throw new Error(`Brand fonts failed to load: ${notLoaded.join(', ')}`);
  return ALL_FONTS;
}

export type TypographyName = keyof typeof typography;

/** Token style: always the brand family (no system fallback). */
export function resolveTypography(name: TypographyName): TextStyle {
  return { ...typography[name] } as TextStyle;
}

/** Semibold face for emphasis inside a sans style, without a raw fontWeight on a custom family. */
export function strongFace(): TextStyle {
  return { fontFamily: 'Sora-SemiBold', fontWeight: undefined };
}
