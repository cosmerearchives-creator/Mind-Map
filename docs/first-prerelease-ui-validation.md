# First prerelease UI — local review

Implemented on `feature/first-prerelease-ui`, based on main `6ecc17f1ff2f83b6600c9e18b909fb9c06992f9c`.

## Changes and locations

- Double-click a text Sticky to place the editing caret at the clicked text position.
- Imported `.arcanum` WoB HTML displays supported paragraphs, emphasis, lists, entities and source hyperlinks. Rendering does not deliberately migrate the stored body; explicitly saving uses the existing rich-document format. Existing layout migrations remain in effect.
- The canvas paint control uses a brush icon and the name **Paint Canvas**.
- Image-region editor: choose **Smart shape**, draw a rough box, review the fitted circle/ellipse or rectangle, then adjust handles, pixel margin or arrow keys (Shift for 10 pixels). **Snap outline** also works on an existing selection. Ambiguous images retain manual controls; this is local edge fitting, not general object segmentation.
- Create Sticky → Image → **Use placeholder** reserves an image frame. **Add image** later replaces it while retaining its ID, position, frame, notes, tags and relationships.
- Dumping Ground → Board actions → **Move to Board** supports selected items, existing/new destinations, related groups and imported companion images. The workspace transaction must succeed before live source items are removed. A failed save retains the source. Import source IDs and metadata travel with the cards.
- Project controls sit alongside the app name in one horizontally scrolling row, visible on the projects page. The previous heading/help rows are removed.
- Google Drive: concise status/progress remains visible; timing diagnostics are collapsed. Primary actions and **Backups & recovery**, **Advanced**, **Account**, and **Close** share one scrolling row. Existing transfer/sync operations retain their handlers.
- Board actions → **Export read-only embed** offers nested-Board checkboxes, Preview, Save HTML, and an iframe snippet generated from the hosted HTML URL. Exporting does not upload or publish anything.

## Embed boundaries

The root Board is included; nested Boards are opt-in. A new public projection remaps IDs and omits excluded Board cards/references, private assets, Unsorted, workspace history, import metadata and editor state. Only selected asset references are loaded. Attachments require an additional opt-in.

The generated HTML contains a separate viewer, not the application bundle: it has navigation, pan/zoom, readable details and source links, without content editors, save operations or a native bridge. HTML is sanitized, the script is allowed by a specific SHA-256 content-security-policy hash, and network requests are blocked. The iframe snippet omits same-origin permission. Hosted exports are static snapshots; create and replace the HTML file to update one.

Enforced HTML-export limits: 5,000 selected Stickies and 64 MiB of generated HTML. Smart image analysis downsizes its region to at most 512 pixels on the longest side. These are implementation limits, not merely tested dataset sizes. Existing `.arcanum`/backup limits and formats are unchanged.

## Verification

- The 52 existing browser suites were exercised. Four failures in the first run exposed overflow/dropdown behavior in the new sync row; those issues were fixed and all four affected suites passed on rerun. No remaining suite failures.
- New browser tests cover clicked caret insertion at 70%/140%, desktop/mobile project controls, WoB HTML/source links, placeholder creation/replacement, actual export dialog/iframe preview, atomic inbox failure/success/reload, companion-image moves, and smart fitting/adjustments/save.
- Export tests verify selected nested navigation, excluded-data sentinel absence from final HTML, no excluded asset loads, script/tracker removal, read-only controls, zero viewer network requests, hierarchy and size rejection, and iframe permissions.
- Shared validation checks all scripts and the existing backup, import, merge, storage, metadata and source-dedup suites. New synthetic circle/rectangle fitting tests cover interior noise and blank-image fallback.
- Physical backup stress test: **552,463,216 bytes**, 263 mixed Boards, maximum write 131,263 bytes; verified round-trip, cancellation, truncation/corruption rejection and retained lazy checksum behavior.
- Existing browser tests include a >512 MiB logical workspace transfer, 3,000-Sticky viewport/performance coverage and middle-pan/Ctrl-wheel navigation with 512 Boards.

All fixtures are synthetic. No user backup or installed app workspace was edited.

## Remaining release work

Native Windows/Android builds and actual-device checks remain outstanding: this machine has a .NET runtime but no installed .NET SDK, Java or Android build tools. Browser native-bridge simulations do not establish actual-device behavior. No version metadata has been bumped and no installer/APK has been built or published for this change.

User requires a two-step push gate: the user first says to push; then the assistant confirms the exact intended push and waits for explicit confirmation. This local implementation is not either step. Keep release publication and version changes pending that review.
