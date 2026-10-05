# Engineering handoff

## Files in this system

| Path | What |
|---|---|
| `tokens.json` | Source of truth for every token (read by this page) |
| `export/nano-tokens.ts` | React Native / TypeScript tokens: `primitive`, `light`, `dark`, `space`, `radius`, `size`, `typography`, `duration`, `easing`, `elevation` |
| `export/tokens.dtcg.json` | The same tokens in W3C Design Tokens format for Style Dictionary or other tools |
| `export/routes.json` | 72 app routes with their screen IDs and sign-in / staff-role rules |
| `export/fixtures.json` | The sample data shown on the design canvas (client, visits, wallet, campaigns, sample rules A1–A8) |
| `guidelines/13-contrast-report.md` | Every text/control pairing checked in both themes |
| `components/bundle.js`, `bundle.css`, `index.d.ts` | Web reference implementation and prop types for every component |
| `components/<Name>/README.md` | Behaviour, states, props, rules and requirement IDs |
| `fonts/` | Fraunces and Sora variable woff2 (web). Use static TTFs from Google Fonts in the app |
| `assets/Logos`, `assets/Icons` | Master logo (SVG + original PDF) and the icon set |

## Using the tokens in React Native

```ts
import { useColorScheme } from 'react-native';
import { themes, space, radius, typography } from '@nano/tokens';

const c = themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
<Pressable style={{ backgroundColor: c.primary, borderRadius: radius.full, height: 48, paddingHorizontal: space['6'] }}>
  <Text style={[typography.labelLg, { color: c.onPrimary }]}>Book appointment</Text>
</Pressable>
```

- Theme follows the OS (`useColorScheme`); no in-app theme switch at launch.
- Map `Button`, `TextField`, etc. one-to-one to native components with the same props and states; the web bundle is the visual and behavioural reference, not code to ship.
- Put the tokens package in the monorepo (`packages/tokens`) and generate it from `tokens.json`; never hand-edit colour values in screens.

## Acceptance checks for every component

1. Light and dark match the previews; contrast pairs from `guidelines/13-contrast-report.md` hold.
2. All states in the README exist (loading, disabled, error, empty, offline where relevant).
3. VoiceOver/TalkBack read the label, role and state; focus order is logical.
4. Text at 200% OS size reflows without clipping actions or prices.
5. Reduce Motion / Remove animations removes movement; nothing conveys state by motion alone.
6. No success state renders before the authoritative response (booking, payment, balance).
7. Touch targets are 48 or larger.

## Full developer handoff

Route map, screen state contracts, the role and permission matrix, motion recipes, asset sizes and the build QA checklist are in the Phase 7 Developer Handoff doc in the Nano Beauty project.

## Still to be supplied

Licensed clinic photography, the canonical service catalogue, clinic-approved clinical copy and policies, Fresha integration details, payment provider configuration, and legacy data exports. Components show labelled placeholders until then.
