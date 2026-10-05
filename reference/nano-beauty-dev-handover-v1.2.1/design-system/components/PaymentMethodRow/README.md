# PaymentMethodRow

A selectable payment method. Only methods that are contracted and live for this purchase appear (PAY 01–04, PAY 12).

**Props:** `method` (`debit`, `klarna`, `affirm`), `label`, `detail`, `state` (`available`, `unavailable` with a reason), `selected`.

**Rules**
- Never show installment amounts, "approved" or "0% interest" before the provider responds.
- Provider names are written as text; official marks are added only from the provider's brand kit when the merchant contract allows.
- Unavailable methods state why, neutrally, or are hidden when not configured at all.
- Afterpay is not shown (PAY 11, backlog).

**Dependency:** merchant integrations are unverified (D15). Treat these screens as conditional.
