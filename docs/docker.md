# Local QA in Docker

`compose.docker.yaml` runs the whole stack: Postgres 17, the API (migrated on every start) and Metro
for the mobile app. It is for local QA (D-QA-07); the upstream `compose.yaml` (Postgres only) is unchanged.

```powershell
$env:NANO_LAN_IP = "192.168.1.10"   # this PC's IP as the phone sees it; default 127.0.0.1 (emulator: 10.0.2.2)
docker compose -f compose.docker.yaml up -d --build
```

| Service | Address | Notes |
| --- | --- | --- |
| postgres | 127.0.0.1:5432 | user/db `nano`, password `nano_dev_only` (development only) |
| api | http://localhost:4000 | `APP_ENV=development`, `DEV_OTP_SINK`, `DEV_SAMPLE_LEGACY`, `DEV_SAMPLE_FRESHA`, `DEV_SAMPLE_CLINIC` on |
| metro | http://localhost:8081 | Expo Go: `exp://<NANO_LAN_IP>:8081`; code is baked into the image, rebuild after edits |

- Sign-in codes: `GET http://localhost:4000/v1/dev/otp?phone=6045550123`. No SMS is ever sent.
- `EXPO_START_FLAGS` defaults to `--go` (Expo Go). Set it to an empty string to target a development build.
- Expo Go only: `EXPO_OFFLINE=1` (otherwise Expo Go waits on expo.dev before loading the bundle) and
  `EXPO_GO_STUB_NOTIFICATIONS=1`, which aliases `expo-notifications` to `docker/expo-go/expo-notifications-stub.js`
  because Expo Go on Android refuses that module since SDK 53. Push notifications need a development build.
- Phone on the same network: allow LAN traffic in any PC VPN/firewall. If Expo Go spins forever, swipe it
  out of recent apps and reopen it.
- Time zones come from the tz data bundled in Node's ICU (`node -p process.versions.tz`), not the image's OS
  `tzdata`. `node:22-bookworm-slim` (Node 22.23, tz 2026c) puts America/Vancouver on permanent UTC−7 from
  November 2026, while Node 24.13 (tz 2025c) still has PST, so a Vancouver winter instant differs by one hour
  between them. The code follows the runtime's data; `apps/mobile/src/staff/dates.test.ts` therefore asserts exact
  instants in America/Toronto and only round-trips Vancouver (D-N12-C9).
- Stop: `docker compose -f compose.docker.yaml down` (add `-v` to wipe the database).
