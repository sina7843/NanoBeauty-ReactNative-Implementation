# NANO-09 — Notifications, analytics, deep links and conditional in-app booking

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-09 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement cross-cutting notification/analytics behavior and evaluate the D33 in-app booking gate.
- Implement NTF-01–12 templates/contracts across approved channels using adapters, preferences, quiet hours, transactional vs marketing distinction, delivery state and safe deep links.
- Enforce one reminder sender: app OR Fresha according to setting/decision; prevent duplicate reminders.
- Implement privacy-conscious analytics event map and funnels with consent gate; no personal/sensitive data in event properties.
- Crash/error telemetry boundary must redact secrets and personal data.
- Verify every supported deep link from notifications/offers/gifts/account/payment; unknown/expired links fail safely.
- D33 gate: inspect current DECISIONS/open-items. If and only if a supported booking API/provider has been formally selected and documented, implement BKG-02–07, BKG-11, VIS in-app reschedule/cancel and related staff appointment paths behind `bookingMode=inapp`. Otherwise DO NOT invent it: keep routes unreachable, add contract/tests proving the gate, and record NANO-09 as complete with the conditional scope intentionally skipped.

Acceptance: notifications/analytics are end-to-end testable with adapters, consent is respected, reminder duplication is prevented, and in-app booking cannot accidentally activate without an approved provider.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-09 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
