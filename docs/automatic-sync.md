# Automatic Google Drive sync preview

Implemented while Silverlight is open. Real-account verification of this new build remains required. The owner already confirmed manual Windows → Android → Windows transfers on the preceding preview.

## Setup and first test
1. Export independent backups; install the new preview over each existing app. Do not uninstall or clear app data.
2. On Windows choose cloud → **Enable automatic sync**, complete Google consent, confirm Enable and wait for **Synced**.
3. On Android enable automatic sync with the same Google account and choose **Join workspace** for the workspace Windows just created. Enable sequentially; creating two separate automatic workspaces will not combine those groups.
4. Keep both apps open. Change one BOARD; the other device should receive it without Upload/Restore. Incoming updates wait while editing dialogs or gestures are active.
5. For conflict testing, edit the same BOARD differently while both devices are offline, then reconnect. Open **Review conflicts** when Needs attention appears. Every resolution preserves alternative content as separate conflict-copy BOARDS.

No new Google client/scopes are required. Windows reuses the existing Desktop OAuth JSON and may request consent once to retain an encrypted refresh credential. These preview tags remain outside stable update checks.

## Behavior and data protection
- Local saves debounce sync; open apps poll roughly every 15 seconds and retry on focus, Android resume, restart and internet return. Status includes Synced, Pending, Offline, Needs sign-in, Needs attention and Last synced. Pause and Sync now are available.
- Different BOARDS combine. Simultaneous edits within one BOARD and delete-versus-edit retain competing versions. Timestamps never silently select a winner.
- Persistent deletion tombstones prevent stale devices from resurrecting deleted BOARDS. BOARD/STICKY IDs, images, connections, nested links, tags, Collections and BOARD appearance are preserved. Tabs, views and favorite-color preferences stay local.
- Manual copies/recovery remain available; manual restore pauses automatic sync. Resume explicitly confirms propagation of changes made while paused, including deletions.
- Working workspace and sync history are committed together in IndexedDB. Incoming changes also save a local recovery copy in that transaction. A storage abort retains the previous durable workspace/history. Remote updates clear workspace-wide Undo/Redo to avoid reverting unrelated incoming BOARDS; Local recovery remains available.
- `silverlight-auto-v1` checksums cover workspace plus causal records. Each BOARD is a multi-value register with per-device vector clocks. Identical content joins safely; concurrent versions survive. Conflict resolution saves unselected content as independent BOARDS.
- Immutable Drive appData snapshots cannot overwrite competing uploads. No shared mutable manifest is used. Snapshot listing is paginated; previous manual snapshot format remains supported and is listed separately.
- Device identity, selected workspace, account identifier and causal history reside under `auto-sync-meta` in the existing IndexedDB store, outside exported workspace content. Changing Google accounts stops automatic transfers; native operations check expected account identity.
- Tokens never enter HTML or board exports. Android uses Google Play services authorization. Windows refresh credentials use CurrentUser DPAPI encryption in `%LOCALAPPDATA%/Silverlight/google-drive-session.bin`; access tokens remain in memory. Background requests never open consent UI; a revoked grant requires Connect Google.

## Limits
- Both devices must run this preview. No closed-app/background service, no within-BOARD STICKY-level merge.
- Full immutable snapshots and conflict history count toward the 64 MB transfer limit and consume Drive space. Automatic pruning and asset deduplication remain future work; listing stops safely at 10,000 snapshots.
- A linked BOARD deleted concurrently with changes to its references requires attention. Keep the linked BOARD or remove its references; sync never silently drops those links.
- Real-device consent, token renewal/revocation, restart, interruptions and conflict handling must pass before stable promotion. Google may require renewed consent while the OAuth project is in Testing.
- Additional PDF/ebook import improvements remain unimplemented.

Automated validation: snapshot integrity, tombstones, concurrent edits/deletions, continued edits during conflicts, reference protection, safe resolution and 80 delivery orders; two-browser-device offline/reconnect, conflict restart, storage rollback/retry, network retry, account switching and raw images; manual transfer and Sticky movement regressions.
