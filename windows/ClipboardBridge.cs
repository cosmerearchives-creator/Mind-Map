using System.Drawing.Imaging;
using System.Text.Json;
using System.Windows.Forms;

namespace Silverlight.Windows;

internal static class ClipboardBridge
{
    public static object Read(JsonElement request)
    {
        if (!request.TryGetProperty("op", out var op) || op.GetString() != "read") throw new InvalidOperationException("Unsupported clipboard request.");
        var items = new List<object>();
        var clipboard = Clipboard.GetDataObject();
        if (clipboard == null) return new { items };
        byte[]? Bytes(string format)
        {
            if (!clipboard.GetDataPresent(format, false)) return null;
            var value = clipboard.GetData(format, false);
            if (value is MemoryStream stream && stream.Length <= ClipboardFormats.MaxBytes) return stream.ToArray();
            if (value is byte[] bytes && bytes.Length <= ClipboardFormats.MaxBytes) return bytes;
            return null;
        }
        void Text(string format, string type)
        {
            if (clipboard.GetDataPresent(format, false) && clipboard.GetData(format, false) is string text)
            {
                if (text.Length > 8 * 1024 * 1024) throw new InvalidOperationException("Clipboard text exceeds the import limit. Copy fewer cards.");
                items.Add(new { type, text = type == "text/html" ? ClipboardFormats.HtmlFragment(text) : text });
            }
        }
        Text(DataFormats.UnicodeText, "text/plain"); Text(DataFormats.Html, "text/html");
        Text(ClipboardFormats.Milanote, ClipboardFormats.Milanote);
        var custom = Bytes("Chromium Web Custom MIME Data Format");
        if (custom != null)
        {
            var payload = ClipboardFormats.ReadMilanote(custom);
            if (payload != null) items.Add(new { type = ClipboardFormats.Milanote, text = payload });
            else if (!items.Any()) throw new InvalidOperationException("Custom clipboard data is not a supported Milanote selection. Copy the cards again.");
        }
        var firefox = Bytes("application/x-moz-custom-clipdata");
        if (firefox != null)
        {
            var payload = ClipboardFormats.ReadFirefoxMilanote(firefox);
            if (payload != null) items.Add(new { type = ClipboardFormats.Milanote, text = payload });
            else if (!items.Any()) throw new InvalidOperationException("Firefox clipboard data could not be read as a Milanote selection. Copy the Milanote cards again.");
        }
        var png = Bytes("PNG");
        if (png == null && clipboard.GetDataPresent(DataFormats.Bitmap) && clipboard.GetData(DataFormats.Bitmap) is System.Drawing.Image image)
        {
            if ((long)image.Width * image.Height > 16 * 1024 * 1024) throw new InvalidOperationException("Clipboard image is too large.");
            using var stream = new MemoryStream(); image.Save(stream, ImageFormat.Png); png = stream.ToArray();
        }
        if (png != null)
        {
            if (png.Length > 8 * 1024 * 1024) throw new InvalidOperationException("Clipboard image exceeds 8 MB.");
            items.Add(new { type = "image/png", base64 = Convert.ToBase64String(png) });
        }
        return new { items };
    }
}
