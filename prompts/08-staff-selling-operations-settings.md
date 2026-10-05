# NANO-08 — Staff selling, operations, settings and reports

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-08 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement the remaining in-app staff workspace operations from M7.
- Campaign list/calendar/editor/preview/templates/Home ordering (max two) and promo codes.
- Packages and gift-card settings/actions including resend/change recipient/void/reissue with permission gates.
- Professionals bio/photo and consent status.
- Today/requests queue, late change/cancel handling, handoff instruction “move it in Fresha, then mark done” where relevant.
- Counter redemption for package session/gift amount with explicit confirm -> ledger mutation -> receipt; no optimistic decrement.
- Customer search/profile, legacy account-match review, support inbox/replies.
- Clinic info/hours, rules/settings, versioned policies, Home layout, payment method switches, booking mode, second approver and membership feature flags.
- Marketing push composer limited to opted-in audience (delivery occurs through NANO-09 infrastructure).
- Basic reports from real server data: booking starts/completions where available, campaign results, gift/package sales. Make unavailable metrics explicit rather than fabricated.

Acceptance: operational flows work with permission/audit/conflict rules, settings change future behavior without app rebuild, and customer value mutations reconcile correctly.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-08 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
