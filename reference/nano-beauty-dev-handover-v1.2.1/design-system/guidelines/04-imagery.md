# Imagery

## The approved set (from nanobeautystar.com)

The `Imagery` asset group holds the photos taken from the clinic's own website, compressed to WebP:

| File | Use |
|---|---|
| `clinic-treatment-room.webp` | Guest Home hero, onboarding, empty states: the clinic's lavender treatment room with a treatment in progress |
| `clinic-interior.webp` | Splash, About/Location, support |
| `team-naz.webp`, `team-maria.webp`, `team-anna.webp` | Professional picker and team profiles (crop to the face, top third) |
| `treatment-facial.webp` | Facials category, aftercare |
| `treatment-hifu.webp` | 12D HIFU / skin-tightening card and detail |
| `treatment-laser.webp` | Laser hair removal card and campaigns |
| `treatment-prp.webp` | PRP / injectables card |

The clinic should confirm it holds the rights to use each of these in the app (they are published on the website, which doesn't by itself prove an app licence) and that the team members agree to appear in it.

## Not carried over

The old web app's catalogue (about 150 images) is mostly generic stock, product shots, provider logos (Klarna, Afterpay, Affirm) and before/after composites. It isn't used in the new app. It is kept as a reference archive only.

## What we show

- Real Nano Beauty photography: the clinic, its treatment rooms, its team, and treatments in progress, lit by soft natural light.
- Real skin with texture; calm framing with the face or treatment area in the upper-centre third so every crop keeps it.

## What we never show

- Stock-spa clichés: stones, orchids, towels folded into swans, candles.
- Before/after images on Home, offers, cards or notifications. Results imagery needs clinical approval, consent records and a dedicated, clearly labelled context.
- Photos with text baked in. Headlines are live text.
- Payment-provider logos as photos; use text labels (see Iconography).

## Crops

`PhotoFrame` crops with `object-fit: cover` at fixed ratios: `16 / 11` guest hero, `16 / 10` service card and detail, `16 / 9` campaign, square avatars in `ProviderCard`. Corners `radius-lg` (hero `radius-xl`). New photos should be supplied at about 1600px wide as WebP/JPEG.

## Missing photos

Any slot without an approved photo shows the `PhotoFrame` placeholder labelled "photo pending". Don't ship placeholders and don't substitute stock.

## Alt text

Describe the context, not the person's appearance: "Aesthetician giving a facial treatment at Nano Beauty", not "Beautiful woman with glowing skin". Decorative images get empty alt text.
