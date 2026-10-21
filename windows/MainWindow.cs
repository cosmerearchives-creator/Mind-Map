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

    public MainWindow()
    {
        Text = "Silverlight";
        Width = 1180;
        Height = 780;
        MinimumSize = new(420, 350);
        Controls.Add(browser);

        var menu = new MenuStrip();
        var file = new ToolStripMenuItem("Silverlight");
        updates.Click += async (_, _) => await CheckUpdatesAsync(true);
        file.DropDownItems.Add(updates);
        file.DropDownItems.Add(new ToolStripMenuItem("Open releases", null, (_, _) => OpenReleases()));
        menu.Items.Add(file);
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
        var updateDir = Path.Combine(Path.GetTempPath(), "Silverlight-Updates");
        Directory.CreateDirectory(updateDir);
        var installer = Path.Combine(updateDir, "Silverlight-Setup-" + version + ".exe");
        var partial = installer + ".partial";
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
            using var response = await http.GetAsync(address, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();
            var length = response.Content.Headers.ContentLength;
            if (length is > 0) { bar.Style = ProgressBarStyle.Continuous; bar.Maximum = 100; }
            await using (var source = await response.Content.ReadAsStreamAsync())
            await using (var output = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true))
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
                    Application.DoEvents();
                }
            }
            if (new FileInfo(partial).Length < 1024 * 100)
                throw new IOException("Downloaded file is unexpectedly small.");
            File.Move(partial, installer, true);
            progress.Close();

            if (MessageBox.Show("Download complete. Close Silverlight and start the installer? Your board data will remain in the local app data folder.",
                "Install update", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;

            Process.Start(new ProcessStartInfo(installer) { UseShellExecute = true });
            Close();
        }
        catch (Exception ex)
        {
            progress.Close();
            try { if (File.Exists(partial)) File.Delete(partial); } catch { }
            MessageBox.Show("Could not download or launch the updater: " + ex.Message + "\n\nYou can install manually from GitHub Releases.", "Silverlight");
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { browser.Dispose(); http.Dispose(); }
        base.Dispose(disposing);
    }
}
