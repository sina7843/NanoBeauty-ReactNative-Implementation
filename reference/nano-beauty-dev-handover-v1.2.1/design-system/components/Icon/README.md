# Icon

Phosphor Icons (MIT), Regular weight at 20–24px, with Fill used only for the selected tab.

**Props:** `name` (a Phosphor name bundled here), `size` (16 / 20 / 24 — the `icon-sm/md/lg` tokens), `label` (only when the icon stands alone and carries meaning; otherwise it is hidden from screen readers).

**Rules**
- Icons inherit `color`. Status icons take their status token (`success`, `warning`, `danger`, `info`) and always sit beside a word.
- One weight per screen (Regular). Fill is reserved for the selected state of a tab.
- Never decorate with icons; each one names an action or a kind of thing.
- No emoji anywhere in product UI.

**React Native:** use `phosphor-react-native` with `weight="regular"`, or the SVGs in `assets/Icons`.
