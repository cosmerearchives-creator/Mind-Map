# Mind-Map (Silverlight)

Milanote-inspired, Android-first mind-mapping workspace. Current app functionality remains Openboard v0.6; the Android shell adds release-update checks.

## Download

[Latest Android APK release](https://github.com/cosmerearchives-creator/Mind-Map/releases/latest)

The Android APK is published as **Silverlight.apk** after a successful run of [Build and publish Mind-Map APK](https://github.com/cosmerearchives-creator/Mind-Map/actions/workflows/android-apk.yml).

## Update behavior

Silverlight checks this public repository's **latest GitHub release** on launch. When a newer version is available, it offers to download the APK and opens Android's installer after download. You must approve installation in Android.

**Important:** Current releases are debug-signed. GitHub runner signatures are not guaranteed consistent between builds. Android may refuse to update an existing installation if signatures differ. Export a board backup before uninstalling. To enable reliable in-place upgrades, configure a stable signing key for future releases.

## Development

Changes pushed to `main` automatically trigger an APK build and publish a new version on GitHub Releases. Current application source is in `app/src/main/assets/index.html`.

Android application ID remains `com.cosmerearchives.silverlight` to preserve package identity.
