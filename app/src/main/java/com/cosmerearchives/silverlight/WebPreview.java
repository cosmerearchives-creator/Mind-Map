package com.cosmerearchives.silverlight;
import androidx.webkit.JavaScriptReplyProxy;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import java.net.*;
import java.io.*;
import org.json.*;
final class WebPreview {
 static boolean publicAddress(InetAddress ip){byte[] b=ip.getAddress();if(ip.isAnyLocalAddress()||ip.isLoopbackAddress()||ip.isLinkLocalAddress()||ip.isSiteLocalAddress()||ip.isMulticastAddress())return false;if(b.length==16)return (b[0]&254)!=252;return !((b[0]&255)==0||(b[0]&255)>=224||((b[0]&255)==100&&(b[1]&255)>=64&&(b[1]&255)<=127));}
 static void read(JSONObject request,JavaScriptReplyProxy proxy){new Thread(()->{JSONObject reply=new JSONObject();HttpURLConnection connection=null;long deadline=System.nanoTime()+20000000000L;try{
 reply.put("id",request.optString("id"));boolean image="previewImage".equals(request.optString("op"));URL url=new URL(request.optString("url"));if(url.getUserInfo()!=null||(url.getPort()!=-1&&url.getPort()!=url.getDefaultPort()))throw new Exception("Unsupported preview address.");if("http".equals(url.getProtocol()))url=new URL("https",url.getHost(),url.getFile());
 for(int redirects=0;redirects<4;redirects++){
 if(!"https".equals(url.getProtocol())||(url.getPort()!=-1&&url.getPort()!=443)||url.getUserInfo()!=null)throw new Exception("Unsupported preview address.");for(InetAddress ip:InetAddress.getAllByName(url.getHost()))if(!publicAddress(ip))throw new Exception("Preview address is not public.");
 connection=(HttpURLConnection)url.openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(8000);connection.setReadTimeout(8000);int status=connection.getResponseCode();if(status>=300&&status<400){String location=connection.getHeaderField("Location");if(location==null)throw new Exception("Invalid redirect.");url=new URL(url,location);connection.disconnect();continue;}if(status!=200)throw new Exception("Preview unavailable.");String type=connection.getContentType();type=type==null?"":type.split(";")[0].trim();if(image?!type.matches("image/(png|jpeg|webp|gif|x-icon|vnd.microsoft.icon)"):!type.matches("text/html|application/xhtml\\+xml"))throw new Exception("Unsupported preview response.");
 ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){if(System.nanoTime()>deadline)throw new Exception("Preview timed out.");int limit=image?2*1024*1024:512*1024;if(bytes.size()+n>limit){if(image)throw new Exception("Preview exceeds size limit.");bytes.write(buffer,0,limit-bytes.size());break;}bytes.write(buffer,0,n);}}
 JSONObject item=new JSONObject().put("type",type);if(image)item.put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));else item.put("text",bytes.toString("UTF-8")).put("url",url.toString());reply.put("items",new JSONArray().put(item));break;
 }
 if(!reply.has("items"))throw new Exception("Too many preview redirects.");
 }catch(Exception e){try{reply.put("error",e.getMessage());}catch(Exception ignored){}}finally{if(connection!=null)connection.disconnect();}new Handler(Looper.getMainLooper()).post(()->proxy.postMessage(reply.toString()));},"silverlight-web-preview").start();}
}
