# EditConflict

Warns an editor that someone else saved the same record while they were editing.

**Props:** `who`, `when`.

Shown when a save returns a version conflict. Nothing is overwritten silently: the editor reviews the other version, then re-applies their edits. No "force save" in the mobile workspace.
