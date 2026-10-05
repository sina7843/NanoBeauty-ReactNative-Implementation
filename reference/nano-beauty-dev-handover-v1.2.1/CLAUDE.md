# CLAUDE.md — Nano Beauty app

Instructions for Claude Code in this repo. Read this file fully before every task. The handover pack lives in `handover/` (copy the handover folder there); paths below are relative to it.

## Product in brief

Nano Beauty is a medical-spa app for one clinic in New Westminster, BC. One React Native app (Expo, TypeScript, Expo Router) for iOS and Android, portrait, English, light and dark. Customers browse treatments, book (hand-off to Fresha by default; in hand-off the deposit is paid in Fresha), pay in the app for packages and gift cards (and deposits only if in-app booking is switched on), and hold credit, packages and gift cards. Clinic staff manage content, offers, requests and settings in a staff workspace **inside the same app**. There is no web admin.

## Sources of truth (in priority order)

1. `handover/docs/decisions-and-flags.md` and `handover/docs/project-notes/` (owner decisions)
2. `handover/docs/design/phase-7-developer-handoff.md` — sections from "Handoff v1.2" onward override older text
3. The board for the screen: `handover/canvas/<ID>.dc.html` (`Main.dc.html` = HOM-01), plus `handover/design-system/export/routes.json` and `fixtures.json`
4. `handover/design-system/` — component READMEs, `components/index.d.ts`, guidelines 01–13
5. `handover/docs/source/` — requirements v1.1 (for requirement IDs only; older where it disagrees)

If sources disagree, follow the higher one and note the conflict in the PR. **Never invent a screen, state, rule, price or copy line.** If something is missing, stop and ask (or add a `TODO(design):` and list it in the PR).

## How to build a screen

1. Find the screen in `handover/docs/screen-index.md` (route, states, mode, roles).
2. Read the board file. It lists every component (`NanoBeauty.X`) with props, the exact copy, the states in `data-props` (each enum option is a state to implement), and the target of each link.
3. Build it from native components that match `design-system/components/index.d.ts` names and props. The web bundle (`bundle.js`, `.dc.html`) is a reference, **never** ship or port it as-is.
4. Implement **every** Tweaks state listed for the board (loading, empty, offline, error, conflict, etc.), in light and dark, iOS and Android.
5. Compare with the board's renders in `handover/renders/light|dark/<ID>__<tweak>=<option>.webp` for every state.
6. Copy text exactly from the board. Sentence case. No new wording without a design CR.
7. Wire the analytics events for that screen from spec 4 in the Phase 7 doc.

## Hard rules

- **Tokens only.** Colours, type, spacing, radius, shadow, motion come from `design-system/export/nano-tokens.ts`. No raw hex, px font sizes or ad-hoc durations. Theme via semantic tokens (`bg`, `ink`, `primary`, `surface`…), never by checking the theme in components.
- **Fonts:** Fraunces (display/titles) and Sora (everything functional), from `design-system/fonts/`. Nothing below 13 px, except the `overline` token (12 px, semibold, uppercase, tracked) for short section labels.
- **Icons:** `phosphor-react-native`, Regular weight, Fill only for the selected tab. No emoji.
- **One primary button per screen.**
- **Truth first.** Never show a booking, payment, redemption, gift claim or balance as done before the server (or Fresha sync) confirms it. No optimistic success. Hand-off bookings are "confirmed" only after Fresha reports them (BKG-09).
- **No hard-coded rules or prices.** Deposit, change window, hold time, payment methods, gift amounts, consultation price, second approver, rating line, deletion grace, etc. are server settings (spec 1, `fixtures.json → settings`). Customer screens read them.
- **Sample content stays badged.** Anything marked Sample, Assumption or "clinic to confirm" on a board keeps its badge until the real value arrives through settings or content.
- **Permissions are server-side.** Staff roles come from the server; the app only hides what a role can't use. Every staff write checks the role on the server and writes an audit entry (actor, role, item, field, old, new, reason, time, device). Audit entries are immutable.
- **Archive, don't delete** (spec 2). Only drafts can be deleted. Archive / delete / restore always confirm (STF-39) and write audit.
- **Edits carry a version.** A stale save returns 409 and shows the edit-conflict state; no force-save.
- **Privacy:** no clinical or medical data in the app, no health details in analytics, no names/phones/emails/free text in analytics. Marketing messages only to people who opted in; quiet hours for texts.
- **Accessibility:** 44 pt / 48 dp targets, labels on every control, Dynamic Type / font scaling, Reduce Motion alternatives (guideline 07 and 06), contrast per guideline 13.
- **Native behaviour wins** over the picture (back gesture, keyboard, safe areas, sheets) — guideline 08.

## Pending decisions → config, not code branches

These are waiting for client confirmation. Build them so either answer is a settings/flag change. Details in `handover/docs/decisions-and-flags.md`.

| Flag / setting | Default now | Decision |
| --- | --- | --- |
| `settings.bookingMode` = `handoff` \| `inapp` | `handoff` | D33 — in-app booking routes (BKG-02–07, 11, VIS-03) hidden in hand-off |
| Role → permission map from server | three roles (Owner, Editor, Front desk) | D34 — owner wants one full-access role; must be a data change |
| `settings.secondApprover.on` + Editor submit flow | off | D35 — owner wants no approval step at all |
| `features.legacyMembership` | off | D38 — owner wants membership hidden for everyone; design shows it for legacy members only |
| `settings.ratingLine.on`, `settings.financingLine.on` | off | client to decide |

## Out of scope — do not build

Product shop, rewards, referrals, check-in, group booking, favourites/recent views, new membership enrolment, social/website links in Support, live chat, before/after galleries. Old-app features are not copied unless a board exists.

## Working conventions

- Work milestone by milestone from `handover/docs/build-plan.md`. One PR per ticket; PR title starts with the screen IDs (e.g. `BKG-08 BKG-09 Fresha hand-off`).
- Put sample data behind a fixtures loader using `fixtures.json`; never paste fixture values into components.
- Keep a `docs/deviations.md` in the repo: every place the build differs from a board, with the reason. Design QA (Phase 8) checks against it.
- Ask before adding a dependency that touches payments, auth, analytics or push; these vendors are not chosen yet (`handover/docs/open-items.md`).
