# Silverlight Archives — Milanote collection photo correction

- Recover copied Board photo thumbnails from Milanote's media.milanote.com/p/resized/ CDN in Windows and Android, in addition to existing app.milanote.com/media/p/ images. HTTPS, exact host/path checks, no credentials or redirects, supported image types and existing download limits still apply.
- Read icon colors from the inner board-icon-content tile rather than its uncolored outer BoardIcon container.
- Verified the actual copied marketplace selection in isolated browser storage: three Collections, ten nested Boards, three downloaded photo thumbnails and seven correctly colored icon tiles. All artwork survived commit and reload. Personal clipboard data remains local and is not distributed.
- Re-paste the Collections after installing to recover artwork an earlier import did not retain.

Shared validation and browser clipboard regression checks passed. Native release workflows validate the Windows media downloader and compile/package Windows and Android. Physical-device installation remains untested.
