# Brand fonts (owner-supplied, 10 Oct 2026)

These six files are the Nano Beauty brand fonts, supplied by the project owner in the QA handover
(decision D-QA-02 in `qa/2026-10-10/DECISIONS.md`). They are required: the app must always render
with them and never fall back to system fonts. Licence: SIL Open Font License 1.1 (`OFL.txt`).

They are static instances of the design system's variable fonts. Each file is its own family whose
family name and PostScript name equal the file name, so React Native refers to them by exactly the
names in `packages/design-tokens` (`typography[...].fontFamily`) on Android and iOS.

| File | Source | Axis values | Token styles using it | Design system values (tokens.css) |
| --- | --- | --- | --- | --- |
| `Fraunces-Light.ttf` | Fraunces-Variable | wght 370, opsz 60 | displayLg, displayMd | display-lg 360 / opsz 72; display-md 380 / opsz 48 |
| `Fraunces-Regular.ttf` | Fraunces-Variable | wght 430, opsz 30 | titleLg, titleMd | title-lg 420 / opsz 36; title-md 440 / opsz 24 |
| `Fraunces-Italic.ttf` | Fraunces-Variable-Italic | wght 380, opsz 18 | accentItalic | accent-italic 380 / opsz 18 |
| `Sora-Regular.ttf` | Sora-Variable | wght 400 | bodyLg, body, caption | 400 |
| `Sora-Medium.ttf` | Sora-Variable | wght 500 | label | 500 |
| `Sora-SemiBold.ttf` | Sora-Variable | wght 600 | headline, labelLg, overline, amount | 600 |

The two Fraunces files that serve two styles use the midpoint of those styles' weight and optical
size, because the token package has one family per role. Glyph coverage is the design system's web
subset (Latin), which covers the English-only app.
