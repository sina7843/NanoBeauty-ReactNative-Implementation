# Release runbook (NANO-11)

Status: the repository is release-configured. **No cloud build has been run**: there is no Expo account, EAS project or
store account in this environment, and `eas-cli` isn't installed. Everything below that needs credentials is a step for
a person with those accounts.

## Profiles (apps/mobile/eas.json)

| Profile | Variant | Android | iOS | Distribution | Build numbers |
|---|---|---|---|---|---|
| `development` | development (`com.nanobeauty.app.dev`) | dev-client APK | dev client (device) | internal | remote |
| `development-simulator` | development | — | simulator build | internal | remote |
| `qa` | staging (`…app.staging`) | **installable APK** | ad hoc (registered devices) | internal | remote, auto-increment |
| `testflight` | staging | AAB → Play internal track | **TestFlight** | store | remote, auto-increment |
| `production` | production (`com.nanobeauty.app`) | **AAB → Google Play** | **App Store** | store | remote, auto-increment |

Marketing version: `version` in `apps/mobile/app.config.ts` (1.0.0). Build numbers (`buildNumber` / `versionCode`) live
on EAS (`appVersionSource: remote`) and increase on every store and QA build. OTA updates (expo-updates) are not used;
"channels" are the three variants, installable side by side.

## One-time setup (account owner)

1. `npm i -g eas-cli` then `eas login` (Expo account owned by the clinic or its agency).
2. In `apps/mobile`: `eas init` → note the project ID; set `EAS_PROJECT_ID` (and `EXPO_OWNER`) in your shell and as
   GitHub secrets `EAS_PROJECT_ID`, `EXPO_TOKEN` (an Expo access token).
3. Confirm the official bundle ID / package name, change `BASE_ID` in `app.config.ts` if they differ, and set
   `appIdsConfirmed: true` in `apps/mobile/release.json`.
4. Replace the placeholder API URLs (`*.invalid`) in `eas.json` with the hosted staging and production API.
5. `eas credentials` for each platform:
   - Android: let EAS generate the upload keystore; enrol in Play App Signing. Create a Play service account with
     release rights for `eas submit`.
   - iOS: App Store Connect API key (Admin or App Manager); EAS creates the distribution certificate and profiles. Push:
     EAS creates the APNs key (the app uses push notifications; `aps-environment` is `production` for store builds).
6. Create the apps in App Store Connect and Google Play Console with the confirmed IDs. TestFlight builds use the staging
   variant (`…app.staging`), which needs its own App Store Connect app record (or point `testflight` at production).
7. Host the API (TLS, Postgres, backups) and route `https://app.nanobeautystar.com/gift/*`, `/delete` and `/web/*` to it
   (WEB-01–04 pages are served by the API); set `domainConfirmed: true` in `release.json`.

## Build commands (each runs the release gate first)

```
npm run release:android:qa        # installable QA APK (internal distribution link)
npm run release:android:store     # Google Play AAB (production)
npm run release:ios:testflight    # TestFlight build (staging API)
npm run release:ios:store         # App Store build (production)
```

Or from GitHub: **Actions → Release build → Run workflow** (profile + platform). It runs `npm run check`, the release
gate, then `eas build --no-wait`. It never submits.

## Submit (explicit, by a person)

```
cd apps/mobile
eas submit --platform android --profile testflight --latest   # Play internal track, draft
eas submit --platform ios --profile testflight --latest       # TestFlight
eas submit --platform android --profile production --latest   # Play production, draft (release from the console)
eas submit --platform ios --profile production --latest       # App Store Connect, then submit for review there
```

## Release gate (`npm run release:gate -- <profile>`)

Refuses a build when: `EAS_PROJECT_ID` is missing; a staging/production API URL isn't https or is still a placeholder;
and, for store profiles, the app IDs aren't confirmed, the privacy/terms/support/account-deletion URLs are missing, the
link domain isn't confirmed or the App Review notes aren't ready.

## Store requirements checklist

| Item | Android | iOS | Status |
|---|---|---|---|
| App icon, adaptive icon, monochrome icon, splash | `assets/*` wired in `app.config.ts` | same | Done (ICN-01) |
| Permissions | INTERNET (+ notifications at runtime); storage, calendar, audio blocked | photo library (staff upload), calendar write-only, notifications | Done (`check-config` asserts) |
| Backups | `allowBackup: false`; secure store excluded | keychain | Done |
| Network security | release builds refuse non-https API (cleartext off by default) | ATS default | Done |
| Privacy manifest | — | `ios.privacyManifests` (UserDefaults CA92.1, data types) | Done; verify against Xcode privacy report after the first build |
| Account deletion in app | ACC-08–10 | ACC-08–10 | Done |
| Account deletion URL (Play) | `https://app.nanobeautystar.com/delete` (WEB-03/04) | — | Page built; domain/hosting blocked |
| Privacy policy URL | required | required | **Blocked** (R1, legal text) |
| Terms URL | — | recommended | **Blocked** (R1) |
| Support URL | required | required | **Blocked** (clinic) |
| Data safety form / App Privacy label | `privacy-and-sdks.md` | `privacy-and-sdks.md` | Draft ready; confirm with processors |
| Content rating questionnaire | answers in `listing.md` | age rating in `listing.md` | Draft ready |
| Export compliance | — | `usesNonExemptEncryption: false` (HTTPS only) | Done |
| Review notes and demo sign-in | `review-notes.md` | `review-notes.md` | Draft; needs `REVIEW_PHONE`/`REVIEW_CODE` on the API |
| Screenshots | plan in `listing.md` | plan in `listing.md` | Needs real clinic content (C5) |
| Associated domains / app links | not configured | not configured | Deferred: domain not confirmed; links fall back to the web pages |
| Leftover usage string | — | `NSLocalNetworkUsageDescription` from expo-dev-client (never prompted in store builds) | Accepted; remove expo-dev-client from store builds if review asks |
