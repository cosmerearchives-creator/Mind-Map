# Large-workspace reliability (0.14.0)

## Root causes

The old export called the background packer for the entire workspace, brought all originals into the packed bundle, then called JSON.stringify on that bundle and created a whole-file Blob. That both crossed JavaScript's aggregate string ceiling and multiplied live image data across worker/message/JSON/Blob representations. Export had no native streamed destination or read-back verification.

Drive already had immutable 1 MiB parts and checksummed v2/v3 manifests. Replacing that wire format was unnecessary. However, upload preparation built a jobs array for a whole image, some paths materialized all original images, and interrupted downloads relied on an optional 64 MiB evictable cache. Local recovery copies also serialized all Board metadata together. Image loaders could retain a closed temporary database connection.

## Backup records

The offline UTF-8 .jsonl format is silverlight-backup-v2. A header is followed by contiguous components (board:0, board:1, workspace, image:<SHA-256>). Part records carry a component name, sequential index, at most 128 KiB of text and a SHA-256. Each component ends with a parts/length/content-hash entry. The final complete record verifies the archive prefix and component count. A truncated file, missing/reordered part, corrupt hash, missing image/nested Board, invalid schema or trailing data fails before live-state commit.

Metadata retains every workspace property, except that Boards are separately encoded and image values become verified content references. Original image bytes are separate components. One original is loaded at a time and its temporary cache entry is released. Each native write is at most 64 KiB and awaits acknowledgement. The native sink checks SHA-256 of the actual saved bytes before completion.

New backups restore a complete workspace only after verification and explicit confirmation. The prior workspace and replacement main index commit together; prior/new Board records have independent recovery keys. Image data is promoted only after full archive verification and remains in independently stored chunks. A failed main commit leaves the original workspace and any already verified immutable images valid. Legacy JSON imports retain their existing merge behavior; large legacy imports have explicit memory-safety guards (32 MiB Android, 128 MiB other paths).

## Sync and restart

Wire formats remain silverlight-part-v2 and silverlight-transfer-v2/v3. Verified parts and upload receipts live under account-separated sync-checkpoint keys, outside the bounded optional cache. Each downloaded part is rehashed before reuse. Complete image SHA-256 is checked before publishing its chunk-backed local asset record. A final manifest is uploaded only after all parts have been confirmed; a downloaded snapshot is verified before it can replace local state. Native upload acknowledgement additionally checks the server's byte count and content MD5 against the exact transmitted bytes (Google Drive file metadata: https://developers.google.com/workspace/drive/api/reference/rest/v3/files).

Lazy revision calculation preserves the old canonical SHA-256 algorithms, including the large-revision branch, without gathering all original images. The original image cache is released between assets. Existing causal register/conflict/offline merge handling is retained. Deferred Boards are expanded before sync-history hashing, image aliases are normalized with the existing JSON value semantics, and temporary closed database readers are reopened for immutable image reads.

## Failure and resource boundaries

Windows: a same-folder unique .partial is read back and fsynced before replacement. Cancellation/failure keeps the prior target. Normal shutdown deletes partial output.

Android: ACTION_CREATE_DOCUMENT must provide a new, empty document. A private temporary disk file is verified before copying; the destination is read back and verified too. Normal cancellation, pause and destruction clean the temporary file and attempt to remove incomplete output. A provider that cannot prove an empty destination or read the final document is refused. No broad storage permission, account or network is needed for core backup/restore.

Verified restart checkpoints and promoted image chunks consume disk space. Hard process termination can leave unreferenced staging data or .partial files; no incomplete archive is accepted and no incomplete main state is committed. Streaming JSON retains per-chunk string fragments rather than building large scalar tokens character by character. Individual image strings and individual Board metadata still must fit memory. This update removes aggregate-original/whole-backup allocations, not every possible per-document memory bound. No physical-phone heap or live personal-account Drive test was performed by the automated suite.

## Reproducible verification

- node tests/validate.cjs: shared scripts, corruption/merge/recovery/version/legacy compatibility, plus the standard streaming-backup fixture.
- node tests/backup-stream.cjs --stress: >512 MiB physical backup, 260 unique 2 MiB originals, 263 Boards, nested links, connections, an 80-person Family Tree/portrait and Codex artwork; no aggregate JSON.stringify; complete content comparison and invalid-file/cancellation handling.
- node tests/browser-regressions.cjs: existing editing/save/draft/layout/Drive regressions plus actual backup buttons, disk errors, atomic recovery, lazy chunk-backed restore/reload, checkpoint reuse beyond cache capacity and a full page/worker restart after interruption.
- dotnet run --project tests/backup-native/Backup.Tests.csproj -c Release: Windows file verification, prior-file preservation, cancellation cleanup and a streamed 64 MiB write.
- Android workflow: compile/sign APK with original certificate, byte-compare all packaged assets, verify package/version; run production BackupIO against 512 MiB on a 32 MiB JVM heap. This tests the shared I/O algorithm, not Android ART/WebView total memory.
- Native Windows authentication/transfer tests also reject unconfirmed server checksums and retain bounded parallel transfers.

Release must pass both platform builds from the exact main commit and retain Silverlight.apk and Silverlight-Setup.exe compatibility names. The release gate continues to refuse stale main commits or a missing platform build.
