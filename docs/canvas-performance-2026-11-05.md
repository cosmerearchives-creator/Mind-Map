# Canvas performance investigation — 0.14.3

All fixtures are synthetic. No installed workspace, personal Board, clipboard content, cloud account or production native data directory was used. Baseline: `b176c607a466a0362b7187f1c130ac5da37a574e` (0.14.2). Measurements and retained-memory counters are in [the accompanying JSON](canvas-performance-2026-11-05.json).

## Confirmed causes and changes

1. **Repeated HTML parsing on selection and zoom.** `index.html`'s `drawCards()` builds markup for every visible Sticky. `board-runtime.js`'s `patch()` parses that complete markup into a template even when it subsequently retains existing live nodes. The first Edge profile attributed 963 self samples to `patch()` and 835 to `viewport()` on the 500-Sticky case, versus 55 to selection synchronization. At 115 Stickies, zoom triggered 20 reconciliations (197.7 ms total in `drawCards`, 136.1 ms in `patch`). At 500, those totals were 1136.7 and 748.3 ms. Seven connections were not the main cost.

   `paintCanvasSelection()` now updates existing selection classes and invokes the existing desktop selection synchronization. `viewChanged()` compares visible card **and wire-source** membership before calling `app.draw()`. It still reconciles when culling membership changes and refreshes image resolution on scale changes. Ordinary edits and structural changes continue to invalidate model/layout indexes and save normally. `patch()` itself remains intact.

2. **Repeated style/layout work.** `viewport()` read canvas dimensions after transform writes. `updateTransform()` recreated the zoom label text even when the percentage was unchanged; `desktop-selection.js` similarly rewrote the unchanged hint. Dimensions are now cached per canvas and updated through one managed `ResizeObserver`; the old observer is disconnected when the canvas changes. Labels are updated only when their text changes. The paired native normal-pan run went from 60 layout calculations to zero.

3. **Full-canvas replacement during editor dismissal.** `editing-ui.js` saves an inline editor in a capture-phase pointer handler. Previously, `mutate()` called `render()`, detaching the original event target before the same event reached the canvas handler. Each fixture reproduced five `setPointerCapture` InvalidStateErrors in five editor-to-canvas cycles. Ordinary note saves now use `mutate(...,{canvasOnly:true})`, preserving snapshot/history, asset interning, invalidation and saving while reconciling cards without replacing the canvas. Note opening paints selection directly; Cancel also preserves the current canvas. Other structural mutations retain the existing full-render path. The paired after-runs had zero page errors, and the first middle-drag after leaving an editor moved the view correctly.

4. **Expensive canvas repainting at low zoom.** Removing script work alone left the 500-Sticky overview pan at 233.3 ms p95 in Edge. Explicit `will-change:transform` on the existing world layer reduced the corresponding follow-up to 16.8 ms p95. This changes compositor treatment, not content or storage. Initial rasterization stalls remain; see limits below.

5. **Small-Board culling correctness.** The old `<40 cards` shortcut skipped viewport reconciliation, leaving only 12 of the 25 synthetic cards mounted after zooming out. Small Boards now use the same membership checks. After-runs verified all 25, 115 and 500 cards were mounted in the overview.

## Measurements

Windows x64, Ryzen 9 5900X, 32 GiB RAM; 1400×1000 content viewport, scale 1 for normal navigation and approximately 0.20/0.089/0.05 for overview. Each note has 16 formatted paragraphs, source metadata and two tags. Connection counts: 3, 7, 35. These sizes are test cases, not application limits.

The paired native runs used a **visible WinForms WebView2 window**, Edge/WebView2 156, with automated pointer/keyboard events through CDP and on-screen inspection through the computer-use skill. It is an isolated rendering host with shared application assets, not the installed production app/native bridge. The bridge is disabled in the test page so no real account or native data is accessed. Full native storage/updater/auth checks run separately in CI.

| Fixture / interaction | Before p95 frame interval | After p95 frame interval | Card reconciliations before → after |
|---|---:|---:|---:|
| 25 / normal selection | 16.7 ms | 16.8 ms | 20 → 0 |
| 115 / overview pan | 16.8 ms | 16.8 ms | 2 → 0 |
| 115 / overview zoom | 16.8 ms | 16.8 ms | 20 → 0 |
| 115 / overview selection | 16.8 ms | 16.8 ms | 12 → 0 |
| 115 / 5 editor-to-canvas cycles | 16.8 ms | 16.8 ms | 20 → 5 |
| 500 / overview pan | 83.3 ms | 16.8 ms | 2 → 0 |
| 500 / overview zoom | 66.7 ms | 16.8 ms | 20 → 0 |
| 500 / overview selection | 50.0 ms | 33.3 ms | 12 → 0 |
| 500 / normal pan | 16.8 ms | 16.7 ms | 0 → 0 |
| 500 / Sticky drag including commit | 16.8 ms | 16.8 ms | 2 → 1 |

The 115-Sticky baseline was already reaching the display cadence on this hardware; the improvement is reduced work and corrected first-pointer behavior, not a claimed measured increase from slow FPS to 60 FPS there. The first Edge run measured 500-Sticky overview pan/zoom/selection at 200/116.7/66.7 ms p95; native results differ, so those engines are recorded separately.

Pure pan, zoom and selection wrote **zero Board bodies** in both paired runs. Moving a Sticky and typing/confirming an edit still performed durable writes. Untouched Board content, card counts, source IDs and connection counts were checked. Unrelated card and wire nodes remained identical during dragging; the existing structural move commit still performs one reconciliation.

## Repeated editing and memory

At each size, the stress run performed 40 editor cycles and then another 40 after the existing 40-entry undo-history cap was reached. Node and event-listener counts were unchanged between those two checkpoints; p95 frame intervals stayed 16.8 ms.

| Cards | Retained heap after first 40 cycles | After next 40 | Nodes / listeners at both checkpoints |
|---|---:|---:|---:|
| 25 | 8,353,540 bytes | 8,490,172 bytes | 1337 / 155 |
| 115 | 23,683,360 bytes | 23,805,820 bytes | 1337 / 155 |
| 500 | 90,298,380 bytes | 89,201,368 bytes | 1358 / 155 |

Heap growth before the cap includes existing bounded undo snapshots and warmed editor caches. This is a bounded synthetic stress check, not proof that every long-running workload is leak-free.

## Verification and limits

- Local core validation and all 50 pre-existing maintained browser suites passed. The new interaction profiler is included as the 51st maintained suite. It checks no page errors, selection without reconstruction, overview completeness, first post-editor pan, unrelated DOM/wire retention during motion, connection/source preservation, durable typing and untouched unrelated Board content.
- The existing 3,000-Sticky regression passed: viewport culling, far-offscreen retention, wire reuse, only edited Board persistence, original image preservation, workers and reload.
- CI retains physical backup beyond 512 MiB, bounded streaming native backups, updater file handling, desktop auth/session tests, full browser regressions, Android bounded backup I/O, offline cold/warm content-URI sharing, signed APK identity/version and exact packaged-asset verification. Official releases remain gated on successful Windows and Android builds for the same main commit.
- The suite covers creation, dragging/resizing/deletion, manual/automatic relationships, nested Boards, Family Tree, Codex, images, undo/history, local saving, and simulated two-device sync. A real personal Google Drive account was not used for this task. Android build/emulator compatibility is checked; physical Android device FPS is not measured.
- **500 rich-text Stickies all visible at 5% zoom still have an initial rasterization stall:** the paired native overview pan maximum was 850.0 ms before and 850.1 ms after. Steady-state p95 improved, but worst-case startup painting did not. Overview selection remains around 33–50 ms in repeated runs. Normal-scale navigation and dragging stayed around 16.7–16.8 ms p95. No universal 60 FPS or zero-delay claim is made.
- Frame intervals are animation callback measurements, not exact input latency or guaranteed GPU presentation. Local timings depend on hardware and other running applications. CPU profiling adds overhead; absolute values should not be treated as cross-machine guarantees.

## Reproducing the checks

With Playwright available and Edge installed, run `node tests/canvas-interaction-profile.cjs`. Set `CANVAS_PROFILE_OUTPUT` to an output prefix to retain JSON and CPU samples; set `CANVAS_FOCUS_CYCLES=40` for the 80-cycle bounded-memory check. `CANVAS_SIZES` selects fixture counts.

For Windows WebView2, build `tests/canvas-native/Canvas.ProfileHost.csproj` (the manual GitHub profiling workflow produces a self-contained artifact), launch it with a local debugging port argument, and set `CANVAS_CDP=http://127.0.0.1:<port>`. Show the isolated window for visible rendering tests. `CANVAS_ASSETS` can point to an untouched baseline asset directory, with `CANVAS_BASELINE=1` to record known baseline errors. The host always creates its own private synthetic profile beside the executable and includes no production native bridge.
