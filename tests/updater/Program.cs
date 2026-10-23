using Silverlight.Windows;

ClipboardTests.Run();
await MediaTests.Run();

var root = Path.Combine(Path.GetTempPath(), "silverlight-updater-test-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
try
{
    void Check(bool value, string message) { if (!value) throw new Exception(message); }
    void Executable(UpdateFiles files) { var bytes = new byte[120000]; bytes[0] = (byte)'M'; bytes[1] = (byte)'Z'; File.WriteAllBytes(files.PartialPath, bytes); }
    var first = UpdateFiles.Create(root);
    Executable(first); first.Complete(120000);
    using (var locked = new FileStream(first.InstallerPath, FileMode.Open, FileAccess.Read, FileShare.None))
    {
        var second = UpdateFiles.Create(root); Executable(second); second.Complete(120000);
        Check(first.DirectoryPath != second.DirectoryPath && File.Exists(second.InstallerPath), "A prior locked installer must not block a retry.");
    }
    var blocked = Path.Combine(root, "not-a-directory"); File.WriteAllText(blocked, "blocked");
    var fallback = UpdateFiles.Create(blocked, Path.Combine(root, "fallback"));
    Check(fallback.DirectoryPath.StartsWith(Path.Combine(root, "fallback")), "Unwritable primary location must fall back.");
    Executable(fallback);
    try { fallback.Complete(120001); throw new Exception("Truncated content was accepted."); } catch (IOException) { }
    File.WriteAllBytes(fallback.PartialPath, new byte[120000]);
    try { fallback.Complete(120000); throw new Exception("Non-executable content was accepted."); } catch (IOException) { }
    fallback.DeletePartial(); Check(!File.Exists(fallback.PartialPath), "Failed partial download was not removed.");
    var collision = UpdateFiles.Create(root); Executable(collision); File.WriteAllText(collision.InstallerPath, "keep previous");
    try { collision.Complete(120000); throw new Exception("Existing installer was overwritten."); } catch (IOException) { }
    Check(File.ReadAllText(collision.InstallerPath) == "keep previous", "Existing installer changed.");
    Console.WriteLine("PASS: unique updater attempts, locked prior installer, writable-folder fallback, length/executable validation, no overwrite and partial cleanup.");
}
finally { Directory.Delete(root, true); }
