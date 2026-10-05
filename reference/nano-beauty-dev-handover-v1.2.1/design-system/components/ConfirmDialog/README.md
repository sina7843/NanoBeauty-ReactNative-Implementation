# ConfirmDialog

Extends `Dialog` for archive, delete-draft and restore (D36, G20). It always lists what the action affects, and the safe choice (Cancel) sits on the left.

**Props:** `kind` (`archive`, `delete`, `restore`), `item`, `affects` (bullet list).

Only drafts can be deleted. Anything customers booked, bought or saw is archived and can be restored. Every confirm writes an audit entry.
