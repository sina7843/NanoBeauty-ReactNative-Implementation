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
