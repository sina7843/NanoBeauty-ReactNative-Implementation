# EAS builds (Android APK/AAB, iOS from Windows)

Builds run in Expo's cloud, so iOS builds work from Windows without Xcode. All commands run in `apps/mobile`
(`npx eas-cli@latest <command>`). No credentials, keystores or Apple keys are stored in this repository.

## One-time setup (project owner)

1. Create or join the Expo account/organisation that will own the app, then `npx eas-cli@latest login`.
2. `npx eas-cli@latest init` to create the EAS project. Because `app.config.ts` is dynamic, set the printed ID as
   `EAS_PROJECT_ID` (and the account as `EXPO_OWNER`) in your shell or as EAS environment variables instead of editing
   JSON. Do not commit tokens.
3. **Replace placeholder identifiers.** `com.nanobeauty.app` (+ `.dev` / `.staging`) is a placeholder; the client must
   own the real bundle ID and package name (Requirements → Store submission). Change `BASE_ID` in `app.config.ts`.
4. **Replace placeholder API URLs** in `eas.json` (`*.nanobeauty.invalid`) when hosting exists. Until then, staging and
   production builds install and run but show the settings error state.
5. Credentials: let EAS manage the Android keystore and iOS certificates/profiles (`eas credentials`). iOS device
   builds need an Apple Developer account under the clinic's legal entity (open-items R3).

## Profiles

| Profile | Variant / ID | Android output | iOS output | Use |
| --- | --- | --- | --- | --- |
| `development` | development · `….dev` | APK with dev client | Internal (registered devices) dev client | Daily development with Metro |
| `development-simulator` | development · `….dev` | APK with dev client | Simulator build | iOS Simulator (needs a Mac to run it) |
| `qa` | staging · `….staging` | **Installable APK** | Internal ad hoc | QA side-loading |
| `testflight` | staging · `….staging` | AAB (Play internal track) | Store-signed → **TestFlight** | Pre-release testing |
| `production` | production · `com.nanobeauty.app` | **AAB for Google Play** | Store-signed → **App Store** | Release |

```bat
cd apps\mobile
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile qa --platform android          :: QA APK
npx eas-cli@latest build --profile testflight --platform ios
npx eas-cli@latest submit --profile testflight --platform ios     :: upload to TestFlight
npx eas-cli@latest build --profile production --platform all      :: AAB + App Store build
npx eas-cli@latest submit --profile production --platform android
```

For iOS internal builds register test devices first: `npx eas-cli@latest device:create`.
Version numbers are managed remotely (`appVersionSource: remote`, `autoIncrement` on store profiles).

## Checks without an Expo account

`npm run config:check -w @nano/mobile` resolves the config for every variant and EAS profile and fails if identifiers,
build types or the API-URL rule drift. It runs in CI with no secrets. Release hardening, store metadata and submission
are NANO-11.
