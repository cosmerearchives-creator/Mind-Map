# Silverlight Archives — smoother workspace controls

- Resize the card editor on computers and in landscape using its corner grip. The solid Delete/Cancel/Save footer stays flush with the bottom; Connect and Unlink are removed from this editor.
- Drag Collection members freely. Arranged Collections insert them at the dropped position, shifting other members. Drag outside to detach, or onto another Collection to transfer, preserving content and connections.
- Bottom-left actions are grouped under Board actions. Canvas panning no longer selects interface labels.
- Dismiss canvas tips with ×, and restore them through Windows Alt > View > Canvas tips or Board actions > Show canvas tips.
- Edit Canvas adds Hand, middle-mouse dragging, and two-finger panning. Drawing strokes remain anchored to the Board; Finish includes strokes moved off-screen.
- Windows update downloads use unique writable folders and no longer overwrite an earlier installer. Failed updates identify the stage and save diagnostics; completed downloads remain available if launch fails.

The original access-denied screenshot does not identify its exact cause. This release removes a shared-file collision risk and improves diagnosis, but external Windows permission/security restrictions still require device investigation if the error persists. Manually installing this release once may be necessary to replace the older updater.

Existing Board content, connections and Drive sync formats are preserved. Install over the existing application. Validation includes snapshot/merge suites, two-device sync/restore regressions, desktop/mobile editing and clipboard checks, Collection transfers, footer/resizing, nonselecting panning and drawing navigation. The Windows release workflow runs updater file-handling tests before packaging. Physical-device rotation, native menu behavior and actual updater installation remain for device verification.

See docs/workspace-interactions.md for details and drawing export limits.
