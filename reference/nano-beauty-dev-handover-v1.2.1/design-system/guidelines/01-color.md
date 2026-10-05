# Colour

Colour has two tiers. **Primitives** (`porcelain-*`, `stone-*`, `violet-*`, `plum-*`, `night-*`, `mist-*`, and the status ramps `teal`, `ochre`, `brick`, `slate`) are the raw palette. **Semantic tokens** (`bg`, `surface`, `ink`, `primary`…) alias a primitive per theme. Components and screens use semantic tokens only.

## Where each role goes

| Role | Use for | Never |
|---|---|---|
| `bg` | Screen background | Cards (use `surface`) |
| `surface` | Cards, list groups, every price/booking/wallet/consent panel | Translucent or blurred |
| `surface-muted` | Grouped-list ground, input fill, quiet panels, disabled fill | Primary content cards |
| `surface-raised` + `shadow-overlay` | Sheets, dialogs, toasts, menus | Inline content |
| `surface-tint` + `on-tint` | Selected chips, offers, clinic credit, member status, selected tab pill | Errors or warnings |
| `surface-brand` + `on-brand` | Guest hero band, gift card face, splash, app icon | More than once per screen |
| `primary` + `on-primary` | The single main action, selected slot, selected radio, links | Decoration, large backgrounds |
| `ink` / `ink-display` / `ink-muted` | Body / serif headlines / secondary text | `ink-muted` for anything the person must read to act safely (use `ink`) |
| `line` / `line-strong` | Decorative hairlines / control borders (3:1) | `line` as the only boundary of an input |
| `success` `warning` `danger` `info` (+`-soft`) | Status text, icons and banners, always with an icon and word | Brand accents |
| `staff` + `on-staff` | Staff workspace band only | Customer screens |
| `scrim` | Behind sheets and dialogs | Over photos as a style |

## Brand violet across themes

The Nano violet hue is fixed and never follows Android dynamic colour (Material You). In dark it is tone-lifted (`violet-600` → `violet-400`) so a primary button still reads as the brightest thing on the screen; its label switches to dark `on-primary`. Logo plum `plum-800` is identical in both themes.

## Contrast (checked in both themes)

Every text token meets 4.5:1 on the grounds named in its usage note; `line-strong` and `focus` meet 3:1. Tightest pairs: `line-strong` on `surface-muted` 3.65:1 (light), `ink-muted` on `surface-tint` 5.0:1 (light), `primary` on `bg` 6.1:1 (light), `primary` on `bg` 6.8:1 (dark). Status colours differ in hue and lightness and never carry meaning alone: success leans teal (away from the red–green axis) and every status has an icon and a word.

## Source values

`plum-800` #463E55 comes from the master logo file. The website's observed violets (#766D89, #6F6487) informed `violet-600` #65568A, darkened to pass 4.5:1 with white text. Everything else is new and awaits brand sign-off.
