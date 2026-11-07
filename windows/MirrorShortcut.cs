namespace Silverlight.Windows;

internal static class MirrorShortcut
{
    internal static bool Matches(uint key, bool control, bool shift, bool alt, bool keyDown) =>
        keyDown && key == 0x43 && control && shift && !alt;
}
