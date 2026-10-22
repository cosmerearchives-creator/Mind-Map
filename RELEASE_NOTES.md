# Silverlight Archives — Google Drive manual-transfer preview

Testing preview. Automatic device sync and conflict merging are NOT enabled. Stable update checks will not offer this preview automatically.

- The cloud button opens Connect Google, Upload this device, View cloud copies and Local recovery.
- Upload creates a separate immutable copy in the app's private Google Drive storage. It never replaces or deletes earlier cloud copies.
- Restore previews BOARD/STICKY counts, verifies the snapshot checksum and relationships, then saves a local recovery copy and the incoming workspace together in one storage transaction.
- Transfers preserve stable IDs, nested BOARD references, connections, Collections, tags, embedded images, Raw/Placard settings and workspace appearance.
- Android authorization uses Google Play services. Windows uses the system browser with state validation and PKCE. Tokens stay in the native app, outside board data and exports; Windows sign-in is session-only.
- Windows first asks for the downloaded OAuth JSON for a Desktop app client from the SAME Google Cloud project as Android. Select this file locally; do not upload credentials to GitHub or chat.

Export a JSON backup before testing. Sign into the same Google account on both devices, upload from the device holding the desired BOARDS, then review and restore on the other device. Restore replaces that device's complete workspace; it does not merge competing edits.

Automated checks: lossless snapshot round-trip, schema/checksum/reference rejection, two-device transfer simulation, cancel, transaction-abort rollback, stale-review rejection, durable local recovery, reload, and Sticky movement regression.

Still requires real-account testing: Google consent, cross-platform appData visibility, Windows → Android → Windows transfers, sign-in cancellation/expiry and network interruptions. Google Drive automatic sync/conflict resolution and further PDF/ebook import improvements remain unimplemented.
