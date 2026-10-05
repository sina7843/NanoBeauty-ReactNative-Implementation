# NANO-00 — Foundation, mobile/API architecture and build targets

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-00 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

First prove `git rev-list --all --count` is at least 1. If not, stop without implementation.

Build the greenfield repository foundation without overwriting protected starter/source files wholesale:
- Create a workspace/monorepo suitable for `apps/mobile`, `apps/api`, and shared packages such as contracts/config/testing/design-tokens where useful.
- Mobile: Expo + React Native + TypeScript + Expo Router. Establish dev/staging/prod app configuration, app identifiers/placeholders, environment validation, safe-area root, error boundary, query/client providers, localization-ready English strings, network status, and secure session storage boundary.
- API: TypeScript + Fastify and PostgreSQL by default, with schema migrations, health/readiness endpoints, structured non-sensitive logs, request IDs, validation, consistent error envelopes, graceful shutdown and test database strategy. If a real existing backend is present, preserve it and document deviation instead.
- Define typed contracts for settings/feature flags and implement cached settings bootstrap. Required flags/settings include bookingMode (handoff default), secondApprover.on=false, legacyMembership=false, payment-method switches, clinic info and rule settings represented in the handover.
- Add deterministic development adapters/interfaces for OTP/SMS, email, payment, push, analytics and Fresha/legacy integration boundaries. Do not invent live credentials or a Fresha booking API.
- Add local Docker Compose only for backend dependencies if useful. Never require Docker to render/run the mobile app.
- Add Expo/EAS configuration with three Android outcomes: development build, QA installable APK, store AAB; and iOS development/TestFlight/store profiles. Use placeholder bundle/package identifiers if the official IDs are not supplied, clearly documented.
- Add CI for install, typecheck, lint, unit/API tests and Expo config validation without requiring real secrets.
- Provide `.env.example` only; never read/create `.env`. Tell the user to run 06-CREATE-LOCAL-ENV.cmd if local values are required.
- Add scripts/documentation for Windows development and EAS cloud iOS builds.

Acceptance: mobile app and API can boot using safe local/test configuration; settings/flags load through a typed boundary; project has reproducible lockfile-based checks; no WebView implementation of the product exists.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-00 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
