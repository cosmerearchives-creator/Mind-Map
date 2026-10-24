# Clipboard fidelity and desktop selection

## Windows canvas controls

Middle-button drag pans anywhere on the canvas. Left-button drag on blank space selects fully enclosed Stickies. Shift-click toggles items in the selection. Drag any selected Sticky to move the selected group. Selecting a Collection also moves/copies its descendants. Connections continue to render using native curves and forks. Existing drawing-mode Hand/middle-button pan and Android touch gestures remain supported.

Ctrl+C writes a Silverlight selection to the system clipboard; Ctrl+V on a Board pastes it. New IDs are allocated, relative positions are preserved, internal connections and labels are retained, and owned nested Boards are cloned. Connections to unselected items are excluded. External shortcut destinations remain references. Copying is limited to 16 MiB; pasted workspaces retain the existing 64 MiB sync limit. Paste and group movement support Undo/Redo. Normal text editing keeps normal clipboard behavior.

## Milanote paste recovery

Copy cards in Milanote, then paste on an open Silverlight Board. A cancellable preparation stage recovers media, followed by a review before any workspace change.

- BOARD tiles create real blank nested Boards when descendants are absent. Included descendants still populate their Boards. This behavior applies to clipboard paste; PDF/ZIP missing-Board Notes are unchanged.
- Collection HTML can contain member objects absent from the custom JSON. The importer reconstructs supported members by element ID and retains Collection membership without duplicating JSON members.
- Grid coordinates and dimensions use ten pixels per source grid unit. Default Board tiles are 80 by 80 pixels with titles below; Collection Board rows use titles beside icons. Exact original dimensions are used when available. Normal text Notes use recovered content height; explicit height settings are preserved.
- Source background colors, named palette values, transparency and explicit text colors are retained. Default text chooses a contrasting light/dark color. Source fonts/layout may still vary across platforms.
- Source INBOX objects go to the destination Library. Indexed order is retained, and connections involving Library objects remain pending until both endpoints are placed. Placing a Library Collection also places its included members.
- Original image URLs are preferred over tiny thumbnail placeholders. Native Windows/Android download only HTTPS app.milanote.com/media/p/ and media.milanote.com/p/resized/ images, without cookies, credentials, non-default ports or redirects. Supported images are PNG/JPEG/GIF/WebP, at most 8 MiB per file and 64 million decoded pixels. Total paste image recovery is bounded. Failures are reported rather than replaced with a misleading solid-color pixel.
- SVG drawings/icons are reduced to a safe drawing subset and rasterized to PNG; scripts, external resources, foreign objects and active content are removed. Drawings remain movable image Stickies.

The supplied source samples were verified locally: one large blue background Note with five compact Boards; a Collection with nine Boards and two Notes; and a map selection with five original photos, two annotations and seven native connections. These personal samples are not checked into Git. Synthetic regression fixtures cover the same structures. Actual installed-app clipboard behavior, device rotation and Android media permissions need physical-device verification.

## Import feedback

PDF/ZIP validation exceptions now show a clear message before changing the workspace. The previous no-response report may have resulted from this error path, but its exact original cause remains unconfirmed without the failing source archive.

## Checks

Run node tests/validate.cjs for shared parser/snapshot/selection checks. Browser suites require Playwright and Edge: tests/clipboard-recovery.cjs, tests/library-import.cjs, tests/desktop-selection.cjs, tests/milanote-clipboard-ui.cjs and the existing editing/sync suites. Native CI tests media origin restrictions, MIME and byte limits and failed redirects before packaging.

## Board cleanup and clipboard visual follow-up

Home screen Select boards enables checkboxes; Select all shown respects the search filter. Delete selected shows one deduplicated list of affected Boards, defaults to deleting owned descendants (including those stored in Unsorted), and can be cancelled or undone. Uncheck the nested option to preserve descendants as home-screen Boards. Shortcuts never traverse into their destinations.

Unattached Milanote LINE objects are rasterized with transparent padding into raw Image Stickies; attached connectors retain native routing. A missing attached endpoint is reported instead of guessing a destination. Board HTML can supplement image references and colored icon backgrounds even when JSON already contains the Board. Collection rows use centered 48px thumbnails and adjacent titles. Earlier imports must be pasted again to recover pixels/colors that were never saved. The actual marketplace clipboard sample was subsequently verified locally: three Collections, ten nested Boards, three downloaded photo thumbnails and seven colored icon tiles, including persistence after reload. The inner board-icon-content element supplies tile colors; its outer BoardIcon is uncolored. The photo CDN media.milanote.com/p/resized/ is accepted by both native downloaders with the same HTTPS, credential, port, MIME, size and redirect restrictions.

Additional regression: node tests/board-bulk-and-clipboard-visuals.cjs.

Update: missing Milanote shortcut destinations become blank owned nested Boards; repeated aliases share a destination. Group dragging handles linked content and applies Collection drops together. Owned nested Sticky deletion confirms actual destination/subtree removal, while shortcut deletion only removes the reference. Home bulk selection retains its scroll position.
