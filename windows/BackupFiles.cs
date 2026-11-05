using System.Security.Cryptography;
using System.Text.Json;
namespace Silverlight.Windows;

// Only the trusted main frame can reach this bridge. One bounded write per acknowledgement.
internal sealed class BackupFiles : IDisposable
{
    private FileStream? stream;
    private string? temporary, target, token;
    public async Task<object> ExecuteAsync(JsonElement request, IWin32Window owner, Action<object>? progress = null)
    {
        string op = request.GetProperty("op").GetString() ?? "";
        if (op == "begin")
        {
            if (stream != null) throw new InvalidOperationException("A backup is already running.");
            string name = request.TryGetProperty("name", out var named) ? Path.GetFileName(named.GetString() ?? "attachment.bin") : "archives-backup.jsonl";
            foreach (char invalid in Path.GetInvalidFileNameChars()) name = name.Replace(invalid, '_');
            if (string.IsNullOrWhiteSpace(name)) name = "attachment.bin";
            if (name.Length > 200) name = name[..200];
            using var dialog = new SaveFileDialog { Filter = request.TryGetProperty("name", out _) ? "Attachment (*.*)|*.*" : "Archives backup (*.jsonl)|*.jsonl", FileName = name, OverwritePrompt = true };
            if (dialog.ShowDialog(owner) != DialogResult.OK) throw new OperationCanceledException("Backup cancelled.");
            return Begin(dialog.FileName);
        }
        if (token == null || request.GetProperty("token").GetString() != token) throw new InvalidOperationException("Backup session expired.");
        try
        {
            if (op == "write")
            {
                string data = request.GetProperty("data").GetString() ?? "";
                if (data.Length > 400000) throw new InvalidOperationException("Backup block is too large.");
                var bytes = Convert.FromBase64String(data); await stream!.WriteAsync(bytes); return new { written = bytes.Length };
            }
            if (op == "commit")
            {
                await stream!.FlushAsync(); stream.Flush(true); stream.Position = 0;
                using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);var block = new byte[65536];long fileLength=stream.Length;long total=0,lastYield=0;var tick=System.Diagnostics.Stopwatch.StartNew();progress?.Invoke(new {stage="verifying-file",bytes=0L,total=fileLength});int read;
                while((read=await stream.ReadAsync(block))!=0){sha.AppendData(block,0,read);total+=read;if(total-lastYield>=4*1024*1024){lastYield=total;if(tick.ElapsedMilliseconds>=500){progress?.Invoke(new {stage="verifying-file",bytes=total,total=fileLength});tick.Restart();}await Task.Yield();}}
                progress?.Invoke(new {stage="verifying-file",bytes=total});string digest = Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant();
                if (digest != request.GetProperty("hash").GetString()) throw new InvalidOperationException("Backup file failed verification.");
                await stream.DisposeAsync(); stream = null;
                File.Move(temporary!, target!, true); temporary = target = token = null;
                return new { verified = true };
            }
            if (op == "abort") { Dispose(); return new { cancelled = true }; }
            throw new InvalidOperationException("Unsupported backup operation.");
        }
        catch (Exception error) { bool cancelled=token==null;Dispose();if(cancelled)throw new OperationCanceledException("Backup cancelled.",error);throw; }
    }
    internal object Begin(string path)
    {
        if (stream != null) throw new InvalidOperationException("A backup is already running.");
        target = path; temporary = target + "." + Guid.NewGuid().ToString("N") + ".partial";
        stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 65536, true);
        token = Guid.NewGuid().ToString("N"); return new { token };
    }
    public void Dispose()
    {
        stream?.Dispose(); stream = null;
        if (temporary != null) { try { File.Delete(temporary); } catch { } }
        temporary = target = token = null;
    }
}
