# Silverlight Google Drive Sync — Implementation Contract

Status: **OAuth setup required; synchronization is NOT enabled yet.**

## Authorization
- Use Google Play services AuthorizationClient with `https://www.googleapis.com/auth/drive.appdata`.
- Android OAuth app ID `com.cosmerearchives.silverlight` registered in a Google Cloud project, with SHA-1 of the **permanent release signing key**.
- Enable Google Drive API and configure consent screen/test users as appropriate.
- Do not store credentials or access tokens in HTML, GitHub commits, or backup files.
- Use native Android integration. Google login must not run in the embedded WebView.

## Local data
- Existing Openboard v0.6 stores workspace in IndexedDB, with legacy localStorage fallback.
- Its JSON backup format is `{format:'openboard-v1',boards:[...],views:{...}}`.
- Backups include card data and potentially embedded base64 images. Current JSON import alters card IDs and drops connections: **do not use the UI's import handler for merge-based sync**.

## Cloud layout
- Store files in Drive `appDataFolder`, e.g. `silverlight/manifest-v1.json` (Drive appDataFolder does not expose visible nested folder paths, so use file names like `silverlight-manifest-v1.json`).
- Store immutable per-device/version snapshot files: `silverlight-snapshot-<device>-<revision>.json`.
- Manifest contains schema version, snapshots, revision hash, originating device ID, board IDs, updated timestamps and record counts.
- The app should use Drive REST API `files.list` in appDataFolder, upload and download snapshots via `files.create`/media and `files.get?alt=media`.
- Keep multiple snapshots for recovery. Never delete or replace the only existing backup.
- Never put user boards in the public code repository.

## Sync behavior
- First sign-in: show cloud snapshot details and allow manual Restore / Upload before starting automatic sync.
- Auto-sync after local saves using debounce; sync again on app foreground and when internet returns.
- Keep working offline; enqueue pending changes.
- For board conflicts: compare revisions. Apply incoming board only if local copy unchanged from common base. If both diverged, preserve both copies and show a conflict prompt. Do not silently choose last-writer-wins.
- Preserve stable IDs, full connections, nested-board references and assets.
- Use a transactional IndexedDB update and snapshot before applying incoming changes.
- Protect against two devices updating the manifest simultaneously via revision check and retry; conflict resolution still requires per-board snapshots.
- Sync status UI: Last synced, Pending changes, Offline, Conflict, Retry.
- Share authentication and data model with eventual Windows client; Windows OAuth requires its own client setup.

## Security and limitations
- No automatic silent install / account authorization. User authorizes Google account.
- Google Drive data is private to the OAuth app's appDataFolder but is not inherently end-to-end encrypted.
- Avoid exposing board content to AI services through the sync path.
- Offline edits may conflict. Keep history and allow backup export.
- Before launch, test on two signed APK installations including offline edits, connection preservation, images, and restart recovery.

## Required setup by repository owner
1. Create Google Cloud project and enable Drive API.
2. Configure OAuth consent screen and add the testing Google account if app remains in Testing.
3. Register Android OAuth client with package `com.cosmerearchives.silverlight` and SHA-1 certificate fingerprint of the **release** keystore.
4. Confirm an Android authorization prompt successfully grants `drive.appdata`.
