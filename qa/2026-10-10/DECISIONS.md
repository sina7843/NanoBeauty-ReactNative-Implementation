# QA handover decisions (owner, 10 Oct 2026)

Decisions the project owner (designer) made while handing over the 10 Oct 2026 QA pass. They are
binding for NANO-12 and override older text in `CLAUDE.md`, `apps/mobile/assets/fonts/README.md`,
`docs/deviations.md` and `DECISIONS.md` where they conflict.

**Keeping this file current:** NANO-12 copies every row below into the repo-root `DECISIONS.md`
table (same date, ID in the Decision column). Any new decision taken while fixing (by the owner, or
a documented assumption) is added BOTH to the repo-root `DECISIONS.md` and to the "Decisions taken
during NANO-12" table at the end of this file, so the next handover zip carries them. Never delete a
row; mark it superseded instead.

| ID | Decision | Effect on the code |
| --- | --- | --- |
| D-QA-01 | The development team fixes every issue in `FIX-BRIEF.md` in one Claude Code session (NANO-12). The owner does not apply fixes. The two patches in `patches/` are verified reference fixes; apply them or implement an equivalent. | Work through `FIX-BRIEF.md` in its phase order. Report status per ID at the end. |
| D-QA-02 | Brand fonts are supplied by the owner (`apps/mobile/assets/fonts/*.ttf`, OFL) and **must always be used**. No system-font fallback in any build. This replaces the CLAUDE.md rule "Font binaries are owner-supplied… never download or commit substitute… font files" and the "optional" wording in `assets/fonts/README.md` for these six files: commit them. Still never download or substitute other fonts. | Commit the six TTFs + `OFL.txt` + `FONTS.md`. Implement FIX-BRIEF item F-1 (fonts forced). Update `CLAUDE.md` working rule and `assets/fonts/README.md` to say the fonts are present and required. |
| D-QA-03 | "Get help" (SUP-03) without a clinic phone number must not be a dead end: offer the in-app question form (SUP-04, `/support/ask`) on that screen. Call and Text stay hidden until `clinic.phone` exists. | Implement with Issue 3. Add a row to `docs/deviations.md` (SUP-03 no-phone fallback). |
| D-QA-04 | Card payments are always on. STF-32 shows Card locked "Always on" and that is intended. | ST-12: lock the switch in the UI and reject `card:false` in the API. |
| D-QA-05 | Gift card designs stay colour + icon faces (GiftDesignPicker `GIFT_TONES`) until the clinic supplies artwork. | Issue 2 builds the colour faces, not image placeholders. |
| D-QA-06 | Clinic content that is still missing waits for the client. Where a value is **necessary** for a flow to work in development, use made-up sample content; otherwise leave it blank. Sample values live only in development seeds/config, carry the existing `sample` flag (Sample badge), and never reach staging or production. Necessary now: clinic phone, clinic opening hours, Fresha booking URL. Not necessary (leave blank / existing placeholder): team bios and titles, treatment photos for Consultation, Biomicroneedling SQT, Anti-wrinkle injections, parking, directions. | Add development-only sample values (e.g. a 555 phone number, plausible weekly hours, a clearly fake Fresha URL) through the dev seed or `.env.example` comments; keep the truth-first rules (no fake booking/payment success). |
| D-QA-07 | Local QA runs in Docker: `compose.docker.yaml` (Postgres + API + Metro). The Expo Go shims (`EXPO_OFFLINE=1`, `docker/expo-go/` notifications stub) are for Expo Go QA only and are not part of the app. | Keep the Docker files in the repo; document them in `docs/docker.md`; never import the stub from app code. |
| D-QA-08 | Design source of truth is `reference/nano-beauty-dev-handover-v1.2.1` (canvas, renders, design system). It is byte-identical to the owner's Claude Design canvas and design system as of 10 Oct 2026. | Compare against `reference/…/canvas/<ID>.dc.html`, `renders/light/<ID>.webp`, `design-system/components/bundle.js` + `bundle.css`. |
| D-QA-09 | Documented deviations stay as they are (Fresha hand-off mode, hidden in-app booking routes, documented component deviations). Only items in `FIX-BRIEF.md` are in scope, plus doc updates they require. A deviations row that is now out of date (e.g. STF-01 "arrives with NANO-08") is corrected. | — |
| D-QA-10 | Test data in the owner's local database does not matter; the dev team uses its own environment. | — |

## Decisions taken during NANO-12

| Date | ID | Decision | Reason | Affected items |
| --- | --- | --- | --- | --- |
| | | | | |
