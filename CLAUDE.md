# Nano Beauty — Claude Code instructions

## Source precedence
1. `IMPLEMENTATION_DECISIONS.md`
2. `Requirements.md`
3. `reference/nano-beauty-dev-handover-v1.2.1/` developer handoff, decisions/flags, screen index, routes and design-system specs
4. The currently active file under `prompts/`
5. Existing repository conventions
6. A small documented assumption when none of the above resolves the issue

## Working rules
- Work on one NANO prompt at a time. There are 12 prompts, `NANO-00` through `NANO-11`.
- Before implementation, confirm at least one Git commit exists. Stop if `git rev-list --all --count` is zero.
- Never turn the supplied HTML/canvas boards into a WebView implementation. Build native React Native screens/components.
- Inspect the repository before changing architecture or dependencies.
- Preserve source design tokens, routes, states, copy, feature flags and truth-first behavior.
- Use one shared app for customer + role-gated staff experience.
- Never fake successful booking/payment/redemption/publication states.
- Do not invent Fresha APIs or live provider credentials.
- Do not read or create real secret files. Use `.env.example`; the user creates local `.env` via `06-CREATE-LOCAL-ENV.cmd` when needed.
- Treat `Requirements.md`, `IMPLEMENTATION_DECISIONS.md`, `CLAUDE.md`, `.claude/`, `tools/`, `prompts/`, and `reference/` as protected source material unless a prompt explicitly says to update project status/traceability documents.
- Brand fonts (D-QA-02): the six owner-supplied TTFs in `apps/mobile/assets/fonts/` (OFL) are committed and required in every build; no system-font fallback. Never download or substitute other font files.
- Keep iOS and Android behavior correct: safe areas, keyboard, native back, predictive back, accessibility, text scaling, reduced motion and deep links.
- Prefer Expo-compatible modules. Introduce custom native code only when a required capability cannot be met otherwise and document the reason.
- Run checks relevant to changed scope; never claim a test/build passed unless it actually ran.

## Completion format
At the end of each prompt report:
- implemented behavior;
- important changed files;
- commands/tests actually run;
- iOS/Android verification performed;
- unresolved decisions/blockers;
- remaining risks;
- next eligible NANO prompt.
