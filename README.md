# Mind-Map (Silverlight)

Silverlight Archives is an offline-first visual workspace for Windows and Android, with rich notes, nested Boards, image regions, Google Drive live sync and automatic update checks.

## Download

[Latest Android APK release](https://github.com/cosmerearchives-creator/Mind-Map/releases/latest)

The Android APK is published as **Silverlight.apk** after a successful run of [Build and publish Mind-Map APK](https://github.com/cosmerearchives-creator/Mind-Map/actions/workflows/android-apk.yml).

## Update behavior

Silverlight checks this public repository's **latest GitHub release** on launch. When a newer version is available, it offers to download the APK and opens Android's installer after download. You must approve installation in Android.

**Signing:** Android releases use the existing persistent release key from protected build secrets. The workflow verifies its certificate identity before packaging. Current signed releases support in-place updates; an installation made with a different historical key cannot be made compatible by changing the new key. Keep app data and backups intact.

## Development

Changes pushed to `main` automatically trigger an APK build and publish a new version on GitHub Releases. Current application source is in `app/src/main/assets/index.html`.

Android application ID remains `com.cosmerearchives.silverlight` to preserve package identity.
