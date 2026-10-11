// LOCAL additions (DS-21): tokens that exist in the handover tokens.json (opacity, focus-ring) but are missing from the
// generated export `index.ts`. `index.ts` is copied verbatim from the handover (see scripts/check-sync.mjs), so these
// live here instead. Move them into the export when the design source emits them.
import { primitive } from './index';

export const opacity = {
  /** tokens.json `opacity-disabled`: disabled control fills and imagery, never text contrast. */
  disabled: 0.4,
  /** tokens.json `opacity-pressed-overlay`: ink overlay on pressed photos/cards. */
  pressedOverlay: 0.08,
} as const;

/** tokens.json shadow `focus-ring`: a 2px ground gap, then a 2px solid focus colour (follows the radius). */
export const focusRing = {
  width: 2,
  light: { gap: primitive['porcelain-50'], ring: primitive['violet-600'] },
  dark: { gap: primitive['night-950'], ring: primitive['violet-300'] },
} as const;
