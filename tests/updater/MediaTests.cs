using System.Net;
using System.Net.Http.Headers;
using Silverlight.Windows;
internal static class MediaTests
{
    private sealed class FakeTransport(string type, long? length = null, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(status) { Content = new ByteArrayContent(new byte[] { 1, 2, 3 }) };
            response.Content.Headers.ContentType = new MediaTypeHeaderValue(type);
            if (length.HasValue) response.Content.Headers.ContentLength = length.Value;
            return Task.FromResult(response);
        }
    }
    public static async Task Run()
    {
        void Check(bool ok) { if (!ok) throw new Exception("Media request validation failed."); }
        foreach (var url in new[] { "http://app.milanote.com/media/p/a", "https://localhost/media/p/a", "http://media.milanote.com/p/resized/a", "https://media.milanote.com.evil.example/p/resized/a", "https://media.milanote.com/private/a", "https://media.milanote.com/p/resized/../../admin", "https://user:pass@media.milanote.com/p/resized/a", "https://media.milanote.com:444/p/resized/a", "https://evil.example/media/p/a", "https://user:pass@app.milanote.com/media/p/a", "https://app.milanote.com:444/media/p/a", "https://app.milanote.com/media/p/../../admin" }) Check(!MilanoteMedia.Allowed(url, out _));
        const string cdn = "https://media.milanote.com/p/resized/board/image.png?w=display";
        Check(MilanoteMedia.Allowed(cdn, out _));Check(MilanoteMedia.Allowed("https://media.milanote.com/p/images/board/image.png?w=400&v=2", out _));
        var thumbnail = await MilanoteMedia.FetchAsync(cdn, new FakeTransport("image/png")); Check(thumbnail.Type == "image/png" && thumbnail.Bytes.Length == 3);
        const string allowed = "https://app.milanote.com/media/p/test.png";
        var image = await MilanoteMedia.FetchAsync(allowed, new FakeTransport("image/jpg")); Check(image.Type == "image/jpg" && image.Bytes.Length == 3);
        async Task Reject(string type, long? length = null, HttpStatusCode status = HttpStatusCode.OK)
        {
            try { await MilanoteMedia.FetchAsync(allowed, new FakeTransport(type, length, status)); throw new Exception("Invalid media response accepted."); }
            catch (InvalidOperationException) { }
            catch (HttpRequestException) { }
        }
        await Reject("text/html"); await Reject("image/svg+xml"); await Reject("image/png", 9 * 1024 * 1024); await Reject("image/png", null, HttpStatusCode.Redirect);
        Console.WriteLine("PASS: native media origin restrictions, credential/port/path rejection, image MIME/size bounds and redirect failure.");
    }
}
