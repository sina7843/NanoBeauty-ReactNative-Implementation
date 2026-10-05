# Nano Beauty — Claude Design System and Waterfall Handoff

**Status:** Final Claude Design handoff v1.0 — owner-selected warm editorial direction; owner answers integrated; operational dependencies explicitly gated  
**Date:** 24 September 2026  
**Audience:** Product owner, clinic and brand owners, Claude Design, React Native engineering  
**Scope:** Customer and role-gated staff experiences within one iOS and Android app; the public website remains as it is  

> This document records what is known, what is proposed, and what must be decided. The owner-supplied `Nano_Beauty_Star_Mobile_App_Requirements-53.md` (v1.1, 24 September 2026) is reproduced in full in Appendix A and controls product scope, subject to newer direct owner answers. The owner has now selected the earlier visual reference **“2 — Warm & Editorial”** (`visual-references/FINAL_Selected_Warm_Editorial_Home.png`) as the authoritative aesthetic direction. Later glass/blur explorations are superseded for visual priority. The design system uses solid/tonal surfaces by default; blur and iOS Liquid Glass are not required. Claude Design must create the full end-to-end design and specify motion as a first-class part of its one shared system.

## 1. Product intent and authority

Build a clinic-owned mobile experience for discovering treatments, making and managing appointments, understanding care, and handling approved transactions. The new app replaces the current Nano web app; the existing public website remains unchanged. Product quality and design quality have equal weight.

The final handoff is to be self-contained: Claude Design should be able to follow the approved brief in phase order, produce an inspectable design system, apply it to the approved journeys, and supply an engineering-ready specification. Work moves forward only when each phase's deliverables and exit criteria are accepted. Changes after sign-off require a recorded change request and impact assessment.

**Priority of evidence during this draft:**

1. Direct client decisions in this project, including the answers on 24 September 2026.
2. Owner-attached `Nano_Beauty_Star_Mobile_App_Requirements-53.md`, version 1.1, 24 September 2026, reproduced verbatim in Appendix A, including the approved Keep / Backlog / Remove matrix. This attached file matches the v1.1 file previously used in this project byte for byte. Requirement IDs in Appendix A are the traceability keys.
3. Version 1.0 of those requirements, 20 September 2026, only for provenance of superseded decisions.
4. The approved implementation decision file in the React Native starter package, 21 September 2026, for technology and release constraints.
5. The three benchmark files for evidence and proposals, never automatic scope authorization.
6. Live public website and guest-accessible app observations on 24 September 2026; these show current presentation, not approved clinical, commercial, or data rules.

When sources conflict, put the conflict in the decision register and stop only the dependent design, while continuing independent work. Never infer an approval from a live UI or a benchmark.

## 2. Decisions already made

| Topic | Decision | Status |
|---|---|---|
| Platforms | Customer apps for iOS and Android | Confirmed in requirements |
| Website | Keep the current marketing website; no website redesign | Confirmed by client |
| Current web app | Replace it with the new app; audit active capabilities and plan any necessary transition | Confirmed by client on 24 September |
| Customer-facing app name | Nano Beauty; Nano Beauty Star remains the clinic/site name | Confirmed by client on 24 September |
| Logo and app icon | Preserve the current logo; create a new, related square app icon for approval | Confirmed by client on 24 September |
| Visual territory | The earlier **“2 — Warm & Editorial” Home** is the controlling visual reference: warm porcelain, natural close-up treatment imagery, ink/plum editorial serif headlines, readable functional sans serif, deep Nano-violet actions, restrained cards and whitespace. Later glass/blur studies are comparison history only | Selected by owner on 24 September; adapt to light/dark, guests/returning/staff and both platforms without tracing the screenshot pixel by pixel |
| Design deliverable | **One shared design system plus end-to-end customer and staff/admin journeys, complete screens/states, interactive prototype and engineering handoff** | Explicitly reconfirmed by owner on 24 September |
| Membership | No new enrollment or recurring billing in v1; continuity for active members is mandatory | Requirements v1.1; scope approved by client |
| Core services | Preserve all approved active clinic services and booking | Confirmed, but canonical catalog still required |
| Transactions | Debit, Klarna, Affirm as supported by approved merchant integrations | Confirmed intent; integration not yet confirmed |
| Commercial v1 | Promotions, gift cards, packages, support | Confirmed in requirements; rule sets and providers open |
| Promotions | At least twice monthly, remotely published | Confirmed in requirements |
| Mobile engineering | React Native / TypeScript via compatible Expo development builds, Expo Router; tokens package in monorepo | Recorded in approved implementation decisions |
| Launch language | English only at initial release, with localization-ready text/date/currency architecture | Explicitly confirmed by owner on 24 September |
| Clinic location | One publicly listed clinic: **555 6th St #130, New Westminster, BC V3L 5H1**; website invites clients from Vancouver and surrounding communities | Verified on official website 24 September; do not imply multiple branches or a defined service radius |
| Theme and form factor | Light/dark according to system; portrait orientation at launch | Explicit owner answers; phone-first assumption, validate device size rather than ask owner for SDK versions |
| Admin work | Role-gated administration **inside the mobile app**, including manual service catalog entry, campaign operations, clinic approve/reject workflow and customer-value support | Explicit owner answers; current development starter assumes a separate React/Vite admin portal and must be reconciled |
| Material and color | One shared warm editorial system with solid/tonal surfaces, fixed Nano plum/violet on both platforms, and restrained motion | Approved visual direction; blur is optional only after a demonstrated need and must not define the identity |
| Products, referrals, rewards | Backlog for new flows; inventory and resolve existing earned/customer value | Requirements v1.1; scope approved by client |

### Important distinction

The current guest web app exposes a product catalog, referrals, rewards, credit wallet, gift cards, and membership tiers. These observations informed the v1.1 disposition but do not prove operational status or authorize deleting existing value. The website currently routes booking to Fresha, while the web app shows its own appointment tracker. Verify system ownership, migration, and reconciliation before designing a transactional replacement.

## 3. Source findings and conflicts

### Public website: observed visual identity

- The header displays a white, horizontal **nano BEAUTY** wordmark. The client chose **Nano Beauty** as the customer-facing app name; **Nano Beauty Star** remains the clinic/site name. The logo stays, and an aligned square app icon is to be designed. Original artwork and final icon approval are outstanding.
- The site uses muted violet and plum, pale lavender, white, editorial serif headlines, Sora interface text, human treatment photography, and rounded calls to action.
- Sampled rendered colors are header **#766D89**, ink **#231D30**, deep plum **#463E56**, secondary violet **#6F6487**, pale surface **#F2EFFA**, and light heading **#E9E3F5**. These are observed web values, **not approved brand tokens**.
- Sampled text color pairs have contrast ratios of about 8.88:1 for deep plum on pale lavender, 5.46:1 for secondary violet on white, and 4.86:1 for white on header violet. All future token pairings still require component-level checks.
- The page copy contains a duplicate “Klarna and Klarna” claim, while prior requirements name Klarna and Affirm. The website is not an approved commercial-rule source.
- The official site consistently lists the clinic at **555 6th St #130, New Westminster, British Columbia V3L 5H1**. “Vancouver” is used in the site's marketing positioning, and the site says it welcomes clients from Vancouver and surrounding communities; New Westminster is the confirmed visit address, not an unresolved question. The public booking links lead to a Fresha listing for this address. Website hours, staffing and service claims are live content that admin/content owners must confirm before publishing in-app.

### Current guest web app: observed product surface

- A live link from the website opened the guest page at https://app.nanobeautystar.com/home on 24 September 2026. Earlier requirements said the legacy experience was inaccessible; that observation is now outdated for **guest access only**. Signed-in journeys, backend integrations, payment behavior, and operational data remain unverified.
- Guest navigation shows Home, Store, Rewards, Wallet, and Book Now; Store has Services, Products, Packages, Memberships, and Gift Cards. In a second live guest check, **Book Now → Book Appointment** opened an internal `app.nanobeautystar.com/services/nano-beauty-star` choice page (individual or group appointment), not an immediately visible Fresha page. The owner describes the existing booking as working with Fresha, but the actual handoff, backend integration and return path need verification. The marketing website's Book Now goes to Fresha.
- The Home screen is commerce-heavy, with many repeated product and promotion collections. Wallet shows credit and gift card placeholders; Book Now shows an appointment tracker for guests.
- Catalog names, pricing conventions, and claims differ between the marketing site, the live web app, and Fresha. A clinic-approved service and product inventory is required.

### Release disposition from requirements v1.1 — client-approved baseline

| Keep and redesign for v1 | Backlog / conditional | Remove from the new experience |
|---|---|---|
| Active approved services, governed detail and search; appointment booking, upcoming/history/change/cancel states; packages and redemption; gift purchase/claim/redemption; credit, receipts, refunds and ledger-backed wallet; promotions with terms and exact destinations; phone verification/account; contextual support | New rewards earning, referrals, check-in, new membership enrollment; physical-product ecommerce until inventory, fulfillment, tax, returns and claims are owned; Afterpay until approved; favorites and recent views after core use; conditional commerce can enter only through change control | Repeated home carousels, treatment quantity picker, cancellation policy as a paid service, bundled preselected marketing consent, third-party health notes in referrals, placeholder legal links, inconsistent primary navigation labels, unverified financing claims, bank-style clinic credit and fabricated guest history |
| Checkout only for approved packages, gifts and eligible products; debit, Klarna and Affirm appear only when integrated and contracted | Existing member benefits, earned rewards and historical credit still require inventory and customer-safe continuity even if new earning/enrollment is deferred | Never remove customer records or balances simply because a new UI flow is removed |

**Non-negotiable continuity work:** For every legacy domain, record the owner, customer value, authoritative record, identity match, and disposition: migrate, integrate, temporary read-only/support, settle, archive under policy or remove where authorized. Reconcile appointments, paid sessions, gift balances, credits, active membership benefits, refunds and earned rewards before and after cutover. Plan changed-phone/shared-contact exceptions, customer notice, rollback, support and retiring web routes. These are migration requirements in v1.1, not a request to reproduce every legacy acquisition flow.

### Conflicts across written sources

| Conflict | Working resolution for design |
|---|---|
| Direct-clinic benchmark, v1.1 and NANO-02 suggest different tabs, and the legacy app has yet another set | The owner explicitly withdrew any priority for the current app's labels and grouping. Claude Design must derive navigation from Nano's approved customer/staff tasks, compare at least two IA candidates, usability-check them, obtain product sign-off, then update NANO-02 routes. No tab label or count is frozen by these historical examples. |
| Benchmark lists a treatment plan, results timeline, photos and aftercare check-ins as ideas; requirements exclude sensitive clinical data by default | Design generic approved preparation and aftercare patterns only. Do not design photo storage, clinical record flows or automated treatment recommendations as committed v1 features. |
| The live app advertises memberships, rewards, referrals and a shop; v1.1 proposes deferring new flows | Scope disposition approved on 24 September. Design existing-value continuity where records are confirmed; keep new acquisition, earning and product commerce out of the v1 execution baseline until separately approved. |
| Wordmark says “nano BEAUTY” while business/product documents say Nano Beauty Star | Resolved for customer-facing app naming: **Nano Beauty**. Preserve the wordmark; obtain originals, clarify legal/store listing metadata, and approve a new compact icon. |
| Existing code starter includes a prompt to implement design tokens and navigation in NANO-02 before any separate Claude Design handoff is mentioned | Gate implementation of NANO-02 on approval of the design source, token export and route map; reconcile the code prompt afterward. |
| Approved v1.1 legacy disposition puts favorites/recent views in the Backlog, while `DISC 08` still labels them `Should` | The client's approved Backlog disposition governs v1; mark `DISC 08` as deferred for design traceability unless the product owner explicitly promotes it. Do not silently add this pattern to the Home or Account component inventory. |
| Requirements v1.1 discovery checklist still asks whether technology is native or cross-platform and marks launch language open, while approved implementation decisions specify React Native/Expo and English-first | Stack choice and English-only launch are settled by newer owner/implementation decisions. Exact SDK and device testing are later engineering acceptance work, not product-owner intake questions. New Westminster is the one confirmed public clinic location. |
| Development starter specifies a separate React/Vite `apps/admin` portal, while the owner's latest answer requests the administration panel inside the mobile app | Design role-gated staff routes inside the mobile app, not a customer tab. Product/package owner must version the development decisions, NANO-15/16 and traceability accordingly before admin implementation. Do not silently implement both portals. |

## 4. Approved design language — Warm & Editorial

**Approved visual anchor.** `visual-references/FINAL_Selected_Warm_Editorial_Home.png` is the owner's selected early concept, formerly titled “2 — Warm & Editorial”. Use this image as the primary reference, alongside authentic logo files once supplied. The later purple Liquid Glass iOS image, Android tonal counterpart and recent selective/expansive blur comparison are **superseded explorations**, not coequal style options. Warmth and editorial hierarchy govern the entire system; Nano-violet provides distinct brand actions rather than coating every surface. No additional visual-direction vote or blur-intensity gate is needed.

**Recognizable design DNA:** Warm porcelain/off-white backgrounds in light mode, ink/charcoal text, plum and Nano-violet main action, a sparse pale-lavender secondary accent; editorial serif for short expressive headings and robust sans-serif for all functional copy; generous whitespace; soft natural treatment photography with authentic skin texture; a single strong booking action and a short, scan-friendly treatment entry point. Corners are calm and softly rounded, dividers subtle and shadows minimal. The selected screenshot shows a guest Home state and illustrates *style and emphasis*, not validated services, real photography, final navigation or brand asset. In particular, its five tabs are examples only: Claude must derive the final destinations and labels from customer tasks.

**One brand across appearance and platform:** In dark mode replace porcelain with deep warm ink/plum backgrounds; use protected warm light text, restrained lavender highlights and the same fixed brand violet. Retain photographic realism and preserve contrast rather than invert colors mechanically. iOS and Android share semantic colors, content, typography roles, imagery and component meaning; native Back, safe areas, keyboard handling, focus, platform navigation gestures and system sheets may differ. Build one source library with platform notes, not separate product systems. Use opaque/tonal surfaces as normal. If a subtle blur on an overlay aids orientation, treat it as an optional progressive detail with an equivalent solid presentation; do not require native Liquid Glass or live blur on any OS. `Reduced Transparency` remains usable by default because the core visual language is already opaque.

**Candidate primitives, not approved tokens:** Observed website violet `#766D89`, deep plum `#463E56`, ink `#231D30`, pale lavender `#F2EFFA`, white/off-white. Derive light/dark primitive, semantic and component tokens from approved brand artwork, check contrast and obtain brand sign-off. The original `nano BEAUTY` wordmark remains the authentic logo; the screenshot's generated wordmark is a visual stand-in. The owner provides the real file, color/font licensing and rights-cleared clinic images. The app name is **Nano Beauty**. Design a related new app icon for owner sign-off; never simply crop the horizontal wordmark.

**Layout and component direction:** Begin with a 4-point spacing base, comfortable portrait margins, a strong hero only where it serves a guest, appropriately sized touch targets (at least 44 pt iOS, 48 dp Android), one primary action and simple list/group treatments. A signed-in Home should prioritize the actual next visit and usable balance when the records exist, rather than repeat the guest hero at full height. On price, booking, consent, wallet, finance, aftercare and admin approval surfaces use protected opaque panels and functional type. Typography, long strings and large-text layouts must be reviewed at each phase. Avoid marketplace feeds, dense repeated carousels, stock-spa imagery, decorative glass, floating controls without function, unlicensed promotional photographs, fabricated care claims and soft-on-soft contrast.

**Required first visual check:** Apply this *selected* language to guest Home, returning Home with and without appointment, treatment detail, booking entry, Wallet and staff edit/approval on iOS and Android in light and dark. Show that photography, serif/sans roles and Nano-violet CTA remain coherent outside the reference screenshot. Product owner approves the faithful interpretation and brand assets at Phase 1; this gate refines the selected direction rather than reopens a vote among glass variants. Authenticated and staff reference data must be clearly marked simulated until verified.

**Asset and IA guardrail:** The source screenshot contains rendered treatment names, model photography, a generated logo, marketing copy and five nav labels. Do not assume publication rights, clinical approval, accuracy or a fixed tab count from these pixels. Preserve the visual principles, then use the source requirements and approved catalog to design the actual information architecture and content.

## 5. Product architecture and journeys — derive IA from tasks

**Navigation is deliberately open.** Ignore the legacy app's Store/Rewards/Book Now grouping as a design priority. Claude maps task frequency, booking urgency, discovery, appointment management, stored value and account tasks; proposes at least two customer IA options (for example a five-destination Home/Discover/Book/Wallet/Account model and a tighter model with persistent booking action and prominent wallet entry); explains what each promotes or hides; tests comprehension with first-time and returning customers; and brings **one recommendation** with route map to the product owner. The research may keep `Explore`, choose `Services`, or use a better label. Do not copy historical navigation blindly or reserve a main tab for backlog rewards.

**Guest and customer journeys:** guest discovery; consultation-required treatment; first and repeat booking with current Fresha relationship represented accurately; promotion eligibility; deposit/full-payment choices; declined/abandoned/pending financing; appointment change/cancel; package purchase/use; gift purchase/claim/use; clinic-credit and customer-value history; existing member/reward status; legacy account match, mismatch and assisted recovery; contextual support; privacy and account deletion. Include guest, no-appointment, active appointment, empty, loading, offline, expired, provider-return, error and recovery states. Existing memberships/rewards are **visible from authentic records** while new enrollment/earning stays in backlog. Physical-product commerce remains conditional.

**Booking system boundary:** The public website currently links to Fresha; the owner says the current app operates with Fresha, while the observed guest appointment action opens an internal service-choice page. Treat Fresha as the **reported booking relationship**, with the actual app/Fresha connection unverified. Design service discovery, initiation, return/error and appointment display without inventing an API or promising a wholly native transaction. Technical/vendor discovery chooses verified integration or a controlled handoff before high-fidelity booking mechanics are locked. Customer journey continuity and branded error/support states remain in scope either way.

**Staff/admin inside the same mobile app:** Authorized clinic staff enter a distinct role-gated workspace, never an extra customer bottom tab. Include manual creation/editing/import review for the canonical service catalog and provider mapping; pricing and visibility; scheduled promotions and terms; packages/gifts; support content; clinic approve/reject actions with reason and review queue; publish/rollback; audit trail; and support for mismatched customer value. Use the `ADMIN 01–10` requirements. Staff can review and approve content according to permissions; this does **not** authorize collecting new sensitive patient data or publishing unverified medical claims. Show staff success, validation, permission, concurrent-edit, offline and audit states. The development starter's separate React/Vite portal is stale relative to the owner's latest mobile-admin decision and must be reconciled before implementation.

**Clinic and market:** Use New Westminster, BC as the clinic's verified visit location; the website welcomes Vancouver and surrounding-area clients. Do not imply a second clinic, home service, geofenced eligibility or a precise service radius without a new source. English is the only launch language; dates/currency/content architecture remains localization-ready. Portrait orientation at launch. Light and dark appearance follow the OS setting with semantic parity.

Do not freeze high-fidelity payment, identity matching, wallet balances or intake data until the clinic's existing system/provider permissions and record fields are inspected. Claude may design representative system states with clearly labeled sample values; the owner's confirmations of active payments, current-app ledgers and available service data are business inputs, not proof of API or database access.

## 6. Design-system specification for the final Claude Design handoff

Claude Design must produce a **design source and a written specification**, not only attractive screens:

- **Foundations:** Color primitives and semantic aliases for **both system light and dark appearance**, typography roles and responsive scaling, spacing, sizing, grid/safe areas, radii, borders, elevation, opacity, icon strokes, motion durations/easing, haptic roles and imagery rules.
- **Token contract:** Names, values, **light/dark mapping**, usage, contrast tests, platform mapping, deprecation rules and a machine-readable export compatible with the React Native shared design-token package. Separate primitive, semantic and component tokens.
- **Material and platform recipe:** One warm editorial system with opaque porcelain/ink and plum/violet tonal surface roles in both light and dark; responsive photo-crop rules, contrast and long-text cases, iOS/Android behavioral mapping. Any optional blur is supplementary, has a solid equivalent and must not change meaning, brand identity or readability. Do not fork the business component library.
- **Core components:** Buttons, links, icon buttons, text fields, OTP input, validation messages, search, filters/chips, tabs, navigation, cards, dividers, banners, sheets/dialogs, toasts, progress, skeletons, empty/error states, price disclosure, consent and policy rows.
- **Nano patterns:** Appointment pass, treatment passport, concern tile, provider card, availability/time picker, booking stepper and summary, offer card with terms, package balance card and ledger, gift card and claim, clinic-credit row, existing-member status, legacy-value review/exception, support context card, preparation/aftercare timeline.
- **Staff/admin patterns:** Role-gated workspace shell, manual service edit and publish, category/alias/provider mapping, campaign scheduler and preview, approval/reject queue and reason, audit/history, concurrent-edit warning, support resolution and value reconciliation; mobile portrait layouts for authorized staff.
- **Variants and states:** Every interactive component has enabled, pressed/focused, disabled, loading, selected, validation-error, success and appropriate offline/expired variants; specify screen-reader label and focus order. Include long text, large text, localization expansion, zero/unknown values and missing imagery.
- **Pattern language:** Clear prices (fixed, from, range, per unit, consultation required), promotional eligibility, deposits and amount due later, financing uncertainty, refund status, aftercare escalation, protected information and cross-app return states.
- **Content model:** Approved voice and microcopy, clinical reviewer placeholders, no implied diagnosis or promised outcomes, price and policy ownership, image rights, date/time/currency formatting.
- **Design-to-code handoff:** Component anatomy, behavior, spacing, constraints, asset sizes, iOS/Android differences, RN route mapping, token export, content fixtures, dependency notes, acceptance criteria and version history.

**Suggested asset source order:** approved brand kit and real clinic photos; then licensed assets; then labeled placeholders during low-fidelity work. Do not silently treat website image URLs or competitor screenshots as licensed production app assets.

### 6A. Motion system and animation contract — required deliverable

**Purpose and scope.** Motion should make an action feel responsive, explain spatial relationships and show the true status of an operation. Nano Beauty's voice is calm and precise: restrained plum accents and short, deliberate transitions; no decorative spectacle in booking, payment, clinical information or customer-value screens. Specify the same interaction meaning for iOS and Android, then use native platform motion where its behavior is integral to navigation or a system control. The approved static Home concepts do **not** approve any specific animation yet. This section sets a testable starting brief for Claude Design; timing values are proposals until prototype, device and accessibility review.

**Each motion entry must name:** component/pattern, trigger, start and end states, animated properties, duration/easing or native-system ownership, interrupt and reverse behavior, success/error/timeout result, haptic policy where applicable, reduced-motion behavior, iOS/Android and nonblur implementation recipe, and a link to the relevant requirement ID. Motion must never be the sole way to convey status. No optimistic success animation for a booking, gift-card claim, payment, refund or balance update before the authoritative system confirms it.

| Candidate token / role | Provisional normal-motion value | Use and ownership |
|---|---|---|
| `motion.duration.none` | `0 ms` | Immediate state change, platform animation disabled, or an accessibility fallback |
| `motion.duration.feedback` | `120 ms` | Press/release, focus, selection feedback; avoid a bouncing CTA |
| `motion.duration.state` | `180 ms` | Chip, icon and inline status transitions, when they aid recognition |
| `motion.duration.reveal` | `240 ms` | Small inline expansion, toast, contextual content; reversible |
| `motion.duration.overlay` | `280 ms` | Custom sheet or dialog where native motion is unavailable |
| `motion.duration.navigation` | `320 ms` **reference only** | Custom route transition; native navigator determines actual iOS/Android transition |
| `motion.duration.reduced` | `0–80 ms` | Immediate update or brief opacity change; no spatial translation or parallax |
| `motion.easing.enter` | `cubic-bezier(0.2, 0, 0, 1)` | Candidate for custom entrances; finish gently |
| `motion.easing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Candidate for custom exits; relinquish focus promptly |
| `motion.easing.state` | `cubic-bezier(0.2, 0, 0, 1)` | Candidate for small state changes; validate against system motion |
| `motion.spring.*` | No global numeric spring yet | Document platform-native spring/gesture behavior per component after an Expo device spike; never replace a native gesture with guessed timing |

Durations are in milliseconds, distances in logical points/dp, and easings in an exportable form. Do not force custom timing on system Back gestures, platform sheets or the keyboard; do not animate blur intensity merely for decoration. If a custom content reveal needs movement, start with **8–16 logical points/dp at most** on a small surface, then validate on a physical device and remove it if it adds distraction. Provide tokens for duration and easing as primitives, then semantic roles and component mappings; produce normal and reduced-motion modes and document any platform overrides. Do not make a single CSS timing curve the universal substitute for native behavior.

| Pattern and linked requirement | Normal-motion proposal | Reduced-motion / critical state | Platform and engineering note |
|---|---|---|---|
| Tabs, back and route hierarchy (`DISC 01`, `BOOK 01`, `NFR 01`) | Selection changes with Nano violet state plus icon/text; no tab-bar wobble | Preserve selection, hierarchy and focus with immediate or brief fade on the same solid surface | Shared warm editorial solid/tonal material meaning across iOS/Android; platform-specific Back/gesture/inset behavior without depending on native iOS glass. |
| Buttons, links, chips and filters (`DISC 03–05`, `NFR 01`) | Brief pressed/selected state; chip content updates once; reverses if canceled | Instant selected indicator plus label; no scale bounce | Single shared semantic pressed/selected state; iOS/Android renderer adapts ripple/highlight and haptic support. |
| Search, cards and content loading (`DISC 02`, `DISC 10–11`, `NFR 02`) | Optional short opacity reveal after data arrives; static skeleton preferred on transactional pages | Static placeholder or direct result; maintain text alternatives | No recurring shimmer, auto-moving hero, parallax or scroll-triggered card choreography in core journeys. Never animate stale or fabricated content as though personalized. |
| Booking steps, slot selection and holds (`BOOK 03–07`, `BOOK 09–10`) | Small selection feedback and a clear step transition; hold indicator reflects verified time | Static step and explicit text such as “Checking availability”; focus moves to the new step | On expiry, invalidation or slot conflict, show a real status and recovery CTA; do not use motion to imply a slot has been reserved. |
| Input, OTP, validation and consent (`AUTH 02–03`, `AUTH 09`, `BOOK 05`) | Brief focus outline and inline error appearance | Same field label and error text immediately; no shaking or flashing | Respect keyboard and screen-reader focus. Consent changes must not be obscured by animation. |
| Sheets, dialogs and toasts (`BOOK 10`, `PAY 07`, `SUP 02`) | Native sheet where available; custom overlay with short enter/exit and outside-tap/Back handling | Immediate or cross-fade presentation with the same dismissal and focus behavior | Test Android system Back and iOS swipe dismissal; never discard unsaved transactional input without confirmation. |
| Payment and third-party return (`PAY 04–09`, `PAY 12`) | Indeterminate waiting only while pending; render explicit success/failure/retry when provider confirms | Static progress/status with text, reference and action | No confetti, counter animation or celebratory state on optimistic completion. Preserve state across app switching, timeout and duplicate callbacks. |
| Wallet, package and gift balances (`WALT 02–12`, `MEM 02–03`, `REWD 02`) | Short stable state update only after ledger confirmation | Value and “pending/reconciling” labels appear without movement | Never roll numbers, count up credit or animate a claimed value before ledger reconciliation. Highlight discrepancies with a clear support path. |
| Promotion, offer and countdown (`PROMO 02–06`, `PROMO 09`) | One restrained campaign reveal if approved; countdown values update as data, not a dramatic effect | No auto-advancing offer and no flashing timer; absolute expiry time remains readable | Server-time and timezone authority govern expiry. Expired/paused campaign transitions to safe destination and readable explanation. |
| Preparation/aftercare and status (`NOTIF 03`, `SUP 01`) | Optional small progress change connected to a real appointment event | Static timeline and accessible ordered labels | Do not animate a treatment result, invent a progress percentage or suggest a medical outcome. |

**Accessibility and interruption rules.** Honor the system's Reduce Motion preference, including changes while the app is running; on Android also respect disabled animation scale when exposed by the chosen stack. Any optional translucent overlay must have a protected solid equivalent under Reduced Transparency. Stop decorative depth and any optional campaign movement under Reduce Motion. Preserve essential meaning using text, selected state and focus; where a transition clarifies hierarchy, prefer a short fade over removing all context. Never autoplay a carousel of services or promotions; if media or movement is explicitly approved, give an obvious pause/stop control and a nonmoving alternative. Never use rapid flashing. Allow an in-progress motion to be interrupted by Back, navigation, accessibility focus or a fresh action; a canceled gesture returns to its prior state. Loading indicators must not mask a hung request or extend the actual operation artificially. WCAG 2.2 AA is the baseline from `NFR 01`; the stronger opt-out principle of WCAG 2.3.3 is an additional product design rule and is **Level AAA**, not a claim of AA conformance. Apple's Reduce Motion guidance and React Native's accessibility APIs support the device checks; exact API behavior depends on the SDK selected in NANO-00.

**Motion deliverables and acceptance.** Claude Design must provide (1) a motion principles page with allowed/prohibited examples; (2) named duration/easing/semantic/component tokens in an exportable file, with proposals clearly marked until approved; (3) annotated state diagrams/storyboards and short playable prototypes for tab change, search/filter, slot selection, booking confirmation and slot loss, payment pending/success/failure, wallet reconciliation, promotion expiry, staff publish/reject and sheet dismissal; (4) normal/Reduce Motion variants in system light and dark themes, plus an opaque equivalent if optional translucency is introduced for representative iOS and Android screens; (5) event-to-state and focus/haptic specifications, including interruption and async truth conditions; and (6) a feasible React Native/Expo implementation mapping or an explicit exception. Product/design and the mobile lead approve motion in Phase 5 only after prototype and device review; Phase 6 applies it to every relevant screen; Phase 7 includes tokens, prototype links, asset files and QA recordings. Validate on supported iPhone and representative mid-range Android with system settings toggled, VoiceOver/TalkBack and real loading/error scenarios. Document lower-end fallback and any visual deviation.

## 7. Waterfall phases and approval gates

| Phase | Required output | Exit gate / owner |
|---|---|---|
| 0. Source and decision intake | v1.1 and owner decisions, the selected warm editorial image, brand/photo request, legacy and live catalog inventory, verified clinic location, Fresha relationship map, financial-data and permissions dependencies, conflict/traceability register | Product owner accepts the source/decision register. Continue independent foundations while provider facts are verified by their owners. |
| 1. Brand and experience definition | Faithful warm editorial interpretation on matched guest/returning/staff samples for light/dark iOS/Android; licensed logo/photo plan; new app-icon options; type/color/imagery principles; simple motion rules | Product owner approves application of the *already selected* direction and authentic brand assets; clinic reviews any real claims. No new glass/blur direction vote. |
| 2. Service blueprint and information architecture | Tasks and service taxonomy, at least two independent customer IA candidates, recommended route map/labels, customer-value map, role-gated in-app admin IA, complete screen/state inventory | Product/clinic owner approves customer/staff IA and catalog owner confirms content. Reference-image tabs do not preempt this decision. |
| 3. Low-fidelity flows | Discovery, verified booking/return, payment, appointments, wallet/continuity, gift/package and admin catalog/promotion/publish/approve/reject/support, including recovery | Clinic, finance and operations review affected flows; unverified integrations remain labeled conditional. |
| 4. Usability validation | New/returning customer and staff task studies, tab-label comprehension, staff approval/publish safety, findings and revised flows | Critical task failures resolved; affected routes reapproved. |
| 5. Design foundations and components | Light/dark primitive, semantic and component tokens; type, spacing, opaque/tonal surfaces, icon/photo rules, motion tokens, customer/admin components, accessibility and platform behavior | Brand/clinic/accessibility sign-off; developer checks chosen components, not an imagined glass feature. |
| 6. High-fidelity application | Every approved customer and in-app staff screen/state, English copy, portrait layouts, real-data dependencies, light/dark and normal/reduced-motion interactive prototypes for iOS/Android | Product, clinical, financial and operations owners sign their affected screens; no unresolved critical state is represented as verified. |
| 7. Development handoff | Editable Claude Design source, machine-readable tokens/assets, route/state/component contracts, motion recipes, photo crop and icon files, role/permission contract, fixtures, QA checklist and exceptions | React Native implementer can build; older starter is versioned/reconciled before scope-dependent code. |
| 8. Built-app design QA | Compare both platform builds with signed spec; audit contrast, type scaling, content truth, role isolation and exception log | Owner/designer approves implemented design and any recorded deviations. |

Every gate records owner, version, date, rejected/accepted exceptions and impact of later changes. Unverified provider rules stop only dependent final screens. SDK/build measurements belong to the coding team after design rules are established.

## 8. Decision register after owner answers

| ID | Decision / evidence | Status and owner |
|---|---|---|
| D01 | v1.1 Keep/Backlog/Remove disposition; favorites/recent views excluded from v1 | Approved by owner; `DISC 08` `Should` is superseded for v1 |
| D02 | App name **Nano Beauty**, original wordmark retained, new icon; source artwork/usage rules provided by owner | Naming approved; owner to deliver source files and approve icon |
| D03 | One system, end-to-end customer and staff/admin screens, all states, prototypes, engineering handoff via Claude Design | Approved by owner; Figma is not a required output format |
| D04 | Shared Nano identity with platform-appropriate Back, keyboard, safe areas and accessibility; avoid pixel cloning | Approved by owner |
| D05 | Priority: usable native/system behavior when an illustrative screenshot differs | Approved by owner; native Liquid Glass itself is no longer a requirement |
| D06 | Owner chose the earlier **“2 — Warm & Editorial”** Home reference as the controlling visual language; solid/tonal brand surfaces are default | **Approved visual direction**; prior Liquid Glass and selective/expansive blur comparisons are superseded. Any blur is an optional effect with a solid equivalent |
| D07 | Fixed brand violet independent of Android wallpaper; both system light and dark appearance | Approved by owner; contrast tokens to validate |
| D08 | Simple, functional animation and reduced-motion alternatives | Approved character; numerical tokens/behaviors Phase 5 |
| D09 | Derive customer tabs and labels from first principles; old app/service labels do not get priority | Approved by owner; Claude compares IA alternatives and owner signs resulting routes |
| D10 | Guest, returning and no-appointment Home plus full approved journeys | Approved end-to-end by owner |
| D11 | In-app, role-gated mobile admin workspace with manual catalog entry and clinic approve/reject; not a customer tab | Approved by owner; starter's web-admin architecture/prompt conflict requires versioned correction |
| D12 | English-only launch, portrait orientation; authentic visit address **555 6th St #130, New Westminster, BC V3L 5H1** | Owner answered language/orientation; address verified from official site |
| D13 | Public website sends booking to Fresha; owner says current app works with Fresha, but the observed guest Book Appointment first opens an internal app service-choice page | Website handoff observed; app integration/path not fully confirmed. Verify API versus controlled handoff, return states and ownership during implementation/vendor discovery |
| D14 | Clinic has approved services and operational data, admin can enter/edit them manually | Owner confirmed availability; obtain actual structured catalog and content/price owner before final service screens |
| D15 | Debit, Klarna, Affirm offered; package/gift/credit records originate in existing app | Owner confirmed business model; payment provider behavior and ledger/export access need verification; no invented integration |
| D16 | Legacy identity/data access and migration path | Open: owner will inspect DB/export access; design match/recovery and new-registration contingency without losing verified value |
| D17 | Existing member/reward status must be visible in new app; new earning/enrollment still backlog | Approved by owner; data mapping and benefit wording from ledger owner |
| D18 | Clinic staff can approve/reject publishable records in a permissioned workflow | Approved in principle; specify content scope, audit, revision and clinical reviewer; not blanket approval for collecting sensitive patient information |
| D19 | Admin can publish/manage promotions and services; support channels and policies | Admin mobile confirmed; employer/client contact and support terms still to obtain from project sponsor |
| D20 | Older protected starter Requirements v1.0 and separate Vite admin plan conflict with current owner answers | **Owner takes responsibility** for versioned starter update; this handoff provides a reconciliation checklist in §11 |
| D21 | Specific Expo SDK/build/device results | Development acceptance, not a question to owner during design; Claude coding team reports measured outcome after approval |

## 9. Inputs that still affect design approval

1. **Brand from owner:** original logo vector/usage rules, approved violet palette, font files and embedding rights, licensed clinic imagery, and written app-icon approval. The generative concepts cannot stand in for these production assets.
2. **Operational files rather than more speculative questions:** canonical services/providers/prices and current booking/policy source; an anonymized inventory of appointments, gift/package/credit/reward/member records; CMS/admin access; contact person for support hours/terms. The owner reports these exist, so Claude requests the actual exports and review owners at Phase 0.
3. **No open material-style choice:** the owner chose Warm & Editorial. Phase 1 validates its application to light/dark, iOS/Android and customer/staff journeys; the tab labels and app icon remain future design outputs, not intake decisions.

Site-derived facts require publication review if they can change: the site lists the New Westminster address and welcomes Vancouver-area clients, while its financing copy contains “Klarna and Klarna.” The owner confirmed Klarna/Affirm/Debit separately. Avoid copying unverified prices, staffing, treatment promises, opening times or phone number from a public page into final UI without content-owner check.

## 10. Claude Design working protocol

**Input package:** This handoff including verbatim v1.1 Appendix A, newer owner decisions in §§2/8, actual brand/photo files the owner provides, approved service/booking facts, the **selected warm editorial Home reference**, technical implementation decisions where not superseded, and an evolving decision log. Existing app screenshots are research input, not a template for navigation, naming or density. The selected generated Home is a visual reference, not licensed photography, approved clinical copy, an authentic logo file or a frozen tab map. Other glass/blur studies are superseded.

**Work sequentially and return evidence at each gate:** editable Claude Design source/version; requirement-ID-to-screen/component trace; customer and role-gated staff scenarios; options with reasons; unresolved dependencies with owner; normal/light/dark accessibility states with a solid equivalent for any optional translucency; concise acceptance checklist; a preview of changes for iOS/Android where relevant. Only the named decision owner freezes the next dependent phase. Questions about SDK, native builds, device performance and code structure go to Claude's developer/technical reviewer **after** the shared visual language is selected.

**Deliverable structure:** One editable source for shared warm editorial brand, light/dark and surface roles, semantic tokens, motion, platform notes and customer/admin components; full application screens and states; interactive customer and admin prototypes; implementation-oriented specification and exportable design tokens/assets. Claude Design's native output is the agreed design source. If that environment cannot export a needed token, asset or prototype format, Claude must supply the values/behavior in a portable written specification and mark the exception; do not silently switch the project to Figma.

**Kickoff prompt to Claude Design:** Copy **Appendix B** or the identical standalone English `00_SEND_TO_CLAUDE_DESIGN.md` shipped with this handoff. This main document and its verbatim Appendix A are authoritative. Claude must begin at Phase 0, report missing owner/vendor data, and move through gates in §7 with explicit approval. Do not re-open the owner-selected warm editorial direction or promote glass variants by default.

## 11. Engineering adoption and starter reconciliation

**Design versus implementation responsibilities:** The owner says Claude will write the code, while this deliverable is an execution-ready **design** handoff rather than evidence of a running build. Engineering must inspect the real repository, determine supported OS/build configuration and validate representative iOS/Android navigation, fonts, images, theme and large text after the system is specified. Opaque/tonal surfaces make a live-blur dependency unnecessary. Any optional blur, if proposed for a specific component, must be evaluated for contrast, reduced transparency and performance on actual devices; it can always resolve to the approved solid treatment. Do not require the owner to choose SDK versions during design intake.

**Versioned reconciliation checklist for the owner and Claude coding project, before scope-dependent implementation:**

1. Replace or formally supersede the protected starter `Requirements.md` v1.0 with the owner-supplied v1.1, preserving a changelog and updated `REQUIREMENTS_TRACEABILITY.md`.
2. Update `IMPLEMENTATION_DECISIONS.md` so the previously planned separate React/Vite `apps/admin` is **not assumed as the sole admin output**. The newer owner decision requires role-gated administration inside the mobile app. If a supplementary web portal is later proposed, get a separate scope decision; do not build it by inertia.
3. Rewrite NANO-02 to say navigation labels/count follow approved IA, remove the hard-coded `Services` route, and map the selected warm editorial solid/tonal tokens after Phase 1 brand approval.
4. Update NANO-15/16 and related admin prompts to implement permitted staff mobile routes, manual service publishing, approval/reject/audit and permissions. Preserve API-enforced security; hiding a button is insufficient.
5. Confirm Fresha's actual booking handoff/API permissions, ledger/export access and returning-customer identity before code claims a native appointment or wallet. Existing value must remain accessible or supported through a verified continuity path.

A final engineering estimate still depends on seeing the active repo and provider interfaces. That is a build planning task for Claude's coding team, not a missing aesthetic decision for the owner.

## 12. Sources reviewed

- Owner-attached `Nano_Beauty_Star_Mobile_App_Requirements-53.md`, version 1.1 with legacy guest audit and feature disposition (24 September 2026), reproduced verbatim in Appendix A. It is byte-identical to the earlier v1.1 project copy; version 1.0 in the starter is decision history only.
- Nano_Beauty_Star_App_Benchmark.md, Nano_Beauty_Star_Competitor_Design_Benchmark.md, Nano_Beauty_Star_Direct_Clinic_Competitor_Benchmark.md (20 September 2026).
- Nano_Beauty_Star_React_Native_Claude_Prompts.zip, particularly IMPLEMENTATION_DECISIONS.md and NANO-02 (21 September 2026).
- Nano public marketing site and visit address: https://nanobeautystar.com/ and https://nanobeautystar.com/contact-us/ (live review 24 September 2026).
- Nano current guest web app: https://app.nanobeautystar.com/home (live guest review 24 September 2026).
- Prior project conversation context available for this session, including the client's 24 September 2026 answers. The complete verbatim text of every older conversation is not available.
- Apple Human Interface Guidelines, Materials: https://developer.apple.com/design/human-interface-guidelines/materials (checked 24 September 2026).
- Expo GlassEffect, BlurView and Router Native Tabs: https://docs.expo.dev/versions/latest/sdk/glass-effect/ ; https://docs.expo.dev/versions/latest/sdk/blur-view/ ; https://docs.expo.dev/router/advanced/native-tabs/ (checked 24 September 2026). Actual versions are set by NANO-00.
- Android Material 3 and Android system bars: https://developer.android.com/develop/ui/compose/designsystems/material3 ; https://developer.android.com/design/ui/mobile/guides/foundations/system-bars (checked 24 September 2026). Material 3 informs the Android expression; the app stack remains React Native.
- Motion/accessibility primary references (checked 24 September 2026): Apple's Reduced Motion evaluation https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria ; React Native AccessibilityInfo https://reactnative.dev/docs/accessibilityinfo ; W3C WCAG 2.2 Understanding animation from interactions (AAA) https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions and pause/stop/hide (AA) https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide . Candidate values in §6A are Nano Beauty design proposals, not values asserted by those sources.

---

## Appendix A — Owner-supplied requirements v1.1 (verbatim)

The text after the next separator is the owner-attached `Nano_Beauty_Star_Mobile_App_Requirements-53.md`, copied verbatim so this handoff can be sent as one document. Its requirement IDs are normative for scope traceability. Product-owner decisions recorded in the main brief govern later clarifications; the old starter v1.0 is superseded for this design engagement.

<!-- SOURCE_V1_1_BEGIN -->
# Nano Beauty Star Mobile App Requirements

Product requirements design process and discovery checklist

| **Document field** | **Value**                                    |
|--------------------|----------------------------------------------|
| Prepared for       | Nano Beauty Star design and development team |
| Document purpose   | App only redesign and native store release   |
| Status             | Legacy-app-informed requirements baseline    |
| Version            | 1.1                                          |
| Date               | 24 September 2026                            |

The website remains outside this project. This document defines the proposed v1 mobile app, the work needed to design and deliver it, and the decisions the client must provide before architecture, wireframes, integration design, and store submission can be finalized.

## Contents

1. Executive summary
2. Confirmed scope and working assumptions
3. Product goals users and success measures
4. Product structure and navigation
5. Functional requirements
6. Content data and integration requirements
7. Nonfunctional requirements
8. Design and validation process
9. Delivery release and operational readiness
10. Missing information and discovery checklist
11. Risks dependencies and decisions
12. Appendices

## Executive summary

Nano Beauty Star should launch a new customer mobile application for iOS and Android rather than package the legacy web experience as a store wrapper. The legacy app is now publicly accessible and was audited on 24 September 2026. It confirms a broader operating scope than the previous requirements assumed: service and product commerce, packages, gift cards, credit, rewards, referrals, memberships, appointment tracking, campaigns, registration, cart, and financing messages are all present. These capabilities are evidence of existing business behavior, not automatic requirements to reproduce the current interface or implementation.

The new app must preserve the clinic's approved services and protect existing customer appointments, package sessions, gift-card balances, credits, memberships, rewards, and other paid entitlements. New membership enrollment, rewards, referrals, check-in, and physical-product commerce remain outside the proposed v1 unless the client promotes them after discovery. This distinction prevents scope expansion without losing customer value during migration.

The immediate product decision is the booking, commerce, and legacy-data architecture. The current public journey relies on Fresha while the legacy app exposes a separate catalogue, cart, wallet, and loyalty experience. Before detailed design begins, the client must confirm which systems own availability, customer identity, payment, package and gift-card ledgers, credit, memberships, and rewards. The answer affects migration, booking, refunds, notifications, support, and the estimated delivery effort.

The app must create genuine mobile utility. Appointment reminders, calendar actions, package and gift card balances, native booking management, saved preferences, deep-linked promotions, and accessible support will give the product more value than a repackaged website. This also reduces rejection risk under Apple's minimum-functionality rule.

### Recommended v1 decision

| **Area**     | **v1 direction**                                                 | **Reason**                                                        |
|--------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| Platforms    | iOS and Android customer apps                                    | Required store distribution                                       |
| Website      | No redesign or implementation changes                            | Explicit project boundary                                         |
| Architecture | Cross-platform native app with API driven content                | Consistent behavior with one maintainable codebase                |
| Booking      | Native flow if an approved booking API supports the full journey | Avoid fragmented handoffs and duplicate records                   |
| Commerce     | External processor for services consumed outside the app         | Compatible with current store payment rules for physical services |
| Content      | Remote admin or CMS                                              | Promotions change at least twice each month                       |
| Continuity   | Audit and protect every existing balance and entitlement         | Deferred features may still have active customers                 |
| Membership   | New enrollment and billing in backlog; existing status resolved  | Client excluded the feature from v1, not existing obligations     |

## Confirmed scope and working assumptions

### Confirmed client decisions

- The team will design and develop a new app for publication in the Apple App Store and Google Play.
- The existing Nano Beauty Star website will remain unchanged and is not part of the redesign scope.
- Design quality and functional quality have equal priority.
- All active customer services must remain available in the new app.
- Booking and appointment-related functionality must remain available.
- The app must support Klarna, Affirm, and debit card payments, subject to merchant and integration approval.
- Promotions will be published at least twice per month and may include public events such as Halloween or Canada Day and clinic-created campaigns.
- Gift cards, packages, and customer support are included in v1.
- Membership is not included in v1 and must remain in the product backlog.
- The accessible legacy app is a research input, not a design specification; website scope remains unchanged.

### Evidence limitations

The public guest experience at [app.nanobeautystar.com](https://app.nanobeautystar.com/home) was reviewed on 24 September 2026 at desktop and phone-shell widths. The audit covered Home, Store, service detail, appointment tracker, Rewards, Referrals, Wallet, Products, Packages, Memberships, Gift Cards, registration, Cart, a campaign detail, and search empty state. No credentials, personal data, payment, gift-card delivery, redemption, appointment change, financing approval, or administration action was used. Authenticated data, completed transactions, staff tools, API behavior, and the underlying data model remain unverified.

The legacy app can confirm that a capability or content pattern exists, but it cannot confirm that the feature is active, contractually supported, compliant, profitable, or safe to migrate unchanged. The website, Fresha, and legacy app are discovery sources; none is the approved specification or system of record for the new app.

### Legacy app audit and disposition

The decisions below control product scope, not data deletion. **Keep — redesign** means the business capability belongs in v1 but its current UX should not be copied. **Backlog** means no new v1 flow unless promoted through change control; any existing customer value must still be inventoried and resolved. **Remove** means the pattern or content must not be carried into the new design.

| **Legacy area or pattern** | **Decision** | **Requirement for the new app** |
|----------------------------|--------------|---------------------------------|
| Service catalogue and search | Keep — redesign | Preserve all approved active services; use canonical naming, concern-led categories, useful filters, and governed content |
| Service detail | Keep — redesign | Replace the sparse commerce modal with price logic, provider eligibility, preparation, aftercare, safety boundary, and Book or Consultation CTA |
| Booking and appointment tracker | Keep — redesign | Provide a complete native or controlled booking path plus useful upcoming, history, change, cancellation, empty, and recovery states |
| Packages | Keep — redesign | Preserve multi-session offers, terms, remaining sessions, expiry, eligibility, purchase, and redemption |
| Gift cards | Keep — redesign | Preserve purchase for self or recipient, scheduled delivery, balance, claim, redemption, status, and exception handling |
| Wallet and transaction history | Keep — redesign | Show packages, gift cards, approved credit, receipts, refunds, and adjustments from authoritative ledgers |
| Promotions and campaign deep links | Keep — redesign | Retain remotely managed campaigns, countdowns, terms, expiry, attribution, and exact booking or purchase destinations |
| Phone verification and account | Keep — redesign | Keep low-friction verification while separating required transactional messages from optional marketing consent |
| Contextual call or SMS support | Keep — redesign | Keep direct assistance with clinic hours, expected response time, fallback, and relevant appointment or transaction reference |
| Cart and checkout | Keep selectively — redesign | Use for confirmed packages, gift cards, and physical products; do not treat an appointment service as a quantity-based retail item |
| Debit, Klarna, and Affirm | Keep conditionally | Show only contracted and technically supported methods with eligibility, interruption, refund, and alternative states |
| Afterpay banner | Backlog pending approval | Legacy evidence only; validate the merchant relationship before including it in requirements, design, or public claims |
| Rewards | Backlog with continuity | Do not recreate current rules until earn, visit, spend, expiry, redemption, cash conversion, accounting, and existing balances are approved |
| Referrals | Backlog with continuity | Replace direct collection of a friend's data with an approved shareable link or code; define consent, anti-spam, attribution, and anti-fraud rules |
| Membership enrollment and billing | Backlog with continuity | Do not add new enrollment in v1; determine how active members view status, receive benefits, get support, and migrate safely |
| Physical-product ecommerce | Backlog or conditional release | Include only after inventory, pickup or shipping, tax, returns, fulfillment, claims, and product-content ownership are approved |
| Check-in for rewards | Backlog | Add only after identity, location or QR method, abuse prevention, staff workflow, and reward rules are approved |
| Favorites and recent views | Backlog | Add after core discovery and booking validate; show only genuine signed-in history and allow clearing it |
| Long duplicated home catalogue | Remove | Replace repeated product rows and offers with a concise, prioritized home focused on the next appointment, one primary action, relevant balance, and a small number of campaigns |
| Quantity selector for treatment services | Remove | A treatment starts booking or consultation; quantity remains only for eligible retail items or explicitly defined package units |
| Cancellation and no-show policy sold as a service | Remove | Publish the policy as legal and contextual content, never as a purchasable catalogue item |
| Preselected combined consent | Remove | Terms acknowledgement, OTP or transactional messaging, and marketing opt-in must be separate; marketing is unselected by default |
| Referral notes about another person's skin or health | Remove | Do not collect third-party clinical or sensitive notes; the referred person provides their own information after consent |
| Placeholder legal and app-download links | Remove | Terms, privacy, deletion, support, and store links must resolve to maintained destinations before release |
| Inconsistent primary navigation labels | Remove | Use one stable navigation model; do not alternate Store and Shop or Book Now and Check In by route |
| Unverified financing promises | Remove | Do not advertise a method, approval, installment amount, or eligibility until the live provider confirms it |
| Financial-card styling for clinic credit | Remove | Present credit as clinic value with non-cash, expiry, eligibility, refund, and support terms rather than as a bank account |
| Fabricated or guest-personalized history | Remove | Recent views, balances, recommendations, and rewards must be genuine, attributable, and privacy-safe |

### Legacy continuity rule

Removal from the new interface does not authorize deletion of legacy records. Before launch, each legacy domain must have one disposition: migrate into the new system, integrate with its existing source, provide a time-limited read-only or support path, settle customer value before cutover, or retain records under an approved legal schedule. No active appointment, paid package session, gift-card balance, credit, membership benefit, refund, or earned reward may silently disappear.

### In scope

| **Capability** | **Included outcome**                                                                                        |
|----------------|-------------------------------------------------------------------------------------------------------------|
| Discovery      | Browse and search active services by category and customer concern                                          |
| Booking        | Select service, professional, time, intake requirements, payment option, and confirmation                   |
| Appointments   | View, reschedule, cancel, add to calendar, and receive reminders within policy                              |
| Payments       | Debit card, Klarna, and Affirm when approved, with clear eligibility, failure, refund, and receipt states    |
| Promotions     | Scheduled campaigns and events managed remotely with terms and deep links                                   |
| Gift cards     | Purchase, delivery, balance, redemption, and history where the commerce platform supports them              |
| Packages       | Purchase, validity, included sessions, redemption, and remaining balance                                    |
| Support        | FAQ, contact options, appointment-specific assistance, and escalation                                       |
| Account        | Profile, preferences, consents, privacy controls, account deletion, and transaction history                 |
| Operations     | Admin access for services, availability dependencies, promotions, packages, gift cards, and support content |
| Legacy continuity | Inventory, migrate, integrate, settle, or support existing customer records, balances, and entitlements  |

### Out of scope for v1

- New membership enrollment, recurring billing, tier management, or member acquisition. Existing-member continuity is not out of scope.
- Website redesign, website development, SEO changes, or marketing-site migration.
- A provider or employee mobile app unless separately approved.
- A clinical record system, diagnosis tool, treatment recommendation engine, or medical decision support.
- New rewards, referrals, loyalty earning, or check-in unless the client explicitly promotes them after discovery. Existing balances and obligations still require a disposition.
- Physical-product ecommerce unless inventory, fulfillment, tax, returns, product claims, and ownership are approved. Service discovery is unaffected.
- Marketplace functionality for third-party clinics or service providers.
- A general social community, public reviews platform, or user-generated content feed.

## Product goals users and success measures

### Product goals

1. Make it easy for a customer to find the right active service even when they know their concern but not the treatment name.
2. Reduce booking friction while preserving provider, availability, payment, deposit, intake, and cancellation rules.
3. Give returning customers one reliable place to manage appointments, package sessions, gift cards, receipts, and support.
4. Allow clinic staff to publish services and promotions without waiting for an app-store release.
5. Meet store, privacy, accessibility, security, and operational requirements for a maintained production app.

### Primary users

| **User**                     | **Primary need**                               | **Key tasks**                                                         |
|------------------------------|------------------------------------------------|-----------------------------------------------------------------------|
| Guest customer               | Understand services before creating an account | Browse, search, compare, view promotion, start booking                |
| New customer                 | Book safely with clear expectations            | Create account, complete intake, select payment, receive confirmation |
| Returning customer           | Manage an ongoing relationship with the clinic | Rebook, reschedule, track packages, redeem gift card, get support     |
| Gift purchaser               | Send a usable gift with confidence             | Choose value, recipient, delivery date, message, payment, receipt     |
| Content administrator        | Keep offers and catalog content current        | Schedule promotions, update terms, publish service content            |
| Operations and support staff | Resolve customer issues with reliable records  | Find booking, verify payment, manage exception, document response     |

### Proposed success measures

Business targets require baseline data and client approval. The following measures should be instrumented from launch; target values should be set after analytics and booking data are available.

| **Measure**                  | **Definition**                                                      | **Initial use**                                   |
|------------------------------|---------------------------------------------------------------------|---------------------------------------------------|
| Service discovery to booking | Share of service detail sessions that begin booking                 | Detect content or CTA friction                    |
| Booking completion           | Completed bookings divided by booking starts                        | Identify drop-off by booking step                 |
| Payment success              | Authorized payments divided by payment attempts by method           | Monitor debit, Klarna, and Affirm reliability     |
| Self-service management      | Eligible reschedules and cancellations completed without staff help | Measure operational savings                       |
| Promotion conversion         | Bookings or purchases attributed to a campaign                      | Evaluate the twice-monthly promotion program      |
| Package utilization          | Purchased sessions redeemed before expiry                           | Detect confusing rules or unmet demand            |
| Support contact rate         | Support contacts per completed booking                              | Find avoidable customer confusion                 |
| Crash-free sessions          | Sessions without a crash                                            | Recommended release gate of at least 99.5 percent |

## Product structure and navigation

### Recommended navigation

| **Tab** | **Purpose** | **Primary content** |
|---------|-------------|---------------------|
| Home | Immediate customer context | Next appointment, one primary action, relevant balance, reminders, quick rebook, and limited campaigns |
| Explore | Discovery and education | Services, concern-led categories, search, filters, approved packages, and conditional products |
| Book | Direct transactional entry | Service or concern selection followed by provider, time, intake, and payment |
| Wallet | Purchased value and records | Packages, gift cards, approved clinic credit, receipts, refunds, and conditional legacy balances |
| Account | History and control | Appointments, profile, support, communication preferences, privacy, deletion, and conditional membership status |

Rewards must not occupy a primary tab unless the feature is promoted into scope and research proves it is a frequent customer task. Check-in is a contextual action associated with an arrival or appointment, not a label that replaces Book. The final tab labels must remain identical across routes and campaigns.

### Core customer journeys

| **Journey**            | **Required sequence**                                                                                                   |
|------------------------|-------------------------------------------------------------------------------------------------------------------------|
| First booking          | Browse or search service \> details \> professional \> date and time \> intake \> payment \> confirmation               |
| Promotion booking      | Promotion \> terms and eligibility \> eligible service or package \> booking or purchase \> confirmation                |
| Appointment management | Upcoming appointment \> policy and eligibility \> reschedule or cancel \> confirmation and notification                 |
| Package purchase       | Package detail \> inclusions and validity \> payment \> wallet balance \> eligible booking                              |
| Gift card purchase     | Value \> recipient and message \> delivery schedule \> payment \> receipt and delivery status                           |
| Existing customer return | Verify identity \> match legacy account \> review migrated appointments and value \> resolve discrepancy or contact support |
| Support                | Contextual help \> self-service answer \> contact channel \> reference number or response expectation                   |
| Account deletion       | Privacy settings \> deletion explanation \> identity confirmation \> request submission \> status and completion notice |

### Guest access and sign in

Customers should be able to browse services, prices, providers, promotions, package information, gift-card information, and general support without signing in. Authentication should be requested only when personal information, a transaction, or an appointment must be saved. This follows Apple's direction to avoid login when account-based functionality is not needed.

## Functional requirements

Priorities use Must, Should, Could, and Backlog. Must requirements define the proposed v1 baseline. Every requirement remains subject to technical feasibility and the client decisions listed later in this document.

### Account and authentication requirements

| **ID**  | **Priority** | **Requirement**         | **Acceptance summary**                                                                                 |
|---------|--------------|-------------------------|--------------------------------------------------------------------------------------------------------|
| AUTH 01 | Must         | Guest access            | Public content can be viewed without creating an account                                               |
| AUTH 02 | Must         | Account creation        | Customer can register using the approved email or phone method and verify ownership                    |
| AUTH 03 | Must         | Sign in and recovery    | Sign in, sign out, forgotten-password or code recovery, and session expiry are supported               |
| AUTH 04 | Must         | Profile                 | Customer can maintain name, contact details, birthday only if justified, and communication preferences |
| AUTH 05 | Must         | Secure session          | Tokens are stored securely, revoked on sign out, and protected from replay                             |
| AUTH 06 | Must         | Account deletion        | In-app deletion route exists; Android also has a functioning web request route                         |
| AUTH 07 | Should       | Biometric re-entry      | Customer may use device biometrics after a successful authenticated session                            |
| AUTH 08 | Could        | Apple or Google sign in | Add only if identity architecture and store requirements justify it                                    |
| AUTH 09 | Must         | Consent separation      | Terms acceptance, OTP or transactional messages, and optional marketing consent are separate records   |
| AUTH 10 | Must         | Legal destinations      | Terms, privacy, consent detail, support, and deletion links open maintained non-placeholder resources   |
| AUTH 11 | Must         | Legacy account match    | A verified customer can safely match or recover an existing record without creating duplicate value    |

### Home services and discovery requirements

| **ID**  | **Priority** | **Requirement**               | **Acceptance summary**                                                                                                                   |
|---------|--------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| DISC 01 | Must         | Personalized home             | Signed-in customer sees next appointment, relevant reminders, and balances without exposing sensitive details on a locked screen         |
| DISC 02 | Must         | Service catalog               | Only approved active services appear; names and pricing match the canonical source                                                       |
| DISC 03 | Must         | Search                        | Search supports canonical names, approved aliases, categories, and concerns                                                              |
| DISC 04 | Must         | Concern-led browsing          | Customers can browse concerns such as acne, pigmentation, hair loss, skin tightening, and hair removal after clinical review             |
| DISC 05 | Must         | Filters                       | Relevant filters include category, concern, price type, duration, and professional where data exists                                     |
| DISC 06 | Must         | Service detail                | Displays description, duration, price format, professional eligibility, preparation, aftercare, contraindication notice, and booking CTA |
| DISC 07 | Must         | Price clarity                 | Fixed, starting, range, per-unit, consultation-required, and promotional prices are visually distinct                                    |
| DISC 08 | Should       | Favorites and recent services | Signed-in customers may save or revisit services without affecting booking data                                                          |
| DISC 09 | Must         | Catalog governance            | Policies, fees, memberships, products, packages, and appointment services use distinct content types and cannot be misclassified          |
| DISC 10 | Must         | Empty and no-result states    | Search offers clear reset, spelling or alias help, category or concern alternatives, and consultation or support when no result is found   |
| DISC 11 | Must         | Home prioritization           | Home avoids duplicate carousels and gives visual priority to the next appointment, booking, relevant value, and a limited campaign set     |

### Booking and appointment requirements

| **ID**  | **Priority** | **Requirement**        | **Acceptance summary**                                                                                          |
|---------|--------------|------------------------|-----------------------------------------------------------------------------------------------------------------|
| BOOK 01 | Must         | Service selection      | Booking starts from a service, promotion, package entitlement, or Book tab                                      |
| BOOK 02 | Must         | Professional selection | Customer can choose any eligible professional or next available when supported                                  |
| BOOK 03 | Must         | Availability           | Slots reflect the approved source of truth and cannot be double-booked                                          |
| BOOK 04 | Must         | Slot protection        | A selected slot is held for a defined period or revalidated before payment                                      |
| BOOK 05 | Must         | Intake                 | Only required questions and consents are collected; sensitive answers follow approved storage rules             |
| BOOK 06 | Must         | Review                 | Customer reviews service, professional, time, location, price, deposit, policy, and payment before confirmation |
| BOOK 07 | Must         | Confirmation           | Successful booking creates one appointment record and sends a receipt or confirmation                           |
| BOOK 08 | Must         | Upcoming and history   | Customer can view current, completed, cancelled, and no-show appointments as approved                           |
| BOOK 09 | Must         | Reschedule             | Eligibility, fee, cutoff, and available replacement slots follow clinic rules                                   |
| BOOK 10 | Must         | Cancellation           | The app shows consequences before confirmation and records refund or credit status                              |
| BOOK 11 | Must         | Calendar action        | Confirmed appointments can be added to the device calendar without requiring full calendar access               |
| BOOK 12 | Should       | Rebook                 | Completed appointments can be repeated with the same service or an approved alternative                         |
| BOOK 13 | Must         | Service transaction model | An appointment service is never sold through a generic quantity selector; purchase, entitlement, and booking states are explicit        |
| BOOK 14 | Must         | Purchase-to-book continuity | If a customer can prepay for a service, confirmation explains the entitlement and provides the exact next booking action                |

### Payment requirements

| **ID** | **Priority** | **Requirement**          | **Acceptance summary**                                                                               |
|--------|--------------|--------------------------|------------------------------------------------------------------------------------------------------|
| PAY 01 | Must         | Debit card               | Card payment uses a PCI-compliant tokenized provider; the app does not store raw card data           |
| PAY 02 | Must         | Klarna                   | Eligible customers and transactions can select Klarna through an approved merchant integration       |
| PAY 03 | Must         | Affirm                   | Eligible customers and transactions can select Affirm through an approved merchant integration       |
| PAY 04 | Must         | Eligibility messaging    | Unavailable financing shows a clear reason or neutral alternative without promising approval         |
| PAY 05 | Must         | Deposit and full payment | Checkout supports the client-approved model by service, package, gift card, and promotion            |
| PAY 06 | Must         | Idempotency              | Retries and webhook duplication cannot create duplicate charges or bookings                          |
| PAY 07 | Must         | Failure recovery         | Declines, abandonment, timeouts, expired sessions, and provider outages preserve a recoverable state |
| PAY 08 | Must         | Receipts                 | Customer receives an itemized record showing taxes, discounts, payment method, status, and reference |
| PAY 09 | Must         | Refunds                  | Full, partial, financing-related, and failed refunds display a traceable status                      |
| PAY 10 | Should       | Saved payment method     | Use provider tokens only and require explicit customer consent                                       |
| PAY 11 | Backlog      | Afterpay                 | Add only after the client confirms an active merchant agreement, supported transaction types, refunds, and mobile integration |
| PAY 12 | Must         | Method truthfulness      | Public financing messages are generated from approved configuration and never imply eligibility or approval before provider response |

### Promotion and event requirements

| **ID**   | **Priority** | **Requirement**       | **Acceptance summary**                                                                          |
|----------|--------------|-----------------------|-------------------------------------------------------------------------------------------------|
| PROMO 01 | Must         | Remote publishing     | Authorized staff can create or update a campaign without releasing a new app version            |
| PROMO 02 | Must         | Scheduling            | Start and end dates, timezone, draft, scheduled, live, expired, and paused states are supported |
| PROMO 03 | Must         | Eligibility           | Campaign defines services, packages, audiences, locations, dates, usage limits, and exclusions  |
| PROMO 04 | Must         | Terms                 | Material conditions are visible before booking or purchase                                      |
| PROMO 05 | Must         | Deep links            | Campaign CTA opens the exact eligible service, package, or booking path                         |
| PROMO 06 | Must         | Promo codes           | Code validation handles invalid, expired, exhausted, ineligible, and already-used states        |
| PROMO 07 | Should       | Notification campaign | Authorized staff may schedule opt-in promotional push messages                                  |
| PROMO 08 | Should       | Attribution           | Views, CTA taps, booking starts, purchases, and completions are measured                        |
| PROMO 09 | Must         | Countdown integrity   | Countdown and expiry use server time, approved timezone, accessible text, and a safe expired destination |

### Gift card package and wallet requirements

| **ID**  | **Priority** | **Requirement**      | **Acceptance summary**                                                                             |
|---------|--------------|----------------------|----------------------------------------------------------------------------------------------------|
| WALT 01 | Must         | Gift-card catalog    | Preset and approved custom values show terms, expiry, and eligible redemption                      |
| WALT 02 | Must         | Gift delivery        | Purchaser enters recipient, message, and immediate or scheduled delivery details                   |
| WALT 03 | Must         | Gift status          | Purchaser can see payment, scheduled, sent, delivered if supported, cancelled, and refunded states |
| WALT 04 | Must         | Gift balance         | Owner can view available balance and redemption history after secure claim or account association  |
| WALT 05 | Must         | Package detail       | Package shows sessions, eligible services, regular value, price, savings, validity, and rules      |
| WALT 06 | Must         | Package balance      | Wallet shows used, remaining, expired, transferred if allowed, and pending sessions                |
| WALT 07 | Must         | Package redemption   | Eligible session can be applied during booking with clear remaining balance                        |
| WALT 08 | Must         | Transaction history  | Purchases, redemptions, refunds, and adjustments are visible with references                       |
| WALT 09 | Should       | Multiple instruments | Rules define whether package, gift card, promotion, and debit can be combined                      |
| WALT 10 | Must         | Clinic credit         | Approved credit shows source, available and pending value, use restrictions, expiry, adjustments, and non-cash status |
| WALT 11 | Must         | Ledger reconciliation | Displayed balances reconcile with the authoritative ledger and expose a support path for discrepancies |
| WALT 12 | Must         | Legacy value continuity | Existing packages, gift cards, credits, refunds, and approved rewards are migrated, integrated, settled, or supported before cutover |

### Conditional product commerce requirements

These requirements remain Backlog until physical-product commerce is approved for release.

| **ID** | **Priority** | **Requirement** | **Acceptance summary** |
|--------|--------------|-----------------|------------------------|
| PROD 01 | Backlog | Product catalogue | Only approved products, variants, ingredients, use instructions, claims, imagery, pricing, and status appear |
| PROD 02 | Backlog | Inventory | Stock, reservation, oversell handling, backorder, and discontinuation use an authoritative source |
| PROD 03 | Backlog | Fulfillment | Pickup or shipping options, address validation, charges, timing, tracking, failed delivery, and support are defined |
| PROD 04 | Backlog | Tax and returns | Tax, receipt, return, exchange, damaged item, refund, and final-sale rules are visible and operationally supported |
| PROD 05 | Backlog | Safe content | Product claims and instructions have an owner, approval record, revision date, and escalation path |

### Conditional loyalty referral and membership requirements

The following capabilities were observed in the legacy app but are not approved as new v1 acquisition or earning flows. Continuity requirements remain mandatory wherever customer value already exists.

| **ID** | **Priority** | **Requirement** | **Acceptance summary** |
|--------|--------------|-----------------|------------------------|
| REWD 01 | Backlog | Reward rules | Visits, spend, thresholds, exclusions, expiry, redemption, adjustments, and cash-equivalent treatment are approved and unambiguous |
| REWD 02 | Must | Existing reward disposition | Active balances and earned rewards are inventoried and migrated, settled, honoured through support, or retired with approved notice |
| REWD 03 | Backlog | Check-in | Check-in has an approved identity method, appointment relationship, staff exception path, and abuse prevention |
| REF 01 | Backlog | Consent-led referral | Prefer a shareable code or link so the referred person chooses whether to identify themselves and consent to contact |
| REF 02 | Remove | Third-party sensitive notes | No referral flow collects another person's skin condition, treatment interest, medical detail, or free-form sensitive notes |
| REF 03 | Backlog | Referral controls | Reward amount, attribution window, eligibility, duplicate handling, anti-spam, anti-fraud, tax or accounting, and support are approved |
| MEM 01 | Backlog | New membership | New enrollment, recurring billing, upgrades, downgrades, pauses, cancellation, member pricing, and benefit use require a separate approved release |
| MEM 02 | Must | Existing-member continuity | Active members can verify status and obtain benefits or support during migration even if new enrollment is unavailable |
| MEM 03 | Must | Tier reconciliation | Conflicting legacy tier names, prices, discounts, banked value, and benefits are reconciled before any member-facing design is approved |

### Support and notification requirements

| **ID**   | **Priority** | **Requirement**             | **Acceptance summary**                                                                       |
|----------|--------------|-----------------------------|----------------------------------------------------------------------------------------------|
| SUP 01   | Must         | Support hub                 | FAQ, clinic contact details, hours, location, and urgent-care disclaimer are accessible      |
| SUP 02   | Must         | Contextual support          | Appointment, payment, package, and gift-card screens link to relevant help                   |
| SUP 03   | Must         | Contact channels            | Approved phone, email, form, chat, or messaging channels show expected response behavior     |
| SUP 04   | Must         | Reference context           | Customer can share an appointment or transaction reference without exposing unnecessary data |
| NOTIF 01 | Must         | Transactional notifications | Booking, changes, cancellation, payment, delivery, and refund events use approved templates  |
| NOTIF 02 | Must         | Appointment reminders       | Timing and channel are configurable and respect consent and quiet-hour rules                 |
| NOTIF 03 | Must         | Preparation and aftercare   | Approved instructions are linked to the relevant service and event timing                    |
| NOTIF 04 | Must         | Preferences                 | Transactional and marketing preferences are separate; marketing can be withdrawn             |
| NOTIF 05 | Should       | Inbox                       | Important app messages remain available after a push notification is dismissed               |

### Privacy and account control requirements

| **ID**  | **Priority** | **Requirement**       | **Acceptance summary**                                                                                                    |
|---------|--------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------|
| PRIV 01 | Must         | Privacy notice        | Notice identifies purposes, data categories, processors, retention, rights, and contact details                           |
| PRIV 02 | Must         | Consent records       | Version, timestamp, channel, purpose, and withdrawal are auditable                                                        |
| PRIV 03 | Must         | Data minimization     | Only data needed for the approved purpose is required                                                                     |
| PRIV 04 | Must         | Deletion              | Deletion explains what is deleted, retained, deidentified, and legally required                                           |
| PRIV 05 | Must         | Access and correction | Customer can view and correct appropriate profile data or request help                                                    |
| PRIV 06 | Must         | Permissions           | Notifications, photos, camera, calendar, and location are requested only in context and have alternatives where practical |
| PRIV 07 | Must         | Sensitive content     | Medical intake, contraindications, treatment photos, and notes are excluded until approved controls exist                 |
| PRIV 08 | Should       | Export                | Customer can request a portable copy of appropriate account and transaction information                                   |
| PRIV 09 | Must         | Third-party data       | The app does not collect a friend's contact or sensitive information without an approved lawful, transparent consent model |

### Administration requirements

| **ID**   | **Priority** | **Requirement**                  | **Acceptance summary**                                                                          |
|----------|--------------|----------------------------------|-------------------------------------------------------------------------------------------------|
| ADMIN 01 | Must         | Role-based access                | Content, support, finance, operations, and administrator permissions are separated              |
| ADMIN 02 | Must         | Service management               | Authorized staff manage status, content, pricing display, imagery, eligibility, and ordering    |
| ADMIN 03 | Must         | Promotion management             | Campaigns support scheduling, preview, validation, audit history, and rollback or pause         |
| ADMIN 04 | Must         | Package and gift-card management | Rules and content are managed without direct database edits                                     |
| ADMIN 05 | Must         | Support content                  | FAQ and contact details can be updated with preview and publishing controls                     |
| ADMIN 06 | Must         | Audit log                        | Sensitive changes record actor, timestamp, previous value, new value, and reason where required |
| ADMIN 07 | Must         | Environment separation           | Development, staging, and production use separate data and credentials                          |
| ADMIN 08 | Should       | Approval workflow                | High-risk price, promotion, or policy changes can require a second approver                     |
| ADMIN 09 | Must         | Customer-value support           | Authorized staff can trace and resolve appointment, package, gift-card, credit, refund, membership, and approved reward discrepancies |
| ADMIN 10 | Must         | Content-type validation          | Policies cannot publish as services, expired campaigns cannot transact, and unapproved financing methods cannot display   |

## Content data and integration requirements

### Canonical service catalog

A single approved service catalog must be created before information architecture and wireframes are signed off. The app must not independently reproduce the website, Fresha, or legacy-app taxonomy because the audited sources contain different services, names, spelling, categories, prices, and content types. The legacy catalogue also contains duplicates and a cancellation policy presented as a purchasable service; these records require classification rather than direct migration.

| **Required field**                    | **Purpose**                                                                        |
|---------------------------------------|------------------------------------------------------------------------------------|
| Service identifier and canonical name | Stable reference across app, booking, payment, analytics, and content systems      |
| Aliases and search terms              | Connect customer language and previous names to the approved service               |
| Category and concern                  | Support treatment-led and concern-led discovery                                    |
| Description and benefits              | Provide approved educational content without unsupported claims                    |
| Duration and recovery                 | Set expectations and support scheduling                                            |
| Price model                           | Fixed, starting, range, per unit, consultation required, package eligible          |
| Eligible professionals and resources  | Control availability and provider selection                                        |
| Preparation and aftercare             | Power time-based customer instructions                                             |
| Contraindication and intake rules     | Trigger approved questions and escalation without diagnosis                        |
| Deposit cancellation and refund rules | Drive review, payment, change, and cancellation states                             |
| Package and promotion eligibility     | Prevent invalid discounts or entitlements                                          |
| Status and channel visibility         | Control draft, active, unavailable, archived, website, app, and booking visibility |
| Image rights and accessibility text   | Ensure approved images and meaningful alternative text                             |

### Core data entities

| **Entity**   | **Minimum relationships and states**                                                  |
|--------------|---------------------------------------------------------------------------------------|
| Customer     | Identity, verified contact, preferences, consents, deletion status                    |
| Service      | Category, concern, price model, duration, provider eligibility, rules, content status |
| Professional | Display profile, eligible services, location, availability reference, active status   |
| Appointment  | Customer, service, professional, slot, status, payment, intake, policy version        |
| Payment      | Provider reference, method, amount, tax, status, idempotency key, refund links        |
| Package      | Product terms, entitlements, validity, owner, redemption ledger, status               |
| Gift card    | Purchaser, recipient, delivery, balance ledger, claim state, terms                    |
| Promotion    | Schedule, audience, eligibility, code, terms, deep link, attribution                  |
| Consent      | Purpose, version, timestamp, channel, withdrawal                                      |
| Support case | Customer context, category, reference, channel, status, response metadata             |
| Credit ledger | Owner, source, available, pending, spent, adjusted, expired, restrictions, references |
| Legacy mapping | Legacy identifier, new identifier, domain, source, migration status, reconciliation and exception |
| Product | Variant, inventory reference, price, tax, fulfillment, claims approval, content status if commerce is enabled |
| Membership | Tier, billing reference, status, benefits, banked value, renewal and support state if continuity is required |
| Reward or referral | Rules version, earned value, redemption or attribution, status and audit history if approved |

### Integration decisions

| **Integration**  | **Required capability**                                                     | **Decision needed**                                    |
|------------------|-----------------------------------------------------------------------------|--------------------------------------------------------|
| Booking platform | Services, professionals, availability, create, reschedule, cancel, webhooks | Fresha integration, controlled handoff, or replacement |
| Debit processor  | Tokenization, debit support in Canada, refunds, webhooks, receipts          | Existing merchant and preferred gateway                |
| Klarna           | Merchant eligibility, amount limits, mobile flow, capture, cancel, refund   | Direct or payment-provider integration                 |
| Affirm           | Canadian merchant eligibility, mobile flow, authorization, capture, refund  | Direct or payment-provider integration                 |
| Afterpay         | Confirm whether the observed banner reflects an active merchant capability   | Exclude until commercial and technical approval        |
| Gift cards       | Issuance, delivery, claim, ledger, redemption, refund                       | Existing provider or new ledger                        |
| Packages         | Purchase, entitlement, redemption, expiry, adjustment                       | Existing source of truth or new ledger                 |
| CMS              | Services, promotions, policy content, media, preview, scheduling            | Existing CMS extension or headless CMS                 |
| Notifications    | Push, email, SMS if approved, templates, preferences, delivery status       | Vendors and consent model                              |
| Analytics        | Privacy-conscious event collection, funnels, errors, campaign attribution   | Approved platform and retention                        |
| Support          | Contact forms, tickets, chat, or messaging with references                  | Channel and service-level expectations                 |
| Legacy app       | Customer IDs, appointments, orders, package and gift ledgers, credits, memberships, rewards, referrals, consent, exports, and retention | Migrate, integrate, read-only, settle, or decommission per domain |
| Product commerce | Catalog, inventory, pickup or shipping, tax, return, refund, and order status | Backlog unless an operational source is confirmed      |

### Booking architecture options

| **Option**                  | **Advantages**                                             | **Constraints**                                                                     | **Use when**                                               |
|-----------------------------|------------------------------------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------|
| Native API integration      | Best continuity, app-controlled states, stronger analytics | Requires supported API, webhooks, commercial access, and complete data coverage     | Booking provider formally supports all required operations |
| Controlled provider handoff | Fastest path and lower booking-engine effort               | Brand break, limited analytics, weak wallet integration, possible duplicate sign-in | API access is unavailable and client accepts limitations   |
| Custom booking backend      | Full control over product behavior and data                | Largest cost, operational risk, scheduling complexity, migration work               | Existing platforms cannot meet essential requirements      |

Recommendation: do not select an option until the team completes a technical discovery with Fresha or the actual booking provider. A visual design can begin at the flow level, but high-fidelity transactional screens should not be finalized before error states and integration limits are known.

### Legacy migration and decommission requirements

| **ID** | **Priority** | **Requirement** | **Acceptance summary** |
|--------|--------------|-----------------|------------------------|
| LEG 01 | Must | Data inventory | The team documents legacy domains, record counts, owners, identifiers, balances, active states, consent provenance, quality, and export capability |
| LEG 02 | Must | Domain disposition | Every domain is assigned migrate, integrate, read-only, settle, archive, or delete under an approved retention rule |
| LEG 03 | Must | Reconciliation | Appointments and customer value are reconciled before and after cutover; discrepancies have an owner and customer-support procedure |
| LEG 04 | Must | Identity mapping | Verified phone and email matching, duplicates, shared contacts, changed numbers, and unmatched customers are safely resolved |
| LEG 05 | Must | Cutover | Freeze window, delta migration, rollback, downtime messaging, support staffing, and go or no-go authority are documented and rehearsed |
| LEG 06 | Must | Customer communication | Affected customers receive accurate notice of access, balance, membership, consent, policy, and support changes through approved channels |
| LEG 07 | Must | Route transition | Maintained web and campaign routes use approved redirects or an explanatory fallback; expired deep links never fail silently |
| LEG 08 | Must | Decommission evidence | The legacy app is retired only after reconciliation sign-off, contractual review, record retention, credential revocation, monitoring, and rollback window |

## Nonfunctional requirements

| **ID** | **Area**            | **Requirement**                                                                                                                                                                          |
|--------|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NFR 01 | Accessibility       | Target WCAG 2.2 AA principles plus VoiceOver and TalkBack testing, scalable text, sufficient contrast, meaningful labels, logical focus, large touch targets, and reduced-motion support |
| NFR 02 | Performance         | Define launch, screen, image, search, and API response budgets; measure on representative mid-range Android and supported iPhone devices                                                 |
| NFR 03 | Reliability         | Bookings and payments use idempotent operations, recoverable states, webhook reconciliation, and visible incident handling                                                               |
| NFR 04 | Security            | TLS in transit, encryption at rest, least privilege, secure secrets, strong admin authentication, dependency scanning, and security review before launch                                 |
| NFR 05 | Privacy             | Purpose limitation, data minimization, consent evidence, retention schedules, deletion workflows, processor inventory, and accurate store disclosures                                    |
| NFR 06 | Sensitive data      | Do not collect medical history, treatment photos, allergies, medications, or clinical notes until legal, security, retention, and access controls are approved                           |
| NFR 07 | Compatibility       | Support matrix must define minimum iOS and Android versions, phone and tablet behavior, orientation, screen sizes, and accessibility settings                                            |
| NFR 08 | Observability       | Collect privacy-safe crash, error, latency, webhook, payment, and booking health data with alerting and trace references                                                                 |
| NFR 09 | Offline behavior    | Previously loaded public content may be cached; booking, payment, cancellation, and balance changes require confirmed connectivity                                                       |
| NFR 10 | Content freshness   | Catalog, price, terms, and promotion changes publish remotely with cache invalidation and version awareness                                                                              |
| NFR 11 | Backup and recovery | Critical business records have tested backups, restoration procedures, retention, and recovery objectives                                                                                |
| NFR 12 | Quality assurance   | Automated and manual tests cover core journeys, accessibility, payment, booking, notifications, upgrades, and interrupted sessions                                                       |
| NFR 13 | Localization        | English is the assumed launch language; architecture must not hardcode text, currency, date, time, or plural rules                                                                       |
| NFR 14 | Maintainability     | Shared design tokens, component documentation, environment configuration, API contracts, release notes, and ownership are maintained                                                     |

### Privacy and store requirements

- Apple requires apps with account creation to provide account deletion inside the app. Google Play requires both an in-app deletion path and a web resource for deletion requests.
- Apple and Google require accurate disclosure of data collected by the app and integrated third-party SDKs. The disclosure inventory must be updated when SDKs or data practices change.
- Apple permits external payment methods for physical goods or services consumed outside the app. Google Play billing does not support physical services and is not required for gift-card sales. Gift-card implementation on iOS still requires a store-policy review based on what the card can redeem.
- Apple may reject a repackaged website with insufficient utility. Native appointment management, reminders, wallet information, support, and customer controls are therefore product requirements, not optional polish.
- British Columbia's Personal Information Protection Act requires reasonable security arrangements for personal information under an organization's control. Legal counsel must confirm the final consent, retention, access, and cross-border processing model.
- If the app is treated as a healthcare or sensitive-data app, publication should use the clinic's verified legal-entity developer accounts and the submission should clearly describe the service and data model.

## Design and validation process

The design work should proceed in gated phases. Each phase produces material needed by the next phase and ends with an explicit approval or unresolved-decision list. The indicative schedule below covers product and UX/UI design; engineering duration depends on the integration choice, team size, and backend readiness.

| **Phase**                  | **Activities**                                                                              | **Deliverables**                       | **Exit condition**                                | **Guide**      |
|----------------------------|---------------------------------------------------------------------------------------------|----------------------------------------|---------------------------------------------------|----------------|
| 0 Intake                   | Collect catalog, policies, integrations, brand assets, analytics, legacy exports, and access | Source register, legacy inventory, and decision log | P0 inputs assigned or resolved                    | 3 to 5 days    |
| 1 Benchmark                | Review 5 to 7 relevant beauty, med-spa, booking, wallet, and commerce apps                  | Scored benchmark and patterns          | Opportunities and anti-patterns approved          | 4 to 6 days    |
| 2 Product definition       | Confirm users, journeys, scope, service blueprint, data boundaries, and success measures    | Approved PRD and service blueprint     | Scope and architecture direction approved         | 4 to 7 days    |
| 3 Information architecture | Define navigation, taxonomy, screen inventory, permissions, and state model                 | Sitemap, task flows, state inventory   | Critical flows have no unresolved structural gaps | 4 to 6 days    |
| 4 Low fidelity             | Wireframe core journeys and exception states                                                | Clickable low-fidelity prototype       | Internal walkthrough and client review pass       | 1 to 2 weeks   |
| 5 User validation          | Test discovery, booking, payment, package, gift-card, and support tasks                     | Findings, severity list, revised flows | Critical usability issues resolved                | 1 week         |
| 6 Visual system            | Create app design language, components, motion, content patterns, and high-fidelity screens | Design system and full prototype       | Accessibility and brand review pass               | 2 to 4 weeks   |
| 7 Handoff                  | Specify responsive behavior, tokens, assets, states, analytics, and acceptance criteria     | Developer-ready files and tickets      | Engineering confirms feasibility                  | 3 to 5 days    |
| 8 Build support            | Review implementation, resolve questions, update designs, and run design QA                 | Annotated issues and approved build    | Core screens match approved design                | During sprints |
| 9 Beta and release         | TestFlight and Play testing, store assets, review notes, privacy forms, launch monitoring   | Release candidate and store package    | Readiness checklist signed                        | 1 to 3 weeks   |

### Benchmarking framework for the next phase

Competitor benchmarking and broader design-language research can proceed now. Transactional conclusions must remain provisional until the client confirms the service, booking, commerce, and legacy-data boundaries. The work should compare patterns rather than copy visual styles, and each relevant product should be scored against the same requirements.

| **Dimension** | **Questions to score**                                                                                      |
|---------------|-------------------------------------------------------------------------------------------------------------|
| Discovery     | Can customers browse by service and concern and understand price type, duration, suitability, and next step |
| Booking       | How many steps are required; how provider, availability, intake, deposit, errors, and policies are handled  |
| Commerce      | How payment methods, financing eligibility, receipts, refunds, gift cards, and packages are represented     |
| Relationship  | How upcoming appointments, rebooking, reminders, aftercare, balances, and support work                      |
| Promotions    | How campaigns are discovered, qualified, deep-linked, scheduled, and measured                               |
| Trust         | How practitioners, reviews, policies, privacy, medical boundaries, and contact information are communicated |
| Accessibility | Text scaling, contrast, focus, labels, errors, target sizes, motion, and screen-reader behavior             |
| Native value  | Which experiences provide utility beyond the website or booking marketplace                                 |

### Required design artifacts

- Product sitemap and navigation model.
- End-to-end task flows with happy paths, failure paths, and recovery paths.
- Service taxonomy and search behavior.
- Screen and state inventory, including loading, empty, permission-denied, offline, expired, and error states.
- Low-fidelity prototype for usability testing.
- Design tokens, reusable components, content patterns, iconography, and motion guidance.
- High-fidelity iOS and Android layouts showing shared components and platform-specific behavior.
- Accessibility annotations and test plan.
- Analytics event map and consent-aware tracking plan.
- Developer handoff specifications with acceptance criteria and assets.

### Usability validation plan

| **Task**                       | **Evidence of success**                                                                            |
|--------------------------------|----------------------------------------------------------------------------------------------------|
| Find a treatment for a concern | Participant finds an appropriate approved path without knowing the treatment name                  |
| Book a first appointment       | Participant understands provider, time, price, deposit, intake, and cancellation before confirming |
| Use Klarna or Affirm           | Participant understands eligibility, financing handoff, success, failure, and alternative payment  |
| Buy a package                  | Participant can explain inclusions, savings, validity, and how sessions will be used               |
| Send a gift card               | Participant completes recipient, message, delivery, payment, and confirmation accurately           |
| Reschedule or cancel           | Participant understands eligibility, fee or refund consequence, and final status                   |
| Get help                       | Participant reaches the right channel and can provide relevant context                             |
| Delete an account              | Participant can find the control and understands the data outcome                                  |
| Return as a legacy customer    | Participant can verify identity, find expected appointments and balances, and resolve a mismatch   |
| Register and set preferences   | Participant distinguishes required verification from optional marketing and can open legal details |

## Delivery release and operational readiness

### Engineering workstreams

| **Workstream**       | **Required output**                                                                                               |
|----------------------|-------------------------------------------------------------------------------------------------------------------|
| Architecture         | Approved mobile framework, backend boundary, environments, API contracts, data ownership, and threat model        |
| Booking              | Provider integration or booking service with availability, locking, webhooks, reconciliation, and support tooling |
| Commerce             | Debit, approved financing, tax, refund, gift-card, package, credit, and receipt implementation                    |
| Content              | Catalog and campaign administration with publishing workflow and media management                                 |
| Identity and privacy | Authentication, consent, access controls, deletion, retention, and disclosure inventory                           |
| Notifications        | Push and approved secondary channels, templates, deep links, preferences, and delivery monitoring                 |
| Quality              | Automated tests, device matrix, accessibility review, security testing, beta feedback, and regression suite       |
| Operations           | Monitoring, incident response, support runbooks, refund and booking exception procedures                          |
| Legacy transition    | Export, mapping, migration or integration, reconciliation, cutover, customer communication, and decommission evidence |

### Store submission requirements

- Organization-owned Apple Developer and Google Play Console accounts with verified legal, tax, banking, and contact information.
- Unique bundle identifier and package name owned by the client.
- Production app name, subtitle or short description, long description, category, age rating, keywords where applicable, icon, screenshots, and preview assets.
- Public support URL, privacy-policy URL, terms, and Android account-deletion web URL.
- Accurate Apple privacy and Google Data Safety declarations covering every SDK and server-side data flow.
- Permanent review account or full demo mode, review instructions, and live testable backend services.
- Clear review notes explaining physical-service payments, financing flows, gift cards, packages, booking, and any sensitive-data handling.
- TestFlight and Google closed-testing plans, tester consent, feedback handling, and release-candidate sign-off.

### Release gates

| **Gate**          | **Minimum evidence**                                                                                                 |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Scope ready       | Signed v1 scope, backlog, architecture choice, catalog owner, and decision log                                       |
| Design ready      | Approved prototype, state inventory, accessibility annotations, content, and feasibility review                      |
| Development ready | Stable API contracts, test environments, credentials, analytics plan, and acceptance criteria                        |
| Beta ready        | Core flows complete, seeded data, monitoring active, no open critical defects, support prepared                      |
| Store ready       | Privacy forms, legal URLs, metadata, reviewer access, account deletion, and payment explanation complete             |
| Launch ready      | Production smoke test, rollback plan, incident contacts, dashboards, customer communication, and ownership confirmed |

### Definition of done for a feature

- The approved requirement and acceptance criteria are implemented across supported platforms.
- Loading, empty, validation, permission, offline, timeout, error, success, and retry states are handled.
- Accessibility labels, focus order, text scaling, contrast, target size, and screen-reader behavior have been checked.
- Analytics and operational logging work without collecting unapproved personal or sensitive data.
- Security and privacy checks are complete and the disclosure inventory reflects the final implementation.
- Automated and manual tests pass on the approved device and operating-system matrix.
- Customer-facing content is approved and administrative or support procedures are documented.

## Missing information and discovery checklist

The items in this section are the missing inputs that must be gathered. P0 items can change architecture, cost, schedule, or compliance and should be resolved before high-fidelity design. P1 items are needed before design approval or development. P2 items can be refined during delivery but must be complete before launch.

### P0 product and architecture decisions

| **Missing input**             | **Why it matters**                                                                | **Requested evidence**                                                                                                    | **Owner**                       |
|-------------------------------|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|---------------------------------|
| Booking source of truth       | Determines the entire transaction architecture                                    | Fresha or vendor plan, admin access, contract, API and webhook documentation, technical contact                           | Client and tech lead            |
| Canonical active service list | All services cannot be preserved without an approved inventory                    | Spreadsheet with names, categories, durations, prices, staff, rules, status, and aliases                                  | Clinic operations               |
| Payment architecture          | Debit and financing may require a common processor or separate integrations       | Active merchant accounts for debit, Klarna, Affirm and observed Afterpay; gateway contract, currency, settlement, tax, refund, dispute, limits, and sandbox access | Client finance and tech lead    |
| Booking business rules        | Drives availability, pricing, cancellation, and state design                      | Deposits, holds, lead time, buffers, no-show, reschedule, cancellation, refund, waitlist, and provider rules              | Clinic operations               |
| Package source of truth       | Balances and redemption cannot be designed safely without ledger rules            | Current package catalog, ownership, expiry, transfers, sharing, combination, refund, and adjustment rules                 | Clinic operations and finance   |
| Gift-card source of truth     | Delivery and redemption depend on issuance and balance ownership                  | Provider, terms, expiry, custom values, delivery, claim, combination, loss, refund, and fraud rules                       | Clinic operations and finance   |
| Sensitive-data boundary       | Changes privacy, security, legal, UX, and vendor requirements                     | Approved list of intake data, contraindications, photos, notes, allergies, medications, retention, access, and processors | Client legal and clinical owner |
| Identity and migration        | Determines sign-in, duplicate handling, and existing customer access              | Customer systems, identifiers, record counts, consent provenance, data quality, migration and deduplication rules         | Client and tech lead            |
| Legacy system and export access | Customer value cannot be protected without authoritative data and ownership       | Technical owner, backend and vendor list, admin access, API or export documentation, schemas, record counts, retention, contracts, and shutdown constraints | Client and tech lead |
| Existing customer-value inventory | Deferred features may still contain money or contractual benefits                | Counts and balances for appointments, packages, gift cards, clinic credit, refunds, active memberships, rewards, and referral obligations | Operations and finance |
| Membership and loyalty disposition | Determines what existing customers see and what must migrate or be settled       | Active tiers, names, prices, benefits, billing, renewal, cancellation, banked value, reward and referral rules, liability, and support cases | Operations, finance, and legal |
| Product-commerce decision     | The legacy app sells stocked products but fulfillment scope is unconfirmed         | Decision to exclude, phase, or launch; product catalogue, inventory system, pickup or shipping, tax, return, claims, and owner | Client sponsor and operations |

### P1 experience content and operations inputs

| **Missing input**          | **Needed detail**                                                                                                              | **Owner**                      |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| Audience and launch market | Primary customer segments, age restrictions, geography, location count, and launch language                                    | Client product owner           |
| Brand system               | Logo files, colors, typography rights, photography, icon direction, tone, and examples to preserve or avoid                    | Client brand owner             |
| Service content            | Approved descriptions, benefits, preparation, aftercare, contraindication wording, price display, imagery, and review owner    | Clinical and content owners    |
| Professional profiles      | Active professionals, titles, credentials, biographies, photos, service eligibility, and schedule ownership                    | Clinic operations              |
| Promotion operations       | Approval workflow, campaign calendar, codes, exclusions, audience rules, notification channels, and reporting needs            | Marketing owner                |
| Legacy campaign continuity | Active or scheduled campaigns, public links, expiry, terms, redirection, and which promotions must survive cutover              | Marketing owner                |
| Support model              | Channels, hours, service levels, escalation, emergency wording, ticketing system, and common issues                            | Support owner                  |
| Notification policy        | Required transaction events, reminder timing, marketing consent, quiet hours, SMS or email use, and sender identity            | Marketing legal and operations |
| Analytics baseline         | Website and Fresha volumes, conversion, abandonment, appointment changes, package use, support contacts, and current reporting | Client analytics owner         |
| Accessibility needs        | Known customer needs, internal standard, testing budget, and accessibility reviewer                                            | Client product owner           |
| Content governance         | Who creates, reviews, approves, publishes, expires, and audits each content type                                               | Client product owner           |

### P1 technical and delivery inputs

| **Missing input**        | **Needed detail**                                                                                          | **Owner**                          |
|--------------------------|------------------------------------------------------------------------------------------------------------|------------------------------------|
| Technology choice        | Native iOS and Android or cross-platform framework, backend ownership, hosting region, and team capability | Tech lead                          |
| API and data ownership   | System of record for customers, services, appointments, transactions, packages, gift cards, and consent    | Client and tech lead               |
| Environments             | Development, staging, production, seeded test data, credential handling, and release access                | Tech lead                          |
| Device support           | Minimum iOS and Android versions, phones, tablets, and expected low-connectivity conditions                | Product and tech leads             |
| Analytics and monitoring | Approved SDKs, event ownership, crash reporting, alerting, retention, and access                           | Product and tech leads             |
| Security review          | Threat model, penetration test scope, dependency policy, incident contact, and remediation process         | Security owner                     |
| Delivery constraints     | Budget, team roles, availability, target launch window, review cadence, and external vendor lead times     | Client sponsor and project manager |

### P2 legal and store launch inputs

| **Missing input**            | **Required result**                                                                                                  | **Owner**                      |
|------------------------------|----------------------------------------------------------------------------------------------------------------------|--------------------------------|
| Legal entity and territories | Publisher identity, clinic licenses, supported regions, age rating, and regulated-service position                   | Client legal                   |
| Privacy documents            | App-specific privacy policy, processor list, consent text, retention schedule, access and deletion procedure         | Client legal and privacy owner |
| Commercial terms             | Customer terms, booking policy, cancellation, refund, financing, package, gift-card, promotion, and dispute language | Client legal and finance       |
| Developer accounts           | Organization accounts, roles, certificates, signing, tax, banking, and recovery contacts                             | Client account holder          |
| Store content                | Approved app name, descriptions, categories, keywords, screenshots, support URL, privacy URL, and reviewer notes     | Marketing and product          |
| Launch operations            | Support staffing, incident plan, monitoring, rollback, release owner, customer communications, and status updates    | Operations and tech lead       |

### Client discovery workshop agenda

| **Session**               | **Participants**                                      | **Outputs**                                                                                   |
|---------------------------|-------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Catalog and care journey  | Clinical owner, operations, content, product          | Approved service structure, content owners, intake boundary, preparation and aftercare        |
| Booking operations        | Front desk, operations, product, technical lead       | Availability, staff, resource, deposit, cancellation, exception, and support rules            |
| Commerce                  | Finance, operations, product, technical lead          | Payment methods, financing, tax, refund, package, gift-card, settlement, and dispute rules    |
| Data privacy and security | Legal, privacy, clinical owner, technical lead        | Data inventory, purpose, consent, retention, access, deletion, processors, and risk decisions |
| Marketing and support     | Marketing, support, product, content                  | Promotion process, notifications, support channels, service levels, and measurement           |
| Delivery and launch       | Sponsor, project manager, design lead, technical lead | Budget, staffing, dependencies, target window, approval cadence, and store ownership          |

### Minimum artifact request from the client

- Export of all active services, categories, providers, duration, price, and status from the booking system.
- Current booking, cancellation, reschedule, deposit, refund, package, gift-card, promotion, and privacy policies.
- Authenticated customer and staff access or recordings for journeys not covered by the public legacy-app audit.
- Full legacy exports or anonymized field samples for accounts, appointments, orders, packages, gift cards, credit, refunds, memberships, rewards, referrals, consent, and campaign links.
- Payment provider statements or configuration summary showing current processor, supported methods, currencies, settlement, and refunds. Sensitive secrets must not be shared in documents.
- Sample anonymized appointment, package, gift-card, refund, and support scenarios.
- Current physical-product catalogue and operational workflow if ecommerce is being considered.
- Brand kit and licensed media files.
- Current analytics or monthly operational totals without customer-level personal information.
- Names and decision authority of the product, clinical, finance, legal, marketing, support, and technical owners.

## Risks dependencies and decisions

### Risk register

| **Risk**                                                     | **Impact**                                                    | **Mitigation**                                                                          | **Priority** |
|--------------------------------------------------------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------|--------------|
| Booking provider lacks required API access                   | Native booking scope may be blocked or substantially expanded | Complete vendor technical discovery before final transaction design                     | Critical     |
| No canonical catalog                                         | Customers see inconsistent services, prices, and rules        | Appoint catalog owner and approve one structured source                                 | Critical     |
| Financing integration is assumed but not contracted          | Checkout design and launch commitment may fail                | Confirm merchant eligibility, provider, sandbox, limits, and refund behavior            | Critical     |
| Legacy customer value is not fully inventoried               | Appointments, balances, benefits, or refunds may disappear    | Export, reconcile, assign domain dispositions, and require finance and operations sign-off | Critical   |
| Legacy identity matching creates duplicates                  | Customers may lose access or receive another person's records | Verify matching rules, test exceptions, and require assisted recovery                    | Critical     |
| Sensitive intake data is collected without approved controls | Privacy, security, and legal exposure                         | Exclude by default; approve data map, processors, retention, access, and security first | Critical     |
| Referral flow collects a third party's sensitive information | Privacy, consent, anti-spam, and trust exposure                | Remove free-form notes; use consent-led codes or links only after legal approval          | Critical     |
| Package and gift-card ledgers are split                      | Incorrect balances and customer disputes                      | Select one source of truth and reconciliation process                                   | High         |
| Service purchase is separated from appointment booking       | Customers may pay without understanding how to receive care   | Use an explicit entitlement model and direct booking path; remove quantity-based service cart | High     |
| Membership or reward rules conflict across legacy screens    | Incorrect promises, liabilities, and support disputes         | Reconcile tier names, prices, benefits, rewards, expiry, and balances before design       | High         |
| Product commerce launches without operations                 | Oversells, tax errors, failed delivery, returns, and unsafe claims | Keep in backlog until inventory, fulfillment, tax, returns, claims, and ownership are proven | High    |
| Promotions are hardcoded                                     | Every campaign requires a store release                       | Use remotely managed content with scheduling and validation                             | High         |
| App becomes a website wrapper                                | Poor usability and App Store rejection risk                   | Deliver native management, wallet, reminders, support, and device integrations          | High         |
| Client developer accounts are unavailable                    | Store publication and ownership are delayed                   | Start organization enrollment and access setup early                                    | High         |
| Operational exceptions are not designed                      | Staff must repair bookings and payments manually              | Document support workflows, reconciliation, audit logs, and administrative actions      | High         |
| Design starts before rules are known                         | Rework across flows, components, and estimates                | Gate high-fidelity work on P0 decisions                                                 | High         |

### Decision log to complete

| **Decision**                                   | **Required by**                          | **Approver**                      | **Status** |
|------------------------------------------------|------------------------------------------|-----------------------------------|------------|
| Booking architecture                           | Before transaction wireframes            | Client sponsor and tech lead      | Open       |
| Canonical catalog owner and format             | Before information architecture approval | Clinic operations                 | Open       |
| Payment orchestration and merchant accounts    | Before checkout design approval          | Finance and tech lead             | Open       |
| Sensitive-data scope                           | Before intake design                     | Clinical legal and privacy owners | Open       |
| Package and gift-card source of truth          | Before wallet design                     | Operations and finance            | Open       |
| Support channels and service levels            | Before support prototype                 | Operations                        | Open       |
| Launch language and geography                  | Before content production                | Client sponsor                    | Open       |
| Technology stack and minimum operating systems | Before development planning              | Tech lead                         | Open       |
| Target launch window and budget                | Before delivery plan                     | Client sponsor                    | Open       |
| Legacy-domain disposition and decommission plan | Before architecture and migration design | Client sponsor, operations, finance, legal, and tech | Open |
| Existing membership, reward, referral, and credit treatment | Before wallet and account design | Operations, finance, legal, and product | Open |
| Afterpay status                                              | Before financing content or checkout design | Finance and tech lead          | Open       |
| Physical-product commerce scope                              | Before catalogue information architecture | Client sponsor and operations  | Open       |

## Appendices

### Working screen inventory

| **Area**         | **Screens and major states**                                                                                    |
|------------------|-----------------------------------------------------------------------------------------------------------------|
| Entry            | Splash, maintenance, update required, onboarding if approved, permissions education                             |
| Authentication   | Sign in, register, verification, recovery, session expired, consent review                                      |
| Home             | Guest home, signed-in home, upcoming appointment, reminders, promotion modules, empty states                    |
| Services         | Categories, concerns, search, filters, results, service detail, professional detail, unavailable service        |
| Booking          | Entry, service, professional, date, time, intake, review, payment, processing, confirmation, failure, recovery  |
| Appointments     | Upcoming list, history, detail, reschedule, cancel, policy consequence, status, calendar action                 |
| Promotions       | Campaign list, detail, eligibility, code result, expired, upcoming, deep-linked destination                     |
| Wallet           | Overview, package list, package detail, redemption history, gift-card list, claim, balance, transaction receipt |
| Gift purchase    | Value, recipient, message, delivery, review, payment, confirmation, status                                      |
| Package purchase | Catalog, detail, terms, payment, confirmation, balance                                                          |
| Legacy transition | Account match, migrated-value review, mismatch, assisted recovery, maintenance notice, and cutover communication |
| Support          | Hub, FAQ, article, contact options, form, reference context, success, unavailable channel                       |
| Notifications    | Permission education, inbox if included, message detail, preferences                                            |
| Account          | Profile, communication preferences, consents, privacy, data request, deletion, legal, sign out                  |
| Conditional products | Product list, detail, variant, cart, pickup or shipping, checkout, order, return, and support                 |
| Conditional loyalty | Reward status, history, redemption, check-in, referral sharing, and exception states                         |
| Existing membership | Read-only status, benefits, renewal or billing explanation, support, and migration notice                     |

### Legacy app audit evidence index

The following guest-facing states were captured on 24 September 2026. They document the audit basis but do not prove authenticated or operational behavior.

| **Step** | **State reviewed** | **General health** | **Main requirement impact** |
|----------|--------------------|--------------------|-----------------------------|
| 01 | Home | Major redesign | Excessive repeated merchandising, clipped content, and weak task priority |
| 02 | Store and service results | Redesign | Useful catalogue base; flat taxonomy, limited filters, duplicates, and content errors |
| 03 | Service detail | Critical redesign | Desktop modal, sparse clinical information, and quantity-based treatment purchase |
| 04 | Appointment tracker | Redesign | Capability exists; guest empty state and booking route are incomplete |
| 05 | Rewards | Hold in backlog | Confirms visit and spend rewards but rules, ledger, and migration are unverified |
| 06 | Referrals | Remove unsafe pattern | Conflicting reward values and third-party contact or sensitive-note collection |
| 07 | Wallet | Keep and redesign | Useful credit, gift balance, and history concept; ledger and terminology need approval |
| 08 | Products | Hold or phase | Physical commerce exists but inventory, fulfillment, returns, tax, and claims are unknown |
| 09 | Packages | Keep and redesign | Multi-session value is important; validity, entitlement, and redemption require a source of truth |
| 10 | Memberships | Backlog with continuity | Active-looking tiers conflict with other names and benefits; existing members require a plan |
| 11 | Gift cards | Keep and redesign | Strong base journey; delivery, claim, fraud, accessibility, and exception states need work |
| 12 | Registration | Critical redesign | Preselected bundled consent and placeholder legal links cannot ship |
| 13 | Cart | Selective use | Suitable for retail value; generic quantity cart is unsuitable for appointment services |
| 14 | Campaign detail | Keep and redesign | Deep link and countdown are useful; destination, expiry, terms, and navigation must be consistent |
| 15 | Empty search | Redesign | State exists but lacks reset, suggestions, alternatives, or consultation fallback |

### Working service inventory requiring confirmation

The public website, booking surface, and legacy app show different inventories. The list below is a discovery aid, not an approved catalog. Clinic operations must confirm active services, canonical naming, categories, prices, and visibility before design approval.

| **Source group**                | **Observed services or variants**                                                                                                                                                                                                                      |
|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Website injectables and medical | Botox, Jalupro, Mesotherapy, PRP Hair Treatment, Platelet Rich Plasma, Sculptra                                                                                                                                                                        |
| Website skin device and beauty  | Quanta System Chrome, Microblading, Laser Hair Removal, Biomicroneedling SQT, HIFU, OxyGeneo, Cryotherapy, Secret RF Microneedling, Teeth Whitening, Dermaplaning, Microdermabrasion, Facial Treatments, Lash and Brow Lift or Tint, Eyebrow Threading |
| Additional booking entries      | PMU, Chrome Nail Fungus, Photo Frax, acne scar resurfacing, Nd YAG, plasma Frax, tattoo removal, PRF, filler, fat dissolving, Liposonix, skin brightening, intimate brightening, microneedling, and spelling or capitalization variants                |
| Legacy app catalogue            | Broad overlapping treatment list plus products, packages, memberships, and a cancellation policy misclassified as a paid service; export and clinical review are required before migration                                                     |

### Source references

| **Reference**                | **Link**                                                                                                            | **Use in this document**                                                                                               |
|------------------------------|---------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| Nano Beauty Star legacy app  | [Open source](https://app.nanobeautystar.com/home)                                                          | Guest-facing product areas, interaction patterns, legacy capabilities, inconsistencies, and migration questions        |
| Apple App Review Guidelines  | [Open source](https://developer.apple.com/app-store/review/guidelines/)                                      | App completeness, external payments for physical services, minimum functionality, privacy, deletion, and review access |
| Apple App Privacy            | [Open source](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/) | App and third-party data disclosures and privacy-policy URL                                                            |
| Google Play Payments Policy  | [Open source](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)                 | Physical services, refunds, and gift-card billing treatment                                                            |
| Google Play Account Deletion | [Open source](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)                 | In-app and web deletion paths                                                                                          |
| Google Play Data Safety      | [Open source](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)                 | Data collection and third-party SDK declarations                                                                       |
| British Columbia PIPA        | [Open source](https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01)                      | Private-sector personal-information obligations and reasonable safeguards                                              |
| WCAG 2.2                     | [Open source](https://www.w3.org/TR/WCAG22/)                                                                 | Accessibility principles and testable success criteria                                                                 |

### Final recommendation

Approve this v1.1 document as the working baseline and immediately run a legacy-data and customer-value workshop. Competitor benchmarking and design-language exploration can continue in parallel. Transactional wireframes for booking, checkout, wallet, account recovery, and migration should remain provisional until the client confirms the systems of record, existing liabilities, approved payment methods, and business rules.

The recommended product direction is a focused native app, not a visual refresh of the legacy catalogue. Preserve approved services, booking, appointments, packages, gift cards, wallet value, campaigns, and support; defer new loyalty, referral, membership, check-in, and product-commerce flows until their rules and operations are approved; remove the unsafe, misleading, duplicated, or nonfunctional patterns identified in the audit.

This document defines product and delivery requirements; it does not replace legal, clinical, privacy, security, payment-provider, or app-store review advice. Those owners must approve the final implementation and public policies.
<!-- SOURCE_V1_1_END -->


---

## Appendix B — Copy-ready English prompt for Claude Design

# Nano Beauty — copy-ready English instruction for Claude Design

**Send this file together with** `Nano_Beauty_Claude_Design_System_Final_Handoff.md` and `visual-references/FINAL_Selected_Warm_Editorial_Home.png`. The final handoff includes the owner's complete v1.1 requirements verbatim in Appendix A. This prompt initiates the waterfall engagement; it does not replace that source document.

---

## Paste the following into Claude Design

You are the lead product designer for **Nano Beauty**, a clinic-owned iOS and Android app. Execute the attached `Nano_Beauty_Claude_Design_System_Final_Handoff.md` as a **single end-to-end waterfall design-system and product-design project**. Appendix A reproduces the owner's v1.1 requirements in full; use its IDs to trace every v1 feature, state and exception. The direct owner decisions in §§2 and 8 of the main handoff supersede older examples or conflicts in Appendix A and the development starter. Design the customer experience **and the role-gated clinic/admin workspace inside the same mobile app**, including an editable source, the complete design system, all approved screens and states, interactive prototypes, motion specifications and an engineering-ready handoff. The public website remains unchanged. Do not treat a Figma export as mandatory; the agreed editable design source is your Claude Design output, supported by portable tokens, assets and specifications.

### Approved visual direction — use the attached reference as the controlling source

The owner selected the earlier image **“2 — Warm & Editorial”**, included as `visual-references/FINAL_Selected_Warm_Editorial_Home.png`. It outranks later iOS Liquid Glass, Android tonal, and selective/expansive blur explorations. Translate its warm porcelain ground, human and naturally lit treatment photography, expressive short editorial serif headlines, crisp functional sans-serif copy, deep ink/plum typography, recognizable Nano-violet primary action, restrained lavender accents, whitespace, subtle dividers and calm rounded shapes into a coherent modern product system. Keep the action hierarchy clear and the layout practical for real services, appointments and account value. The image is **a style reference**, not a fixed route map or production asset: its five tab labels, generated logo, model photos, marketing claims and treatment categories are not authoritative. Source the real logo and licensed images from the owner, obtain clinic approval for clinical copy, and design a related square app icon for separate sign-off.

Use **one** semantic/component system for both platforms. Provide system-following light and dark themes, the same Nano brand-violet identity on Android regardless of wallpaper, portrait mobile layouts and English-only launch copy. Preserve native iOS/Android Back, gestures, safe areas, keyboard handling, screen readers and scalable text. Use protected solid or tonal surfaces as the default, particularly for booking, financial and clinical information. Native iOS Liquid Glass and live background blur are **not requirements**; only propose a subtle optional blur on a specific overlay if it improves comprehension and has an equivalent opaque version. Do not reopen the owner's selection by presenting competing visual directions.

### Product and flow coverage

Derive the final navigation, labels, service taxonomy and staff IA from first-principles product work and approved customer tasks. Present at least two customer IA candidates and recommend one after task-based assessment. Do **not** copy the old app's Store/Rewards/Book Now grouping or assume the five illustrated tabs are approved. Guest, signed-in customer with next appointment, signed-in customer without appointment and authorized staff must all be designed.

Cover all **Keep** requirements in Appendix A end to end: approved service discovery/search/details and consultation constraints; booking initiation and appointment tracking/change/cancel/return/error; offers and terms; approved deposits, checkout and provider return; wallet, ledger-backed clinic credit, packages and gift cards; existing member and earned-reward **status**; identity match/recovery for existing customers; notification and preparation/aftercare where approved; contextual support and account/privacy flows. Include loading, empty, offline, declined, expired, insufficient permission, data mismatch, provider timeout, interruption and recovery states. New membership enrollment/recurring billing, new rewards earning, referrals, check-in, physical-product commerce and Favorites/Recent remain out of v1 unless the owner explicitly changes scope. Do not erase existing customer value when an acquisition flow is deferred.

Design the **in-app, role-gated mobile admin** workspace for manual service/provider/pricing entry and edits; campaign creation/scheduling/terms; package/gift settings where approved; review, approve/reject with reason, publish/unpublish, audit trail, permission failures, concurrent edits and support for balance exceptions. Apply least privilege and server-enforced authorization in the handoff contract. Staff approval is for permitted content/workflows, not an instruction to collect or expose clinical patient data. Map the owner's `ADMIN 01–10` requirements to staff screens and states.

The verified public visit address is **555 6th St #130, New Westminster, BC V3L 5H1**. The marketing website's booking link goes to Fresha; the current guest app's “Book Appointment” first opens an internal service-choice page. The owner reports that app booking works with Fresha, but the actual API/handoff and return-state mechanism are **unverified**. Debit, Klarna and Affirm are business requirements, not proof of enabled merchant integrations. Approved catalog data exists and must be supplied to the staff input workflow; existing appointment/value data may or may not be exportable from the legacy database. Mark those dependent flows conditional until the relevant source owner provides evidence; design migration, account matching, reconciliation and supported fallback for existing credits, packages, gifts, rewards and membership benefits. Never invent provider APIs, balances, treatment promises, eligibility, prices or cancellation rules.

### Design-system and motion deliverables

Produce primitive, semantic and component tokens with light/dark mappings, typography and responsive scaling, spacing, radii, surface/elevation, fixed brand color roles, contrast, icons, imagery/crop guidance, accessibility, state anatomy and iOS/Android behavior. Specify every necessary customer and staff component variant and relevant behavior, including navigation, forms, validation, sheets, booking stages, financial disclosure, wallet states, promotion terms, approval queues, publication and error recovery. Supply exportable machine-readable values and usage guidance for a React Native/TypeScript implementation; if Claude Design cannot export a particular artifact, document the portable equivalent and exception.

Motion is part of the system: define semantic duration/easing tokens; simple enter/exit, tab and sheet transition, field feedback, booking/slot selection, async pending/success/failure, wallet reconciliation, campaign expiration and staff approval/publishing examples; trigger, end state, interruption, reverse behavior, haptics and platform notes. Supply normal and Reduce Motion versions in light/dark themes. Motion must communicate a **confirmed** system state, never simulate a reserved slot, paid purchase, wallet value or successful clinical outcome before the authoritative response. Avoid flashy effects and unnecessary motion. Prototype a representative set of these behaviors and record developer-ready acceptance criteria.

### Waterfall method and first response

Follow Phases 0–8 and their exit criteria in §7 of the attached handoff. Keep a versioned decision/conflict register, requirement-ID → route/screen/state/component traceability matrix, owner for each piece of content or provider rule, recorded gate approvals and any scoped exceptions. Continue independent work while one provider dependency is unresolved; do not present a conditional transactional flow as signed-off. At Phase 0, inventory what has and has not been verified, inspect the attached warm editorial image, request the actual owner logo/font/photo assets and catalog/operational exports through the appropriate owner, list only **blocking** questions to the correct person, and return: (1) decision/source register; (2) end-to-end screen/state coverage plan; (3) dependency and risk register; (4) two IA candidates with evaluation criteria; and (5) the planned Phase 1 light/dark iOS/Android and staff/returning reference frames. Then advance through each gated phase after its named owner approves. The user is the product decision owner; clinical, finance, operations and engineering approve facts in their domains. Do not ask the product owner to choose an SDK or OS version as a design prerequisite.

### Existing technical package conflict to reconcile before coding

The earlier development starter contains protected v1.0 requirements, NANO-02 route assumptions and a separate React/Vite `apps/admin` plan. Those conflict with this newer owner-approved v1.1 scope, newly selected visual direction, open navigation work and mandatory admin **inside the mobile app**. Version the starter, traceability and NANO-02 / NANO-15 / NANO-16 prompts before implementing affected routes or staff tools; preserve API-side permissions and document any supplementary web portal only if separately approved. The design handoff may proceed before that coding package is updated, but its assumptions must not silently override this brief.

Begin with your Phase 0 outputs. Reference exact Appendix A IDs for each decision and label every unknown as confirmed, proposed or blocked with its owner and required evidence.

