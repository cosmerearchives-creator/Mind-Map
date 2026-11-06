# Canvas interaction polish — 0.16.1

The user explicitly completed both publication confirmations for this update. Scope includes the app on main, coordinated Windows/Android releases, and website Ko-fi links.

## Changes and limits

- Facing-edge connector attachment improves compact stacked branches. Sampling 18 varied-height targets verifies smooth branches do not enter any sibling rectangle. Automatic arrangement keeps separate components distinct and reduces spacing within a component. Existing manual junctions and connection records are preserved. This remains single-curve routing, not global obstacle avoidance; unrelated obstacles can still intersect a route.
- Ordinary Nested Board cards no longer receive the extra Open Board button or its additional height. Double-click navigation and inline titles remain.
- Floating editors prefer the right or left of the target. With insufficient screen space, overlap is allowed. The editor can extend below or partly beyond the viewport while dragging, but the centre of its top grip remains reachable. Windows Alt → View → Reset editor position restores the default beside-target placement. Resize also clamps the grip. Save/Cancel and genuine outside clicks retain their behavior.
- Spreadsheet and placeholder mouse interactions distinguish selection/drag from double-click entry. Enter remains available for keyboard activation. Spreadsheet Delete is checked separately in selection and cell-edit modes.
- Checkbox updates retain the original checkbox/canvas DOM. Canvas-first creation redraws the canvas instead of rebuilding the app shell. Explicitly scoped saves serialize changed/new Boards and retain the existing durable save, dirty-ID, backup, history and sync owners.
- Template lookup uses Board summaries and leaves unrelated deferred Boards unloaded. Drag-state copies are deferred until movement starts. Inline-to-popup transitions restore the original rich-editor styles and retain drafts and controls.
- Ko-fi icons are local inline SVGs and contact no service until clicked. The Windows Alt menu also links to the supplied URL. Website hub, canonical app page and legacy URL receive the same header link.

## Local checks

- Shared validation: scripts, snapshots, import integrity/acknowledgment, source deduplication, workspace capacity, streaming backups, sync and merge coverage passed.
- Focused UI checks: selection and drag, double-click activation, cell/Sticky deletion, Undo/Redo and durable reload; immediate checkbox feedback; beside-target placement and recovery; unloaded-board editor entry; desktop/touch formatting; drafts, templates, tab parking and popup switching passed.
- Website headers were checked at 1400 and 390 pixels, including canonical and legacy app routes, and screenshots inspected.
- Synthetic editor-entry experiment (120 deferred Boards, three cold contexts per variant): median 24.2 ms with the old template lookup versus 16.0 ms with the new lookup. Unrelated Boards loaded dropped from 120 to zero. This isolates template lookup and is not an end-to-end benchmark of the user's workspace or a universal frame-time guarantee.
- This computer has no .NET SDK or Android build tools. The existing GitHub workflows must compile native Windows/Android builds and run the native/emulator checks before the coordinated publisher makes the release updater-visible. Physical-device UI behavior is not established by browser tests.

No installed workspace, clipboard, user backup, Google account or signing identity was changed by these tests. All newly added fixtures are synthetic.
