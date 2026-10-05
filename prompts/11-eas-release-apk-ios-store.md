# NANO-11 — Android APK/AAB, iOS/TestFlight and store release

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-11 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Prepare production release artifacts/configuration without inserting real credentials into the repository.
- Finalize Expo/EAS app config, bundle/package IDs from approved values if supplied, version/build numbering and dev/staging/prod channels.
- Android: prove/configure an installable QA APK profile and a Google Play AAB production profile; configure icons/splash, permissions, network/security behavior and Play account-deletion URL requirement.
- iOS: prove/configure EAS development/TestFlight/App Store profiles, entitlements/associated links/notification capability only where actually used, privacy manifests/disclosures as applicable, icons/splash and submission metadata checklist.
- Implement/host-ready the two allowed small web surfaces if not already present: gift claim and Google Play account-deletion request. Keep website redesign out of scope.
- Prepare store listing metadata/checklists, screenshots plan, reviewer notes/demo path, privacy-policy/terms/deletion/support URLs checklist, data-safety/privacy-label inventory and third-party SDK inventory.
- Add release commands/scripts and CI release gates. Do not auto-submit or expose credentials unless the user explicitly runs an authenticated release step.
- Run final typecheck/lint/tests and Expo/EAS config validation. If cloud build credentials are available in the user's environment, run the appropriate non-destructive build commands; otherwise report exact commands to execute and mark credential-dependent build as an external blocker rather than claiming success.
- Ensure Android release path includes both APK (QA) and AAB (store), and iOS path includes TestFlight/App Store.

Acceptance: repository is release-configured for Android and iOS, with exact build profiles and documented store blockers; every remaining blocker is external/credential/legal/provider-related rather than hidden implementation work.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-11 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
