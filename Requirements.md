# Nano Beauty Star Mobile App Requirements

Product requirements design process and discovery checklist

| **Document field** | **Value**                                    |
|--------------------|----------------------------------------------|
| Prepared for       | Nano Beauty Star design and development team |
| Document purpose   | App only redesign and native store release   |
| Status             | Design-complete baseline (design v1.2); four decisions pending client confirmation |
| Version            | 1.2                                          |
| Date               | 25 September 2026                            |

The website remains outside this project. Version 1.2 updates this document with the results of the full gap analysis and the finished design (design v1.2, 25 September 2026): decisions made, requirements added or changed, and what is still open. Requirement IDs from v1.1 are kept for traceability; changed rows say what changed. This document defines the v1 mobile app, the work needed to design and deliver it, and the decisions the client must provide before architecture, wireframes, integration design, and store submission can be finalized.

## Contents

0. What changed in v1.2 and decision status
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

## What changed in v1.2

Version 1.1 was written before design started. Since then the full app has been designed (158 design boards, 62 components, 108 routes), a gap analysis was run against the website, Fresha, the legacy app and the client meeting notes, and a developer handover pack was produced. The main changes to the requirements are below; each section marks updated rows with **(v1.2)**.

| **Area** | **v1.1** | **v1.2** |
|----------|----------|----------|
| Booking | Native booking if an API supports it; decide after discovery | Fresha has no public booking API (only a read-only data connector). Launch default is a **controlled hand-off to Fresha** inside the app; in-app booking is designed and switched on only if a booking system with an API is adopted (D33) |
| Navigation | Five tabs: Home, Explore, Book, Wallet, Account | Four tabs: Home, Treatments, Visits, Wallet, plus a Book button and a profile button (D28) |
| Administration | Remote admin or CMS; separate content, support, finance, operations and admin roles | Staff workspace **inside the same app** (phone, with a two-column tablet layout for long forms); no separate web admin (D11, D39). Three roles in the design; owner direction is one role (D34, pending) |
| Approval | Second approver for high-risk changes | Approval is a setting, off by default; owner publishes after a confirm step (D35; owner direction is no approval step, pending) |
| Business rules | Deposit, holds, cancellation and gift values unknown | Rules are **settings** staff can edit (D37); sample values stay badged until the clinic confirms them |
| Deleting content | Not specified | Archive, don't delete: only drafts can be deleted; everything a customer booked, bought or saw is archived and restorable (D36) |
| Payments | Debit card, Klarna, Affirm | Adds Apple Pay and Google Pay (the in-app route for Interac debit in Canada); each method is switched on or off in settings |
| Booking scope | One service per booking | Several treatments or laser areas in one visit (basket and area picker) |
| Gift cards | Terms and expiry | No expiry (BC rules); occasion designs; recipients without the app claim on a web page |
| Membership | Existing members see read-only status | Hidden by default, shown only to old-app members (D38); owner direction is hidden for everyone (pending) |
| Legacy app | Vendor unknown | Identified as a Lead360 white-label product; data export depends on Lead360 |
| Consultation price | Assumed free | $20, credited to the treatment (Fresha); a setting |
| Staff operations | Services, promotions, packages, gift cards, support content | Adds appointment requests, counter redemption, customers and account match, support inbox, promo codes, professionals, clinic info and rules, policies, Home layout, push messages, media, reports, team, catalogue import |
| Notifications and analytics | Required, not specified | 12 notification templates and an analytics event map are specified |

### Decision status (25 September 2026)

| **ID** | **Decision** | **Status** |
|--------|--------------|------------|
| D33 | Booking happens in Fresha; the app hands off and the clinic accepts and manages bookings there | Owner direction; **pending client confirmation**. Build hand-off first; in-app booking stays behind the `bookingMode` setting |
| D34 | One staff role with full access (design shows three: Owner, Editor, Front desk) | Owner direction; **pending client confirmation**. Build roles as a server-side permission map |
| D35 | No approval step; staff publish after a confirm step | Owner direction; **pending client confirmation**. Second approver is a setting, off by default |
| D36 | Archive, don't delete | Confirmed |
| D37 | Rules become staff-editable settings | Confirmed |
| D38 | Membership not shown anywhere, including for old-app members | Owner direction; **pending client confirmation**. Build behind a flag, hidden by default |
| D39 | Staff screens phone-first with a tablet layout; no web admin | Confirmed |
| D40 | Services typed in by hand or imported from a Fresha export (import optional) | Confirmed |

The full decision register (D01–D40) is in the design project's Phase 0 register and in the developer handover pack (`docs/decisions-and-flags.md`).

## Executive summary

Nano Beauty Star should launch a new customer mobile application for iOS and Android rather than package the legacy web experience as a store wrapper. The legacy app is now publicly accessible and was audited on 24 September 2026. It confirms a broader operating scope than the previous requirements assumed: service and product commerce, packages, gift cards, credit, rewards, referrals, memberships, appointment tracking, campaigns, registration, cart, and financing messages are all present. These capabilities are evidence of existing business behavior, not automatic requirements to reproduce the current interface or implementation.

The new app must preserve the clinic's approved services and protect existing customer appointments, package sessions, gift-card balances, credits, memberships, rewards, and other paid entitlements. New membership enrollment, rewards, referrals, check-in, and physical-product commerce remain outside the proposed v1 unless the client promotes them after discovery. This distinction prevents scope expansion without losing customer value during migration.

**(v1.2)** The booking question is now answered in principle: Fresha offers no public booking API, so the launch path is a controlled hand-off to Fresha (D33, pending client confirmation), and the design supports in-app booking if that changes. The remaining architecture decisions are commerce (payment provider) and legacy data (the old app is a Lead360 white-label product). The original v1.1 text follows.

The immediate product decision is the booking, commerce, and legacy-data architecture. The current public journey relies on Fresha while the legacy app exposes a separate catalogue, cart, wallet, and loyalty experience. Before detailed design begins, the client must confirm which systems own availability, customer identity, payment, package and gift-card ledgers, credit, memberships, and rewards. The answer affects migration, booking, refunds, notifications, support, and the estimated delivery effort.

The app must create genuine mobile utility. Appointment reminders, calendar actions, package and gift card balances, native booking management, saved preferences, deep-linked promotions, and accessible support will give the product more value than a repackaged website. This also reduces rejection risk under Apple's minimum-functionality rule.

### Recommended v1 decision

| **Area**     | **v1 direction**                                                 | **Reason**                                                        |
|--------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| Platforms    | iOS and Android customer apps                                    | Required store distribution                                       |
| Website      | No redesign or implementation changes                            | Explicit project boundary                                         |
| Architecture | Cross-platform native app with API driven content                | Consistent behavior with one maintainable codebase                |
| Booking      | **(v1.2)** Controlled hand-off to Fresha by default; native in-app flow only if a booking API is adopted (D33) | Fresha publishes no booking API; hand-off avoids duplicate records |
| Commerce     | External processor for services consumed outside the app         | Compatible with current store payment rules for physical services |
| Content      | **(v1.2)** Staff workspace inside the app, backed by the app's own server | Promotions change at least twice each month; no separate web admin (D11, D39) |
| Continuity   | Audit and protect every existing balance and entitlement         | Deferred features may still have active customers                 |
| Membership   | **(v1.2)** No new enrollment; hidden by default (D38, pending)  | Client asked for no membership in the app now                     |
| Payments     | **(v1.2)** Card, Apple Pay, Google Pay, Klarna, Affirm, each switchable in settings | Interac debit works in apps only through the wallets |
| Rules        | **(v1.2)** Deposit, change window, hold, gift values and similar rules are staff-editable settings | Real rules are not yet confirmed by the clinic (D37) |

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
- **(v1.2)** The app is distributed only through the App Store and Google Play; there is no web app. Two small mobile-web pages are still needed outside the app (gift claim for recipients without the app, and the Google Play account-deletion request); their host is not decided.
- **(v1.2)** The clinic books through Fresha and accepts and manages bookings there (client statement; recorded as D33, pending formal confirmation).
- **(v1.2)** Staff tools live inside the app; there is no separate web admin (D11, D39).
- **(v1.2)** English only, portrait, one clinic at 555 6th St #130, New Westminster, BC (D12).
- **(v1.2)** App name Nano Beauty; the full "nano BEAUTY" lockup is the logo and the master square is the app icon (D02, D22, D30). Fonts Fraunces and Sora (D24). Website photos approved for design use (D23); rights and team consent still to be confirmed.
- **(v1.2)** Support stays as designed; links to social media and the website are a later improvement.

### Evidence limitations

The public guest experience at [app.nanobeautystar.com](https://app.nanobeautystar.com/home) was reviewed on 24 September 2026 at desktop and phone-shell widths. The audit covered Home, Store, service detail, appointment tracker, Rewards, Referrals, Wallet, Products, Packages, Memberships, Gift Cards, registration, Cart, a campaign detail, and search empty state. **(v1.2)** On 25 September 2026 the website, the Fresha listing and the legacy app were reviewed again for the gap analysis. The legacy app was identified as a Lead360 white-label product. The website's privacy-policy and terms pages exist but are empty. Fresha shows the consultation at $20 credited to the treatment, public prices for several services, a 4.9 rating from 357 reviews, and about 11 services missing from the website list.

No credentials, personal data, payment, gift-card delivery, redemption, appointment change, financing approval, or administration action was used. Authenticated data, completed transactions, staff tools, API behavior, and the underlying data model remain unverified.

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
| Membership enrollment and billing | Backlog with continuity | Do not add new enrollment in v1. **(v1.2)** Status hidden by default and shown only to old-app members (D38); owner direction is hidden for everyone and benefits handled at the desk (pending) |
| Physical-product ecommerce | Backlog or conditional release | Include only after inventory, pickup or shipping, tax, returns, fulfillment, claims, and product-content ownership are approved |
| Check-in for rewards | Backlog | Add only after identity, location or QR method, abuse prevention, staff workflow, and reward rules are approved |
| Favorites and recent views | Backlog | Add after core discovery and booking validate; show only genuine signed-in history and allow clearing it. **(v1.2)** Out of v1 (D01) |
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
| **(v1.2)** Legacy platform (Lead360 white-label) | Replace | Plan the data export with whoever administers Lead360; the old app keeps running at app.nanobeautystar.com until cutover |

### Legacy continuity rule

Removal from the new interface does not authorize deletion of legacy records. Before launch, each legacy domain must have one disposition: migrate into the new system, integrate with its existing source, provide a time-limited read-only or support path, settle customer value before cutover, or retain records under an approved legal schedule. No active appointment, paid package session, gift-card balance, credit, membership benefit, refund, or earned reward may silently disappear.

### In scope

| **Capability** | **Included outcome**                                                                                        |
|----------------|-------------------------------------------------------------------------------------------------------------|
| Discovery      | Browse and search active services by category and customer concern                                          |
| Booking        | **(v1.2)** Choose one or more treatments (and laser areas), then hand off to Fresha (default) or, if in-app booking is enabled, choose professional, time, details, payment and confirmation |
| Appointments   | **(v1.2)** View synced visits (if Fresha data can be read), change in Fresha or request a late change from the clinic; in-app reschedule and cancel only in in-app mode |
| Payments       | **(v1.2)** Card, Apple Pay, Google Pay, Klarna and Affirm when approved and switched on, with eligibility, failure, refund and receipt states. In hand-off mode, deposits are paid in Fresha |
| Promotions     | Scheduled campaigns and events managed remotely with terms and deep links                                   |
| Gift cards     | Purchase, delivery, balance, redemption, and history where the commerce platform supports them              |
| Packages       | Purchase, validity, included sessions, redemption, and remaining balance                                    |
| Support        | FAQ, contact options, appointment-specific assistance, and escalation                                       |
| Account        | Profile, preferences, consents, privacy controls, account deletion, and transaction history                 |
| Operations     | **(v1.2)** Staff workspace in the app: services, categories, campaigns, packages, gift cards, promo codes, professionals, requests, counter redemption, customers, inbox, settings, policies, media, reports, team, audit and import |
| Legacy continuity | Inventory, migrate, integrate, settle, or support existing customer records, balances, and entitlements  |
| Web pages      | **(v1.2)** Gift claim for recipients without the app and the account-deletion request page (host to be decided) |

### Out of scope for v1

- New membership enrollment, recurring billing, tier management, or member acquisition. Existing-member continuity is not out of scope.
- Website redesign, website development, SEO changes, or marketing-site migration.
- A separate provider or employee app, or a separate web admin. **(v1.2)** Staff tools are a role-gated workspace inside the customer app.
- A clinical record system, diagnosis tool, treatment recommendation engine, or medical decision support.
- New rewards, referrals, loyalty earning, or check-in unless the client explicitly promotes them after discovery. Existing balances and obligations still require a disposition.
- Physical-product ecommerce unless inventory, fulfillment, tax, returns, product claims, and ownership are approved. Service discovery is unaffected.
- Marketplace functionality for third-party clinics or service providers.
- A general social community, public reviews platform, or user-generated content feed.
- **(v1.2)** Group booking (booking with a friend) unless the client confirms it is needed.
- **(v1.2)** Live chat, before/after galleries, and social-media feeds. A plain "Follow us" row of links may be added in a later design round.

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
| Content administrator        | Keep offers and catalog content current        | Schedule promotions, update terms, publish service content. **(v1.2)** Owner or Editor role in the staff workspace |
| Operations and support staff | Resolve customer issues with reliable records  | Find booking, verify payment, manage exception, document response. **(v1.2)** Front desk role: requests, counter redemption, customers, inbox |

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

**(v1.2)** The five-tab proposal below was replaced by navigation Option B (D28), chosen in the navigation phase because it keeps visits one tap away and treats Book as an action, not a place:

| **Tab or control** | **Purpose** |
|--------------------|-------------|
| Home | Next visit, one primary action, relevant balance, at most two offers |
| Treatments | Categories, concerns, search, treatment detail |
| Visits | Upcoming and past visits, changes, rebook |
| Wallet | Credit, packages, gift cards, receipts |
| Book button | Starts booking from wherever the customer is, pre-filled with context |
| Profile button (top of Home) | Account, support, privacy, notifications, legal, and the staff workspace for staff |

Option B is to be confirmed in usability testing (postponed, D31). The v1.1 proposal is kept below for reference.

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
| First booking          | Browse or search service \> details \> professional \> date and time \> intake \> payment \> confirmation. **(v1.2)** In-app mode only |
| **(v1.2)** Hand-off booking | Treatment(s) or areas \> how booking works (first time) \> continue in Fresha (in-app browser) \> back in the app \> checking \> confirmed, not showing yet, or couldn't confirm (call the clinic) |
| **(v1.2)** Late change | Visit detail \> inside the free-change window: request to the clinic \> staff queue \> customer told the outcome |
| **(v1.2)** Counter redemption | Front desk finds the client \> picks a package session or gift amount \> confirm \> ledger updates \> receipt |
| **(v1.2)** Gift recipient without the app | Text or email \> web claim page \> verify phone or keep the code \> claimed |
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
| AUTH 02 | Must         | Account creation        | **(v1.2)** Customer registers with a verified mobile number (6-digit SMS code); new or returning customers use the same flow |
| AUTH 03 | Must         | Sign in and recovery    | **(v1.2)** Code-based sign in (no password), sign out, resend timer, wrong or expired code, rate limit, and session expiry are supported |
| AUTH 04 | Must         | Profile                 | Customer can maintain name, contact details, birthday only if justified, and communication preferences |
| AUTH 05 | Must         | Secure session          | Tokens are stored securely, revoked on sign out, and protected from replay                             |
| AUTH 06 | Must         | Account deletion        | In-app deletion route exists; Android also has a functioning web request route. **(v1.2)** Designed (ACC-08–10, WEB-03/04); the web page is postponed by the owner but must exist before the Google Play release |
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
| DISC 08 | Backlog      | Favorites and recent services | **(v1.2)** Out of v1 (D01)                                                                                                                 |
| DISC 09 | Must         | Catalog governance            | Policies, fees, memberships, products, packages, and appointment services use distinct content types and cannot be misclassified          |
| DISC 10 | Must         | Empty and no-result states    | Search offers clear reset, spelling or alias help, category or concern alternatives, and consultation or support when no result is found   |
| DISC 11 | Must         | Home prioritization           | Home avoids duplicate carousels and gives visual priority to the next appointment, booking, relevant value, and a limited campaign set     |
| DISC 12 | Should       | Treatment FAQ **(v1.2)**      | Treatment detail shows a short, staff-editable FAQ; clinical claims carry an approval badge until the clinic signs them off |
| DISC 13 | Could        | Rating line **(v1.2)**        | An optional rating line (source Fresha) on Home and treatment detail, off by default until the client decides |
| DISC 14 | Should       | Financing line **(v1.2)**     | "Financing available" on eligible treatments, driven by settings (on/off and minimum amount), never implying approval |

### Booking and appointment requirements

| **ID**  | **Priority** | **Requirement**        | **Acceptance summary**                                                                                          |
|---------|--------------|------------------------|-----------------------------------------------------------------------------------------------------------------|
| BOOK 01 | Must         | Service selection      | Booking starts from a service, promotion, package entitlement, or Book button. **(v1.2)** Several treatments can be chosen for one visit |
| BOOK 02 | Must         | Professional selection | Customer can choose any eligible professional or next available when supported **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 03 | Must         | Availability           | Slots reflect the approved source of truth and cannot be double-booked **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 04 | Must         | Slot protection        | A selected slot is held for a defined period or revalidated before payment **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 05 | Must         | Intake                 | Only required questions and consents are collected; sensitive answers follow approved storage rules **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 06 | Must         | Review                 | Customer reviews service, professional, time, location, price, deposit, policy, and payment before confirmation **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 07 | Must         | Confirmation           | Successful booking creates one appointment record and sends a receipt or confirmation **(v1.2: in-app mode; in hand-off mode Fresha handles this)** |
| BOOK 08 | Must         | Upcoming and history   | Customer can view current, completed, cancelled, and no-show appointments as approved                           |
| BOOK 09 | Must         | Reschedule             | Eligibility, fee, cutoff, and available replacement slots follow clinic rules. **(v1.2)** In-app mode: in the app. Hand-off mode: change in Fresha; inside the free-change window, request it from the clinic |
| BOOK 10 | Must         | Cancellation           | The app shows consequences before confirmation and records refund or credit status. **(v1.2)** Same split by booking mode as BOOK 09 |
| BOOK 11 | Must         | Calendar action        | Confirmed appointments can be added to the device calendar without requiring full calendar access               |
| BOOK 12 | Should       | Rebook                 | Completed appointments can be repeated with the same service or an approved alternative                         |
| BOOK 13 | Must         | Service transaction model | An appointment service is never sold through a generic quantity selector; purchase, entitlement, and booking states are explicit        |
| BOOK 14 | Must         | Purchase-to-book continuity | If a customer can prepay for a service, confirmation explains the entitlement and provides the exact next booking action                |
| BOOK 15 | Must | Booking mode **(v1.2)** | One server setting chooses hand-off (default) or in-app booking; in-app-only routes are unreachable in hand-off mode (D33) |
| BOOK 16 | Must | Hand-off truthfulness **(v1.2)** | A hand-off booking shows as confirmed only after Fresha reports it; returning from Fresha alone never shows success |
| BOOK 17 | Must | Visit basket and areas **(v1.2)** | Several treatments or laser areas in one visit, with running total and a warning when the visit is too long |
| BOOK 18 | Must | Change requests **(v1.2)** | Late changes, cancel requests and "awaiting clinic" visits land in a staff queue; staff approve, decline with a reason, or call, and the customer is told |
| BOOK 19 | Should | Visit sync **(v1.2)** | If Fresha data can be read, Home and Visits show synced visits; otherwise they explain that bookings live in Fresha and offer Open Fresha |

### Payment requirements

| **ID** | **Priority** | **Requirement**          | **Acceptance summary**                                                                               |
|--------|--------------|--------------------------|------------------------------------------------------------------------------------------------------|
| PAY 01 | Must         | Debit card               | Card payment uses a PCI-compliant tokenized provider; the app does not store raw card data. **(v1.2)** Interac debit is offered through Apple Pay and Google Pay (PAY 13) |
| PAY 02 | Must         | Klarna                   | Eligible customers and transactions can select Klarna through an approved merchant integration       |
| PAY 03 | Must         | Affirm                   | Eligible customers and transactions can select Affirm through an approved merchant integration       |
| PAY 04 | Must         | Eligibility messaging    | Unavailable financing shows a clear reason or neutral alternative without promising approval         |
| PAY 05 | Must         | Deposit and full payment | Checkout supports the client-approved model by service, package, gift card, and promotion. **(v1.2)** Deposit rule is a setting; in hand-off mode deposits are paid in Fresha and the app takes payment for packages and gift cards |
| PAY 06 | Must         | Idempotency              | Retries and webhook duplication cannot create duplicate charges or bookings                          |
| PAY 07 | Must         | Failure recovery         | Declines, abandonment, timeouts, expired sessions, and provider outages preserve a recoverable state |
| PAY 08 | Must         | Receipts                 | Customer receives an itemized record showing taxes, discounts, payment method, status, and reference |
| PAY 09 | Must         | Refunds                  | Full, partial, financing-related, and failed refunds display a traceable status                      |
| PAY 10 | Should       | Saved payment method     | Use provider tokens only and require explicit customer consent                                       |
| PAY 11 | Backlog      | Afterpay                 | Add only after the client confirms an active merchant agreement, supported transaction types, refunds, and mobile integration |
| PAY 12 | Must         | Method truthfulness      | Public financing messages are generated from approved configuration and never imply eligibility or approval before provider response |
| PAY 13 | Must | Apple Pay and Google Pay **(v1.2)** | Wallet payment buttons follow each brand's rules and appear first when switched on in settings |
| PAY 14 | Must | Methods from settings **(v1.2)** | Card, Apple Pay, Google Pay, Klarna and Affirm are each switched on or off by staff; only switched-on methods appear |

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
| PROMO 10 | Should | Event templates **(v1.2)** | Staff start a campaign from a template (Halloween, Canada Day, Black Friday, holidays, own offer) or duplicate last year's |
| PROMO 11 | Must | Home placement **(v1.2)** | Staff choose which offers appear on Home (at most two) and their order |

### Gift card package and wallet requirements

| **ID**  | **Priority** | **Requirement**      | **Acceptance summary**                                                                             |
|---------|--------------|----------------------|----------------------------------------------------------------------------------------------------|
| WALT 01 | Must         | Gift-card catalog    | Preset and approved custom values show terms and eligible redemption. **(v1.2)** No expiry (BC gift-card rules); amounts are a setting |
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
| WALT 13 | Must | Gift designs **(v1.2)** | Purchaser chooses an occasion design before value, recipient and review |
| WALT 14 | Must | Web claim **(v1.2)** | A recipient without the app can view and claim the gift on a web page, or keep the code for the clinic |
| WALT 15 | Must | Counter redemption **(v1.2)** | Front desk can use a package session or gift-card amount at checkout; the ledger updates only after confirm and the customer gets a receipt |

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
| MEM 02 | Must | Existing-member continuity | Active members can verify status and obtain benefits or support during migration even if new enrollment is unavailable. **(v1.2)** In the app: shown only to old-app members, behind a setting that is off by default (D38); owner direction is to handle benefits at the desk and never show membership (pending) |
| MEM 03 | Must | Tier reconciliation | Conflicting legacy tier names, prices, discounts, banked value, and benefits are reconciled before any member-facing design is approved |

### Support and notification requirements

| **ID**   | **Priority** | **Requirement**             | **Acceptance summary**                                                                       |
|----------|--------------|-----------------------------|----------------------------------------------------------------------------------------------|
| SUP 01   | Must         | Support hub                 | FAQ, clinic contact details, hours, location, and urgent-care disclaimer are accessible      |
| SUP 02   | Must         | Contextual support          | Appointment, payment, package, and gift-card screens link to relevant help                   |
| SUP 03   | Must         | Contact channels            | Approved phone, email, form, chat, or messaging channels show expected response behavior     |
| SUP 04   | Must         | Reference context           | Customer can share an appointment or transaction reference without exposing unnecessary data |
| SUP 05   | Must         | Ask us **(v1.2)**           | "Not sure which treatment?" form goes to the staff inbox and returns a reference and reply time |
| SUP 06   | Must         | Directions and parking **(v1.2)** | Help hub opens maps and shows parking; clinic phone and hours come from staff settings   |
| SUP 07   | Backlog      | Social links **(v1.2)**     | Plain links to website and social profiles, added in a later design round                   |
| NOTIF 01 | Must         | Transactional notifications | Booking, changes, cancellation, payment, delivery, and refund events use approved templates  |
| NOTIF 02 | Must         | Appointment reminders       | Timing and channel are configurable and respect consent and quiet-hour rules                 |
| NOTIF 03 | Must         | Preparation and aftercare   | Approved instructions are linked to the relevant service and event timing                    |
| NOTIF 04 | Must         | Preferences                 | Transactional and marketing preferences are separate; marketing can be withdrawn             |
| NOTIF 05 | Should       | Inbox                       | Important app messages remain available after a push notification is dismissed               |
| NOTIF 06 | Must         | Templates **(v1.2)**        | 12 templates (NTF-01–12) with channel, trigger, copy and deep link; customer messages are transactional, promotions only to opted-in customers |
| NOTIF 07 | Must         | One reminder sender **(v1.2)** | Either Fresha or the app sends reminders, not both                                       |

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
| ADMIN 01 | Must     | Role-based access                | **(v1.2)** Permissions are checked on the server from a role-to-permission map. Design: Owner, Editor, Front desk (D34 replaces the five roles of D25); owner direction is one full-access role (pending) |
| ADMIN 02 | Must         | Service management               | Authorized staff manage status, content, pricing display, imagery, eligibility, and ordering    |
| ADMIN 03 | Must         | Promotion management             | Campaigns support scheduling, preview, validation, audit history, and rollback or pause         |
| ADMIN 04 | Must         | Package and gift-card management | Rules and content are managed without direct database edits                                     |
| ADMIN 05 | Must         | Support content                  | FAQ and contact details can be updated with preview and publishing controls                     |
| ADMIN 06 | Must         | Audit log                        | Sensitive changes record actor, timestamp, previous value, new value, and reason where required |
| ADMIN 07 | Must         | Environment separation           | Development, staging, and production use separate data and credentials                          |
| ADMIN 08 | Should   | Approval workflow                | **(v1.2)** A setting, off by default: Owner publishes after a confirm step; with the setting on, price, policy and offer-term changes need a second person (D35; owner direction is no approval, pending) |
| ADMIN 09 | Must         | Customer-value support           | Authorized staff can trace and resolve appointment, package, gift-card, credit, refund, membership, and approved reward discrepancies |
| ADMIN 10 | Must         | Content-type validation          | Policies cannot publish as services, expired campaigns cannot transact, and unapproved financing methods cannot display   |
| ADMIN 11 | Must     | Archive, don't delete **(v1.2)** | Only drafts can be deleted; live items are archived and restorable; every archive, delete and restore is confirmed and audited (D36) |
| ADMIN 12 | Must     | Rules as settings **(v1.2)**     | Booking mode, deposit, change window, late-cancel outcome, hold, payment methods, financing line, gift values, consultation price, second approver, clinic hours, rating line and deletion grace are staff-editable settings; changes apply to new bookings only (D37) |
| ADMIN 13 | Should   | Catalogue import **(v1.2)**      | Staff can import a Fresha service export, match columns, review new, changed and duplicate rows, and publish; manual entry stays available (D40) |
| ADMIN 14 | Must     | Tablet layout **(v1.2)**         | Long staff forms use a two-column layout on tablets (D39)                                        |
| ADMIN 15 | Must     | Operations tools **(v1.2)**      | Today and requests queue, counter redemption, customer search and profile, legacy account-match check, support inbox with replies |
| ADMIN 16 | Must     | Selling tools **(v1.2)**         | Packages, gift-card settings and actions (resend, change recipient, void, reissue), promo codes, Home layout, push composer (opted-in audience) |
| ADMIN 17 | Must     | Clinic content **(v1.2)**        | Professionals (bio and photo only with consent), versioned policies, FAQ, media library with alt text and rights, clinic info and hours |
| ADMIN 18 | Should   | Reports **(v1.2)**               | Bookings started and completed, campaign results, gift and package sales                         |
| ADMIN 19 | Must     | Edit conflicts **(v1.2)**        | Saves carry a version; a stale save shows a conflict state and never overwrites silently           |

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
| Booking platform | Services, professionals, availability, create, reschedule, cancel, webhooks | **(v1.2)** Fresha publishes no booking API (read-only data connector only): hand-off is the default. Open: what the hand-off can prefill and whether visits can be read back |
| Debit processor  | Tokenization, debit support in Canada, refunds, webhooks, receipts          | Existing merchant and preferred gateway. **(v1.2)** Must support Apple Pay and Google Pay (Interac) |
| Klarna           | Merchant eligibility, amount limits, mobile flow, capture, cancel, refund   | Direct or payment-provider integration                 |
| Affirm           | Canadian merchant eligibility, mobile flow, authorization, capture, refund  | Direct or payment-provider integration                 |
| Afterpay         | Confirm whether the observed banner reflects an active merchant capability   | Exclude until commercial and technical approval        |
| Gift cards       | Issuance, delivery, claim, ledger, redemption, refund                       | Existing provider or new ledger                        |
| Packages         | Purchase, entitlement, redemption, expiry, adjustment                       | Existing source of truth or new ledger                 |
| CMS              | Services, promotions, policy content, media, preview, scheduling            | **(v1.2)** Served by the app's own backend and edited in the in-app staff workspace |
| Notifications    | Push, email, SMS if approved, templates, preferences, delivery status       | Vendors and consent model                              |
| Analytics        | Privacy-conscious event collection, funnels, errors, campaign attribution   | Approved platform and retention                        |
| Support          | Contact forms, tickets, chat, or messaging with references                  | Channel and service-level expectations                 |
| Legacy app       | Customer IDs, appointments, orders, package and gift ledgers, credits, memberships, rewards, referrals, consent, exports, and retention | **(v1.2)** Lead360 white-label: request an export from whoever administers it |
| Product commerce | Catalog, inventory, pickup or shipping, tax, return, refund, and order status | Backlog unless an operational source is confirmed      |

### Booking architecture options

| **Option**                  | **Advantages**                                             | **Constraints**                                                                     | **Use when**                                               |
|-----------------------------|------------------------------------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------|
| Native API integration      | Best continuity, app-controlled states, stronger analytics | Requires supported API, webhooks, commercial access, and complete data coverage     | Booking provider formally supports all required operations |
| Controlled provider handoff | Fastest path and lower booking-engine effort               | Brand break, limited analytics, weak wallet integration, possible duplicate sign-in | API access is unavailable and client accepts limitations   |
| Custom booking backend      | Full control over product behavior and data                | Largest cost, operational risk, scheduling complexity, migration work               | Existing platforms cannot meet essential requirements      |

**(v1.2) Chosen direction:** controlled provider hand-off to Fresha as the launch default (D33, pending client confirmation), because Fresha publishes no booking API. The design also covers native booking so the switch is a setting if a booking system with an API is adopted later.

v1.1 recommendation (kept for reference): do not select an option until the team completes a technical discovery with Fresha or the actual booking provider. A visual design can begin at the flow level, but high-fidelity transactional screens should not be finalized before error states and integration limits are known.

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
| NFR 07 | Compatibility       | Support matrix must define minimum iOS and Android versions, phone and tablet behavior, orientation, screen sizes, and accessibility settings. **(v1.2)** Portrait phone; staff forms also have a tablet layout at 768 pt / 600 dp; minimum OS versions still open |
| NFR 08 | Observability       | Collect privacy-safe crash, error, latency, webhook, payment, and booking health data with alerting and trace references                                                                 |
| NFR 09 | Offline behavior    | Previously loaded public content may be cached; booking, payment, cancellation, and balance changes require confirmed connectivity                                                       |
| NFR 10 | Content freshness   | Catalog, price, terms, and promotion changes publish remotely with cache invalidation and version awareness                                                                              |
| NFR 11 | Backup and recovery | Critical business records have tested backups, restoration procedures, retention, and recovery objectives                                                                                |
| NFR 12 | Quality assurance   | Automated and manual tests cover core journeys, accessibility, payment, booking, notifications, upgrades, and interrupted sessions                                                       |
| NFR 13 | Localization        | English is the launch language (D12); architecture must not hardcode text, currency, date, time, or plural rules |
| NFR 14 | Maintainability     | Shared design tokens, component documentation, environment configuration, API contracts, release notes, and ownership are maintained                                                     |
| NFR 15 | Truth first **(v1.2)** | No booking, payment, redemption, gift claim or balance shows as done before the server or Fresha confirms it |
| NFR 16 | Design fidelity **(v1.2)** | Built screens use the design tokens and components, implement every designed state in light and dark, and log any deviation for design QA |

### Privacy and store requirements

- Apple requires apps with account creation to provide account deletion inside the app. Google Play requires both an in-app deletion path and a web resource for deletion requests.
- Apple and Google require accurate disclosure of data collected by the app and integrated third-party SDKs. The disclosure inventory must be updated when SDKs or data practices change.
- Apple permits external payment methods for physical goods or services consumed outside the app. Google Play billing does not support physical services and is not required for gift-card sales. Gift-card implementation on iOS still requires a store-policy review based on what the card can redeem.
- Apple may reject a repackaged website with insufficient utility. Native appointment management, reminders, wallet information, support, and customer controls are therefore product requirements, not optional polish.
- British Columbia's Personal Information Protection Act requires reasonable security arrangements for personal information under an organization's control. Legal counsel must confirm the final consent, retention, access, and cross-border processing model.
- **(v1.2)** The website's privacy-policy and terms pages are currently empty. Both stores need a working privacy-policy URL, so this text must be written before submission.
- **(v1.2)** Injectable treatments (for example Botox) are prescription products; campaign templates and wording that mention them need legal review before publishing.
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

### Design status (v1.2, 25 September 2026)

The design project ran its own phase numbering (from the design handoff); the table maps it to the work above.

| **Design phase** | **Status** |
|------------------|------------|
| Intake and decision register | Done: D01–D40, conflicts C01–C11, risks R01–R11, change requests CR-01–58 |
| Brand and design system | Done: tokens (light and dark), 62 components, 13 guidelines, fonts, icon set, app icon |
| Navigation (IA) | Done: Option B, route map, draft categories and concerns, staff workspace map v2 |
| Flows | Done: flows 1–9 plus v2 flows and new flows 10–17, each with success, failure and recovery |
| Usability testing | Postponed (D31); the test plan is ready |
| High-fidelity screens | Done: 158 boards (126 app screens, 7 tablet layouts, 4 web pages, 12 notification templates, 8 motion prototypes, app icon), light and dark, all states |
| Gap closure (Phase 9) | Done: 41 gaps; 39 closed in design, 2 waiting on client scope (shop/rewards/referrals/check-in, group booking) |
| Developer handoff | Done: handover pack v1.2.1 (README, CLAUDE.md for the coding team, build plan, decisions and flags, open items, data-model draft, screen index, design system, boards, renders, assets) |
| Benchmarking | Next, after owner review; one revision round planned |
| Build QA | During development |

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

**(v1.2)** All of the artifacts above are delivered except the usability-test results (testing postponed, D31).

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
- Public support URL, privacy-policy URL, terms, and Android account-deletion web URL. **(v1.2)** The deletion page is designed (WEB-03/04) but postponed; it must be live before the Play release.
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

| **Missing input**             | **Why it matters**                                                                | **Requested evidence**                                                                                                    | **Owner**                       | **Status 25 Sep** |
|-------------------------------|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|---------------------------------|----|
| Booking source of truth       | Determines the entire transaction architecture                                    | Fresha or vendor plan, admin access, contract, API and webhook documentation, technical contact                           | Client and tech lead            | (v1.2) Fresha; hand-off default (D33, pending). Open: prefill and visit sync |
| Canonical active service list | All services cannot be preserved without an approved inventory                    | Spreadsheet with names, categories, durations, prices, staff, rules, status, and aliases                                  | Clinic operations               | (v1.2) Draft from website + Fresha; Fresha export still needed; import tool designed |
| Payment architecture          | Debit and financing may require a common processor or separate integrations       | Active merchant accounts for debit, Klarna, Affirm and observed Afterpay; gateway contract, currency, settlement, tax, refund, dispute, limits, and sandbox access | Client finance and tech lead    | (v1.2) Open (provider, merchant accounts) |
| Booking business rules        | Drives availability, pricing, cancellation, and state design                      | Deposits, holds, lead time, buffers, no-show, reschedule, cancellation, refund, waitlist, and provider rules              | Clinic operations               | (v1.2) Sample values as settings; real rules from clinic still needed |
| Package source of truth       | Balances and redemption cannot be designed safely without ledger rules            | Current package catalog, ownership, expiry, transfers, sharing, combination, refund, and adjustment rules                 | Clinic operations and finance   | (v1.2) Design assumes the app's own ledger; legacy export open |
| Gift-card source of truth     | Delivery and redemption depend on issuance and balance ownership                  | Provider, terms, expiry, custom values, delivery, claim, combination, loss, refund, and fraud rules                       | Clinic operations and finance   | (v1.2) App ledger, no expiry (BC); legacy export open |
| Sensitive-data boundary       | Changes privacy, security, legal, UX, and vendor requirements                     | Approved list of intake data, contraindications, photos, notes, allergies, medications, retention, access, and processors | Client legal and clinical owner | (v1.2) No medical intake, photos or clinical notes in v1 (design); legal to confirm |
| Identity and migration        | Determines sign-in, duplicate handling, and existing customer access              | Customer systems, identifiers, record counts, consent provenance, data quality, migration and deduplication rules         | Client and tech lead            | (v1.2) Verified phone is the identity; match and staff check designed; data open |
| Legacy system and export access | Customer value cannot be protected without authoritative data and ownership       | Technical owner, backend and vendor list, admin access, API or export documentation, schemas, record counts, retention, contracts, and shutdown constraints | Client and tech lead | (v1.2) Lead360 white-label identified; export and owner open |
| Existing customer-value inventory | Deferred features may still contain money or contractual benefits                | Counts and balances for appointments, packages, gift cards, clinic credit, refunds, active memberships, rewards, and referral obligations | Operations and finance | (v1.2) Open |
| Membership and loyalty disposition | Determines what existing customers see and what must migrate or be settled       | Active tiers, names, prices, benefits, billing, renewal, cancellation, banked value, reward and referral rules, liability, and support cases | Operations, finance, and legal | (v1.2) Membership hidden (D38, pending); rewards and referrals out of v1 |
| Product-commerce decision     | The legacy app sells stocked products but fulfillment scope is unconfirmed         | Decision to exclude, phase, or launch; product catalogue, inventory system, pickup or shipping, tax, return, claims, and owner | Client sponsor and operations | (v1.2) Out of v1 unless the client confirms scope |

### P1 experience content and operations inputs

| **Missing input**          | **Needed detail**                                                                                                              | **Owner**                      | **Status 25 Sep** |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------------|--------------------------------|----|
| Audience and launch market | Primary customer segments, age restrictions, geography, location count, and launch language                                    | Client product owner           | (v1.2) English, one clinic (D12) |
| Brand system               | Logo files, colors, typography rights, photography, icon direction, tone, and examples to preserve or avoid                    | Client brand owner             | (v1.2) Done (D02, D22–D24, D30); photo rights open |
| Service content            | Approved descriptions, benefits, preparation, aftercare, contraindication wording, price display, imagery, and review owner    | Clinical and content owners    | (v1.2) Open; placeholders badged |
| Professional profiles      | Active professionals, titles, credentials, biographies, photos, service eligibility, and schedule ownership                    | Clinic operations              | (v1.2) Open: titles, bios, consent |
| Promotion operations       | Approval workflow, campaign calendar, codes, exclusions, audience rules, notification channels, and reporting needs            | Marketing owner                | (v1.2) Tools designed; calendar and sign-off by clinic |
| Legacy campaign continuity | Active or scheduled campaigns, public links, expiry, terms, redirection, and which promotions must survive cutover              | Marketing owner                | (v1.2) Open |
| Support model              | Channels, hours, service levels, escalation, emergency wording, ticketing system, and common issues                            | Support owner                  | (v1.2) Designed; phone, hours, reply time open |
| Notification policy        | Required transaction events, reminder timing, marketing consent, quiet hours, SMS or email use, and sender identity            | Marketing legal and operations | (v1.2) Templates designed; reminder sender open |
| Analytics baseline         | Website and Fresha volumes, conversion, abandonment, appointment changes, package use, support contacts, and current reporting | Client analytics owner         | (v1.2) Open; event map designed |
| Accessibility needs        | Known customer needs, internal standard, testing budget, and accessibility reviewer                                            | Client product owner           | (v1.2) Design checked (contrast, targets); reviewer open |
| Content governance         | Who creates, reviews, approves, publishes, expires, and audits each content type                                               | Client product owner           | (v1.2) Roles and approval designed (D34, D35 pending) |

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
| Booking provider lacks required API access                   | Native booking scope may be blocked or substantially expanded | **(v1.2)** Confirmed: Fresha has no booking API. Hand-off is the default; in-app booking is a setting | Critical (mitigated in design) |
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
| Design starts before rules are known                         | Rework across flows, components, and estimates                | **(v1.2)** Rules are settings with badged sample values, so real values change content, not screens | High (mitigated in design) |
| **(v1.2)** Pending client decisions D33, D34, D35, D38 | Rework if built one way and decided another | Build behind settings and a permission map so either answer is a configuration change | High |
| **(v1.2)** Privacy and terms pages are empty | Store submission blocked | Clinic or legal writes them before submission | High |
| **(v1.2)** Play account-deletion page postponed | Google Play release blocked | Set a date before the Play release | High |
| **(v1.2)** Old development starter (v1.0 requirements, web admin, five roles) | Coding team builds the wrong admin and routes | Use the v1.2.1 handover pack as the starter | High |
| **(v1.2)** Fresha and the app both send reminders | Customers get duplicate messages | Choose one sender | Medium |
| **(v1.2)** Injectable promotion wording | Advertising-rule breach | Legal review of campaign templates | Medium |

### Decision log to complete

| **Decision**                                   | **Required by**                          | **Approver**                      | **Status** |
|------------------------------------------------|------------------------------------------|-----------------------------------|------------|
| Booking architecture                           | Before transaction wireframes            | Client sponsor and tech lead      | **(v1.2)** Direction set: Fresha hand-off (D33), pending client confirmation |
| Canonical catalog owner and format             | Before information architecture approval | Clinic operations                 | **(v1.2)** Open: draft catalogue in use (D27); Fresha export requested |
| Payment orchestration and merchant accounts    | Before checkout design approval          | Finance and tech lead             | **(v1.2)** Open |
| Sensitive-data scope                           | Before intake design                     | Clinical legal and privacy owners | **(v1.2)** Decided for design: none collected in v1; legal to confirm |
| Package and gift-card source of truth          | Before wallet design                     | Operations and finance            | **(v1.2)** Designed on the app's own ledger; legacy export open |
| Support channels and service levels            | Before support prototype                 | Operations                        | **(v1.2)** Designed (phone, text, Ask us, staff inbox); hours open |
| Launch language and geography                  | Before content production                | Client sponsor                    | **(v1.2)** Decided: English, one clinic in New Westminster (D12) |
| Technology stack and minimum operating systems | Before development planning              | Tech lead                         | **(v1.2)** React Native (Expo) decided; minimum OS versions open |
| Target launch window and budget                | Before delivery plan                     | Client sponsor                    | **(v1.2)** Open |
| Legacy-domain disposition and decommission plan | Before architecture and migration design | Client sponsor, operations, finance, legal, and tech | **(v1.2)** Open (Lead360 export) |
| Existing membership, reward, referral, and credit treatment | Before wallet and account design | Operations, finance, legal, and product | **(v1.2)** Credit kept in Wallet; membership hidden (D38, pending); rewards and referrals out of v1 |
| Afterpay status                                              | Before financing content or checkout design | Finance and tech lead          | **(v1.2)** Excluded (not shown) |
| Physical-product commerce scope                              | Before catalogue information architecture | Client sponsor and operations  | **(v1.2)** Out of v1 unless the client confirms |
| **(v1.2)** Staff roles (D34) and approval (D35) | Before staff-workspace build | Client | Owner direction given; pending client |
| **(v1.2)** Membership visibility (D38) | Before wallet build | Client | Owner direction given; pending client |
| **(v1.2)** Web host for gift claim and deletion pages | Before gift and Play release | Owner and tech lead | Open |
| **(v1.2)** Reminder sender (Fresha or app) | Before notifications build | Owner and tech lead | Open |

## Appendices

### Working screen inventory

**(v1.2)** Superseded by the design: 158 boards with screen IDs (ENT, AUT, HOM, TRT, OFR, BKG, PAY, VIS, CAR, WAL, ACC, SUP, STF, TAB, NTF, WEB, MOT, ICN), listed with routes, states, booking mode and roles in the handover pack (`docs/screen-index.md`). The v1.1 list is kept for reference.

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
| **(v1.2)** Added to the draft catalogue | Filler, fat dissolving, Liposonix, PRF, skin brightening, intimate brightening, Chrome nail fungus, Photo Frax, Plasma Frax, face massage, PMU (from Fresha; bookable as draft until confirmed). HydraFacial appears only in a website lead form and is not treated as a confirmed service |
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
| Fresha listing **(v1.2)**    | [Open source](https://www.fresha.com/a/nano-beauty-new-westminster-555-6th-st-130new-westminster-bc-v3l-5h1-koki9jiw) | Services, public prices, consultation price, rating, team, hours |
| Consumer Protection BC: gift cards **(v1.2)** | [Open source](https://www.consumerprotectionbc.ca/consumer-help/consumer-information-gift-cards/) | Gift-card expiry and fee rules |
| WCAG 2.2                     | [Open source](https://www.w3.org/TR/WCAG22/)                                                                 | Accessibility principles and testable success criteria                                                                 |

### Final recommendation

**(v1.2)** The design is complete and handed over (pack v1.2.1). Next steps, in order: confirm D33, D34, D35 and D38 with the client; start development from the handover pack (hand-off booking first, pending decisions behind settings); collect the clinic's real rules, service export, clinical copy, photo and staff consent; choose the backend and payment provider; request the Lead360 export; write the privacy policy and terms; set up the developer accounts; run benchmarking and one revision round.

v1.1 recommendation (kept for reference): Approve this v1.1 document as the working baseline and immediately run a legacy-data and customer-value workshop. Competitor benchmarking and design-language exploration can continue in parallel. Transactional wireframes for booking, checkout, wallet, account recovery, and migration should remain provisional until the client confirms the systems of record, existing liabilities, approved payment methods, and business rules.

The recommended product direction is a focused native app, not a visual refresh of the legacy catalogue. Preserve approved services, booking, appointments, packages, gift cards, wallet value, campaigns, and support; defer new loyalty, referral, membership, check-in, and product-commerce flows until their rules and operations are approved; remove the unsafe, misleading, duplicated, or nonfunctional patterns identified in the audit.

This document defines product and delivery requirements; it does not replace legal, clinical, privacy, security, payment-provider, or app-store review advice. Those owners must approve the final implementation and public policies.
