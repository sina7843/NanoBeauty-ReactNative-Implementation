# NANO-05 — Account, privacy, inbox and deletion

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-05 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement ACC-01–10 and related PRIV requirements.
- Account/profile editing with phone re-verification where identity changes.
- Notification/marketing preferences with transactional vs optional marketing separation.
- In-app inbox/message detail for important transactional messages.
- Privacy hub, data access/export request, consent history as appropriate, and account deletion flow: explanation -> identity confirmation -> request -> pending/completed state.
- Backend deletion workflow must explicitly distinguish delete, retain and deidentify categories; do not fake immediate deletion when retention applies.
- Prepare the contract for Google Play web deletion request page; the actual release endpoint/page may be finalized in NANO-11.
- Permission prompts occur only in context and have alternatives where practical.
- Ensure sensitive treatment/medical content excluded by Requirements is not introduced into profile/support fields.

Acceptance: all account/privacy states are reachable, deletion is server-tracked, preferences persist, and protected personal data is not exposed in logs/analytics.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-05 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
