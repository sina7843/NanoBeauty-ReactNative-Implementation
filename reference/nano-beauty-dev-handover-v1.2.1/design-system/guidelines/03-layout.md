# Layout, shape and depth

## Spacing

4-point base: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48 · `space-16` 64.

- Screen side gutter: `space-5`. Card padding: `space-4`. Sheet padding: `space-6`.
- Between related rows: `space-3`. Heading to its content: `space-3`–`space-4`. Between sections: `space-8`.
- Screen-ending action block: `control-lg` button, `space-3` above, bottom safe-area inset below.

## Grid and safe areas

Single column, portrait. Content respects top/bottom safe-area insets on iOS and edge-to-edge insets on Android (draw behind system bars, pad content). On large phones and tablets in compatibility mode, centre a `content-max` (560) column. Horizontal scrollers (chips) bleed to the screen edge and start at the gutter.

## Touch

Every interactive element has a `touch-min` (48) hit area even when it looks smaller (`control-sm` buttons, chips). Keep 8px between adjacent targets.

## Radius

`radius-xs` 6 badges and checkboxes · `radius-sm` 10 time slots, OTP cells · `radius-md` 14 inputs, banners, list groups · `radius-lg` 20 cards, passes, photos · `radius-xl` 28 sheets, hero · `radius-full` buttons, chips, segmented control, avatars.

## Depth

Surfaces separate by tone and a `line` hairline. Use `shadow-card` only when a card sits on photography or on `bg` without a border; use `shadow-overlay` for sheets, dialogs, toasts and menus. No blur, glass or gradient surfaces. Under Reduced Transparency nothing changes, because nothing is translucent (the `scrim` is the one tinted layer and stays tinted).
