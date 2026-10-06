# Requirements Traceability

Add/update mappings as implementation progresses. Preserve requirement IDs from `Requirements.md` and board IDs from the handover.

| Requirement / board ID | NANO prompt | Implementation | Tests | Status |
|---|---|---|---|---|
| D33 `settings.bookingMode` (default `handoff`) | NANO-00, NANO-09 | `packages/contracts/src/settings.ts`, `apps/api/migrations/0001_app_settings.sql`, `GET /v1/settings`, `apps/mobile/src/settings/`; NANO-09 `bookingGate.ts` (`inapp` effective only with a selected `BookingProvider`) | `apps/api/src/app.test.ts`, `notifications.test.ts`, `navigation/links.test.ts` | Gate proven; in-app booking intentionally not built (no provider) |
| D35 `settings.secondApprover.on` (default `false`) | NANO-00 | same as above | `apps/api/src/app.test.ts` | Flag served; flow in NANO-07 |
| D38 `features.legacyMembership` (default `false`) | NANO-00 | same as above | `apps/api/src/app.test.ts` | Flag served; UI in NANO-06 |
| D37 / Spec 1 rules A1–A8, payment switches, gift, consultation, rating/financing lines, grace periods | NANO-00 | settings contract + seeded sample row (`sample: true`) | `apps/api/src/app.test.ts`, `apps/mobile/src/settings/bootstrap.test.ts` | Done; staff editing STF-17/31/32 (NANO-08) |
| Clinic info (STF-31 / SUP-01 source) | NANO-00 | `clinicInfoSchema`, seeded row | `apps/api/src/app.test.ts` | Read path done |
| Build plan M0-1 repo, environments, CI, EAS | NANO-00 | root workspace, `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, `.github/workflows/ci.yml` | `apps/mobile/scripts/check-config.mjs` | Done (EAS cloud build not yet run) |
| Build plan M0-5 settings fetch with cached fallback | NANO-00 | `apps/mobile/src/settings/bootstrap.ts`, `useSettings.ts` | `bootstrap.test.ts` | Done |
| Build plan M0-6 offline detection, error mapping, analytics consent gate, i18n-ready strings | NANO-00 | `src/lib/network.ts`, `src/api/client.ts`, `src/lib/analytics.ts`, `src/i18n/` | `bootstrap.test.ts`, `env.test.ts` | Foundations done; per-screen use later |
| NFR 04 Security (secure secrets) | NANO-00 | `src/lib/session-storage.ts` (SecureStore only), `.env.example` only, config validation | `app.test.ts` (config) | Partial |
| NFR 08 Observability (request IDs, structured logs) | NANO-00 | `apps/api/src/app.ts` | `app.test.ts` | Partial (crash reporting vendor open) |
| NFR 09 Offline behavior | NANO-00 | NetInfo → TanStack onlineManager, `useIsOnline`, mutations never auto-retry | — | Foundation |
| NFR 12 QA automation | NANO-00 | CI workflow, PGlite + Postgres test strategy | all | Foundation |
| NFR 13 Localization-ready | NANO-00 | `src/i18n/` | — | Foundation |
| NFR 14 Maintainability (env config, API contracts) | NANO-00 | `packages/contracts`, `docs/development.md`, `docs/eas-builds.md` | — | Foundation |
| NFR 15 Truth first | NANO-00 | no bundled settings defaults; dev payment adapter never `paid`; Fresha/legacy `not_connected` | `app.test.ts`, `bootstrap.test.ts` | Foundation |
| ICN-01 app icon | NANO-00 | handover icon set wired in `app.config.ts` | — | Icon done; splash in NANO-01 |
| Build plan M0-2 design tokens and theme (light/dark, Fraunces + Sora, Phosphor) | NANO-01 | `packages/design-tokens`, `apps/mobile/src/theme/*`, `src/components/Icon.tsx` | `src/theme/theme.test.ts` (contrast both themes, font fallback), token drift check | Done (brand fonts await owner files) |
| Build plan M0-3 core components | NANO-01 | `apps/mobile/src/components/*`, showcase `src/app/dev/index.tsx` | `src/components/components.test.tsx` | Done |
| Build plan M0-4 navigation shell (D28 Option B), modal stacks, unknown deep link → Home with note | NANO-01 | `src/app/(tabs)`, `src/app/book`, `src/app/pay`, `src/app/+not-found.tsx`, `src/navigation/routes.ts` | `src/navigation/routes.test.ts`, `src/navigation/router.test.tsx` | Done (screens are placeholders until their prompts) |
| D33 in-app routes unreachable in hand-off | NANO-01 | `src/navigation/routes.ts`, `book/_layout.tsx`, `pay/_layout.tsx` | `routes.test.ts`, `router.test.tsx` | Done |
| ENT-01 splash | NANO-01 | `expo-splash-screen` config + `src/app/index.tsx` in-app continuation | — | Done (verify on release build) |
| ENT-02 update required, ENT-03 maintenance | NANO-01 | contract `app` gate, migration 0002, `src/entry/*`, root layout gate | `decide.test.ts`, `router.test.tsx`, API `app.test.ts` | Done |
| ENT-04 notification primer | NANO-01 | `src/app/index.tsx`, `src/platform/notifications.ts` | `decide.test.ts` | Done (push registration NANO-09) |
| ICN-01 app icon + splash wiring | NANO-01 | `app.config.ts`, `assets/icon.png`, `assets/splash.png`, Android adaptive layers | `config:check` | Done |
| Guideline 08 platform differences (back, sheets, system bars, press feedback, switch, OTP metadata, calendar, haptics, predictive back, no dynamic colour) | NANO-01 | native Stack/formSheet, `components/press.ts`, `Field.tsx` Switch, `src/platform/*`, `app.config.ts` | component tests; device checks pending | Implemented; device verification pending |
| NFR 01 accessibility basics (48 dp targets, labels, text scaling, reduced motion) | NANO-01 | components (`hitSlopFor`, a11y roles/labels, `maxFontSizeMultiplier` on display styles, `useReducedMotion`) | `components.test.tsx`, `theme.test.ts` | Foundation; VoiceOver/TalkBack pass pending (NANO-10) |
| NFR 16 design fidelity / deviations log | NANO-01 | `docs/deviations.md` | — | Started |
| ADMIN 01/07 staff visual boundary | NANO-01 | `StaffBar`, `RoleBadge`, `PermissionNotice` | `components.test.tsx` | Components done; workspace NANO-07 |
| AUTH 01 Guest access | NANO-02 | Public routes need no session; Home shows "Sign in" for guests; personal routes redirect to AUT-01 | API `auth.test.ts` (guest), `router.test.tsx` | Done |
| AUTH 02 / AUT-01, AUT-02 Phone + 6-digit code | NANO-02 | `apps/api/src/auth/routes.ts`, `apps/mobile/src/app/auth/{phone,code}.tsx`, `OTPInput` (one-time-code autofill) | `auth.test.ts`, `auth-flow.test.tsx` | Done (dev SMS adapter until E3) |
| AUTH 03 / AUT-08 Resend timer, wrong/expired code, rate limits, session expiry, sign out | NANO-02 | `LIMITS` in `apps/api/src/auth/session.ts`; per-IP throttle; `/auth/code` AUT-08 states; Account → Sign out | `auth.test.ts` (limits, expiry, lock, logout), `auth-flow.test.tsx` (limited, offline, expired) | Done |
| AUTH 04 / AUT-04 Profile (name, optional email) | NANO-02 | `PUT /v1/me/profile`, `src/app/auth/profile.tsx` | `auth.test.ts`, `auth-flow.test.tsx` | Sign-up step done; full profile ACC-02 in NANO-05 |
| AUTH 05 Secure session (secure storage, revoke, replay) | NANO-02 | Hashed opaque tokens, rotation + replay revoke, `SessionManager` single-flight refresh, expo-secure-store only | `auth.test.ts` (rotation, replay, grace), `session.test.ts` | Done |
| AUTH 07 Biometric re-entry | NANO-02 | — | — | Deferred to NANO-05 (no board) |
| AUTH 09 / AUT-03 Consent separation | NANO-02 | `consents` table (append-only, version, time, channel), `POST /v1/me/consents`, `ConsentRow` | `auth.test.ts`, `auth-flow.test.tsx` | Done |
| AUTH 10 Legal destinations | NANO-02 | "Read the terms" → `/legal/terms` (ACC-11 placeholder) | — | Blocked by R1 (terms text) |
| AUTH 11 / AUT-05…07 Legacy account match | NANO-02 | `/v1/me/legacy-match`, decision cases, staff resolve with audit, `AccountMatch` | `auth.test.ts` (matched, mismatch, notfound, unavailable, self-resolve, repeat) | Done (real data awaits C3) |
| D34 Server-side permission map | NANO-02 | `role_permissions`, `staff_roles`, `/v1/me.permissions`, `requirePermission` (403 + `missingPermission`), `useAuth().can()` | `auth.test.ts` (Owner vs Editor) | Done |
| DISC 01 / DISC 11 / HOM-01…03 Home | NANO-03 | `src/app/(tabs)/home.tsx`, `GET /v1/content/home` | `discovery.test.tsx`, API `content.test.ts` | Guest home done; signed-in shows hand-off card + offers (visits/value NANO-04/06) |
| DISC 02 / DISC 09 Catalogue | NANO-03 | `services`/`categories` tables, `GET /v1/catalog` (no drafts) | `content.test.ts` | Done (sample content) |
| DISC 03 / DISC 10 / TRT-04 Search | NANO-03 | `src/catalog/search.ts`, `treatments/search.tsx` | `search.test.ts`, `discovery.test.tsx` | Done |
| DISC 04 / DISC 05 / TRT-01…03 Browse and filters | NANO-03 | `(tabs)/treatments.tsx`, `treatments/list.tsx` | `search.test.ts`, `discovery.test.tsx` | Done |
| DISC 06 / DISC 07 / DISC 12 / TRT-05, TRT-07 Detail | NANO-03 | `treatments/[id].tsx`, `PriceTag`, `FAQBlock`, `CareTimeline` | `discovery.test.tsx`, `components.test.tsx` | Done (CAR-01 per visit done in NANO-04) |
| DISC 13 / DISC 14 Rating and financing lines | NANO-03 | `RatingSummary` (settings `ratingLine`), financing from `financingLine` + payment switches | `discovery.test.tsx` | Done |
| TRT-06 Professional | NANO-03 | `professionals/[id].tsx`, consent-gated `profile` | `content.test.ts` | Done |
| PROMO 02–05, 09, 11 / OFR-01, 02, 04 Offers | NANO-03 | `campaigns`, `GET /v1/offers/:id`, `offers/[id]/*`, `offerClock.ts` | `content.test.ts`, `discovery.test.tsx` | Done; staff publishing NANO-08 |
| PROMO 06 / OFR-03 Promo codes | NANO-03 | `POST /v1/promo/validate`, `promo.tsx` | `content.test.ts`, `discovery.test.tsx` | Done (redemption NANO-06) |
| SUP 01–06 / SUP-01…05 Support | NANO-03 | `support/*`, `GET /v1/support`, `POST /v1/support/questions`, `SupportContext`, `clinic.ts` | `content.test.ts`, `clinic.test.ts`, `discovery.test.tsx` | Done (in-app messaging NANO-05) |
| ACC-11 Legal | NANO-03 | `policies`, `GET /v1/policies/:id`, `legal/[doc].tsx` | `content.test.ts`, `discovery.test.tsx` | Done (real text R1) |
| NFR 09 Offline reads | NANO-03 | `content/cache.ts`, `ContentGate` | `cache.test.ts`, `discovery.test.tsx` | Done for public content |
| BOOK 01 / BKG-01 Service (several treatments per visit) | NANO-04 | `book/service.tsx`, `booking/basket.ts`, `booking/summary.ts`, `ServiceBasket` | `booking.test.ts`, `navigation/booking.test.tsx` | Done (hand-off mode) |
| BOOK 15 / D33 Booking mode, in-app routes unreachable | NANO-04 | `POST /v1/bookings/handoffs` refuses outside hand-off; `book/_layout.tsx` gating; in-app visit routes not built | `visits.test.ts`, `routes.test.ts`, `router.test.tsx` | Done |
| BOOK 16 / BKG-08, BKG-09, BKG-12 Hand-off truthfulness | NANO-04 | `booking_handoffs` (migration 0005), `GET /v1/bookings/handoffs/:id` (confirmed only for a Fresha booking first seen after the hand-off), `book/how-it-works.tsx`, `book/fresha.tsx`, `book/fresha-return.tsx`, `booking/pendingHandoff.ts`, relaunch resume in `app/index.tsx` | `visits.test.ts`, `booking.test.ts`, `navigation/booking.test.tsx` | Done; "not showing yet" needs a Fresha webhook; prefill unconfirmed (E2) |
| BOOK 17 / BKG-10 Visit basket and areas | NANO-04 | catalog `areas` (contract + `toAreas`), `AreaPicker`, `book/areas.tsx`, server-side area validation | `visits.test.ts`, `booking.test.ts`, `navigation/booking.test.tsx` | Done |
| BOOK 08 / BOOK 19 / VIS-01, VIS-07, HOM-02 Visits and sync | NANO-04 | `visits` (migration 0005), `GET /v1/visits`, `FreshaGateway.readVisits` (`not_connected` until a connector exists), `(tabs)/visits.tsx`, `visits/[id]/index.tsx`, `booking/NotSynced.tsx`, Home `NextVisit` | `visits.test.ts`, `navigation/booking.test.tsx` | Done; real Fresha read-back pending E2 (dev sample only) |
| BOOK 09 / BOOK 10 hand-off split / VIS-02, VIS-06 | NANO-04 | "Change in Fresha" (system browser), late window from `freeChangeHours`, outcome text from settings, `visits/[id]/late-change.tsx` | `booking.test.ts`, `navigation/booking.test.tsx` | Done for hand-off; in-app reschedule/cancel in NANO-09 |
| BOOK 11 Calendar action | NANO-04 | `booking/visits.ts → addVisitToCalendar` over `platform/calendar.ts` (iOS write-only sheet, Android intent) | — (native boundary) | Done; verify on device |
| BOOK 18 Change requests → staff queue | NANO-04 | `visit_requests` (idempotent, one open per visit), `POST /v1/visits/:id/requests`, `GET /v1/staff/requests`, `POST /v1/staff/requests/:id/transition` (`requests.manage`, audited, no self-handling) | `visits.test.ts`, `navigation/booking.test.tsx` | API + customer UI done; staff screens STF-23/24 in a later prompt |
| NTF-01/03/11 notification hooks (request submitted, approved, declined, call needed) | NANO-04 | `notifications` outbox (migration 0005), `notify()` in `visits/routes.ts` | `visits.test.ts` | Hooks done; delivery NANO-09 |
| CAR-01 Care for a visit | NANO-04 | `care/[visitId].tsx` (service care steps + urgent line) | — | Done (clinic copy pending) |
| NFR 09 Offline Visits | NANO-04 | `useVisits` cached under `nano.private.*`, wiped on sign-out/expiry (`lib/private-cache.ts`) | `navigation/booking.test.tsx` | Done |
| ACC-01 Account hub | NANO-05 | `app/account/index.tsx` | `navigation/account.test.tsx` | Done (staff row NANO-07) |
| ACC-02 / PRIV 05 Profile and phone change | NANO-05 | `app/account/profile.tsx`, `account/CodeStep.tsx`, `POST /v1/me/phone/start`, `/verify` | `account.test.ts`, `navigation/account.test.tsx` | Done |
| ACC-03 / NOTIF 04 Preferences | NANO-05 | `customer_preferences` (migration 0006), `GET`/`PUT /v1/me/preferences`, `app/account/notifications.tsx` | `account.test.ts`, `navigation/account.test.tsx` | Done (delivery NANO-09) |
| ACC-04/05 / NOTIF 05 Inbox | NANO-05 | `notifications.read_at`, `GET /v1/me/inbox`, `/:id`, `app/account/inbox/*` | `account.test.ts`, `navigation/account.test.tsx` | Done |
| ACC-06 / PRIV 02 Privacy hub and consent history | NANO-05 | `GET /v1/me/consents`, `app/account/privacy.tsx` | `account.test.ts`, `navigation/account.test.tsx` | Done |
| ACC-07 / PRIV 08 Data export request | NANO-05 | `privacy_requests`, `GET`/`POST /v1/me/data-requests`, `app/account/data-request.tsx` | `account.test.ts`, `navigation/account.test.tsx` | Request tracked; export fulfilment by the clinic |
| ACC-08–10 / AUTH 06 / PRIV 04 Account deletion | NANO-05 | `/v1/me/deletion/*`, `DELETION_PLAN`, `carryOutDeletion`, `runDueDeletions`, `app/account/delete.tsx` | `account.test.ts`, `navigation/account.test.tsx` | Done (retention wording: legal review) |
| WEB-03/04 web deletion contract | NANO-05 | `POST /v1/privacy/deletion/start`, `/confirm`, `GET /v1/privacy/deletion/:token`; contracts `webDeletionStartSchema`, `deletionStatusSchema` | `account.test.ts` | API ready; page in NANO-11 |
| PRIV 06 Permissions in context | NANO-05 | ACC-03 explains OS-off with Open settings; no prompt outside ENT-04 or the calendar action | `navigation/account.test.tsx` | Done |
| PRIV 07 Sensitive content | NANO-05 | Profile has name, phone, email only; "no medical details" helper on free-text fields | — | Done |
| NFR 05 Logs and analytics minimisation | NANO-05 | Logger redaction, no PII in URLs, one deletion event without personal data | — | Done |
| PAY 01 / PAY 10 Tokenised payments, no card data | NANO-06 | `PaymentProvider` (`integrations.ts`), device-side `payments/provider.ts`, `pay/card.tsx`; only brand/last4 stored | `wallet.test.ts`, `navigation/wallet.test.tsx`, `payments.test.ts` | Done with dev provider (live provider R03) |
| PAY 02–04 / PAY 12–14 Methods and financing truthfulness | NANO-06 | `GET /v1/orders/:id/methods`, `pay/method.tsx` | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done |
| PAY 05 Deposit vs full payment | NANO-06 | Hand-off mode: packages and gift cards only; deposits in Fresha | — | Done (in-app deposits NANO-09) |
| PAY 06 / PAY 07 Idempotency and recovery | NANO-06 | `orders`, `payment_attempts` (one open), `provider_events`, `settle`, `reconcile`, minute job, `pay/status.tsx`, relaunch resume | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done |
| PAY 08 / PAY 09 Receipts and refunds | NANO-06 | `GET /v1/receipts/:orderId`, `refunds`, `POST /v1/staff/payments/:attemptId/refunds`, `pay/receipt/[id].tsx` | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done (tax lines Sample) |
| WALT 01–04, 13, 14 Gift cards | NANO-06 | `wallet_instruments` (gift), `/v1/gifts/*`, `wallet/gift/*`, `wallet/claim.tsx`, `wallet/gift-cards/[id].tsx` | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done (web page NANO-11) |
| WALT 05–07 Packages | NANO-06 | `packages`, `wallet/buy-package.tsx`, `wallet/packages/[id].tsx` | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done (redeem at booking in in-app mode NANO-09) |
| WALT 08 / WALT 11 History and ledger reconciliation | NANO-06 | `ledger_entries` (append-only), `GET /v1/wallet/history`, `wallet/history.tsx`, `wallet/help.tsx`, `balance_help_cases` | `wallet.test.ts`, `navigation/wallet.test.tsx` | Done |
| WALT 10 Clinic credit | NANO-06 | `POST /v1/staff/adjustments` (`value.adjust`), `wallet/credit.tsx` | `wallet.test.ts` | Done |
| WALT 15 / STF-11, STF-25 Counter lookup and redemption | NANO-06 | `GET /v1/staff/lookup`, `POST /v1/staff/redemptions` | `wallet.test.ts`, `navigation/staffOps.test.tsx` | Done (screens `staff/redeem.tsx`, `staff/lookup.tsx`, NANO-08) |
| WAL-05 / D38 Membership | NANO-06 | `wallet/membership.tsx` behind `features.legacyMembership` | `navigation/wallet.test.tsx` | Done |
| WALT 12 Legacy value continuity | NANO-06 | `wallet_instruments.source = 'legacy'`, `status = 'reconciling'` hides values | — | Ready for the C3 import (NANO-07/08) |
| ADMIN 01/07 / STF-01 / STF-14 Staff workspace and access | NANO-07 | `app/staff/_layout.tsx` gate, `staff/index.tsx`, `staff/denied.tsx`, `StaffBar`, `StaffScreen`; server `can(...)` on every `/v1/staff/*` route | `staff.test.ts`, `navigation/staff.test.tsx` | Done (Today/selling sections NANO-08) |
| STF-02 / STF-03 / STF-40 Services, edit, FAQ (versioned drafts, 409 conflict) | NANO-07 | `services.version/draft` (migration 0008), `/v1/staff/services*`, `useServiceEditor`, `EditorChrome` | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| D35 / STF-08 / STF-09 Publish with confirm, approvals, second approver | NANO-07 | `approvals`, `/v1/staff/approvals*`, publish/submit | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| D36 / STF-39 Archive, restore, delete rules | NANO-07 | archive/restore/delete endpoints (services, categories, media), `ConfirmDialog` | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| STF-04 Categories | NANO-07 | `/v1/staff/categories*`, move, `staff/taxonomy.tsx` | `staff.test.ts`, `navigation/staff.test.tsx` | Done (concerns NANO-08) |
| STF-36 Media library | NANO-07 | `media` table, `/v1/staff/media*`, `/v1/media/:id`, `staff/media.tsx` | `staff.test.ts` | Done (object storage at hosting) |
| STF-41 / STF-42 Catalogue import | NANO-07 | `catalog_imports`, `/v1/staff/imports*`, `parseCsv`, `parsePrice`, `staff/import/*` | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| STF-12 Audit log viewer | NANO-07 | `GET /v1/staff/audit`, `staff/audit.tsx`; entries append-only | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| STF-13 / STF-38 Team and roles | NANO-07 | `staff_invites`, `/v1/staff/team*`, `acceptStaffInvite`, `staff/team/*` | `staff.test.ts`, `navigation/staff.test.tsx` | Done |
| D39 Tablet two-column layout | NANO-07 | `StaffScreen` (`useTablet`: 768 pt iOS / 600 dp Android, form left, preview/actions right) on STF-03, STF-40, STF-42 | — | Done; verify on a tablet |
| STF-05 / STF-06 / STF-07 Campaigns (list, calendar, editor, templates, preview, pause/end/reuse) | NANO-08 | migration 0009, `staff/entities.ts` (campaign), `/v1/staff/campaigns*`, `/v1/staff/campaign-templates/:t`, `staff/campaigns/*` | `staff/ops.test.ts` | Done |
| PROMO 11 / STF-34 Home layout (max two offers, ordered; rating line) | NANO-08 | `GET|PUT /v1/staff/home-layout` (`selling.publish` to save), `staff/home-layout.tsx` | `staff/ops.test.ts` | Done |
| STF-19 / STF-20 Promo codes | NANO-08 | promo def in `staff/entities.ts` (code immutable, `live` = published once), `staff/promo-codes/*` | `staff/ops.test.ts` | Done |
| STF-15 / STF-16 Packages | NANO-08 | package def (draft not buyable; price/sessions high-risk), `staff/packages/*` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done |
| STF-17 / STF-18 Gift-card settings and actions | NANO-08 | `PUT /v1/staff/settings/gifts`, `/v1/staff/gifts*` (resend = new code, change recipient before claim, void + optional refund), `staff/gift-cards/*` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done |
| STF-21 / STF-22 Professionals (bio, photo, consent) | NANO-08 | professional def (publish blocked without consent when a photo/bio is set; hidden leave the catalogue), `staff/professionals/*` | `staff/ops.test.ts` | Done |
| STF-23 / STF-24 Today and request detail (late rule, hand-off "move it in Fresha, then mark done") | NANO-08 | `GET /v1/staff/today`, `GET /v1/staff/requests/:id`, existing transition, `staff/today.tsx`, `staff/requests/[id].tsx` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done (Fresha diary not readable: E2) |
| STF-26 / STF-27 / STF-28 Customers, profile, account-match review | NANO-08 | `/v1/staff/customers[/:id]`, `GET /v1/staff/match-cases/:id`, `staff/customers/*` | `staff/ops.test.ts` | Done (old-app data C3) |
| STF-29 / STF-30 / NTF-10 Support inbox and replies | NANO-08 | `support_replies`, `/v1/staff/inbox*` (text/email/app; failed sends recorded as failed), inbox template | `staff/ops.test.ts` | Done (SMS/email vendor E3) |
| STF-31 Clinic info and hours | NANO-08 | `PUT /v1/staff/settings/clinic` (closure notice), `staff/settings/clinic.tsx` | `staff/ops.test.ts` | Done |
| STF-32 Rules, payment switches, booking mode, second approver, membership flag | NANO-08 | `PUT /v1/staff/settings/rules` (version bump → apps refetch; in-app booking refused), `staff/settings/rules.tsx` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done |
| STF-33 / ACC-11 Versioned policies | NANO-08 | policy def + `policy_versions`, `staff/policies/*`; customers read the newest | `staff/ops.test.ts` | Done (real text R1) |
| STF-08 / STF-09 Approvals for every content type | NANO-08 | approvals list/decide dispatch by `item_type` (`app.approvalHandlers`), item publish permission enforced | `staff/ops.test.ts` | Done |
| STF-35 Marketing push composer (opted-in audience only) | NANO-08 | `push_messages`, `/v1/staff/push*`, `staff/push.tsx` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Composer done; delivery NANO-09 |
| STF-37 Reports from server data | NANO-08 | `GET /v1/staff/reports` (unavailable metrics carry a reason), `staff/reports.tsx` | `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done (views/taps need NANO-09 analytics) |
| STF-01 Staff home sections by permission | NANO-08 | `staff/index.tsx` (Front desk, Content, Selling, People, Settings and reports) | `navigation/staffOps.test.tsx` | Done (STF-10 support text not built) |
| NOTIF 01 / NOTIF 06 / NTF-01–12 Templates and channels | NANO-09 | `notifications/templates.ts` (inbox + push/text/email copy, channels per spec 3), `notifications/dispatch.ts`, migration 0010 | `notifications/notifications.test.ts` | Done (vendors E5) |
| NOTIF 02 / NOTIF 07 / NTF-02 Reminders, one sender | NANO-09 | `settings.reminderSender` (Fresha default), `reminderHours`, `queueReminders` (dedupe key), dispatcher re-check, STF-32 control | `notifications.test.ts` | Done; sender decision E6 open |
| NOTIF 04 Preferences / quiet hours | NANO-09 | reminders preference, `settings.quietHours` (texts and non-urgent pushes wait), marketing only to opted-in | `notifications.test.ts` | Done |
| NOTIF 05 Inbox after dismissal | NANO-05, NANO-09 | every customer outbox row is the inbox copy; delivery state per channel | `account.test.ts`, `notifications.test.ts` | Done |
| PROMO 07 / STF-35 Push delivery to opted-in only | NANO-09 | `deliverPushMessages` (consent re-checked at send, quiet hours, sent once) | `notifications.test.ts` | Done (push vendor E5) |
| NTF-01 / NTF-03 / NTF-04 from the Fresha read-back | NANO-09 | `visits/routes.ts` upsert triggers (future visits only, once each) | `notifications.test.ts` | Done (read-back E2) |
| Push devices | NANO-09 | `push_devices`, `/v1/me/devices[/remove]`, `platform/push.ts`, `NotificationBridge` | `notifications.test.ts` | Done; needs EAS project ID for tokens |
| Spec 4 analytics event map, consent split | NANO-09 | `lib/analytics.ts` (allowlist, shapes, bands), `PUT /v1/me/consents/analytics`, ACC-06 toggle, events wired on TRT/BKG/PAY/OFR/WAL/SUP/STF screens | `lib/observability.test.ts`, `notifications.test.ts` | Done (vendor E5) |
| NFR 08 Crash/error telemetry with redaction | NANO-09 | `redactText` (contracts), API `ErrorReporter` on 500s, mobile `lib/telemetry.ts` (global handler, ErrorBoundary, route patterns) | `notifications.test.ts`, `lib/observability.test.ts` | Done (vendor E5) |
| PROMO 05 / LEG 07 Deep links | NANO-09 | `navigation/links.ts`, `app/+native-intent.tsx` (scheme, web domain, gift links), offer CTAs and notification taps through the resolver | `navigation/links.test.ts`, `navigation/notifications.test.tsx` | Done; universal/app links need the domain (NANO-11) |
| BOOK 02 / BOOK 03 / BOOK 04 / BOOK 05 / BOOK 06 / BOOK 07 In-app booking (professional, availability, hold, intake, review, confirmation) | NANO-09 | Not built: D33 gate, no booking provider selected (E2). Hand-off mode delegates these to Fresha | `navigation/links.test.ts`, `notifications.test.ts` (gate) | Gated by decision (in-app mode only) |
| BOOK 12 Rebook | NANO-04, NANO-10 | VIS-02 "Book again", VIS-05 "Book another time" open the booking with the same treatment | `navigation/booking.test.tsx` | Done |
| BOOK 13 Service transaction model | NANO-06 | Packages are entitlements in the ledger (sessions), never a quantity selector; bookings stay in Fresha | `wallet.test.ts` | Done |
| BOOK 14 Purchase-to-book continuity | NANO-06, NANO-10 | WAL-03 "Book and use it" opens the booking for the package's treatment (`instrument.serviceId`) | `wallet.test.ts` | Done |
| PROMO 01 / PROMO 10 / ADMIN 03 Remote campaign publishing, templates, preview, pause | NANO-08 | `/v1/staff/campaigns*`, templates, STF-05/06/07 | `staff/ops.test.ts` | Done |
| PROMO 08 Attribution | NANO-09 | `offer_viewed`, `offer_tapped`, `booking_started`, purchases; completions not attributable (bookings in Fresha); STF-37 marks views/taps "not measured" until an analytics vendor exists | `lib/observability.test.ts` | Partial: vendor E5 |
| WALT 09 Combining instruments | NANO-06 | One instrument per counter redemption; online purchases take one payment method; no combining rule is offered until the clinic defines one | `wallet.test.ts` | Done (rule: no combining) |
| REWD 02 / MEM 02 / MEM 03 Legacy rewards and membership | NANO-06, NANO-10 | Membership row only behind `features.legacyMembership`; balances are inventoried, reconciled and imported per `docs/migration/legacy-migration-plan.md` | — | Blocked: old-app export (C3) and tier decisions |
| NOTIF 03 Preparation and aftercare | NANO-04 | CAR-01 care per visit from service `care` timeline; aftercare messages wait for approved clinical copy | — (manual QA) | Partial: clinical copy C5 |
| PRIV 01 Privacy notice | NANO-03 | ACC-11 `legal/privacy` from versioned policies (STF-33) | `content.test.ts` | Blocked: legal text R1 |
| PRIV 03 / PRIV 09 / NFR 06 Data minimisation, third-party data, no sensitive data | NANO-02–06 | Only phone, name, optional email; gift recipient name/number only for delivery and removed on deletion; no medical intake, photos or notes collected | `account.test.ts` | Done |
| ADMIN 02 Service management | NANO-07 | STF-02/03/04/40 | `staff.test.ts` | Done |
| ADMIN 04 Package and gift-card management | NANO-08 | STF-15–18 | `staff/ops.test.ts` | Done |
| ADMIN 05 Support content | NANO-10 | STF-10 `/staff/support-content` (articles in the draft engine), contact details in STF-31 | `staff/ops.test.ts` | Done |
| ADMIN 06 Audit log | NANO-07 | `audit_entries` (append-only trigger), STF-12 | `staff.test.ts` | Done |
| ADMIN 07 Environment separation | NANO-00 | development / staging / production variants, separate IDs and API URLs; https required outside development | `scripts/check-config.mjs` | Done (hosting NANO-11) |
| ADMIN 08 / ADMIN 19 Approval workflow, edit conflicts | NANO-07, NANO-08 | second approver, version checks (409) | `staff.test.ts`, `staff/ops.test.ts` | Done |
| ADMIN 09 Customer-value support | NANO-06, NANO-08, NANO-10 | lookup, adjustments, refunds, gift actions, `npm run reconcile -w @nano/api` | `wallet.test.ts` (reconciliation) | Done |
| ADMIN 10 Content-type validation | NANO-07–09 | typed draft schemas per kind; ended/paused offers can't be used (promo/offer clock); payment methods = switch AND provider capability | `staff/ops.test.ts`, `wallet.test.ts`, `content.test.ts` | Done |
| ADMIN 11 / ADMIN 12 / ADMIN 13 / ADMIN 14 / ADMIN 15 / ADMIN 16 / ADMIN 17 / ADMIN 18 Archive rules, rules as settings, import, tablet, operations, selling, clinic content, reports | NANO-07, NANO-08 | see STF rows above | `staff.test.ts`, `staff/ops.test.ts`, `navigation/staffOps.test.tsx` | Done (tablet verified in tests only) |
| LEG 01 / LEG 02 / LEG 03 / LEG 04 / LEG 05 / LEG 06 / LEG 08 Legacy migration | NANO-10 | `docs/migration/legacy-migration-plan.md` (inventory, disposition, identity mapping, reconciliation, cutover/rollback, communications, decommission), `npm run reconcile` | `wallet.test.ts` (reconciliation) | Plan ready; execution blocked on old-app export (C3) |
| NFR 02 Performance budgets | NANO-10 | `docs/release/readiness.md` budgets; `npm run bench -w @nano/api`; search budget test; bundle sizes | `catalog/search.test.ts` | Partial: device measurements pending |
| NFR 03 Reliability | NANO-04–09 | idempotency keys, webhook reconciliation, claimed deliveries, ledger reconciliation | `wallet.test.ts`, `notifications.test.ts` | Done |
| NFR 07 Compatibility | NANO-10 | Portrait phone, iPad full screen, staff tablet layout; support matrix in `docs/release/readiness.md` | `scripts/check-config.mjs` | Partial: device matrix not run |
| NFR 10 Content freshness | NANO-03, NANO-08 | ETag on settings/catalog/content; settings version bump on every staff change | `app.test.ts`, `content.test.ts` | Done |
| NFR 11 Backup and recovery | NANO-10 | Requirements and runbook in `docs/release/readiness.md` | — | Blocked: hosting (NANO-11) |
| AUTH 08 Apple/Google sign-in | — | Not in v1 (Could): phone identity (A6) | — | Not planned |
| DISC 08 / PAY 11 / PROD 01–05 / REWD 01 / REWD 03 / REF 01–03 / MEM 01 / SUP 07 Backlog items | — | Backlog or Remove in Requirements; not in v1 | — | Not in v1 |
