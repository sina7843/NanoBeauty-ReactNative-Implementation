# Owner-supplied fonts (optional)

The app runs without these files and falls back to system fonts. To use the brand fonts, the project
owner places licensed static TTFs here with exactly these names, then restarts Metro (`--clear`):

| File | Used by |
| --- | --- |
| `Fraunces-Light.ttf` | displayLg, displayMd |
| `Fraunces-Regular.ttf` | titleLg, titleMd |
| `Fraunces-Italic.ttf` | accentItalic |
| `Sora-Regular.ttf` | bodyLg, body, caption |
| `Sora-Medium.ttf` | label |
| `Sora-SemiBold.ttf` | headline, labelLg, overline, amount |

Fraunces and Sora are SIL Open Font License (decision D24). Use the static instances (Fraunces at the
72pt optical size for Light/Regular/Italic). Claude Code never downloads or commits font binaries;
adding them is an owner action. Files are loaded at runtime with `expo-font` (`src/theme/fonts.ts`), so
any missing file simply keeps its system fallback.
