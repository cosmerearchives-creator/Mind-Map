# Structured research and progress validation

This update changes only Sticky interchange/placement and operation feedback in Archives and WoB Tracker. Existing data stores, signing identities, backup formats and Drive sync protocols are retained.

## Coverage

- `arcanum-relationships.cjs`: optional background colors, exported item IDs, source-ID deduplication, stable relationship mapping, repeated imports, moved-group deduplication, changed connected versions, legacy packages, invalid references/styles, cancellation, snapshot and two-device sync preservation, large valid PNG and binary attachment contents.
- `arcanum-relationships-ui.cjs`: real IndexedDB save, blue and white Stickies and wire rendering, group movement to a destination Board with restart, persistent progress/completion, cancellation without acknowledgment, large PNG decoding/display and byte-exact attachment download.
- Existing package, ZIP-integrity, failed-save acknowledgment, backup UI, storage, selection/cut, navigation and sync suites remain in the release gates. The native Windows test writes and verifies a physical backup above 512 MiB with bounded writes.
- Archives Android instrumentation: offline content-URI delivery to a new and existing Activity, blue Sticky and saved relationship, repeat deduplication, durable acknowledgment and terminal progress state.
- Tracker Android instrumentation: WoBs with/without personal notes, multiple independently connected notes, stable item/link IDs, no empty note, saved-file read-back verification, backup progress, interrupted restore rollback, successful merge, duplicate-job guard and cancellation; unchanged-review-data acknowledgment safeguards.
- Tracker's `main` release gate installs the official Archives 0.14.2 APK, disables networking and performs a real cold-start app-to-app transfer before publishing. This test intentionally does not run on a development branch before the receiver release exists.

The old `navigation-selection-ui.cjs` script expects obsolete single-click Board navigation and fails the same assertion using the prior-release desktop-selection code. It is not the maintained browser release gate. The current navigation-patch and interaction suites pass; no unrelated navigation change was made to satisfy that script.

## Feedback audit and limits

Package creation/import, Android URI receiving, direct sharing and waiting for acknowledgment, manual package files, attachment saves, backup creation/verification/restore, PDF/ZIP commit, clipboard copying/cutting, sample import and updater download expose current stages and counts/bytes where available. Native backup verification/copying reports its real file total and stage percentage. Existing Drive sync diagnostics, resumable transfer progress, Archive Browser import progress and source-loading indicators were inspected and retained.

Updates are throttled and modify status elements/state only; progress does not serialize or redraw the workspace. Commit boundaries disable cancellation where rollback is no longer appropriate. Completion remains visible; failures have a useful retry path and never produce a successful transfer acknowledgment.

Old packages remain supported. Existing imported Stickies are not retroactively restyled or split. The 1000-item cap includes personal-note Stickies, so packages with notes for every WoB support at most 500 WoBs, subject also to the 4 MiB manifest limit. A browser download manager controls final browser-only attachment saving; native Windows/Android attachment files are read-back verified. Interrupted creation may leave an incomplete new external file; it must pass verification before restore. No other companion repository was inspected or changed. Physical Android devices were not tested; emulator tests are release gates.
