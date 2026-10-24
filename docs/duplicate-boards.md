# Reviewed duplicate Board consolidation

Open Board actions → Find duplicate Boards, or use Board options. The scan follows owned nested Boards and Library-owned Boards from the current project's root. Shortcut destinations and other projects are excluded from candidate discovery. Names are normalized for case, Unicode and whitespace; matching names only flag candidates.

Choose one name group and its primary Board. Candidate previews show Stickies and counts. Copy differences retains the primary content and copies additions; matching source IDs/Sticky IDs identify differing versions. For each conflict choose to keep primary, keep primary plus a copy, or use the other version. Identical content is reused. New IDs and endpoint mappings preserve Collection membership, Library source membership, connections, pending links and pins. Incoming free-canvas content is offset to reduce overlap; free-form imported layouts may still need arrangement.

Keep primary only discards donor content and its exclusively owned child Boards. Existing references elsewhere, including rich-text Board links, protect those destinations. The explicit preview lists removed Board records before Apply. No live data changes on scan, preview or Cancel. A stale-workspace guard rejects applying a review after concurrent changes. Apply is one undoable workspace mutation.

All references to removed duplicate Board IDs redirect to the chosen primary. One non-cyclic ownership link remains nested; other occurrences become shortcuts. A Library ownership link is created in the project root if needed to avoid a cycle or an orphaned primary. Inline Board/pin links, shortcut pin destinations, tabs and obsolete views are remapped. Imported source aliases are retained so subsequent Milanote shortcuts can find the consolidated Board.

Tests: duplicate-boards.cjs exercises project boundaries, conflicts, Collection/Library/edge/pin preservation, keep-only behavior, external references, source aliases and input immutability. duplicate-boards-ui.cjs exercises preview/Cancel, Apply, Undo/Redo and reload. Review one name group at a time and rescan for other groups.
