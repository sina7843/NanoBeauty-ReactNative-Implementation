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

## Account, privacy, inbox and deletion (NANO-05)

- **Screens:** `/account` (ACC-01), `/account/profile` (ACC-02), `/account/notifications` (ACC-03), `/account/inbox` and
  `/account/inbox/[id]` (ACC-04/05), `/account/privacy` (ACC-06, consent history inline), `/account/data-request`
  (ACC-07), `/account/delete` (ACC-08 → 09 → 10).
- **Endpoints:** `GET`/`PUT /v1/me/preferences`, `POST /v1/me/phone/start` and `/verify`, `GET /v1/me/inbox`,
  `GET /v1/me/inbox/:id` (marks read), `GET /v1/me/consents`, `GET`/`POST /v1/me/data-requests`,
  `GET /v1/me/deletion/preview`, `POST /v1/me/deletion/start`, `POST /v1/me/deletion`, `POST /v1/me/deletion/cancel`;
  public `GET /v1/privacy/deletion/:token`, `POST /v1/privacy/deletion/start` and `/confirm` (contract for WEB-03/04).
- **Codes:** phone change and deletion use the same code rules and limits as sign-in (`startCode`/`checkCode` in
  `auth/routes.ts`). A new number is saved only after its own code is verified.
- **Deletion:** a verified request is `pending` for `settings.deletionGraceDays` (Sample 30), every session ends at
  once, and a text confirms it. Signing in again during the grace period shows "Keep my account". `runDueDeletions`
  (hourly in `server.ts`) then deletes, deidentifies and retains exactly per `DELETION_PLAN` in `account/routes.ts`,
  marks the request completed and texts the completion notice. **Adding a table that holds customer data means adding
  it to the plan and to `carryOutDeletion`.**
- **Inbox:** customer notifications (`notifications`, audience `customer`) are the inbox; wording per template is in
  `INBOX` (`account/routes.ts`). Unknown templates are not shown.
- **Logs and analytics:** request logs carry method, URL and status only (no bodies); `authorization` and cookies are
  redacted. Account URLs never contain phone numbers or emails. The only account analytics event is
  `account_deletion_requested { route }`.

## Payments, wallet and gift cards (NANO-06)

- **Flow:** WAL-07 package or WAL-13 → 08 → 09 → 10 gift → `POST /v1/orders` (idempotency key) → PAY-01
  `/pay/method?order=` → `POST /v1/orders/:id/attempts` → card (`/pay/card`, device tokenises), Apple/Google Pay sheet,
  or Klarna/Affirm (`/pay/provider`, hosted page) → `/pay/status` (polls; "still checking" after 30 s) →
  `/pay/receipt/[id]`.
- **Test cards (development provider):** `4242` succeeds, `0002` declined, `9995` insufficient funds, `3155` bank
  check stays open, `0341` never answers (last four digits; any expiry/CVC/postal). Only the token
  (`tok_visa`, `tok_decline`, …) reaches the API. Klarna/Affirm intents wait until the dev provider settles them
  (`createDevIntegrations().paymentControl.settle(ref, outcome)` in tests; there is no live page).
- **Webhooks:** `POST /v1/payments/webhook` with `x-provider-signature` (HMAC-SHA256 over the raw body). Events are
  de-duplicated by `eventId` and only make the API re-read the provider. The dev secret is a development-only
  constant; a live provider brings its own secret through configuration.
- **Money and ledger:** integer cents. Balances are always `SUM(ledger_entries)`; the table is append-only (DB
  trigger). Never update a balance; add an entry.
- **Gifts:** codes are created when the gift is sent, texted with `https://app.nanobeautystar.com/gift/<code>` (host to
  be decided) and stored only as hashes. Scheduled sends and stale payments are processed every minute
  (`server.ts`).
- **Staff APIs (screens in NANO-07/08):** `GET /v1/staff/lookup?code=|phone=` (`value.lookup`),
  `POST /v1/staff/redemptions` (`value.redeem`), `POST /v1/staff/adjustments` (`value.adjust`, Owner),
  `POST /v1/staff/payments/:attemptId/refunds` (`payments.refund`, Owner).
- **Settings:** `paymentMethods` switches, `gift.presetsCAD`, `gift.customRangeCAD`, `gift.designs`. Packages live in
  the `packages` table (sample list).

## Staff workspace and content governance (NANO-07)

- **Open it:** sign in with a number that has a staff role (grant one in dev with the `staff_roles` INSERT above, or
  invite it from Team), then Account → **Staff workspace** (`/staff`). Customers never see the row or the routes.
- **Roles → permissions (D34):** Owner = everything; Editor = `content.draft` (draft and submit, never publish);
  Front desk = no content. The server checks every `/v1/staff/*` call; a 403 opens STF-14.
- **Editing:** staff edit a draft; customers keep the live version until publish. Every write sends `version`; a stale
  one gets 409 and the app shows "Someone else changed this" with **Load the latest version**. A failed save keeps
  the edits on the phone (`nano.staff.unsaved.service.<id>`). Offline is read only.
- **Publishing:** Owner → confirm dialog → live. Editor → Submit → STF-08 queue. With `secondApprover.on` (settings),
  a price change waits for someone other than the submitter.
- **Archive rules (D36):** published services/categories archive (never delete); never-published drafts delete;
  categories with treatments are blocked until they move; media deletes only as an unused draft.
- **Media:** upload JPG/PNG/WebP ≤ 5 MB; usable after alt text + rights confirmed; reference it in a service as
  `media:<id>`; customers load usable photos from `GET /v1/media/:id`.
- **Import:** Services → Import list → choose a CSV (header row) → match columns → review → resolve duplicates →
  Publish (Owner) or Submit (Editor). Prices like `From $250`, `$50 per area`, `$300–$500`, `Consultation` are read.
- **Tablet (D39):** at 768 pt (iOS) / 600 dp (Android) wide, STF-03, STF-40 and STF-42 show the form on the left and
  preview/actions on the right.
- **Endpoints:** `/v1/staff/services[/:id[/draft|submit|publish|archive|restore|delete|move]]`,
  `/v1/staff/categories[/:id[/archive|restore|delete]]`, `/v1/staff/approvals[/:id/decide]`, `/v1/staff/media[/:id[/…]]`,
  `/v1/staff/imports[/:id/mapping|review|decisions|publish|submit]`, `/v1/staff/team[/invites|/:id/roles|/:id/remove]`,
  `/v1/staff/audit`, `/v1/staff/summary`, public `GET /v1/media/:id`.

## Staff selling, operations, settings and reports (NANO-08)

- **Roles:** Owner = everything; Editor drafts and submits services, packages, campaigns, promo codes, professionals
  and policies (never publishes); Front desk = Today, requests, redeem, lookup, customers, account checks, inbox, gift
  resend/change recipient.
- **Selling items** follow the services model (version, draft, submit/publish, approvals, archive rules). New packages
  and promo codes are drafts customers can't buy or use until published; campaigns start from a template (last year's
  dates moved forward) and can be paused, ended or reused for next year.
- **Settings** (clinic, rules, gift settings, Home layout) save against `/v1/settings` `version`; a stale copy gets 409.
  Apps see changes on their next settings fetch (ETag), no rebuild.
- **Counter redemption:** `/staff/redeem` → find by mobile or gift code → choose → amount → confirm. The ledger
  changes only on confirm; the receipt is the server's answer.
- **Push:** `/staff/push` schedules a message for customers who said yes to offers; nothing is delivered until NANO-09.
- **Endpoints:** see IMPLEMENTATION_STATUS.md → "Staff selling and operations".

## Notifications, analytics and deep links (NANO-09)

- **Delivery:** every minute the API queues reminders (only if `settings.reminderSender = app`), dispatches the
  outbox and sends due marketing pushes. Dev adapters capture messages in memory; nothing leaves the machine.
- **Delivery state:** `notification_deliveries` (one row per recipient and channel: sent / failed / skipped + reason).
- **Push on a phone:** needs notification permission and an EAS project ID (`extra.eas.projectId`) for the Expo push
  token; without one the app doesn't register and the inbox still works.
- **Analytics:** `apps/mobile/src/lib/analytics.ts` holds the event map; unmapped events/properties are dropped. Usage
  events need the ACC-06 opt-in. The dev sink logs in dev builds only.
- **Links:** `nanobeauty-dev://visits/<id>` (dev variant) or `https://app.nanobeautystar.com/<path>` (once app links are
  configured). Check a link with `resolveLink()` in `src/navigation/links.ts`.
- **In-app booking:** stays off. `bookingMode = inapp` is ignored until a booking provider adapter is selected (D33).

## Release checks (NANO-10)

- `npm run release:audit` — requirement/route coverage summary + secret scan (part of `npm run check`).
- `node scripts/audit-coverage.mjs > docs/release/coverage.md` — full coverage report.
- `npm run reconcile -w @nano/api` — ledger reconciliation against a real database (`DATABASE_URL`).
- `npm run bench -w @nano/api` — in-process API latency against budgets.
- Readiness and blockers: `docs/release/readiness.md`; device checklist: `docs/release/manual-qa.md`.

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
