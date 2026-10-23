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
    // Firefox stores tagged records: big-endian tag/byte lengths, UTF-16LE strings,
    // ending with tag zero. This is distinct from Chromium's Pickle container.
    public static string? ReadFirefoxMilanote(byte[] data)
    {
        if (data.Length < 4 || data.Length > MaxBytes) return null;
        int offset = 0; string? found = null;
        for (int record = 0; record < 1024; record++)
        {
            if (offset > data.Length - 4) return null;
            uint tag = BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset, 4)); offset += 4;
            if (tag == 0) return data.AsSpan(offset).IndexOfAnyExcept((byte)0) < 0 ? found : null;
            if (tag != 1 || !ReadFirefoxString(data, ref offset, out var type) || !ReadFirefoxString(data, ref offset, out var text)) return null;
            if (type == Milanote) found = text;
        }
        return null;
    }
    private static bool ReadFirefoxString(byte[] data, ref int offset, out string text)
    {
        text = "";
        if (offset > data.Length - 4) return false;
        uint bytes = BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset, 4)); offset += 4;
        if ((bytes & 1) != 0 || bytes > data.Length - offset) return false;
        text = Encoding.Unicode.GetString(data, offset, (int)bytes); offset += (int)bytes;
        return true;
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
