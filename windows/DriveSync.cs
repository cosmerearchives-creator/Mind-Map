using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Silverlight.Windows;

// Fixed Drive operations only. OAuth uses system browser, loopback, state and PKCE.
// Access tokens stay in memory. Refresh credentials use Windows user-bound DPAPI, never HTML or exports.
internal sealed class DriveSync : IDisposable
{
    private const int Limit = 256 * 1024 * 1024;
    private const string Api = "https://www.googleapis.com/drive/v3/files";
    private const string Scope = "https://www.googleapis.com/auth/drive.appdata";
    private readonly HttpClient http;
    private readonly Action<string> openBrowser;
    private readonly string dataFolder;
    private readonly string clientConfig;
    internal DriveSync(HttpMessageHandler? transport = null, string? dataFolder = null, Action<string>? openBrowser = null, string? clientConfig = null)
    {
        http = new HttpClient(transport ?? new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromMinutes(3) };
        this.dataFolder = dataFolder ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Silverlight");
        this.clientConfig = clientConfig ?? Path.Combine(AppContext.BaseDirectory, "google-oauth-client.json");
        this.openBrowser = openBrowser ?? (url => Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }));
    }
    private readonly HashSet<string> listed = new();
    private readonly CancellationTokenSource lifetime = new();
    private string? token;
    private DateTime expires;
    private bool busy;
    private string DataFolder => dataFolder;
    private string RefreshFile => Path.Combine(DataFolder, "google-drive-session.bin");

    public async Task<object> ExecuteAsync(JsonElement request, IWin32Window owner)
    {
        if (busy) throw new InvalidOperationException("Another Drive request is still running.");
        busy = true;
        try
        {
            string op = request.GetProperty("op").GetString() ?? "";
            if (op is not ("disconnect" or "connect" or "session" or "list" or "upload" or "download")) throw new InvalidOperationException("Unsupported Drive operation.");
            if (op == "disconnect") {
                // Forget this machine only. Never revoke other devices or touch workspace storage.
                if (File.Exists(RefreshFile)) File.Delete(RefreshFile);
                if (File.Exists(RefreshFile + ".tmp")) File.Delete(RefreshFile + ".tmp");
                token = null; expires = default; listed.Clear();
                return new { connected = false };
            }
            if (op == "connect") await AuthorizeAsync(owner);
            else if (token is null || DateTime.UtcNow >= expires) {
                if (!await RefreshAsync()) {
                    if (op == "session") return new { connected = false };
                    if (request.TryGetProperty("silent", out var silent) && silent.GetBoolean()) throw new InvalidOperationException("Google sign-in required. Open the cloud menu and Connect Google.");
                    await AuthorizeAsync(owner);
                }
            }
            using var accountDocument = JsonDocument.Parse(await SendAsync(HttpMethod.Get, "https://www.googleapis.com/drive/v3/about?fields=user(permissionId)"));
            string accountId = accountDocument.RootElement.GetProperty("user").GetProperty("permissionId").GetString() ?? throw new InvalidOperationException("Google account could not be identified.");
            if (request.TryGetProperty("expectedAccount", out var expectedAccount) && expectedAccount.GetString() != accountId) throw new InvalidOperationException("Google account changed. Reconnect the original account before syncing.");
            if (op is "connect" or "session") return new { platform = "Windows", connected = true, accountId };
            if (op == "list")
            {
                string page = request.TryGetProperty("pageToken", out var p) ? p.GetString() ?? "" : "";
                if (page.Length == 0) listed.Clear();
                var query = "trashed = false and appProperties has { key='silverlightSnapshot' and value='1' }";
                if (request.TryGetProperty("dataset", out var datasetElement)) {
                    var dataset = datasetElement.GetString() ?? "";
                    if (!System.Text.RegularExpressions.Regex.IsMatch(dataset, @"\A[A-Za-z0-9_-]{1,300}\z")) throw new InvalidOperationException("Invalid sync workspace ID.");
                    query += " and appProperties has { key='protocol' and value='auto-v1' } and appProperties has { key='dataset' and value='" + dataset + "' }";
                    if (request.TryGetProperty("after", out var afterElement)) {
                        var after = afterElement.GetString() ?? "";
                        if (!System.Text.RegularExpressions.Regex.IsMatch(after, @"\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\z") || !DateTimeOffset.TryParse(after, out _)) throw new InvalidOperationException("Invalid sync poll cursor.");
                        query += " and createdTime >= '" + after + "'";
                    }
                }
                var result = JsonNode.Parse(await SendAsync(HttpMethod.Get, Api + "?spaces=appDataFolder&pageSize=100&fields=" + Uri.EscapeDataString("files(id,name,createdTime,appProperties),nextPageToken") + "&q=" + Uri.EscapeDataString(query) + (page.Length == 0 ? "" : "&pageToken=" + Uri.EscapeDataString(page))))!.AsObject();
                result["files"] ??= new JsonArray();
                foreach (var file in result["files"]!.AsArray()) listed.Add(file!["id"]!.GetValue<string>());
                return result;
            }
            if (op == "download")
            {
                string id = request.GetProperty("fileId").GetString() ?? "";
                if (!listed.Contains(id) || !System.Text.RegularExpressions.Regex.IsMatch(id, @"\A[A-Za-z0-9_-]+\z")) throw new InvalidOperationException("Choose a snapshot from View cloud copies first.");
                return new { snapshot = await SendAsync(HttpMethod.Get, Api + "/" + id + "?alt=media") };
            }
            string snapshot = request.GetProperty("snapshot").GetString() ?? "";
            if (Encoding.UTF8.GetByteCount(snapshot) > Limit) throw new InvalidOperationException("A single transfer request exceeds 256 MB. Update both devices to use multipart transfers.");
            using var document = JsonDocument.Parse(snapshot);
            var root = document.RootElement;
            if (root.GetProperty("format").GetString() is not ("silverlight-snapshot-v1" or "silverlight-auto-v1" or "silverlight-transfer-v2" or "silverlight-part-v2")) throw new InvalidOperationException("Invalid snapshot format.");
            bool part = root.GetProperty("format").GetString() == "silverlight-part-v2";
            bool automatic = root.GetProperty("format").GetString() == "silverlight-auto-v1" || (root.TryGetProperty("originalFormat", out var original) && original.GetString() == "silverlight-auto-v1");
            var metadata = new {
                name = "silverlight-snapshot-" + Guid.NewGuid() + ".json",
                parents = new[] { "appDataFolder" },
                appProperties = new { silverlightSnapshot = "1", platform = "Windows", boards = root.GetProperty("workspace").GetProperty("boards").GetArrayLength().ToString(), revision = root.GetProperty("revision").GetString(), protocol = part ? "part-v2" : automatic ? "auto-v1" : "manual-v1", dataset = automatic ? root.GetProperty("auto").GetProperty("dataset").GetString() : "" }
            };
            using var body = new MultipartContent("related", "silverlight_" + Guid.NewGuid().ToString("N"));
            body.Add(new StringContent(JsonSerializer.Serialize(metadata), Encoding.UTF8, "application/json"));
            body.Add(new StringContent(snapshot, Encoding.UTF8, "application/json"));
            return JsonNode.Parse(await SendAsync(HttpMethod.Post, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", body))!;
        }
        finally { busy = false; }
    }

    private async Task<string> SendAsync(HttpMethod method, string url, HttpContent? body = null)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);
        deadline.CancelAfter(TimeSpan.FromMinutes(3));
        using var message = new HttpRequestMessage(method, url) { Content = body };
        message.Headers.Authorization = new("Bearer", token);
        using var response = await http.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
        if (response.StatusCode == HttpStatusCode.Unauthorized) { token = null; throw new InvalidOperationException("Google session expired. Connect Google and retry."); }
        if (response.StatusCode == HttpStatusCode.Forbidden) throw new InvalidOperationException("Google Drive access was refused. Check Drive API, consent test users, scope and available storage.");
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Google Drive returned HTTP " + (int)response.StatusCode + ". Local BOARDS are unchanged. Check cloud copies before retrying an upload.");
        if (response.Content.Headers.ContentLength > Limit) throw new InvalidOperationException("Cloud snapshot exceeds the transfer limit.");
        using var output = new MemoryStream();
        using var input = await response.Content.ReadAsStreamAsync(deadline.Token);
        var buffer = new byte[16384]; int count;
        while ((count = await input.ReadAsync(buffer, deadline.Token)) > 0) {
            if (output.Length + count > Limit) throw new InvalidOperationException("Cloud snapshot exceeds the transfer limit.");
            await output.WriteAsync(buffer.AsMemory(0, count), deadline.Token);
        }
        return Encoding.UTF8.GetString(output.ToArray());
    }

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private async Task AuthorizeAsync(IWin32Window owner)
    {
        var client = await ReadClientAsync();
        string clientId = client.Id;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);
        timeout.CancelAfter(TimeSpan.FromMinutes(3));
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        string redirect = "http://127.0.0.1:" + ((IPEndPoint)listener.LocalEndpoint).Port + "/";
        string state = Base64Url(RandomNumberGenerator.GetBytes(32));
        string verifier = Base64Url(RandomNumberGenerator.GetBytes(64));
        string challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        string Query(Dictionary<string,string> parameters) => string.Join("&", parameters.Select(p => Uri.EscapeDataString(p.Key)+"="+Uri.EscapeDataString(p.Value)));
        var parameters = new Dictionary<string,string> { ["client_id"]=clientId, ["redirect_uri"]=redirect, ["response_type"]="code", ["scope"]=Scope, ["state"]=state, ["code_challenge"]=challenge, ["code_challenge_method"]="S256", ["prompt"]="consent select_account", ["access_type"]="offline" };
        openBrowser("https://accounts.google.com/o/oauth2/v2/auth?"+Query(parameters));
        string? code = null;
        while (code is null)
        {
            using var connection = await listener.AcceptTcpClientAsync(timeout.Token);
            using var stream = connection.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true);
            var line = await reader.ReadLineAsync(timeout.Token) ?? "";
            int headerBytes = line.Length;
            string? header;
            while (!string.IsNullOrEmpty(header = await reader.ReadLineAsync(timeout.Token))) {
                headerBytes += header.Length;
                if (headerBytes > 16384) throw new InvalidOperationException("The local Google sign-in response was too large. Connect Google and retry.");
            }
            var parts = line.Split(' ');
            Uri? callback = null;
            bool valid = line.Length < 8192 && parts.Length == 3 && parts[0] == "GET" && Uri.TryCreate(redirect.TrimEnd('/') + parts[1], UriKind.Absolute, out callback) && callback.AbsolutePath == "/";
            var values = valid ? System.Web.HttpUtility.ParseQueryString(callback!.Query) : null;
            valid = valid && values!["state"] == state;
            string page = valid ? "Google sign-in received. Return to Silverlight." : "Invalid sign-in response. Return to Silverlight and try again.";
            byte[] reply = Encoding.UTF8.GetBytes("HTTP/1.1 " + (valid ? "200 OK" : "400 Bad Request") + "\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\nContent-Length: " + Encoding.UTF8.GetByteCount(page) + "\r\n\r\n" + page);
            await stream.WriteAsync(reply, timeout.Token);
            if (!valid) continue;
            if (values!["error"] is not null) throw new InvalidOperationException("Google sign-in was cancelled or Drive access was denied. Local BOARDS are unchanged.");
            code = values["code"];
            if (string.IsNullOrEmpty(code)) throw new InvalidOperationException("Google did not return an authorization code.");
        }
        listener.Stop();
        var exchange = new Dictionary<string,string> { ["client_id"]=clientId, ["code"]=code, ["code_verifier"]=verifier, ["grant_type"]="authorization_code", ["redirect_uri"]=redirect };
        if (!string.IsNullOrEmpty(client.Value)) exchange["client_secret"] = client.Value;
        using var content = new FormUrlEncodedContent(exchange);
        using var result = await http.PostAsync("https://oauth2.googleapis.com/token", content, timeout.Token);
        if (!result.IsSuccessStatusCode) throw new InvalidOperationException("Google could not complete Windows sign-in. Check the Desktop OAuth client and consent configuration.");
        using var credentials = JsonDocument.Parse(await result.Content.ReadAsStringAsync(timeout.Token));
        ValidateScope(credentials.RootElement);
        if (!credentials.RootElement.TryGetProperty("refresh_token", out var refreshToken) || string.IsNullOrEmpty(refreshToken.GetString())) throw new InvalidOperationException("Google did not return offline authorization. Reconnect Google to remember sign-in on this PC.");
        await SaveRefreshAsync(credentials.RootElement, clientId, timeout.Token);
        token = credentials.RootElement.GetProperty("access_token").GetString();
        if (string.IsNullOrEmpty(token)) throw new InvalidOperationException("Google did not grant Drive access.");
        expires = DateTime.UtcNow.AddSeconds(Math.Max(0, credentials.RootElement.GetProperty("expires_in").GetInt32()-60));
        listed.Clear();
    }
    private async Task<bool> RefreshAsync()
    {
        if (!File.Exists(RefreshFile)) return false;
        JsonDocument cached;
        try { cached = JsonDocument.Parse(ProtectedData.Unprotect(await File.ReadAllBytesAsync(RefreshFile, lifetime.Token), null, DataProtectionScope.CurrentUser)); }
        catch (Exception ex) when (ex is CryptographicException or JsonException or IOException) { return false; }
        using (cached) {
            var client = await ReadClientAsync();
            string clientId = client.Id;
            if (!cached.RootElement.TryGetProperty("clientId", out var cachedClient) || cachedClient.GetString() != clientId || !cached.RootElement.TryGetProperty("refreshToken", out var cachedRefresh) || string.IsNullOrEmpty(cachedRefresh.GetString())) return false;
            var parameters = new Dictionary<string,string> { ["client_id"] = clientId, ["refresh_token"] = cachedRefresh.GetString()!, ["grant_type"] = "refresh_token" };
            if (!string.IsNullOrEmpty(client.Value)) parameters["client_secret"] = client.Value;
            using var body = new FormUrlEncodedContent(parameters);
            using var response = await http.PostAsync("https://oauth2.googleapis.com/token", body, lifetime.Token);
            if (response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.Unauthorized) return false;
            response.EnsureSuccessStatusCode();
            using var credentials = JsonDocument.Parse(await response.Content.ReadAsStringAsync(lifetime.Token));
            ValidateScope(credentials.RootElement);
            await SaveRefreshAsync(credentials.RootElement, clientId, lifetime.Token);
            token = credentials.RootElement.GetProperty("access_token").GetString();
            expires = DateTime.UtcNow.AddSeconds(Math.Max(0, credentials.RootElement.GetProperty("expires_in").GetInt32()-60));
            return !string.IsNullOrEmpty(token);
        }
    }
    private async Task SaveRefreshAsync(JsonElement credentials, string clientId, CancellationToken cancellation)
    {
        if (!credentials.TryGetProperty("refresh_token", out var refresh) || string.IsNullOrEmpty(refresh.GetString())) return;
        Directory.CreateDirectory(DataFolder);
        byte[] plaintext = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { clientId, refreshToken = refresh.GetString() }));
        try {
            byte[] encrypted = ProtectedData.Protect(plaintext, null, DataProtectionScope.CurrentUser);
            var temp = RefreshFile + ".tmp";
            await File.WriteAllBytesAsync(temp, encrypted, cancellation);
            File.Move(temp, RefreshFile, true);
        } finally { CryptographicOperations.ZeroMemory(plaintext); }
    }
    private async Task<(string Id, string? Value)> ReadClientAsync()
    {
        // Installed desktop metadata is public in the binary, not an account credential.
        // The owner-approved Google desktop value is injected by CI, never committed.
        // Legacy config stays intact for existing installations.
        var path = File.Exists(clientConfig) ? clientConfig : Path.Combine(DataFolder, "google-desktop-oauth.json");
        if (!File.Exists(path)) throw new InvalidOperationException("This build has no Google Desktop client ID. Install a configured Silverlight release. Local data is unchanged.");
        using var settings = JsonDocument.Parse(await File.ReadAllTextAsync(path, lifetime.Token));
        var root = settings.RootElement;
        var client = root.TryGetProperty("installed", out var legacy) ? legacy : root;
        string id = client.GetProperty("client_id").GetString() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(id, @"\A[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com\z")) throw new InvalidOperationException("Invalid Google Desktop OAuth client ID.");
        var value = client.TryGetProperty("desktop_client_value", out var desktopValue) ? desktopValue.GetString() : client.TryGetProperty("client_secret", out var legacyValue) ? legacyValue.GetString() : null;
        return (id, value);
    }
    private static void ValidateScope(JsonElement credentials)
    {
        if (credentials.TryGetProperty("scope", out var granted) && !(granted.GetString() ?? "").Split(' ').Contains(Scope)) throw new InvalidOperationException("Google did not grant Silverlight's Drive app-data scope. Reconnect Google. Local data is unchanged.");
    }
    public void Dispose() { lifetime.Cancel(); lifetime.Dispose(); http.Dispose(); token = null; }
}
