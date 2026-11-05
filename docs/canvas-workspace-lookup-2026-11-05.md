# Continuous middle-mouse pan and Ctrl-wheel zoom — 0.14.4

An opt-in local backup reproduced the stalls left in 0.14.3. Tests used an isolated browser workspace and a separate visible WinForms WebView2 profiling host, with native account/data bridges disabled. The supplied backup and installed app data were not modified. Private content, identifiers, titles, images and the backup itself are not included in this repository; only aggregate measurements are reported here. CI uses synthetic data. [Aggregate measurement details](canvas-workspace-lookup-metrics.json).

## What the backup revealed

The workspace contains 512 Boards. Two affected cases were tested: 37 text Stickies with 19 connections, and 115 Stickies with 7 connections. The earlier two-Board synthetic fixtures did not reproduce the cost of finding an active Board deep in a large workspace.

Visibility culling and zoom trigger redraws. However, the expensive part of those redraws was repeated active-Board target resolution. In `index.html`, the old `activeBoard()` evaluated `codexController.canvasBoardId(state.active)` **inside the predicate passed to `state.boards.find()`**. That resolver itself searches Boards. Resolving the target again for each candidate made one active-Board lookup grow quadratically with its position in the workspace. Selection synchronization, document decoration, wire drawing and view calculations all call this path.

A detailed trace of the 37-Sticky case recorded over 400,000 calls to the target resolver during a continuous pan. Large costs accumulated in Board searches and lazy Board property access. HTML patching itself took about 1 ms per redraw. Disabling visibility reconciliation removed the major stalls, which explained the apparent relationship between loading cards and lag; the redraw also amplified the repeated lookup cost.

## Fix

`activeBoard()` now computes the canvas target ID once, then searches for that ID. No model cache or invalidation rules are added. Codex canvas redirection retains its existing resolver and behavior.

Existing viewport culling remains enabled. Cards entering the viewport still mount normally; offscreen cards can still detach. This avoids expanding memory residency as a workaround. Original data, storage formats, backup/sync protocols, undo and asset handling are unchanged.

## Paired results

The same local backup-derived models, gestures and instrumentation were used before and after the one-function change. The model retained the full 512-Board workspace with deferred Board documents; the active test Boards require no original images. This is a rendering/input experiment, separate from full-backup restoration testing.

Headless Edge, 1920×970 viewport, 100% initial zoom:

| Case | Before | After |
|---|---:|---:|
| 37 Stickies: pan redraw p95 | 237.5 ms | 4.1 ms |
| 37 Stickies: pan maximum frame interval | 233.4 ms | 16.8 ms |
| 37 Stickies: pan tasks over 50 ms | 11 | 0 |
| 37 Stickies: Ctrl-wheel frame interval p95 | 199.9 ms | 16.7 ms |
| 37 Stickies: Ctrl-wheel tasks over 50 ms | 18 | 0 |
| 115 Stickies: pan redraw p95 | 673.8 ms | 4.9 ms |
| 115 Stickies: pan maximum frame interval | 733.3 ms | 16.8 ms |
| 115 Stickies: Ctrl-wheel maximum frame interval | 616.6 ms | 16.8 ms |

Visible native Windows WebView2, 1400×1000 host content size, 37-Sticky case:

| Case | Before | After |
|---|---:|---:|
| Pan redraw p95 | 163.5 ms | 3.5 ms |
| Pan maximum frame interval | 166.6 ms | 16.8 ms |
| Pan tasks over 50 ms | 9 | 0 |
| Ctrl-wheel frame interval p95 | 83.4 ms | 16.8 ms |
| Ctrl-wheel maximum frame interval | 100.0 ms | 16.8 ms |
| Ctrl-wheel tasks over 50 ms | 13 | 0 |

At 33% zoom in Edge, the original code redrew less often but still produced individual redraws around 250 ms. After the fix, those redraws were under 5 ms in the paired run. This matches the reported improvement when zoomed out: fewer expensive visibility transitions, rather than elimination of their cost.

The p95 frame interval alone hid the native pan problem: it was 16.8 ms both before and after, while the before-run still had nine long tasks and a 166.6 ms maximum interval. Long tasks, worst-frame gaps and function timings therefore remain part of the test/report, alongside frame percentiles. These animation-callback measurements are not direct hardware input-to-photon latency or a universal smoothness guarantee.

## Regression coverage

`tests/workspace-pan-zoom-ui.cjs` creates 512 synthetic Boards, placing the active 37-Sticky/19-connection Board last. It exercises continuous middle-button panning and Ctrl-wheel zoom, checks bounded target resolution, confirms all Board data and connections remain unchanged, checks that navigation writes no Board bodies, and verifies restored navigation and lazy Board lookup after reload. Running this test with the original lookup implementation fails the target-resolution check; the fix passes. The test is included in the maintained browser suite as its 52nd case.

The existing Codex/navigation tests protect canvas-target redirection. The full browser suite and the coordinated Windows/Android release checks retain backup, sync, images, relationships, editors, undo/history and offline sharing coverage. Physical Android FPS and personal live Drive transfers are not measured by this experiment.
