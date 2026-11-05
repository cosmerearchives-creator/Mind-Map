# Offline app-to-app research sharing

`.arcanum` is a ZIP file, MIME `application/vnd.arcanum.package+zip`. Version 1 has a UTF-8 `manifest.json`:

```json
{"format":"arcanum-package","version":1,"packageId":"unique-transfer-id","origin":"stable.producer.namespace","items":[{"sourceId":"wob:1356","title":"Source title","body":"Plain text and personal notes","tags":["Cosmere"],"sourceUrl":"https://wob.coppermind.net/entry/1356/","metadata":{"highlights":[],"personalNotes":"preserved here too"},"assets":[{"path":"images/source.png","name":"source.png","kind":"image","mime":"image/png","size":123,"sha256":"64 lowercase hex characters"}]}]}
```

All assets must be declared, present, size checked and SHA-256 verified. Attachment kind is `attachment`; images support PNG/JPEG/WebP/GIF. No extraction to filesystem paths, executable HTML bodies, network fetches or accounts. Unknown versions, duplicate entries/source IDs, traversal paths, undeclared files and unsafe metadata properties are rejected before workspace changes. Limits: 32 MiB compressed, 64 MiB expanded total, 16 MiB per asset, 4 MiB manifest, 256 ZIP entries, 1000 source items. These limits do not change massive-workspace backup or sync limits.

Imports append Stickies to the stable global `arcanum-global-dumping-ground` Board, titled **Dumping Ground**. Existing Boards and their Unsorted Libraries remain intact. It participates in ordinary offline saves, backup and optional sync. Move/copy items using existing Board tools. Duplicate identity is origin + source ID + exact item content hash, searched across all Boards and Unsorted Libraries. Identical retry skips an existing source; changed source versions append and preserve existing local edits. Deleting an imported item permits a later reimport. Metadata retains the complete original source record. Images become image Stickies; attachments remain offline with an Attachments save action.

## Android delivery and acknowledgment

Archives handles `ACTION_SEND` with `EXTRA_STREAM` containing a granted `content://` URI, including when no Archives Activity exists. It immediately copies the bounded ZIP to private cache, exposes only a random-token local resource to its trusted WebView, and waits for device storage/editor readiness. One pending import at a time; finish it before sharing another. The Home screen offers Import .arcanum and Retry shared import. Failed validation/save never acknowledges. Activity recreation retains the pending file/token/callback. Process death may require sharing again; exact retries are safe.

The sender may include `org.arcanum.extra.SAVE_ACK`, an immutable one-shot broadcast PendingIntent with a durable snapshot identity embedded in its original Intent. Archives sends `Activity.RESULT_OK` only after its atomic IndexedDB workspace save completes. Share-sheet opening, Activity launch and file creation are never success signals. The sender must trust the receiver before granting the callback capability. WoB Tracker pins the existing official Archives signing certificate and targets its package directly. No external server is involved. See Android's [PendingIntent contract](https://developer.android.com/reference/android/app/PendingIntent).

WoB Tracker keeps a durable snapshot of exported records. Its private receiver processes acknowledgments even when Tracker's UI is closed, transactionally marks only still-queued, byte-identical records as exported/archived, and preserves review flags, notes and highlights. Entries edited during transfer stay queued. File exports alone never change status. A lost callback can be recovered by sharing again. Acknowledgment proves a durable save on that device at that time; it does not promise that a user cannot later delete or restore that data.

## Verification

`tests/arcanum-package.cjs`: strict validation, expansion limits, image/attachment integrity, metadata preservation, source dedup, changed versions, existing Board libraries.

`tests/arcanum-import-ui.cjs`: real IndexedDB save before acknowledgment, restart dedup, injected disk-full failure with no acknowledgment or partial workspace change.

Android instrumented sharing test: offline content-URI delivery to a new Activity and an existing Activity, real save acknowledgment, one saved copy after repeated delivery. Existing large-workspace backup, sync and browser regressions remain release gates.
