# NANO-12 fix brief: QA pass of 10 Oct 2026

This is the work order for fixing every issue found in the 10 Oct 2026 QA pass in one Claude Code
session. It is written for Claude Code. Read it fully before editing.

- Repo: `sina7843/NanoBeauty-ReactNative-Implementation` at `8e72539` (NANO-11), Expo SDK 57, RN 0.86.
- Found on: Samsung Galaxy S21 FE (Android) in Expo Go, plus a full code audit of all 158 designed
  screens, the design system and a live run of the API and web pages.
- Totals: 7 detailed issues + 1 font item + 125 audit findings
  (6 High, 54 Medium, 65 Low). Only code bugs are listed;
  documented deviations and missing clinic content are out of scope (D-QA-09, D-QA-06).
- Owner decisions: `qa/2026-10-10/DECISIONS.md` (binding; copy into repo `DECISIONS.md`).
- Machine-readable list: `qa/2026-10-10/findings.json` (`[id, severity, confidence, screens, title, problem, code]`).
- Human report with screenshots: `Nano Beauty QA findings.html` in the handover zip (`report/`).

## Rules for this pass

1. Obey `CLAUDE.md`, except where `qa/2026-10-10/DECISIONS.md` overrides it (fonts: D-QA-02).
2. Source precedence for "what is correct": `DECISIONS.md` rows D-QA-* → `IMPLEMENTATION_DECISIONS.md`
   → `Requirements.md` → `reference/nano-beauty-dev-handover-v1.2.1` (canvas `<ID>.dc.html`,
   `renders/light/<ID>.webp`, `design-system/components/bundle.js` + `bundle.css`, component
   READMEs, guidelines) → repo conventions.
3. Before fixing an item, open its design reference and the code location, confirm the bug still
   exists, then fix it. If an item turns out not to be a bug, mark it `not a bug` with one line why.
4. Fix shared components once (Phase 2) before screen items that depend on them.
5. Keep truth-first behaviour: never fake booking, payment, redemption or delivery success.
6. Add or update tests for every logic fix (API: vitest on PGlite; mobile: jest-expo). Visual-only
   fixes need no snapshot tests.
7. If a fix needs a product decision that is not in this brief, make the smallest reasonable
   assumption, add it to the "Decisions taken during NANO-12" table in `qa/2026-10-10/DECISIONS.md`
   and to repo `DECISIONS.md`, and list it in the final report.
8. New intentional differences from the boards go in `docs/deviations.md`. Fix out-of-date rows there.
9. Paths below: `app/`, `components/`, `staff/`, `auth/`, `payments/`, `booking/`, `platform/`,
   `i18n/`, `theme/`, `catalog/`, `account/`, `settings/` are under `apps/mobile/src/`; `apps/api/...`
   and `packages/...` are from the repo root. Line numbers are from `8e72539` and may drift.
10. Tick the `- [ ] **Status:**` box of each item in this file as you go (open → fixed / not a bug /
    blocked: reason), so the file is the progress record.

## How to run and test

- No Docker: `npm ci`, `08-START-API.cmd` (in-memory PGlite), `09-START-MOBILE.cmd`.
- Docker (all three services): `docker compose -f compose.docker.yaml up -d --build`. Set
  `NANO_LAN_IP` to the PC's LAN IP for a phone (`$env:NANO_LAN_IP="192.168.x.x"` in PowerShell); the
  API is on :4000, Metro on :8081 (Expo Go: `exp://<NANO_LAN_IP>:8081`). See `docs/docker.md`.
- Sign-in codes: `GET http://localhost:4000/v1/dev/otp?phone=<10 digits>` (no SMS is sent).
- Test numbers: 6045550123 (sample customer, name "Maria Chen" for the legacy match, 3 sample Fresha
  visits), 6045550199 (legacy name mismatch), any other number = new customer. Staff roles are
  granted in SQL: `INSERT INTO staff_roles (customer_id, role) SELECT id, 'Owner' FROM customers WHERE phone_e164 = '+17785550111';`
  (also 'Editor', 'Front desk').
- Gate before finishing: `npm run check` passes (typecheck, lint, tests, config check, release audit).
  Known before this pass: `apps/mobile/src/staff/dates.test.ts` fails in a `node:22-bookworm-slim`
  container (`fromWallInput('2026-12-24 09:00','America/Vancouver')` → 16:00Z, test expects 17:00Z).
  Investigate whether it is the runtime's tz data or the code, and fix or document it.

## Phases

0. **Setup.** Copy the handover overlay into the repo (fonts, Docker files, `qa/`, `prompts/12-…`).
   Copy D-QA rows into `DECISIONS.md`.
1. **Fonts (F-1)** and the **High** items: ISSUE-1, FE-1, WP-1, ST-1, ST-2, ST-3, ST-4.
2. **Shared components** (design-system layer): U-1, U-2, U-3, U-4, ISSUE-2 components
   (GiftDesignPicker, BookingStepper, GiftCard), ISSUE-3 SupportContext, and every `DS-*` item.
3. **Medium** items by area (order of the sections below).
4. **Low** items by area.
5. **Verify and report.** `npm run check`; run the app on an Android device or emulator through the
   main customer journey (Home → Treatments → treatment → Book hand-off → Visits → Wallet → gift →
   Account) and the staff workspace as Owner, Editor and Front desk; update docs.

## Final report (end of session)

Use the CLAUDE.md completion format, plus a table with every ID in this file and its status
(fixed / not a bug / blocked + reason), the decisions you added, and anything needing the owner.

---

## Detailed items (fonts, issues 1–3, tester bugs U-1..U-4)

#### F-1 · High · Brand fonts are not bundled and not enforced

- [ ] **Status:** open
- **Screens:** All screens
- **Expected:** Fraunces + Sora as in the design system, on every screen, every build.
- **Problem:** The repo ships without the six brand fonts, so every screen renders in system fonts (Android: Roboto / Noto Serif). `theme/fonts.ts` loads whatever exists and silently falls back.
- **Code:** `apps/mobile/assets/fonts/ · apps/mobile/src/theme/fonts.ts · apps/mobile/src/app/_layout.tsx:122 · apps/mobile/app.config.ts`
- **Fix notes:** The six TTFs are in this handover (`apps/mobile/assets/fonts/`, see `FONTS.md`; D-QA-02). Make them required: (1) static `require()` map of all six in `theme/fonts.ts` (replace `require.context` discovery); (2) keep the splash up until `Font.loadAsync` resolves; in development a missing or failed font is a red-box error, never a silent fallback; (3) add the `expo-font` config plugin with the six files in `app.config.ts` so development and release builds embed them natively; (4) drop the system FALLBACK path for these families (keep it only if a test renderer needs it); (5) add a test/`config:check` assertion that all six files exist and match `fontFamily` in `@nano/design-tokens`; (6) update `assets/fonts/README.md` and the CLAUDE.md font rule (D-QA-02). Verify on Android: headings render in Fraunces, body in Sora; no `fontWeight` is applied on top of a custom family (use the named face, `strongFace`).

#### ISSUE-1 · High · Bundled photos render at their file size instead of filling their frame

- [ ] **Status:** open
- **Screens:** HOM-01/02/03, OFR-01, TRT-01/02/05/06
- **Expected:** Photo scaled to cover its frame (`resizeMode="cover"`).
- **Problem:** Every bundled photo is drawn at its own pixel size in dp from the top-left of its frame and clipped. React Native Android puts a local asset's width/height first in the Image style; `StyleSheet.absoluteFill` only sets position and insets, so those values win.
- **Code:** `components/Status.tsx:221 · components/Discovery.tsx:66 · app/(tabs)/treatments.tsx:62`
- **Fix notes:** Apply `patches/0001-photoframe-fill-frame.patch` (verified on Android): an explicit `width: "100%", height: "100%"` absolute style for the three Image usages. Evidence: `evidence/issue-1-home-hero-blur.png`.

#### ISSUE-2 · Medium · Gift card design step does not match the design

- [ ] **Status:** open
- **Screens:** WAL-13 (and WAL-08/09/10 step indicator)
- **Expected:** GiftDesignPicker (design-system bundle.js `GIFT_TONES`, `.nb-gdp*` in bundle.css): colour faces thanks #1F6A6E sparkle, birthday #65568A gift, holiday #A8322D star, love #8A5A12 sparkle (also congrats/selfcare), white icon + caption label, 3 columns, face ratio 1.58, selected = 2 px primary ring + check-circle badge, loading = spinner per face. BookingStepper "Step 1 of 4" (Design, Value, Recipient, Review) on all four gift steps. GiftCard preview once selected. Title "Send a gift", heading title-md.
- **Problem:** Tiles are white with outline icons in 2 columns; no colour faces, wrong icons (thanks=star, love=gift), no check badge, no "Step 1 of 4" indicator on any gift step, no GiftCard preview, header "Send a gift card" with no "Wallet" back label, heading displayMd, generic skeleton for loading.
- **Code:** `app/wallet/gift/design.tsx (whole screen) · i18n/en.ts:288 · app/wallet/gift/*.tsx`
- **Fix notes:** Build `GiftDesignPicker` and `BookingStepper` (and `GiftCard`, see DS-10) as shared components from the design-system references. D-QA-05: colour faces are the intended v1 look. Evidence: `evidence/issue-2-*`.

#### ISSUE-3 · Low · "Get help" offers no way to contact the clinic

- [ ] **Status:** open
- **Screens:** SUP-03 (all "Get help" / "Ask the clinic" entry points)
- **Expected:** SUP-03 card: white surface, border, radius; reference in a monospace chip; open/closed banner when hours exist.
- **Problem:** With `clinic.phone` null, Call/Text are hidden (documented) and nothing else is offered: a dead end. SupportContext has no card container and the reference is plain text.
- **Code:** `components/Discovery.tsx:239-284, 362 · app/support/contact.tsx`
- **Fix notes:** D-QA-03: add a link/button to the in-app question form (`/support/ask`, SUP-04) when there is no phone. Card + reference chip per SupportContext in bundle.js/.css. D-QA-06 dev sample phone and hours let Call/Text and the banners be exercised in development. Evidence: `evidence/issue-3-*`.

#### U-1 · Medium · Selected tab highlight is square on every tab except the one selected at launch

- [ ] **Status:** open
- **Screens:** Tab bar (HOM, TRT-01, VIS-01, WAL-01)
- **Expected:** `.nb-tab__pill` 56 × 30, radius-full, surface-tint, identical on all tabs.
- **Problem:** On Android the 56 × 30 pill is rounded on Home (selected at launch) and square on any tab selected later. Unselected pill Views have no background, so Fabric flattens them; when selection adds the background the view is created without the radius.
- **Code:** `components/Chrome.tsx:57, 155`
- **Fix notes:** Always give the pill a background (transparent when unselected) or `collapsable={false}`, and/or use radius = height/2 (15) instead of 9999. Verify on an Android device by switching through all four tabs. Evidence: `evidence/u-1-*`.

#### U-2 · Low · "Awaiting clinic" badge is wider than its content

- [ ] **Status:** open
- **Screens:** VIS-01 visit card
- **Expected:** `.nb-badge` hugs content, `white-space: nowrap`; `.nb-pass__top` space-between with a no-wrap eyebrow.
- **Problem:** On Android the badge on the pending laser visit stretches with empty space on the right. Badge text may wrap (no single-line limit) inside a wrapping row with a `flex: 1` eyebrow and the Sample badge.
- **Code:** `components/Badge.tsx:43-46, 73-81 · components/Booking.tsx:48-53, 250`
- **Fix notes:** See DS-5 (badge `numberOfLines={1}`, header row space-between, eyebrow flexShrink). Verify on Android with "Booked in Fresha" + Sample + "Awaiting clinic".

#### U-3 · Medium · Floating "Book" button sits in a footer strip and cuts the content

- [ ] **Status:** open
- **Screens:** TRT-01, TRT-02, HOM-02, VIS-01
- **Expected:** Absolute floating button right 20, above the tab bar, `shadow-overlay`, over the content; content scrolls underneath with bottom padding so the last item can clear it.
- **Problem:** Book is a Screen footer: a transparent row under the ScrollView, left-aligned, no shadow; the list stops at its edge so the last card looks cut.
- **Code:** `components/Chrome.tsx:123, 152 · components/Button.tsx:131 · app/(tabs)/treatments.tsx:20-24 · home.tsx:43-49 · visits.tsx:21 · treatments/list.tsx:45`
- **Fix notes:** Add a `fab` slot to Screen for tab screens (absolute, right `space["5"]`, bottom `space["4"]` above the tab bar, `elevation.overlay`), plus content bottom inset. Pushed-screen footers stay a bar but get the `.nb-phone__bottom.is-cta` look (surface, top border, 12/20 padding). Evidence: `evidence/u-3-*`.

#### U-4 · Medium · Status bar icons are dark on the plum staff header

- [ ] **Status:** open
- **Screens:** All staff screens
- **Expected:** Light status-bar icons on the staff band in both themes (guideline 08-platforms).
- **Problem:** StaffBar (plum-900) runs under the status bar but the status bar style follows only the system theme, so in light theme the icons are dark on dark plum.
- **Code:** `app/_layout.tsx:71, 103 · components/Staff.tsx:39-44`
- **Fix notes:** Apply `patches/0002-staff-statusbar-light.patch` (verified: typecheck, lint, component tests): StaffBar renders `<StatusBar style="light" />`. Check that leaving the staff workspace restores the theme style.

---

## Audit findings by area

### Sign-in and onboarding (5)

#### FE-1 · High · Leaving sign-up halfway keeps the person signed in, and onboarding is never resumed

- [ ] **Status:** open
- **Screens:** AUT-03, AUT-04
- **Problem:** The session is saved at the code step (app/auth/code.tsx:60). Consents and profile are reached with router.replace (auth/flow.ts:25), the auth stack is a dismissible modal, and Android back / the header back on AUT-04 lead out. The person stays signed in with no terms or text consent and no name, and nothing reads me.next again on launch or Home. iOS also hides the designed Back on AUT-03 (app/auth/_layout.tsx:19), not documented.
- **Code:** `app/auth/code.tsx:60 · auth/flow.ts:15-27 · app/_layout.tsx (auth modal) · app/auth/_layout.tsx:19`
- **Fix notes:** Treat a session as "onboarding incomplete" until `me.next === "done"`. On launch and on every signed-in entry (Home, deep link), route to the pending step (consents → profile → match) instead of the app. Make the consents/profile screens non-dismissible (no swipe-down on the auth modal, no header back, Android back stays on the step or signs out after a confirm). Pair with API-14 so the server refuses customer writes until consents are recorded. Add tests for: leave at consents → relaunch → consents shown.

#### API-14 · Medium · The server doesn't enforce the consent step

- [ ] **Status:** open
- **Screens:** AUT-03
- **Problem:** A customer still at next:"consents" can PUT /v1/me/preferences {marketing:true} (200, marketing consent recorded, now counted in the STF-35 push audience) and can create orders and hand-offs.
- **Code:** `apps/api/src/account/routes.ts:178-201 (no nextStep check on any route)`
- **Fix notes:** Refuse customer write routes (preferences, orders, hand-offs, visit requests, Ask us, gifts) with a 403/409 `onboarding_required` while `nextStep` is consents or profile. Map it in the app to the pending step (FE-1).

#### API-15 · Low · OTP challenges aren't tied to a purpose

- [ ] **Status:** open
- **Screens:** AUT-02
- **Problem:** A challenge from POST /v1/me/phone/start was accepted by POST /v1/auth/otp/verify and created an account and session for that number. Sign-in, phone change, deletion and web gift claim share one checkCode.
- **Code:** `apps/api/src/auth/routes.ts:158-197`
- **Fix notes:** Store a `purpose` on each OTP challenge (signin, phone_change, deletion, gift_claim) and check it in each verify route.

#### API-9 · Low · Rate-limit 429 body has no retryAfterSeconds

- [ ] **Status:** open
- **Screens:** AUT-01, WEB-01
- **Problem:** The per-address limiter returns {code:'rate_limited', message:'…retry in 53 seconds'} and only the retry-after header carries the wait. AUT-01 reads the body field (auth/flow.ts:39, ?? 0) and treats it as "Try again in 0 seconds".
- **Code:** `apps/api/src/app.ts:131-133 · apps/mobile/src/auth/flow.ts:39`
- **Fix notes:** Put `details.retryAfterSeconds` (from the limiter TTL) in the 429 envelope; keep the header.

#### FE-15 · Low · Account-match badge says "Sample" and the match step ignores the return point

- [ ] **Status:** open
- **Screens:** AUT-05..07
- **Problem:** AUT-05 shows SampleBadge "Sample" instead of "Sample records" (aut.match.sample is unused). match.tsx calls router.dismissTo('/home') directly instead of goToNext('done'), so a stored returnTo is not followed and can fire after a later sign-in.
- **Code:** `components/Auth.tsx:208 · app/auth/match.tsx:36, 60`

### Home, treatments and offers (11)

#### FE-2 · Medium · Home visit card has the wrong label and no Add to calendar

- [ ] **Status:** open
- **Screens:** HOM-02
- **Problem:** AppointmentPass is called without eyebrow, so it reads "Next appointment" instead of "Booked in Fresha", and without onAddToCalendar (the Visits tab wires it). The offline compact card is never used.
- **Code:** `app/(tabs)/home.tsx:171-178`

#### FE-3 · Medium · Signed-in Home shows the guest offline message

- [ ] **Status:** open
- **Screens:** HOM-02 offline
- **Problem:** Signed-in people see "Showing treatments saved on this phone…" (HOM-01 copy) instead of "You're offline / Last updated today, 9:41 am…"; no last-updated time is shown although visits come from cache.
- **Code:** `app/(tabs)/home.tsx:63-67`

#### FE-4 · Medium · "Clear filters" does nothing when the list's own category or concern is empty

- [ ] **Status:** open
- **Screens:** TRT-02, OFR-01, OFR-04
- **Problem:** The URL category/concern is kept apart from the sheet filters. With no results and no sheet filters, the screen says "Try removing a filter" and Clear filters resets nothing. Live: the Halloween offer and its fallback link to /treatments/list?category=facials, which has no services.
- **Code:** `app/treatments/list.tsx:35, 61-72`
- **Fix notes:** Show the empty state that matches the cause: when the URL category/concern itself has no services, say so and offer "See all treatments"; only show Clear filters when sheet filters are active.

#### FE-6 · Medium · Promo "doesn't apply" state can never appear

- [ ] **Status:** open
- **Screens:** OFR-03
- **Problem:** The server only returns noteligible when appliesTo is sent; promo.tsx sends only {code} and never reads the offer param passed from OFR-01.
- **Code:** `app/promo.tsx:52 · app/offers/[id]/index.tsx:61 · apps/api/src/content/routes.ts:171, 199`
- **Fix notes:** Send `appliesTo` (the offer or target) from OFR-01 to the promo check, as the API expects.

#### FE-5 · Low · Filters sheet ignores the concern the list was opened with

- [ ] **Status:** open
- **Screens:** TRT-03
- **Problem:** The entry concern is a fixed extra condition: it shows unselected in the sheet, can't be removed, and picking another concern narrows instead of widening. The button reads "Show 1 treatments".
- **Code:** `catalog/search.ts:93 · app/treatments/list.tsx:128, 148-153 · i18n/en.ts:637`

#### FE-7 · Low · Offer Eligible rows can't be tapped

- [ ] **Status:** open
- **Screens:** OFR-01
- **Problem:** Rows render chevron={false} with no onPress (design: chevrons, open WAL-07). Eyebrow is ink instead of primary, title displayMd instead of title-lg, body bodyLg ink instead of muted body.
- **Code:** `app/offers/[id]/index.tsx:70, 73, 97, 102`

#### FE-16 · Low · likely · Promo CTA link isn't validated before opening

- [ ] **Status:** open
- **Screens:** OFR-03
- **Problem:** promo.tsx pushes cta.href as-is; the offer page sends the same field through resolveLink, which safely handles unknown or mode-blocked links.
- **Code:** `app/promo.tsx:100`

#### FE-11 · Low · Guest Home hero styled differently

- [ ] **Status:** open
- **Screens:** Main / HOM-01
- **Problem:** Subtitle is bodyLg sans (design accent-italic serif); photo ratio 4/3 or 16/9 (design 16/11, 16/9, 16/5.6) with radius 20 (design 28); Book and Explore stay visible while loading; concern chips wrap instead of one scrolling row.
- **Code:** `app/(tabs)/home.tsx:87, 91, 112-119, 156 · components/Status.tsx:248`

#### FE-12 · Low · Treatments tab headings and category tiles styled differently

- [ ] **Status:** open
- **Screens:** TRT-01
- **Problem:** Headings use serif titleMd (design sans headline). Tiles are bordered cards with a 4:3 photo (design 76 px photo, radius 16, no card); an odd last tile stretches to full width.
- **Code:** `app/(tabs)/treatments.tsx:32, 44, 84-85`

#### FE-13 · Low · Treatment list, detail, profile and unavailable screens styled differently

- [ ] **Status:** open
- **Screens:** TRT-02, TRT-05..07
- **Problem:** Titles displayMd 32 (design title-lg 26). TRT-07 photo not dimmed; similar rows lack price. TRT-06 photo 4/3 (design 300 px crop). TRT-02 card photo 16/9 (design 5/2); filter group titles use label; "Loading" without ellipsis.
- **Code:** `app/treatments/[id].tsx:108, 237, 256 · app/professionals/[id].tsx:42, 45 · app/treatments/list.tsx:83, 163, 190`

#### FE-14 · Low · Search screen missing pieces

- [ ] **Status:** open
- **Screens:** TRT-04
- **Problem:** No category suggestion row; every result uses a magnifying-glass icon with "Treatment · {category}"; "Did you mean" is a tertiary button holding the whole sentence instead of an inline link.
- **Code:** `app/treatments/search.tsx:46-51, 74-80`

### Booking, visits, care and support (19)

#### BV-3 · Medium · Dates drop the weekday and the year

- [ ] **Status:** open
- **Screens:** VIS-01/02/05/07, BKG-09, CAR-01, WAL-01..03, PAY-09
- **Problem:** clinicDate() builds only day + month: visits read "16 Oct" (design "Thu 16 Oct"), expiries read "Use by 10 Oct" for a date a year away (design "28 Feb 2027"), receipts have no year.
- **Code:** `i18n/format.ts:21-26 (used by visits.tsx, visits/[id], fresha-return, care, cancelled, InstrumentView, receipt)`
- **Fix notes:** Change `clinicDate` (or add `clinicDay`) to produce "Thu 16 Oct" for visit dates and add the year where the design shows it (expiries "28 Feb 2027", receipts "12 Oct 2026"); a reasonable rule is: weekday for visits, year for receipts and for any date outside the current year. Update every caller listed and the unit tests in `i18n`.

#### BV-1 · Medium · "Sent to the clinic" confirmation disappears immediately

- [ ] **Status:** open
- **Screens:** VIS-06
- **Problem:** send() sets sent, then invalidates visits; the refetch fills openRequest, which unmounts the Composer holding the confirmation. The reference is never seen.
- **Code:** `app/visits/[id]/late-change.tsx:60-66, 95-96`
- **Fix notes:** Keep the sent result above the composer/banner switch (lift `sent` state to `Late`, or render the confirmation when `sent` is set regardless of `openRequest`).

#### BV-2 · Medium · A visit with a pending request keeps the Fresha status badge

- [ ] **Status:** open
- **Screens:** VIS-02 requested
- **Problem:** The pass always uses visit.status, so it reads "Awaiting clinic" or "Confirmed" next to a "Change requested" banner (design: "Change requested").
- **Code:** `app/visits/[id]/index.tsx:78`

#### BV-4 · Medium · A guest's "Ask us" question is lost after sign-in

- [ ] **Status:** open
- **Screens:** SUP-04
- **Problem:** send() pushes /auth/phone without setReturnTo; after sign-in the person lands on Home and the typed question is gone.
- **Code:** `app/support/ask/index.tsx:44-47 · auth/flow.ts:21-24`
- **Fix notes:** Call `setReturnTo` with the ask route (and keep the draft in state or a small store) before pushing sign-in, like SignInGate does.

#### BV-5 · Medium · "Change in Fresha" and "Open Fresha" skip the hand-off screens

- [ ] **Status:** open
- **Screens:** VIS-02, VIS-01
- **Problem:** Both open the browser directly, so no hand-off is recorded and there is no BKG-09 return check. With no Fresha URL both are disabled with no explanation; on VIS-02 the button is primary large (design secondary).
- **Code:** `app/visits/[id]/index.tsx:91-99 · booking/NotSynced.tsx:20-28`
- **Fix notes:** Route both buttons through BKG-12/BKG-08 (`/book/how-it-works` → `/book/fresha`) so a hand-off is recorded; when no Fresha URL exists show the BKG-08 not-configured state instead of a silently disabled button.

#### BV-6 · Low · Care row counts aftercare as "before your visit"

- [ ] **Status:** open
- **Screens:** VIS-02
- **Problem:** count = all care steps, so HIFU reads "4 steps before your visit" (2 before, 2 after). Icon first-aid-kit (design calendar-check).
- **Code:** `app/visits/[id]/index.tsx:110`

#### BV-7 · Low · Offline Visits still says "Synced from Fresha a few minutes ago"

- [ ] **Status:** open
- **Screens:** VIS-01 offline
- **Problem:** The note always renders, including from a cache up to 7 days old, and is hard-coded although the server returns syncedAt.
- **Code:** `app/(tabs)/visits.tsx:60-65, 124-126 · booking/visits.ts:171`

#### BV-8 · Low · Visits lists don't match the design

- [ ] **Status:** open
- **Screens:** VIS-01
- **Problem:** Later upcoming visits are ListRows (design: compact passes, "Upcoming"); subtitle drops the professional when detail is empty; past list has no year header, wrong icons, and "Completed" instead of "Done".
- **Code:** `app/(tabs)/visits.tsx:93-106, 137, 153`

#### BV-9 · Low · Visits has no Account button

- [ ] **Status:** open
- **Screens:** VIS-01
- **Problem:** Design has a tonal user-circle IconButton beside the title; only Home passes one.
- **Code:** `app/(tabs)/visits.tsx:18-20`

#### BV-10 · Low · How-it-works button and step icons

- [ ] **Status:** open
- **Screens:** BKG-12
- **Problem:** Button reads "Continue in Fresha" with an external icon (design "Continue", no icon); no 40 px step icons; assumption badge warning instead of sample; header blank (design "Book").
- **Code:** `app/book/how-it-works.tsx:49-51, 61-70`

#### BV-11 · Low · Booking basket missing search, Close and labels

- [ ] **Status:** open
- **Screens:** BKG-01
- **Problem:** No "Search treatments" field; badge "Sample" instead of "Sample prices"; no Close on the modal; consultation subtitle lacks "credited to your treatment"; selection is a left square instead of a right circular check.
- **Code:** `app/book/service.tsx:44, 94, 99, 110`

#### BV-12 · Low · Area picker layout

- [ ] **Status:** open
- **Screens:** BKG-10
- **Problem:** Disabled button keeps its arrow icon; header "Choose your areas" (design "Book"); name and badge layout differ; total row has no surface-muted panel.
- **Code:** `app/book/areas.tsx:160, 191, 196-199 · components/Booking.tsx:233-238`

#### BV-13 · Low · Fresha hand-off screen icons, badge and buttons

- [ ] **Status:** open
- **Screens:** BKG-08
- **Problem:** Carry-over row icons differ; assumption badge warning instead of sample; buttons inline in the scroll instead of a fixed footer; header blank.
- **Code:** `app/book/fresha.tsx:108, 171-180, 192-201`

#### BV-14 · Low · Return check "not visible" and "not yet" states

- [ ] **Status:** open
- **Screens:** BKG-09
- **Problem:** "Booked, not showing yet" uses timeout instead of success with reference; "Not yet" has a secondary button without icon plus an extra "Go to Visits".
- **Code:** `app/book/fresha-return.tsx:83-87, 119-150`

#### BV-15 · Low · Visit detail label and banner order

- [ ] **Status:** open
- **Screens:** VIS-02
- **Problem:** Fresha visits show "Booked in Fresha" (design "Your visit"); banners sit above the pass (design below).
- **Code:** `app/visits/[id]/index.tsx:54-79`

#### BV-16 · Low · Missed visit banner and Book again

- [ ] **Status:** open
- **Screens:** VIS-07
- **Problem:** Banner is danger above the pass (design warning below); "Book again" is a ListRow (design primary large footer button).
- **Code:** `app/visits/[id]/index.tsx:67-71, 121-123`

#### BV-17 · Low · likely · Care timeline never shows done/now progress

- [ ] **Status:** open
- **Screens:** CAR-01
- **Problem:** Steps are passed with no state, so every dot is empty; the heading sits in the content instead of the top bar.
- **Code:** `app/care/[visitId].tsx:16, 30`

#### BV-18 · Low · Cancelled confirmation uses the wrong layout

- [ ] **Status:** open
- **Screens:** VIS-05
- **Problem:** EmptyState with no reference and a secondary Back (design AsyncStatus success, reference, primary "Book another time", tertiary "Back to visits").
- **Code:** `app/visits/[id]/cancelled.tsx:178, 191-206`

#### BV-19 · Low · likely · Help search filters in place

- [ ] **Status:** open
- **Screens:** SUP-01
- **Problem:** The field filters article titles in place (design opens search); no match leaves an empty "Common questions" header.
- **Code:** `app/support/index.tsx:29-39`

### Wallet, payments and gifts (26)

#### WP-1 · High · An abandoned payment comes back as "checking your payment" on next launch

- [ ] **Status:** open
- **Screens:** PAY-01, PAY-04/08
- **Problem:** The pending marker is saved before any card is entered and cleared only on a final state. Back out of the card form, reopen the app: it shows "Confirm with your bank", then "Still checking… Please don't pay again" for a payment never made. A closed wallet sheet returns as "Payment cancelled".
- **Code:** `app/pay/method.tsx:79-89 · app/index.tsx:34 · app/pay/status.tsx:152-155`
- **Fix notes:** Save the pending-payment marker only once a payment is actually submitted (card confirm sent, or wallet sheet returned a token). Clear it when the card form is left without paying or the sheet is cancelled. On launch, resume only markers whose attempt the server reports as processing.

#### API-2 · Medium · Value can be added to a voided gift card

- [ ] **Status:** open
- **Screens:** STF-18
- **Problem:** POST /v1/staff/adjustments on a voided gift returns 200, status voided, balance $5. Only kind is checked, not status.
- **Code:** `apps/api/src/wallet/routes.ts:944-957`
- **Fix notes:** Reject adjustments on voided or expired instruments with 409.

#### API-3 · Medium · "Resend" on a voided gift reports success but sends nothing

- [ ] **Status:** open
- **Screens:** WAL-04 sent
- **Problem:** POST /v1/wallet/gifts/:id/resend returns {ok:true}; deliverGift silently returns. Send-time on it says "already been sent" though it was cancelled.
- **Code:** `apps/api/src/wallet/routes.ts:836, 843-848, 438`
- **Fix notes:** Return 409 for resend/send-time on voided gifts, with a "This gift was cancelled" message.

#### API-4 · Medium · A voided or refunded gift disappears from the buyer's Wallet

- [ ] **Status:** open
- **Screens:** WAL-01
- **Problem:** walletFor filters status <> 'voided', so "Gifts you sent" loses it (WALT 03 says cancelled and refunded states stay visible).
- **Code:** `apps/api/src/wallet/routes.ts:183, 1087`
- **Fix notes:** Keep voided/refunded gifts in the purchaser's "Gifts you sent" with their status (WALT 03).

#### API-5 · Medium · likely · An unclaimed gift can't be redeemed at the desk

- [ ] **Status:** open
- **Screens:** STF-25, WEB-01
- **Problem:** Redemption returns 404 "must be claimed first", while WEB-01 tells the recipient to "just keep the code" and show it at the desk; staff can't claim on their behalf.
- **Code:** `apps/api/src/wallet/routes.ts:900`

#### API-8 · Medium · Promo codes can be checked but never applied or recorded

- [ ] **Status:** open
- **Screens:** OFR-03
- **Problem:** The order schema has no promo field and nothing inserts promo_redemptions or increments used, so alreadyused/usedup can't happen.
- **Code:** `packages/contracts/src/wallet.ts:46-49 · apps/api/src (no writer)`
- **Fix notes:** Either wire promo codes into orders (re-check, record `promo_redemptions`, increment `used`) or, if that is out of v1 scope, record it as a deviation and hide the alreadyused/usedup states. Ask the owner if unsure.

#### WP-3 · Medium · Scheduled or failed gift is titled "Sent to {name}"

- [ ] **Status:** open
- **Screens:** WAL-04 sent
- **Problem:** The heading is always wal.giftSent, even above "We couldn't text it".
- **Code:** `app/wallet/gift-cards/[id].tsx:83-85`

#### WP-5 · Medium · Package "Used" list includes the purchase line

- [ ] **Status:** open
- **Screens:** WAL-03
- **Problem:** All ledger lines render under Used, including "Package bought +4".
- **Code:** `app/wallet/packages/[id].tsx:48`

#### WP-6 · Medium · Package screen states and actions differ

- [ ] **Status:** open
- **Screens:** WAL-03
- **Problem:** No PackageBalance card; every ended package gets "Buy again" (expired should be "Contact the clinic"); banner tones swapped (expired warning, used-up info); no expiring state; terms shown as a list, not a link.
- **Code:** `app/wallet/packages/[id].tsx:24-58`

#### WP-7 · Medium · Wallet screen built differently

- [ ] **Status:** open
- **Screens:** WAL-01
- **Problem:** Credit is a plain row (design CreditRow with non-cash note); no Account button; actions are list rows, plus an extra "Add a gift card" row; help link and history in a separate group.
- **Code:** `app/(tabs)/wallet.tsx:16, 50-56, 87, 95-97 · payments/InstrumentView.tsx:12-52`

#### WP-8 · Medium · Sent gift card has no amount, card or receipt link

- [ ] **Status:** open
- **Screens:** WAL-04 sent
- **Problem:** No GiftCard face or amount, no Receipt row (no route to PAY-09), no help link for the sender, buttons inline instead of a footer.
- **Code:** `app/wallet/gift-cards/[id].tsx:54-133`

#### WP-10 · Medium · History has no Show filter

- [ ] **Status:** open
- **Screens:** WAL-06
- **Problem:** No SegmentedControl "All / Payments / Refunds" and no per-row icons.
- **Code:** `app/wallet/history.tsx:59-74`

#### WP-14 · Medium · Claim screen shows the wrong state for short or mistyped codes

- [ ] **Status:** open
- **Screens:** WAL-11
- **Problem:** Under 6 characters: "We couldn't find this gift card"; 6-11: API notfound "looks right but we can't find it" (design: "That code is too short…"). Claimed/notfound replace the screen with a danger status (design Banner + support); success returns to Wallet, not WAL-04.
- **Code:** `app/wallet/claim.tsx:41-44, 70-99`

#### WP-18 · Medium · Apple Pay / Google Pay not filtered by platform

- [ ] **Status:** open
- **Screens:** PAY-01
- **Problem:** Every server method is a radio row; with both enabled, iOS shows Google Pay and Android Apple Pay. No WalletPayButton; financing copy differs; extra Sample badge.
- **Code:** `app/pay/method.tsx:136-170 · apps/api/src/wallet/routes.ts:586-596`

#### WP-21 · Medium · Two different references for one purchase; receipt incomplete

- [ ] **Status:** open
- **Screens:** PAY-09, WAL-06
- **Problem:** History shows the order reference (NB-O-…), the receipt only the payment reference (PAY-…). No year, no logo, Paid badge without check.
- **Code:** `app/pay/receipt/[id].tsx:59-67 · apps/api/src/wallet/routes.ts:704-718, 774-783`

#### API-7 · Low · Package session counts don't add up after a refund

- [ ] **Status:** open
- **Screens:** WAL-03
- **Problem:** 6 sessions, 1 used, 1 refunded → total 6, used 1, remaining 4: bought ignores refund entries.
- **Code:** `apps/api/src/wallet/routes.ts:137, 159`

#### API-12 · Low · Reusing an idempotency key with a different order silently returns the first order

- [ ] **Status:** open
- **Screens:** PAY-01
- **Problem:** POST /v1/orders with the same key but another package returns the original order with no mismatch error.
- **Code:** `apps/api/src/wallet/routes.ts:567-573`

#### WP-9 · Low · Credit and own-gift screens lack design components

- [ ] **Status:** open
- **Screens:** WAL-02, WAL-04 mine
- **Problem:** No CreditRow or source line; CTA "Book and use it" (design "Book and use my credit"); own gift card has no GiftCard face.
- **Code:** `app/wallet/credit.tsx:23-32 · app/wallet/gift-cards/[id].tsx:35-51`

#### WP-11 · Low · Gift value and review have no card preview

- [ ] **Status:** open
- **Screens:** WAL-08, WAL-10
- **Problem:** No GiftCard preview; presets are chips (design tiles); Continue stays enabled on error; Pay has no lock icon.
- **Code:** `app/wallet/gift/value.tsx:39-77 · review.tsx:72-87`

#### WP-12 · Low · A cleared custom amount is still used

- [ ] **Status:** open
- **Screens:** WAL-08
- **Problem:** Type 75 → Continue → Back → clear: no preset selected but Continue proceeds with the hidden $75.
- **Code:** `app/wallet/gift/value.tsx:21-49`

#### WP-13 · Low · Gift timing copy and field order

- [ ] **Status:** open
- **Screens:** WAL-09
- **Problem:** "Now / Later" (design "Send now / Schedule"); "Send it by" comes after the message.
- **Code:** `app/wallet/gift/recipient.tsx:53-67`

#### WP-15 · Low · Reference shown twice

- [ ] **Status:** open
- **Screens:** WAL-12, ACC-07
- **Problem:** Body text starts "Reference {ref}." while AsyncStatus also prints it; ACC-07 sent state is an AsyncStatus instead of the form with a success Banner and disabled "Requested".
- **Code:** `app/wallet/help.tsx:74 · app/account/data-request.tsx:79-86`

#### WP-16 · Low · Package terms row isn't a link

- [ ] **Status:** open
- **Screens:** WAL-07
- **Problem:** Row is not tappable and its subtitle is every term joined (design: "Transfers, refunds and expiry" → SUP-02).
- **Code:** `app/wallet/buy-package.tsx:115`

#### WP-17 · Low · Membership screen lacks MemberStatus

- [ ] **Status:** open
- **Screens:** WAL-05
- **Problem:** Badge plus text instead of MemberStatus and the "From the old app" banner; the route takes no instrument id (flag is off by default).
- **Code:** `app/wallet/membership.tsx:16-17`

#### WP-19 · Low · Card form errors and Pay button

- [ ] **Status:** open
- **Screens:** PAY-02
- **Problem:** Any invalid field shows one error under the number; Pay is never disabled; no lock icon or amount header.
- **Code:** `app/pay/card.tsx:46, 66-75`

#### WP-20 · Low · Payment status states and buttons

- [ ] **Status:** open
- **Screens:** PAY-05..08
- **Problem:** Cancelled uses the timeout state (design failed); View receipt secondary without icon (design tertiary with icon); Get help and Check again lack icons.
- **Code:** `app/pay/status.tsx:96, 106-109, 127, 141`

### Account and notifications (9)

#### WP-23 · Medium · Account deletion fires on the 6th code digit

- [ ] **Status:** open
- **Screens:** ACC-09
- **Problem:** The code field submits on completion and requests deletion with no button; the designed destructive "Delete my account" (del.confirm) is unused.
- **Code:** `app/account/delete.tsx:72-84 · account/CodeStep.tsx:83`
- **Fix notes:** Do not auto-submit on the 6th digit on this screen: pass an option to CodeStep/OTPInput to disable onComplete and show the destructive "Delete my account" button (`del.confirm`) per ACC-09.

#### WP-25 · Medium · Booking policy can't be reached from Account

- [ ] **Status:** open
- **Screens:** ACC-01, ACC-11
- **Problem:** "Terms and policies" opens /legal/terms only; nothing reaches /legal/booking. Row icons and grouping differ; no "Shown only to clinic staff." footer; pending-deletion date uses a hard-coded zone.
- **Code:** `app/account/index.tsx:79, 86-106`

#### WP-26 · Medium · likely · Profile form starts empty if the account hasn't loaded

- [ ] **Status:** open
- **Screens:** ACC-02
- **Problem:** Fields are initialised once from me; if me is still null they stay empty, then count as changed: Save says "Enter your first name" and the button reads "Send code to new number".
- **Code:** `app/account/profile.tsx:36-48, 63-67`

#### WP-2 · Medium · likely · Tapping a push from a closed app is ignored

- [ ] **Status:** open
- **Screens:** NTF-01..12
- **Problem:** getLastNotificationResponseAsync resolves before /v1/me, so the recipient check drops the tap and marks it handled.
- **Code:** `platform/NotificationBridge.tsx:49-60 · auth/AuthProvider.tsx:59-63`
- **Fix notes:** Process the cold-start notification response after `me` is loaded (await AuthProvider readiness), and do not mark it handled until it was routed.

#### WP-4 · Medium · "Send now" gift tells the buyer "at the time you chose"

- [ ] **Status:** open
- **Screens:** NTF-08
- **Problem:** fulfil() always queues gift_scheduled (urgent) as well as the sent message.
- **Code:** `apps/api/src/wallet/routes.ts:271 · notifications/templates.ts:46-50`
- **Fix notes:** Queue `gift_scheduled` only for scheduled gifts; send-now gifts get only the sent message.

#### WP-28 · Medium · Visit notifications have a double period and the wrong date style

- [ ] **Status:** open
- **Screens:** NTF-01..04
- **Problem:** Live: "Laser Hair Removal, Fri, Nov 13, 12:00 p.m.. See you then." (en-CA month-first, "p.m.", extra period, no zone; house style "Thu 16 Oct, 2:30 pm"). Time zone is hard-coded instead of clinic.timezone (also campaign subtitles).
- **Code:** `apps/api/src/visits/routes.ts:169 · notifications/dispatch.ts:163 · templates.ts:100 · staff/entities.ts:169`
- **Fix notes:** Format notification times with the same house formatter as the app ("Thu 16 Oct, 2:30 pm"), using `clinic.timezone`, and remove the double period in the template.

#### WP-29 · Medium · likely · Notification content and links differ from the boards

- [ ] **Status:** open
- **Screens:** NTF-05..12
- **Problem:** Missing amounts and items (NTF-05, 07, 09), no scheduled time (NTF-08), refund opens the receipt not WAL-06 and has no "on its way" message (NTF-06), reply opens /support not ACC-05 (NTF-10), generic bodies (NTF-11/12), titles differ (NTF-01..04).
- **Code:** `apps/api/src/notifications/templates.ts:31-128 · wallet/routes.ts:445, 913-918`

#### WP-24 · Low · Delete-account hierarchy and wording

- [ ] **Status:** open
- **Screens:** ACC-08
- **Problem:** "Talk to the clinic first" is the primary large button and "Continue to delete" the smaller (design reversed); "Before you go" appears twice; balance label repeats "(4 sessions)".
- **Code:** `app/account/delete.tsx:112-147 · apps/api/src/account/routes.ts:367`

#### WP-27 · Low · Inbox icons don't reflect message type

- [ ] **Status:** open
- **Screens:** ACC-04/05
- **Problem:** Bell for unread and check-circle for read (design: type icons such as calendar-check, ticket, receipt, gift); no summary subtitle; ACC-05 title displayMd.
- **Code:** `app/account/inbox/index.tsx:42, 52-54 · inbox/[id].tsx:53-55`

### Staff workspace (31)

#### ST-1 · High · Fields that split into lists swallow spaces, line breaks and commas while typing

- [ ] **Status:** open
- **Screens:** STF-03, 06, 10, 16, 32
- **Problem:** Controlled inputs are rebuilt from trimmed, filtered pieces on every keystroke: "Valid " becomes "Valid", Enter vanishes, "hifu," becomes "hifu". Multi-word terms, paragraphs and a second alias can only be pasted.
- **Code:** `app/staff/services/[id]/index.tsx:96 · campaigns/[id]/index.tsx:17, 108 · packages/[id].tsx:60 · support-content/[id].tsx:30 · settings/rules.tsx:86-92`
- **Fix notes:** Keep the raw text in local state while typing and split/trim only on save (or blur). Same fix for every field listed.

#### ST-2 · High · After editing a service FAQ, Save or Publish always says "Someone else changed this"

- [ ] **Status:** open
- **Screens:** STF-03, STF-40
- **Problem:** Service edit and FAQ run separate useServiceEditor instances; service edit keeps the old version, so its next save gets 409 and "Load the latest" discards unsaved edits.
- **Code:** `staff/useServiceEditor.ts:29 · app/staff/services/[id]/faq.tsx:15`
- **Fix notes:** Use one editor state for the service and its FAQ (shared context or a query cache keyed by service id), or refetch and merge the server version when Service edit regains focus.

#### ST-3 · High · "Approve and publish" fails silently; Editors can submit items that can't be approved

- [ ] **Status:** open
- **Screens:** STF-09, Submit on STF-03/06/16/20/22
- **Problem:** The approve error is only shown in the hidden reason field. Submit ignores missing fields (unlike Publish), and the server refuses incomplete items with 409, so the Owner's approve does nothing.
- **Code:** `app/staff/approvals/[id].tsx:41-43, 79 · staff/EditorChrome.tsx:111 · apps/api/src/staff/routes.ts:240 · entities.ts (publish)`
- **Fix notes:** Show the approve/publish error in a visible Banner on STF-09. Disable Submit with the same completeness check Publish uses, and validate completeness on the server at submit time.

#### ST-4 · High · A mistyped "Send at" time sends the marketing push immediately or at the old time

- [ ] **Status:** open
- **Screens:** STF-35
- **Problem:** The date field only reports a value once it parses; "2026-10-3" or "25:00" keeps the last valid value or empty (= now), and Schedule stays enabled.
- **Code:** `staff/WallTimeField.tsx:17-21 · app/staff/push.tsx:67-68`
- **Fix notes:** Make WallTimeField report invalid text (e.g. `onValidity`) and disable Schedule while invalid; the server should also reject a past or missing `sendAt` for scheduled sends.

#### FE-8 · Medium · Push messages default to an "Opens" link that doesn't exist

- [ ] **Status:** open
- **Screens:** STF-35 / TAB-06
- **Problem:** opens defaults to '/offers' (no such route; only /offers/[id]); the only check is startsWith('/'). Customers land on Home with "Link not found".
- **Code:** `app/staff/push.tsx:173, 217 · platform/NotificationBridge.tsx:54`

#### ST-5 · Medium · Campaign calendar groups by day of month, not by month

- [ ] **Status:** open
- **Screens:** STF-05
- **Problem:** Headers read "20" and "1" (second word of "Oct 20 – Nov 1"); list is newest-first instead of date order.
- **Code:** `app/staff/campaigns/index.tsx:21 · apps/api/src/staff/entities.ts (ORDER BY starts_at DESC)`

#### ST-6 · Medium · "Approve and move" shows in hand-off mode; "Call" changes status

- [ ] **Status:** open
- **Screens:** STF-24
- **Problem:** Approve sends the customer "approved" (NTF-03) before anything is moved in Fresha; Call sets call_needed and messages the customer with no confirmation.
- **Code:** `app/staff/requests/[id].tsx:69-73, 84-86 · apps/api/src/visits/routes.ts:40-44`

#### ST-7 · Medium · Self-action refusals land on "No permission" with a garbled sentence

- [ ] **Status:** open
- **Screens:** STF-14
- **Problem:** Every 403 routes to denied, including "another staff member must…" rules; with no key it reads "Your role (Front desk) can't no permission.", otherwise raw keys like "can't selling.publish". No "Ask an admin" button.
- **Code:** `staff/api.ts:14-16 · app/staff/denied.tsx:13-16`
- **Fix notes:** Only route to STF-14 for a real missing permission (`details.missingPermission`); show self-action refusals as an inline Banner with the server message. Map permission keys to readable phrases.

#### ST-8 · Medium · A restored item shows an Archive button that always fails

- [ ] **Status:** open
- **Screens:** STF-05/10/15/19/21
- **Problem:** Restore clears published_at but keeps first_published_at; Archive is refused ("never live: delete it instead") and shown as "Someone else changed this"; Delete is refused too.
- **Code:** `apps/api/src/staff/entities.ts:587, 604 · staff/EntityList.tsx:108`
- **Fix notes:** On restore, return the item to draft with archive allowed only for items that are or were live, or make the list compute Archive from `first_published_at` consistently with the server; never show an action the server will refuse.

#### ST-9 · Medium · Media "in use" ignores campaign and professional photos

- [ ] **Status:** open
- **Screens:** STF-36
- **Problem:** Only services are counted, so a photo on a live campaign or profile can be archived or deleted and customers get a 404 image.
- **Code:** `apps/api/src/staff/routes.ts:767`
- **Fix notes:** Count media usage across services, campaigns and professionals (and any other `media:<id>` reference) in `inUse`.

#### ST-10 · Medium · likely · Settings saves can overwrite another Owner's changes

- [ ] **Status:** open
- **Screens:** STF-17, 31, 32
- **Problem:** The save sends the currently cached version, not the one the form was built from; after a background refetch it wins without a 409.
- **Code:** `staff/useSettingsSave.ts:37 · app/staff/settings/rules.tsx`

#### ST-11 · Medium · Import review gives the Owner "Submit"; result says "Catalogue published" after a submit

- [ ] **Status:** open
- **Screens:** STF-42 / TAB-07
- **Problem:** Both roles see Submit (Owner should see Save draft + Publish); an Owner's submit files approvals they can't decide; badge tones success/info/warning (design primary/warning/danger); no count tiles.
- **Code:** `app/staff/import/review.tsx:71, 95-101, 118`

#### ST-12 · Medium · Card payments can be switched off

- [ ] **Status:** open
- **Screens:** STF-32 / TAB-05
- **Problem:** Card is a normal switch (design: locked "Always on") and the API accepts card:false.
- **Code:** `app/staff/settings/rules.tsx:107-109 · apps/api/src/staff/ops.ts (rules PUT)`
- **Fix notes:** Render Card as a locked "Always on" row (design STF-32) and reject `card: false` in the rules PUT (D-QA-04).

#### ST-13 · Medium · Money fields can't take cents

- [ ] **Status:** open
- **Screens:** STF-03, 16, 20, 32
- **Problem:** Each keystroke is converted to a number: "25." becomes "25", 49.99 can't be typed; package price snaps to 0 when cleared.
- **Code:** `app/staff/services/[id]/index.tsx:15, 121 · packages/[id].tsx:14, 54 · promo-codes/[id].tsx:49-51 · settings/rules.tsx:53`
- **Fix notes:** Keep money fields as strings while typing (allow one decimal separator and two decimals), convert to cents only on save; empty stays empty.

#### ST-14 · Medium · Staff home doesn't match its design

- [ ] **Status:** open
- **Screens:** STF-01
- **Problem:** Plain rows instead of the tile grid with Today counts; Editor banner title is the whole sentence. deviations.md still says this "arrives with NANO-08", which has shipped.
- **Code:** `app/staff/index.tsx:9-60, 75`

#### ST-15 · Medium · Value lookup: misleading empty state and missing links

- [ ] **Status:** open
- **Screens:** STF-11, STF-25
- **Problem:** "Not found" and "found, no value" both say "Nothing to redeem" and hide the customer; no link to gift-card actions and no Redeem button.
- **Code:** `staff/ValueFinder.tsx:92-106`

#### ST-16 · Medium · Campaign edit missing Eligible items and Discount

- [ ] **Status:** open
- **Screens:** STF-06
- **Problem:** eligible can't be edited; the bundled photo has no chip; Pause and End now show for ended campaigns; End now has no confirmation.
- **Code:** `app/staff/campaigns/[id]/index.tsx:72-82, 111-122`

#### API-6 · Medium · Campaign template returns an end date before its start

- [ ] **Status:** open
- **Screens:** STF-05/06
- **Problem:** Start and end are shifted forward independently (start 2027-10-01, end 2026-10-31); the seeded Halloween campaign has no template.
- **Code:** `apps/api/src/staff/entities.ts:672-677`
- **Fix notes:** Shift start and end by the same number of years so the range stays valid; set `template` on the seeded Halloween campaign.

#### API-1 · Medium · Issuing credit to an unknown customer returns 500

- [ ] **Status:** open
- **Screens:** STF-27
- **Problem:** The insert runs without checking the customer exists (foreign-key violation → internal_error); deleted customers are accepted too.
- **Code:** `apps/api/src/wallet/routes.ts:936-942`
- **Fix notes:** Check the customer exists (and is not deleted) before inserting; return 404 `not_found` in the envelope.

#### FE-9 · Medium · Rules and Push have no two-column tablet layout

- [ ] **Status:** open
- **Screens:** TAB-05, TAB-06
- **Problem:** StaffScreen only splits when aside is set; both stay one phone column with no preview or right-hand actions.
- **Code:** `app/staff/settings/rules.tsx:43 · app/staff/push.tsx:208 · StaffScreen.tsx:51`

#### API-13 · Low · Adjusting an unknown instrument returns 409 instead of 404

- [ ] **Status:** open
- **Screens:** STF-18
- **Problem:** "Only credit or gift-card balances can be adjusted."
- **Code:** `apps/api/src/wallet/routes.ts:945`

#### API-18 · Low · Redemption response is missing serviceId

- [ ] **Status:** open
- **Screens:** STF-25
- **Problem:** Returns serviceId:null where lookup returns svc_laser for the same package.
- **Code:** `apps/api/src/wallet/routes.ts:899`

#### ST-17 · Low · Archive/delete dialog repeats "This is recorded in the audit log."

- [ ] **Status:** open
- **Screens:** STF-39
- **Problem:** Callers pass it in affects and ConfirmDialog adds it again.
- **Code:** `components/Overlay.tsx:106 · staff/EntityList.tsx:138`

#### ST-18 · Low · Promo code labels

- [ ] **Status:** open
- **Screens:** STF-19, STF-20
- **Problem:** A taken code shows "Someone else changed this" (design "Already used by…"); the no-campaign chip is labelled "No photo".
- **Code:** `app/staff/promo-codes/index.tsx:41 · [id].tsx:71`

#### ST-19 · Low · Customer profile and match copy

- [ ] **Status:** open
- **Screens:** STF-27, STF-28
- **Problem:** Empty visits text is wrong; statuses show raw values; Messages row doesn't open STF-30; title "Customers"; account check shows the raw status.
- **Code:** `app/staff/customers/[id]/index.tsx:39 · match.tsx:77`

#### ST-20 · Low · Read-only Editors see "You can save and submit"

- [ ] **Status:** open
- **Screens:** STF-34
- **Problem:** Home layout shows the editing hint to Editors, who can't edit it.
- **Code:** `app/staff/home-layout.tsx:94`

#### ST-21 · Low · Filter sets differ from design

- [ ] **Status:** open
- **Screens:** STF-19, 21, 29
- **Problem:** Generic All/Live/Draft/Archived or Open/Done/All instead of the per-screen sets (e.g. Active/Scheduled/Used up/Archived).
- **Code:** `staff list screens`

#### ST-22 · Low · Copy and tone mismatches

- [ ] **Status:** open
- **Screens:** STF-07, 08, 10, 23, 25, 30, 35
- **Problem:** Header and banner titles differ; STF-07 lacks "Preview only" and "Back to editing"; save errors use warning instead of danger.
- **Code:** `see screens`

#### ST-23 · Low · Permission checks don't match the API exactly

- [ ] **Status:** open
- **Screens:** STF-01, 11, 25
- **Problem:** Redeem gated on value.redeem but calls lookup (value.lookup); Approvals row needs content.publish while the API accepts any publish permission; editors 403 into STF-14. Works today only because no role splits them.
- **Code:** `staff/ValueFinder.tsx:41 · apps/api/src/wallet/routes.ts:873`

#### ST-24 · Low · Audit log shows raw item IDs

- [ ] **Status:** open
- **Screens:** STF-12
- **Problem:** "service:svc_new_service_3e48" instead of readable names; times use a fixed zone.
- **Code:** `app/staff/audit.tsx`

#### ST-25 · Low · Team member has no Resend invite or Give access again

- [ ] **Status:** open
- **Screens:** STF-38
- **Problem:** Invited and removed members have no follow-up action.
- **Code:** `app/staff/team/[id].tsx`

### Design-system components (18)

#### DS-4 · Medium · ListRow icon circle and value colours

- [ ] **Status:** open
- **Screens:** ACC-01, WAL-01, all lists
- **Problem:** Icon circle is lavender surfaceTint with onTint icon (design surface-muted with ink); value text ink (design muted); chevron 20 (design 18).
- **Code:** `components/Card.tsx:67-68, 82, 86`

#### DS-5 · Medium · AppointmentPass styling

- [ ] **Status:** open
- **Screens:** HOM-02, VIS-01, VIS-02
- **Problem:** Padding 16 (design 20) with no card shadow; eyebrow ink (design ink-muted); meta block has no top divider and ink captions; badge text can wrap (design nowrap).
- **Code:** `components/Booking.tsx:49, 64-73, 249-252`
- **Fix notes:** Badge text: `numberOfLines={1}`. Pass header: row with `justifyContent: "space-between"`, eyebrow `numberOfLines={1}` + `flexShrink: 1` (not `flex: 1`). Padding `space["5"]`, `elevation.card` shadow, meta divider.

#### DS-6 · Medium · OfferCard

- [ ] **Status:** open
- **Screens:** HOM-03, OFR
- **Problem:** Eyebrow ink (design primary); state badge beside the eyebrow instead of on the right; inactive offers aren't dimmed; Terms is a tertiary button (design underlined text link).
- **Code:** `components/Discovery.tsx:102-124, 342`

#### DS-7 · Medium · likely · OfferCard hides its inner buttons from VoiceOver

- [ ] **Status:** open
- **Screens:** HOM-03
- **Problem:** The whole card is an accessible button wrapping the CTA and Terms buttons; on iOS VoiceOver can't reach Terms (design: an article, not pressable).
- **Code:** `components/Discovery.tsx:102 · components/Card.tsx:38-41`
- **Fix notes:** Make OfferCard a non-pressable container (or `accessible={false}` on the card) so the CTA and Terms are separate accessible controls; keep the photo/title tap target as its own Pressable if needed.

#### DS-10 · Medium · Wallet components missing

- [ ] **Status:** open
- **Screens:** WAL-01..05
- **Problem:** CreditRow, PackageBalance, GiftCard and MemberStatus don't exist in the app; screens render plain rows and text.
- **Code:** `components/ (missing)`

#### DS-8 · Low · PhotoFrame always has rounded corners, even inside cards

- [ ] **Status:** open
- **Screens:** HOM-03, ServiceCard
- **Problem:** The photo's bottom corners round off and leave notches against the card body (design: no radius, the card clips).
- **Code:** `components/Status.tsx:249`

#### DS-9 · Low · SearchField border and focus

- [ ] **Status:** open
- **Screens:** TRT-01, TRT-04
- **Problem:** Always a strong border with no focus state (design transparent border on surface-muted, focus border + surface fill); clear button 48/22 (design 36/16).
- **Code:** `components/Discovery.tsx:149`

#### DS-11 · Low · Payment rows differ from PaymentMethodRow

- [ ] **Status:** open
- **Screens:** PAY-01
- **Problem:** No tint fill on the selected row; filled check icon; unavailable rows use opacity 0.5 (design surface-muted + prohibit icon); no WalletPayButton.
- **Code:** `app/pay/method.tsx:141-163`

#### DS-12 · Low · Staff governance components missing

- [ ] **Status:** open
- **Screens:** STF-03, 09, 12
- **Problem:** No ApprovalItem diff, AuditEntry timeline or PublishState (draft shows the info tone instead of neutral with a pencil).
- **Code:** `app/staff/approvals/[id].tsx:58-64 · audit.tsx · services/index.tsx:85`

#### DS-13 · Low · CareTimeline dots

- [ ] **Status:** open
- **Screens:** TRT-05, CAR-01
- **Problem:** 20 px dots (design 24), "now" only recolours the border (design 7 px primary ring), no connecting line.
- **Code:** `components/Discovery.tsx:211-215, 361`

#### DS-14 · Low · Rating stars use primary instead of warning

- [ ] **Status:** open
- **Screens:** Main, TRT-05
- **Code:** `components/Discovery.tsx:319`

#### DS-15 · Low · FAQ opens the first answer by default

- [ ] **Status:** open
- **Screens:** TRT-05
- **Problem:** useState(0) (design: nothing opens unless flagged).
- **Code:** `components/Discovery.tsx:172`

#### DS-16 · Low · ConsentRow tag and checkbox

- [ ] **Status:** open
- **Screens:** AUT-03
- **Problem:** Tag is plain caption text (design small tinted tag); checkbox border 1.5 (design 2).
- **Code:** `components/Auth.tsx:148, 255`

#### DS-17 · Low · PriceTag secondary text too small

- [ ] **Status:** open
- **Screens:** TRT-02, TRT-05
- **Problem:** "From" and was-price use body 15 (design inherits the 18 headline size at weight 400).
- **Code:** `components/Status.tsx:139, 154, 179`

#### DS-18 · Low · Input text sizes

- [ ] **Status:** open
- **Screens:** AUT-01/02, forms
- **Problem:** Inputs use bodyLg 17/26 (design 16/22); OTP digits headline 18/24 (design 600 22/28).
- **Code:** `components/Field.tsx:65 · Discovery.tsx:162 · Auth.tsx:60`

#### DS-19 · Low · Banner dismiss button too big

- [ ] **Status:** open
- **Screens:** Banners
- **Problem:** 48 px IconButton with a 22 px icon (design 32 × 32, 16 px icon).
- **Code:** `components/Banner.tsx:304`

#### DS-20 · Low · AreaPicker tile styling

- [ ] **Status:** open
- **Screens:** BKG-10
- **Problem:** Unselected border lineStrong (design line 1.5); disabled opacity 0.4 (design 0.55); selected name onTint (design ink).
- **Code:** `components/Booking.tsx:212-218`

#### DS-21 · Low · Some tokens never reached the RN package

- [ ] **Status:** open
- **Screens:** —
- **Problem:** opacity-disabled, opacity-pressed-overlay and focus-ring are missing from packages/design-tokens; literals are hard-coded; the pressed overlay on photo cards isn't implemented.
- **Code:** `packages/design-tokens/src/index.ts · components/press.ts`

### Server and web pages (6)

#### WEB-1 · Medium · Every button on the web pages renders in the wrong font

- [ ] **Status:** open
- **Screens:** WEB-01, WEB-03
- **Problem:** font: 600 16px/1 inherit is invalid CSS, so the declaration is dropped: Arial 13.33px regular instead of 600/16px.
- **Code:** `apps/api/src/web/routes.ts:21`
- **Fix notes:** Replace `font: 600 16px/1 inherit` with `font: 600 16px/1 <the page font stack>` or set `font-family: inherit` separately.

#### WEB-2 · Medium · Gift page shows "not found" for rate limits and server errors

- [ ] **Status:** open
- **Screens:** WEB-01
- **Problem:** Any non-OK answer is treated as not found.
- **Code:** `apps/api/src/web/app-js.ts:24`

#### WEB-3 · Low · Web pages can get stuck

- [ ] **Status:** open
- **Screens:** WEB-01, WEB-03
- **Problem:** api() has no catch, so a network failure leaves "Opening your gift…" or a disabled button forever; no "get a new code" path; /delete for a number with no account stays on the code step.
- **Code:** `apps/api/src/web/app-js.ts:9-11`

#### WEB-4 · Low · Web pages differ from the design

- [ ] **Status:** open
- **Screens:** WEB-01..04
- **Problem:** No logo; WEB-01 has no GiftCard, message card or helper text; WEB-02 title "It's yours" (design "Gift card claimed"), no reference; WEB-03 lacks the delete/keep list and destructive button; WEB-04 lacks the CareTimeline.
- **Code:** `apps/api/src/web/routes.ts`

#### API-11 · Low · A rotated-out refresh token is still accepted after a grace retry

- [ ] **Status:** open
- **Screens:** —
- **Problem:** Refresh R → R1, R again within 30 s → R2, then R1 → 200: two token chains stay alive (docs say a rotated token revokes the session).
- **Code:** `apps/api/src/auth/session.ts:106-138`
- **Fix notes:** In refresh grace, accept the retried old token only if the newer token was never used; otherwise revoke the session family.

#### API-17 · Low · development.md contradicts the running behaviour

- [ ] **Status:** open
- **Screens:** —
- **Problem:** Docs say dev OTP accepts only 000000 and payments never become paid; codes are random and tok_visa payments succeed.
- **Code:** `docs/development.md:49-50`
