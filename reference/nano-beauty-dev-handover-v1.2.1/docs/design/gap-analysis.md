# Nano Beauty App — Gap Analysis before Benchmarking

Sep 25, 2026 · @Dragon

The screens are close to complete, but three things would break the build if left as they are: the in-app booking flow depends on a Fresha API that doesn't publicly exist, the admin workspace covers only about a third of what staff must manage, and the GPT docs moved more features to the backlog than the client asked for.

## What I reviewed

I reviewed everything the earlier chat produced, all four GPT docs, the live website and the old app. I couldn't open the earlier chat's transcript directly, only its published outputs. Those outputs are listed below.

| Source | What it holds | Read |
| --- | --- | --- |
| Phase 0 register (earlier chat) | Decisions D01–D32, conflicts C01–C11, risks R01–R11 | In full |
| Phase 2 navigation (earlier chat) | Tasks, IA options A/B, route map, draft categories, staff map | In full |
| Phase 3 flows (earlier chat) | 9 flows, sample rules A1–A8, inventory of 92 screens | In full |
| Phase 7 developer handoff (earlier chat) | Routes, state contracts, roles, motion, assets, fixtures, QA | In full |
| Design canvas "Nano Beauty App Screens" | 92 screens + 8 motion boards + icon | All 14 staff screens and 18 key customer screens opened; other screens checked by file list |
| Design system "Nano Beauty" | Tokens, 46 components, README | README and token export |
| GPT requirements v1.1 | Scope, requirement IDs, legacy disposition | In full |
| GPT handoff + "Send to Claude Design" prompt + Risks (FA) | Brief, decisions, phases | In full |
| nanobeautystar.com | Sitemap, 21 service pages, landing pages, contact, legal pages | Crawled, 25 Sep |
| app.nanobeautystar.com | Guest home, routes, manifest, service worker | Guest view only; scripts were blocked |
| Fresha listing | Services, prices, team, hours | Partly (full menu not extractable) |

Housekeeping: two other artifacts named "Design System" in your gallery are empty shells from this project and can be deleted. The Phase 4 usability test plan exists but wasn't needed for this review.

## Critical findings

Eight issues need an answer before the dev team starts. The first two change the architecture, not just screens.

| # | Finding | Why it matters | Recommended action |
| --- | --- | --- | --- |
| 1 | **Fresha has no public API.** It offers only a read-only data connector: no booking write access, no webhooks, no availability feed. The design's main booking flow (BKG-01–07, reschedule, cancel, visit list) assumes booking happens inside the app (assumption A1). | The flagship flow may be impossible as drawn. Deposits, packages and gift cards would then also live in Fresha, and the app's Klarna/Affirm checkout would apply only to items sold in the app. | Decide now between (a) Fresha hand-off (BKG-08/09 becomes the main path), (b) moving booking to a platform that has an API, or (c) a custom booking backend. Run a one-day tech spike before coding. |
| 2 | **The old app is a Lead360 white-label product** (a CRM/commerce platform), not a custom build. The GPT docs never identified the vendor. | Customer accounts, balances, packages, gift cards and memberships sit in Lead360. Export depends on Lead360's contract and tools. | Ask the client who administers Lead360, and request an export sample of customers, gift cards, credits and packages. |
| 3 | **Scope went beyond the meeting.** The client moved only membership to the backlog and said all services must stay. The GPT docs also moved the product shop, rewards, referrals, check-in and favourites to the backlog. The earlier chat recorded that as approved (D01). | If the client meant "keep everything the old app does", the app ships missing features they expect. | Confirm the Keep/Backlog list with the client in writing (list in the next section). |
| 4 | **Admin covers about a third of what staff manage.** There are no screens for packages, gift-card settings, promo codes, professionals, appointments, customers, policies, notifications or clinic settings, and there's no delete or archive action anywhere. | ADMIN 04 (packages and gift cards) is a Must with no screen. Staff would need database edits for the promotions and gift cards the client asked for. | Add about 12 staff screens (see the admin section). |
| 5 | **The approval rule can deadlock a small clinic.** Price and offer changes need a second approver who isn't the submitter. With 2–5 staff and Naz as the likely only approver, her own edits can't be approved. | Twice-monthly campaigns could get stuck. | Let the owner/admin self-publish with a confirm step, and keep two-person approval optional per setting. |
| 6 | **The design runs on invented rules** A1–A8: a $50 deposit over $150, a 48-hour window, a 10-minute hold, gift cards $25–$500 and a free consultation. Fresha shows the consultation at **$20, credited to the treatment**, and the design says "Free". | Claude coding from the fixtures will hard-code them. | Make the rules server settings editable by admin. Replace them with the client's real rules. |
| 7 | **Legal pages are empty.** The website's Privacy Policy and Terms pages have a heading and no text. | Both stores require a working privacy-policy URL. Google Play also needs a web page for account deletion. That is a submission blocker. | Client/legal writes privacy, terms, and cancellation and refund policy. Host a small deletion page. |
| 8 | **Membership is still in the design** (Wallet row "Membership: Active", screen WAL-05, fixture "Glow member"). The client said not in the app right now. | It contradicts the client's instruction. | Hide it by default. Show it only for a customer who has an active legacy membership, if the client agrees (continuity). |

## Meeting notes vs docs and design

Every meeting item has customer screens. The gaps are in the staff side, in the flows around each item, and in one scope question.

| Meeting item | What the docs and design did | Gap |
| --- | --- | --- |
| Redesign and publish on the App Store and Play Store | React Native / Expo, iOS + Android, 92 screens, light/dark | No release phase: store listing, screenshots, privacy labels, reviewer demo account and developer accounts aren't planned. Requirements Phase 9 was dropped. |
| Old app disliked, web-only | New native app; the old IA was deliberately not copied | The migration and cutover plan (LEG 01–08) is only described. Vendor, export and shutdown date are unknown. |
| Klarna, Affirm, debit card | Method picker, card form, provider hand-off, 8 result states | No Apple Pay / Google Pay. In Canada, "debit" usually means Interac, which works in apps only through those wallets. No payment provider has been chosen. |
| Priority on design and function | Strong: states, accessibility, motion, truth-first rules | Function depends on the Fresha decision (finding 1). |
| All services must stay (booking and everything else) | Read as "all treatments". Shop, rewards, referrals and check-in moved to the backlog | **Confirm with the client**: treatments only, or every old-app feature? The draft catalogue also lacks about 10 Fresha services (see content conflicts). |
| Promotions, 2+ per month (Halloween, Canada Day, own offers) | Campaign list, editor, preview, schedule, offer page, promo-code errors | The editor has no image upload, discount type or value, body text, promo-code creation, push scheduling, duplicate-last-year, or calendar view. There are no event templates for recurring holidays. |
| Gift cards | Buy (value, recipient, message, date), claim, balance, sent status | No staff settings. No occasion designs (the old app had 6). The recipient's text or email message and a web page for recipients without the app aren't designed. Nothing covers redeeming at the clinic counter. |
| Packages | List, buy, balance, book a session | No staff screens to create or edit packages. Nothing covers marking a session used at the clinic, or how packages bought in the app are redeemed if booking stays in Fresha. |
| Membership: backlog, maybe later | Kept as read-only "existing member" status | Conflicts with "don't want it in app right now" (finding 8). |
| Support | Help hub, FAQ, call/text, contact with reference, balance-help form | Messages from the contact and balance-help forms have no staff inbox. Channels, hours and reply time are unconfirmed. |

## Admin panel coverage

The staff workspace (STF-01–14) handles services, categories, campaigns, approvals, FAQ, value lookup, audit and team. Of the 21 content types below, 8 have any staff screen, and none has a delete or archive action.

| Content type | List | Create | Edit | Delete / archive | Publish / approve | Screen | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Services | Yes | Yes | Partial | No | Yes | STF-02/03 | Edit shows 5 of the 13 catalogue fields. Missing: description, category, professionals, prep and aftercare, photo and alt text, deposit rule, visibility |
| Categories and concerns | Yes | Yes | Reorder only | No | Yes | STF-04 | No rename or move screen |
| Campaigns | Yes | Yes | Partial | No | Yes | STF-05/06/07 | No image, discount value, body text, audience detail, pause/end button or duplicate |
| Approvals | Yes | — | — | — | Yes | STF-08/09 | Deadlock risk (finding 5) |
| FAQ and contact | Yes | Yes | No screen | No | Unclear | STF-10 | Hours field only; no editor |
| Team and roles | Yes | Invite | No | No | — | STF-13 | Can't change a role or remove a leaver |
| **Packages** | No | No | No | No | No | — | ADMIN 04 is a Must |
| **Gift-card settings** (values, designs, terms) | No | No | No | No | Via approval only | — | ADMIN 04 is a Must |
| **Gift-card actions** (resend, void, reissue) | No | No | No | No | No | — | Needed for support cases |
| **Promo codes** | No | No | No | No | No | — | Customers can enter codes, but staff can't create them |
| **Professionals** (bio, photo, services) | No | No | No | No | No | — | Customers see TRT-06 |
| **Appointments** (today, requests, late changes, no-shows) | No | No | No | No | No | — | VIS-02 has "awaiting clinic" and "change requested" states, but no one on staff can act on them |
| **Customers** (search, profile, account match) | No | No | No | No | No | — | AUT-06 says "clinic verifies" a mismatch; there is no staff screen for it |
| **Refunds and balance fixes** | Partial | Propose | No | No | Finance approves | STF-11 | Only a "propose fix" button |
| **Push / inbox messages** | No | No | No | No | No | — | PROMO 07 and NOTIF 05 |
| **Home layout** (which offers show) | No | No | No | No | No | — | "At most two" offers, but staff can't choose which |
| **Policies and legal text** | No | No | No | No | No | — | Cancellation, deposit, terms |
| **Clinic settings** (hours, closures, deposit, cancel window, hold time, payment methods on/off) | No | No | Hours only | No | No | STF-10 | Would replace hard-coded A1–A8 |
| **Media library** (photos, rights, alt text) | No | No | No | No | No | — | Every service and campaign needs images |
| **Support inbox** (contact and balance-help messages) | No | — | — | — | — | — | Customer forms have no destination |
| **Reports** (bookings, campaign results, sales) | No | — | — | — | — | — | The requirements' success measures need them |

Delete rule to agree before building:

- Drafts can be deleted outright.
- Anything a customer has booked, bought or seen goes through Archive/Hide instead, with a confirm dialog, an audit entry and a way to restore it.
- Deleting a service or package must say what happens to open bookings and unused sessions.

Portrait-phone-only admin will be slow for the first catalogue entry (24+ services with long text and photos). Consider a one-time import from the Fresha export, or tablet/landscape support for staff screens.

## Website and old app: what the new app doesn't cover yet

These exist today on the website, Fresha or the old app, and the new design neither includes nor explicitly excludes them.

| Today | Where | New app status | Suggestion |
| --- | --- | --- | --- |
| Several services or areas in one visit (e.g. laser "any 4 areas $180–190", chin + upper lip) | Website, Fresha | Booking picks one service | Add multi-select or add-ons to the booking step |
| Group appointment (book with a friend) | Old app booking choice | Not designed | Ask the client if it's used |
| Per-area laser price list, including men's areas | Laser landing page | The per-area price type exists, but there's no area picker | Area picker on laser detail |
| Service FAQs (6–10 per service) | Website service pages | Treatment detail has no FAQ block | Add a collapsible FAQ, admin-editable |
| Before/after galleries | Most service pages | Excluded by the design README ("no before/after") | Client decision; check advertising rules for injectables first |
| Reviews (4.9 from 357 on Fresha) and testimonials | Home page, Fresha | No trust surface | Rating summary plus a post-visit review prompt |
| Klarna financing message on every service | Website | Shown only at payment | Show "financing available" on eligible treatments once it's live (PAY 12) |
| $20 consultation, credited to treatment | Fresha | Designed as free | Fix the copy and pricing |
| Gift-card occasion designs (6) and "send a hint" | Old app | Not in flow | Keep designs; hint is optional |
| Referral credit ($50 each way) already earned | Old app | Backlog, and balances not inventoried | Include in the legacy value export |
| Check-in rewards, reward history, QR check-in | Old app | Backlog | Scope confirmation (finding 3) |
| Skincare product shop and cart | Old app | Backlog | Scope confirmation (finding 3) |
| Lead form "treatment of interest" | Landing pages | No equivalent | A "Not sure? Ask us" request that goes to the support inbox |
| Social links, maps, directions | Website | Address only | Add directions and parking to the help hub |

## Content and data conflicts

The public sources disagree with each other and with the design's sample data. Each row needs one answer from the clinic before real content goes in.

| Item | Source A | Source B | Design shows |
| --- | --- | --- | --- |
| Phone | 778-922-6778 (main site) | (778) 910-9509 (laser and microneedling landing pages) | (604) ••• placeholder |
| Hours | Website: Mon–Fri 10–6, Sat 9–4, Sun varies | Fresha: Mon–Sat 10–6, Sun 11–4 | "Hours to be confirmed" |
| Team | Website: Naz, Maria, Anna (RN) | Fresha: Nazanin, Atefeh (PMU), Anna (RN), Marija | Naz, Maria, Anna |
| Laser full face | "From $120" | "$250" (ad landing page) | Laser "From $90" (sample) |
| HIFU | Lower face $250; double chin $200 (Fresha) | — | "From $350" (sample) |
| Biomicroneedling SQT | $350 single; 4 for $1,200 | — | $280 (sample); packages $750 / $1,200 |
| Consultation | $20, credited to the treatment (Fresha) | Website: consultation required for every treatment | "Free" |
| "Doctor" | Microneedling page: "performed by the doctor herself" | No doctor named anywhere | — |

Services on Fresha that are missing from the draft catalogue (Phase 2): filler, fat dissolving, Liposonix, PRF, skin brightening, intimate skin brightening, Chrome nail fungus, Chrome Photo Frax, Plasma Frax, face massage and PMU (lip blush, eyeliner). HydraFacial appears only in a lead form. If "all services must stay", the clinic's Fresha export is the list to use, not the website.

The design uses public website photos and team names. Written consent from each team member and photo rights are still open (R07). Two photos are below the resolution needed for full-width use.

## Payments, legal and app-store gaps

Most of these are small individually. Several block store submission, so they belong in the plan now rather than at launch. This is not legal advice; the clinic's advisor should confirm the legal rows.

| Area | Gap | Action |
| --- | --- | --- |
| Debit | Canadian debit is usually Interac. Interac for in-app payments is new and runs through digital wallets (for example Stripe, since Feb 2026). The design's card form covers only Visa Debit and Mastercard Debit. | Add Apple Pay and Google Pay to the method list. Pick a provider that supports Interac in wallets. |
| Klarna and Affirm | Both operate in Canada, but the clinic's merchant accounts are unconfirmed. If booking stays in Fresha, deposits are paid there, not in the app. | Finance confirms accounts. Decide which purchases (packages, gift cards, deposits) run through the app. |
| Paying the rest at the clinic | Screens say "$300 due at your visit", but who records that payment, and in which system? | Define the counter (POS) process: redeeming packages and gift cards at checkout. |
| Gift-card expiry | In BC, most gift cards can't expire or carry fees. Requirement WALT 01 still mentions expiry. | Lock gift cards to "no expiry" in admin. Ask counsel whether package expiry ("use within 12 months") is allowed. |
| Injectable promotions | Canadian rules limit how prescription drugs such as Botox can be advertised to the public. | Get legal review of campaign templates and wording that mention injectables. |
| Marketing messages | Promotional push and SMS need consent records and unsubscribe (CASL). Consent separation is designed. | Keep offers opt-in. Add unsubscribe to every promotional SMS. |
| Privacy and terms URLs | Both website pages are empty. | Write them; both stores require them (finding 7). |
| Android deletion page | Google Play needs a web page for deletion requests; the website is "unchanged". | Host one page (for example on the app subdomain). |
| Deep links | Offer and gift links that open the app need verification files on a domain. | Use app.nanobeautystar.com or add the files to the website. |
| Gift recipients without the app | A texted or emailed gift link needs a web landing page. | Design a simple web claim page plus the text and email templates. |
| Developer accounts | An Apple organisation account needs the clinic's legal entity and a D-U-N-S number. Setup can take weeks. | Start now. Check that the name "Nano Beauty" is free in both stores. |
| Medical intake and consent forms | Excluded from v1 (NFR 06), but laser and injectables still need them. | Confirm they stay on paper or in Fresha, and say so in the booking copy. |

## Developer handoff gaps

The handoff covers the front end well: routes, state contracts, tokens, motion, fixtures and a QA list. A team coding with Claude also needs the back end and the working rules, and those are missing.

| Missing piece | Why a Claude-coding team needs it |
| --- | --- |
| Backend architecture: hosting, database, CMS or custom admin API, auth/OTP vendor, push vendor | The in-app admin needs a server; nothing says what it is or who builds it |
| Data model and API contract (entities, fields, statuses, endpoints, errors) | The requirements list entities but give no schema. Without one, Claude will invent it screen by screen |
| Booking integration spec (after the Fresha decision) | Decides half the endpoints |
| Settings model for A1–A8 and payment-method switches | Keeps invented rules out of the code |
| Analytics event map and consent-aware tracking plan | A required design artifact in the requirements that wasn't delivered |
| Notification templates: push, SMS and email for booking, reminder, change, cancel, receipt, gift delivered, refund | NOTIF 01 has no copy yet |
| One reminder sender | Fresha already sends reminders; if the app sends them too, clients get two |
| Updated development starter (D20, still open): v1.1 requirements, traceability, NANO-02/15/16, and removing the Vite web admin | Claude follows the repo's instructions; stale prompts will build the wrong admin |
| A repo CLAUDE.md: tokens only, truth-first states, server-side permissions, no hard-coded prices, sample badges | Keeps every session consistent |
| Tickets per screen ID with acceptance criteria, in build order | The requirements' "developer-ready files and tickets" |
| Staff-side screens from the admin section, plus staff notifications ("a change needs your approval") | Referenced in STF-08 but not designed |
| Device support: minimum iOS/Android versions, and whether iPad is supported or phone-only | Store builds need it (NFR 07) |

Process note: the earlier chat finished Phases 0–7 before benchmarking and before usability tests (both postponed or folded in). Benchmark findings will land on screens marked "done", so plan one revision pass after the benchmark. Test the Book button and the four-tab navigation (Option B) with real clients before coding locks it in.

## Decisions needed

Twelve questions, in priority order. The first four change the architecture or the scope, so they're worth one short call with the client before benchmarking.

**Client**

- [ ] Booking: stay on Fresha (app hands off to Fresha), move to a booking system with an API, or build our own? (finding 1)
- [ ] Scope: besides membership, should the shop, rewards, referrals and check-in also wait, or must they stay? (finding 3)
- [ ] Who runs the old Lead360 app, and can they export customers, gift cards, credit, packages and memberships? How many active members are there? (findings 2 and 8)
- [ ] Payment provider for card, Klarna and Affirm. Should Apple Pay and Google Pay be added?
- [ ] Real rules: deposit, cancellation window, no-show, hold time, gift-card values, package validity, consultation price ($20 or free)
- [ ] Staff: who is on the team, who approves, and is two-person approval wanted? (finding 5)
- [ ] Correct phone number, hours and team list, plus consent for names and photos
- [ ] Before/after photos and reviews in the app: yes or no?
- [ ] Multi-area and multi-service visits, and group bookings: needed?
- [ ] Who writes the privacy policy, terms and cancellation policy? Who holds the Apple and Google developer accounts?

**Tech lead**

- [ ] Backend, CMS, OTP, push and analytics vendors, and the data model owner
- [ ] Who sends reminders: Fresha or the app?

## Benchmark focus and sources

The benchmark will be most useful if it tests the open questions above rather than surveying visual style again. Four areas to cover:

- How clinic apps built on booking platforms without an API (Fresha-style) hand off booking and still feel native
- Mobile admin patterns for small teams: quick publish, archive/restore, campaign calendars
- Package and gift-card wallets, including redemption at the counter
- Multi-area and add-on booking for laser and med-spa services

**Sources** (opened 25 Sep 2026)

- Earlier chat outputs: [Phase 0 register](https://claude.ai/artifact/8sdRyvZZAAmdEXFQo7oDtm), [Phase 2 navigation](https://claude.ai/artifact/XrCCYiKDgWordUeq8PV2fv), [Phase 3 flows](https://claude.ai/artifact/TzGKMiW7TRMApz3oUQrNTJ), [Phase 7 handoff](https://claude.ai/artifact/SCMA9ApxvkoEU34bVVbNxw), [design canvas](https://claude.ai/artifact/5NA9BUxqPEpyu4AjJVLt8C), [design system](https://claude.ai/artifact/3uT3fESwWqALaQK6UjS3Uj)
- [nanobeautystar.com](https://nanobeautystar.com/), [laser price list](https://nanobeautystar.com/laser-hair-removal/), [microneedling landing](https://nanobeautystar.com/microneedling-at-nano-beauty/), [privacy policy (empty)](https://nanobeautystar.com/privacy-policy/), [terms (empty)](https://nanobeautystar.com/terms-of-service/)
- [Old app](https://app.nanobeautystar.com/home), [old app manifest](https://app.nanobeautystar.com/manifest.json), [Lead360](https://lead360.io/)
- [Fresha listing](https://www.fresha.com/a/nano-beauty-new-westminster-555-6th-st-130new-westminster-bc-v3l-5h1-koki9jiw)
- [Fresha API report card](https://supergood.ai/api-report-card/fresha), [Fresha data connector](https://www.fresha.com/help-center/knowledge-base/reports/432-data-connector-overview)
- [Interac debit in apps via Stripe](https://www.interac.ca/en/content/news/interac-debit-is-now-available-for-online-and-in-app-payments-with-stripes-customers/)
- [Consumer Protection BC: gift cards](https://www.consumerprotectionbc.ca/consumer-help/consumer-information-gift-cards/)
- [Klarna Canada](https://www.klarna.com/ca/)
