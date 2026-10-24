# Silverlight Archives — image regions and freeform home

- Image Stickies support clickable regions. Edit an image and choose **Clickable image regions**, draw a preset shape or freeform outline, then use the standard Sticky creation menu with Nested Board enabled by default. Borders start hidden; show an outline, redraw, edit the linked Sticky or detach it onto the canvas from the region manager.
- Regions follow image scaling and offsets, are cropped by the image frame, survive saving/sync and copy with their image. Nested targets open their Board; other targets open their editor. Removing an image preserves region targets as ordinary canvas Stickies, with Undo restoring the image and regions.
- The home screen retains project previews, search, imports, New board and bulk selection while allowing project tiles to be dragged into a saved freeform layout. Alt plus arrow keys also moves a focused tile. It remains a project landing page, without Sticky editing or connections.
- Tabs are shorter with the close button to the left of the title.
- Scroll pans vertically, Shift-scroll horizontally, Ctrl-scroll zooms around the pointer. Horizontal trackpad deltas are respected; editor/menu scrolling stays normal. Zoom-out now reaches 5% instead of 25%.
- Auto-arrange connected cards places separate groups in a compact, approximately square layout with generous spacing and actual Sticky dimensions. Collections retain their contents; manual junction positions reset to automatic routing after arrangement.
- New Sticky titles start blank. Existing titles remain unchanged. Shortcuts retain the selected destination's name.
- Introduction Boards use Silverlight Archives branding and current tips. Recognized legacy starter text is refreshed once while preserving user-edited tips.

This update adds shared model tests and browser checks for shapes/freeform/copy/navigation/redraw/scaling/deletion/Undo/reload, home drag/reload, tab and wheel controls. Existing selection/navigation/bulk deletion scroll and 3,000-card performance checks pass. Physical Android touch and Windows installation interactions remain device checks.

## Previous release

- Ctrl+A on the canvas selects every Sticky on the current Board, including offscreen and Collection members, for group copy, deletion and movement. Text editors retain normal select-all. Non-editable app text is unselectable.
- Connection + handles appear only on selected Stickies, including multi-selections.
- Normal Board clicks open in the current tab; Ctrl+click opens a new tab (or activates an existing tab for that Board). The explicit + tab action also opens a new tab. Nested Boards, shortcuts, internal links and breadcrumbs use the same navigation rule.
- The former sync-text strip shows clickable ancestor breadcrumbs, excluding the current Board. Sync state appears through the top toolbar icon and accessible tooltip/details, including busy, synced, pending, offline and error states.
- Windows Silverlight/View menus hide by default. Alt reveals them; Escape, completing a menu action or returning to the canvas hides them.
- Find duplicate Boards in Board actions or Board options. Scan one project, choose a primary same-name nested Board, review additions and per-Sticky conflicts, then preview and explicitly apply. Other occurrences redirect to shortcuts. Copy differences preserves Collection/Library data, pins, connections and references; Keep primary only discards duplicate content and exclusive owned subtrees, while protecting destinations referenced elsewhere. Undo/Redo restores/reapplies the change. Work on one duplicate-name group at a time.

Validation covers navigation, full-board selection/copy/Delete/Undo, selected-only handles, input selection, duplicate review/Cancel/Apply/Undo/Redo/reload, project scope and conflict choices, pins/links/Library preservation, bulk selection scrolling, storage/performance and two-device sync. Physical Android behavior and Windows Alt-menu keyboard/focus interactions still require device verification.
