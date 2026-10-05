# Decisions and config flags (25 Sep 2026)

The full wording of every decision is in `design/phase-0-register.md` → "Decision and source register". This page tells the build team **what to build now** for each one.

## Pending client confirmation — build behind config

The owner has given a direction on these four, but the client hasn't confirmed. The design (canvas, routes, fixtures) is **unchanged** until they do. Build so either answer is a settings or data change.

| ID | What the design shows (v1.2) | Owner direction (pending) | Build now | Config |
| --- | --- | --- | --- | --- |
| D33 Booking | Two modes. Hand-off to Fresha is the default; in-app booking is designed for a future booking system with an API | Booking happens only in Fresha; the clinic accepts and manages bookings there | Build hand-off first (BKG-01, 10, 12, 08, 09; hand-off states of HOM-02/03, TRT-05, VIS-01/02/06, STF-23/24). Build in-app booking **last and only if an API is chosen** (M9) | `settings.bookingMode` = `handoff` (default) \| `inapp`. Routes with `bookingMode: inapp` in `routes.json` are unreachable in hand-off |
| D34 Staff roles | Three roles: Owner, Editor, Front desk (a person can hold several) | One role: everyone with staff access gets the full admin panel; audit log stays | Implement roles as a **server-side permission map** (role → allowed actions). Screens ask "can I do X?", never "am I an Editor?" | One-role answer = give every staff member the Owner permission set. No code change |
| D35 Approval | Owner publishes after a confirm step; Editor submits to Owner; optional second approver for price, policy and offer terms (off) | No approval step at all; staff publish after a confirm step | Build publish-with-confirm (STF-09 self-publish) as the main path. Build Submit / STF-08 queue as a path that only appears when a user lacks publish permission or `secondApprover.on` is true | `settings.secondApprover.on` (default `false`). With one role (D34), nobody ever sees Submit or the queue |
| D38 Membership | Hidden by default; WAL-01 row and WAL-05 only for customers with an active old-app membership | Not shown anywhere, even for old-app members; the desk handles benefits | Build WAL-05 and the WAL-01 row behind a flag | `features.legacyMembership` default **`false`** (hidden) until the client confirms. See open-items: this default is my recommendation — owner to confirm |

## Confirmed — build as designed

| ID | Decision | Build note |
| --- | --- | --- |
| D36 | Archive, don't delete. Drafts can be deleted; anything a customer booked, bought or saw is archived and restorable, with confirm and audit | Spec 2 in the Phase 7 doc; STF-39 dialog; PublishState statuses |
| D37 | Rules become settings (A1–A8, payment switches) edited in STF-31/32; customer screens read them | Spec 1; `fixtures.json → settings` has the sample values |
| D39 | Staff screens phone-first, two-column tablet layout for long forms (TAB-01–07); no web admin | Tablet breakpoint 768 pt / 600 dp |
| D40 | Services typed by hand or imported from a Fresha export; import optional | STF-41/42; both paths must work |
| D28 | Navigation Option B: Home, Treatments, Visits, Wallet + Book button + profile button | To be usability-tested later (D31) |
| D22, D30 | Logo is only the full "nano BEAUTY" lockup; app icon = master square (white on plum), logo at 80 % width | Icon export zip is not in this pack — see open-items |
| D24 | Fonts Fraunces + Sora (SIL OFL, free) | `design-system/fonts/` |
| D12 | English only, portrait; address 555 6th St #130, New Westminster | |
| D26, D32 | Design first; real clinic rules and copy/price sign-offs come during the build; samples stay badged | |
| D01–D11, D14, D21, D23, D27, D29, D31 | See Phase 0 register | D01: favourites and recent views are out of v1. D31: usability tests postponed |

## Older decisions replaced for the build

| Old | Replaced by | Why it matters |
| --- | --- | --- |
| D13 Fresha API or hand-off (Open) | D33 | Hand-off is the default; don't wait for an API |
| D17 Existing member status visible | D38 | Membership hidden by default |
| D18, D25 Five staff roles and required second approver | D34, D35 | Don't build five roles |
| A1–A8 fixed sample rules (Phase 3) | D37 | Rules are settings, not constants |
| D20 old development starter (v1.0 requirements, separate React/Vite web admin, NANO-02/15/16 prompts) | This handover pack | Don't use the old starter unless the owner re-issues it updated — see open-items |

## Other settings with safe defaults

| Setting | Default | Where |
| --- | --- | --- |
| `paymentMethods` | card on; Apple Pay, Google Pay, Klarna, Affirm off | STF-32 → PAY-01 |
| `financingLine.on` | off | STF-32 → TRT-05 |
| `ratingLine.on` | off | STF-34 → HOM-01, TRT-05 |
| `gift.expiry` | none (locked; BC gift-card law) | STF-17 |
| `deletionGraceDays`, `giftRefundDays` | 30, 14 (Sample) | STF-33, STF-17 |
