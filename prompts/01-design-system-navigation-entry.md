# NANO-01 — Native design system, navigation and entry states

Copy only the fenced block into Claude Code.

```text
You are implementing NANO-01 for the Nano Beauty React Native project.

Read and obey CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the relevant files under reference/nano-beauty-dev-handover-v1.2.1 before editing.

Implement the Nano Beauty design system natively from the supplied token/component/platform specifications.
- Transform/import the supplied semantic tokens into typed React Native theme tokens; support system light/dark with identical semantic naming.
- Implement the documented core native components and states needed by later prompts: Button, IconButton, TopBar, TabBar, Card, ListRow/group, Badge, Banner, TextField, Switch, Chip, SegmentedControl, Sheet, Dialog/ConfirmDialog, Toast, Skeleton, EmptyState, AsyncStatus, PriceTag, PhotoFrame, Logo, PermissionNotice and staff visual boundary components.
- Do not copy browser CSS/HTML implementation directly and do not embed canvas boards in WebViews.
- Fonts: wire a documented owner-supplied local font path for Fraunces/Sora and a safe system fallback; do not download font binaries. App must run without the proprietary/local binaries being present.
- Implement Option B navigation: Home, Treatments, Visits, Wallet tabs + Book action + profile button; modal stacks for book/pay; unknown deep link returns safely to Home with an explanation.
- Implement entry states ENT-01–04 and app icon/splash wiring using supplied non-font assets.
- Apply documented iOS/Android differences for Back, sheets, system bars, press feedback, native switch, OTP metadata, calendar action boundary, haptics and Android predictive back.
- Build component showcase/dev route instead of web Storybook if Storybook adds disproportionate native complexity; document the choice.
- Enforce touch targets, text scaling, screen-reader labels/order, reduced motion and no dynamic Android wallpaper colors.

Acceptance: navigation and entry run on both platform targets, core components render in light/dark and all protected/truth states have reusable primitives.

Before finishing:
1. Run the checks relevant to this prompt and report exact commands/results.
2. Update IMPLEMENTATION_STATUS.md, REQUIREMENTS_TRACEABILITY.md, DECISIONS.md only where facts changed.
3. Mark NANO-01 complete in PROJECT_STATUS.md only if the prompt is genuinely complete; set the next active prompt.
4. Do not start the next prompt.
```
