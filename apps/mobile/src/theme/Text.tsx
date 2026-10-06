import type { ColorRole } from '@nano/design-tokens';
import { Text as RNText, type TextProps } from 'react-native';
import type { TypographyName } from './fonts';
import { useTheme } from './ThemeProvider';

// Serif display styles are capped at 1.3× so hero headlines can't push actions off-screen;
// everything else scales with the OS text size without a cap (guideline 02).
const CAPPED: ReadonlySet<TypographyName> = new Set(['displayLg', 'displayMd']);
const SERIF: ReadonlySet<TypographyName> = new Set(['displayLg', 'displayMd', 'titleLg', 'titleMd', 'accentItalic']);

export interface NanoTextProps extends TextProps {
  variant?: TypographyName;
  tone?: ColorRole;
  /** Semibold emphasis within a sans style (row titles, banner titles). */
  strong?: boolean;
}

export function Text({ variant = 'body', tone, strong, style, ...rest }: NanoTextProps) {
  const { type, colors, strong: strongStyle } = useTheme();
  const color = colors[tone ?? (SERIF.has(variant) ? 'inkDisplay' : 'ink')];
  return (
    <RNText
      maxFontSizeMultiplier={CAPPED.has(variant) ? 1.3 : undefined}
      {...rest}
      style={[type(variant), strong && strongStyle, { color }, style]}
    />
  );
}
