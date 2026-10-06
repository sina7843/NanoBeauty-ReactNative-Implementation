# Nano Beauty Implementation Status

NANO-00 (foundation), NANO-01 (design system, navigation, entry) NANO-02 (sign-in, sessions, consents, account match, permissions) NANO-03 (home, treatments, offers, promo codes, support, legal) and NANO-04 (Fresha hand-off booking, visits, change requests) are implemented. Routes that later prompts build show a visibly-marked "Not built yet" placeholder (Sample badge).

## Build targets
- Android QA: installable APK — EAS profile `qa` (also `development` dev-client APK)
- Android store: AAB — EAS profiles `testflight` (internal track) / `production`
- iOS QA: development (`development`, `development-simulator`) and TestFlight (`testflight`)
- iOS store: App Store build via EAS `production`
- Profiles validated locally by `npm run config:check -w @nano/mobile`; actual EAS cloud builds not run (needs `eas login` + project ID).

## Current architecture status
- Monorepo: npm workspaces — `apps/mobile`, `apps/api`, `packages/contracts`, `packages/design-tokens`
- Mobile: Expo SDK 57, React Native 0.86, Expo Router (src/app), TanStack Query, expo-secure-store, NetInfo, Jest (jest-expo + RNTL 13)
- Design system: tokens (light/dark, OS appearance), optional owner fonts with system fallback, Phosphor icons, 25+ native components, dev showcase at `/dev`
- Navigation: Option B tabs (Home, Treatments, Visits, Wallet) + Book action + profile button; `book/` and `pay/` modal stacks; D33 booking-mode route gating; unknown/old links → Home with "Link not found"
- Entry: ENT-01 native + in-app splash, ENT-02 update required and ENT-03 maintenance as root-level gates from `/v1/settings → app`, ENT-04 notification primer (once)
- Platform boundaries: haptics roles, calendar (iOS write-only sheet / Android insert intent), OTP autofill props, notification permission
- API: Fastify 5 + TypeScript, PostgreSQL (node-postgres) with forward-only SQL migrations (0001 settings, 0002 app gate, 0003 identity, 0004 content, 0005 visits/hand-offs/requests/notification outbox); PGlite in-memory for tests and no-Docker dev
- Variants: development / staging / production with side-by-side placeholder IDs `com.nanobeauty.app[.dev|.staging]`
- Booking default: Fresha hand-off (`settings.bookingMode = handoff`); in-app booking routes unreachable in hand-off
- Booking (NANO-04): multi-treatment basket and laser areas → BKG-12 explainer → BKG-08 hand-off in the system in-app browser → BKG-09 return check from Fresha evidence only; interrupted hand-offs resume on relaunch; Visits (synced or "Your bookings are in Fresha", offline copy), visit detail with Change in Fresha, late-change requests to the clinic queue, care for a visit, add to calendar; notification hooks to an outbox
- Discovery (NANO-03): server content with ETag caching and 7-day offline copies; on-device search/filters; server-clock offers; sample content badged
- Identity (NANO-02): phone + 6-digit code, rotating opaque sessions with replay revoke, append-only versioned consents, server-side role→permission map, legacy match cases with audited staff resolution (no value moved)
- Integrations: deterministic dev adapters only (OTP with dev sink, messages, payments, Fresha, legacy — sample records only in local dev); analytics boundary on mobile is consent-gated with a dev sink
- CI: `.github/workflows/ci.yml` — typecheck, lint, tests (PGlite + real Postgres service), token drift, Expo config, expo-doctor, JS bundle export, API build

## Implemented API surface
- `GET /health/live`, `GET /health/ready`
- `GET /v1/settings` — settings + feature flags + clinic info + app gate, ETag/304
- Auth: `POST /v1/auth/otp/start|verify`, `/v1/auth/refresh`, `/v1/auth/logout`
- Me: `GET /v1/me`, `POST /v1/me/consents`, `PUT /v1/me/profile`, `POST /v1/me/legacy-match` (+ `/decision`)
- Staff: `GET /v1/staff/match-cases`, `POST /v1/staff/match-cases/:id/resolve` (permission-checked, audited)
- Content: `GET /v1/catalog`, `GET /v1/content/home`, `GET /v1/offers/:id`, `POST /v1/promo/validate`, `GET /v1/support`, `GET /v1/support/articles/:id`, `GET /v1/policies/:id`, `POST /v1/support/questions`
- Visits and booking: `GET /v1/visits`, `GET /v1/visits/:id`, `POST /v1/bookings/handoffs`, `GET /v1/bookings/handoffs/:id`, `POST /v1/visits/:id/requests`; staff `GET /v1/staff/requests`, `POST /v1/staff/requests/:id/transition` (`requests.manage`, audited)
- Dev only: `GET /v1/dev/otp` (`DEV_OTP_SINK`, local development)

## Verification gaps
- No iOS/Android device or emulator run yet (no Android SDK on the NANO-00/01 machine; iOS needs EAS). Android and iOS bundles compile (Hermes bytecode); navigation, entry, booking hand-off and visits are covered by router-level Jest tests. Fresha in-app browser return (especially Android Custom Tab), add-to-calendar and keyboard behaviour still need a device run.
- Splash appearance must be checked on a release build (Expo Go/dev builds don't fully replicate it).

## Known environment notes
- On the development machine, low free memory caused V8 OOM when compiling PGlite's WASM; tests use `--liftoff-only` (see docs/development.md). `expo export` needs `--max-workers 1` there.
