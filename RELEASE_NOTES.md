# Silverlight Archives — clipboard fidelity and Windows selection

- Windows: middle-button drag pans; left-button drag on blank canvas selects a rectangle. Shift-click adds/removes Stickies. Drag a selected Sticky to move the selection together. Ctrl+C / Ctrl+V copies and pastes a selection with relative layout, internal connections, Collections, and owned nested Boards. Editor and touch gestures retain their normal behavior.
- Milanote clipboard Board tiles now create blank nested Boards when their contents are not copied. Titles default below compact icons; Board rows inside Collections use titles beside their icons. Existing title-position options remain available. PDF/ZIP missing-Board placeholders retain their previous behavior.
- Recover Collection members from HTML when the structured clipboard includes only the Collection container. The supplied 9-Board/2-Note Collection was verified locally.
- Preserve source Note background colors and explicit dimensions, including large background Notes. Automatically size ordinary Notes to their recovered content. Default text switches for contrast on dark backgrounds; explicit text colors remain intact.
- Recover original image pixels from Milanote public media URLs instead of one-pixel color thumbnails. Images are stored locally in the workspace. Sanitize and rasterize copied drawing annotations; recover Board icons. Failed or unavailable media produces a warning and a placeholder, with no credentials requested.
- Route Milanote INBOX items to the destination Board's Unsorted Library, preserving order. Pending connections reconnect when their endpoints are placed.
- PDF/ZIP import validation failures now show a visible error instead of leaving the Import button apparently unresponsive. This improves diagnosis; the original reported import failure has not been reproduced from its exact source archive.

Validation includes isolated browser tests of the supplied clipboard samples (background/compact Boards, Collection members, five full images, two drawings and seven connections), selection/group copy/paste/undo/pan, Library routing, formatting, existing Collection/touch/drawing controls, snapshot/merge, automatic sync and manual transfers. Native release builds run platform validation and bounded media-download tests before packaging. Physical installed-app interaction and Android clipboard/media behavior still require device testing.

Private clipboard samples were kept local and are not distributed. See docs/clipboard-layout-selection.md for usage and limits.
