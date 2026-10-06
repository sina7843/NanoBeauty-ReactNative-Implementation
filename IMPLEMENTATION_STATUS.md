# Nano Beauty Implementation Status

NANO-00 (foundation) and NANO-01 (design system, navigation, entry) are implemented. Customer and staff product screens start in NANO-02/03; routes that later prompts build show a visibly-marked "Not built yet" placeholder (Sample badge).

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
- API: Fastify 5 + TypeScript, PostgreSQL (node-postgres) with forward-only SQL migrations (0001 settings, 0002 app gate); PGlite in-memory for tests and no-Docker dev
- Variants: development / staging / production with side-by-side placeholder IDs `com.nanobeauty.app[.dev|.staging]`
- Booking default: Fresha hand-off (`settings.bookingMode = handoff`); in-app booking routes unreachable in hand-off
- Integrations: deterministic dev adapters only (OTP, messages, payments, Fresha, legacy); analytics boundary on mobile is consent-gated with a dev sink
- CI: `.github/workflows/ci.yml` — typecheck, lint, tests (PGlite + real Postgres service), token drift, Expo config, expo-doctor, JS bundle export, API build

## Implemented API surface
- `GET /health/live`, `GET /health/ready`
- `GET /v1/settings` — settings + feature flags + clinic info + app gate, ETag/304

## Verification gaps
- No iOS/Android device or emulator run yet (no Android SDK on the NANO-00/01 machine; iOS needs EAS). Android and iOS JS bundles compile; navigation/entry are covered by router-level Jest tests.
- Splash appearance must be checked on a release build (Expo Go/dev builds don't fully replicate it).

## Known environment notes
- On the development machine, low free memory caused V8 OOM when compiling PGlite's WASM; tests use `--liftoff-only` (see docs/development.md). `expo export` needs `--max-workers 1` there.
