# Build plan (proposal for the tech lead)

Milestones in build order. Each ticket names the boards it covers; routes, states, modes and roles for each board are in `screen-index.md`. The tech lead owns estimates and may reorder, but keep M0 first and M9 last: M9 (in-app booking) only happens if a booking system with an API is chosen (D33).

## Definition of done (every screen ticket)

- [ ] Matches the board in light and dark, iOS and Android (native navigation, back, keyboard, safe areas).
- [ ] Every Tweaks state on the board is implemented and reachable (loading, empty, offline, error, conflict, mode, role…).
- [ ] Copy is exactly as on the board; Sample / Assumption badges kept where the board shows them.
- [ ] Tokens only; components match `components/index.d.ts` names and props.
- [ ] Rules and prices come from settings or content, not constants.
- [ ] Truth-first: no success state before the server (or Fresha sync) confirms.
- [ ] Accessibility: labels, 44 pt / 48 dp targets, font scaling, Reduce Motion, screen reader order.
- [ ] Analytics events from spec 4 fire with the right consent; no personal data in properties.
- [ ] Staff screens: permission checked on the server, audit entry written, 409 conflict handled.
- [ ] Any difference from the board is logged in `docs/deviations.md`.

## M0 — Foundations (before any screen)

| Ticket | Scope |
| --- | --- |
| M0-1 Repo and app shell | Expo + TypeScript + Expo Router, environments (dev/staging/prod), CI, EAS builds, crash reporting |
| M0-2 Design tokens and theme | Import `nano-tokens.ts`; light/dark via semantic tokens; Fraunces + Sora; `phosphor-react-native` |
| M0-3 Core components | Native versions of the base set: Button, IconButton, TopBar, TabBar, ListRow, ListGroup, Card, Badge, Banner, TextField, Switch, Chip, SegmentedControl, Sheet, Dialog, Toast, Skeleton, EmptyState, AsyncStatus, PriceTag, PhotoFrame, Logo. Storybook (or similar) page per component with all states |
| M0-4 Navigation shell | Option B: Home, Treatments, Visits, Wallet tabs; Book button; profile button; modal stack for `/book/*` and `/pay/*`; deep-link handling (unknown link → Home with note) |
| M0-5 Settings and flags | Fetch settings at launch (spec 1) with cached fallback; feature flags from decisions-and-flags.md; fixtures loader for dev |
| M0-6 Cross-cutting | Offline detection and cached reads, error mapping (401/403/409/5xx), analytics wrapper with consent gate, i18n-ready string files (English only) |
| M0-7 Entry | ENT-01–04 (splash, update required, maintenance, notification primer); ICN-01 app icon (export set in `assets/app-icon/final/`) and splash |

## M1 — Sign-in and account basics

AUT-01–08 (phone, code, consents, profile, matched / mismatch / not found, session expired and rate limited). Consents stored with version and time. Staff role grant arrives with the session. Depends on: OTP/SMS vendor (open-items E3).

## M2 — Browse and content

| Ticket | Boards |
| --- | --- |
| Home | HOM-01 (Main), HOM-02, HOM-03 (hand-off states first) |
| Treatments | TRT-01–07 (tab, list, filters, search with aliases, detail with FAQ, professional, unavailable/archived) |
| Offers | OFR-01–04 (offer, terms, promo code with all error states, ended/upcoming) |
| Care | CAR-01 |
| Support | SUP-01–05 (hub, article, contact, Ask us, sent) |
| Legal | ACC-11 (versioned, offline copy) |

## M3 — Booking, hand-off mode (launch path)

BKG-01 (multi-select basket in hand-off: Continue in Fresha), BKG-10 (areas and total), BKG-12 (how booking works, first time), BKG-08 (hand-off, in-app browser), BKG-09 (return check: checking / confirmed / not yet / not showing). Hand-off states of VIS-01, VIS-02, VIS-06 (late change request to the clinic). Depends on: what Fresha passes in (prefill) and whether visits can be read back (sync) — open-items E2. Until known, show the "not synced" states and Open Fresha.

## M4 — Account, privacy, inbox

ACC-01–10 (account, profile with phone re-verify, notifications preferences, inbox and message, privacy, data request, delete account explain → confirm with code → requested/completed).

## M5 — Payments and wallet

| Ticket | Boards |
| --- | --- |
| Payment | PAY-01–09 (method list from settings, card, provider hand-off, waiting, paid, declined, cancelled, timeout, receipt). Idempotent retries — a retry never charges twice. In hand-off mode (default) the booking deposit is paid in Fresha, so the app's payment flow covers packages and gift cards; deposits go through the app only if in-app booking is switched on (M9) |
| Wallet | WAL-01–04, 06, 12 (wallet, credit, package, gift card, history incl. counter redemptions, balance help) |
| Buy | WAL-07 (package), WAL-13 → 08 → 09 → 10 (gift: design, value, recipient, review) |
| Claim | WAL-11 (in app), WEB-01/02 (web claim — host pending, open-items C6) |
| Membership | WAL-05 and WAL-01 row behind `features.legacyMembership` (D38) |

Depends on: payment provider (E4), old-app balances (C3).

## M6 — Staff workspace: core and content

| Ticket | Boards |
| --- | --- |
| Staff home and access | STF-01 (sections by permission), STF-14 (no permission), StaffBar |
| Team and audit | STF-13, STF-38, STF-12 |
| Services and taxonomy | STF-02, STF-03 (+ TAB-01), STF-04, STF-40 (FAQ) |
| Archive/delete | STF-39 dialog for every list (spec 2) |
| Media | STF-36 (upload, alt text, rights confirmed) |
| Import | STF-41, STF-42 (+ TAB-07) |
| Publish flow | STF-09 self-publish confirm; STF-08 queue only when needed (D35) |

## M7 — Staff workspace: selling and operations

| Ticket | Boards |
| --- | --- |
| Campaigns | STF-05 (list, calendar), STF-06 (+ TAB-02), STF-07 preview |
| Packages | STF-15, STF-16 (+ TAB-03) |
| Gift cards | STF-17 settings, STF-18 actions (void is Owner only) |
| Promo codes | STF-19, STF-20 |
| Professionals | STF-21, STF-22 (+ TAB-04) — bios and photos only with consent |
| Today and requests | STF-23, STF-24 (hand-off: "move it in Fresha, then mark done") |
| Counter redemption | STF-25, STF-11 value lookup |
| Customers | STF-26, STF-27, STF-28 account match |
| Inbox | STF-29, STF-30 |
| Settings | STF-31 clinic info, STF-32 rules (+ TAB-05), STF-33 policies (versioned), STF-34 Home layout |
| Push and reports | STF-35 (+ TAB-06; opted-in audience only), STF-37 |

## M8 — Notifications and analytics

NTF-01–12 templates (push, text, email) with triggers from spec 3; quiet hours; deep links. Analytics map (spec 4) verified end to end. Decide one reminder sender — Fresha or the app — so clients don't get two (open-items E6).

## M9 — In-app booking (only if D33 changes)

BKG-02–07, BKG-11, VIS-03 (reschedule), VIS-04/05 in-app paths, STF-23 appointments list. Needs a booking system with an API. Skip entirely if the client confirms hand-off only.

## M10 — Release

Store listings, screenshots, privacy labels / data safety form, reviewer demo account, privacy policy and terms URLs, Google Play account-deletion URL (WEB-03/04 or equivalent), TestFlight / Play internal testing, Phase 7 QA checklist, Phase 8 design QA against the canvas. See open-items R1–R6.

## Motion

MOT-01–08 are playable prototypes; recipes and Reduce Motion alternatives are in Phase 7 → "Motion recipes" and guideline 06. Apply them within the milestone that owns each screen.
