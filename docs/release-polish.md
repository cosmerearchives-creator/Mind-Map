# Project keys, canvas polish and conservative retention

## Project key

Open Board settings → Project key → Design key (or Board actions → Design project key). This creates a blank, ordinary Board owned by the main project through a Project key entry in its Unsorted library. Arrange example Stickies with the existing canvas tools; paste an existing legend if desired. Board actions → Show project key opens a zoomable panel on any Board in that hierarchy. Editing the source key updates the next rendered panel. The panel is a presentation of current data, not a flattened image.

Text Stickies on the key become named Project styles in the Create/Edit Sticky dialog. Titles label the styles; titleless entries use their visible text. Applying a style copies the background, text color and basic text formatting while retaining the destination's words, links and lists. Existing explicit inline formatting remains intact. The style identifier is saved with the Sticky. Subsequent edits to the key do not silently restyle existing notes. Topic tags remain separate; category filtering is not part of this release.

Keys are regular nested Board data, preserved by existing sync, selection cloning, backups, recovery and undo. There is no workspace migration. Older clients can open the owned key from Unsorted but do not have its special panel/style controls.

## Preview, titles, images and routing

Home preview summaries keep up to 8 KiB of each of their first three note bodies and render through the existing HTML sanitizer. Legacy summaries that truncated the rich-text prefix are refreshed from the original stored Board without modifying note bodies or retaining the Board as opened. Blank Sticky titles no longer show Untitled or reserve a title row.

Image dimensions determine bounds when no intentional image offset/crop is present. Selected images resize from all four edges and corners, respecting Keep proportions and keeping the opposite edge fixed. Other Sticky frames retain their existing resize control. Existing image offset controls remain available. Resizing and selection retain mounted image elements, so animation does not restart on every redraw.

Display image preparation bypasses the shared sync/serialization worker. At most three originals decode concurrently; requests for the same source coalesce, including zoom requests. The existing bounded display cache remains in use. GIF, WebP and APNG sources use their original blob so animation is not flattened. PNG/JPEG display copies can be downsampled; originals remain untouched. Region geometry uses only the original's identifier and does not generate separate image copies. A real affected Board timing comparison remains a user acceptance check; no specific speedup is promised.

Automatic routing partitions targets by direction. Nearby directions share a trunk; targets on the opposite side connect separately. The grouping recomputes as Stickies move, and anchors use the facing rectangle boundary. Existing manually positioned junctions remain explicit overrides (double-tap to reset). Edge IDs, directions, labels and label positions are retained.

## Optional old-copy cleanup

Live sync → Set up old-copy cleanup enables a per-device policy, off by default. Each run removes at most ten automatic snapshots older than 30 days, retaining at least that device's ten newest snapshots and a confirmed complete replacement less than a day old. Only this device's already-consumed snapshots in the same account/dataset are eligible, with no unresolved conflicts/missing Boards. The replacement's exact envelope revision must match the cloud metadata. A later failed cleanup does not fail a completed sync.

The native Windows/Android bridges independently recheck the listed IDs, app-data space, protocol, dataset, device, age and replacement revision before deletion. Manual copies, other devices' copies, legacy files lacking device metadata and every immutable image/document part are excluded. Consequently this policy limits eligible snapshot history, but does **not** reclaim shared image-part storage. Part garbage collection requires a separate reference/lease design and is not enabled.

Google app-data files cannot be trashed, so deletion is permanent. The app explains this at opt-in. No cleanup runs merely by installing this release; no existing dataset is migrated or deleted.

## Android release signing and roadmap

The existing protected release key is preserved. Its certificate matches Android builds 84 and 85 (SHA-1 identity fingerprint `9F:2F:5C:1E:80:A8:57:99:97:25:E4:F9:80:E5:25:A8:D7:6E:11:E1`). CI pins that identity and refuses accidental key changes. This does not make old installations signed with a different historical key compatible.

Ebook importing and potential integration with the ebook research app remain a later development phase. Further PDF import development is dropped; existing PDF import stays available.
