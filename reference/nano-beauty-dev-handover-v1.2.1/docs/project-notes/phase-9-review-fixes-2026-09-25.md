# Nano Beauty App — Phase 9 review: fixes before v1.2 sign-off (25 Sep 2026)

**Status: all 14 fixes verified and logged as CR-42 to CR-55.** The three sample-data leftovers found in the re-check were closed in round 3 (CR-56 to CR-58). Kept here so the build team knows why some boards look the way they do.

Verdict of the review: scope delivered in full (34 app screens, 4 web pages, 12 NTF, 7 TAB, 18 components, flows 3H/3/4/6/8/9 v2 and 10–17, D33–D40, CR-01–41, specs 1–5, 108 routes).

## Fixed — affects the build

1. Hand-off path from Book: BKG-01 has a `mode` switch; hand-off goes to BKG-12 (first time) or BKG-08. TRT-05 consultation CTA follows the mode.
2. `routes.json` mode flags agree with the canvas (`/visits/[id]` is `both`; `/book/areas` `both`; `/book/basket` in-app only).
3. STF-24 hand-off state: "Move it in Fresha, then mark done".
4. Prices aligned across screens and fixtures with the public list (laser per area: upper lip $50, chin from $50, underarms from $70, bikini line from $80, lower leg from $110, full leg + feet from $250; men beard $75, back $200, chest & abdomen $200; SQT 4 for $1,200; one laser 6-session package price).
5. Accessibility: BKG-01 uses real checkbox controls; STF-19 row-menu labels are plain text.

## Fixed — truth and content

6. Fresha-dependent promises on BKG-08/BKG-12 hedged and badged as Assumption.
7. Rules invented outside the settings model were moved into spec 1 or badged Sample.
8. Invented details about real staff replaced with placeholders until bios and consent arrive.
9. Clinical claims badged Sample / clinic to approve.
10. STF-03 draft banner depends on the second-approver setting.
11. STF-08 sample submitter is Maria (Editor).
12. Gift steppers aligned: Design, Value, Recipient, Review.
13. Rating sample 4.9 from 357.
14. Stale text in Phase 0 and Phase 3 marked superseded.

## Later (owner decision 25 Sep — not in v1.2)

- Support (SUP-01–05, STF-29/30) is accepted as designed. Possible later: live chat, quick replies, assigning messages, after-hours auto reply.
- Social media and website links: a quiet "Follow us" row in SUP-01 (website, Instagram, TikTok, Facebook, Google Maps, "Leave a review"), plain external links only (no embedded feeds or Meta SDK), editable in STF-31. **Do not build until designed.**
