# Motion

Motion makes an action feel answered, explains where something came from, and reports the **true** state of an operation. It is calm and short. Values are proposals until the Phase 5 device review.

## Tokens

| Token | Value | Use |
|---|---|---|
| `duration-none` | 0 ms | Immediate change; Reduce Motion fallback |
| `duration-feedback` | 120 ms | Press, focus, selection |
| `duration-state` | 180 ms | Chip, tab, icon and inline status changes |
| `duration-reveal` | 240 ms | Inline expansion, toast |
| `duration-overlay` | 280 ms | Custom sheet/dialog only where native isn't available |
| `duration-navigation` | 320 ms | Reference only; the native navigator owns route transitions |
| `duration-reduced` | 80 ms | Max fade under Reduce Motion |
| `ease-enter` | cubic-bezier(0.2, 0, 0, 1) | Entrances |
| `ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Exits |
| `ease-state` | cubic-bezier(0.2, 0, 0, 1) | State changes |

Movement is at most 8–16pt on small surfaces. No global spring value: gestures (back swipe, sheet drag) use the platform's own physics.

## Patterns

| Pattern | Normal | Reduce Motion | Truth rule |
|---|---|---|---|
| Tab change | Selected pill and fill icon change, `duration-state` | Instant | Selection is also bold label + fill icon |
| Button/chip press | Tint change `duration-feedback`; no scale bounce | Instant | Cancelled press reverts |
| Content load | Static skeleton; optional 120 ms fade-in of real data | Direct render | Never animate stale or sample data as personal |
| Slot selection | Fill `duration-feedback`; step change fades, focus moves to new heading | Instant, focus still moves | Selecting reserves nothing; hold shown only after the server creates it |
| Slot lost / hold expired | Banner appears in place | Same | Say what happened and that nothing was charged |
| Field error | Border and message appear together | Same | No shake, no flash |
| Sheet / dialog | Native presentation; custom ones `duration-overlay` + `ease-enter`, exit `ease-exit` | Cross-fade | Unsaved transactional input asks before dismiss |
| Toast | Rise 8pt + fade, `duration-reveal` | Fade only | Never for money/booking results |
| Payment / provider return | Spinner only while pending; result cross-fades | Static status text | No success before provider confirmation; no confetti |
| Wallet balance | Value swaps once after ledger confirms | Same | Never count up or roll numbers |
| Campaign expiry | Countdown text updates as data | Absolute time only | Server time; expired → safe destination |
| Staff publish/reject | Badge changes state after server success | Instant | Failed publish keeps the draft and says why |

## Haptics

Light impact on selecting a time slot and toggling a switch; success notification haptic only when a booking or payment is **confirmed**; error haptic on a failed payment. No haptics for scrolling, loading or marketing. Respect the system's haptics setting.

## Accessibility

Honour Reduce Motion (iOS) and Remove animations / animator scale 0 (Android), including changes while the app is open (`AccessibilityInfo` listener). Nothing auto-advances; no carousels that move on their own; nothing flashes. Any motion can be interrupted by Back, a new tap or screen-reader focus.

## React Native

Use Reanimated with `Easing.bezier(...)` from `export/nano-tokens.ts` (`easing`, `duration`) and `useReducedMotion()`. Let Expo Router and native sheets animate themselves.
