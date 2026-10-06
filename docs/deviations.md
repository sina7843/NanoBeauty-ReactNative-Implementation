# Deviations from the boards

Every place the build differs from a board or component spec, with the reason (handover CLAUDE.md →
"Working conventions"). Design QA (Phase 8) checks against this list.

| Board / component | Deviation | Reason | Revisit |
| --- | --- | --- | --- |
| ENT-02, ENT-03 "Call the clinic" | Opens the dialer with `clinic.phone` instead of linking to SUP-03; hidden while `clinic.phone` is `null`. | SUP-03 is built in NANO-03; the clinic phone is still a placeholder (open-items C7), and dialling nothing would be a dead end. | NANO-03 (route to SUP-03 if preferred) |
| ENT-02 "Update now" | Disabled on iOS until the server supplies `app.storeUrl.ios`. Android falls back to `market://details?id=<package>`. | The App Store ID doesn't exist yet. | NANO-11 |
| ENT-03 maintenance time | "about 11 pm PT" on the board is rendered from the server's `app.maintenance.until` in the clinic time zone. | Times come from server data, never constants. | — |
| ENT-04 timing | Shown once after first launch, only while the OS notification permission is undetermined. | Board doesn't specify timing; avoids repeated prompts. | NANO-09 (may move after first booking) |
| TopBar `large` | Top-level tabs render a static serif large title in content; it doesn't collapse into the bar on scroll yet. | Native large titles can't use the serif token on Android; collapse behaviour lands with the real tab screens. | NANO-03 |
| TabBar label weight | Unselected labels use the same 12/16 semibold `overline` metrics as selected ones (web reference uses 500). | No 12 px medium token exists; selection is still carried by fill icon, pill and colour. | Design QA |
| Badge text | Uses `overline` size/weight in sentence case. | Badge spec is 12/16 semibold; `overline` is the only 12 px token. | — |
| Motion | React Native `Animated` + token durations/easings instead of Reanimated. | Only the toast animates in NANO-01; avoids a native dependency until needed. | When a screen needs gesture-driven motion |
| Storybook | Dev-only route `/dev` (component showcase with light/dark/system switch) instead of Storybook. | Storybook for React Native adds a second app entry and native config for little gain here. | — |
| AUT-08 expired | The "signed out after 30 days" copy is shown for every server-ended session (30-day limit, sign-out elsewhere, refresh-token replay). | Only one board state exists; it stays true that the person must sign in again and nothing was lost. | Copy review |
| AUT-08 limited "Call the clinic" | Opens the dialer with `clinic.phone`; hidden while the number is a placeholder. | Same as ENT-02/03. | NANO-03 |
| AUT-01/02 short waits | "Try again in {n} seconds." when a code is requested inside the 30 s resend window. | No board state; wording follows the OTPInput README ("Rate limits read as time, not blame"). | Copy review |
| AUT-03 "Read the terms" | Opens `/legal/terms` (ACC-11), still a placeholder. | Real terms/privacy text is release blocker R1 (AUTH 10). | NANO-03, before release |
| AUT-03 → AUT-07 order | Consents and profile come before the match; "Create a new account" on AUT-07 finishes sign-up instead of returning to AUT-03. | The name is needed to compare with the old record; consents are already recorded. | — |
| AUT-05…07 without the old app | The match step is skipped rather than showing "We couldn’t find a past account". | No search happened; claiming "not found" would be untrue (C3 export pending). | When the legacy export is connected |
| AUTH 07 biometrics | Not implemented. | "Should" requirement with no board or copy; to be designed with ACC-03 (NANO-05). | NANO-05 |
| HOM-02 / HOM-03 signed-in Home | Shows "Welcome back, {name}", the next visit pass when Fresha shares bookings (otherwise "Your bookings are in Fresha") and server offers; no "Your value", care reminder or Messages bell yet. | Balances are the wallet (NANO-06), Inbox NANO-05. Nothing personal is shown that the server hasn't provided. "Good morning" needs time-of-day variants that have no copy. | NANO-05/06 |
| HOM-01 concern chips | Labels are the catalogue concern names (e.g. "Loose skin" where the board shows "Skin tightening"). | Chips come from server content (concern `homeRank`), not constants. | Content |
| TRT-02 empty state | Body is "Try removing a filter." without the board's example sentence. | The example named a specific filter combination. | — |
| TRT-03 price filter | "Price range" covers from-, range- and per-unit prices; filters open as a native page sheet (iOS) / full modal with Back (Android). | Board offers three price groups for five price kinds. | — |
| TRT-05 "Preparation" | Opens the service's care steps in a sheet (CareTimeline + urgent line); CAR-01 (`/care/[visitId]`) shows the same steps for a visit. | Care plans are per service in the catalogue; there is no per-visit plan data yet. | When per-visit care exists |
| OFR-01 paused | Body is "The clinic has paused this offer for now." without "Packages are still available at the regular price." | That sentence was specific to the sample laser offer. | Campaign copy field |
| OFR-03 | Adds a "notyet" state ("This code starts on {date}."); the valid state's button is the linked offer's own CTA (none for codes without a campaign). | A scheduled code is neither invalid nor ended; CTAs come from the campaign. | Copy review |
| SUP-03 "sent" toast | Not built: "Text" opens the phone's messages app; Call/Text are hidden until the clinic phone exists. | In-app messaging is the Inbox (ACC-04/05, NANO-05). | NANO-05 |
| SUP-04 / SUP-05 | Sending needs a signed-in customer (guests go to sign-in first); SUP-05 says "by email" / "in the app" for those channels. | The clinic needs to know who to reply to; the board only shows the text variant. | Copy review |
| Imagery | The nine approved website photos are bundled in the app and referenced by key. | Media storage arrives with STF-36 (NANO-07); rights still to confirm (R07). | NANO-07 |
| BKG-01 basket total | The total reads "From $…" whenever any line has a starting price; consultation lines use `settings.consultation.priceCAD`; the 3-hour limit is a constant (`MAX_VISIT_MINUTES`). | Fresha sets the final price and what fits; no setting exists for the visit limit. | When the clinic confirms a visit-length rule |
| BKG-08 prefill | Nothing is passed to Fresha: the link opens the clinic's Fresha page and the basket is not carried over; the board's "What we try to carry over" list stays with its Assumption badge. "Continue to Fresha" is disabled with an explanation when `FRESHA_BOOKING_URL` isn't configured. | What Fresha accepts is unconfirmed (E2); inventing URL parameters would be guessing an API. | When Fresha prefill is confirmed |
| BKG-08 stepper | The three-step stepper is not shown. | The steps after hand-off happen in Fresha, so step 2/3 can't be tracked. | — |
| BKG-09 "Booked, but not showing yet" | The state is supported end to end but the server never produces it yet. | It needs Fresha to tell us a booking exists before it is readable (webhook); with polling only, "not yet" is the truthful answer. | When a Fresha webhook exists |
| BKG-09 failed check | A network failure while checking shows the "not yet" state with Check again and help. | No evidence either way: neither "booked" nor "failed" would be true. | — |
| BKG-12 | "Don't show this again" is a switch; every hand-off entry point goes through BKG-12, which steps straight to BKG-08 once dismissed. | Keeps the first-time rule in one place. | — |
| VIS-02 late banner | Variants without a deposit amount, with "keep deposit" and with no charge are new copy built from settings (`lateCancelOutcome`) and the visit's deposit. | The board only shows the "$50 becomes clinic credit" variant. | Copy review |
| VIS-06 request composer | Adds "Ask to move it" / "Ask to cancel" with a message, sent to the clinic queue, and a "Sent to the clinic" confirmation with a reference. Copy is new. | BOOK 18 requires late changes to reach the clinic queue; the board only offers call/text. A request never changes the visit by itself. | Copy review |
| VIS-01 cancelled visits | Cancelled upcoming visits are listed under Past. | Upcoming lists only visits that will happen. | — |
| Visits offline copy | Visits are cached in AsyncStorage (`nano.private.visits`), wiped on sign-out and session expiry. | VIS-01 "offline" state; secure storage is too small for a list. Contains treatment names and times only, no tokens. | — |
| Add to calendar | iOS asks for write-only calendar access before showing the system sheet; Android uses the insert intent with no permission. A denied or failed calendar shows a short toast. | No broad calendar read permission (guideline 08). | — |
