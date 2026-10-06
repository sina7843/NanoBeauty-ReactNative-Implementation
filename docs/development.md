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

## Design system (NANO-01)

- **Tokens:** `packages/design-tokens` is a verbatim copy of the handover `export/nano-tokens.ts`. `npm test` fails if it
  drifts; re-copy with `npm run sync -w @nano/design-tokens` after a design change. Components use semantic roles only.
- **Theme:** `src/theme/ThemeProvider` follows the OS light/dark setting. `useTheme()` gives `colors`, `type(style)` and
  `elevation`; `<Text variant tone strong>` applies typography. Serif display styles cap at 1.3× font scale.
- **Fonts (optional, owner-supplied):** drop licensed static TTFs into `apps/mobile/assets/fonts/` with the names in
  that folder's README and restart Metro with `--clear`. Missing files fall back to system faces (Georgia/serif and
  the platform sans) with the same size, line height and weight. Nothing is downloaded automatically.
- **Components:** `src/components` (Button, IconButton, Badge/RoleBadge/SampleBadge, Banner, Card, ListRow/ListGroup,
  TextField, Switch, Chip, SegmentedControl, Sheet, Dialog/ConfirmDialog, Toast, Skeleton, EmptyState, AsyncStatus,
  PriceTag, PhotoFrame, Logo, StaffBar, PermissionNotice, TabBar, Screen, Icon).
- **Showcase:** open `/dev` in a development or staging build (deep link `nanobeauty-dev://dev`). It renders every
  component and state with a Light/Dark/System switch. Production builds redirect `/dev` to Home.
- **Platform boundaries:** `src/platform/haptics.ts` (selection/confirmed/failed roles), `calendar.ts` (iOS write-only
  event sheet, Android insert intent), `otp.ts` (one-time-code autofill props), `notifications.ts` (OS permission only).
- **Navigation:** Option B tabs in `src/app/(tabs)`; `book/` and `pay/` are modal stacks; routes for the other booking
  mode redirect to Home with "Link not found"; unknown links do the same (`+not-found`). Entry gates (`/`) read
  `app.minimumVersion` / `app.maintenance` from `/v1/settings`.
- Deviations from the boards are listed in `docs/deviations.md`.

## Sign-in and sessions (NANO-02)

- **Try it locally:** in your own `.env` set `DEV_OTP_SINK=true` and `DEV_SAMPLE_LEGACY=true`, start the API, open the
  app, tap **Sign in**, enter a number, then read the code with `curl "http://localhost:4000/v1/dev/otp?phone=6045550123"`.
  Codes exist only in that dev sink, never in logs. `(604) 555-0123` with the name Maria Chen shows a matched sample
  account; `(604) 555-0199` shows a mismatch; any other number shows "not found".
- **Endpoints:** `POST /v1/auth/otp/start`, `POST /v1/auth/otp/verify`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`,
  `GET /v1/me`, `POST /v1/me/consents`, `PUT /v1/me/profile`, `POST /v1/me/legacy-match`,
  `POST /v1/me/legacy-match/decision`; staff `GET /v1/staff/match-cases` and `POST /v1/staff/match-cases/:id/resolve`
  (permission `accountMatch.resolve`).
- **Limits** (`apps/api/src/auth/session.ts → LIMITS`): code valid 5 min; resend after 30 s; 5 codes per hour per
  number; 3 tries per code, then codes pause for 10 min; access token 15 min; customer session 30 days; staff 12 h;
  20 requests/min per client address on the unauthenticated auth routes.
- **Tokens:** opaque random tokens; only SHA-256 hashes are stored. Refresh tokens are single-use, and presenting a
  rotated one revokes the whole session. The app keeps tokens only in expo-secure-store and refreshes once per expiry.
- **Permissions:** `role_permissions` (data, D34) → `/v1/me.permissions`. Mobile checks `useAuth().can('…')`, never
  role names. Giving everyone full access (the owner's D34 direction) means granting the Owner role — no code change.
- **Grant a staff role in dev:**
  `INSERT INTO staff_roles (customer_id, role) SELECT id, 'Owner' FROM customers WHERE phone_e164 = '+16045550123';`

## Booking hand-off and visits (NANO-04)

- **Mode:** `settings.bookingMode` (default `handoff`, D33). In-app booking routes (`/book/professional`, `/time`,
  `/details`, `/review`, `/result`, `/basket`, `/visits/[id]/reschedule`) redirect to Home with "Link not found".
- **Flow:** BKG-01 basket (`/book/service`, laser → BKG-10 `/book/areas`) → BKG-12 `/book/how-it-works` (skipped once
  "Don't show this again" is on) → BKG-08 `/book/fresha` → system in-app browser (`expo-web-browser`) → BKG-09
  `/book/fresha-return?handoff=…`. Guests are asked to sign in at BKG-08 and come back there.
- **Truth rule (BOOK 16):** the return check is `confirmed` only when the server sees a Fresha booking first seen
  *after* the hand-off was created and not claimed by another hand-off; existing bookings never count. Without a
  Fresha read-back, after a Fresha error, or after the 24 h hand-off lifetime it is "not yet". Fresha is read at most
  every 15 s per customer; the app polls every 3 s while "checking" (90 s from the first check).
- **Recovery:** the hand-off id is stored (`nano.private.handoff`, AsyncStorage, id only) before Fresha opens; a
  relaunch within 2 h reopens the return check. Unknown, expired or malformed links land on Home.
- **Try it locally:** set `DEV_OTP_SINK=true`, `DEV_SAMPLE_FRESHA=true` and `FRESHA_BOOKING_URL=https://…` in your own
  `.env`, sign in as `(604) 555-0123` and open Visits. The sample has a confirmed HIFU visit, a pending laser visit and a
  completed past visit. API tests simulate a new Fresha booking via `createDevIntegrations().freshaBookings`.
- **Endpoints:** `GET /v1/visits`, `GET /v1/visits/:id`, `POST /v1/bookings/handoffs` (idempotency key),
  `GET /v1/bookings/handoffs/:id`, `POST /v1/visits/:id/requests` (idempotency key; one open request per visit),
  staff `GET /v1/staff/requests` and `POST /v1/staff/requests/:id/transition` (permission `requests.manage`).
- **Notifications:** hooks write to the `notifications` outbox (`NTF-11.request_needs_you` to staff;
  `visit_request_submitted`, `NTF-03.visit_request_approved`, `visit_request_declined`, `visit_request_call_needed` to
  the customer). Delivery (push/text/email, consent, quiet hours) is NANO-09.
- **Device data:** visits are cached for offline reading under `nano.private.*` and wiped on sign-out or session expiry.

## Troubleshooting

- **`FATAL ERROR: Zone Allocation failed - process out of memory`** when PGlite starts (tests or `api:dev`): the
  machine is low on free memory and V8's optimizing WASM compiler can't allocate. Tests already pass
  `--liftoff-only`. For the dev server either free memory, use Docker Postgres (`npm run db:up` + `DATABASE_URL`),
  or run `npx tsx --liftoff-only apps/api/src/server.ts`.
- **Metro OOM on `expo export`**: add `--max-workers 1`. If `hermesc.exe` exits with a large negative code, it ran
  out of memory; close other Node processes and retry.
- **Jest workers killed (heap / Zone allocation)**: the mobile `test` script caps workers at 2; use `npx jest -i`
  on very low memory.
- **Duplicate React** reported by `npx expo-doctor`: root `package.json` pins `react`/`react-dom` via `overrides` to the
  SDK version. Keep them in step with `apps/mobile` when upgrading Expo.
