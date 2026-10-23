# Silverlight Archives — Milanote PDF and ZIP import

- Import PDF / ZIP from Home or the add menu. Review objects, destinations and warnings before changing the workspace.
- ZIP top-level folders become Home Boards. Nested folders must match Board titles exactly except capitalization and contain their matching PDF. Missing or ambiguous branches are skipped and reported.
- Recover notes, rich formatting, colors, highlights, lists, Collections, images, Board artwork and positions where the PDF retains them. Board icons use titles below; Collection Board rows use titles beside artwork.
- Resolve shortcut badges to unique imported or existing Boards. Unresolved shortcuts retain artwork in Unsorted instead of creating duplicate Boards.
- Recover independent arrow endpoints and direction, then use Silverlight's existing curves and forks. Crossing arrows remain separate links. Ambiguous endpoints can be assigned in preview.
- Fully covered recovered notes go to Unsorted; partial overlaps are flagged. Pending connections reconnect when both endpoints are placed. Intentional background images stay on canvas.
- Board deletion offers an explicit option to include owned nested Boards, showing names and count. Shortcut destinations are excluded. Undo restores the deletion.

Import is best effort: flattened or omitted PDF content cannot be reconstructed, OCR is not included, and source fonts may map to available fonts. Large images are bounded with warnings. Existing workspace and sync data remain compatible.

Validation includes five supplied Milanote PDFs, 251 connector paths in the dense-arrow sample, offline extraction, transparency/photo artwork, ZIP hierarchy, import/reload, shortcuts, recursive deletion/undo and shared snapshot/merge, clipboard and cross-device sync suites. Native builds run in release workflows; physical-device import remains a separate verification step.

See docs/milanote-import.md for rules and limits. Earlier workspace, drawing navigation, editor and updater improvements remain included.
