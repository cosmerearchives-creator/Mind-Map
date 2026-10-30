# Milanote clipboard paste

Open a destination Board in Silverlight. Select cards in Milanote and use **Copy** (Ctrl+C), then use **Ctrl+V** on the Archives of Arcanum canvas or **Board actions > Paste**. Review the preview and choose **Paste selection**. Ordinary editor paste and ordinary text/image paste retain their existing behavior. Clipboard access occurs only after an explicit paste; nothing monitors or uploads the clipboard.

The adapter recognizes Milanote's `application/milanote-elements` JSON payload, HTML `data-milanote-elements` payloads and explicitly identified JSON text payloads. The fields were verified against Milanote's publicly served application code on 2026-10-23. Windows Ctrl+V on the canvas uses the native clipboard reader, as does Board actions > Paste; editor paste remains normal. Windows decodes both Chromium's registered custom-MIME clipboard container and Firefox's application/x-moz-custom-clipdata container. Android can read structured data only if the platform clipboard exposes it as HTML/text; it cannot retrieve another app's internal clipboard state.

Supported conversion:

- CARD/DOCUMENT text becomes editable rich Notes. ProseMirror and legacy Draft text support common headings, emphasis, colors, highlights, lists and web links. Inline Board mentions currently retain their titles and original structured text in source metadata.
- COLUMN becomes a Collection with the copied members that are actually present in the payload. Members retain their relationships. Source grid positions are mapped at 10 pixels per unit; columns arrange included members vertically.
- BOARD with included child objects becomes a nested Board. A tile without included contents now creates a real blank nested Board with its title. Copying a tile does not establish that its descendants have been copied.
- ALIAS resolves to an included Board or a previously pasted Board with the same Milanote source ID. Missing targets become Notes with warnings; names alone are not used to guess destinations.
- LINE endpoint IDs become native Archives of Arcanum connections, including arrow direction and labels. Both endpoint cards must be present on the same Board. Curves/forks use native rendering.
- Embedded PNG/JPEG/WebP/GIF images are retained. A PNG provided separately for a single copied image is attached to that image. Original public Milanote media URLs are now downloaded through a bounded native image reader; unavailable/private references remain placeholders with warnings. Tiny color thumbnails are not used as originals.
- Other types become Notes retaining source content with warnings. Tasks become Notes; task assignment and due-date semantics are not copied. Tables, drawings, files and other specialized objects are not fully converted.

New IDs are generated; paste is additive, cancellable and undoable. Validation runs before mutation and displays errors. Clipboard payloads are limited to 16 MiB / 5,000 elements, image attachments to 8 MiB, and the workspace to its existing 64 MiB sync limit. No Milanote session IDs or account credentials are imported or requested.

Committed tests use synthetic fixtures matching the observed public protocol. A real user-provided Firefox selection was additionally verified locally on 2026-10-23: three Notes, one Collection and one connector, with rich lists/bold text, isolated browser commit and reload. The clipboard payload was not committed or uploaded. Run `node tests/milanote-clipboard.cjs` and `node tests/milanote-clipboard-ui.cjs` (Playwright/Edge required). The Windows CI test project verifies Chromium UTF-16 custom-MIME parsing and malformed length rejection for Chromium and Firefox before native packaging. Live payload translation is verified; native OS paste in the installed application and physical Android clipboard behavior still require device verification.

See clipboard-layout-selection.md for current HTML Collection recovery, Library routing, source sizing/backgrounds and desktop selection controls.
