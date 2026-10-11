import { themes } from '@nano/design-tokens';
import { resolveTypography, strongFace } from './fonts';

// WCAG relative-luminance contrast, to guard the documented pairs (guideline 13) in both themes.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as const)('%s theme contrast', (scheme) => {
  const c = themes[scheme];
  it.each([
    ['ink', 'bg'],
    ['ink', 'surface'],
    ['inkMuted', 'surface'],
    ['inkMuted', 'bg'],
    ['primary', 'bg'],
    ['onPrimary', 'primary'],
    ['onTint', 'surfaceTint'],
    ['onBrand', 'surfaceBrand'],
    ['onStaff', 'staff'],
    ['onDanger', 'danger'],
    ['success', 'successSoft'],
    ['warning', 'warningSoft'],
    ['danger', 'dangerSoft'],
    ['info', 'infoSoft'],
  ] as const)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('control borders (lineStrong) reach 3:1 on surface', () => {
    expect(contrast(c.lineStrong, c.surface)).toBeGreaterThanOrEqual(3);
  });
});

describe('typography', () => {
  it('always uses the brand family, with no raw weight on it', () => {
    const style = resolveTypography('displayLg');
    expect(style).toMatchObject({ fontFamily: 'Fraunces-Light', fontSize: 40, lineHeight: 44 });
    expect(style.fontWeight).toBeUndefined();
    expect(resolveTypography('labelLg')).toMatchObject({ fontFamily: 'Sora-SemiBold', fontSize: 16 });
  });

  it('emphasis never puts a raw weight on a custom family', () => {
    expect(strongFace()).toEqual({ fontFamily: 'Sora-SemiBold', fontWeight: undefined });
  });
});
