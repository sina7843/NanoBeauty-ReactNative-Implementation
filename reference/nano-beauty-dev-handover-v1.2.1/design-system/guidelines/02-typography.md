# Typography

Two families, both SIL Open Font License, free for app embedding.

- **Fraunces** (variable: weight + optical size) — the editorial voice. Soft, high-contrast serif that echoes the logo's thick–thin strokes.
- **Sora** (variable: weight) — the functional voice, already used on nanobeautystar.com for interface text.

## Styles

| Style | Family | Size / line | Use |
|---|---|---|---|
| `display-lg` | Fraunces 360 | 40/44 | Guest hero, splash. One per screen |
| `display-md` | Fraunces 380 | 32/38 | Top-level large titles, campaign headline |
| `title-lg` | Fraunces 420 | 26/32 | Service/package titles, sheet titles |
| `title-md` | Fraunces 440 | 21/28 | Section headings, empty and result states |
| `accent-italic` | Fraunces italic 380 | 18/26 | One softening phrase |
| `headline` | Sora 600 | 18/24 | Card and row titles, dialog titles |
| `body-lg` | Sora 400 | 17/26 | Reading text (descriptions, aftercare) |
| `body` | Sora 400 | 15/22 | Default UI text |
| `label-lg` | Sora 600 | 16/20 | Buttons |
| `label` | Sora 500 | 14/18 | Chips, tabs, field labels |
| `caption` | Sora 400 | 13/18 | Metadata, timestamps, footnotes |
| `overline` | Sora 600, +0.08em, uppercase | 12/16 | Eyebrows (2–3 words) |
| `amount` | Sora 600, tabular | 22/28 | Totals and balances |

## Rules

- Serif only for short, human headlines: six words or fewer. Never for prices, form labels, legal, errors, staff data tables or anything read under stress.
- Use tabular figures for every number that can change or be compared (prices, balances, times, references).
- Scale with the OS text size (Dynamic Type / Android font scale). Layouts must reflow to at least 200%; cap serif display styles at 1.3× so hero headlines don't push actions off-screen, but never cap body text.
- Minimum 13px. One exception: the `overline` style (12px, semibold, uppercase, 0.08em tracking) for short section labels only, never for sentences. No light weights below 18px.
- Line length 30–40 characters for serif headlines, up to ~70 for body.

## React Native

Load static TTF instances with `expo-font` (Fraunces Light/Regular/Italic at the 72pt and 24pt optical sizes; Sora Regular/Medium/SemiBold). The `typography` object in `export/nano-tokens.ts` names the instance for each style. The woff2 files in `fonts/` are for web previews.
