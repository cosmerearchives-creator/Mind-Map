using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Silverlight.Windows;

static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
static JsonElement Request(string op) => JsonSerializer.SerializeToElement(new { op, silent = true });
static bool Connected(object result) => JsonSerializer.SerializeToElement(result).GetProperty("connected").GetBoolean();
if (args.Length == 3 && args[0] == "--real-google") {
 var isolated = Path.Combine(Path.GetTempPath(), "silverlight-real-auth-test-" + Guid.NewGuid());
 Directory.CreateDirectory(isolated);
 try {
  string account;
  using (var drive = new DriveSync(dataFolder: isolated, openBrowser: url => File.WriteAllText(args[2], url), clientConfig: Path.GetFullPath(args[1]))) {
   var result = JsonSerializer.SerializeToElement(await drive.ExecuteAsync(Request("connect"), null!));
   Check(result.GetProperty("connected").GetBoolean(), "Real Google sign-in failed");
   account = result.GetProperty("accountId").GetString()!;
  }
  using (var restarted = new DriveSync(dataFolder: isolated, openBrowser: _ => throw new Exception("Restart required consent"), clientConfig: Path.GetFullPath(args[1]))) {
   var result = JsonSerializer.SerializeToElement(await restarted.ExecuteAsync(Request("session"), null!));
   Check(result.GetProperty("connected").GetBoolean() && result.GetProperty("accountId").GetString() == account, "Real restart/refresh changed account");
   await restarted.ExecuteAsync(Request("disconnect"), null!);
   Check(!Connected(await restarted.ExecuteAsync(Request("session"), null!)), "Real local sign-out failed");
  }
  Console.WriteLine("PASS: real Google browser/loopback/PKCE sign-in, isolated DPAPI session, restart refresh with same account, and local sign-out. No BOARD data was read or uploaded.");
 } finally { Directory.Delete(isolated, true); }
 return;
}
var folder = Path.Combine(Path.GetTempPath(), "silverlight-auth-test-" + Guid.NewGuid());
Directory.CreateDirectory(folder);
var config = Path.Combine(folder, "public-client.json");
const string clientId = "123456-test.apps.googleusercontent.com";
await File.WriteAllTextAsync(config, JsonSerializer.Serialize(new { client_id = clientId, desktop_client_value = "test-public-desktop-value" }));
var transport = new FakeGoogle();
Task? callback = null;
void Browser(string url) {
 var query = System.Web.HttpUtility.ParseQueryString(new Uri(url).Query);
 Check(query["client_id"] == clientId && query["code_challenge_method"] == "S256", "Public client and PKCE required");
 Check(query["scope"] == "https://www.googleapis.com/auth/drive.appdata", "Least privilege scope");
 transport.Challenge = query["code_challenge"]!;
 callback = Task.Run(async () => {
  using var client = new HttpClient();
  var redirect = query["redirect_uri"]!;
  Check(new Uri(redirect).Host == "127.0.0.1", "Loopback only");
  using var wrong = await client.GetAsync(redirect + "?state=wrong&code=bad");
  Check(wrong.StatusCode == HttpStatusCode.BadRequest, "Wrong state rejected");
  using var right = await client.GetAsync(redirect + "?state=" + query["state"] + "&code=test-code");
  Check(right.IsSuccessStatusCode, "Correct state accepted");
 });
}
// Tests use only disposable data and fake HTTPS responses; no real Google account or app files.
try {
 using (var drive = new DriveSync(transport, folder, Browser, config)) {
  Check(!Connected(await drive.ExecuteAsync(Request("session"), null!)), "Fresh PC has no session");
  Check(Connected(await drive.ExecuteAsync(Request("connect"), null!)), "Browser authorization succeeds");
  await callback!;
 }
 var session = Path.Combine(folder, "google-drive-session.bin");
 var encrypted = await File.ReadAllBytesAsync(session);
 Check(!Encoding.UTF8.GetString(encrypted).Contains("refresh-one"), "Refresh token must not be plaintext");
 var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
 Check(Encoding.UTF8.GetString(decrypted).Contains("refresh-one"), "Current Windows user can decrypt");
 CryptographicOperations.ZeroMemory(decrypted);
 using (var drive = new DriveSync(new FakeGoogle(), folder, _ => throw new Exception("Silent refresh opened browser"), config)) {
  Check(Connected(await drive.ExecuteAsync(Request("session"), null!)), "Restart refreshes automatically");
  var rotated = ProtectedData.Unprotect(await File.ReadAllBytesAsync(session), null, DataProtectionScope.CurrentUser);
  Check(Encoding.UTF8.GetString(rotated).Contains("refresh-two"), "Rotated refresh token persisted");
  CryptographicOperations.ZeroMemory(rotated);
  await drive.ExecuteAsync(Request("disconnect"), null!);
  Check(!File.Exists(session), "Sign out forgets credential");
  Check(File.Exists(config), "Sign out preserves config");
  Check(!Connected(await drive.ExecuteAsync(Request("session"), null!)), "Sign out remains disconnected");
 }
 // Existing installations can still read their original desktop configuration and encrypted cache.
 await File.WriteAllTextAsync(Path.Combine(folder,"google-desktop-oauth.json"), JsonSerializer.Serialize(new { installed = new { client_id = clientId, client_secret = "test-public-desktop-value" } }));
 await File.WriteAllBytesAsync(session, encrypted);
 using (var drive = new DriveSync(new FakeGoogle(), folder, _ => throw new Exception("Unexpected consent"), Path.Combine(folder,"absent.json")))
  Check(Connected(await drive.ExecuteAsync(Request("session"), null!)), "Legacy encrypted session and client remain usable");
 await File.WriteAllBytesAsync(session, encrypted);
 using (var drive = new DriveSync(new FakeGoogle { Revoked = true }, folder, _ => throw new Exception("Unexpected consent"), config))
  Check(!Connected(await drive.ExecuteAsync(Request("session"), null!)), "Revoked refresh requires reconnect without browser popups");
 Check(File.Exists(session), "Revocation does not destructively remove cached data");
 using (var drive = new DriveSync(new FakeGoogle { BadScope = true }, folder, _ => {}, config)) {
  try { await drive.ExecuteAsync(Request("session"), null!); throw new Exception("Missing Drive scope accepted"); }
  catch (InvalidOperationException e) when (e.Message.Contains("scope")) { }
 }
 // Cleanup uses fake app-data files only; no real Drive requests occur.
 foreach (var mode in new[] { "valid", "part", "manual", "foreign", "young", "wrong-revision" }) {
  await File.WriteAllBytesAsync(session, encrypted);
  var fake = new FakeGoogle { RetentionMode = mode };
  using var cleanupDrive = new DriveSync(fake, folder, _ => throw new Exception("Unexpected consent"), config);
  await cleanupDrive.ExecuteAsync(Request("list"), null!);
  var prune = JsonSerializer.SerializeToElement(new { op="prune", silent=true, fileId="old", replacementId="new", dataset="d", device="pc", revision="replacement" });
  try { await cleanupDrive.ExecuteAsync(prune, null!); Check(mode=="valid", "Unsafe cleanup accepted: "+mode); }
  catch (InvalidOperationException) { Check(mode!="valid", "Valid cleanup refused"); }
  Check(fake.Deletions==(mode=="valid"?1:0), "Cleanup deletion guard: "+mode);
 }
 await File.WriteAllBytesAsync(session, encrypted);
 var partTransport = new FakeGoogle { PartTransfers = true };
 using (var partsDrive = new DriveSync(partTransport, folder, _ => throw new Exception("Unexpected consent"), config)) {
  var info = JsonSerializer.SerializeToElement(await partsDrive.ExecuteAsync(Request("session"), null!));
  Check(info.GetProperty("features").EnumerateArray().Any(x=>x.GetString()=="fast-transfer-v3"), "Fast-transfer capability missing");
  var part = JsonSerializer.Serialize(new { format="silverlight-part-v2", workspace=new { boards=Array.Empty<object>() }, revision=new string('a',64), data="part" });
  var batch = JsonSerializer.SerializeToElement(new { op="batch", silent=true, expectedAccount="test-account", requests=Enumerable.Range(0,3).Select(_=>new { op="upload", snapshot=part }).ToArray() });
  var result = JsonSerializer.SerializeToElement(await partsDrive.ExecuteAsync(batch, null!));
  Check(result.GetProperty("results").GetArrayLength()==3 && result.GetProperty("results").EnumerateArray().All(x=>x.GetProperty("error").ValueKind==JsonValueKind.Null), "Batch parts failed");
  Check(partTransport.MaxActive>1 && partTransport.MaxActive<=3 && partTransport.PartUploads==3, "Native transfer concurrency must be bounded to three");
  var bad = JsonSerializer.SerializeToElement(new { op="batch", silent=true, expectedAccount="test-account", requests=new[]{new { op="upload", snapshot="{\"format\":\"silverlight-snapshot-v1\"}" }} });
  var refused = JsonSerializer.SerializeToElement(await partsDrive.ExecuteAsync(bad, null!));
  Check(refused.GetProperty("results")[0].GetProperty("error").ValueKind==JsonValueKind.String && partTransport.PartUploads==3, "Batch must refuse non-part uploads");
 }
 await File.WriteAllBytesAsync(session, encrypted);
 var changeTransport=new FakeGoogle { Changes=true };
 using(var changesDrive=new DriveSync(changeTransport,folder,_=>throw new Exception("Unexpected consent"),config)) {
  var begin=JsonSerializer.SerializeToElement(await changesDrive.ExecuteAsync(JsonSerializer.SerializeToElement(new {op="changes",dataset="d",expectedAccount="test-account"}),null!));
  Check(begin.GetProperty("bootstrap").GetBoolean()&&begin.GetProperty("cursor").GetString()=="first", "Journal cursor bootstrap");
  var update=JsonSerializer.SerializeToElement(await changesDrive.ExecuteAsync(JsonSerializer.SerializeToElement(new {op="changes",dataset="d",pageToken="first",expectedAccount="test-account"}),null!));
  Check(update.GetProperty("files").GetArrayLength()==1&&update.GetProperty("files")[0].GetProperty("id").GetString()=="changed"&&update.GetProperty("cursor").GetString()=="second", "Journal excludes foreign, removed and part files");
  await changesDrive.ExecuteAsync(JsonSerializer.SerializeToElement(new {op="download",fileId="changed",expectedAccount="test-account"}),null!);
  Check(changeTransport.ChangeReads==2,"Journal does not enumerate snapshot files");
 }
 Console.WriteLine("PASS: changes cursor bootstrap, filtering and download authorization without snapshot enumeration.");
 Console.WriteLine("PASS: bounded native parallel parts, capability reporting and non-part batch rejection.");
 Console.WriteLine("PASS: native cleanup refuses parts/manual/foreign/recent copies and mismatched replacements.");
 Console.WriteLine("PASS: browser PKCE/loopback, state rejection, installed-app public configuration, DPAPI, restart refresh and rotation, local sign-out, legacy config, revoked grant and scope rejection.");
} finally { Directory.Delete(folder, true); }

sealed class FakeGoogle : HttpMessageHandler {
 public string Challenge = "";
 public string? RetentionMode; public int Deletions;
 public bool Revoked, BadScope, PartTransfers, Changes; public int ChangeReads;
 public int PartUploads, MaxActive; private int active;
 protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation) {
  if (request.RequestUri!.Host == "oauth2.googleapis.com") {
   var form = System.Web.HttpUtility.ParseQueryString(await request.Content!.ReadAsStringAsync(cancellation));
   if (form["client_secret"] != "test-public-desktop-value") throw new Exception("Desktop public client value missing or incorrect");
   bool refresh = form["grant_type"] == "refresh_token";
   if (!refresh) {
    var challenge = Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(form["code_verifier"]!))).TrimEnd('=').Replace('+','-').Replace('/','_');
    if (challenge != Challenge) throw new Exception("PKCE verifier mismatch");
   }
   if (Revoked) return new(HttpStatusCode.BadRequest) { Content = new StringContent("{\"error\":\"invalid_grant\"}") };
   return new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { access_token = "fake-access", expires_in = 3600, refresh_token = refresh ? "refresh-two" : "refresh-one", scope = BadScope ? "openid" : "https://www.googleapis.com/auth/drive.appdata" })) };
  }
  if (request.RequestUri.Host != "www.googleapis.com" || request.Headers.Authorization?.Parameter != "fake-access") throw new Exception("Unexpected request");
  if(Changes&&request.RequestUri.AbsolutePath.StartsWith("/drive/v3/changes")) {
   ChangeReads++;
   var content=request.RequestUri.AbsolutePath.EndsWith("startPageToken")?"{\"startPageToken\":\"first\"}":JsonSerializer.Serialize(new {newStartPageToken="second",changes=new object[]{new {file=new {id="changed",appProperties=new {silverlightSnapshot="1",protocol="auto-v1",dataset="d"}}},new {removed=true,file=new {id="removed",appProperties=new {silverlightSnapshot="1",protocol="auto-v1",dataset="d"}}},new {file=new {id="foreign",appProperties=new {silverlightSnapshot="1",protocol="auto-v1",dataset="other"}}},new {file=new {id="part",appProperties=new {silverlightSnapshot="1",protocol="part-v2",dataset="d"}}}}});
   return new(HttpStatusCode.OK){Content=new StringContent(content)};
  }
  if (PartTransfers && request.Method==HttpMethod.Post && request.RequestUri.AbsolutePath=="/upload/drive/v3/files") {
   int current=Interlocked.Increment(ref active); MaxActive=Math.Max(MaxActive,current); int id=Interlocked.Increment(ref PartUploads);
   await Task.Delay(30,cancellation); Interlocked.Decrement(ref active);
   return new(HttpStatusCode.OK) { Content=new StringContent("{\"id\":\"part"+id+"\"}") };
  }
  if (RetentionMode is not null && request.RequestUri.AbsolutePath.Contains("/files")) {
   string content;
   if (request.Method == HttpMethod.Delete) { Deletions++; return new(HttpStatusCode.NoContent) { Content = new StringContent("") }; }
   bool old = request.RequestUri.AbsolutePath.EndsWith("/old");
   if (request.RequestUri.AbsolutePath.EndsWith("/files")) content = "{\"files\":[{\"id\":\"old\"},{\"id\":\"new\"}]}";
   else content = JsonSerializer.Serialize(new { spaces=new[]{"appDataFolder"}, createdTime=DateTimeOffset.UtcNow.AddDays(old&&RetentionMode!="young"?-45:0).ToString("o"), appProperties=new { silverlightSnapshot="1", protocol=old&&RetentionMode=="part"?"part-v2":old&&RetentionMode=="manual"?"manual-v1":"auto-v1", dataset=old&&RetentionMode=="foreign"?"other":"d", device="pc", revision=RetentionMode=="wrong-revision"?"wrong":"replacement" } });
   return new(HttpStatusCode.OK) { Content = new StringContent(content) };
  }
  return new(HttpStatusCode.OK) { Content = new StringContent("{\"user\":{\"permissionId\":\"test-account\"}}") };
 }
}
