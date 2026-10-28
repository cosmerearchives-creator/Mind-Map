# Desktop development focus

Windows is the active feature and bug-fix target. Mobile-specific development and automatic APK releases are paused until the project explicitly returns to phone development.

Existing Android 0.10.1 installations remain supported for access to their workspace and Google Drive synchronization. Preserve the application identity, cloud protocols, stored records and original assets. Do not block older clients or introduce incompatible data requirements as a side effect of desktop work. Defer mobile-specific issues to the future mobile phase.

`release-version.json` lists the active release platforms. Current releases contain the Windows installer only; the Android version and versionCode remain at their last published values. The Android workflow is available by manual dispatch, but is not run on pushes. The coordinated release workflow still requires a successful build of each active platform from the exact current main commit.

The last supported Android installer is available at https://github.com/cosmerearchives-creator/Mind-Map/releases/download/v0.10.1/Silverlight.apk. Windows-only latest releases omit an APK, so existing Android updaters do not offer a desktop-only update.
