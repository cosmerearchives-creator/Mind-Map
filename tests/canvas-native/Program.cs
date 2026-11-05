using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// Synthetic profiling only: a fresh private browser profile, no app/native data bridge.
ApplicationConfiguration.Initialize();
var port = args.Length == 1 && int.TryParse(args[0], out var parsed) ? parsed : 9228;
if (port < 1024 || port > 65535) throw new ArgumentException("Invalid local debugging port");
var form = new Form { Text = "Archives synthetic canvas profile", ClientSize = new Size(1400, 1000) };
var web = new WebView2 { Dock = DockStyle.Fill };
form.Controls.Add(web);
form.Shown += async (_, _) => {
    var profile = Path.Combine(AppContext.BaseDirectory, "synthetic-profiles", Guid.NewGuid().ToString("N"));
    var environment = await CoreWebView2Environment.CreateAsync(null, profile,
        new CoreWebView2EnvironmentOptions($"--remote-debugging-port={port}"));
    await web.EnsureCoreWebView2Async(environment);
    web.Source = new Uri("about:blank");
};
Application.Run(form);
