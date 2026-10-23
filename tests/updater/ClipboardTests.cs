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
        Console.WriteLine("PASS: Chromium custom MIME UTF-16 payload, alignment, Unicode and malformed-length rejection.");
    }
}
