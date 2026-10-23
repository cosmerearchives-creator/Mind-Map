using System;
using System.IO;

namespace Silverlight.Windows;

// Every attempt owns its files; a prior installer cannot lock or overwrite the next download.
internal sealed class UpdateFiles
{
    public string DirectoryPath { get; }
    public string PartialPath => Path.Combine(DirectoryPath, "Silverlight-Setup.partial");
    public string InstallerPath => Path.Combine(DirectoryPath, "Silverlight-Setup.exe");
    private UpdateFiles(string directory) { DirectoryPath = directory; }

    public static UpdateFiles Create(params string[] roots)
    {
        Exception? last = null;
        foreach (string root in roots)
        {
            string directory = Path.Combine(root, Guid.NewGuid().ToString("N"));
            try
            {
                Directory.CreateDirectory(directory);
                var files = new UpdateFiles(directory);
                using var probe = new FileStream(files.PartialPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                return files;
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException)
            {
                last = error;
            }
        }
        throw new IOException("No writable update folder was available.", last);
    }

    public void Complete(long? expectedLength)
    {
        using (var file = File.OpenRead(PartialPath))
        {
            if (file.Length < 100 * 1024 || (expectedLength.HasValue && file.Length != expectedLength.Value))
                throw new IOException("The installer download is incomplete. Please try again.");
            if (file.ReadByte() != 'M' || file.ReadByte() != 'Z')
                throw new IOException("The download is not a Windows executable.");
        }
        File.Move(PartialPath, InstallerPath); // No overwrite of a possibly running installer.
    }

    public void DeletePartial() { try { File.Delete(PartialPath); } catch (IOException) { } catch (UnauthorizedAccessException) { } }
}
