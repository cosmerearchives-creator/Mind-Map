# Milanote import

Use **Import PDF / ZIP** on Home or in the add menu. Parsing runs locally with bundled PDF.js and fflate. Import is additive and commits only after preview confirmation. Cancel leaves the workspace untouched.

## ZIP structure

    archive.zip
      Root Board/
        canvas_Root Board-261023_0509.pdf
        Child Board/
          canvas_Child Board-261023_0509.pdf

Each top-level folder becomes a Home Board. The PDF can use the exact Board name or Milanote's canvas_NAME-DDMMYY_HHMM.pdf naming. Each owned child needs a folder matching the nested tile title exactly except capitalization, plus its matching PDF. Whitespace and punctuation are significant. Missing folders, duplicate case variants, ambiguous PDFs, unsafe paths and unused branches are reported. A standalone PDF imports its current Board; unavailable child branches are omitted.

Shortcuts resolve to unique imported or existing Board titles. They do not own the destination or require duplicate folders. Unresolved shortcut artwork goes to Unsorted. Preview allows selecting an existing destination or changing an owned tile to a shortcut. Ambiguous targets require review.

## Recovery

PDF text, shapes, images, paint order and arrowheads identify objects. Rich formatting is recovered where present, with font families mapped to available editor fonts. Adjacent cards remain distinct. Collections retain membership and free positioning. Images retain transparency and Board tiles retain artwork.

Arrow paths are analyzed independently at crossings. Endpoints and direction become native connections, so Silverlight controls curves and forks. Decorative lines without qualifying arrowheads and endpoints remain artwork. Uncertain connectors are listed for endpoint selection.

Fully covered recovered notes default to Unsorted. Partial overlaps can be moved there in preview. Content omitted from the PDF cannot be recovered. Intentional background images remain on canvas. Connections to Unsorted objects remain pending until both endpoints are placed. Unclassified recovered text is retained for review. Tables, flattened text, unusual exports and unavailable glyphs may need manual correction. There is no OCR.

Limits: ZIP 128 MiB compressed, 192 MiB expanded, 4,000 entries; each PDF 64 MiB; combined workspace snapshot 64 MiB. Images are bounded to 64 million decoded pixels; output is limited to 4,096 pixels per dimension / 16 million pixels. Reductions are warned. Unsupported image output produces a review placeholder. Source files are unchanged.

## Deletion

Delete Board defaults to deleting only that Board. The nested deletion checkbox lists owned descendants and their count. Shortcut destinations are excluded. External shortcuts to removed Boards retain data with a missing destination state. Undo is supported.

## Validation

Run node tests/validate.cjs for hierarchy, shortcuts, pending connections, schema and deletion checks. Browser suites tests/milanote-ui.cjs and tests/milanote-pdfs.cjs require Playwright and Microsoft Edge. Set MILANOTE_PDF_DIR to the local sample directory. Personal PDFs are not distributed in the repository.

PDF tests verify object types, 251 dense-sample connector paths, lists/colors, transparent pixels and photographic Board artwork. UI tests exercise ZIP selection, preview, commit, reload, omitted branches, shortcuts and deletion/undo. Automated geometry checks do not replace final visual review of endpoint intent. GitHub Actions verifies platform packaging; physical-device installation and import require device verification.
