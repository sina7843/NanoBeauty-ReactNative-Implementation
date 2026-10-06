import { primitive } from '@nano/design-tokens';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { LOGO_PATHS } from './logo-paths';

const LOCKUP_MIN_HEIGHT = 28;

export interface LogoProps {
  /** `lockup` inside screens; `frame` (master square artwork) for splash/icon contexts. */
  variant?: 'lockup' | 'frame';
  height?: number;
  /** Override the ink: `onBrand` on `surfaceBrand`; default `inkDisplay`. */
  onBrand?: boolean;
  label?: string;
}

/** Always the complete "nano BEAUTY" lockup from the master artwork; never recoloured beyond its ink. */
export function Logo({ variant = 'lockup', height = 40, onBrand, label = 'Nano Beauty' }: LogoProps) {
  const { colors } = useTheme();
  const a11y = { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label };
  if (variant === 'frame') {
    return (
      <Svg viewBox="0 0 2592 2592" width={height} height={height} {...a11y}>
        <Rect width={2592} height={2592} fill={primitive['plum-800']} />
        <G fill={primitive['porcelain-0']}>
          {LOGO_PATHS.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
      </Svg>
    );
  }
  const h = Math.max(height, LOCKUP_MIN_HEIGHT);
  return (
    <Svg viewBox="100 880 2390 830" height={h} width={Math.round((2390 / 830) * h)} {...a11y}>
      <G fill={onBrand ? colors.onBrand : colors.inkDisplay}>
        {LOGO_PATHS.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
    </Svg>
  );
}
