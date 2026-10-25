# Silverlight — EPUB chapter names and boundaries

- Codex imports now use the ebook’s table of contents for chapter titles: EPUB 3 navigation and EPUB 2 NCX are both supported.
- Chapters linked to anchors inside a single file become separate entries. Chapter continuations across multiple files are combined in reading order, with artwork kept at the correct source positions.
- Nested duplicate contents links do not create duplicate chapters. Broken or missing contents fall back to visible headings and meaningful page titles; placeholder titles such as Onbekend are replaced by numbered sections.
- Cover and identified front matter remain separate. The import review labels these as entries rather than assuming every section is a numbered chapter.

Install over the existing app without clearing data. This correction applies to new imports. Existing Codex books, chapter IDs and annotations remain unchanged; import the original EPUB as a new Codex to use the corrected structure. Publisher layouts, DRM and external resources remain excluded. No cloud-data migration or credential changes are required. Regular releases only.
