# Release readiness report (NANO-10)

Date: 2026-10-07. Scope: everything built in NANO-00–09 plus the NANO-10 hardening. Evidence is what was run on the
development machine (Windows, no Android SDK, no Mac). **Verdict: not releasable yet.** The code-level gates pass. The
release blockers are external: device QA, vendor accounts, legal text, the old-app export and hosting. They are listed
below with owners. No critical code defect is known and unrecorded.

Legend: **Pass** = verified by an automated check that ran; **Fail** = verified failing; **Blocked** = needs something
outside the codebase; **Not run** = needs a device or hosted environment.

## 1. Automated gates

| Gate | Command | Result |
|---|---|---|
| Typecheck, lint, all tests, Expo config, release audit | `npm run check` | **Pass**: API 133 tests (9 files), mobile 206 tests (27 suites), config check, audit, secrets |
| Requirement/route coverage | `node scripts/audit-coverage.mjs` → `docs/release/coverage.md` | **Pass**: 164/164 requirement IDs traced, 108 routes (0 missing; in-app booking routes gated by D33) |
| Secret scan (tracked files) | `node scripts/scan-secrets.mjs` | **Pass**: 0 findings in 1,487 files; no key/cert/env files tracked |
| API dependency audit (runtime) | `npm audit --omit=dev -w @nano/api` | **Pass**: 0 vulnerabilities |
| Mobile/tooling dependency audit | `npm audit --omit=dev` | **Accepted risk**: 63 (47 high, 16 moderate, 0 critical), all in the Expo/Metro/Jest build toolchain (node-forge in Expo code signing, micromatch/braces, metro). Not shipped in the app binary; npm's only "fix" is a semver-major downgrade. Re-check with the Expo SDK patch updates before release |
| Authorization sweep | `src/security.test.ts` | **Pass**: every non-public route → 401 without a session; every `/v1/staff/*` route → 403 + `missingPermission` for a customer |
| Ledger reconciliation | `npm run reconcile -w @nano/api`; `wallet.test.ts` reconciliation | **Pass** on real flows (purchase, redemption, partial refund); a corrupted entry is reported |
| API latency (in-process, PGlite) | `npm run bench -w @nano/api` | **Pass**: p95 ≤ 5.5 ms for settings, catalog, home, visits, wallet, inbox, staff services (budgets 100–300 ms) |
| JS bundle | `npx expo export --platform android|ios --max-workers 1` | **Pass**: Hermes bytecode 5.0 MB (Android), 4.7 MB (iOS). Assets 1.4 MB; largest is a 0.97 MB Material Symbols font pulled in by expo-router (`expo-symbols`), not used by our UI |

## 2. Critical journeys (automated)

| Journey | Evidence | Result |
|---|---|---|
| Sign-in, consents, profile, legacy match | `auth.test.ts`, `navigation/auth-flow.test.tsx` | Pass |
| Fresha hand-off and truthful return check | `visits.test.ts`, `navigation/booking.test.tsx` | Pass |
| Visits, late change requests, VIS-05, rebook | `navigation/booking.test.tsx` | Pass |
| Payments: success, decline, 3-D Secure, timeout, Klarna, duplicate charge, refunds | `wallet.test.ts` | Pass |
| Gift cards: send, schedule, claim (app and web), resend, void | `wallet.test.ts`, `staff/ops.test.ts` | Pass |
| Counter redemption: confirm → ledger → receipt; idempotent; never own value | `wallet.test.ts`, `navigation/staffOps.test.tsx` | Pass |
| Staff governance: drafts, 409 conflicts, publish/submit, second approver, archive rules, audit | `staff.test.ts`, `staff/ops.test.ts`, `navigation/staff*.test.tsx` | Pass |
| Settings change behaviour without a rebuild | `staff/ops.test.ts` (version bump, ETag) | Pass |
| Notifications: channels, quiet hours, one reminder sender, delivery claims | `notifications.test.ts` | Pass |
| Deep links and notification taps | `navigation/links.test.ts`, `navigation/notifications.test.tsx` | Pass |
| Offline: cached reads; value-changing writes refused before sending (sign-in, refresh and read-style POSTs still try) | `content/cache.test.ts`, `api/client.test.ts` | Pass |
| Account deletion and data export | `account.test.ts` | Pass |

## 3. Security and privacy review

| Area | Finding | Result |
|---|---|---|
| Authorization | Server-side permission on every staff route (D34), checked in `onRequest` before the body is read; self-dealing blocked (own value, own approvals, own gift cards, own requests). The sweep proves no route is open to anonymous callers or to customers; that each staff route needs the *right* permission is covered by the per-feature tests, not by the sweep | Pass |
| Sessions | Opaque hashed tokens; access 15 min; refresh rotation with replay revoke; staff sessions 12 h; tokens only in SecureStore; sign-out clears cache and the push token. Signing out while offline clears the phone but can't revoke the server session, which then ends on its own expiry | Pass (noted) |
| Rate limits | OTP start/verify and refresh 20/min per IP; promo validate 20/min; Ask us 5/min; orders, attempts, hand-offs, requests, gift claims 10/min; support replies 20/min | Pass (per instance; shared store needed when scaled, NANO-11) |
| Transport | Staging and production builds refuse a non-https API URL (`check-config`) | Pass |
| Response headers | `nosniff`, `referrer-policy: no-referrer`, `x-frame-options: DENY` on every response | Pass |
| Logs | Authorization, cookies and set-cookie redacted; deletion tokens masked in URLs; no request bodies logged | Pass |
| Telemetry and analytics | `redactText` on API and app errors; analytics allowlist with fixed property shapes; usage needs opt-in; no promo codes, names, phones, emails or free text | Pass |
| Uploads | Staff media: JPG/PNG/WebP ≤ 5 MB checked from file bytes; alt text and rights before use; served with `nosniff` | Pass |
| Payments | No card data reaches the API (device tokenisation / hosted pages); HMAC webhooks with event de-duplication | Pass (live provider R03 blocked) |
| Least privilege | App permissions in context only: notifications (primer), photos (staff upload only), calendar write-only/insert intent; no camera or microphone | Pass |
| Sensitive data | No medical intake, photos or notes collected (NFR 06, PRIV 07) | Pass |
| Encryption at rest, backups, DB roles | Depend on hosting | Blocked (NANO-11) |
| External security review / pen test | Not done | Blocked (before launch) |

## 4. Accessibility (NFR 01)

| Check | Evidence | Result |
|---|---|---|
| Contrast pairs ≥ 4.5:1 (text) and 3:1 (control borders), light and dark | `theme/theme.test.ts` | Pass |
| Labels and roles on custom controls | Static sweep: every raw `Pressable` in screens has a role, label and state; shared components carry roles | Pass |
| Scalable text | No `allowFontScaling={false}`; display styles cap with `maxFontSizeMultiplier` only on large titles | Pass (static) |
| Reduced motion | `useReducedMotion` in overlays and toasts | Pass (static) |
| Touch targets | Components enforce 44 pt / 48 dp (`hitSlopFor`, min heights) | Pass (static) |
| VoiceOver / TalkBack, focus order, largest text sizes | `docs/release/manual-qa.md` A1–A8 | Not run (no device) |

## 5. Cross-platform

| Check | Evidence | Result |
|---|---|---|
| Android edge-to-edge, predictive back, blocked calendar permissions | `app.config.ts`; SDK 57 edge-to-edge default | Pass (config) |
| iPad: portrait, full screen (avoids iPad multitasking validation failure) | `requireFullScreen: true` added in NANO-10 | Pass (config) |
| Tablet staff forms (768 pt / 600 dp two columns) | `StaffScreen` logic; no device run | Not run |
| Safe areas, sheets, keyboard, system back | `docs/release/manual-qa.md` I1–I6, D1–D7 | Not run |

## 6. Performance budgets (NFR 02)

| Budget | Value | Status |
|---|---|---|
| Cold start to interactive | ≤ 2.5 s mid-range Android, ≤ 2 s iPhone (release build) | Not run |
| Screen open / tab switch | ≤ 300 ms | Not run |
| Search per keystroke | ≤ 16 ms on 1,000 treatments | Pass (`catalog/search.test.ts`) |
| Images | Content photos are remote and loaded on demand; bundled images ≤ 200 KB each (largest bundled asset is a font) | Pass |
| API reads p95 | ≤ 500 ms hosted; in-process p95 ≤ 6 ms | Pass in-process; hosted Not run |
| JS bundle | ≤ 6 MB Hermes bytecode | Pass (5.0 / 4.7 MB) |

## 7. Migration and legacy (LEG 01–08)

`docs/migration/legacy-migration-plan.md` holds the inventory template, disposition, identity mapping, reconciliation
procedure (with `npm run reconcile`), cutover/rollback runbook, customer messages and decommission checklist.
**Blocked:** no old-app export (C3), so nothing has been migrated or reconciled against real data.

## 8. Defects and gaps closed in NANO-10

- VIS-05 "Visit cancelled" screen was missing (NTF-04 linked to it): built, with truth-first redirect.
- STF-10 support content (ADMIN 05) was missing: support articles now use the draft/publish/approval/archive engine;
  customers see only published articles.
- BOOK 14: "Book and use it" on a package opened an empty booking; it now opens the package's treatment.
- NFR 09: writes were not explicitly refused offline; the API client now refuses any write before sending when the
  device reports no connection.
- Security headers were set only on media; now on every response.
- Review: the offline guard first also refused sign-in on networks where the connectivity probe is wrong; it now applies only to value-changing writes. Archiving a support article that a treatment links to is now refused.
- Non-https API URLs were accepted for staging/production builds; now refused.
- iPad portrait-only build would fail App Store validation without `requireFullScreen`; added.

## 9. Open blockers for release (owner)

| Blocker | Owner | Blocks |
|---|---|---|
| Device QA (manual checklist), iOS needs EAS/Mac | Tech lead | release |
| Payment provider + merchant accounts (R03, A5) | Clinic + tech lead | real payments |
| SMS/email/push/analytics/crash vendors (E3, E5), EAS project ID for push | Tech lead | notifications, telemetry |
| Reminder sender decision (E6) | Clinic owner | NTF-02 (Fresha by default) |
| Fresha read-back and booking URL (E2) | Clinic | synced visits, NTF-01/03/04 |
| Terms, privacy notice, deletion/retention wording (R1, legal) | Legal | PRIV 01, AUTH 10 |
| Clinic content, photo rights, hours/phone/parking (C5, C7, R07) | Clinic | Sample badges stay on |
| Old-app export (C3), rewards/membership decisions | Clinic | LEG 01–08, REWD 02, MEM 02/03 |
| Hosting: TLS, encryption at rest, backups/restore test (NFR 11), shared rate-limit store, scheduler | Tech lead | NANO-11 |
| App IDs, store accounts, deep-link domain | Clinic + tech lead | store builds (NANO-11 configured; `npm run release:gate` lists what's missing) |
| External security review | Clinic | launch |
| Expo SDK patch updates (expo-doctor) | Tech lead | toolchain advisories |
