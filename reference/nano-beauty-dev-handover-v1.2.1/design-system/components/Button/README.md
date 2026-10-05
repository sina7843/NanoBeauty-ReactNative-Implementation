# Button

Pill-shaped buttons; one `primary` per screen for the thing the screen is for.

**Variants**
- `primary` — Nano violet fill, `on-primary` label. Book, Continue, Pay, Confirm, Approve.
- `secondary` — outlined on `surface`. Parallel or reversible actions (Add to calendar, Request changes).
- `tertiary` — text only. Low-emphasis navigation (View details, Terms).
- `destructive` — `danger` fill. Only on the final confirmation of cancelling, deleting or rejecting, never as the first tap.

**Sizes:** `sm` 36 (visual; hit area still 48), `md` 48, `lg` 56 for screen-ending actions pinned above the safe area.

**States:** enabled, pressed (`primary-pressed` / `surface-pressed`), focus (`focus-ring`), disabled (`surface-muted` + `ink-disabled`, explain why nearby), loading (spinner + progressive label such as "Confirming…"; width holds; the button is inert until the server answers).

**Props:** `variant`, `size`, `icon`, `iconAfter`, `loading`, `loadingLabel`, `disabled`, `fullWidth`, `children` (the label).

**Copy:** verb first, sentence case, two or three words: "Book appointment", not "BOOK NOW!".

**Motion:** press feedback `duration-feedback`; no scale bounce; loading never shows success before the authoritative response (BOOK 07, PAY 06–07).

**RN:** `Pressable` with `android_ripple={{color: tokens.surfacePressed}}` on Android, opacity/tint highlight on iOS; `accessibilityRole="button"`, `accessibilityState={{disabled, busy}}`.
