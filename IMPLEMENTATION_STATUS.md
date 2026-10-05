# Nano Beauty Implementation Status

NANO-00 foundation is in place. No product screens yet; `apps/mobile/src/app/index.tsx` is a temporary boot screen that NANO-01 replaces with ENT-01 and the navigation shell.

## Build targets
- Android QA: installable APK — EAS profile `qa` (also `development` dev-client APK)
- Android store: AAB — EAS profiles `testflight` (internal track) / `production`
- iOS QA: development (`development`, `development-simulator`) and TestFlight (`testflight`)
- iOS store: App Store build via EAS `production`
- Profiles validated locally by `npm run config:check -w @nano/mobile`; actual EAS cloud builds not run (needs `eas login` + project ID).

## Current architecture status
- Monorepo: npm workspaces — `apps/mobile`, `apps/api`, `packages/contracts`
- Mobile: Expo SDK 57, React Native 0.86, Expo Router (src/app), TanStack Query, expo-secure-store, NetInfo, Jest (jest-expo)
- API: Fastify 5 + TypeScript, PostgreSQL (node-postgres) with forward-only SQL migrations; PGlite in-memory for tests and no-Docker dev
- Variants: development / staging / production with side-by-side placeholder IDs `com.nanobeauty.app[.dev|.staging]`
- Booking default: Fresha hand-off (`settings.bookingMode = handoff`, served by `GET /v1/settings`)
- In-app booking: gated, only if a supported API is selected
- Integrations: deterministic dev adapters only (OTP, messages, payments, Fresha, legacy); analytics boundary on mobile is consent-gated with a dev sink
- CI: `.github/workflows/ci.yml` — typecheck, lint, tests (PGlite + real Postgres service), Expo config, expo-doctor, JS bundle export, API build

## Implemented API surface
- `GET /health/live`, `GET /health/ready`
- `GET /v1/settings` — settings + feature flags + clinic info, ETag/304

## Known environment notes
- On the development machine used for NANO-00, low free memory caused V8 OOM when compiling PGlite's WASM; tests use `--liftoff-only` (see docs/development.md).
