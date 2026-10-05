# FormSection

A titled, collapsible section of a long staff form (ADMIN 02, G23). The header shows the section's status so an editor can see what's left without opening every part.

**Props:** `title`, `summary` (shown when collapsed), `open`, `error` (short text; red border), `complete`, `columns` (`2` = tablet two-column body, D39).

**States:** expanded, collapsed, has error, complete. The header is a button with `aria-expanded`; errors are also announced by text, not colour alone.
