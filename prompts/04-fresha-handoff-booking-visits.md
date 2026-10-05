# NANO-04 — Fresha hand-off booking and visits

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-04 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement the launch booking path with `settings.bookingMode = handoff` as default.
- Build service/laser-area multi-select basket, running total/duration warning, first-time “how booking works”, controlled Fresha hand-off/in-app-browser boundary and return-check states.
- Never mark a booking confirmed because a browser returned. Show checking/confirmed/not-yet/not-showing/support based only on authoritative integration/server evidence.
- Treat unknown Fresha prefill/sync capability honestly: if not available, show the supplied “not synced/Open Fresha” states instead of guessing.
- Visits: upcoming/history and detail, source/status, add-to-calendar action without broad calendar permission, rebook entry, Fresha change path and late-change/cancel request path to clinic queue.
- Implement server `VisitRequest` lifecycle and notifications hooks for submitted/approved/declined/call-needed states.
- In-app-only booking screens/routes remain unreachable in handoff mode.
- Add deep-link/re-entry/relaunch tests for handoff interruption and stale return tokens.

Acceptance: the full hand-off journey is recoverable and truthful; visits degrade gracefully when read-back is unavailable; no duplicate appointment is created by retries.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-04 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
