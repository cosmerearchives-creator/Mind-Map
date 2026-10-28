using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
namespace Silverlight.Windows;
internal static class WebPreview
{
    internal static bool PublicAddress(IPAddress ip)
    {
        if(ip.IsIPv4MappedToIPv6) ip=ip.MapToIPv4();
        if(IPAddress.IsLoopback(ip)||ip.IsIPv6LinkLocal||ip.IsIPv6Multicast||ip.Equals(IPAddress.Any)||ip.Equals(IPAddress.IPv6Any))return false;
        var b=ip.GetAddressBytes();
        if(b.Length==16)return (b[0]&0xfe)!=0xfc;
        return b[0]!=0&&b[0]!=10&&b[0]!=127&&b[0]<224&&!(b[0]==169&&b[1]==254)&&!(b[0]==172&&b[1]>=16&&b[1]<=31)&&!(b[0]==192&&b[1]==168)&&!(b[0]==100&&b[1]>=64&&b[1]<=127);
    }
    public static async Task<object> ReadAsync(JsonElement request)
    {
        bool importing=request.GetProperty("op").GetString()=="importImage";
        bool image=importing||request.GetProperty("op").GetString()=="previewImage";
        var uri=new Uri(request.GetProperty("url").GetString()!);
        if(!uri.IsDefaultPort||uri.UserInfo.Length!=0)throw new InvalidOperationException("Unsupported preview address.");
        // Android also disallows cleartext; use HTTPS for preview retrieval on both platforms.
        if(uri.Scheme=="http")uri=new UriBuilder(uri){Scheme="https",Port=-1}.Uri;
        using var timeout=new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(20));
        using var handler=new HttpClientHandler{AllowAutoRedirect=false,UseCookies=false};using var http=new HttpClient(handler);
        for(int redirects=0;redirects<4;redirects++)
        {
            if(uri.Scheme!="https"||!uri.IsDefaultPort||uri.UserInfo.Length!=0)throw new InvalidOperationException("Unsupported preview address.");
            var addresses=await Dns.GetHostAddressesAsync(uri.DnsSafeHost,timeout.Token);
            if(addresses.Length==0||addresses.Any(a=>!PublicAddress(a)))throw new InvalidOperationException("Preview address is not public.");
            using var response=await http.GetAsync(uri,HttpCompletionOption.ResponseHeadersRead,timeout.Token);
            if((int)response.StatusCode>=300&&(int)response.StatusCode<400&&response.Headers.Location is Uri next){uri=new Uri(uri,next);continue;}
            response.EnsureSuccessStatusCode();string type=response.Content.Headers.ContentType?.MediaType??"";int limit=importing?8*1024*1024:image?2*1024*1024:512*1024;
            if(image?!new[]{"image/png","image/jpeg","image/webp","image/gif","image/x-icon","image/vnd.microsoft.icon","image/avif","image/bmp"}.Contains(type):!new[]{"text/html","application/xhtml+xml"}.Contains(type))throw new InvalidOperationException("Unsupported preview response.");
            using var input=await response.Content.ReadAsStreamAsync(timeout.Token);using var bytes=new MemoryStream();var buffer=new byte[8192];int count;
            while((count=await input.ReadAsync(buffer,timeout.Token))>0){if(bytes.Length+count>limit){if(image)throw new InvalidOperationException("Preview exceeds size limit.");bytes.Write(buffer,0,(int)(limit-bytes.Length));break;}bytes.Write(buffer,0,count);}
            if(image)return new{items=new[]{new{type,base64=Convert.ToBase64String(bytes.ToArray())}}};
            return new{items=new[]{new{type="text/html",text=Encoding.UTF8.GetString(bytes.ToArray()),url=uri.AbsoluteUri}}};
        }
        throw new InvalidOperationException("Too many preview redirects.");
    }
}
