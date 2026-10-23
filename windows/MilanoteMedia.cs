using System.Net.Http;
namespace Silverlight.Windows;
internal static class MilanoteMedia
{
    public static bool Allowed(string? value, out Uri? uri) => Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == "https" && uri.Host == "app.milanote.com" && uri.IsDefaultPort && uri.UserInfo.Length == 0 && uri.AbsolutePath.StartsWith("/media/p/");
    public static async Task<(string Type, byte[] Bytes)> FetchAsync(string? value, HttpMessageHandler? transport = null)
    {
        if (!Allowed(value, out var uri)) throw new InvalidOperationException("Unsupported Milanote media address.");
        using var deadline = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(20));
        using var handler = transport ?? new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
        using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(20) };
        using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
        response.EnsureSuccessStatusCode();
        string type = response.Content.Headers.ContentType?.MediaType ?? "";
        if (!new[] { "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp" }.Contains(type)) throw new InvalidOperationException("Media response is not a supported image.");
        if (response.Content.Headers.ContentLength > 8 * 1024 * 1024) throw new InvalidOperationException("Image exceeds 8 MB.");
        using var source = await response.Content.ReadAsStreamAsync(deadline.Token); using var bytes = new MemoryStream();
        var buffer = new byte[8192]; int count;
        while ((count = await source.ReadAsync(buffer.AsMemory(), deadline.Token)) > 0) { if (bytes.Length + count > 8 * 1024 * 1024) throw new InvalidOperationException("Image exceeds 8 MB."); bytes.Write(buffer, 0, count); }
        return (type, bytes.ToArray());
    }
}
