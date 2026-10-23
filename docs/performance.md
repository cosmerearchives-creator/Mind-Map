# Large Board performance

Rendering is viewport bounded above 180 cards, with overscan, model-only wire geometry, retained DOM nodes, and active editor retention. Offscreen content remains in the model, storage, exports and sync. Cached spatial indexes and Collection layout support selection, panning, dragging and wire updates. Pointer frames update only moving cards and affected wire groups.

Images are interned in memory and displayed through size-appropriate thumbnails. The thumbnail cache evicts offscreen entries under entry/pixel budgets; originals retain their bytes and transparency. Background jobs prepare storage, hashes and sync outside the UI thread when Worker support is available. Unsupported environments use an asynchronous main-thread fallback. Worker image transfer pools expire after idle periods.

Local saves atomically write the workspace header, changed Board records, and new image assets. Unchanged Boards and existing images are reused. Legacy monolithic and asset-only workspace records are accepted. Recovery records remain retained. Cloud formats are unchanged by this update.

## Validation

A local Edge synthetic fixture with 3,000 cards and 2,999 connections improved from 3,687 ms opening / 59,176 ms dragging to 82 ms / 319 ms in the same file-URL benchmark. A separate HTTP worker regression measured 99 ms opening / 209 ms dragging, 42 mounted cards, and no worker fallback. These are local test measurements, not physical Android guarantees. Dense visible graphs and device memory still impose practical limits.

The large-board-performance test verifies viewport culling, retained nodes, motion-only updates, selective Board writes, original-image preservation, thumbnails, legacy migration and worker responsiveness. Collection and selection regressions verify moves, detach, reorder, Undo and persistence on a large workspace. Sync tests exercise worker operations and offline recovery using simulated transport. Physical Android gestures, memory behavior and real signed-in Drive transport require device verification.

The storage-aware update also keeps saved Board models deferred until accessed and loads original images on demand with a bounded 32 MiB encoded cache. Navigation releases previously opened models. Complete backups and sync still hydrate required originals and require temporary memory; see large-workspaces.md.
