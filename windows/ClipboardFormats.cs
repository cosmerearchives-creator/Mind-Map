using System.Buffers.Binary;
using System.Text;

namespace Silverlight.Windows;

// Chromium custom MIME data uses a Pickle header, entry count and aligned UTF-16 strings.
internal static class ClipboardFormats
{
    public const string Milanote = "application/milanote-elements";
    public const int MaxBytes = 32 * 1024 * 1024;
    public static string? ReadMilanote(byte[] data)
    {
        if (data.Length < 8 || data.Length > MaxBytes) return null;
        uint payload = BinaryPrimitives.ReadUInt32LittleEndian(data);
        if (payload > data.Length - 4) return null;
        // HGLOBAL storage may include zero padding beyond the Pickle payload.
        int limit = checked((int)payload + 4);
        if (limit < 8 || data.AsSpan(limit).IndexOfAnyExcept((byte)0) >= 0) return null;
        if (limit != data.Length) data = data.AsSpan(0, limit).ToArray();
        int offset = 4;
        uint count = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(offset, 4)); offset += 4;
        if (count > 1024) return null;
        string? found = null;
        for (uint i = 0; i < count; i++)
        {
            if (!ReadString(data, ref offset, out var type) || !ReadString(data, ref offset, out var text)) return null;
            if (type == Milanote) found = text;
        }
        return offset == data.Length ? found : null;
    }
    private static bool ReadString(byte[] data, ref int offset, out string text)
    {
        text = "";
        if (offset > data.Length - 4) return false;
        int length = BinaryPrimitives.ReadInt32LittleEndian(data.AsSpan(offset, 4)); offset += 4;
        if (length < 0 || length > (data.Length - offset) / 2) return false;
        int bytes = length * 2, padded = (bytes + 3) & ~3;
        if (padded > data.Length - offset) return false;
        text = Encoding.Unicode.GetString(data, offset, bytes); offset += padded;
        return true;
    }
}
