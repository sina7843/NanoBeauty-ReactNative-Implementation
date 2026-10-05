# Development on Windows

The repository is an npm-workspaces monorepo:

| Path | What |
| --- | --- |
| `apps/mobile` | Expo (SDK 57) + React Native + TypeScript + Expo Router. One app for customers and role-gated staff. |
| `apps/api` | Fastify + TypeScript + PostgreSQL. Settings, permissions, content, ledgers, audit, integration boundaries. |
| `packages/contracts` | Zod schemas and types shared by both (settings/flags, error envelope, health). |

Requirements: Node.js 22.12+ (24 works), npm 10+, Git. Docker is optional and only for a persistent Postgres.

## First run

```bat
npm ci
07-RUN-CHECKS.cmd        :: or: npm run check
08-START-API.cmd         :: API on http://localhost:4000 (in-memory PGlite, no Docker)
09-START-MOBILE.cmd      :: Metro for the dev build
```

No `.env` is needed for local work. If you want to change values, run `06-CREATE-LOCAL-ENV.cmd` to copy
`.env.example` to `.env`, then edit it yourself. The API reads the repo-root `.env` (`--env-file-if-exists`).

## API

| Command | Does |
| --- | --- |
| `npm run api:dev` | Watch mode. Without `DATABASE_URL`: in-memory PGlite, migrated on start, data lost on exit. |
| `npm run db:up` / `npm run db:down` | Start/stop local Postgres 17 (Docker Compose, bound to 127.0.0.1:5432). |
| `npm run api:migrate` | Apply SQL migrations in `apps/api/migrations` to `DATABASE_URL`. |
| `npm run build -w @nano/api` | Bundle to `apps/api/dist` (`node dist/server.js`, `node dist/migrate-cli.js`). |

Endpoints today: `GET /health/live`, `GET /health/ready` (503 when the DB is down), `GET /v1/settings`
(settings + feature flags + clinic info; `ETag`/`If-None-Match` → 304).

Conventions:
- Every error is `{ "error": { "code", "message", "requestId", "details?" } }`; no stack traces leave the server.
- Every response carries `x-request-id` (a safe caller value is echoed; otherwise a UUID). Logs are JSON (pino) with
  `authorization`/`cookie`/`set-cookie` redacted.
- SIGINT/SIGTERM close the server gracefully (in-flight requests finish, new ones get 503, DB pool closes, 10 s cap).
- Migrations are forward-only SQL files `NNNN_name.sql`; never edit an applied one, add a new one.
- `APP_ENV=staging|production` requires `DATABASE_URL`. `APP_ENV=production` refuses the development
  integration adapters, so production can't start until real vendors are wired.

Test database strategy: API tests run against in-process **PGlite** (real Postgres SQL, no Docker). CI runs the same
suite a second time against a real Postgres service via `TEST_DATABASE_URL`.

Development integration adapters (`apps/api/src/integrations.ts`): OTP accepts only `000000`; email/push/SMS go to an
in-memory outbox; payments are idempotent per key and **never** become `paid`; Fresha and the legacy app report
`not_connected`. Nothing calls a real vendor.

## Mobile

| Command | Does |
| --- | --- |
| `npm run mobile:start` | Metro. With `expo-dev-client` installed it targets the development build; press `s` to switch to Expo Go. |
| `npm test -w @nano/mobile` | Jest (jest-expo). |
| `npm run config:check -w @nano/mobile` | Resolves the Expo config for every variant and EAS profile and asserts identifiers/build types. |

Variants come from `APP_VARIANT` (`development` default, `staging`, `production`); each has its own bundle ID/package
and URL scheme so they install side by side (see `apps/mobile/app.config.ts`). `staging`/`production` refuse to build
without `EXPO_PUBLIC_API_URL`. In `development` with no URL the app calls the API on the machine running Metro
(`http://<metro-host>:4000`), which works for emulators, simulators and phones on the same Wi‑Fi. To point elsewhere:

```bat
set EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
npm run mobile:start
```

Runtime boundaries:
- `src/settings/` — the only way to read settings/flags. Fetches `/v1/settings`, revalidates with the ETag, falls back
  to the last server copy when offline. There are **no** bundled defaults: no server and no cache = error/retry state.
- `src/lib/session-storage.ts` — the only place session credentials are stored (expo-secure-store). Never AsyncStorage.
- `src/lib/network.ts` — NetInfo drives TanStack Query's online state; `useIsOnline()` for gating writes (NFR 09).
- `src/lib/analytics.ts` — consent-gated analytics boundary; dev sink only.
- `src/i18n/` — all user-facing strings (English only now, localization-ready).
- Root `ErrorBoundary` in `src/app/_layout.tsx` — never shows raw error text.

## Troubleshooting

- **`FATAL ERROR: Zone Allocation failed - process out of memory`** when PGlite starts (tests or `api:dev`): the
  machine is low on free memory and V8's optimizing WASM compiler can't allocate. Tests already pass
  `--liftoff-only`. For the dev server either free memory, use Docker Postgres (`npm run db:up` + `DATABASE_URL`),
  or run `npx tsx --liftoff-only apps/api/src/server.ts`.
- **Metro OOM on `expo export`**: add `--max-workers 1`.
- **Duplicate React** reported by `npx expo-doctor`: root `package.json` pins `react`/`react-dom` via `overrides` to the
  SDK version. Keep them in step with `apps/mobile` when upgrading Expo.
