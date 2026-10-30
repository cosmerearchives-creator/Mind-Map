## Silverlight 0.13.3 — faster main-project transfers

- Automatic transfers retain a verified basis for each recently used group of Boards. Returning to the main project after editing a nested Board can reuse the main project's previous transfer, including after a restart, instead of building a broad replacement from the smaller Board's basis.
- A bounded, account-separated catalog retains verified image-part references across those switches. Each upload checks the referenced parts against Drive's file listing; unchanged images skip the part-processing loop. Missing parts are repaired and changed references are included even when the original image content ID stays the same.
- Repeated large snapshots with the same verified original images reuse a bounded SHA-256 state for the unchanged image section. Checksum results remain byte-identical to existing releases. The cache retains IDs and checksum state, not original image bytes; new images invalidate the applicable state.
- Optional cache corruption falls back to verified transfers. Cloud formats, original-image verification, nested-Board validation, conflict handling, local history and recovery are preserved. Transfer diagnostics now separate the cloud-part check from local preparation and report the final manifest upload explicitly.
- Windows only; Android remains at 0.10.1 / versionCode 1000001.

Validation includes a main-project blank Sticky after nested-Board editing and a persisted-cache restart: one approximately 3 KB manifest, no repeated image-part processing, and an independent reader recovering every nested Board and original image. Additional tests cover unchanged legacy checksum values, missing-part repair, invalid-cache fallback, image additions and the full core/browser and Windows release gates. These fixtures do not guarantee real Google Drive latency.

## Silverlight 0.13.2 — incremental local sync-history saves

- Automatic-sync history is stored per Board with a small local index. Metadata-only saves reuse unchanged causal records rather than copying and hashing the whole project history on every sync stage. Changed records, the index, pending workspace changes and any recovery copy still commit atomically. History reads retrieve the index and records from one consistent database snapshot while another sync writes.
- Existing monolithic local history remains readable and migrates on its next successful save. Failed transactions retain the previous workspace/index and retry the changed records. No cloud snapshot, image, causal merge or Drive transfer format changes.
- Clean-start proofs cover per-record content digests. Startup recomputes those digests and compares the actual workspace before accepting the shortcut; clocks alone are not accepted as a restart integrity proof. Original-image verification remains required when reading originals.
- SHA-256 uses the platform's native implementation for inputs up to 32 MiB, preserving identical checksum bytes. Larger inputs and unavailable/failing native crypto retain the bounded streaming implementation.
- Downloaded diagnostics now include counts of sync-history records written and local preparation/commit timings, without Board names, content or credentials.
- Windows patch only. Android development remains paused at 0.10.1 / versionCode 1000001.

Validation includes legacy migration, a text-heavy 24-Board corpus, a blank Sticky writing one history record, metadata-only saves writing zero history records, transaction abort/retry, full reload, corrupt-record rejection, native-crypto failure and bounded fallback, original-image preservation and the complete core/browser and Windows release gates. Fixture timings do not guarantee real Google Drive latency.

## Silverlight 0.13.1 — small-edit sync performance

- Routine automatic uploads prepare only changed Boards and their required nested references before reading original images or crossing the worker boundary. A small Codex tag edit no longer prepares every Board and image for upload.
- Incoming sparse updates merge and reproject only their affected records, preserving untouched local Boards and checking the resulting workspace for missing references. Parked drafts and conflict handling remain protected.
- Saved sync metadata retains references to already stored images, avoiding repeated image hashing during metadata-only writes. Device-local pending-change detection uses verified causal clocks; automatic snapshot, transfer and image checksums remain unchanged.
- A proven clean restart seeds the previous upload's Board clocks, so the first edit after upgrading can use the same sparse path. Full local causal history, conflicts, recovery copies and periodic full checkpoints remain available.
- Sparse uploads advance the full-history checkpoint counter even when the transport chooses a standalone transfer manifest. This prevents sparse manifests from indefinitely postponing a complete recovery checkpoint.
- Windows only; Android remains at 0.10.1 / versionCode 1000001. Existing Drive data and workspace formats remain compatible.

Validation adds a 49-Board fixture with 48 stored images: one tag edit uploads one checksum-verified Board, reads zero unrelated original images while sending and receiving, survives resident-cache cleanup, preserves all 49 local records, and retains the sparse path after a clean upgrade. Measured local processing was about 0.15–0.21 seconds on that fixture; this is not a real Google Drive latency guarantee. Core and full browser regressions, plus native Windows release checks, gate publication.

## Silverlight 0.13.0 — reference tags and project tag Boards

- Codex search now uses * instead of & for one-or-more-character prefix/suffix matching. A leading/trailing - requires no letters on that side; -is excludes This, and -is- matches the complete word. Match case and punctuation-insensitive quoted phrases remain available. The search reminder explains the revised symbols.
- Opening a search match retains the active Codex/research view and reading appearance, including when moving between chapters. Research-Sticky search can display a nested research canvas inside the Codex layout.
- Tag an exact passage from a search result, the selected-passage toolbar or context menu, or an existing annotation. Each # starts a new label: #Hoid?#Who is this guy?#sexy drifter produces three tags, preserving spaces, punctuation and display capitalization. Source text, source hashes and citation offsets are unchanged.
- Board actions now includes Project tags, Refresh project tags and Tagged references. Project tags lists labels from the main project, nested Boards, Unsorted items and Codex annotations. Tagged references returns to the exact passage or Sticky.
- Clicking a tag reuses its matching project Board or creates one and adds its link to the main project's Unsorted Library. Refresh scans the whole project, groups equivalent labels, rechecks existing matches, and creates only missing Boards. Existing ambiguous names require a choice and are kept intact.
- Refreshes run as single synchronous workspace mutations with reentry protection. Generated Board and Library-link identities are stable for each project/tag pair, so repeated requests and independently refreshed devices converge on the same tag Board. Existing legacy comma-separated tags remain readable.
- Windows release only. Android remains at 0.10.1 (versionCode 1000001), with no new mobile build. Storage, backups, original images and Drive protocol/checksums are retained. Older Android builds do not gain the new tag controls or delimiter handling.

Validation includes prefix/boundary examples, exact-source tag persistence, cross-chapter view retention, project isolation, reuse of existing Boards, ambiguous-name selection, rapid and repeated refreshes, independent/two-device tag creation, Unsorted placement, snapshot round trips and the complete browser/core and native Windows release checks. Live Google Drive timing and physical Android installation are not covered by browser simulations.

## Silverlight 0.12.0 — desktop editing and Codex research

- New desktop Notes start directly on the canvas, ready to type, from the Add button, context menu or radial menu. New-note creation starts inline even when an existing-note popup preference was selected. Save, Cancel, keyboard shortcuts and parked drafts remain available.
- Narrow and split-screen PC windows keep the desktop editor and its wrapping/scrolling formatting bar above the canvas. Resizing retains the editor DOM, draft and selection.
- Double-click an ordinary nested Board label to edit it on a transparent canvas surface with controls above. Its image/icon or non-label frame still opens the Board. Codex chapter links retain their existing navigation.
- Website image drops recognize Firefox URL/title and URL-data formats, normal URI lists, HTML images and local files. Accepted drops suppress default navigation; drops outside an open canvas explain where to drop. Imports show preparation/download feedback and retain original bytes locally for offline use and Drive sync.
- Codex search supports & before/after a word for one or more additional non-space characters, a Match case toggle, punctuation-insensitive quoted phrases, and a short syntax reminder. Results retain original source positions for navigation and highlights. Regular unquoted searches retain literal punctuation matching.
- In Codex view, research-canvas creation choices now live in an Add dropdown in that column's header, beside Search. The former canvas plus button is hidden in this view. Other canvas creation menus are retained.
- Startup shows a loading state until local storage and any required migration are ready. Saved Boards render before cloud-resume checks. Unchanged restarts avoid repacking and rewriting the saved workspace; migrations and edits still save normally.
- Newly mounted image requests are queued for a frame and prioritize visible items before overscan images, retaining bounded decode concurrency and the existing preview cache.
- Windows release only; Android remains at 0.10.1 (versionCode 1000001). Existing workspace formats, original images, recovery copies, backups and Drive compatibility are preserved.

Validation covers the supplied search examples and Unicode source offsets, narrow desktop editing/resizing, loading gates, nested label/icon behavior, draft parking, Firefox-style payloads using the supplied Coppermind URL, Codex menus/search, clean restarts with zero original reads and workspace rewrites, large Boards, storage failure recovery and two-device transfers. Browser drop tests simulate browser payloads; a physical Firefox-to-Silverlight drag and the image host's live download response still require device verification. The user's large workspace has not been benchmarked after this update.

## Silverlight 0.11.1 — reduce repeated sync work

- Panning, zooming and changing tabs no longer invalidate an automatic sync save. Actual content edits still stop stale incoming writes, and incoming Boards preserve the current local view and tabs.
- Optimized Drive uploads skip redundant per-record checksums. The final sync check reuses its checksum when no new edits were captured, and computes a fresh one when edits arrive during upload. Existing checksums, original images and the Drive protocol remain unchanged.
- Metadata-only sync updates avoid repacking an already-saved workspace. Pending local edits and incoming Boards still save atomically with sync history; incoming changes retain a local recovery copy. Stale queued writes check their guard before preparing each record.
- Diagnostics no longer mistake “Workspace changed” for a storage-capacity error. Image progress describes preparation rather than implying every image was read from disk.
- Windows release only. Android remains at 0.10.1 (versionCode 1000001), with existing access and Drive compatibility retained.

Validation covers navigation during sync commits, concurrent edits, pending saves, recovery transactions, optimized hashing, existing browser/storage/two-device transfers, native updater/authentication checks and installer packaging. The reported 329-second workspace has not been benchmarked after this patch. Startup loading and large-board viewport performance still need separate investigation.

## Silverlight 0.11.0 — desktop canvas interactions

- Editing an ordinary desktop Note keeps the existing Sticky frame, font, padding, line wrapping and text placement. A caret and accent outline indicate editing. Save, Cancel and More / pop-up are in the formatting area above the canvas. Clicking the canvas commits the edit; Escape cancels and Ctrl+Enter saves. Existing popup preferences and parked drafts remain available.
- Double-click empty canvas on PC for a compact radial menu with labeled icons for Note, Nested Board, Image, Collection, Family tree, Spreadsheet, Timeline, Checklist, Link, Location Pin, Board shortcut and Codex. Select a type to begin creation at the original click position. Escape or an outside click dismisses the menu. Existing context-menu creation remains available.
- Drag up to 20 image files from File Explorer onto the canvas, or drag a website image directly from the browser. Supported website images are downloaded through the Windows bridge without requiring cross-origin browser access. Originals are copied into workspace storage, preserving their bytes for offline use, backups and Drive sync. Each image must be below 8 MB. Invalid or blocked downloads leave the workspace unchanged and explain the file-download alternative.
- Windows is the active development and release target. Android remains at 0.10.1 (versionCode 1000001); mobile-specific development and automatic APK releases are paused. Existing Android installations retain workspace and Google Drive access. The previous signed APK remains available in the 0.10.1 release. This release contains Silverlight-Setup.exe only.

Validation includes matching displayed/editable text rectangles and line wrapping, stable frames across canvas zoom levels, parked drafts and save/cancel behavior, radial creation, local and website image-drop/reload/failure cases, existing shared-storage and Drive regression suites, native Windows updater/authentication tests and the Windows installer build. Website download restrictions can still require saving the image locally first.

## Silverlight 0.10.1 — Stability & Performance Update

- Background timeouts terminate the worker and cancel every outstanding job. Crashes and unreadable responses reset the worker and its image cache; the next request starts fresh. Late responses cannot overwrite recovered work. Failed worker startup can be retried on a later request.
- Local saves retry transient storage failures with delays from one to thirty seconds. New edits supersede older retries. The unsaved warning clears only after the current workspace is durably saved, and closing with pending saves warns before exit. Returning to the app retries pending saves.
- Changed Boards avoid a second serialization unless layout migration changes their content. Suspended editor drafts also prevent closing their owning tab and remain protected during navigation.
- Downloaded sync diagnostics include worker/fallback job totals, reset count and an allowlisted failure category, without workspace text, images or credentials.
- Existing workspace storage, backup formats, original images, Google Drive sync protocol, application IDs and Android signing identity are retained.

Validation includes worker timeout/crash/post failure injection, save retry and warning recovery on desktop and Android-sized touch layouts, the shared/core and browser regression suites, and coordinated Windows/Android build checks. Physical Android installation and live Google Drive account timing are not covered by browser simulations. Version metadata and official main/latest release gating are checked automatically.

## Silverlight 0.10.0 — complete layouts, simpler Stickies and faster local work

- Ordinary Note and checklist Stickies use content without a separate title. Existing titles move to the beginning of the content, preserving rich body formatting and Board links. Ordinary Nested Board Stickies have only a wrapping title and destination; existing note text joins that title. Codex book covers and read-only source annotations retain their specialized presentation.
- Content conversion uses per-Sticky/version markers, retains original fields for recovery, and saves an atomic local recovery workspace before the first conversion. Older incoming/imported content is converted at the application boundary without rewriting remote causal history. A first-run conversion is a real saved change and can require sync verification once; unchanged later restarts retain the 0.9.3 shortcut.
- Automatic sizing now supports every Sticky type, with a Fit to contents context action and a sizing choice in the standard editor. New specialized Stickies use automatic sizing. Existing explicit sizes remain respected; border resizing switches to manual sizing. Normal automatic frames are bounded to 800 pixels per side, Collections and manual frames retain the 4,000-pixel limits, and content can scroll internally.
- Canvas Templates capture canvas and Unsorted Library items, nested Board contents, images/backgrounds, formatting, connection labels/junctions, pending Library links, Board settings and saved views. Applying creates independent IDs and remaps internal references. Existing content can stay, move to Unsorted Library, be deleted, or remain untouched by canceling; Undo remains available. Older templates still open, but must be saved again from their source Board to include content the old capture omitted.
- Showing/hiding the desktop formatting toolbar preserves Sticky screen positions while changing the available canvas area, including at different zoom levels and window widths. Nested Board title editing and Note body editing remain available inline or in the pop-up presentation.
- Image previews persist in a separate, bounded, disposable local cache. Restarts can display cached previews without rereading original images. Image identity/size keys prevent stale reuse, corrupted previews fall back to verified originals, and cache/storage failures do not block project data. Originals remain in project storage, backups and Drive sync. Small Boards now use the same viewport culling as large Boards; visible image jobs take priority over nearby jobs.
- Saved edits identify changed Boards, and the capture worker only loads originals for those Boards while retaining unrelated causal history. Local-only sync cycles skip redundant projection/observation. Conflict resolution now explicitly replaces the reviewed Board instead of preserving an obsolete editor-protected instance. Offline changes, concurrent conflicts, transactional recovery, authentication and Google Drive remain supported.
- Startup storage uses saved per-Board identity/reference metadata to avoid repeat Board parsing/reference scans in the current format, and batches image-existence checks in one storage transaction. Older formats use their existing readers and are upgraded on save; original-byte and remote checksum verification remain.

Validation: shared/core tests, 36 browser regression suites, Windows updater/authentication tests, signed Android APK and Windows installer builds. Browser cases include all Sticky sizing types, title/body recovery and idempotence, template fidelity/remapping, unchanged startup with 24 image Boards and zero original reads, persistent preview/corruption fallback, one changed Board reading 1 of 12 originals during capture, two-device edits/conflicts/offline/restart/storage rollback and large-workspace transfers. Physical-device behavior and real Google Drive timing still require user confirmation.

Sync/performance follow-up: final full checksums, initial joins, recovery checkpoints and some incoming-change operations can still read broader image/history data. The changed-Board measurement covers capture, not every stage of a sync. New previews need an initial original read and may be regenerated after cache eviction. This release does not promise an image-free first migration or every sync operation.

## Silverlight 0.9.3 — avoid unchanged image reloads at startup

- Existing desktop text Stickies now start inline even when an older release saved a pop-up preference. Subsequent editor choices are retained; mobile keeps its existing default.
- Clicking back onto the canvas finishes and saves the inline edit, releasing the editor's canvas lock. Save, Cancel and parked tab drafts remain available.
- Live sync can resume a previously verified, unchanged local workspace using saved image hashes and sync history. It checks Drive for updates without first reading all local image originals or repeating the full workspace checksum.
- A verified cached upload can provide the same proof when upgrading from the previous release. Missing proof, offline edits, changed image references, pending changes, conflicts or deferred drafts retain the normal verification path.
- Local clean-state proof is saved atomically with the workspace and sync metadata, and is invalidated when causal records change. Missing-image checks and original-byte verification when an image is actually used remain. Remote snapshots retain their original integrity checks.
- Startup initialization no longer marks an unchanged workspace as a new edit. A concurrent user edit while the startup comparison runs invalidates the shortcut.

Validation includes an isolated browser restart with 24 image Boards and zero original-image reads, verified-cache upgrade, offline-edit fallback, subsequent clean resume, corruption checks and the complete release test/build pipeline. Real-device startup timing remains dependent on workspace size and storage.

Sync/performance follow-up: actual edits and incoming changes can still need broader verification work. This patch targets unchanged restarts; it does not claim that every sync operation loads only changed images.

## Silverlight 0.9.2 — direct inline note editing

- On desktop, double-click a text Sticky to edit its title and rich text directly inside the Sticky. This also covers checklists, link notes, nested-Board notes and older text Stickies.
- Save and Cancel stay inside the Sticky; formatting remains above the Board tabs. More / pop-up opens the full editor for tags, appearance, templates and other advanced options without losing the draft. A saved pop-up preference is respected; choose Edit inline to switch.
- Per-tab drafts survive switching tabs and presentation. Mobile keeps pop-up editing by default and can opt into inline editing. Native Back still protects unsaved drafts.
- Specialized Family Tree, image, spreadsheet and timeline editors keep their existing interfaces. Image-region notes without a visible Sticky use the pop-up fallback. This focused patch does not add automatic sizing for every Sticky type or expand Canvas Templates.

Install over the existing application. Existing projects, links, authentication and synchronization are preserved.

## Silverlight 0.9.1 — faster Google Drive synchronization

- Normal live update checks use Drive's changes feed instead of repeatedly listing all snapshots. Unchanged checks avoid Board capture and workspace hashing. Closing an editor requests a lightweight check; periodic and expired-cursor recovery scans remain.
- Identical joining Boards adopt existing cloud history without another full upload. Automatic transfers send sparse changes, reuse image parts and resume verified cached downloads. Independent part transfers are bounded to three requests.
- Unrelated Boards can update while drafts remain open. Changes to the edited Board stay queued until its draft is saved or closed. Offline edits, conflicting versions, original checksums and transactional recovery snapshots remain protected.
- Full recovery checkpoints run after editing quiets down and can defer for new edits. Resuming after a manual restore captures the restored content. Existing snapshots are read without a duplicate root download.

**Update both Windows and Android devices before continuing shared live sync.** Install over the existing application; preserve an independent backup. Google Drive remains the provider, with the existing account, authentication and application identities.

Validated with shared/core tests, 31 browser regression suites, native Windows authentication/updater checks and signed Android/Windows builds. Small simulated two-device edits arrived in approximately 1–3 seconds; real Drive latency on a large workspace still requires device testing.

This patch updates synchronization. Universal true inline editing, automatic sizing for every Sticky type and complete Canvas Template copying are not included.

## Silverlight 0.9.0 — coordinated workspace update

- Desktop Sticky editors open anchored over their Sticky, with a pop-up alternative. Mobile keeps pop-up editing by default and offers the anchored option. Switching presentation preserves the live draft; per-tab drafts remain available. Desktop rich formatting sits above the Board tabs, with list/alignment icons and no indent/outdent buttons. The mobile Create Sticky selector wraps within the dialog.
- Connection previews clear on drop/cancel, targets highlight during drawing, and a click on the source handle starts click-to-connect. Saved connections follow Board movement. Windows nested Boards require a double-click; deliberate shortcut and Codex navigation remains available.
- Google Drive live sync batches changed Board records, reuses immutable assets, and retains full checkpoints, offline edits, concurrent conflicts and transactional recovery snapshots. No account/provider migration. Incremental history is retained instead of being removed by the old full-snapshot cleanup rule.
- Automatically sized notes measure rendered rich content after editing, stay within the existing 4,000-pixel frame limits, and scroll internally. Explicit manual frame sizes remain respected.
- Family Tree names open person editing, with relationship actions and links to existing profiles. Relationship creation stays open with a saved confirmation for successive additions; duplicate/self/cyclic relationships explain why they are invalid. Matching parent sets share a parental junction. Each Family Tree Sticky can switch between a compact summary and a clickable diagram.
- Android system Back closes interactions before exiting and asks before discarding changed editor drafts.
- Canvas Templates save reusable layouts, including nested Boards and connections. Apply to a new Board, keep existing canvas content, move it to Unsorted Library, delete it, or cancel. Application supports Undo. Note Templates preserve rich formatting, substitute placeholders and optionally retain existing title/content. Templates travel with workspace backups and Drive sync.
- Windows and signed Android installers are published together only after both native builds of the same commit succeed. Application/package/signing identities and existing Google authentication remain unchanged.

Install over the existing app and keep an independent backup. Legacy updaters only recognize their older platform-specific release tags; this first unified release may need a direct installer download. Updated updaters accept unified version tags. Physical-device interaction and real Google Drive latency are not certified by browser simulations and build checks.

## Tab-specific editors and Family Tree Stickies

- Creation and editing windows sit below the header and tabs. Switch to another tab, check a Board, then return to the same live editor with its draft, formatting and scroll position. Each tab keeps its own editor; opening the header's Board picker temporarily suspends the current editor. Closing a tab with an open editor asks you to finish or cancel it first.
- Drafts remain in memory while the app is open. Save commits to the project; Cancel discards that editor's draft. Unsaved editors warn before browser reload/close. Incoming cloud replacements and workspace undo/redo wait while drafts are open, including editors parked in another tab.
- Create a Family Tree Sticky with people, owned portraits, rich notes, optional free-form dates and links to Boards, Stickies or cited Codex passages. Supports biological, adoptive, step-parent, guardian, partner/spouse, chosen-family and custom relationships; multiple parents and partners are allowed.
- Open the tree for pan/zoom, automatic generational layout, manual placement, relationship labels and a color/style key. Edit or remove relationships independently. Deleting a person confirms removal of their lines while keeping everyone else. Cyclic ancestry is rejected; peer relationships remain unrestricted.
- Family data uses existing project persistence, backup, sync, clipboard and undo/redo. Existing Boards and Codex source content are unchanged. Update all devices before editing the new Sticky type. Trees support up to 2,000 people and 10,000 relationships.

## Spreadsheet Stickies, fictional timelines and Codex source links

- Create a Spreadsheet Sticky with editable canvas cells and an expanded editor. Includes arithmetic, cell/range references, SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS and IF; text styles, colors, alignment, row/column sizes and insertion/deletion. Same-app range copying preserves formatting and adjusts relative formulas. Sheets are stored inside the project and follow normal backup, sync, copy and undo/redo paths.
- Create a Timeline Sticky and open its interactive timeline. Choose custom units and a reference epoch, negative or positive positions, approximate dates and ranges. Undated events can have before/after relationships without inventing dates. Switch between elapsed-time and even spacing, zoom around the pointer, collapse nested eras, search events and link related Boards, Stickies or Codex passages.
- Copied Codex notes now have Go to source. It opens the original chapter and briefly marks the cited passage. Verified older citations can resolve without reimport; ambiguous copies ask which source to open, and missing sources leave the copied note intact.
- New data is additive: existing Boards, Codex source text and citations are preserved. Earlier app versions cannot edit the new document types; update both computers before editing them.

Spreadsheet support is intentionally a basic internal sheet, not full Excel compatibility: maximum 2,000 rows by 100 columns; range operations are bounded. Timeline zoom is adaptive within finite numeric precision, with positions limited to ±1 trillion base units. Use unit multipliers for long fictional histories. Unknown dates remain unknown.

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
