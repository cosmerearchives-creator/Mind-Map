# Silverlight — artwork annotations and cleaner Sticky controls

- EPUB imports now include embedded illustrations in chapter order. Annotate a whole image, click a point, or drag a region; notes appear in source order and copied notes include the complete image, marked region and book/chapter citation. SVG artwork is sanitized and rasterized; original publisher layouts are not reproduced.
- Resize selected Stickies from their borders and corners. Dedicated resize buttons and Sticky three-dot buttons are removed. The smaller connection handle peeks out from the edge.
- Right-click a Sticky for Edit, Copy, Cut, Delete and relevant actions. Right-click the canvas for Create (including Codex), Paste, Undo and Redo. New Stickies begin where you clicked.
- Ctrl+Y and Ctrl+Shift+Z redo, alongside Ctrl+Z undo. Resizing now updates undo availability immediately; text editing keeps its own undo/redo.

Install over the existing app without clearing data. Update both computers for artwork display. Old text-only Codex books and annotations remain intact; import the original EPUB as a new Codex to include its artwork. No automatic source migration, cloud-format migration or credential change is required. Regular releases only.

Artwork import remains bounded: 32 MiB input, 8 MiB per expanded resource, 64 MiB total expanded resources, and 5,000 illustration occurrences. DRM and external resources are excluded. Larger books require splitting. Separate ebook research-app integration and further PDF development remain outside this release.
