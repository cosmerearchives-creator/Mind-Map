# Milanote import

Use **Import PDF / ZIP** on Home or in the add menu. Parsing runs locally with bundled PDF.js and fflate. Import is additive and commits only after preview confirmation. Cancel leaves the workspace untouched.

## ZIP structure

The default mode is **One folder per main Board**:

    archive.zip
      Root Board/
        canvas_Root Board-261023_0509.pdf
        canvas_Child Board-261023_0509.pdf
        canvas_Grandchild Board-261023_0509.pdf

Choose the main Board PDF for each top-level folder. The importer follows nested Board titles recursively through the PDFs in that folder. No descendant folder arrangement is required. PDFs at the ZIP root can also form one group; select its main Board. Each folder is independent, so different main Boards can have children with the same name.

Filenames can use the exact Board name or Milanote's canvas_NAME-DDMMYY_HHMM.pdf naming. Matching ignores capitalization, export prefix and timestamp; whitespace and punctuation remain significant. Duplicate matches must be assigned explicitly in the preview. Conflicting owners and cycles block confirmation until you choose another PDF, change a tile to a shortcut, keep it as an empty Board Note, or skip it. Unreached PDFs are reported instead of silently added to Home.

**Existing nested folder structure** remains available in the organization selector. Each folder must contain its matching PDF, with nested Board folders matching the tile title except capitalization.

In both modes, and for standalone PDFs, an owned nested Board with no associated PDF becomes a normal Note. Its title is the Board name and its body is exactly:

    (EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD)

The Note keeps its position, Collection membership and connections. Original tile artwork is retained in source metadata. The normal editor's Nested board checkbox can turn it into a new Board; no empty Board is created automatically.

Shortcuts resolve to unique imported or existing Board titles. They do not own the destination or require duplicate folders. Unresolved shortcut artwork goes to Unsorted. Preview allows selecting an existing destination or changing an owned tile to a shortcut. Ambiguous targets require review.

## Recovery

PDF text, shapes, images, paint order and arrowheads identify objects. Rich formatting is recovered where present, with font families mapped to available editor fonts. Adjacent cards remain distinct. Collections retain membership and free positioning. Images retain transparency and Board tiles retain artwork.

Arrow paths are analyzed independently at crossings. Endpoints and direction become native connections, so Silverlight controls curves and forks. Decorative lines without qualifying arrowheads and endpoints remain artwork. Uncertain connectors are listed for endpoint selection.

Fully covered recovered notes default to Unsorted. Partial overlaps can be moved there in preview. Content omitted from the PDF cannot be recovered. Intentional background images remain on canvas. Connections to Unsorted objects remain pending until both endpoints are placed. Unclassified recovered text is retained for review. Tables, flattened text, unusual exports and unavailable glyphs may need manual correction. There is no OCR.

Limits: ZIP 128 MiB compressed, 192 MiB expanded, 4,000 entries; each PDF 64 MiB; combined workspace snapshot 64 MiB. Images are bounded to 64 million decoded pixels; output is limited to 4,096 pixels per dimension / 16 million pixels. Reductions are warned. Unsupported image output produces a review placeholder. Source files are unchanged.

## Deletion

Delete Board defaults to deleting only that Board. The nested deletion checkbox lists owned descendants and their count. Shortcut destinations are excluded. External shortcuts to removed Boards retain data with a missing destination state. Undo is supported.

## Validation

Run node tests/validate.cjs for hierarchy, shortcuts, pending connections, schema and deletion checks. Browser suites tests/milanote-ui.cjs, tests/milanote-flat-ui.cjs and tests/milanote-pdfs.cjs require Playwright and Microsoft Edge. Set MILANOTE_PDF_DIR to the local sample directory. Personal PDFs are not distributed in the repository.

PDF tests verify object types, 251 dense-sample connector paths, lists/colors, transparent pixels and photographic Board artwork. UI tests exercise ZIP selection, preview, commit, reload, empty Board Notes, shortcuts and deletion/undo. Automated geometry checks do not replace final visual review of endpoint intent. GitHub Actions verifies platform packaging; physical-device installation and import require device verification.
