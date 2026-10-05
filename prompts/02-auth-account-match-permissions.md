# NANO-02 — Authentication, legacy account match and secure sessions

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-02 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement AUTH 01–11 and AUT-01–08 behavior needed for v1.
- Guest browsing must remain possible.
- Implement phone-number registration/sign-in with 6-digit OTP, resend timer, wrong/expired code, rate limits, recovery/session expiry, logout and secure token rotation/storage.
- Keep terms acknowledgement, transactional messaging and optional marketing consent separate and auditable with version/time.
- Implement returning-customer legacy match states: matched, mismatch, not found and support/staff resolution path without silently moving value.
- API owns identity, session revocation, consent records and staff permission map. Mobile renders capabilities from permissions; never hard-code authorization by role label.
- Biometric re-entry may be implemented only after a valid authenticated session and must fall back safely.
- Add test adapters so OTP values are visible only in a dedicated development/test sink, never ordinary logs.
- Cover offline/timeout/rate-limit/replay/expired-session cases.

Acceptance: a guest can browse, a test user can complete OTP auth end-to-end, server permissions are enforced, and legacy match never duplicates/moves customer value without confirmed rules.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-02 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
