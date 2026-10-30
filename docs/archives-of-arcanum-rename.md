# Archives of Arcanum rename

On October 30, 2026, Silverlight became **Archives of Arcanum**. This is the same project, source repository, and community-license grant. Initial team qualification and grandfathering dates do not reset. Version 0.13.5 carries the Windows branding update.

Visible branding changes include the app header, window title, menus, default welcome content, messages, installer, shortcuts, Android source label, and website. The existing tower artwork has no lettering and is retained. Existing user-created titles and content are not rewritten, including previously generated welcome Boards and template catalogs.

## Compatibility identities

These legacy identifiers intentionally remain implementation details, not the public product name:

- Android package `com.cosmerearchives.silverlight`, signing keys, version 0.10.1 and its existing download while mobile builds remain paused.
- Windows installer AppId `{7D487C7E-2B7D-4F1A-AF1F-64A21437DE76}`, installation directory, executable `Silverlight.exe`, and `%LOCALAPPDATA%/Silverlight` data, credentials, and WebView profile.
- WebView origin `https://silverlight.local`, IndexedDB database `openboard-workspace`, local storage keys, JavaScript/native bridge names, serialized formats, clipboard types, and Google Drive properties/protocols.
- Source repository `cosmerearchives-creator/Mind-Map`, existing release URLs, workflow artifact names, and build-secret names.

The Windows release supplies both `Archives-of-Arcanum-Setup.exe` and an identical `Silverlight-Setup.exe` alias. Existing updaters require the alias. The renamed app accepts both, preferring the new name. Its local downloaded installer uses the new name. The installer retains its upgrade identity and replaces the old named Start-menu shortcut with the new one; desktop shortcuts remain opt-in.

## Website and external settings

The canonical app page is <https://cosmerearchives-creator.github.io/apps/archives-of-arcanum/>. The legacy `/apps/silverlight/` page stays available with equivalent content and a canonical link, so existing links and Google OAuth homepage settings continue working.

Google Cloud project/consent-screen display names and registered OAuth URLs are external settings; this repository update does not change them. They may still display Silverlight. Update their branding separately without replacing the OAuth clients, scopes, package/signing identity, or Drive app-data connection. No new account, cloud workspace, or user-data migration is required by this rename. Historical release notes and immutable release assets can retain the former name.

No trademark clearance or registration is asserted by adopting the new name.
