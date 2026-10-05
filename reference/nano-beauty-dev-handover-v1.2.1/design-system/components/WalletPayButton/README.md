# WalletPayButton

Apple Pay and Google Pay buttons at the top of the payment method list (PAY 01, G34). In Canada, Interac debit in apps runs through these wallets.

**Props:** `type` (`apple`, `google`), `state` (`available`, `unavailable`), `label`.

In the built app use the platforms' own button components (PKPaymentButton and Google Pay's button); this reference follows their rules: black in light mode, white in dark mode, full width, the brand mark plus "Pay", never recoloured. Shown only when the setting is on and the device supports it.
