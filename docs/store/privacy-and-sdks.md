# Privacy disclosures and SDK inventory (draft for the store forms)

Draft from the code as built (NANO-11). Confirm with the clinic's privacy notice (R1) and the chosen vendors (E3–E5)
before filling in App Store Connect and Play Console. No data is used for tracking or advertising; nothing is sold.

## Data the app collects

| Data | Why | Linked to the person | Shared with (processors) | Optional | Deletion |
|---|---|---|---|---|---|
| Mobile number | Sign-in (OTP), booking and receipt texts | Yes | SMS provider (E3, tbd) | No | Deleted on account deletion (ACC-10) |
| Name | Profile, clinic matching | Yes | — | No (first/last name asked) | Deleted |
| Email | Receipts, data export | Yes | Email provider (E5, tbd) | Yes | Deleted |
| Purchase history (packages, gift cards, refunds) | Wallet, receipts, refunds | Yes | Payment provider (R03, tbd) | Only if buying | Retained as financial records, de-identified (PRIV 04, legal to confirm) |
| Payment info | — the app never sees card numbers; the provider tokenises on the device | — | Payment provider | — | — |
| Visits (from Fresha read-back, when connected) | Visits tab, reminders | Yes | Fresha (clinic's booking system) | — | Deleted from the app |
| Customer support messages | Ask us, replies | Yes | SMS/email provider for replies | Yes | Deleted |
| Gift recipient name and mobile | Deliver the gift card | Yes (buyer) | SMS provider | Only if sending a gift | Removed after delivery when the buyer deletes their account |
| Push token (device ID) | Notifications | Yes | Push service (Expo/APNs/FCM) | Yes (permission) | Deleted on sign-out/deletion |
| Consent records | Legal evidence (PRIV 02) | Yes | — | No | Retained, de-identified |
| Product interaction (usage analytics) | Improve the app | No (no ids, names or free text) | Analytics vendor (E5, tbd) | Yes, opt-in (ACC-06) | — |
| Crash data | Fix errors | No (redacted) | Crash vendor (E5, tbd) | — | — |

Not collected: location, contacts, photos of customers, health or medical data, browsing history, advertising ID.
Staff only: photos they upload for treatments (media library, with rights confirmed).

### Google Play data safety (mapping)

- Personal info: name, email, phone number → collected, not shared beyond processors, app functionality and account
  management, user can request deletion.
- Financial info: purchase history → collected, app functionality; card data handled by the payment provider.
- Messages: customer support → collected, app functionality.
- App activity: app interactions → collected only with opt-in, analytics, not linked.
- App info and performance: crash logs → collected, app functionality.
- Device or other IDs: push token → collected, app functionality.
- Data encrypted in transit: yes. Account deletion: in app and at the deletion URL.

### Apple App Privacy label (mapping)

Contact info (name, email, phone), Purchases (purchase history), User content (customer support), Identifiers (user ID,
device ID) → *Data linked to you*, purpose App Functionality. Usage data (product interaction) and Diagnostics (crash
data) → *Data not linked to you*, purposes Analytics / App Functionality. Tracking: none. Matches
`ios.privacyManifests` in `app.config.ts`.

## Third-party SDKs in the app binary

| SDK | Purpose | Data it handles | Network |
|---|---|---|---|
| Expo SDK (expo, expo-router, expo-constants, expo-application, expo-font, expo-linking, expo-system-ui, expo-status-bar, expo-splash-screen, expo-haptics) | App framework | none of the person's data | Expo dev tooling only in dev builds |
| expo-notifications | Push permission and tokens | push token | Expo push service → APNs / FCM |
| expo-secure-store | Session tokens in Keychain/Keystore | session tokens (on device) | none |
| @react-native-async-storage/async-storage | Cached public content, drafts, pending hand-off | non-secret app data (on device) | none |
| @react-native-community/netinfo | Online/offline state | connectivity only | reachability probe (OS) |
| expo-calendar | Add a visit to the calendar (write-only / insert intent) | the visit the person chooses to add | none |
| expo-image-picker, expo-document-picker | Staff photo upload, catalogue CSV import | files the staff member picks | uploaded to our API only |
| expo-web-browser, expo-intent-launcher | Fresha hand-off, hosted payment pages, system settings | none | opens the provider's page |
| @react-native-community/datetimepicker | Gift send time | none | none |
| @tanstack/react-query, zod, react, react-native, react-native-screens, react-native-safe-area-context, react-native-svg, phosphor-react-native | UI and data plumbing | none | none |
| expo-dev-client | Linked in every build; its launcher runs only in development builds. It adds `NSLocalNetworkUsageDescription` to Info.plist (never prompted in store builds) | — | local network in dev only |

Not included yet (vendors not chosen): payment SDK (R03), analytics SDK and crash reporter (E5). Each adds a row here
and an update to the privacy label when chosen.
