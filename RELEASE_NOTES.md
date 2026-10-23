# Silverlight Archives — Milanote clipboard paste

- Copy selected cards in Milanote, then Ctrl+V on a Silverlight Board or choose Board actions > Paste. A preview appears when Milanote's structured clipboard data is available.
- Convert rich Notes, included Collection members, included nested Board contents, known Board shortcuts and connection endpoints into native objects. Connections use Silverlight's curves and forks.
- Nested Board tiles without copied contents become Notes with the Board title and (EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD).
- Windows Paste now reads Chromium custom clipboard formats. Ordinary text, image and editor pasting remain supported.
- Show warnings for unavailable image pixels, missing endpoint cards and unsupported specialized objects. Private image references and nested Board tiles do not guarantee that image files or descendant contents are present.
- Paste is additive, previewed, cancellable and undoable, with validation errors shown before changing the workspace.

Validation uses protocol fixtures derived from Milanote's publicly served application code, browser paste/reload regressions, existing clipboard regressions, snapshot/merge checks and Windows custom-format parsing tests. Live Milanote copy/paste and physical Android clipboard behavior remain unverified without a real copied sample. See docs/milanote-clipboard.md for supported formats and limits.

Existing PDF/ZIP imports remain available. The separately reported unresponsive PDF Import button is not diagnosed or fixed by this clipboard release.
