# Mind-Map (Silverlight)

Silverlight Archives is an offline-first visual workspace for Windows and Android, with rich notes, nested Boards, image regions, Google Drive live sync and automatic update checks.

## Download

[Latest Windows release](https://github.com/cosmerearchives-creator/Mind-Map/releases/latest)

[Existing Android 0.10.1 APK](https://github.com/cosmerearchives-creator/Mind-Map/releases/download/v0.10.1/Silverlight.apk)

Desktop development is the current focus. Mobile-specific fixes and new APK releases are paused; existing Android installations retain access and Google Drive compatibility. See [development focus](docs/development-focus.md).

## Update behavior

Windows checks published releases for a newer **Silverlight-Setup.exe**. Android checks the latest release for **Silverlight.apk** and skips releases without an APK. Existing Android installations therefore continue running without being offered desktop-only releases.

**Signing:** Android releases use the existing persistent release key from protected build secrets. The workflow verifies its certificate identity before packaging. Current signed releases support in-place updates; an installation made with a different historical key cannot be made compatible by changing the new key. Keep app data and backups intact.

## Development

Changes pushed to `main` trigger the Windows validation and installer build. The release workflow publishes the active platforms from `release-version.json` only after their exact-main builds succeed. Android builds are manual while mobile development is paused. Shared application source is in `app/src/main/assets/`.

Android application ID remains `com.cosmerearchives.silverlight` to preserve package identity.
