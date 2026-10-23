# Silverlight Archives — simpler Board imports

- Import PDF / ZIP from Home or the add menu. Review objects, destinations and warnings before changing the workspace.
- Put each main Board and all descendant PDFs together in one folder. Choose its main PDF, and the importer reconstructs nesting from Board titles and filenames. Existing nested folder layouts remain supported.
- Duplicate filename matches, ownership conflicts and cycles require review before import.
- Nested Board tiles with no associated PDF become Notes titled with the Board name, containing exactly: (EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD). Position, Collection membership and connections are retained; Notes can be converted to new Boards in the normal editor.
- Recover notes, rich formatting, colors, highlights, lists, Collections, images, Board artwork and positions where the PDF retains them. Board icons use titles below; Collection Board rows use titles beside artwork.
- Resolve shortcut badges to unique imported or existing Boards. Unresolved shortcuts retain artwork in Unsorted instead of creating duplicate Boards.
- Recover independent arrow endpoints and direction, then use Silverlight's existing curves and forks. Crossing arrows remain separate links. Ambiguous endpoints can be assigned in preview.
- Fully covered recovered notes go to Unsorted; partial overlaps are flagged. Pending connections reconnect when both endpoints are placed. Intentional background images stay on canvas.
- Board deletion offers an explicit option to include owned nested Boards, showing names and count. Shortcut destinations are excluded. Undo restores the deletion.

Import is best effort: flattened or omitted PDF content cannot be reconstructed, OCR is not included, and source fonts may map to available fonts. Large images are bounded with warnings. Existing workspace and sync data remain compatible.

Validation includes five supplied Milanote PDFs, 251 connector paths in the dense-arrow sample, offline extraction, transparency/photo artwork, flat and nested ZIP hierarchy, duplicate resolution, empty Note conversion, import/reload, shortcuts, recursive deletion/undo and shared snapshot/merge, clipboard and cross-device sync suites. Native builds run in release workflows; physical-device import remains a separate verification step.

See docs/milanote-import.md for rules and limits. Earlier workspace, drawing navigation, editor and updater improvements remain included.
