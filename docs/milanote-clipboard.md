# Milanote clipboard paste

Open a destination Board in Silverlight. Select cards in Milanote and use **Copy** (Ctrl+C), then use **Ctrl+V** on the Silverlight canvas or **Board actions > Paste**. Review the preview and choose **Paste selection**. Ordinary editor paste and ordinary text/image paste retain their existing behavior. Clipboard access occurs only after an explicit paste; nothing monitors or uploads the clipboard.

The adapter recognizes Milanote's `application/milanote-elements` JSON payload, HTML `data-milanote-elements` payloads and explicitly identified JSON text payloads. The fields were verified against Milanote's publicly served application code on 2026-10-23. Windows also decodes Chromium's registered custom-MIME clipboard container. Android can read structured data only if the platform clipboard exposes it as HTML/text; it cannot retrieve another app's internal clipboard state.

Supported conversion:

- CARD/DOCUMENT text becomes editable rich Notes. ProseMirror and legacy Draft text support common headings, emphasis, colors, highlights, lists and web links. Inline Board mentions currently retain their titles and original structured text in source metadata.
- COLUMN becomes a Collection with the copied members that are actually present in the payload. Members retain their relationships. Source grid positions are mapped at 10 pixels per unit; columns arrange included members vertically.
- BOARD with included child objects becomes a nested Board. A tile without included contents becomes a Note with its title and `(EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD)`. Copying a tile does not establish that its descendants have been copied.
- ALIAS resolves to an included Board or a previously pasted Board with the same Milanote source ID. Missing targets become Notes with warnings; names alone are not used to guess destinations.
- LINE endpoint IDs become native Silverlight connections, including arrow direction and labels. Both endpoint cards must be present on the same Board. Curves/forks use native rendering.
- Embedded PNG/JPEG/WebP/GIF images are retained. A PNG provided separately for a single copied image is attached to that image. Private/remote image references do not supply image bytes: they become placeholder Notes with warnings and the reference retained in source metadata. No authenticated image downloader is included.
- Other types become Notes retaining source content with warnings. Tasks become Notes; task assignment and due-date semantics are not copied. Tables, drawings, files and other specialized objects are not fully converted.

New IDs are generated; paste is additive, cancellable and undoable. Validation runs before mutation and displays errors. Clipboard payloads are limited to 16 MiB / 5,000 elements, image attachments to 8 MiB, and the workspace to its existing 64 MiB sync limit. No Milanote session IDs or account credentials are imported or requested.

Tests use synthetic fixtures matching the observed public protocol, not private user clipboard samples. Run `node tests/milanote-clipboard.cjs` and `node tests/milanote-clipboard-ui.cjs` (Playwright/Edge required). The Windows CI test project verifies Chromium UTF-16 custom-MIME parsing and malformed length rejection before native packaging. A live copy from the user's Milanote session and physical-device paste remain unverified until a real sample is provided.
