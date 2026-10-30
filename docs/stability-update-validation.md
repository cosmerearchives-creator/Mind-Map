# Archives of Arcanum 0.10.1 validation

The official release uses main, tag v0.10.1, Windows version 0.10.1 and Android versionCode 1000001. Android derives candidate codes as major × 10000000 + minor × 100000 + patch. Both installers must come from successful builds of the same main commit before the coordinated workflow publishes latest.

Fault injection covers worker timeout with concurrent jobs, termination, ignored late messages, cache invalidation and image resend, crash recovery and postMessage failure. Browser tests dispatch a real worker error while a draft is open and verify a fresh worker handles the next request.

Local persistence tests fail two writes, edit again while a retry is pending, and verify that the latest text is durably saved and the unsaved warning disappears. Desktop and Android-sized touch contexts also exercise popup draft suspension and tab-close protection. Pending local saves warn on browser exit and native Android Back.

The existing core and browser suites exercise backups, original images, large workspaces, lazy storage, offline edits, simulated two-device Drive synchronization, conflicts, recovery checkpoints, draft-safe incoming changes and reload. Native Windows updater/authentication tests and signed Android packaging run in GitHub Actions; the local machine has no .NET SDK.

These checks do not certify installation on a physical Android device or timing against a live Google Drive account. No project data, storage schema, Google account configuration, sync protocol or signing identity is migrated by this patch.
