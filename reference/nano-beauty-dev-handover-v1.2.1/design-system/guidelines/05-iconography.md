# Iconography

- **Set:** Phosphor Icons (MIT licence), **Regular** weight. **Fill** only for the selected tab.
- **Sizes:** `icon-sm` 16 in captions and badges, `icon-md` 20 in buttons, fields and rows, `icon-lg` 24 in the tab bar and top bar.
- **Colour:** inherits the text colour. Status icons take their status token and always sit next to a word.
- **Row icons** sit in a 36px `surface-muted` circle; empty/result state icons in a 64px `surface-tint` circle.
- **Meaning is consistent:** `calendar-blank` booking, `wallet` stored value, `package` packages, `gift` gift cards, `ticket` offers, `receipt` receipts and pay-later providers, `chat-circle-text` consultation and messaging, `first-aid-kit` urgent-care and suitability notes, `user-gear` staff workspace, `clock-counter-clockwise` history/audit.
- **No emoji** in product UI, notifications or campaign copy.
- **Payment providers** (Klarna, Affirm) appear as text labels. Their official marks are added only from each provider's brand kit when the merchant agreement allows.

React Native: `phosphor-react-native` with `weight="regular"` and `size` from the tokens. The SVGs in `assets/Icons` are fixed to `ink-950` for preview; in code they take `currentColor`.
