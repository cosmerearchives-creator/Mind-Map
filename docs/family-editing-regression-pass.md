# Family Tree and existing-board regression pass — October 26, 2026

Baseline: `98786eb` (October 25 merge). This branch also incorporates the existing, unmerged `edf6121` interaction fixes rather than replacing that work.

## Confirmed defects and changes

- A one-pixel mouse movement started a Sticky drag and cleared double-click tracking. A four-pixel drag threshold now tolerates click jitter.
- Family Tree preview names were noninteractive spans. They are now keyboard-accessible buttons that open the corresponding person editor. Names inside the tree continue to open the editor, and dragging people continues to save positions.
- Automatic note height guessed from raw body length, ignoring rendered formatting and available width. Text and task Stickies without an explicit height now measure their rendered contents and cache the measurement. Editing invalidates the cache; manual frame dimensions and imported explicit heights remain authoritative. Automatic height uses the existing 4,000-pixel frame limit.
- The existing interaction branch requires double-click for ordinary nested Boards on mouse, and reuses one temporary connection preview instead of leaving trails. This pass preserves Ctrl/Cmd-click, touch navigation, and single-click Codex chapter navigation; the latter was broken by applying the ordinary Board double-click rule to imported chapters.

## Validation

Browser validation used headless Chromium 153 on Linux, with the existing Playwright tests pointed at that executable. It does not establish native Windows WebView2 or Android WebView behavior.

Passed:

- `node tests/validate.cjs`: script parsing and all 22 shared data, sync, import, selection, capacity and other core suites.
- `family-editing-regressions-ui`: jittered double-click; real rich-paragraph sizing; growth after editing; Family preview and canvas person-name clicks; ordinary Board single-click selection and double-click opening; connection geometry after moving a Board Sticky; one preview with cleanup; connection return after large-board panning and reload; automatic height after reload.
- `family-tree-ui`: independent per-tab rich drafts, parked editor restoration, person creation, relationships, portrait persistence, cycles and manual placement.
- `editor-drag-dismiss-ui`, `canvas-editing`, `navigation-patch-ui`, `large-board-performance`, `live-sync-ui`: draft retention, manual resizing, nested Collection behavior, 48-chapter navigation, 3,000-card rendering and wire reuse, simulated two-device updates with a parked draft.

The reported disappearance of saved connection lines was not reproduced in the move/pan/culling/reload fixtures. Their geometry and presence are covered by regression assertions, and a captured browser rendering was inspected. No speculative wire-rendering change was added.

`sticky-interactions` fails its synthetic touch “before hold pans” assertion on both the original merge and this branch in this browser. Treat that as unresolved baseline behavior; it is not a verified Android result.

The changes are for review; merging to `main` triggers installer/APK release workflows.
