# Silverlight Archives — storage-aware workspaces

- Remove the fixed 256 MiB total workspace/import cap. Paste and import check estimated device storage; low-space warnings explain when storage is getting tight. Atomic saves remain authoritative if quota estimates are unavailable or change.
- Open saved Board models on demand and release previously opened models during navigation. The home screen uses lightweight summaries.
- Load original images from IndexedDB when needed with a bounded original-image cache. Backups, copying and sync include unopened Boards and preserve original image bytes and transparency.
- Accept multipart cloud workspaces larger than 256 MiB. Older snapshot checksums remain compatible; large snapshots use content-addressed checksums. Update both devices before syncing workspaces above the previous limit.
- Keep single-selection clipboard, individual image and individual native network-request safeguards. These are separate from total workspace size.

Validated with an actual 272 MiB unique-image workspace and lossless simulated multipart upload/download; on-demand loading, quota rejection/rollback, full backups, migration, editing, clipboard and two-device sync regressions passed. Device memory, available storage and large export/sync operations still impose practical limits. Physical Android behavior and real signed-in Drive transport remain unverified.
