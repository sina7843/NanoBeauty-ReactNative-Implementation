# Dialog

A small modal that asks for confirmation of a consequential action and states the consequence (BOOK 10).

**Props:** `title` (a question), `children` (the consequence in money and time), `confirmLabel` (the specific verb), `cancelLabel` (the safe choice), `destructive`.

The safe choice is on the left and never styled as destructive. Never use "OK / Cancel". Use native alerts (`Alert.alert`) only for simple yes/no without formatted content.
