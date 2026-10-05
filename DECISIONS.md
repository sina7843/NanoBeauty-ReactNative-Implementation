# Nano Beauty Project Decisions

Use this file for material implementation clarifications not already settled in `IMPLEMENTATION_DECISIONS.md` or the supplied handover.

| Date | Decision | Reason | Affected requirements/prompts |
|---|---|---|---|
| 2026-10-06 | npm workspaces monorepo: `apps/mobile`, `apps/api`, `packages/contracts`. No separate config/testing/design-tokens packages yet. | Expo has first-class npm-workspace support; extra packages had no consumer yet. NANO-01 may add `packages/design-tokens` when tokens are imported. | NANO-00, NANO-01 |
| 2026-10-06 | Placeholder app identifiers `com.nanobeauty.app` (+ `.dev`, `.staging`), schemes `nanobeauty[-dev\|-staging]`. Single `BASE_ID` in `apps/mobile/app.config.ts`. | Requirements say the client owns the bundle ID/package name; none supplied. | NANO-00, NANO-11 |
| 2026-10-06 | Placeholder API hosts `*.nanobeauty.invalid` in `eas.json`. | Hosting not chosen (open-items E1). `.invalid` can never resolve, so non-dev builds show the settings error state instead of talking to a guessed server. | NANO-00, NANO-11 |
| 2026-10-06 | Settings contract (`packages/contracts/src/settings.ts`) adds `lateChangeOutcome`, `noShowOutcome`, `slotHoldWarningMinutes` and a `sample` flag next to Spec 1 fields; deposit uses `amountCAD`/`overCAD`; `clinicHours` = `{weekly[], closures[]}` or `null`. | Spec 1 + `fixtures.json → rules` list A2 no-show and A3 warning separately; `sample` keeps Sample badges server-driven. Shape of hours is not specified by the handover — minimal assumption. | D37, NANO-00, NANO-08 |
| 2026-10-06 | Mobile has no bundled settings defaults. No server copy and no cache → error/retry state. | Truth-first: avoids rendering rules, prices or booking mode the server didn't send. | NFR 15, NANO-00 |
| 2026-10-06 | API DB access via a 3-method `Db` interface over node-postgres and PGlite; forward-only SQL migrations with a tiny runner; tests on PGlite, CI also on real Postgres. | Real Postgres SQL in tests without Docker; no ORM decided yet. | NANO-00, NFR 12 |
| 2026-10-06 | Only deterministic development integration adapters exist; `APP_ENV=production` refuses to boot with them. | Vendors not chosen (open-items E2–E5); prevents fake success in production. | NANO-00, NANO-02, NANO-06, NANO-09 |
| 2026-10-06 | Root `package.json` `overrides` pin `react`/`react-dom` to the Expo SDK version; `@testing-library/react-native` 14 not installed (needs React ≥ 19.3). | npm hoisting otherwise installs a second React and `expo-doctor` fails. | NANO-00, NANO-01 |
| 2026-10-06 | Removed the "tests" and "lint/format config" blocks from `.gitignore` (owner-approved). | They excluded `*.test.ts(x)` and `vitest.config.ts`, so CI could not run tests from a checkout. | NANO-00 |
| 2026-10-06 | Real handover app icon set wired into `app.config.ts` (from `assets/app-icon/final/`); splash left for NANO-01. | Avoids shipping the Expo template icon; splash needs tokens. | ICN-01, NANO-01 |
