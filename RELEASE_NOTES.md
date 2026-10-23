# Silverlight Archives — large Board performance

- Render visible Stickies and connections with overscan, preserving all offscreen content.
- Update moving Stickies and affected connections during dragging; reuse spatial indexes and Collection layout.
- Store changed Boards separately and reuse shared image assets. Existing workspace formats migrate safely.
- Prepare storage, hashing and sync operations in background workers where supported.
- Display cached thumbnails while preserving original image bytes and transparency in storage, backups and sync.

Local synthetic tests with 3,000 cards show substantially faster opening and dragging. See docs/performance.md for measurements, checks and limitations. Physical Android performance and real signed-in Google Drive transfers remain unverified; automated tests use Edge and simulated transport.
