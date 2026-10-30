# Mind-Map (Silverlight)

Silverlight Archives is an offline-first visual workspace for Windows and Android, with rich notes, nested Boards, image regions, Google Drive live sync and automatic update checks.

## Why Silverlight exists

Silverlight is a passion project from a creator who was dissatisfied with their previous mind-map app. Code on `main` is largely AI-generated under human direction: the creator sets goals, makes decisions, and directs development. That process takes time and has costs; it is not a guarantee of error-free software.

The full offline-first core is intended to remain usable on your device. Sync, AI, and accounts are optional. The license requires no telemetry or online license verification. Optional services, external content, and update checks can make network requests; see the [privacy policy](https://cosmerearchives-creator.github.io/privacy/).

## Community license and support

[LICENSE](LICENSE) offers **Silverlight Community License — Proposed Custom Terms v0.1** for covered material now, pending legal review. This is a custom source-available license with restrictions, not OSI-approved open source or a PolyForm license.

Independent individual creators may monetize their output and keep using Silverlight free regardless of success. Independent, creator-controlled teams of at most five people at first use may qualify; the same undertaking is grandfathered as it grows while its qualifying original creators retain majority ownership and control. Acquisition does not transfer that permission. Your output remains yours to the extent you hold its rights.

Modification and free noncommercial redistribution are permitted subject to the license, notices, and source requirements. Commercial adoption by nonqualifying organizations, including large media companies, and software resale, paid hosting, or commercially supplied rebranded forks require a separate negotiated paid license. See [qualification rules, examples, and review limitations](docs/community-licensing.md). Third-party licenses and contributor rights remain separate; no completed rights audit or brand clearance is claimed.

Donations and shout-outs are welcome, entirely voluntary, and never required for access, continued use, or monetizing your creative output. No donation destination is currently listed. For support or commercial licensing, [open a GitHub issue](https://github.com/cosmerearchives-creator/Mind-Map/issues); ask for a private contact route before sharing confidential details. Issues are public. No email address or payment route is implied.

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
