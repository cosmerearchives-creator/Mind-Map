# Archives of Arcanum 0.16.0 — canvas creation and compact editors

## User workflows

| Type | Creation | Direct editing / settings |
| --- | --- | --- |
| Nested Board | Blank Board placed on the canvas, title focused | Inline title; Open Board action; existing navigation retained |
| Collection | Blank Collection placed immediately | Click title; right-click Edit note for compact settings |
| Image | Frameless placeholder placed immediately | Click Add image or drop a file/website image; right-click Edit note for compact settings |
| Family Tree | Blank diagram with Add first person | Inline title, contextual person actions, direct person dragging, relationship-line editing and optional expanded view |
| Spreadsheet | Blank grid placed immediately | Click cells; formulas/formatting, range copy/paste, dimensions, row/column changes and paging in the top toolbar; expanded editor retained |
| Checklist | Note-like card with an editable title and entries | Enter adds an entry; checkboxes toggle on the canvas; compact appearance/tag settings remain available |
| Link | Card placed with its settings editor open | Configure the address and settings; Cancel removes an unsaved new Link |
| Location Pin | Small marker and inline label, ready to type | Drag marker; compact icon/color/Notes settings; copy a link that centers/highlights the marker |
| Codex / Timeline / Shortcut | Existing preparation workflows | Existing specialized tools retained |

Compact editors have a draggable/keyboard-movable top grip, a single-line title at the top, collapsed Notes, and sizing/layer dropdowns beside their labels. They stay within reach when the window changes size. Save/Cancel, resize, parked editor drafts, and original record identity continue through the existing owners.

## Board views

Board actions → **Set Board start here** stores the current position and zoom on the Board. A first visit without a remembered view uses it. Later visits retain the last locally remembered view. **Reset view** returns to the saved start; Boards without one retain the prior reset behavior. Ordinary panning and zooming still save navigation independently of Board bodies and do not become workspace content edits.

## Preservation and imports

- Use the existing save, Undo, asset, recovery, backup and sync paths. Keep Android application/signing identity, Windows installer identity, account configuration and updater asset names.
- New checklists store stable item IDs, plain entry text and boolean completion state, with a readable body fallback. Existing checklist content is not rewritten simply by rendering it. On first conversion/edit, retain the original legacy body in `legacyChecklistBody`; existing source metadata and recovery fields remain intact. Snapshot and sync validation reject malformed checklist records and invalid starting views before accepting a workspace.
- Placeholder replacement changes image fields on the original card. Preserve its ID, position, reserved frame, title, notes, tags, attachments and connections. Decode/check size/capacity before mutation; failed or stale-target drops leave the placeholder intact. Keep original image bytes offline and fit proportionally unless the user disabled that option. Sites that block downloading may still require saving the image locally first.
- Protect active inline fields, spreadsheet controls and person-drag gestures from incoming Board replacement. Ignore stale editor/async-paste targets. Image-region creation with its existing specialized callbacks keeps those callbacks.

## Embeds

Exported notes use a public whitelist of computed typography, padding, title visibility and body placement. Measurement includes imported-note classes and contrast colors, so small imported headings and dark-background notes match their app presentation. Text that fits has no unnecessary scrollbar; genuinely overflowing notes remain scrollable. The viewer retains its strict script-hash policy, standalone read-only code, and exclusion of unselected Board content/references/assets.

## Verification

The browser runner now includes 57 suites. New tests cover blank placement, title editing, checklist rows/toggles/settings, spreadsheet formulas, compact editor dragging/bounds, touch-sized placement, Family Tree contextual actions and direct dragging, middle-pan over diagrams, Board start/last-view/reset, pin links/highlighting, imported-note export layout, and persistence after reload.

Dedicated placeholder tests exercise local and website image drops, original bytes and proportions, retained metadata/frame/edges, rejection without mutation, and Undo/Redo/reload. Core tests verify new records through snapshots and independent-device edits, including rejection of malformed data. Existing suites retain document formulas/formatting, broad Family Tree relationships/cycle checks/manual layout, parked drafts, backup/recovery, source deduplication, large-workspace transfers, and continuous pan/zoom coverage.

All test content is synthetic and uses isolated profiles. The installed application and the user's backups were not edited. Windows/Android native build, signing, packaging and Android offline share checks run again on the confirmed main release. Browser/touch emulation does not establish physical-device keyboard, lifecycle or real Drive/website behavior.
