# Open items (25 Sep 2026)

Nothing here blocks starting M0–M2. Each item names what it blocks and who answers it.

## Engineering decisions (tech lead)

| # | Decision | Blocks | Note |
| --- | --- | --- | --- |
| E1 | Backend: hosting, database, API style, admin API for the staff workspace, file storage for media | M1 onward | The design assumes a server that owns settings, content, wallet ledger, audit log and permissions. `data-model-draft.md` is a starting point only |
| E2 | Fresha integration: what the hand-off URL can prefill; whether visits can be read back (Fresha offers a read-only data connector, no booking API) | M3 sync states, HOM-02/VIS-01 "synced" | Until known, build the "not synced / Open Fresha" states. Never show a hand-off booking as confirmed on return alone |
| E3 | Auth: SMS OTP vendor, session length (staff shorter than customers), rate limits | M1 | Phone number is the identity (A6) |
| E4 | Payments: provider for card, Apple Pay / Google Pay (Interac debit runs through the wallets), Klarna, Affirm | M5 | Needs clinic finance input and merchant accounts. Screens show "[payment provider]" until chosen |
| E5 | Push, email and analytics vendors | M8 | Analytics must respect the consent split in spec 4 |
| E6 | Who sends reminders: Fresha or the app | M8 | Fresha already sends them; both = duplicates |
| E7 | Minimum iOS / Android versions; iPad and Android tablet support for staff (D39 tablet layout at 768 pt / 600 dp) | M0 | |

## Client dependencies (via Dragon)

| # | Item | Blocks | Until then |
| --- | --- | --- | --- |
| C1 | Confirm D33, D34, D35, D38 | Nothing (flags) | Defaults in `decisions-and-flags.md` |
| C2 | Real rules A1–A8: deposit, change window, no-show, hold, gift amounts, package validity, consultation price | Content only | Sample settings, badged |
| C3 | Old-app (Lead360 white-label) data export: customers, credit, packages, gift cards, memberships; who administers Lead360 | Wallet migration, AUT-05–07 matching, STF-28 | Match screens use sample data |
| C4 | Service list export from Fresha (name, category, duration, price type, staff) | Real catalogue | Draft catalogue in fixtures; import via STF-41/42 |
| C5 | Clinical copy (descriptions, preparation, aftercare, FAQs), photo rights, written consent from Naz, Maria, Anna | TRT, CAR, TRT-06 content | Placeholders and badges |
| C6 | Host for WEB-01–04 (gift claim, account deletion). `app.nanobeautystar.com` still runs the old app | WEB pages, gift links, deep-link verification files | Build the pages as a small separate web project when the host is known |
| C7 | Correct phone, hours, parking, team list | SUP-01, STF-31 | Bracketed placeholders |
| C8 | Scope: product shop, rewards, referrals, check-in, group booking (G03, G28) | Nothing in v1 | Out of scope |

## Store-release blockers (M10)

| # | Item | Owner | Note |
| --- | --- | --- | --- |
| R1 | Privacy policy and terms text. The website's pages exist but are empty | Clinic / legal | Both stores require a working privacy-policy URL |
| R2 | Google Play account-deletion web URL | Owner + dev | WEB-03/04 are designed but **postponed** by the owner. Google Play asks for this URL in the Data safety form, so it must exist before the Play release — the postponement can't go past that date |
| R3 | Apple and Google developer accounts under the clinic's legal entity (Apple needs a D-U-N-S number; can take weeks) | Clinic | Start early |
| R4 | Store name check for "Nano Beauty" | Clinic | |
| R5 | Legal review of injectable (Botox etc.) promotion wording and campaign templates | Clinic's advisor | Canadian rules limit prescription-drug advertising |
| R6 | App icon export set (iOS and Android) | Dragon | **Done in v1.2.1:** `assets/app-icon/final/` (iOS 1024, Android adaptive layers and monochrome, Play Store 512, SVG sources) |

## Old development starter (D20)

An earlier "development starter" exists (requirements v1.0, a separate React/Vite `apps/admin` web admin, NANO-02/15/16 prompts). It is **not** in this pack and it conflicts with v1.2 (web admin, five roles, old routes). Recommendation: treat this pack as the starter and don't use the old one. If the owner re-issues it, it must first be updated as listed in Phase 7 → "Starter note for the coding team".

## Known doc errata (don't be confused by these)

- Both canvas addresses (`claude.ai/artifact/5NA9BUxqPEpyu4AjJVLt8C` and `claude.ai/code/artifact/2358cea3-…`) open the same live canvas. The Phase 7 top table now shows v1.2 counts (fixed in v1.2.1).
- Phase 7 "Roles and permissions" (five roles) and Phase 3 "Flow 9" are marked replaced/superseded; use "Roles v2" and "Flow 9 v2".
- Phase 2 staff map v1 table (Editor / Approver / Support / Finance / Admin) is replaced by the v2 table below it.
- Requirements v1.1 (WALT 01) mentions gift-card expiry; BC law doesn't allow it, so `gift.expiry` is locked off.
- `/book/areas` (BKG-10) is used in both modes; `/book/basket` (BKG-11) is in-app only. `routes.json` is correct.
