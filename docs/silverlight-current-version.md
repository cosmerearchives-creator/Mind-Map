# Silverlight — current-version feature inventory

Release baseline: October 22, 2026. The application may still display **Openboard** in older builds or interface areas. This file establishes the agreed vocabulary and behavioral baseline; it is not a claim that every flow has been device-tested.

## Vocabulary (use consistently)
- **HOME PAGE**: The top-level library displaying main boards.
- **BOARD**: An independent, zoomable canvas/workspace. A board can be main or nested.
- **STICKY**: *Every object placed on a board*, including text, checklists, links, images, nested-board representations, and collections. All generic operations on Stickies apply to Board Stickies unless an explicit exception is stated.
- **BOARD STICKY**: A Sticky on one board which opens another board. The same nested board is both a BOARD (its own workspace) and a STICKY (in its parent).
- **COLLECTION**: A resizable Sticky that organizes other Stickies on the same board.
- **CONNECTION**: A visible relationship between Stickies. **HANDLE** is the + control on a Sticky; **TRUNK** is a shared connection segment; **BRANCH** is its individually editable offshoot; **JUNCTION** is the draggable splitting point; **LABEL** is a small text box directly *on* its segment.
- **TAG**: Case-insensitive keyword on a Sticky or manually on a board. Tag namespaces are scoped to the main-board hierarchy.

## Current feature baseline

### HOME PAGE / BOARD
- Home page lists main boards only; nested boards are reached through Board Stickies.
- Main boards and nested boards each have an infinite zoomable, pannable workspace, tabs and saving.
- New Sticky types: text, checklist, link, Board Sticky, Collection. PDF import includes board reconstruction attempts.
- Double-tap blank canvas opens creation dialog.
- Editing a text Sticky can convert it to a Board Sticky; nested boards are not silently destroyed on detachment.

### STICKIES
- Every object on a board is a Sticky, including a Board Sticky.
- Stickies support colors, editing, dragging, tags and connection handles where applicable.
- Tags are available during new Sticky creation as well as later editing.
- Board Stickies link to separate board data rather than copying it.

### COLLECTIONS
- Collections are resizable canvas containers represented as Stickies.
- Drag a Sticky into a Collection to stack it with that Collection's members; drag out to detach without deleting.
- Move a Collection to move its organized contents. Membership is saved in the board data.
- Board Stickies count as Stickies for collection membership.
- Collections may contain other Collections; cyclic nesting is forbidden.
- Review on Android and Windows: nested sizing, drag precision, responsive stacking, and connection routing.

### CONNECTIONS
- Visible + handles on Stickies can be dragged to create connections.
- One-to-many connections use a shared trunk and independently branching segments.
- Long-press or drag the junction dot to reposition it; double-tap can reset to automatic placement.
- Tap a connection or trunk to edit it or delete it.
- Each branch supports forward/backward/both/none arrow directions.
- Each branch and shared trunk supports an independent label *directly on* the line (not floating off to a side).
- Review on devices: hit targets, junction interaction, curved-line labels and line routing.

### TAGS
- Comma-separated, trimmed, case-insensitive tags, with duplicates merged.
- Board tag summaries count cards directly on that board only, not recursively inherited descendants.
- A manual board tag can exist without any matching card.
- Tap a tag to open a board with the same name within its main-board hierarchy, if present.
- A board named for a tag can import references to matching boards anywhere under the same main board.
- Matching imports include explicitly tagged boards **and** boards with directly contained cards using that tag; duplicates are avoided.
- Tag searches do not cross main-board boundaries.

### DATA / PLATFORMS
- Offline-first data, JSON backup/import, autosaving, undo/redo, Android WebView and Windows WebView2 wrappers.
- Signed Android APK workflow and Windows installer workflow.
- Update checking on both platforms is part of the current version.
- Google Drive synchronization remains a separately planned feature, **not** a delivered guarantee.

## Release/testing rule
This inventory is a feature contract, not a comprehensive QA certification. Confirm Android touch workflows, Windows mouse workflows, nested-board preservation, undo/redo, backup round-trip, and release installation before treating this version as a stable final release. Do not equate a GitHub workflow starting with a published downloadable release.

## Future development
Preserve the HOME PAGE / BOARD / STICKY vocabulary in issue reports, discussions and code-facing specs. Treat generic Sticky changes as applicable to Board Stickies. Log regressions and future feature requests against this baseline.

## October 22 — Sticky editor, media and appearance release
- Double-tapping a BOARD opens a unified **Create Sticky** dialog with **Note**, **Collection**, and **Image** tabs. Notes are the default.
- The Note tab includes title, notes, tags and the nested BOARD STICKY toggle. The Collection tab creates a resizable COLLECTION. The Image tab can import a local image as an IMAGE STICKY.
- IMAGE STICKIES can be moved, placed in COLLECTIONS and stretched or shrunk via a corner resize control.
- Sticky appearance controls include default colors, an arbitrary custom color picker, favorite colors saved in the application, and an uploaded image background with fill/fit/tile and overlay opacity.
- Existing Stickies have the background customizations available in their editor.
- App branding uses **Silverlight Archives** with the tower emblem on the header and Android/Windows application icons.

**Verification limitation:** JavaScript syntax parsing and platform build workflows are not equivalent to interactive testing. Touch behavior, image file persistence, background display, image sizing, and new dialogs should be manually validated on Android and Windows.

**Still planned, not in this release:** Google Drive device synchronization and conflict resolution.

## October 22 — Organization and layout follow-up
- Collections: collapse/expand and manual up/down reordering of contained Stickies, preserving the ability to drag Stickies into and out of Collections. Existing nested Collection layouts remain a QA concern.
- Tags: while typing, suggest tags within the current main-Board hierarchy; tapping a tag without a same-named Board opens a list of matching Stickies for navigation.
- Connections: labels on individual branches and shared trunks can be dragged along their respective connection segments (position saved).
- Images: edit an Image Sticky to choose proportional resize or unrestricted stretching; original image dimensions supply its aspect ratio for new uploads.
- This release does **not** include Google Drive sync or improvements to PDF/ebook import. Those remain separately planned.
- Verify Android touch and Windows mouse interactions, Collections inside Collections, image persistence, line-to-Sticky routing, and save/restore before marking fully stabilized.

## October 22 — Windows dragging and Raw image follow-up
- Mouse dragging starts on movement without a hold delay for every Sticky type. BOARD STICKY content no longer uses nested buttons that consume dragging. Double-click/double-tap opens its BOARD; its menu still edits the Sticky.
- Touch retains its hold delay for dragging and pre-hold movement for canvas panning.
- Image creation and editing offer Placard (default for old images) and Raw. Raw hides the placard background/frame, preserves source alpha transparency and retains standard Sticky operations. Selecting Raw reveals its title/menu and tags.
- Automated browser checks cover six Sticky types, BOARD opening, Raw editing and persistence, and touch hold versus pan. Platform build workflows validate packaging; real-device installation and touch verification remain outstanding.
- Google Drive sync/conflict resolution and additional PDF/ebook import improvements remain unimplemented.
