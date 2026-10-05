# NANO-07 — Staff workspace core and content governance

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-07 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement staff foundation and the M6 content-governance scope inside the same mobile app.
- Staff workspace appears only after server-authenticated permission; customer tabs never become an admin shell.
- Use `StaffBar` and documented staff visual distinction. Phone-first; long forms support the specified tablet two-column breakpoint.
- Implement staff home/section visibility by permission, no-permission state, team/permission representation, immutable audit log viewer.
- Service/category/taxonomy management, FAQ, media metadata/alt-text/rights confirmation, archive/restore/delete-draft rules.
- Publish-with-confirm is default. Optional submit/approval queue appears only when permission or `secondApprover.on` requires it.
- Implement versioned writes and explicit 409 edit-conflict UI; never silently overwrite stale edits.
- Implement catalogue import flow: file -> column mapping -> new/changed/duplicate/conflict review -> controlled publish. Manual entry remains available.
- Every sensitive staff mutation must be authorized server-side and audited with before/after where appropriate.

Acceptance: a staff test user can manage content without app release, a customer cannot call staff mutations, archive/delete rules and conflicts are enforced at API level.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-07 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
