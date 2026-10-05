# Nano Beauty app — developer handover (design v1.2, pack v1.2.1)

**Date:** 25 Sep 2026 · **From:** Dragon (product designer) · **For:** the development team building the app with Claude Code

This folder is everything needed to build the Nano Beauty iOS and Android app from the approved design. Start with this file, then give `CLAUDE.md` to Claude Code as the repo's root instructions.

## What you are building

- One React Native (Expo, TypeScript, Expo Router) app for iOS and Android, portrait, English, light and dark theme.
- Customer app: four tabs (Home, Treatments, Visits, Wallet) plus a Book button and a profile button (navigation Option B, D28).
- Staff workspace **inside the same app**, opened from Account for staff accounts only (D11, D39). There is **no separate web admin**.
- Booking is handed off to **Fresha** by default (Fresha has no public booking API). In-app booking is designed too, but only switches on if a booking system with an API is chosen later (D33).
- Four small mobile-web pages (gift claim, account deletion) live outside the app; their host is not decided yet.

## Start here (in this order)

1. `docs/open-items.md` — what is **not** decided yet and who owns it. Read before estimating.
2. `docs/decisions-and-flags.md` — decisions D01–D40 in one table, and the config flags that keep undecided decisions switchable.
3. `docs/build-plan.md` — milestones and tickets by screen ID, with acceptance criteria.
4. `docs/screen-index.md` — every board: route, states, booking mode, roles, links.
5. `docs/design/phase-7-developer-handoff.md` — the full design handoff: state contracts, roles, motion, assets, fixtures, QA checklist, specs 1–5 (settings, archive rules, notifications, analytics, content).
6. `design-system/` — tokens and component specs. `design-system/export/nano-tokens.ts` is the token file to import.

## What's in this folder

| Folder / file | Contents |
| --- | --- |
| `CLAUDE.md` | Root instructions for Claude Code. Copy to the repo root. |
| `docs/build-plan.md` | Milestones M0–M10, ticket per screen group, acceptance criteria |
| `docs/decisions-and-flags.md` | Decision status and the config flags for pending decisions |
| `docs/open-items.md` | Engineering decisions, client dependencies, store-release blockers, known doc errata |
| `docs/data-model-draft.md` | **Draft** entity list for the tech lead to own and change |
| `docs/screen-index.md` / `.json` | Generated index of all 158 boards |
| `docs/design/` | Phase docs exported 25 Sep: Phase 0 register (decisions, CRs), Phase 2 navigation, Phase 3 flows, Phase 4 test plan, Phase 7 developer handoff, gap analysis, Phase 9 brief |
| `docs/project-notes/` | Round-3 owner decisions and the Phase 9 review fixes |
| `docs/source/` | Original inputs: requirements v1.1, design brief v1.0, risks (Farsi). Lower authority than the design docs where they differ. |
| `design-system/` | Tokens (`tokens.json`, `export/nano-tokens.ts`, `export/tokens.dtcg.json`), 62 component READMEs, `components/index.d.ts` (props for every component), 13 guidelines, fonts, `export/routes.json` (108 routes), `export/fixtures.json` (sample data and settings) |
| `canvas/` | The 158 design boards as `.dc.html` source (screens, tablet layouts, notification templates, web pages, motion prototypes, app icon) and `canvas.json` |
| `assets/` | Logos (SVG master, plum lockup, white master PDF), 9 photos (webp) and the approved app icon export set in `assets/app-icon/final/` (iOS 1024, Android adaptive layers and monochrome, Play Store 512, SVG) |
| `renders/` | Screenshots of every board in every Tweaks state, light and dark (810 images, 1×). File name = `<ID>__<tweak>=<option>.webp`; `Main` = HOM-01. Use these when the live canvas isn't available and for design QA |
| `CHANGES-v1.2.1.md` | What changed since the v1.2 pack |

## How to read the design

- **Live canvas (best view):** [Nano Beauty App Screens](https://claude.ai/artifact/5NA9BUxqPEpyu4AjJVLt8C). Each board is one 390 × 844 pt screen. Open a board's Tweaks to switch theme, platform, state, booking `mode` and staff `role`. Press Play to click through.
- **Design system:** [Nano Beauty design system](https://claude.ai/artifact/3uT3fESwWqALaQK6UjS3Uj).
- Both are private artifacts on this Claude account, so anyone signed in to it can open them.
- **Boards in `canvas/`** are the same boards as source. They won't render offline (they need the canvas runtime); use `renders/` to see them. The source is still readable: each lists the components used (`NanoBeauty.Button` etc.), their props, the exact copy, the states (`data-props`) and which board each link goes to. Claude Code should read the board before building a screen.
- The web components (`bundle.js`, `.dc.html`) are a **visual and behavioural reference, not code to ship**. Build native components with the same names, props and states (`components/index.d.ts`).

## Authority (when sources disagree)

1. Owner decisions in `docs/decisions-and-flags.md` and `docs/project-notes/`
2. Phase 7 handoff v1.2 sections ("Handoff v1.2" onward replace older text)
3. The canvas boards and `routes.json` / `fixtures.json`
4. Phase 0, 2 and 3 docs (v2 sections replace v1 sections marked "Superseded")
5. `docs/source/` (requirements v1.1, design brief) — for requirement IDs and background only

## Status in one line

Design v1.2 is complete and QA'd (405 renders per theme, 0 fit, contrast or dead-link issues). Four decisions (D33, D34, D35, D38) are **owner direction, waiting for client confirmation** — build them behind config flags so either answer is a settings change, not a rewrite. Backend, payment provider, old-app data export and legal texts are open and listed in `docs/open-items.md`.

## Contacts

- Product / design questions: Dragon (product designer). Design changes go through a change request (CR) in the Phase 0 register; don't change screens in code without one.
- Client decisions (Fresha, rules, prices, legal text, photos, staff consent): the clinic, via Dragon.
