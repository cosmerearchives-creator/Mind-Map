# Silverlight Archives — selection, navigation and duplicate Board review

- Ctrl+A on the canvas selects every Sticky on the current Board, including offscreen and Collection members, for group copy, deletion and movement. Text editors retain normal select-all. Non-editable app text is unselectable.
- Connection + handles appear only on selected Stickies, including multi-selections.
- Normal Board clicks open in the current tab; Ctrl+click opens a new tab (or activates an existing tab for that Board). The explicit + tab action also opens a new tab. Nested Boards, shortcuts, internal links and breadcrumbs use the same navigation rule.
- The former sync-text strip shows clickable ancestor breadcrumbs, excluding the current Board. Sync state appears through the top toolbar icon and accessible tooltip/details, including busy, synced, pending, offline and error states.
- Windows Silverlight/View menus hide by default. Alt reveals them; Escape, completing a menu action or returning to the canvas hides them.
- Find duplicate Boards in Board actions or Board options. Scan one project, choose a primary same-name nested Board, review additions and per-Sticky conflicts, then preview and explicitly apply. Other occurrences redirect to shortcuts. Copy differences preserves Collection/Library data, pins, connections and references; Keep primary only discards duplicate content and exclusive owned subtrees, while protecting destinations referenced elsewhere. Undo/Redo restores/reapplies the change. Work on one duplicate-name group at a time.

Validation covers navigation, full-board selection/copy/Delete/Undo, selected-only handles, input selection, duplicate review/Cancel/Apply/Undo/Redo/reload, project scope and conflict choices, pins/links/Library preservation, bulk selection scrolling, storage/performance and two-device sync. Physical Android behavior and Windows Alt-menu keyboard/focus interactions still require device verification.
