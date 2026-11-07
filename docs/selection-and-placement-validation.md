# Selection and placement update (0.18.0)

Scope: partial-overlap selection, direct Sticky dragging, compact Nested Board defaults, true inline Board titles, smaller manual frames, project creation colors, relevant-Board wording, safe tag previews and original-resolution clipboard images. Publication on main and both native releases is user-authorized.

## Behavior and preservation

- Marquee hit testing uses rectangle intersection in canvas coordinates, in both drag directions and at the current zoom. Movement is coalesced per animation frame, the final pending movement is flushed on release, and the existing marquee node is reused. Selecting does not save, snapshot or redraw card content.
- Direct pointer drags use the existing selection movement/Collection ownership, Undo and durable-save path. Specific controls and active editors retain their actions. Native Codex/shortcut single-click navigation is preserved.
- Newly created Nested Board tiles are 100 by 100 canvas units, with titlePosition below and manual sizing. Existing frames and explicit title positions are retained. Board title editing uses the existing label as a plaintext-only editable element, not a replacement input; blur commits and exits on one outside click. Rich paste cannot create markup in the label or divert to the canvas clipboard collector. Shared and referenced owners are protected during inline editing. Right-click Edit uses the existing floating settings editor without changing the global note-editor preference.
- Minimum manual width/height is 20 canvas units across ordinary Sticky frames and resize paths. Auto-fit content and Collection children can still need additional space.
- placementColors lives on the owning project Board and is included in lazy Board summaries. Notes and Nested Boards each choose standard, fixed or random built-in-palette color independently. New items choose once; existing items, imports and copies retain their content/colors. Generic Board metadata persists through the existing backup and property-register sync formats.
- Imported WoB reference previews reuse the existing safe HTML presentation boundary and truncate parsed text with balanced markup. Anchors are unwrapped inside preview buttons. The stored source is unchanged.
- Clipboard images retain original bytes, decode natural dimensions before placement and use raw/manual display with matching image and frame geometry. The existing 8 MiB file limit remains. Existing images are untouched.

## Checks

The new selection-defaults-ui suite covers repeated partial-overlap selections on one free Collection/two notes without full redraws or geometry rebuilds; compact creation; original-label editing and one-click blur; floating settings; resize to 24 by 24; fixed/random colors, project isolation and nested inheritance; direct body dragging; physical checklist click-to-type; safe paragraph/emphasis preview; native-aspect 1252 by 373 paste; and durable reload. Existing title-editor tests were updated to assert the requested contenteditable label and floating context Edit.

Targeted checks also cover desktop marquee/Shift/group moves, Collection ownership transfer, spreadsheet/image controls and Delete, mirrored live edits/Undo, Codex references/navigation and the existing editor/Family Tree behaviors. Shared validation and the full browser suite run before release. Exact-main CI additionally checks the physical large-workspace backup, native Windows tests/build, bounded Android backup I/O, cold/warm offline Android sharing and signed APK compatibility. No installed workspace or live Google Drive account is used by these synthetic tests.
