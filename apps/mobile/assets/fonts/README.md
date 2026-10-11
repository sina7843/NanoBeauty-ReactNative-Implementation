# Brand fonts (required)

The six brand fonts are supplied by the project owner and committed here (decision D-QA-02). They are
required in every build: there is no system-font fallback. See `FONTS.md` for their source and
`OFL.txt` for the licence (SIL Open Font License, decision D24).

| File | Used by |
| --- | --- |
| `Fraunces-Light.ttf` | displayLg, displayMd |
| `Fraunces-Regular.ttf` | titleLg, titleMd |
| `Fraunces-Italic.ttf` | accentItalic |
| `Sora-Regular.ttf` | bodyLg, body, caption |
| `Sora-Medium.ttf` | label |
| `Sora-SemiBold.ttf` | headline, labelLg, overline, amount |

The files are loaded with a static `require()` map in `src/theme/fonts.ts` (the splash stays up until
they load) and embedded natively by the `expo-font` config plugin in `app.config.ts`.
`npm run config:check` fails if any file is missing. Never download or substitute other fonts.
