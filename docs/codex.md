# Codex reading and research

## Create and read

Home → Import Codex creates a book overview. On a normal canvas use Add → Codex, or double-click blank space → Codex, to create a Codex Sticky linking to that overview. Supported initial formats are DRM-free EPUB, TXT and Markdown (UTF-8 or BOM-marked UTF-16). EPUB package metadata supplies book details; spine order preserves the reading sequence. Chapter names and boundaries use the EPUB 3 contents navigation or EPUB 2 NCX, including fragment-linked sections within a file and continuation files within a chapter. Duplicate group links at the same position use the deeper chapter label. Missing/broken contents fall back to visible headings, meaningful internal titles, then numbered sections; placeholder internal titles such as Onbekend are ignored. Cover and identified front matter stay separate. Without usable contents, multiple top-level chapter headings in one EPUB document are split; plain text/Markdown use chapter/part/book headings or Markdown headings. Text with no recognizable headings imports as one entry. Review the detected chapter titles before confirming.

Confirm book title and author, and supply missing metadata during creation. Publication year, edition, publisher, identifier and language are offered for citations. Unknown authors must be identified explicitly as Unknown rather than silently fabricated. File selection, parsing and cancellation do not modify the workspace. Only confirmation after validation and capacity preflight adds the book.

The overview owns a Board per chapter. Imported text is stored separately from notes and has no editor or canvas drag/delete control. Opening an entry shows its reading box without preparing images from the hidden research canvas; Codex view adds three columns: Chapter, Linked notes and that chapter's independent research canvas. Headers move columns left/right; separators resize them. Narrow screens also have Chapter / Notes / Canvas navigation buttons. Returning to a normal Board removes Codex presentation. Entry preferences remember mode, column order/widths, font, paper theme, source position and scroll/page mode locally on each computer. Opening a Codex Sticky's Open Codex button resumes its last visited entry; Chapters returns to the overview.

Reading uses warm paper by default, optional white/night themes, font-size controls and an independent scrollbar. Pages are reading pages calculated for the current view, not printed-edition page numbers. Source locations never depend on pagination, column dimensions or font size.

## Highlights and notes

Select a word or phrase, choose an annotation color, then Highlight → note. A linked entry is created immediately and its heading/rich text editor opens. Cancelling that editor retains the newly created empty annotation. Repeated/overlapping selections are independent: stacked colored underlines and a light tint keep multiple annotations visible. At a caret/insertion point, Insert ᵛ note creates a visibly user-inserted dashed/color marker rather than changing book text.

Linked notes are anchored to UTF-16 positions in the immutable chapter text, with an exact selected quote and source hash. The middle column sorts by chapter order and source offset; creation time only breaks ties at the same location. Its moving context includes up to 12,000 source characters behind and 6,000 ahead of the reading position, spanning chapter boundaries while excluding distant future notes. Include earlier notes expands the range to all preceding notes without revealing distant future passages. The list initially mounts at most 200 entries, with Show 200 earlier notes for older history; lightweight source anchors avoid opening every historical chapter just to filter notes. Use the chapter selector or Passage to navigate. There is no create, drag, resize or reorder operation in this column. Only note heading/body can be edited; deleting an annotation removes exactly its own highlight/marker. Other overlapping annotations remain. Undo restores deleted notes.

## Copy out with citations

Copy… → Copy to Board creates an independent normal Sticky on any non-Codex Board, including the originating chapter's research canvas. Copy to clipboard writes the normal Silverlight selection format for pasting elsewhere. Ctrl+C on a focused note with no text selection also copies the full cited Sticky.

- Highlight note title: exact selected word/phrase.
- Marker note title: `Book Title / Chapter / Random Note`.
- Rich body: the chosen note heading, formatted note contents, then an author/book/chapter citation with available publication details and a stable paragraph/character locator.
- Structured citation data retains the metadata, selected quote, chapter ordinal, source hash and offsets even if the original Codex is later removed. Copies do not depend on a live Board reference. Android uses its native foreground clipboard bridge with a 512 KiB selection limit to stay below the system transaction budget; larger selections can use Copy to Board directly.

There are no invented printed page numbers. These are readable source citations, not an automatic academic citation-style formatter.

## Storage, sync and compatibility

Book overviews, entries and research canvases use normal nested ownership so existing backup, recovery, deletion confirmation and selection cloning retain the complete structure. Each chapter's immutable `codexEntry` register stores text, title, ordinal, source hash and a metadata snapshot. Each annotation is a `codexAnnotation` card with an independent per-property causal register; concurrent annotations on the same passage combine rather than replacing each other. Normal canvas operations target the separately owned research Board, never the source/annotation records. Duplicate-Board consolidation excludes source entries and book overviews.

Workspace/snapshot formats and existing Google scopes/credentials are unchanged. Both devices need this release to display Codex; older versions retain the added fields but do not provide its reader. Reading text selections pause incoming sync; modal note editors retain the existing editor guard. Preferences are per-device, while source, annotations and research canvas data sync normally.

## Import limits and current exclusions

The importer retains readable text, paragraph structure and embedded PNG/JPEG/GIF/WebP artwork. Embedded SVG and inline SVG artwork are reduced to inert geometry and rasterized to a maximum edge of 2,048 pixels; publisher CSS, scripts and external resources are excluded. It does not reproduce original typography/CSS, audio/video, interactive content or printed pagination. Imported scripts/markup never execute and external resources are not requested. DRM content is rejected. The existing bundled ZIP reader is used with resource/count/path/expanded-byte limits; no new network dependency is introduced.

Limits: 32 MiB input file, 10,000 archive entries, 8 MiB per expanded resource, 64 MiB total expanded resources, 5,000 illustration occurrences, 1,000 chapter entries, 4 MiB text per chapter and 48 MiB total chapter characters. Larger books require splitting before import. Further PDF importing remains outside this work. Integration with the separate ebook research app is a later phase.

Validation: codex-core.cjs covers source anchors, overlapping annotations, page/order independence, cited copies, markers, backup/owned cloning and concurrent causal merge. codex-import-ui.cjs covers EPUB metadata/spine/Unicode/path handling, inert extraction, no network loads, malformed/DRM/expansion rejection, encodings and cancellation. codex-ui.cjs exercises actual import, annotation editing/deletion, cited clipboard/canvas copies, chapter boundaries/future filtering, independent canvases, page switching, column order, restart and exit to normal Boards. codex-mobile.cjs covers touch annotations, narrow-screen column navigation, canvas copying, research-only settings and reading-page restoration. Existing large-workspace, native-auth, image, canvas, recovery and two-device sync suites remain release gates.

## Artwork annotations and cleaner canvas controls

Use **Annotate image** to create a whole-image note, click a point, or drag a region. The region uses normalized coordinates and remains tied to the illustration’s immutable chapter offset. Multiple annotations can overlap independently. The source image displays clickable colored region outlines; linked notes remain in chapter order. Copying includes the full image, marked region, rich text and citation in one independent Sticky. Raster originals remain in the shared content-addressed asset store; repeated illustrations reuse the same asset. SVG renderings retain a safe PNG representation. These fields are additive to Codex version 1 and use existing backup and Drive transfer formats.

Earlier text-only Codex imports cannot recover discarded artwork. To include it, import the original EPUB as a new Codex, leaving the existing book and annotations intact. No automatic migration replaces source text or adjusts existing offsets.

Selected Stickies resize from their borders and corners; there is no dedicated size button or three-dot Sticky button. Right-click a Sticky for Edit, Copy, Cut, Delete and type-specific actions. Right-click an empty canvas for Create (including Codex), Paste, Undo and Redo. Creation starts at the clicked position. Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo; text editors keep native editing shortcuts. The connection handle is a small tab peeking out from the right edge.

Additional validation: `codex-artwork-ui.cjs` imports illustrated EPUBs including hostile SVG without external requests, annotates a region, copies the complete image/citation and verifies page switching and disk reopening. `codex-core.cjs` includes artwork backup, owned copying, validation and causal envelopes. `context-menus-ui.cjs` tests real pointer resizing, undo/redo shortcuts, context actions, creation positions/cancellation and dismissal.

Contents parsing changes apply only to new imports. Existing source text, chapter IDs, source offsets and annotations are not renamed or repartitioned. `codex-toc-ui.cjs` covers both navigation formats, escaped fragment IDs/body anchors, split/continuation chapters, nested duplicates, cover retention, artwork positions, placeholder fallback, oversized merged chapters and non-destructive analysis.

## Chapter Stickies

New imports place every chapter Sticky’s title below its tile. When artwork occurs at the start of the chapter, before prose or immediately after its heading, the original image is reused as the tile background with contain fitting and no white overlay. Later illustrations are not used as opening art. An illustration immediately before a table-of-contents anchor is kept with the following chapter, including adjacent opening images, instead of being appended to the preceding chapter. Tile rows reserve room for the labels below them. Chapters without opening artwork keep a plain tile and the same title-below layout. These are creation defaults; existing imported chapters and custom backgrounds are not migrated.

New main Codex Stickies also use the EPUB’s declared cover image or recognized cover page, with the book title below the tile. Missing covers retain a plain tile with a title below. The cover is stored with the Codex overview and travels with existing backup/sync assets. Clicking the cover resumes the remembered chapter. Older imported book Stickies and their custom styling are unchanged.

### Chapter navigation and front matter
New imports retain safe internal EPUB links as source ranges and stable chapter destinations. External/broken destinations remain inert text. Normalization and pagination preserve the same source characters and offsets. Copies of a whole Codex remap destinations to the copied entries. ISBN is optional and accepts validated ISBN-10 or ISBN-13; legacy identifiers are retained in existing books. Front matter uses semantic/guide labels, contents links and conservative visible-text cues, with generic names when evidence is insufficient. These import improvements never rewrite existing sources or annotations.

### Library organization and search
The Codex library uses additive catalog metadata stored as a normal workspace Board and a parent-layer ID on each Codex overview. It syncs and backs up with the workspace. It does not change canvas ownership or source chapters. Creator / World are the default layer types; existing books are unfiled until organized. Layer removal promotes descendants and books, never deletes them. Moving books between layers preserves their IDs and citation snapshots.
Column search supports chapter, book and ancestor scopes. It reads deferred chapter JSON without expanding the UI residency cache or loading original image bytes, yields between chapters, supports cancellation and pages of 100 results, and navigates to fixed source offsets or existing note/Sticky IDs. Search marks are transient.
Highlight colors are editable in the note editor with a hue/saturation wheel, brightness, hex entry, presets and up to 64 per-Codex saved custom colors. Cancel preserves an existing note color. Multiple annotations on the same source range remain independent.
