# Nano Beauty App — Phase Plan & Phase 0 Register

Sep 25, 2026 · @Dragon

## Phase plan

The project runs in 9 gated phases; the design system (Phase 5) is \~80% done early, so the critical path now is Phase 0 → Phase 2 (navigation) → Phase 3 (flows) → Phase 6 (all screens). Screens that depend on Fresha, payments or old-app data are designed as **conditional** until their owner supplies evidence.

| Phase | Deliverable | Claude does | You / clinic supply | Gate (approver) | Now |
| --- | --- | --- | --- | --- | --- |
| 0. Intake | This register: decisions, conflicts, risks, screen coverage, blocking questions | All of it | Answers to the blocking questions below | You accept the register | Done (accepted) |
| 1. Brand | Light/dark, iOS/Android, guest/returning/staff reference screens; logo, photos, app icon | Done except icon exports and your sign-off | Sign-off; photo rights and team consent | You | Done (icon approved, D30) |
| 2. Navigation (IA) | Task list, 2 navigation options, recommendation, route map, service categories, staff workspace map, full screen list | All of it | Real service list (or approval to use the website list as draft) | You + clinic confirm categories | Done (Option B) |
| 3. Low-fidelity flows | Every journey incl. errors and recovery, customer and staff | All of it | Booking, cancellation, deposit and refund rules | You; finance/ops review their flows | Done |
| 4. Usability testing | Test script, tasks, note sheet; revised flows from findings | Script, analysis, revisions | 3–5 clients + 1–2 staff for 20-minute sessions | You | Postponed (D31); plan ready |
| 5. Design system | Tokens, components, motion, accessibility | Remaining: component-token tier, motion demos | Nothing | You | \~95%: motion prototypes done |
| 6. High-fidelity screens | Every approved screen and state, light/dark, clickable prototype | All of it | Final copy approvals (clinical, prices, policies) | You + clinic for clinical/price screens | Done; sign-offs after the build (D32) |
| 7. Developer handoff | Route map, state and permission contracts, test data, asset sizes, QA checklist | All of it | Updated development starter (v1.1, admin in-app) | Mobile developer confirms buildable | Handoff pack drafted; developer review next |
| 8. Built-app QA | Compare coded app vs design, log deviations | Review and issue list | Test builds (TestFlight / Play testing) | You | During coding |

**Running in parallel:** independent flows (discovery, treatment detail, account, support, staff catalogue and campaigns) move ahead while Fresha, payments and old-app data are being checked. Booking, checkout, wallet and account matching stay conditional until then.

## Decision and source register

29 decisions are recorded: 25 confirmed, 4 open on outside evidence and deferred until the designs are finished (D26). D01–D21 come from the handoff (§8); D22–D29 were made in this project.

| ID | Decision | Status | Owner | Evidence / next step |
| --- | --- | --- | --- | --- |
| D01 | v1.1 Keep / Backlog / Remove scope; favourites and recent views out of v1 | Confirmed | You | Requirements v1.1 |
| D02 | App name Nano Beauty; original logo kept | Confirmed | You | Master PDF received |
| D03 | One design system + full customer and staff journeys, prototypes, handoff; Figma not required | Confirmed | You | Handoff §2 |
| D04 | Shared identity; native Back, keyboard, safe areas, accessibility per platform | Confirmed | You | Guideline: iOS and Android |
| D05 | Native behaviour wins over the reference picture | Confirmed | You | — |
| D06 | Warm editorial direction, solid/tonal surfaces, no glass or blur | Confirmed | You | Reference PNG dropped by you; Claude designed the direction |
| D07 | Fixed brand violet on Android, light and dark themes | Confirmed | You | Tokens pass contrast in both themes |
| D08 | Simple motion with Reduce Motion alternatives | Confirmed; values proposed | You | Motion tokens; device review in Phase 5 |
| D09 | Tabs and labels come from research, not the old app | Confirmed | You | Phase 2 |
| D10 | Guest, returning (with/without visit) and staff Home all designed | Confirmed | You | 6 reference screens |
| D11 | Role-gated staff workspace inside the mobile app, not a tab | Confirmed | You | StaffBar, approval components |
| D12 | English only, portrait; address 555 6th St #130, New Westminster | Confirmed | You | Website |
| D13 | How the app books through Fresha (API or hand-off) | **Open** | Ops + developer | Fresha account type, API/partner access, test booking |
| D14 | Clinic has approved services; staff can enter them manually | Confirmed; list not received | Clinic ops | Service export from Fresha |
| D15 | Debit, Klarna, Affirm; values originate in old app | **Open** | Finance + developer | Merchant accounts, payment provider, sandbox |
| D16 | Old-app customer and value data access | **Open** | You + developer | Database or export access, record counts |
| D17 | Existing member/reward status visible; no new enrolment | Confirmed; data open | Ops + finance | Tier list and balances |
| D18 | Staff approve/reject publishable content with reason and audit | Confirmed; roles proposed | Clinic | Role table in design system |
| D19 | Admin publishes promotions and services; support channels | Confirmed; details open | Clinic | Hours, channels, response times |
| D20 | Old development starter (v1.0, web admin) must be updated | **Open** (your task) | You | Versioned starter before coding |
| D21 | SDK and device tests are developer work, not owner questions | Confirmed | Developer | — |
| D22 | Logo is only the full “nano BEAUTY” lockup; master square used exactly as sent, also as app icon | Confirmed | You | Your instruction, 25 Sep |
| D23 | Photos: 9 website photos approved for design; old-app catalogue not used | Confirmed 25 Sep | You + clinic | Clinic confirms rights and team consent |
| D24 | Fonts: Fraunces (headlines) + Sora (text), both free | Confirmed 25 Sep | You | Website uses Andora Modern Serif; switch only if licensed for apps |
| D25 | Staff roles: editor, approver, support, finance, admin | Confirmed 25 Sep | Clinic | Guideline: Staff workspace |
| D26 | Design first: finish all screens before Fresha, API, payment accounts or publishing. Dependent screens are designed on stated assumptions and swapped for real rules later | Confirmed 25 Sep | You | Your instruction; blocking questions deferred |
| D27 | Website service list used as the draft catalogue until a Fresha export exists | Confirmed 25 Sep | You | Draft categories in Phase 2 doc |
| D28 | Navigation Option B: Home, Treatments, Visits, Wallet + Book button + profile button | Confirmed 25 Sep (to be tested) | You | Phase 2 doc |
| D29 | Categories and concerns kept as drafted; staff can rename, reorder, add or move them after launch in the staff workspace (STF-04) | Confirmed 25 Sep | You | Phase 2 and Phase 3 docs |
| D30 | App icon: master colours (white nano BEAUTY on plum) with the logo at 80% width for padding | Confirmed 25 Sep | You | Canvas ICN-01; nano-beauty-app-icon-final.zip |
| D31 | Usability tests (Phase 4) postponed; the test plan is ready for later | Confirmed 25 Sep | You | Phase 4 Usability Test Plan |
| D32 | Clinic rules (A1–A8) and copy/price sign-offs collected when the app is built; sample content stays badged until then | Confirmed 25 Sep | You | Phase 7 handoff, open dependencies |
| D33 | Booking happens in Fresha: the app hands off to Fresha, and the clinic accepts and manages bookings there. In-app booking screens are parked for a possible future booking system with an API | Owner direction 25 Sep; pending client confirmation (design unchanged until then) | You | Flows 3H/3, BKG, HOM, VIS, STF-32 |
| D34 | One staff role: everyone given staff access gets the full admin panel; every change is still recorded in the audit log (replaces D25 and the three-role proposal) | Owner direction 25 Sep; pending client confirmation (design unchanged until then) | You | Phase 2 staff map, STF-13, STF-38 |
| D35 | No approval step: staff publish after a confirm step. The approvals queue is dropped from v1; a second-approver option can return later if the team grows | Owner direction 25 Sep; pending client confirmation (design unchanged until then) | You | Flow 9 v2, STF-08/09, STF-32 |
| D36 | Archive, don't delete: drafts can be deleted; anything customers booked, bought or saw is archived and restorable, with confirm and audit | Confirmed by owner 25 Sep | You | STF-39, spec 2 |
| D37 | Rules become settings: A1–A8 and payment switches are edited in staff settings; customer screens read them | Confirmed by owner 25 Sep | You | STF-31, STF-32, spec 1 |
| D38 | Membership is not shown anywhere in the app, including for old-app members; any existing member benefits are handled by the clinic at the desk | Owner direction 25 Sep; pending client confirmation (design unchanged until then) | You | WAL-01, WAL-05 |
| D39 | Staff screens stay phone-first, with a two-column tablet layout for long forms; no web admin | Confirmed by owner 25 Sep | You | Staff forms (TAB boards) |
| D40 | Services can be typed in by hand or imported from a Fresha export; import is optional | Confirmed by owner 25 Sep | You | STF-41, STF-42 |

**Sources, in priority order:** your direct answers → requirements v1.1 (handoff Appendix A) → handoff §§1–11 → Risks FA file → nanobeautystar.com and app.nanobeautystar.com (observed 25 Sep 2026) → master logo PDF.

## Conflict register

11 conflicts found across the sources: 6 resolved, 1 proposed, 4 open until their owner answers.

| ID | Conflict | Resolution for design | Status |
| --- | --- | --- | --- |
| C01 | Handoff §7 has phases 0–8; Appendix A has 0–9 with a separate benchmark phase | Follow §7; benchmark work folds into Phase 2 | Resolved |
| C02 | Handoff says the reference PNG controls the look; you said ignore it | Your instruction wins; direction designed from the brief's words | Resolved |
| C03 | Handoff asks for a new related app icon; you require the logo exactly as sent | Master square is the app icon; no redrawn icon | Resolved |
| C04 | Old app, requirements (Home/Explore/Book/Wallet/Account) and development starter use different tabs | Tabs decided in Phase 2 from customer tasks | Open until Phase 2 |
| C05 | DISC 08 (favourites) is “Should” but D01 puts it in backlog | Out of v1 | Resolved |
| C06 | Development starter plans a separate web admin; you chose admin inside the app | Design in-app staff workspace only | Resolved for design; starter update is yours (D20) |
| C07 | Website books through Fresha; old app opens its own service picker first | Booking entry designed both ways until D13 is answered | Open (D13) |
| C08 | Website says “Klarna and Klarna”; old app shows an Afterpay banner; requirements say Debit, Klarna, Affirm | Design Debit, Klarna, Affirm only; Afterpay hidden (PAY 11) | Resolved |
| C09 | Service names and prices differ between website, Fresha and old app | Canonical list needed before final service screens; website list used as draft | Open (D14) |
| C10 | Old app membership tiers conflict in names and benefits | Read-only member status with sample text until reconciled (MEM 03) | Open (D17) |
| C11 | Website headline font (Andora Modern Serif) vs design system (Fraunces) | Fraunces unless an app licence for Andora exists | Proposed (D24) |

## Dependency and risk register

Four outside dependencies block about a third of the screens; none blocks Phase 2 or the independent flows.

| ID | Risk / dependency | Level | Blocks | Owner | Evidence needed | Fallback while open |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | Fresha connection unknown (API vs hand-off) | Critical | Time selection, booking confirm, reschedule, cancel, appointment list | Ops + developer | Fresha plan/partner API access, one test booking, return behaviour | Design both paths; hand-off path uses Banner + return AsyncStatus |
| R02 | Old-app data (balances, packages, gift cards, members) may not be exportable | Critical | Wallet, account match, member status, migration notices | You + developer | Export or DB access, record counts, customer IDs | Sample-labelled wallet; assisted recovery via clinic |
| R03 | Debit / Klarna / Affirm not confirmed technically | High | Checkout, refunds, receipts, financing messages | Finance + developer | Merchant accounts, provider, sandbox | Payment rows show only confirmed methods |
| R04 | No canonical service list | High | Explore, search, categories, treatment detail, staff catalogue | Clinic ops | Fresha service export (name, category, duration, price type, staff) | Website service list as draft, marked Sample |
| R05 | Clinical copy (prep, aftercare, contraindications) not approved | High | Treatment detail, care timeline, notifications | Clinical lead (Naz?) | Approved text per service | Placeholder text marked “clinic to write” |
| R06 | Booking, deposit, cancellation and refund rules unknown | High | Booking review, cancel dialog, policy pages | Clinic ops | Written policy | Sample policy labelled “clinic to confirm” |
| R07 | Photo rights and team consent | Medium | Hero, team, treatment images | Clinic | Written OK from clinic and each team member | Placeholders |
| R08 | Old development starter conflicts with v1.1 | High (for coding) | Coding only | You | Versioned starter, NANO-02/15/16 updated | Design proceeds; coding waits |
| R09 | Staff roles and approval rules unconfirmed | Medium | Staff workspace screens | Clinic | Who can edit, approve, publish | Proposed 5-role model |
| R10 | Support channels, hours, response times | Medium | Support hub, contextual help | Clinic | Hours, phone/text/email, response time | “Hours to be confirmed” |
| R11 | Usability testing needs real participants | Medium | Phase 4 gate | You | 3–5 clients, 1–2 staff | Hallway test with staff only |

## Screen and state coverage plan

About 194 screens and states across 19 areas: 108 can be drawn now, 86 wait on a dependency, and 6 of the total are already drawn. Counts are estimates to be firmed up in Phase 2.

| Area | Screens and key states | Requirement IDs | Est. screens | Depends on | Can start |
| --- | --- | --- | --- | --- | --- |
| Entry | Splash, update required, maintenance, permission education (notifications, calendar) | NFR 07, PRIV 06 | 6 | — | Now |
| Sign-in and register | Phone entry, OTP, consents, profile basics, session expired, rate limited, recovery | AUTH 01–03, 09–10 | 12 | — | Now |
| Returning-customer match | Matched, mismatch, not found, assisted recovery, migration notice | AUTH 11, LEG 04, LEG 06 | 8 | R02 | Conditional |
| Home | Guest, returning with visit, returning without visit, offline, loading | DISC 01, DISC 11 | 7 | — | Now (3 drawn) |
| Explore and search | Categories, concerns, search, results, filters sheet, no results, offline | DISC 02–05, DISC 10 | 12 | R04 (content only) | Now |
| Treatment detail | Standard, consultation-required, promo price, unavailable, professional detail | DISC 06–07, DISC 09 | 8 | R04, R05 (content) | Now (1 drawn) |
| Booking | Entry, service, professional, date/time, checking, no times, slot taken, hold expiring, intake, review, Fresha hand-off, return | BOOK 01–06, BOOK 13 | 18 | R01, R06 | Conditional (1 drawn) |
| Payment | Method choice, provider hand-off, pending, success, declined, timeout, cancelled, receipt | PAY 01–09, PAY 12 | 12 | R03 | Conditional |
| Appointments | Upcoming, past, detail, reschedule, cancel consequence, cancelled, no-show, calendar added, rebook | BOOK 07–12 | 14 | R01, R06 | Conditional |
| Offers | List, detail, terms, code entry (5 error states), upcoming, expired, deep-link landing | PROMO 03–06, PROMO 09 | 12 | — | Now |
| Wallet | Overview, empty, reconciling, credit detail, history, receipt, discrepancy help | WALT 08, 10–12 | 10 | R02 | Conditional (1 drawn) |
| Packages | List, detail, buy, balance, book a session, expired | WALT 05–07, BOOK 14 | 8 | R02, R03 | Conditional |
| Gift cards | Buy (value, recipient, message, schedule), review, status, claim, balance, errors | WALT 01–04 | 12 | R02, R03 | Conditional |
| Membership (existing) | Read-only status, benefits, support, migration notice | MEM 02–03, REWD 02 | 4 | R02 | Conditional |
| Support | Hub, FAQ, article, contact, contextual help, reference, channel unavailable | SUP 01–04 | 8 | R10 (content) | Now |
| Notifications | Inbox, message detail, preferences | NOTIF 01–05 | 5 | — | Now |
| Account and privacy | Profile, consents, privacy, data request, delete account (explain, confirm, pending), legal pages, sign out | AUTH 04–06, PRIV 01–08 | 12 | — | Now |
| Care | Preparation, day-of, aftercare timeline, escalation | NOTIF 03 | 4 | R05 (content) | Now |
| Staff workspace | Entry, services list/edit/publish, campaign editor/schedule/preview, approvals queue, reject reason, audit log, value lookup, edit conflict, no permission, offline | ADMIN 01–10, PROMO 01–02 | 22 | R09 | Now (1 drawn) |

**Totals:** 108 screens in “Now” areas and 86 in “Conditional” areas (the 6 drawn screens are included). Every screen also gets light and dark versions; iOS/Android differences are handled by components, not duplicate screens.

## Blocking questions

Only questions that block a screen are listed. None of them stops Phase 2.

**You (product owner)**

- [ ] Approve D23–D25: website photos, Fraunces + Sora fonts, the 5 staff roles.
- [ ] Can you get old-app database or export access, and who is the technical contact? (R02)
- [ ] Will you recruit 3–5 clients and 1–2 staff for 20-minute tests after Phase 3? (R11)

**Clinic operations**

- [ ] Export the active service list from Fresha: name, category, duration, price type, which staff perform it. (R04)
- [ ] Written rules for deposits, holds, cancellation, no-show, reschedule and refunds. (R06)
- [ ] Support hours, channels (call, text, email) and expected response time. (R10)
- [ ] Which Fresha plan the clinic is on, and whether booking in the app may hand off to Fresha. (R01)

**Clinical lead**

- [ ] Who approves treatment descriptions, preparation, aftercare and “is it right for me” text? (R05)
- [ ] Confirm concern categories: acne, pigmentation, hair loss, skin tightening, hair removal, others? (DISC 04)

**Finance**

- [ ] Which payment provider and merchant accounts exist for debit, Klarna and Affirm? (R03)
- [ ] Counts and balances of open gift cards, packages, credits and memberships. (R02)

**Clinic team**

- [ ] Written consent from Naz, Maria and Anna to appear in the app; confirm rights to the website photos. (R07)

## Gate record

Phase 0 passes when you accept this register; open dependencies don't block the gate, they block only their own screens.

- [x] Sources read: requirements v1.1, handoff, Risks FA, both websites, master logo
- [x] Decisions, conflicts and risks recorded with owners
- [x] Screen coverage plan with requirement IDs
- [x] Brand assets: logo received; website photos collected
- [x] You accept this register (tick, or comment what to change)
- [ ] Blocking questions sent to their owners

Changes after acceptance are logged here as a new decision ID with date and impact.

## Phase 6 status and QA (25 Sep)

All 92 screens from the Phase 3 inventory are on the design canvas in light and dark: batch 1 (55) and batch 2 (37: booking, payment, visits, wallet). Batch 2 uses the sample rules A1–A8, and every screen that depends on them carries a Sample badge.

| Check | What was tested | Result |
| --- | --- | --- |
| Fit | Every screen and every state switch, light and dark (282 renders): text off the edge, text clipped inside cards, content past the bottom | 0 issues after fixes |
| Accessibility | Automated check of contrast, button and link names, labels, image text | 0 issues after fixes |
| Links | Every link points to a real screen; 82 screens now play as a clickable prototype | 0 broken |
| Data | Missing values, runtime errors, sample numbers that disagree between screens | Fixed |

Fixes made during QA:

- Links now work in Play: buttons inside links no longer swallow the tap, and link text keeps its colour.
- Main journeys are wired: Home → booking → payment → booked, Home → visit, Wallet → package and gift card, Account rows, sign-in steps, staff approvals.
- Screens that showed several states at once now use a state switch in Tweaks: sign-in code (entering, wrong, expired), session expired or rate limited, and promo code (6 messages).
- Unavailable days on the calendar now meet contrast; a disabled professional looks disabled.
- Sample numbers agree across screens: clinic credit $40, gift card $95, laser package 3 of 6 left.
- The Book button no longer covers content on Home and Treatments.

Parked for you (nothing here blocks the design):

- Confirm or correct the sample rules A1–A8 (deposit, 48-hour policy, 10-minute hold, gift card values, support hours).
- Payment provider name and clinic hours still show as placeholders.
- Package names and prices are samples until the clinic sends its list.
- Tab bar and top-bar back arrows don't navigate in Play (they are components); use the in-screen buttons.
- Still open from other phases: app icon exports (Phase 1), usability tests with 3–5 clients and 1–2 staff (Phase 4), then developer handoff (Phase 7).

## Progress update (25 Sep, later)

Overall progress is about 85%, up from 65%. Everything left needs other people: your icon pick, test participants, clinic and finance sign-offs, and a coded app.

| Added | Where |
| --- | --- |
| 36 more screen states (85 in total), all in Tweaks: offline, loading, empty, price kinds, promo errors, sign-in errors, staff conflict, offline and save-failed, and more | Design canvas |
| 8 playable motion prototypes with a Reduce Motion switch | Design canvas, Motion row |
| 3 app icon options with iOS and Android export sets (A recommended: your master square) | Design canvas, App icon row; nano-beauty-app-icons.zip in your Nano Beauty Design System folder |
| Developer handoff: route map, state contracts, roles and permissions, motion recipes, asset sizes, test data, QA checklist | Phase 7 Developer Handoff doc; routes.json and fixtures.json in the design system |
| Usability test plan: recruiting, script, 12 tasks, note sheet, scoring | Phase 4 Usability Test Plan doc |

QA on everything: 194 renders in light and dark, 0 fit issues, 0 accessibility issues; every motion prototype was clicked through in a browser.

Next from you: pick an app icon, recruit the test participants, and send the clinic's written rules (A1–A8).

## Status after your decisions (25 Sep)

> **Superseded 25 Sep.** The paragraph below was written before Phase 9. Phase 9 (design v1.2) added 57 boards and closed CR-01 to CR-55; see “Phase 9 result” further down.

The design work is complete. With the icon approved (D30), tests postponed (D31) and clinic rules deferred to the build (D32), nothing is left in Phases 0–7 that design can do now. What remains happens once the app is being built: the developer reviews the handoff, the clinic confirms rules and copy, the usability tests run if you bring them back, and Phase 8 design QA compares the test builds with the canvas.

## Phase 9 baseline v1.1 (Stage 0, 25 Sep)

The design as it stands today is frozen as baseline v1.1. Every Phase 9 change is measured against it and logged as a change request below.

| Source | Baseline version | Contents |
| --- | --- | --- |
| Design canvas | 1790328399-e3a2 | 101 boards: 92 screens, 8 motion prototypes, app icon; 85 extra states |
| Design system | 1790327757-870a | 46 components, tokens (light/dark), 13 guidelines, routes.json, fixtures.json |
| Phase 0 register | rev 20 | D01–D32, C01–C11, R01–R11 |
| Phase 3 flows | rev 15 | 9 flows, A1–A8, 92-screen inventory |
| Phase 7 handoff | rev 15 | Routes, state contracts, roles, motion, assets, fixtures, QA |

A full copy of the canvas and design-system files at these versions is kept with the project work, so any screen can be compared with or restored to v1.1.

Sources read for Stage 0: the Phase 9 brief, the gap analysis, the Phase 0, 2, 3 and 7 docs, the canvas and the design system.

## Phase 9 change register (opened 25 Sep)

Each gap from the gap analysis has one change request. 37 are open for design work, 2 are design work that also needs outside input (CR-02 data export, CR-14 policy text), and 2 wait on the client (CR-03, CR-28). Status changes to Closed with a date when the work passes Stage 6 QA.

| CR | Gap | Planned fix | Status |
| --- | --- | --- | --- |
| CR-01 | G01 Fresha has no booking API | D33, Flow 3H, BKG-08, 09, 12, HOM-02/03, VIS-01/02, STF-32 | Closed 25 Sep |
| CR-02 | G02 Old-app (Lead360) data and matching | STF-27, STF-28, Flow 13; export itself is a Dependency | Closed 25 Sep (design). Export still a dependency |
| CR-03 | G03 Shop, rewards, referrals, check-in scope | Dependency: client confirms scope | Dependency: client (no design work until scope is confirmed) |
| CR-04 | G04 No package admin | STF-15, STF-16 | Closed 25 Sep |
| CR-05 | G05 No gift-card settings | STF-17 | Closed 25 Sep |
| CR-06 | G06 No gift-card actions | STF-18 | Closed 25 Sep |
| CR-07 | G07 No promo-code admin | STF-19, STF-20 | Closed 25 Sep |
| CR-08 | G08 No professionals admin | STF-21, STF-22 | Closed 25 Sep |
| CR-09 | G09 No appointment or request handling | Flow 12, STF-23, STF-24 | Closed 25 Sep |
| CR-10 | G10 No customer search or match check | Flow 13, STF-26–28 | Closed 25 Sep |
| CR-11 | G11 Refunds and balance fixes only proposed | STF-11 v2, STF-18, Flow 9 v2 | Closed 25 Sep |
| CR-12 | G12 No push or inbox messages from staff | STF-35, NTF-10 | Closed 25 Sep |
| CR-13 | G13 No control of offers on Home | STF-34 | Closed 25 Sep |
| CR-14 | G14 No policy editing | STF-33 (text itself: Dependency on client/legal) | Closed 25 Sep (design). Policy text still a dependency |
| CR-15 | G15 Clinic info and hours only partly editable | STF-31 | Closed 25 Sep |
| CR-16 | G16 Rules A1–A8 hard-coded | D37, STF-32, spec 1 | Closed 25 Sep |
| CR-17 | G17 No media library | STF-36, ImagePicker | Closed 25 Sep |
| CR-18 | G18 Customer messages have no staff inbox | Flow 14, STF-29, STF-30 | Closed 25 Sep |
| CR-19 | G19 No reports | STF-37, StatTile | Closed 25 Sep |
| CR-20 | G20 No delete or archive | D36, STF-39, PublishState, spec 2 | Closed 25 Sep |
| CR-21 | G21 Approval can deadlock | D34, D35, STF-08/09 v2 | Closed 25 Sep |
| CR-22 | G22 Can't change roles or remove staff | STF-13 v2, STF-38 | Closed 25 Sep |
| CR-23 | G23 Service edit shows 5 of 13 fields | STF-03 v2, FormSection | Closed 25 Sep |
| CR-24 | G24 Campaign editor incomplete; no event templates | STF-05, STF-06 v2 | Closed 25 Sep |
| CR-25 | G25 Categories can't be renamed or moved | STF-04 v2 | Closed 25 Sep |
| CR-26 | G26 No counter redemption | Flow 10, STF-25 | Closed 25 Sep |
| CR-27 | G27 One service per booking; no area picker | Flow 3 v2, BKG-01, 05, 10, 11, AreaPicker, ServiceBasket | Closed 25 Sep |
| CR-28 | G28 Group booking | Dependency: client confirms need | Dependency: client (no design work until scope is confirmed) |
| CR-29 | G29 No treatment FAQ or financing line | TRT-05 v2, FAQBlock, STF-40, spec 1 | Closed 25 Sep |
| CR-30 | G30 No reviews or rating | RatingSummary, off by default until the client decides | Closed 25 Sep |
| CR-31 | G31 Consultation shown free; Fresha says $20 credited | TRT-05, BKG-01, spec 1 and 5 | Closed 25 Sep |
| CR-32 | G32 No gift-card designs | WAL-13, GiftDesignPicker, STF-17 | Closed 25 Sep |
| CR-33 | G33 Gift recipients without the app | Flow 11, NTF-07, WEB-01, WEB-02 | Closed 25 Sep |
| CR-34 | G34 No Apple Pay or Google Pay | PAY-01 v2, WalletPayButton, STF-32 | Closed 25 Sep |
| CR-35 | G35 Membership visible against the client's wish | D38, WAL-01, WAL-05 v2 | Closed 25 Sep |
| CR-36 | G36 Help hub lacks directions, parking, questions | SUP-01 v2, SUP-04, SUP-05 | Closed 25 Sep |
| CR-37 | G37 Android web deletion page | WEB-03, WEB-04 | Closed 25 Sep |
| CR-38 | G38 No notification templates (customer and staff) | NTF-01–12 | Closed 25 Sep |
| CR-39 | G39 No analytics event map | Spec 4 | Closed 25 Sep |
| CR-40 | G40 Sample prices wrong; services missing from catalogue | Spec 5 | Closed 25 Sep |
| CR-41 | G41 Entering the catalogue on a phone is slow | D39, D40, STF-41, STF-42, TAB-01–07 | Closed 25 Sep |
| CR-42 | R1 Hand-off path from Book broken | BKG-01 mode switch, TRT-05 consultation CTA by mode | Closed 25 Sep |
| CR-43 | R2 routes.json mode flags contradict the canvas | routes.json: BKG-01, BKG-10, /visits/\[id\] both; BKG-11 inapp | Closed 25 Sep |
| CR-44 | R3 STF-24 can't move a Fresha booking | STF-24 mode state: move in Fresha, then mark done | Closed 25 Sep |
| CR-45 | R4 Price inconsistencies across screens and fixtures | Public laser area list; one package price ($378); SQT 4 for $1,200; fixtures | Closed 25 Sep |
| CR-46 | R5 Accessibility: fake checkboxes, broken menu labels | BKG-01 real checkboxes; plain-text menu labels | Closed 25 Sep |
| CR-47 | R6 Fresha-dependent promises | BKG-08, BKG-12 hedged copy + Assumption badge | Closed 25 Sep |
| CR-48 | R7 Rules invented outside the settings model | Spec 1 rows added; STF-17, STF-24, WEB-04 updated | Closed 25 Sep |
| CR-49 | R8 Invented details about real staff | Titles and bios are placeholders (STF-13, 21, 22, TAB-04, BKG-02, TRT-06) | Closed 25 Sep |
| CR-50 | R9 Clinical claims unbadged | Sample / clinic-to-approve badges; placeholders (TRT-05, STF-40, TAB-01, STF-30) | Closed 25 Sep |
| CR-51 | R10 STF-03 draft banner ignores D35 | Banner by role and setting | Closed 25 Sep |
| CR-52 | R11 Front desk shown submitting a price change | Submitter is Maria (Editor): STF-08, 09, 33, NTF-12 | Closed 25 Sep |
| CR-53 | R12 Gift steppers disagree | WAL-08–10 use Design, Value, Recipient, Review | Closed 25 Sep |
| CR-54 | R13 Rating sample count | 4.9 from 357 (HOM-01, STF-34, fixtures) | Closed 25 Sep |
| CR-55 | R14 Stale text | Phase 3 old Flow 9 and 92-screen inventory, Phase 0 completion paragraph marked superseded | Closed 25 Sep |
| CR-56 | Round 3: GLOW25 missing from the promo-code list | Added to STF-19 and fixtures promoCodes | Closed 25 Sep |
| CR-57 | Round 3: HydraFacial not a confirmed service | OxyGeneo facial on STF-06, 15, 20, 23, 24, 27, TAB-02; import duplicate kept as sample | Closed 25 Sep |
| CR-58 | Round 3: past laser visit NB-19877 at $90 | $70 on VIS-07 and in fixtures appointments | Closed 25 Sep |

### Phase 9 result (Stages 1–7 run without gate stops at the owner’s request, 25 Sep)

39 of 41 CRs closed; CR-03 and CR-28 wait on the client. Design is now v1.2.

**Review fixes (25 Sep):** 14 findings from the pre-sign-off review were logged as CR-42 to CR-55 and closed the same day (details in the Phase 7 doc → “Review fixes before sign-off”). Stage 6 re-run: 405 renders per theme, 0 fit issues, 0 axe violations, 0 dead links. Still for the owner: confirm D33–D40 (especially D34 and D38) and choose the web host for WEB-01 to WEB-04 (app.nanobeautystar.com still runs the old Lead360 app).

- **Canvas:** 158 boards (+57: 34 app screens, 7 tablet layouts, 4 web pages, 12 notification templates); 29 boards revised.
- **Design system:** 62 components (+17), 98 icons; published with READMEs and previews.
- **QA (Stage 6):** 402 renders per theme, 0 fit issues and 0 axe violations in light and dark; 0 dead links; mode, role, truth-first and traceability checks passed. Details in the Phase 7 doc → “QA results v1.2”.
- **Handoff (Stage 7):** Phase 7 doc v1.2 (specs 1–5, roles v2, booking modes, changelog, starter note); `routes.json` 108 routes with booking mode and roles; `fixtures.json` v1.2.
- **Open dependencies:** client scope (G03, G28); old-app export (G02); policy wording (G14); clinic phone, hours, parking and bios; web host for WEB pages; Fresha data access for visit sync; Apple Pay / Google Pay merchant setup.
- **Next:** owner review of v1.2, then benchmarking.

Gate 0 (owner):

- [ ] Baseline v1.1 confirmed
- [ ] Every gap G01–G41 has a CR
