# Silverlight Archives — automatic Google Drive sync preview

Automatic syncing is implemented while Silverlight is open. This preview needs real-device verification before stable promotion. Syncing while the app is closed is not implemented.

- Saves, resume, restart and internet return trigger syncing; open apps also check roughly every 15 seconds.
- Different BOARDS combine. Competing edits within one BOARD and delete-versus-edit retain all versions for review. Resolution preserves alternative content as separate conflict-copy BOARDS.
- Deletion history prevents stale offline devices from resurrecting BOARDS. IDs, images, connections, tags, Collections and nested BOARD links remain intact.
- Incoming changes save a local recovery copy and sync history atomically. Pending edits stay local during outages or sign-in problems. Status includes Synced, Pending, Offline and Needs attention.
- Automatic requests never launch consent unexpectedly and stop if the Google account changes. Windows retains its refresh credential encrypted for the current Windows user; Android uses Google Play services.
- Manual upload, restore and Local recovery remain available. Manual restore pauses automatic syncing. Tabs, views and favorite-color preferences stay local.

First use: export backups and update both apps over the existing installations. On Windows choose cloud → Enable automatic sync, complete consent and wait for Synced. On Android enable it with the same Google account and Join workspace for the workspace Windows created. Keep both apps open for the first test. Reuse the existing Desktop OAuth JSON; no new Google client is needed.

Tests cover snapshot/merge integrity, 80 delivery orders, independent offline edits, conflict restart, safe copies, tombstones, storage rollback/retry, network retry, account mismatch, raw images, manual restore and Sticky dragging. Native builds/signature verification run in release workflows.

Limits: no closed-app syncing or within-BOARD automatic merge. Full immutable snapshots/conflict history count toward the 64 MB limit and consume Drive space. Snapshot pruning and asset deduplication remain future work. Additional PDF/ebook import improvements are not included.
