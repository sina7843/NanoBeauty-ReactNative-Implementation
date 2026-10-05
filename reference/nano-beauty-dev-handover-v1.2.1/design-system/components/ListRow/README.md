# ListRow

A tappable row inside a `ListGroup` for settings, account, receipts and staff lists.

**ListRow props:** `icon`, `title`, `subtitle`, `value`, `chevron` (default true), `destructive`, `onPress`, `disabled`.
**ListGroup props:** `header` (overline), `footer` (caption), `children`.

Rows are at least 56 tall. One idea per row; long text wraps rather than truncating when Dynamic Type is large. Destructive rows (Delete account, AUTH 06) lead to an explanation screen, never an instant action.
