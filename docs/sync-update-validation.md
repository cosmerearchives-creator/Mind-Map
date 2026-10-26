# Unpublished synchronization update

This development change builds on commit 3d074510 (the existing v0.9.0 release). It does not change the public release or updater channel. Both devices must use the updated application before exchanging the new automatic transfer format. Manual copies continue to use the existing format.

## Behavior

- Windows and Android expose the Google Drive changes journal within the existing app-data scope. The client acquires a start token before its initial repair listing, follows every page, and advances its in-memory cursor only after successful processing. HTTP 410 causes a new token and full repair listing. Restart, focus and periodic repair remain available.
- Ordinary unchanged polls do not list all snapshots, capture Boards or hash the workspace. Remote discovery runs before local capture. This is polling every 2.5 seconds while open and online, not server push or guaranteed latency.
- A saved-edit generation prevents repeated captures when only remote state changes. Local edits still require workspace validation and checksum work; this is not a claim that every operation is independent of workspace size.
- Identical joining Boards adopt the existing causal history without making another full upload. Different local content is retained for conflict review. Verified full envelopes identify history they already include, allowing redundant older snapshot downloads to be skipped while retaining concurrent unseen snapshots.
- Automatic transfers can send sparse document patches and reuse immutable image parts. Original automatic-envelope checksums, transport checksums, reconstructed-document checksums and image checksums remain required. Native part batches are bounded to three requests. The final manifest is uploaded after its parts succeed.
- Verified parts and document bases have an optional bounded, account-separated IndexedDB cache. Interrupted downloads can resume without fetching cached parts again. Cache failures do not replace workspace data or prevent fallback downloading.
- Remote changes to other Boards can apply while an editor is open. The edited Board and its causal observation remain protected until the draft closes or saves. Same-Board incoming changes remain queued; this is not live collaborative text editing.
- Full transfer checkpoints run after 49 incremental uploads and 15 seconds without saved edits. A new edit can interrupt preparation/part transfer before the final manifest. Previous cloud snapshots and local recovery remain available; this update adds no new deletion policy.

## Validation

Local checks passed: shared script parsing and core suites; the existing 28 browser regression suites; new production-timer two-device journal and sparse-transfer tests; real IndexedDB interruption/resume, account-isolated caching and bounded parallel downloads. The two-device tests cover identical joining, bidirectional edits, parked draft preservation, unrelated-Board updates, paginated changes, backdated snapshots and expired cursor repair. Simulated edit delivery was approximately 1–3 seconds on the small fixture, not a measurement of real Drive or a large customer workspace.

Windows native tests additionally exercise fake-HTTPS journal filtering, journal-authorized downloads, parallel part limits and rejection of non-part batch uploads. Windows and Android compilation, signed packaging and final regression results must be checked on the development-branch CI runs before release.

Real-account simultaneous editing on Windows and Android, including the user's large workspace and reconnect behavior, still needs device validation. No public release has been made by this update. Universal inline editing, all-type Sticky sizing and complete Canvas Template copying are separate outstanding release items; this sync change does not mark them complete.
