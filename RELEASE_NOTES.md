## Codex library, scoped search and highlight editing

- Codex library defaults to Creator / World / Codex / Chapters. Imports create or reuse Creator and World layers; choose an existing layer or library root when needed. Existing Codices appear at the library root until organized.
- Add custom layer types, rename or move branches, skip levels, and move Codices. Removing a layer promotes its child layers and books. Book source, annotations, research canvases and existing canvas placements remain intact.
- Search from every Codex column header: source text, linked-note quotes/headings/body, or research Sticky titles/body. Scope to chapter, Codex, or any ancestor layer. Results show book/chapter excerpts and jump to the source, note or Sticky. Search is cancellable and paginated; unopened chapters are inspected without retaining them or loading original images.
- Select source text and right-click Highlight and add note. Edit any existing Codex note to change its highlight color. A color wheel, brightness control, hex field, presets and per-Codex saved custom colors are included. Independent overlapping annotations retain their own colors.
- Search marks are temporary presentation and never become annotations. Existing imports work without reimport or destructive migration; existing citations and source hashes are unchanged.

## Navigation responsiveness and Codex import polish

- Canvas panning no longer redraws every Sticky each frame. Offscreen culling now includes chapter overviews with 40 or more Stickies; redraws happen when leaving the buffered viewport or changing scale.
- Pan, zoom and Board navigation save a small local view record instead of serializing the workspace or marking cloud content pending. Board edits retain the existing durable save and sync paths. Wheel easing settles more promptly; precise trackpad input and reduced-motion behavior are preserved.
- Discard obsolete queued image decodes after switching Boards and bound unused thumbnail cache to 64 items / 12 megapixels. Original artwork is unchanged.
- Canvas context menu includes Reset view. Left-click outside closes menus without starting canvas selection.
- New EPUB imports retain internal contents/chapter links, including fragment destinations. Links keep source offsets and annotation/citation text intact, survive backup/sync and remap when a whole Codex is copied.
- Citation import asks for an optional ISBN, accepts ISBN-10/13 with checksum validation, and omits UUIDs. Existing citation metadata remains unchanged.
- Recognize front-matter names from semantic types, guide references, visible headings, contents links and conservative copyright/dedication cues. Unidentified sections keep their fallback titles.

Import improvements apply to new Codices. Existing book source text and annotations are never rewritten. Import a separate copy to obtain links/titles that older imports discarded.

# Silverlight — Codex covers, smooth scrolling and safer editing

- Main Codex Stickies import the book cover as their background, with the book title below. EPUB declared cover images and recognized cover pages are supported; books without cover art keep a plain tile. Clicking the cover resumes the remembered chapter.
- Selecting text in a create/edit Sticky window and releasing the mouse outside it no longer dismisses the window or loses the draft. An outside click must start and finish on the backdrop without dragging. Save, Cancel and normal outside-click dismissal still work.
- Mouse-wheel notches now scroll smoothly on the canvas, home view and scrollable reading/editor panels. Fine trackpad scrolling remains direct; Shift-wheel horizontal movement and Ctrl-wheel zoom remain available. Reduced-motion preferences disable the animation.

Install over the existing app without clearing data. Book-cover defaults apply to new imports; existing Codex books, notes and custom backgrounds stay unchanged. No cloud migration or sign-in changes are required. Regular releases only.
