using Silverlight.Windows;
using System.Text.Json;
using System.Security.Cryptography;
var directory = Path.Combine(Path.GetTempPath(), "arcanum-native-backup-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(directory);
try {
    var target = Path.Combine(directory,"backup.jsonl");File.WriteAllText(target,"previous verified backup");
    string Token(object value) => JsonSerializer.SerializeToElement(value).GetProperty("token").GetString()!;
    async Task<object> Send(BackupFiles file,object value) => await file.ExecuteAsync(JsonSerializer.SerializeToElement(value),null!);
    using(var file=new BackupFiles()) { var token=Token(file.Begin(target));await Send(file,new {op="write",token,data=Convert.ToBase64String(new byte[65536])});try { await Send(file,new {op="commit",token,hash=new string('0',64)});throw new Exception("Corruption accepted"); } catch(InvalidOperationException) {}if(File.ReadAllText(target)!="previous verified backup")throw new Exception("Prior backup replaced on failure"); }
    using(var file=new BackupFiles()) { var token=Token(file.Begin(target));await Send(file,new {op="write",token,data=Convert.ToBase64String(new byte[65536])}); }
    if(Directory.GetFiles(directory,"*.partial").Length!=0)throw new Exception("Interrupted output retained");
    using(var file=new BackupFiles()) { var token=Token(file.Begin(target));using var hash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);var bytes=new byte[65536];Random.Shared.NextBytes(bytes);for(int i=0;i<1024;i++){hash.AppendData(bytes);await Send(file,new {op="write",token,data=Convert.ToBase64String(bytes)});}var result=JsonSerializer.SerializeToElement(await Send(file,new {op="commit",token,hash=Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant()}));if(!result.GetProperty("verified").GetBoolean()||new FileInfo(target).Length!=64L*1024*1024)throw new Exception("Wrong backup output"); }
    Console.WriteLine("PASS: Windows bounded 64 MiB disk write, read-back SHA verification, atomic replacement, corrupt-output rollback and interrupted-file cleanup.");
} finally { if(!Path.GetFileName(directory).StartsWith("arcanum-native-backup-"))throw new Exception("Unsafe cleanup");Directory.Delete(directory,true); }
