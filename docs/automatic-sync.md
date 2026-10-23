# Automatic Google Drive sync

Implemented while Silverlight is open. The owner confirmed manual transfers and automatic syncing on Windows and Android before stable promotion.

## Setup and first test
1. Export independent backups; install the stable release over each existing app. Do not uninstall or clear app data.
2. On Windows choose cloud → **Enable automatic sync**, complete Google consent, confirm Enable and wait for **Synced**.
3. On Android enable automatic sync with the same Google account and choose **Join workspace** for the workspace Windows just created. Enable sequentially; creating two separate automatic workspaces will not combine those groups.
4. Keep both apps open. Change one BOARD; the other device should receive it without Upload/Restore. Incoming updates wait while editing dialogs or gestures are active.
5. For conflict testing, edit the same BOARD differently while both devices are offline, then reconnect. Open **Review conflicts** when Needs attention appears. Every resolution preserves alternative content as separate conflict-copy BOARDS.

No new Google client/scopes are required. Windows reuses the existing Desktop OAuth JSON and may request consent once to retain an encrypted refresh credential. Existing automatic-sync settings and OAuth configuration remain in place when updating over the preview. Stable releases are offered by the normal update checks.

## Behavior and data protection
- Local saves debounce sync; open apps poll roughly every 15 seconds and retry on focus, Android resume, restart and internet return. Status includes Synced, Pending, Offline, Needs sign-in, Needs attention and Last synced. Pause and Sync now are available.
- Different BOARDS and compatible STICKY/property edits within one BOARD combine. Separate additions, independent STICKY edits, and movement plus text edits merge without a prompt. Contradictory properties or deletion-versus-edit retain competing BOARD versions for review. Timestamps never silently select a winner.
- Persistent deletion tombstones prevent stale devices from resurrecting deleted BOARDS. BOARD/STICKY IDs, images, connections, nested links, tags, Collections and BOARD appearance are preserved. Tabs, views and favorite-color preferences stay local.
- Manual copies/recovery remain available; manual restore pauses automatic sync. Resume explicitly confirms propagation of changes made while paused, including deletions.
- Working workspace and sync history are committed together in IndexedDB. Incoming changes also save a local recovery copy in that transaction. A storage abort retains the previous durable workspace/history. Remote updates clear workspace-wide Undo/Redo to avoid reverting unrelated incoming BOARDS; Local recovery remains available.
- `silverlight-auto-v1` checksums cover workspace plus causal records. Each BOARD retains a multi-value register with per-device vector clocks, plus per-property registers for new edits. A STICKY position is one combined x/y property. Entity existence registers protect deletion-versus-edit. Compatible projections join causal clocks before subsequent edits. Legacy records remain readable; mixed app versions fall back to conservative BOARD conflicts. Identical content joins safely; concurrent versions survive. Conflict resolution saves unselected content as independent BOARDS.
- Immutable Drive appData snapshots cannot overwrite competing uploads. No shared mutable manifest is used. Snapshot listing is paginated; previous manual snapshot format remains supported and is listed separately.
- Device identity, selected workspace, account identifier and causal history reside under `auto-sync-meta` in the existing IndexedDB store, outside exported workspace content. Changing Google accounts stops automatic transfers; native operations check expected account identity.
- Tokens never enter HTML or board exports. Android uses Google Play services authorization. Windows refresh credentials use CurrentUser DPAPI encryption in `%LOCALAPPDATA%/Silverlight/google-drive-session.bin`; access tokens remain in memory. Background requests never open consent UI; a revoked grant requires Connect Google.

## Limits
- Both devices must run a release supporting automatic sync. No closed-app/background service. Update both devices for within-BOARD STICKY/property merging. Conflicting properties still use the existing BOARD-version review and safe-copy resolution.
- Full immutable snapshots and conflict history count toward the 64 MB transfer limit and consume Drive space. Automatic pruning and asset deduplication remain future work; listing stops safely at 10,000 snapshots.
- A linked BOARD deleted concurrently with changes to its references requires attention. Keep the linked BOARD or remove its references; sync never silently drops those links.
- Owner confirmation covers working syncing; long-running token renewal/revocation and every interruption scenario have not been independently verified on physical devices. Google may require renewed consent while the OAuth project is in Testing.
- Additional PDF/ebook import improvements remain unimplemented.

Automated validation: snapshot integrity, tombstones, concurrent edits/deletions, continued edits during conflicts, reference protection, safe resolution and 80 delivery orders; two-browser-device offline/reconnect, conflict restart, storage rollback/retry, network retry, account switching and raw images; manual transfer and Sticky movement regressions.
