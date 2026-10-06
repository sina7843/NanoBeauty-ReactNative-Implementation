# Requirements Traceability

Add/update mappings as implementation progresses. Preserve requirement IDs from `Requirements.md` and board IDs from the handover.

| Requirement / board ID | NANO prompt | Implementation | Tests | Status |
|---|---|---|---|---|
| D33 `settings.bookingMode` (default `handoff`) | NANO-00 | `packages/contracts/src/settings.ts`, `apps/api/migrations/0001_app_settings.sql`, `GET /v1/settings`, `apps/mobile/src/settings/` | `apps/api/src/app.test.ts` | Flag served; route gating in NANO-01/04 |
| D35 `settings.secondApprover.on` (default `false`) | NANO-00 | same as above | `apps/api/src/app.test.ts` | Flag served; flow in NANO-07 |
| D38 `features.legacyMembership` (default `false`) | NANO-00 | same as above | `apps/api/src/app.test.ts` | Flag served; UI in NANO-06 |
| D37 / Spec 1 rules A1–A8, payment switches, gift, consultation, rating/financing lines, grace periods | NANO-00 | settings contract + seeded sample row (`sample: true`) | `apps/api/src/app.test.ts`, `apps/mobile/src/settings/bootstrap.test.ts` | Read path done; staff editing in NANO-08 |
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
