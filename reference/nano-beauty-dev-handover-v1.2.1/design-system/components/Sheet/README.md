# Sheet

A bottom sheet for focused sub-tasks: filters, time pickers, cancellation consequences, reject reasons.

**Props:** `title`, `children`, `actions`, `onClose` (`false` hides the close button).

Use the platform sheet (iOS page sheet with detents; Android modal bottom sheet) so swipe-down and system Back work natively. If the sheet holds unsaved transactional input, dismissal asks first (6A). Backdrop is `scrim`; surface is `surface-raised` with `shadow-overlay`, fully opaque.
