> AUTHENTICATION RELEASE BLOCKED: Google rejects this Desktop client without client_secret. Simulated OAuth tests are not real-provider validation. The build now fails its live configuration gate; sync reliability remains independently validated.

# Large workspace sync and Windows Google sign-in

- Fix Pending · Invalid string length from whole-history cloning, canonical hashing and aggregate asset serialization. Stream hashes and document parts; preserve existing v1/v2 datasets and checksums. No destructive migration or cloud deletion.
- Keep unopened boards unloaded when arranging the home screen.
- Ship the public Windows Desktop OAuth client ID. Connect Google through the system browser once per PC, remember authorization with DPAPI, refresh automatically, and sign out/reconnect from the cloud menu. No client secrets or copied tokens.
- Add >512 MiB logical-workspace worker/database/transfer regression coverage, interruption and corruption checks, and native PKCE/DPAPI/session tests before installer creation.

Install over the current application; do not uninstall or clear application data. Existing pending local edits and live-workspace membership are retained. On new PCs, sign in and join the existing workspace. Full details and remaining limits: docs/large-sync-reliability.md and docs/desktop-google-auth.md. Preview builds require real-account/second-PC confirmation before stable promotion.

# Silverlight Archives — workspace upload progress

- Upload workspace copy now shows an accessible progress bar during preparation, checking reusable parts, uploading and finishing.
- Multipart percentages count confirmed/reused parts plus the final workspace-copy step. They are upload-step progress, not estimated network-byte percentages. Small single-request uploads remain indeterminate until Drive responds.
- 100% appears only after Drive confirms the final copy. Failures retain an error state instead of showing completion. Progress remains available when reopening the cloud dialog, and duplicate upload actions stay disabled while busy.

Validation covers progress phases and reused parts, monotonic step counts, final-confirmation gating, small transfers, failures, reopening the cloud dialog, manual restore/recovery, automatic sync and the shared transfer/storage suites. Native packages are built by CI; physical-device uploads remain a device check.

## Previous release — live Google Drive sync

- Saved changes synchronize between open devices through the existing Google Drive workspace. Enabled automatic sync upgrades to the faster schedule automatically. New devices use cloud → Enable live sync, then Join workspace with the same Google account.
- Local saved edits request a send after about 600 ms; remote checks run about every 2.5 seconds. An edit cannot indefinitely postpone its send, and transfers never overlap. Actual delivery time depends on the network, Drive and transfer size.
- Idle polls skip workspace processing and uploads. Workspace/time-filtered Drive queries reduce listing overhead; overlap and periodic full scans recover late-visible snapshots.
- Editors, drawing and dragging remain protected from incoming changes. Explicit conflict-review actions still apply normally. Offline edits, restart, deletion tombstones, safe conflict copies and atomic recovery are retained. Hidden/closed apps catch up when reopened; this does not add a background service or per-keystroke shared editing.

Validation: production-timer simulated-Drive two-device latency, idle-work/upload suppression, draft-safe delivery, late-file repair, bounded scheduling, single-flight transfers, existing offline/conflict/restart/storage-failure/account checks, and shared snapshot/import/selection suites. Native builds compile both Drive filters. Real Google Drive latency on physical Windows/Android devices remains a device check.

## Previous release — scoped controls, cut/paste and precise image regions

- Ctrl+wheel over a Board canvas, the home canvas or the image-region viewport affects only that surface. Over headers and controls it changes UI scale. Windows disables WebView2's automatic Ctrl+wheel zoom and applies UI scaling explicitly.
- The home page has a clipped pan/zoom viewport without horizontal or vertical scrollbars. Drag empty space to pan; project controls remain fixed. Fit projects and Reset view make offscreen projects reachable, and bulk selection retains the current view.
- Ctrl+X picks up selected Stickies; successful Ctrl+V moves them to another Board or the selected Collection while preserving IDs, nested Boards, image regions and internal connections. The source remains until paste succeeds. Escape cancels pickup. External connections cannot span different Boards and are removed on a cross-Board move. Undo restores the move in one action. Text editors retain normal Cut.
- Image-region editing adds zoom controls, Fit image, Ctrl+wheel zoom, a Hand tool/middle-drag pan and two-finger pan/pinch. Region points stay in image coordinates through view changes.
- Ctrl+Z removes the last freeform point, Ctrl+Y/Ctrl+Shift+Z restores it, and toolbar Undo/Redo is available. Open dialogs isolate their keyboard and clipboard interactions from the background canvas. The background is inert until the dialog closes.
- Region hover/clicks use explicit shape geometry, including concave freeform outlines. Empty parts of an image and corners outside a shape no longer activate its region; keyboard focus retains an accessible outline.

Validation includes atomic cut/move/cycle/stale-source tests, hover geometry, end-to-end cross-Board/Collection moves and Undo, modal keyboard isolation, image point Undo/Redo, zoom/pan with a simulated two-finger gesture, fixed home controls, bulk-selection view preservation, and existing selection/navigation/storage/performance regressions. Native compilation and packaging run in CI; physical Windows wheel behavior and Android touch/install behavior remain device checks.

## Previous release — image regions and freeform home

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
