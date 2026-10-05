Nano Beauty is a clinic-owned iOS and Android app for a medical spa at 555 6th St #130, New Westminster, BC. It is calm, precise and warm, like a good clinician: editorial serif headlines for a moment of care, clear sans-serif for everything a person acts on, one Nano-violet action per screen, and surfaces people can trust with their time and money. One system serves both platforms, light and dark, customers and staff.

## Principles

- **Truth before delight.** Never show a booking, payment, balance or result as done before the authoritative system confirms it. No optimistic success, no count-ups, no confetti.
- **One clear next step.** One `primary` button per screen. Home leads with the next appointment or with booking, never with a feed.
- **Protected surfaces.** Prices, booking, wallet, consent and aftercare sit on opaque `surface` panels. No glass, no blur, no text over busy photos.
- **Editorial, not decorative.** Serif (`display-*`, `title-*`) for short human headlines; sans (`body`, `label`, `headline`) for anything functional. Whitespace does the styling.
- **Care has limits.** No diagnoses, promised outcomes or clinical data collection. Clinical copy comes only from the clinic's approved content.

## Content fundamentals

- **Voice:** warm, plain, confident. Speak as "we" (the clinic) to "you". Short sentences. No exclamation marks, no urgency ("Hurry!"), no superlatives ("best", "miracle"), no emoji.
- **Casing:** sentence case everywhere, including buttons and titles ("Book appointment", "Your next visit"). `overline` is the only uppercase, applied by the style, not typed.
- **Buttons:** verb first, 1–3 words: "Book appointment", "Add to calendar", "Try another method". Never "OK", "Submit" or "Click here".
- **Money and time:** CAD with the locale formatter ("$1,250.00"); dates as "Thu 16 Oct", times as "2:30 pm"; expiries always absolute with timezone ("Ends 31 Oct, 11:59 pm PT").
- **Errors:** say what happened, whether money moved, and what to do: "Your card was declined. Nothing was charged. Try another payment method." Never blame, never "Invalid input".
- **Clinical wording:** "may help with", never "cures", "guaranteed" or before/after claims. Every treatment description, preparation and aftercare text has a clinical reviewer.
- **Names:** the app is **Nano Beauty**. The clinic's legal/site name Nano Beauty Star appears only in legal and store metadata.
- **Placeholders stay honest:** sample data carries a `Sample` badge; missing photos show "photo pending"; unconfirmed policies say "clinic to confirm".

## Visual foundations

- **Colour:** warm porcelain `bg` in light and warm plum-black `bg` in dark. Text is `ink`; editorial headlines `ink-display`; secondary text `ink-muted`. Nano violet `primary` marks the single main action, selected state and links; `on-primary` sits on it (white in light, dark ink in dark). Lavender `surface-tint` holds offers, clinic credit and member status. Logo plum `surface-brand` is for the hero, gift card face and splash. Status tokens (`success`, `warning`, `danger`, `info` + `-soft`) always appear with an icon and a word.
- **Type:** Fraunces for `display-lg`, `display-md`, `title-lg`, `title-md`, `accent-italic` (six words or fewer). Sora for `headline`, `body-lg`, `body`, `label-lg`, `label`, `caption`, `overline`, `amount`. Nothing smaller than 13px (`caption`).
- **Layout:** 4-point spacing. Screen gutter `space-5`; card padding `space-4`; between sections `space-8`. Portrait phone first, max readable column `content-max`.
- **Shape:** buttons and chips are pills (`radius-full`); inputs and banners `radius-md`; cards and photos `radius-lg`; sheets `radius-xl`.
- **Depth:** tone and hairline (`line`) separate surfaces. Only floating layers use `shadow-overlay`. `shadow-card` in dark becomes a hairline.
- **Focus:** `focus-ring` everywhere (a 2px ground gap, then 2px solid `focus`), at least 3:1 on every surface in both themes.
- **Imagery:** the clinic's own photography from nanobeautystar.com (`assets/Imagery`): the lavender treatment room, the team, treatments in progress. Cropped by `PhotoFrame`. No stock-spa clichés, no before/after in marketing surfaces.
- **Motion:** short, functional, reversible (`duration-feedback` to `duration-overlay`, `ease-enter`/`ease-exit`). Native navigation and sheets keep platform motion. Reduce Motion removes movement and keeps meaning.

## Logo

The logo is always the complete "nano BEAUTY" lockup from the master artwork, never "nano" alone. The master square (`Logo variant="frame"`, `assets/Logos/nano-beauty-logo-master.svg`) is used exactly as supplied for the app icon, splash and store listing. Inside screens use the lockup in `ink-display` on light grounds or `on-brand` on `surface-brand`.

## Iconography

Phosphor Icons, Regular weight, 20px in rows and buttons, 24px in bars; Fill only for the selected tab. Icons inherit text colour and never replace a word for a status. No emoji. The curated set is in `assets/Icons`; the bundle's `Icon` component carries the full set used by components.

## Customers and staff

Customers and staff share one app and one system. Staff screens always start with `StaffBar` on the deep plum `staff` band so they can't be mistaken for the customer app. Staff tools are reached from Account after the server confirms a role, never through a customer tab.

## What is decided and what is not

Decided: name, logo, warm editorial direction, light and dark, one system for iOS and Android, English at launch, portrait, the in-app staff workspace, and navigation: Home, Treatments, Visits, Wallet tabs plus a Book button and a profile button (D28). **Not decided:** the booking mechanism with Fresha, payment providers, legacy data access. Components for those flows are designed but conditional; screens using them are reference frames, not sign-offs.
