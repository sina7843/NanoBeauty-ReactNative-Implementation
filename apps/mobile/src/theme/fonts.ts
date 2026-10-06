import { fontFamily, typography } from '@nano/design-tokens';
import * as Font from 'expo-font';
import { Platform, type TextStyle } from 'react-native';

// Brand fonts are owner-supplied (assets/fonts/README.md). The app must run without them, so files are
// discovered at bundle time and loaded at runtime; anything missing keeps a system fallback.
export const BRAND_FONTS: readonly string[] = [...Object.values(fontFamily.serif), ...Object.values(fontFamily.sans)];

declare const require: {
  context?: (dir: string, recursive: boolean, filter: RegExp) => { keys(): string[]; (key: string): number };
};

function discoverFontFiles(): Record<string, number> {
  const found: Record<string, number> = {};
  if (typeof require.context !== 'function') return found; // Jest and other non-Metro runtimes
  const ctx = require.context('../../assets/fonts', false, /\.ttf$/);
  for (const key of ctx.keys()) {
    const name = key.replace(/^\.\//, '').replace(/\.ttf$/, '');
    if (BRAND_FONTS.includes(name)) found[name] = ctx(key);
  }
  return found;
}

/** Loads whichever brand fonts are present. Never throws: a broken file just means fallback. */
export async function loadBrandFonts(): Promise<ReadonlySet<string>> {
  const files = discoverFontFiles();
  if (Object.keys(files).length > 0) {
    await Font.loadAsync(files).catch(() => undefined);
  }
  return new Set(BRAND_FONTS.filter((name) => Font.isLoaded(name)));
}

export type TypographyName = keyof typeof typography;

const SERIF_FALLBACK = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });
const FALLBACK: Record<string, Pick<TextStyle, 'fontFamily' | 'fontWeight' | 'fontStyle'>> = {
  'Fraunces-Light': { fontFamily: SERIF_FALLBACK, fontWeight: '300' },
  'Fraunces-Regular': { fontFamily: SERIF_FALLBACK, fontWeight: '400' },
  'Fraunces-Italic': { fontFamily: SERIF_FALLBACK, fontWeight: '400', fontStyle: 'italic' },
  'Sora-Regular': { fontWeight: '400' },
  'Sora-Medium': { fontWeight: '500' },
  'Sora-SemiBold': { fontWeight: '600' },
};

/** Token style with the brand family when loaded, otherwise the documented system fallback. */
export function resolveTypography(name: TypographyName, loaded: ReadonlySet<string>): TextStyle {
  const { fontFamily: family, ...rest } = typography[name] as TextStyle & { fontFamily: string };
  return loaded.has(family) ? { ...rest, fontFamily: family } : { ...rest, ...FALLBACK[family] };
}

/** Semibold face for emphasis inside a sans style, without a raw fontWeight on a custom family. */
export function strongFace(loaded: ReadonlySet<string>): TextStyle {
  return loaded.has('Sora-SemiBold') ? { fontFamily: 'Sora-SemiBold', fontWeight: undefined } : { fontWeight: '600' };
}
