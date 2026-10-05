# Canvas boards (design v1.2 source)

158 boards exported 25 Sep 2026 from the design canvas "Nano Beauty App Screens" (https://claude.ai/artifact/5NA9BUxqPEpyu4AjJVLt8C). View them there: Tweaks switch theme, platform, state, `mode` and `role`; Play clicks through.

These files do not render offline (they need the canvas runtime and component bundle). Read them as source:
- `<x-import component-from-global-scope="NanoBeauty.X" …>` = component X with those props (see ../design-system/components/index.d.ts)
- `data-props='{…}'` in the script tag = the board's states (every enum option is a state to build)
- `href="XXX-NN.dc.html"` = where that control navigates
- `Main.dc.html` = HOM-01 Guest home. `canvas.json` = board titles and layout.

Prefixes: ENT entry, AUT sign-in, HOM home, TRT treatments, OFR offers, BKG booking, PAY payment, VIS visits, CAR care, WAL wallet, ACC account, SUP support, STF staff, TAB staff tablet layouts, NTF notification templates, WEB mobile-web pages, MOT motion prototypes, ICN app icon.
