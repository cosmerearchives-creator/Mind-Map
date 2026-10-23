# Silverlight Archives — rich notes and Board navigation

- Note Stickies support rich text inline and expanded: fonts, sizes, text/highlight colors, emphasis, headings, lists, indentation, alignment, links and undo/redo.
- Type @ or choose @ Board for searchable links to existing Boards and named Location Pins. Back restores the previous Board view. Pin links center their destination at the current zoom.
- Board Shortcut Stickies reference existing Boards without duplicating them; optional pin destinations and independent deletion are supported.
- Double-click/tap blank canvas to create a named, movable Location Pin.
- Board and shortcut titles can appear inside, below artwork, or hidden while preserving background art.
- Each Board has an Unsorted Library for explicitly pasted images, formatted text and URLs. Ctrl+V/Paste collects; clicking never reads the clipboard. Place or drag ideas onto the canvas. Image transparency is preserved.
- Sticky menus remain fixed at top right. Viewing and resizing clip overflow without scrollbars or data loss; editing can expose the full content.
- Backup imports preserve connections, Collection membership, library contents and pin references while remapping colliding Board IDs.

Update both devices over existing installations. Legacy notes remain unchanged until explicitly saved. Rich documents use the existing atomic note-body sync property; older versions preserve the saved string but display its markup, so use the new version on both devices. Existing Drive sync and recovery formats remain in place. Concurrent library changes retain Board conflicts for review.

Validation: shared-script and snapshot/property merge suites, rich document/library preservation, two-device automatic sync and transfer/rollback browser suites, desktop/touch Sticky and canvas regressions, plus rich editing, @ links, pin centering/Back, shortcut title placement, sanitized paste/place and reload checks. Android signing and Windows installer builds run in release workflows; consult the linked workflow results for the exact commit. Physical-device clipboard, keyboard, external-browser and upgrade checks are not established by these automated tests.

See docs/rich-notes-navigation.md for storage and compatibility details.
