using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Silverlight.Windows;

static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
static JsonElement Request(string op) => JsonSerializer.SerializeToElement(new { op, silent = true });
static bool Connected(object result) => JsonSerializer.SerializeToElement(result).GetProperty("connected").GetBoolean();
var folder = Path.Combine(Path.GetTempPath(), "silverlight-auth-test-" + Guid.NewGuid());
Directory.CreateDirectory(folder);
var config = Path.Combine(folder, "public-client.json");
const string clientId = "123456-test.apps.googleusercontent.com";
await File.WriteAllTextAsync(config, JsonSerializer.Serialize(new { client_id = clientId }));
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
 await File.WriteAllTextAsync(Path.Combine(folder,"google-desktop-oauth.json"), JsonSerializer.Serialize(new { installed = new { client_id = clientId, client_secret = "must-never-be-sent" } }));
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
 Console.WriteLine("PASS: browser PKCE/loopback, state rejection, public-client-only exchange, DPAPI, restart refresh and rotation, local sign-out, legacy config, revoked grant and scope rejection.");
} finally { Directory.Delete(folder, true); }

sealed class FakeGoogle : HttpMessageHandler {
 public string Challenge = "";
 public bool Revoked, BadScope;
 protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation) {
  if (request.RequestUri!.Host == "oauth2.googleapis.com") {
   var form = System.Web.HttpUtility.ParseQueryString(await request.Content!.ReadAsStringAsync(cancellation));
   if (form["client_secret"] != null) throw new Exception("Client secret transmitted");
   bool refresh = form["grant_type"] == "refresh_token";
   if (!refresh) {
    var challenge = Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(form["code_verifier"]!))).TrimEnd('=').Replace('+','-').Replace('/','_');
    if (challenge != Challenge) throw new Exception("PKCE verifier mismatch");
   }
   if (Revoked) return new(HttpStatusCode.BadRequest) { Content = new StringContent("{\"error\":\"invalid_grant\"}") };
   return new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { access_token = "fake-access", expires_in = 3600, refresh_token = refresh ? "refresh-two" : "refresh-one", scope = BadScope ? "openid" : "https://www.googleapis.com/auth/drive.appdata" })) };
  }
  if (request.RequestUri.Host != "www.googleapis.com" || request.Headers.Authorization?.Parameter != "fake-access") throw new Exception("Unexpected request");
  return new(HttpStatusCode.OK) { Content = new StringContent("{\"user\":{\"permissionId\":\"test-account\"}}") };
 }
}
