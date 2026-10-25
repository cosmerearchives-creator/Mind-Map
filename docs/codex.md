# Codex reading and research

## Create and read

Home → Import Codex creates a book overview. On a normal canvas use Add → Codex, or double-click blank space → Codex, to create a Codex Sticky linking to that overview. Supported initial formats are DRM-free EPUB, TXT and Markdown (UTF-8 or BOM-marked UTF-16). EPUB package metadata and spine order supply book details and chapter order. Multiple top-level chapter headings in one EPUB document are split; plain text/Markdown use chapter/part/book headings or Markdown headings. Text with no recognizable headings imports as one entry. Review the detected chapter titles before confirming.

Confirm book title and author, and supply missing metadata during creation. Publication year, edition, publisher, identifier and language are offered for citations. Unknown authors must be identified explicitly as Unknown rather than silently fabricated. File selection, parsing and cancellation do not modify the workspace. Only confirmation after validation and capacity preflight adds the book.

The overview owns a Board per chapter. Imported text is stored separately from notes and has no editor or canvas drag/delete control. Opening an entry shows its reading box; Codex view adds three columns: Chapter, Linked notes and that chapter's independent research canvas. Headers move columns left/right; separators resize them. Narrow screens also have Chapter / Notes / Canvas navigation buttons. Returning to a normal Board removes Codex presentation. Entry preferences remember mode, column order/widths, font, paper theme, source position and scroll/page mode locally on each computer. Opening a Codex Sticky's Open Codex button resumes its last visited entry; Chapters returns to the overview.

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

The first version extracts readable text and paragraph structure. It does not preserve EPUB images, original typography/CSS, audio/video, interactive content or printed pagination. Imported scripts/markup never execute and external resources are not requested. DRM content is rejected. The existing bundled ZIP reader is used with resource/count/path/expanded-byte limits; no new network dependency is introduced.

Limits: 32 MiB input file, 10,000 archive entries, 8 MiB per expanded text resource, 64 MiB expanded textual resources, 1,000 chapter entries, 4 MiB text per chapter and 48 MiB total chapter characters. Larger books require splitting before import. Further PDF importing remains outside this work. Integration with the separate ebook research app is a later phase.

Validation: codex-core.cjs covers source anchors, overlapping annotations, page/order independence, cited copies, markers, backup/owned cloning and concurrent causal merge. codex-import-ui.cjs covers EPUB metadata/spine/Unicode/path handling, inert extraction, no network loads, malformed/DRM/expansion rejection, encodings and cancellation. codex-ui.cjs exercises actual import, annotation editing/deletion, cited clipboard/canvas copies, chapter boundaries/future filtering, independent canvases, page switching, column order, restart and exit to normal Boards. codex-mobile.cjs covers touch annotations, narrow-screen column navigation, canvas copying, research-only settings and reading-page restoration. Existing large-workspace, native-auth, image, canvas, recovery and two-device sync suites remain release gates.
