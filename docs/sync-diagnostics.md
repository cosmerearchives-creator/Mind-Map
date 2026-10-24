# Live sync progress and diagnostics

Open the cloud menu to view the active automatic sync cycle. The monitor shows loading images, processing/verification, saving, merging, hashing, and transfers. Transfer progress counts confirmed or reused parts and final confirmation; received MiB measure decoded payload, not HTTP overhead. Processing stages have no invented percentage. Elapsed and stage duration use a monotonic clock; last-progress age and a one-minute warning identify quiet operations without falsely declaring them dead or cancelling them. Completion appears only after the existing final persistence boundary. Conflicts remain Needs attention.

The main sync dialog is explicitly marked as a monitor and permits sending/receiving while open. Editors, restore-review dialogs, manual transfers and gestures retain their existing guards. Closing/reopening the monitor retains current progress; Sync now does not close it.

Download sync diagnostics writes a JSON file through the normal browser/WebView download flow. The localStorage key silverlight.syncDiagnostics.v1 retains at most 256 allowlisted events, with writes throttled to once per second and a final flush. Events contain stage enums, wall times, durations, numeric counts and a coarse error category. No document text/titles, originals, IDs, account details, URLs, raw errors, stack traces or OAuth values enter the report. Local persistence/render failures cannot reject a sync operation. Diagnostics are not uploaded automatically.

If sync stays slow, download the report while the operation is active. The report identifies the last reached boundary; a quiet stage may still be working. Main-thread blocking can also delay the displayed timer. It is not a guaranteed network-byte monitor or an automatic stall repair. Old diagnostic events can age out of the bounded log.

Tests: sync-diagnostics.cjs covers stage timing, stalls, advancement, retries, privacy, bounded persistence and failure isolation. sync-diagnostics-ui.cjs covers distinct images, delayed multipart upload, reopening the monitor, simulated quiet time, diagnostic download privacy, and incoming/outgoing sync with the monitor open. Existing live-sync, offline/conflict/rollback, manual restore, large-workspace and transfer suites remain release gates.

Release policy: publish regular releases after validation. Do not publish previews unless explicitly requested by the owner.
