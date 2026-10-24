# Silverlight Archives — link previews, group movement and nested Board fixes

- Pasting a web address on the canvas creates a Library link card with a downloaded thumbnail, site icon/name and clickable page title when metadata is available. Video previews include a play indicator; links open through the system browser. Saved previews work offline. Unavailable metadata leaves a usable link.
- Dragging a mixed selection from card or linked content moves the group together, including Collection descendants. Collection drops are applied as a batch; drag completion does not open a clicked shortcut or link. Undo restores the group.
- Milanote shortcuts without a matching destination create blank nested Boards without placeholder messages. Repeated references share the same destination; valid shortcuts remain shortcuts. Images/icons, membership and connections are retained where available.
- Deleting an owned nested-board Sticky now confirms deletion of its destination Board and, by default, owned descendants. Keyboard multi-selection uses the same behavior. Cancel and Undo preserve/restore contents; shortcut deletion leaves its destination intact. Previously orphaned Boards are retained for manual review.
- Home-screen bulk selection preserves scroll position as Boards are selected or deselected.

Validation includes isolated browser checks for previews/fallback/reload, mixed group movement/Undo, nested deletion/Cancel/Undo, bulk selection scrolling, imports, storage and sync. Native release builds validate both integrations. Actual website metadata availability and physical Android behavior vary and require device testing.
