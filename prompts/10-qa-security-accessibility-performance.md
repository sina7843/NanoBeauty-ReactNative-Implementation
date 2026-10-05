# NANO-10 — Cross-platform QA, hardening and migration readiness

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-10 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Perform a release-candidate hardening pass across the implemented app/API.
- Build a requirements/board coverage audit against Requirements.md, screen-index/routes, decisions-and-flags and all NANO prompts; close implementation gaps that are in v1 and record genuine external blockers.
- Add/finish automated tests for critical customer and staff journeys, API contracts, permissions, idempotency, ledger reconciliation, settings flags, edit conflicts, offline/interruption and deep links.
- Accessibility: scalable text, labels, focus/order, contrast tokens, touch targets, reduced motion, VoiceOver/TalkBack manual checklist.
- Cross-platform: iOS safe areas/back/sheets/keyboard and Android edge-to-edge/predictive back/system bars/keyboard behavior. Verify tablet staff forms.
- Performance budgets for startup/screen/image/search/API; remove obvious render/network regressions and oversized unoptimized assets.
- Security/privacy: dependency audit, secret scan, authorization review, rate limits, token/session handling, sensitive log/analytics review, upload validation, transport assumptions and least privilege.
- Migration/legacy readiness: inventory/mapping/reconciliation/cutover/rollback/support artifacts required by LEG 01–08; do not claim real migration completion without actual export/data.
- Ensure cached/offline content never allows transactional mutation without confirmed connectivity.

Acceptance: produce a concrete release-readiness report with pass/fail/blocker evidence, not generic assurances; no critical v1 defect remains unrecorded.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-10 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
