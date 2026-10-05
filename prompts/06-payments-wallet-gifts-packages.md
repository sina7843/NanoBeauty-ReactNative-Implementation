# NANO-06 — Payments, wallet, gift cards and packages

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-06 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement PAY and WALT v1 behavior with provider adapters and transactional server rules.
- Payment method list is server-configured: card, Apple Pay, Google Pay, Klarna, Affirm only when approved/enabled. No unverified financing promises.
- In handoff mode, booking deposits stay in Fresha; in-app app payments cover packages/gifts and other explicitly approved commerce.
- Implement payment attempt lifecycle: method selection, provider handoff/native wallet boundary, waiting, success, decline, cancel, timeout, retry/reconciliation and receipt/refund states.
- Require idempotency keys and server-side duplicate-callback protection. Never store raw card data.
- Build Wallet: clinic credit, owned packages/session balance, gift cards/balance, history, receipt, discrepancy/help.
- Package purchase and redemption eligibility; archived products remain usable by existing owners per policy.
- Gift flow: occasion design -> value -> recipient/message/schedule -> review/payment -> status/claim; no expiry per source requirement. Implement in-app claim contract and API/web contract for recipient without app.
- Implement immutable ledger entries and counter-redemption-compatible APIs; compute/reconcile balances from authoritative ledger.
- Membership UI exists only behind `features.legacyMembership=false` by default.

Acceptance: deterministic test provider proves success/failure/timeout/duplicate callback/refund cases without double charge or balance drift; wallet reflects server-confirmed ledger only.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-06 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
