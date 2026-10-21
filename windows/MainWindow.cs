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
    private const string ReleasesApi = "https://api.github.com/repos/cosmerearchives-creator/Mind-Map/releases/latest";
    private const string ReleasesPage = "https://github.com/cosmerearchives-creator/Mind-Map/releases/latest";
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly ToolStripMenuItem updates = new("Check for updates");
    private readonly HttpClient http = new();
    public MainWindow()
    {
        Text = "Silverlight";
        Width = 1180; Height = 780; MinimumSize = new(420, 350);
        Controls.Add(browser);
        var menu = new MenuStrip();
        var file = new ToolStripMenuItem("Silverlight");
        updates.Click += async (_, _) => await CheckUpdatesAsync(true);
        file.DropDownItems.Add(updates);
        file.DropDownItems.Add(new ToolStripMenuItem("Open release page", null, (_, _) => OpenReleases()));
        menu.Items.Add(file);
        MainMenuStrip = menu;
        Controls.Add(menu);
        browser.Dock = DockStyle.Fill;
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
            catch (Exception ex) { MessageBox.Show("Could not launch Silverlight. WebView2 Runtime may need to be installed.\n\n" + ex.Message, "Silverlight"); }
        };
    }
    private static void OpenReleases() => Process.Start(new ProcessStartInfo(ReleasesPage) { UseShellExecute = true });
    private async Task CheckUpdatesAsync(bool manual)
    {
        try
        {
            using var response = await http.GetAsync(ReleasesApi);
            response.EnsureSuccessStatusCode();
            using var data = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var tag = data.RootElement.GetProperty("tag_name").GetString() ?? "";
            // Desktop releases use v0.8.N tags. Avoid comparing Android version codes.
            if (!tag.StartsWith("v0.8.", StringComparison.Ordinal) || !int.TryParse(tag.AsSpan(5), out var latest))
            {
                if (manual) MessageBox.Show("No comparable Windows release found yet.");
                return;
            }
            var current = int.TryParse(Environment.GetEnvironmentVariable("SILVERLIGHT_WINDOWS_BUILD"), out var n) ? n : 0;
            // Build number embedded in assembly version's build component by CI.
            var assemblyBuild = typeof(MainWindow).Assembly.GetName().Version?.Build ?? 0;
            current = Math.Max(current, assemblyBuild);
            if (latest > current)
            {
                if (MessageBox.Show("Silverlight " + tag + " is available. Open the installer download page?", "Update available", MessageBoxButtons.YesNo) == DialogResult.Yes) OpenReleases();
            }
            else if (manual) MessageBox.Show("You're using the latest Windows version.");
        }
        catch (Exception ex)
        {
            if (manual) MessageBox.Show("Couldn't check GitHub releases: " + ex.Message);
        }
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing) { browser.Dispose(); http.Dispose(); }
        base.Dispose(disposing);
    }
}
