# Logo

The Nano Beauty logo is always the complete "nano BEAUTY" lockup, taken from the master artwork (NBS White Logo.pdf). There is no "nano"-only wordmark and no separate symbol.

**Variants**
- `frame` — the master artwork exactly as supplied: square logo-plum (#463E55) ground, white lockup, same proportions and placement. Use it for the app icon, splash, store listing and social avatar. Never recolour, crop or re-space it.
- `lockup` — the same "nano BEAUTY" lockup without the square, single ink. Use inside screens (header, gift card face, sign-in): `ink-display` on `bg`/`surface`, `on-brand` on `surface-brand`.

**Never** split "nano" from "BEAUTY", redraw letters, change spacing, add effects, or place the lockup on busy photography.

**Clear space:** at least the height of the "B" in BEAUTY on every side. **Minimum size:** lockup 28px tall (below that "BEAUTY" stops being legible; use the `frame` only at icon sizes where the OS requires it).

**App icon:** the `frame` artwork is already square. iOS and Android apply their own corner masks; supply the master at 1024×1024 without rounded corners. For Android adaptive icons, keep the lockup inside the central safe zone (the plum fills the background layer).

**Props:** `variant` (`lockup` | `frame`), `height` (px), `label`.
