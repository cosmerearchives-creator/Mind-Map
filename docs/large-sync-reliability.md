# Large Drive sync repair

The v0.8.66 pipeline chunks native transfers only after cloning history, canonicalizing revisions and serializing the entire asset bundle. Repeated image content in workspace, retained BOARD versions and property registers can exceed the JavaScript engine's single-string ceiling before upload.

The repair uses structural history copies/equality, bounded JSON traversal, incremental SHA-256, streamed document upload parts and a document parser that constructs objects from parts. Application downloads return objects within JavaScript rather than re-serializing the restored image-rich workspace. Native bridge requests remain bounded parts. The existing v1/v2 formats, canonical byte ordering, legacy large-revision threshold and checksums are retained; there is no dataset migration or deletion.

Immutable parts are uploaded first; only a confirmed final manifest marks completion. Existing IndexedDB transactional guards, recovery copies and pending causal records remain in force. Missing/corrupt parts, failed writes, interrupted uploads and account mismatches cannot mark changes published.

Validation: node tests/large-sync-stream.cjs checks SHA-256 vectors against Node crypto, Unicode/chunk boundaries, exact legacy checksum bytes, parser syntax, >512 MiB logical workspace/history without aggregate serialization, immutable part reuse, final-manifest failure and corruption. tests/validate.cjs includes it alongside merge, conflict, transfer and progress regressions.

Limits: total memory and available disk/Drive storage still apply. Asset packing still materializes unique originals; each individual scalar/image must fit a JavaScript string. A transfer permits 16,384 parts of 1 MiB characters and cloud listings stop at 10,000 files. This change does not prune historical snapshots. Existing older clients remain subject to their own aggregate-string limits.

Additional validation: tests/large-sync-ui.cjs exercises a >512 MiB logical workspace through real browser Workers, lazy IndexedDB assets/history, multipart transfer and an aborted database transaction followed by restart. tests/on-demand-storage.cjs exposed an existing home-canvas regression; BOARD summaries now include homePosition so home layout does not parse unopened boards. Older summaries safely fall back to reading their board to preserve saved positions.
