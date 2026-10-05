# Nano Beauty — React Native Implementation Decisions

Version: 1.0.0  
Prepared: 2026-10-06

## 1. Authority and precedence

When instructions conflict, implementation MUST use this order:

1. `IMPLEMENTATION_DECISIONS.md`.
2. `Requirements.md`.
3. `reference/nano-beauty-dev-handover-v1.2.1/docs/decisions-and-flags.md` and developer handoff/design-system specifications.
4. The currently active staged prompt in `prompts/`.
5. Existing repository conventions and tests.
6. A small documented assumption when none of the above resolves the issue.

Do not silently reinterpret pending client decisions. Implement them as configuration/feature flags exactly as described in the handover.

## 2. Product boundary

- Product: **Nano Beauty** customer + role-gated staff mobile app.
- Platforms: **iOS and Android** from one React Native codebase.
- Distribution: Apple App Store and Google Play.
- Website redesign is out of scope. Only the two required lightweight web endpoints/pages (gift claim and Android account-deletion request) may be implemented when needed for release compliance.
- English-only launch; architecture must remain localization-ready.
- Portrait phone is primary. Staff long forms must support the documented tablet layout.
- This is a real native mobile application, not a website wrapper.

## 3. Approved mobile stack

- React Native with **Expo**, TypeScript and **Expo Router**.
- Use Expo development builds when a native module requires them; do not eject/prebuild permanently without a demonstrated requirement.
- EAS Build/Submit is the release path. Android release profiles must support Play-ready AAB and an installable QA APK profile. iOS release must produce an App Store/TestFlight build.
- One app package contains customer and role-gated staff experiences.
- Server state: TanStack Query unless the repository already establishes an equivalent during NANO-00.
- Forms: React Hook Form + schema validation unless a smaller equivalent is justified and recorded.
- Local non-secret state: lightweight store only where server state is inappropriate.
- Secure secrets/tokens: platform secure storage. Never AsyncStorage for authentication tokens.
- Navigation, safe areas, keyboard handling, system back, predictive back, Dynamic Type/font scaling, VoiceOver/TalkBack and reduced-motion behavior must be first-class.

## 4. Design implementation

- `reference/.../design-system/export/nano-tokens.ts`, `tokens.dtcg.json`, component specs, routes and screen index are implementation sources.
- Recreate the supplied visual system natively. Do not ship the HTML canvas prototype inside a WebView.
- Match both light and dark themes and documented iOS/Android behavior.
- Use Fraunces and Sora only through properly licensed project assets supplied by the project owner. Font binaries are intentionally not bundled in this implementation starter package; NANO-01 must fail gracefully to documented system fallbacks until the owner adds licensed font files locally.
- No Liquid Glass/live blur is required. Preserve the handover's opaque protected surfaces and truth-first states.

## 5. Backend and contracts

The requirements need a clinic-owned server for settings, staff permissions, content, ledgers, support, audit and integration boundaries. Use a TypeScript backend in the same repository unless an existing production backend is connected before NANO-00.

Default for a greenfield implementation:
- Node.js LTS + TypeScript + Fastify.
- PostgreSQL with migrations and transactions for customer value, payments, gift cards, packages and audit records.
- OpenAPI-compatible HTTP JSON contracts shared through generated or typed schemas.
- Separate dev/staging/prod configuration.
- Docker Compose may be used for local API/database services; it is not required to run the mobile app itself.

If the project owner supplies an existing backend, preserve its contracts and record any stack deviation in `DECISIONS.md` rather than replacing it.

## 6. Integration policy

- **Fresha:** controlled hand-off is default (`settings.bookingMode = handoff`). Do not invent a booking API. In-app booking routes stay inaccessible unless a supported booking API is formally selected.
- **Payments:** integrate only through provider adapters. Never collect/store raw card data. Card, Apple Pay, Google Pay, Klarna and Affirm visibility comes from server settings and actual provider capability.
- **OTP/SMS, email, push, analytics, crash reporting:** provider adapters with deterministic development/test substitutes are required until live vendors and credentials are approved.
- Do not make live network calls to an unapproved merchant, SMS or legacy system using guessed credentials.
- A return from Fresha is not booking success. Only authoritative sync/server confirmation may show confirmed.

## 7. Pending decisions as configuration

Preserve these source decisions:
- D33: `settings.bookingMode = handoff | inapp`, default `handoff`.
- D34: server-side permission map; UI asks permissions, not hard-coded role names.
- D35: `settings.secondApprover.on`, default `false`; publish-with-confirm is normal path.
- D38: `features.legacyMembership`, default `false`.
- D36/D37/D39/D40 are implemented as confirmed in the handover.

## 8. Data, privacy and truthfulness

- No optimistic success for booking, payment, redemption, claim, refund, balance or staff publication that depends on a server/system-of-record response.
- Financial and entitlement mutations must be idempotent and auditable.
- Sensitive clinical data listed as excluded in Requirements MUST NOT be introduced by convenience.
- Marketing consent is separate and off by default.
- Authentication, deletion, export, staff permissions, audit history and conflict handling are server-enforced.
- Archive rather than delete for previously customer-visible/used business content; only eligible drafts may be deleted.

## 9. Testing baseline

Each prompt must add tests at the closest useful layer. Before release, cover:
- unit/domain rules;
- API contract/integration tests;
- mobile component and navigation tests;
- end-to-end critical customer and staff journeys on iOS and Android test targets;
- accessibility checks plus manual VoiceOver/TalkBack pass;
- interrupted/offline/retry/error states;
- payment idempotency and ledger reconciliation;
- role/permission enforcement;
- deep links and notification routing;
- upgrade/migration smoke tests.

## 10. Delivery and prompt policy

- Execute exactly one `NANO-00` … `NANO-11` prompt at a time, in order unless a prompt explicitly permits a gated skip.
- There are **12 implementation prompts total**. Do not split them into hidden implementation slices.
- A prompt may complete only after relevant checks actually pass or blockers are explicitly recorded.
- Update `PROJECT_STATUS.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md` and traceability when their recorded facts change.
- Keep canonical source files protected during implementation.
