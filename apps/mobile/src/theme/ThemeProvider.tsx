import { elevation, themes, type ColorRole } from '@nano/design-tokens';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import { resolveTypography, strongFace, type TypographyName } from './fonts';

export type Scheme = 'light' | 'dark';
export type Colors = Record<ColorRole, string>;

export interface Theme {
  scheme: Scheme;
  colors: Colors;
  type: (name: TypographyName) => TextStyle;
  strong: TextStyle;
  /** Brand font faces loaded before the app rendered (all six; see fonts.ts). */
  fonts: ReadonlySet<string>;
  elevation: { card: object; overlay: object };
}

const ThemeContext = createContext<Theme | null>(null);

export function makeTheme(scheme: Scheme, fonts: ReadonlySet<string>): Theme {
  const cache = new Map<TypographyName, TextStyle>();
  return {
    scheme,
    colors: themes[scheme],
    type: (name) => {
      let style = cache.get(name);
      if (!style) cache.set(name, (style = resolveTypography(name)));
      return style;
    },
    strong: strongFace(),
    fonts,
    elevation: { card: elevation.card[scheme], overlay: elevation.overlay[scheme] },
  };
}

/**
 * Light/dark follow the OS appearance (no in-app switch at launch). `scheme` overrides it only for the
 * dev component showcase. Colours are the brand tokens; Android dynamic colour is never consulted.
 */
const NO_FONTS: ReadonlySet<string> = new Set();

export function ThemeProvider({
  children,
  fonts = NO_FONTS,
  scheme: forced,
}: {
  children: ReactNode;
  fonts?: ReadonlySet<string>;
  scheme?: Scheme;
}) {
  const system = useColorScheme();
  const scheme: Scheme = forced ?? (system === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => makeTheme(scheme, fonts), [scheme, fonts]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
