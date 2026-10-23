using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Silverlight.Windows;

public sealed class MainWindow : Form
{
    private const string ReleasesApi = "https://api.github.com/repos/cosmerearchives-creator/Mind-Map/releases?per_page=100";
    private const string ReleasesPage = "https://github.com/cosmerearchives-creator/Mind-Map/releases";
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly ToolStripMenuItem updates = new("Check for updates");
    private readonly HttpClient http = new() { Timeout = TimeSpan.FromMinutes(5) };
    private bool checking;
    private readonly DriveSync driveSync = new();

    public MainWindow()
    {
        Text = "Silverlight";
        Width = 1180;
        Height = 780;
        MinimumSize = new(420, 350);
        Controls.Add(browser);

        var menu = new MenuStrip();
        var file = new ToolStripMenuItem("&Silverlight");
        updates.Click += async (_, _) => await CheckUpdatesAsync(true);
        file.DropDownItems.Add(updates);
        file.DropDownItems.Add(new ToolStripMenuItem("Open releases", null, (_, _) => OpenReleases()));
        menu.Items.Add(file);
        var viewMenu = new ToolStripMenuItem("&View");
        var hintsMenu = new ToolStripMenuItem("Canvas &tips") { Checked = true, CheckOnClick = true };
        hintsMenu.Click += async (_, _) => { if (browser.CoreWebView2 is not null) await browser.CoreWebView2.ExecuteScriptAsync("window.SilverlightUI?.setHints(" + (hintsMenu.Checked ? "true" : "false") + ")"); };
        viewMenu.DropDownItems.Add(hintsMenu);
        menu.Items.Add(viewMenu);
        MainMenuStrip = menu;
        Controls.Add(menu);

        http.DefaultRequestHeaders.UserAgent.ParseAdd("Silverlight-Windows/0.8");
        Shown += async (_, _) =>
        {
            try
            {
                var data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Silverlight", "WebView2");
                Directory.CreateDirectory(data);
                await browser.EnsureCoreWebView2Async(await CoreWebView2Environment.CreateAsync(userDataFolder: data));
                browser.CoreWebView2.SetVirtualHostNameToFolderMapping("silverlight.local", Path.Combine(AppContext.BaseDirectory, "web"), CoreWebView2HostResourceAccessKind.DenyCors);
                await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"window.SilverlightClipboard={postMessage:function(text){var request=JSON.parse(text);window.chrome.webview.postMessage({channel:'silverlight-clipboard',id:request.id,op:request.op});}};window.chrome.webview.addEventListener('message',function(e){if(e.data.channel==='silverlight-clipboard'&&window.SilverlightClipboard.onmessage)window.SilverlightClipboard.onmessage({data:JSON.stringify(e.data)});});");
                browser.CoreWebView2.NavigationStarting += (_, args) => {
                    if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "silverlight.local" && uri.AbsolutePath == "/index.html") return;
                    args.Cancel = true;
                    if (uri is not null && uri.Scheme is "https" or "http") Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
                };
                browser.CoreWebView2.NewWindowRequested += (_, args) => {
                    args.Handled = true;
                    if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http") Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
                };
                browser.CoreWebView2.WebMessageReceived += async (_, args) => {
                    if (!Uri.TryCreate(args.Source, UriKind.Absolute, out var origin) || origin.Scheme != "https" || origin.Host != "silverlight.local" || origin.AbsolutePath != "/index.html") return;
                    string? requestId = null;
                    try {
                        using var message = JsonDocument.Parse(args.WebMessageAsJson);
                        var request = message.RootElement;
                        if (request.GetProperty("channel").GetString() == "silverlight-clipboard")
                        {
                            string? clipId = request.TryGetProperty("id", out var clip) ? clip.GetString() : null;
                            try
                            {
                                var clipboardResult = ClipboardBridge.Read(request);
                                using var encoded = JsonDocument.Parse(JsonSerializer.Serialize(clipboardResult));
                                browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { channel = "silverlight-clipboard", id = clipId, items = encoded.RootElement.GetProperty("items") }));
                            }
                            catch (Exception error)
                            {
                                browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { channel = "silverlight-clipboard", id = clipId, error = error is InvalidOperationException ? error.Message : "Clipboard is unavailable. Copy the selection again and use Paste." }));
                            }
                            return;
                        }
                        if (request.GetProperty("channel").GetString() == "silverlight-ui") { if (request.TryGetProperty("hints", out var shown)) hintsMenu.Checked = shown.GetBoolean(); return; }
                        if (request.GetProperty("channel").GetString() != "silverlight-drive") return;
                        requestId = request.GetProperty("id").GetString();
                        var result = await driveSync.ExecuteAsync(request, this);
                        if (!IsDisposed) browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { channel = "silverlight-drive", id = requestId, result }));
                    } catch (Exception error) {
                        string description = error is InvalidOperationException ? error.Message : error is OperationCanceledException ? "Google request was cancelled or timed out. Local BOARDS are unchanged; check cloud copies before retrying an upload." : "Google Drive request failed. Check your connection and OAuth setup, then retry. Local BOARDS are unchanged.";
                        if (!IsDisposed) browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { channel = "silverlight-drive", id = requestId, error = description }));
                    }
                };
                browser.CoreWebView2.Navigate("https://silverlight.local/index.html");
                await CheckUpdatesAsync(false);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not launch Silverlight. WebView2 Runtime may need to be installed.\n\n" + ex.Message, "Silverlight");
            }
        };
    }

    private static void OpenReleases() =>
        Process.Start(new ProcessStartInfo(ReleasesPage) { UseShellExecute = true });

    private static int CurrentBuild() => typeof(MainWindow).Assembly.GetName().Version?.Build ?? 0;

    private async Task CheckUpdatesAsync(bool manual)
    {
        if (checking) return;
        checking = true;
        updates.Enabled = false;
        try
        {
            using var response = await http.GetAsync(ReleasesApi);
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var newest = document.RootElement.EnumerateArray()
                .Where(r => !r.TryGetProperty("draft", out var draft) || !draft.GetBoolean())
                .Select(r => new { Release = r, Tag = r.GetProperty("tag_name").GetString() ?? "" })
                .Where(r => r.Tag.StartsWith("v0.8.", StringComparison.Ordinal) &&
                            int.TryParse(r.Tag.AsSpan(5), out _))
                .OrderByDescending(r => int.Parse(r.Tag.AsSpan(5)))
                .FirstOrDefault();

            if (newest is null)
            {
                if (manual) MessageBox.Show("No Windows release found.", "Silverlight");
                return;
            }

            int availableBuild = int.Parse(newest.Tag.AsSpan(5));
            if (availableBuild <= CurrentBuild())
            {
                if (manual) MessageBox.Show("You're using the latest Windows version.", "Silverlight");
                return;
            }

            var asset = newest.Release.GetProperty("assets").EnumerateArray()
                .FirstOrDefault(a => a.GetProperty("name").GetString() == "Silverlight-Setup.exe");
            if (asset.ValueKind == JsonValueKind.Undefined)
            {
                if (manual) MessageBox.Show("A newer Windows release exists, but its installer isn't available yet.", "Silverlight");
                return;
            }

            string url = asset.GetProperty("browser_download_url").GetString() ?? "";
            if (!Uri.TryCreate(url, UriKind.Absolute, out var address) ||
                address.Scheme != Uri.UriSchemeHttps ||
                address.Host != "github.com" ||
                !address.AbsolutePath.StartsWith("/cosmerearchives-creator/Mind-Map/releases/download/", StringComparison.Ordinal))
                throw new InvalidOperationException("Unexpected release download address.");

            if (MessageBox.Show(
                $"Silverlight {newest.Tag} is available.\n\nDownload the Windows installer and install it now? Silverlight will close after the download. Your local boards are stored separately from the application files.",
                "Silverlight update", MessageBoxButtons.YesNo, MessageBoxIcon.Information) != DialogResult.Yes) return;

            await DownloadAndInstallAsync(address, newest.Tag);
        }
        catch (Exception ex)
        {
            if (manual) MessageBox.Show("Update check failed: " + ex.Message, "Silverlight");
        }
        finally
        {
            checking = false;
            updates.Enabled = true;
        }
    }

    private async Task DownloadAndInstallAsync(Uri address, string version)
    {
        UpdateFiles? files = null;
        string stage = "preparing the update folder";
        using var progress = new Form
        {
            Text = "Downloading Silverlight update",
            Width = 400, Height = 140, FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterParent, ControlBox = false
        };
        var label = new Label { Text = "Downloading installer…", Dock = DockStyle.Top, Height = 38, TextAlign = System.Drawing.ContentAlignment.MiddleCenter };
        var bar = new ProgressBar { Dock = DockStyle.Top, Height = 25, Style = ProgressBarStyle.Marquee };
        progress.Controls.Add(bar);
        progress.Controls.Add(label);
        progress.Show(this);
        try
        {
            files = UpdateFiles.Create(
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Silverlight", "Updates"),
                Path.Combine(Path.GetTempPath(), "Silverlight-Updates"));
            stage = "downloading the installer";
            using var response = await http.GetAsync(address, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();
            var length = response.Content.Headers.ContentLength;
            if (length is > 0) { bar.Style = ProgressBarStyle.Continuous; bar.Maximum = 100; }
            await using (var source = await response.Content.ReadAsStreamAsync())
            await using (var output = new FileStream(files.PartialPath, FileMode.Open, FileAccess.Write, FileShare.None, 81920, true))
            {
                var buffer = new byte[81920];
                long received = 0;
                int bytesRead;
                while ((bytesRead = await source.ReadAsync(buffer)) != 0)
                {
                    await output.WriteAsync(buffer.AsMemory(0, bytesRead));
                    received += bytesRead;
                    if (length is > 0)
                    {
                        var pct = (int)Math.Min(100, received * 100 / length.Value);
                        bar.Value = pct;
                        label.Text = $"Downloading installer… {pct}%";
                    }

                }
            }
            stage = "verifying the downloaded installer";
            files.Complete(length);
            progress.Close();

            if (MessageBox.Show("Download complete. Close Silverlight and start the installer? Your board data will remain in the local app data folder.",
                "Install update", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;

            stage = "launching the installer";
            var launched = Process.Start(new ProcessStartInfo(files.InstallerPath) { UseShellExecute = true, WorkingDirectory = files.DirectoryPath });
            if (launched is null) throw new IOException("Windows did not start the installer.");
            Close();
        }
        catch (Exception ex)
        {
            progress.Close();
            files?.DeletePartial();
            var logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Silverlight", "updater-error.log");
            try { Directory.CreateDirectory(Path.GetDirectoryName(logPath)!); File.AppendAllText(logPath, DateTimeOffset.Now + " " + stage + "\n" + files?.DirectoryPath + "\n" + ex + "\n\n"); } catch { }
            string recovery = stage == "launching the installer" && files is not null ? "\n\nThe downloaded installer is available at:\n" + files.InstallerPath : "\n\nYou can install manually from GitHub Releases.";
            MessageBox.Show("Update failed while " + stage + ": " + ex.Message + recovery + "\n\nDiagnostic log: " + logPath, "Silverlight");
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { driveSync.Dispose(); browser.Dispose(); http.Dispose(); }
        base.Dispose(disposing);
    }
}
