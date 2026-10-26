# Coordinated major update

Development stays on `silverlight-interaction-fixes-20261026`. The branch includes
`edf6121` (connection preview cleanup and nested-Board double-click) and `e56d08e`
(jitter threshold, measured automatic sizing, accessible Family Tree names).
The original fixes remain recoverable in Git history.

The desktop editor defaults to an editor anchored over the Sticky, with a pop-up
alternative using the same DOM and draft. Mobile defaults to the pop-up and can
choose the anchored presentation. Specialized Family Tree and document editors
share this presentation choice. Desktop rich formatting docks above the Board
tabs. Board interactions remain guarded while editing; this is not concurrent
editing of several Stickies on the same canvas.

Drive uploads batch changed Board causal records, including retained conflicts
and the closure of linked Boards required for integrity validation. The first
upload and every fiftieth upload are full checkpoints. Existing immutable asset
parts are reused. Incoming updates still use the guarded IndexedDB transaction
and recovery snapshot. Delta files are retained: the old pruning algorithm must
not delete dependencies on the assumption that every upload is a full snapshot.
This is Board-record incrementality, not a per-keystroke or individual-cell wire
protocol. Older clients can conservatively merge the existing v1 envelopes.

Templates are ordinary per-template Sticky records in a `Silverlight Templates`
Board, so the existing sync, backup and conflict mechanisms preserve them.
Canvas templates clone nested Boards and remap IDs with the selection engine.
Moving existing content to Unsorted preserves pending connection records and
collection membership for placement. Deleting canvas content does not recursively
delete the referenced Boards. Application is undoable. Note templates can retain
the old title/content, substitute escaped placeholders, and preserve formatting.

Family Tree routes group children only for matching complete parent sets and
relationship types/labels. Half siblings and mixed relationship types keep
separate routes. Each Sticky stores its summary/interactive diagram choice.
Person edit/delete, related-profile navigation and successive relationship
creation use the existing data model.

Android Back first delegates to the page, which closes editors/dialogs, protects
changed drafts, cancels connection gestures, navigates back, and only then allows
the Activity to exit. Package ID, persistent Android signing identity, Windows
installer identity, and Google OAuth configuration are unchanged.

## Validation commands

- `node tests/validate.cjs`: shared parsing and core regressions, including new
  templates, parent junctions, changed-record checksums and offline reconstruction.
- `node tests/browser-regressions.cjs`: 27 Edge suites, including two-device
  Drive simulation, interrupted writes, draft protection, templates and mobile UI.
- Branch Windows workflow: native updater/authentication checks, browser checks,
  application packaging and installer compilation.
- Branch Android workflow: shared validation, native release compilation and
  verification with the existing signing certificate.

Native builds and the complete browser pass must succeed before merging to main.
The coordinated release workflow waits for both native builds of the same main
commit and then publishes both installers in one release. No feature branch
publishes a public release. Prior releases remain available for rollback; export
a backup before installing and retain it independently of live Drive history.

The unified 0.9.0 tag is understood by the updated native updaters. Legacy
updaters filter only their historical platform-specific tag prefix, so the first
upgrade to this unified release may require using its direct installer links.
Install over the existing application; do not uninstall or clear storage.

Physical Windows/Android interaction and real-account Google Drive latency are
not established by simulated browser tests or compile checks.
