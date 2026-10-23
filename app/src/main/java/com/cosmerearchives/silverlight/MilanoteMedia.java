package com.cosmerearchives.silverlight;
import androidx.webkit.JavaScriptReplyProxy;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import java.net.URL;
import java.net.HttpURLConnection;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;
import org.json.JSONArray;
final class MilanoteMedia {
 static void read(JSONObject request, JavaScriptReplyProxy proxy) {
  new Thread(() -> {
   JSONObject result = new JSONObject();HttpURLConnection connection=null;
   try {
    result.put("id",request.optString("id"));URL url=new URL(request.optString("url"));
    if(!"https".equals(url.getProtocol())||!"app.milanote.com".equals(url.getHost())||(url.getPort()!=-1&&url.getPort()!=443)||url.getUserInfo()!=null||!url.getPath().startsWith("/media/p/"))throw new Exception("Unsupported Milanote media address.");
    connection=(HttpURLConnection)url.openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(20000);
    if(connection.getResponseCode()!=200)throw new Exception("Milanote image is unavailable.");
    String type=connection.getContentType();if(type==null||!type.matches("image/(png|jpeg|jpg|gif|webp)(;.*)?"))throw new Exception("Unsupported image response.");
    long began=System.nanoTime();ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1){if(System.nanoTime()-began>20000000000L)throw new Exception("Image download timed out.");if(bytes.size()+count>8*1024*1024)throw new Exception("Image exceeds 8 MB.");bytes.write(buffer,0,count);}}
    result.put("items",new JSONArray().put(new JSONObject().put("type",type.split(";")[0]).put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP))));
   }catch(Exception error){try{result.put("error",error.getMessage());}catch(Exception ignored){}}
   finally{if(connection!=null)connection.disconnect();}
   JSONObject reply=result;new Handler(Looper.getMainLooper()).post(()->proxy.postMessage(reply.toString()));
  },"silverlight-milanote-media").start();
 }
}
