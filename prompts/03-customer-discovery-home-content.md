# NANO-03 — Home, treatments, offers, care and support

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-03 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement the customer discovery/content milestone using HOM, TRT, OFR, CAR, SUP and ACC-11 specifications.
- Home: signed-out and returning states, next-visit/value priority, one primary action, max two server-ordered offers, no fabricated personalization.
- Treatments: category/concern browsing, canonical search + aliases, filters, price models, treatment detail, FAQ, professional eligibility, unavailable/archived states and financing line from settings.
- Offers/promotions: schedule/status/timezone, terms, deep-link destination, promo-code validation states, countdown driven by server time and safe expired destination.
- Care/aftercare content only from approved clinic content. Do not introduce medical diagnosis or unsupported claims.
- Support: hub, article, contextual contact, Ask us form/reference, clinic hours/directions/parking from settings, legal policy viewer with version/offline copy behavior.
- Public content should use cached reads where allowed and clear stale/offline indicators; mutations require connectivity.
- API must provide content models and staff-safe read endpoints without hard-coded screen data.

Acceptance: core guest/customer discovery journey is usable without sign-in; states map to supplied boards/routes; content and pricing come from server/config rather than constants.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-03 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
