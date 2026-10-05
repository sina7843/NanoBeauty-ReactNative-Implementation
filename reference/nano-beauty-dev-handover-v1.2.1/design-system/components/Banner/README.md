# Banner

An inline, persistent message about the screen's state; always an icon plus words.

**Props:** `tone` (`info`, `success`, `warning`, `danger`, `offline`), `title`, `children`, `action`, `onDismiss`.

**Use**
- `info` — neutral facts: provider hand-off, reconciling balance, offline (NFR 09).
- `success` — only after the authoritative system confirms.
- `warning` — needs attention soon: expiring value, hold running out, pending review.
- `danger` — something failed; say what happened, whether money moved, and the next step.

Banners never auto-dismiss. For transient confirmation use `Toast`.
