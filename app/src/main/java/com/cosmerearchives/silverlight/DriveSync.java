package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.content.Intent;
import androidx.webkit.JavaScriptReplyProxy;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Origin-restricted bridge, fixed Drive operations, tokens never enter the WebView. */
final class DriveSync {
    static final int AUTHORIZE = 504;
    private static final String SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private static final String API = "https://www.googleapis.com/drive/v3/files";
    private static final int LIMIT = 64 * 1024 * 1024;
    private final Activity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Set<String> listed = new HashSet<>();
    private String token;
    private JSONObject current;
    private JavaScriptReplyProxy reply;
    DriveSync(Activity activity) { this.activity = activity; }

    void receive(String message, JavaScriptReplyProxy proxy) {
        JSONObject request;
        try { request = new JSONObject(message); } catch (Exception ignored) { return; }
        if (!"silverlight-drive".equals(request.optString("channel"))) return;
        if (current != null) { respond(proxy, request.optString("id"), null, "Another Drive request is still running."); return; }
        current = request; reply = proxy;
        String op = request.optString("op");
        if (!java.util.Arrays.asList("connect", "list", "upload", "download").contains(op)) { finish(null, "Unsupported Drive operation."); return; }
        if (token == null || "connect".equals(op)) authorize(); else execute();
    }
    private void authorize() {
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(SCOPE))).build();
        Identity.getAuthorizationClient(activity).authorize(request).addOnSuccessListener(result -> {
            if (result.hasResolution()) {
                try { activity.startIntentSenderForResult(result.getPendingIntent().getIntentSender(), AUTHORIZE, null, 0, 0, 0); }
                catch (Exception ignored) { finish(null, "Google sign-in could not open. Check Google Play services and OAuth setup."); }
            } else authorized(result);
        }).addOnFailureListener(error -> finish(null, "Google authorization failed. Check Drive API, test users, and Android OAuth package/release certificate in the Silverlight Google Cloud project."));
    }
    void authorizationResult(int resultCode, Intent data) {
        if (current == null) return;
        if (resultCode != Activity.RESULT_OK) { finish(null, "Google sign-in was cancelled. Local BOARDS are unchanged."); return; }
        try { authorized(Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(data)); }
        catch (Exception ignored) { finish(null, "Google did not grant Drive access. Please try Connect Google again."); }
    }
    private void authorized(AuthorizationResult result) {
        token = result.getAccessToken();
        if (token == null || token.isEmpty()) { finish(null, "Drive access was not granted."); return; }
        listed.clear(); execute();
    }
    private void execute() {
        final JSONObject request = current;
        executor.execute(() -> {
            try {
                String op = request.getString("op"); JSONObject result;
                if ("connect".equals(op)) result = new JSONObject().put("platform", "Android");
                else if ("list".equals(op)) {
                    String page = request.optString("pageToken");
                    if (page.isEmpty()) listed.clear();
                    String query = "trashed = false and appProperties has { key='silverlightSnapshot' and value='1' }";
                    result = new JSONObject(call("GET", API + "?spaces=appDataFolder&pageSize=100&fields=" + enc("files(id,name,createdTime,appProperties),nextPageToken") + "&q=" + enc(query) + (page.isEmpty()?"":"&pageToken="+enc(page)), null, null));
                    JSONArray files = result.optJSONArray("files");
                    if (files == null) { files = new JSONArray(); result.put("files",files); }
                    for (int i=0;i<files.length();i++) listed.add(files.getJSONObject(i).getString("id"));
                } else if ("download".equals(op)) {
                    String file = request.getString("fileId");
                    if (!listed.contains(file) || !file.matches("[A-Za-z0-9_-]+")) throw new Exception("Choose a snapshot from View cloud copies first.");
                    result = new JSONObject().put("snapshot",call("GET", API+"/"+file+"?alt=media",null,null));
                } else {
                    String snapshot = request.getString("snapshot");
                    byte[] content = snapshot.getBytes(StandardCharsets.UTF_8);
                    if (content.length>LIMIT) throw new Exception("Workspace exceeds the 64 MB transfer limit.");
                    JSONObject envelope = new JSONObject(snapshot);
                    if (!"silverlight-snapshot-v1".equals(envelope.optString("format"))) throw new Exception("Invalid snapshot format.");
                    JSONArray boards = envelope.getJSONObject("workspace").getJSONArray("boards");
                    JSONObject properties = new JSONObject().put("silverlightSnapshot","1").put("platform","Android").put("boards",String.valueOf(boards.length())).put("revision",envelope.getString("revision"));
                    JSONObject metadata = new JSONObject().put("name","silverlight-snapshot-"+UUID.randomUUID()+".json").put("parents",new JSONArray().put("appDataFolder")).put("appProperties",properties);
                    String boundary = "silverlight_"+UUID.randomUUID();
                    byte[] head = ("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+metadata+"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n").getBytes(StandardCharsets.UTF_8);
                    byte[] tail = ("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8);
                    ByteArrayOutputStream body = new ByteArrayOutputStream();body.write(head);body.write(content);body.write(tail);
                    result = new JSONObject(call("POST","https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",body.toByteArray(),"multipart/related; boundary="+boundary));
                }
                activity.runOnUiThread(() -> finish(result,null));
            } catch (Exception error) { activity.runOnUiThread(() -> finish(null,error.getMessage()==null?"Drive transfer failed. Your local workspace is unchanged.":error.getMessage())); }
        });
    }
    private String call(String method,String address,byte[] body,String contentType) throws Exception {
        HttpURLConnection connection=(HttpURLConnection)new URL(address).openConnection();
        connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(120000);connection.setRequestMethod(method);connection.setRequestProperty("Authorization","Bearer "+token);
        try {
            if(body!=null){connection.setDoOutput(true);connection.setRequestProperty("Content-Type",contentType);connection.setFixedLengthStreamingMode(body.length);try(java.io.OutputStream output=connection.getOutputStream()){output.write(body);}}
            int code=connection.getResponseCode();
            if(code==401){String expired=token;token=null;Identity.getAuthorizationClient(activity).clearToken(ClearTokenRequest.builder().setToken(expired).build());throw new Exception("Google session expired. Connect Google and retry.");}
            if(code==403)throw new Exception("Google Drive access was refused. Check Drive API, consent test users, scope and available storage.");
            if(code<200||code>=300)throw new Exception("Google Drive returned HTTP "+code+". Local BOARDS are unchanged. Check cloud copies before retrying an upload.");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){byte[] buffer=new byte[16384];int count;while((count=input.read(buffer))!=-1){if(output.size()+count>LIMIT)throw new Exception("Cloud snapshot exceeds the transfer limit.");output.write(buffer,0,count);}return output.toString("UTF-8");}
        } finally {connection.disconnect();}
    }
    private static String enc(String s)throws Exception{return URLEncoder.encode(s,"UTF-8");}
    private void finish(JSONObject result,String error){if(current==null)return;respond(reply,current.optString("id"),result,error);current=null;reply=null;}
    private void respond(JavaScriptReplyProxy proxy,String id,JSONObject result,String error){try{JSONObject message=new JSONObject().put("channel","silverlight-drive").put("id",id);if(error!=null)message.put("error",error);else message.put("result",result);proxy.postMessage(message.toString());}catch(Exception ignored){}}
    void close(){executor.shutdownNow();token=null;}
}
