# Manual QA checklist (devices)

Run on: one mid-range Android (Android 10+, 6 GB RAM class, e.g. Pixel 6a / Galaxy A54), one supported iPhone (iOS 17+,
e.g. iPhone 12), one iPad (staff forms) and one Android tablet ≥ 600 dp. Record the build number, device and OS, and mark
each line Pass / Fail (with issue link) / N/A. **Status today: not run** — no device or emulator has been available
(see readiness report).

## Accessibility (NFR 01, WCAG 2.2 AA)

| # | Check | iOS | Android |
|---|---|---|---|
| A1 | VoiceOver / TalkBack: every control on Home, Treatments, Book, Pay, Wallet, Visits, Account and Staff home is announced with a meaningful name and role (button, tab, switch, radio, checkbox) | | |
| A2 | Focus order follows the visual order; modal dialogs and sheets trap focus and return it on close | | |
| A3 | Async states (paying, checking with Fresha, sending) are announced (live region) | | |
| A4 | Largest text size (iOS AX5 / Android 200%): no clipped text, no overlapping controls; screens scroll | | |
| A5 | Bold text, increased contrast and dark mode: all text readable (contrast pairs are unit-tested) | | |
| A6 | Reduce motion on: toast and transitions don't animate | | |
| A7 | Touch targets ≥ 44 pt / 48 dp (chips, list rows, icon buttons, OTP boxes) | | |
| A8 | Error messages are tied to their field and announced | | |

## iOS

| # | Check | Result |
|---|---|---|
| I1 | Safe areas on notch/Dynamic Island devices and iPad: nothing under the status bar or home indicator | |
| I2 | Swipe-back works on stack screens; modals (book, pay, auth) close by swipe-down and Cancel | |
| I3 | Offer terms open as a page sheet with detents; keyboard pushes fields up (OTP, Ask us, staff forms) | |
| I4 | Add to calendar uses the write-only system sheet | |
| I5 | Push permission asked only from the primer/notifications screen; a tapped push opens the right screen | |
| I6 | iPad: app runs full screen (portrait); staff forms use two columns | |

## Android

| # | Check | Result |
|---|---|---|
| D1 | Edge-to-edge: content isn't hidden under status/navigation bars (gesture and 3-button nav) | |
| D2 | Predictive back gesture shows the previous screen and works in modals | |
| D3 | System back closes dialogs/sheets before leaving the screen | |
| D4 | Keyboard doesn't cover focused fields (OTP, forms, staff editors) | |
| D5 | Calendar uses the insert intent; no calendar permission requested | |
| D6 | Fresha opens in a Custom Tab and returning resumes the check (BKG-09) | |
| D7 | Tablet ≥ 600 dp: staff forms in two columns | |

## Journeys and interruptions (NFR 12)

| # | Check | iOS | Android |
|---|---|---|---|
| J1 | Guest → sign in → consents → profile → match → Home | | |
| J2 | Book via Fresha hand-off, leave the app during Fresha, come back (return check resumes) | | |
| J3 | Buy a gift card (test card) and a package; kill the app during payment; reopen → status recovers | | |
| J4 | Airplane mode: cached content readable; any purchase, request or redemption is refused with the offline state | | |
| J5 | Session expiry: signed out with the AUT-08 message; nothing personal stays on screen | | |
| J6 | Deep links: `nanobeauty://visits/<id>`, gift link, unknown link → Home "Link not found" | | |
| J7 | Staff: Owner publishes a price change with second approver on; Editor submits; Front desk redeems a session | | |
| J8 | Upgrade from the previous build: session, settings and pending hand-off survive | | |

## Performance (NFR 02, measure on the mid-range Android)

| # | Measure | Budget | Result |
|---|---|---|---|
| P1 | Cold start to Home interactive (release build) | ≤ 2.5 s Android, ≤ 2 s iPhone | |
| P2 | Tab switch / screen open | ≤ 300 ms | |
| P3 | Treatment search per keystroke | ≤ 16 ms (unit-tested on 1,000 items) | |
| P4 | API p95 for reads (hosted, staging) | ≤ 500 ms | |
| P5 | Memory after 5 min of browsing | no growth trend | |
