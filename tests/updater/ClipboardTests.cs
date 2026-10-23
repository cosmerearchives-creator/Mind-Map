using System.Buffers.Binary;
using System.Text;
using Silverlight.Windows;

internal static class ClipboardTests
{
    public static void Run()
    {
        void Check(bool ok) { if (!ok) throw new Exception("Clipboard format validation failed."); }
        byte[] Payload(params (string Key, string Value)[] values)
        {
            using var stream = new MemoryStream(); using var writer = new BinaryWriter(stream, Encoding.Unicode, true);
            writer.Write(0); writer.Write(values.Length);
            void Text(string text) { writer.Write(text.Length); writer.Write(Encoding.Unicode.GetBytes(text)); while (stream.Position % 4 != 0) writer.Write((byte)0); }
            foreach (var item in values) { Text(item.Key); Text(item.Value); }
            var result = stream.ToArray(); BinaryPrimitives.WriteInt32LittleEndian(result, result.Length - 4); return result;
        }
        var data = Payload(("text/plain", "test"), (ClipboardFormats.Milanote, "{\"elements\":[],\"title\":\"Unicode 🐉\"}"));
        Check(ClipboardFormats.ReadMilanote(data) == "{\"elements\":[],\"title\":\"Unicode 🐉\"}");
        Check(ClipboardFormats.ReadMilanote(data[..^1]) == null);
        Check(ClipboardFormats.ReadMilanote(data.Concat(new byte[4]).ToArray()) != null);
        var negative = Payload((ClipboardFormats.Milanote, "value")); BinaryPrimitives.WriteInt32LittleEndian(negative.AsSpan(8), -1); Check(ClipboardFormats.ReadMilanote(negative) == null);
        var overflow = Payload((ClipboardFormats.Milanote, "value")); BinaryPrimitives.WriteInt32LittleEndian(overflow.AsSpan(8), int.MaxValue); Check(ClipboardFormats.ReadMilanote(overflow) == null);
        Check(ClipboardFormats.ReadMilanote(Payload(("other", "content"))) == null);
        byte[] Firefox(params (string Key, string Value)[] values)
        {
            using var stream = new MemoryStream();
            void UInt(uint value) { var bytes = new byte[4]; BinaryPrimitives.WriteUInt32BigEndian(bytes, value); stream.Write(bytes); }
            void Text(string text) { var bytes = Encoding.Unicode.GetBytes(text); UInt((uint)bytes.Length); stream.Write(bytes); }
            foreach (var item in values) { UInt(1); Text(item.Key); Text(item.Value); }
            UInt(0); return stream.ToArray();
        }
        var firefox = Firefox(("unrelated", "ignored"), (ClipboardFormats.Milanote, "{\"elements\":[],\"text\":\"Unicode 🐉\"}"));
        Check(ClipboardFormats.ReadFirefoxMilanote(firefox) == "{\"elements\":[],\"text\":\"Unicode 🐉\"}");
        Check(ClipboardFormats.ReadFirefoxMilanote(firefox.Concat(new byte[4]).ToArray()) != null);
        Check(ClipboardFormats.ReadFirefoxMilanote(firefox[..^1]) == null);
        Check(ClipboardFormats.ReadFirefoxMilanote(Firefox(("unrelated", "ignored"))) == null);
        var odd = Firefox((ClipboardFormats.Milanote, "value")); BinaryPrimitives.WriteUInt32BigEndian(odd.AsSpan(4), 3); Check(ClipboardFormats.ReadFirefoxMilanote(odd) == null);
        var huge = Firefox((ClipboardFormats.Milanote, "value")); BinaryPrimitives.WriteUInt32BigEndian(huge.AsSpan(4), uint.MaxValue); Check(ClipboardFormats.ReadFirefoxMilanote(huge) == null);
        var invalid = Firefox((ClipboardFormats.Milanote, "value")); invalid[3] = 7; Check(ClipboardFormats.ReadFirefoxMilanote(invalid) == null);
        Check(ClipboardFormats.HtmlFragment("Version:1.0\r\n<html><!--StartFragment--><b>Text</b><!--EndFragment--></html>") == "<b>Text</b>");
        Check(ClipboardFormats.HtmlFragment("<p>Plain HTML</p>") == "<p>Plain HTML</p>");
        var header = "Version:1.0\r\nStartFragment:0000000000\r\nEndFragment:0000000000\r\n";
        string prefix = "<html>é", fragment = "<b>🐉</b>";
        int start = Encoding.UTF8.GetByteCount(header + prefix), end = start + Encoding.UTF8.GetByteCount(fragment);
        var offsets = $"Version:1.0\r\nStartFragment:{start:D10}\r\nEndFragment:{end:D10}\r\n";
        Check(ClipboardFormats.HtmlFragment(offsets + prefix + fragment + "</html>") == fragment);
        Console.WriteLine("PASS: native CF_HTML headers removed using fragment markers or UTF-8 byte offsets.");
        Console.WriteLine("PASS: Firefox tagged big-endian UTF-16 payload, Unicode, padding and malformed/truncated data rejection.");
        Console.WriteLine("PASS: Chromium custom MIME UTF-16 payload, alignment, Unicode and malformed-length rejection.");
    }
}
