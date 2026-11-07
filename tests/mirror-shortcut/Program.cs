using Silverlight.Windows;

if (!MirrorShortcut.Matches(0x43, true, true, false, true)) throw new Exception("Ctrl+Shift+C must reach the workspace.");
foreach (var keys in new[] {
    (0x43u, true, false, false, true), // Ordinary Copy.
    (0x43u, false, true, false, true),
    (0x43u, true, true, true, true),
    (0x56u, true, true, false, true),
    (0x43u, true, true, false, false)
}) if (MirrorShortcut.Matches(keys.Item1, keys.Item2, keys.Item3, keys.Item4, keys.Item5))
    throw new Exception("Unrelated key chords and key-up must retain their existing behavior.");
Console.WriteLine("PASS: native mirror shortcut matches only Ctrl+Shift+C key-down; ordinary Copy and other keys remain unchanged.");
