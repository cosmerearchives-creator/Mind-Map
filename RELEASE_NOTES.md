# Silverlight — project keys and canvas polish

- Design one project key on its own canvas and show it across the project's Boards. Key text entries become reusable Project styles in Sticky editors.
- Home previews display sanitized rich notes instead of storage markup. Blank Sticky titles stay hidden.
- Connection forks adapt to layout, using separate links for targets on opposing sides. Existing manual junctions remain overrides.
- Selected images resize from borders and corners. Image bounds match their displayed size when not intentionally offset/cropped; animation stays mounted while resizing.
- Image display no longer waits behind sync worker jobs. Requests coalesce, decode concurrency is bounded, and GIF/WebP/APNG sources retain animation.
- Optional old-copy cleanup is off by default. It retains at least ten recent copies from each device and only removes already-merged automatic copies older than 30 days after a confirmed replacement. Manual copies, other devices' files, legacy copies and all shared parts remain. This does not reclaim shared image-part storage.
- Android packaging verifies the existing release signing certificate; the key is unchanged.

Install over the current app without uninstalling or clearing app data. Existing boards, pending changes, credentials and sync datasets are retained. Use Board settings → Project key to design a key, or Board actions → Show project key to display one. Old-copy cleanup is separately enabled from the sync window and explains permanent deletion before opt-in.

Ebook tools/research-app integration remain for a later release. Further PDF import development is dropped; existing import remains available.

Validation and limitations: docs/release-polish.md. Synthetic tests cover the changes; the affected personal Board's image-load time still needs confirmation after installation.
