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
    private static final int LIMIT = 256 * 1024 * 1024;
    private final Activity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService transfers = Executors.newFixedThreadPool(3);
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
        if (!java.util.Arrays.asList("connect", "session", "list", "upload", "download", "prune", "batch", "changes").contains(op)) { finish(null, "Unsupported Drive operation."); return; }
        if (token == null || "connect".equals(op) || "session".equals(op)) authorize(); else execute();
    }
    private void authorize() {
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(SCOPE))).build();
        Identity.getAuthorizationClient(activity).authorize(request).addOnSuccessListener(result -> {
            if (result.hasResolution()) {
                if (current == null) return;
                if (current.optBoolean("silent")) { try { finish(new JSONObject().put("connected",false), null); } catch (Exception ignored) { finish(null,"Google sign-in required."); } return; }
                try { activity.startIntentSenderForResult(result.getPendingIntent().getIntentSender(), AUTHORIZE, null, 0, 0, 0); }
                catch (Exception ignored) { finish(null, "Google sign-in could not open. Check Google Play services and OAuth setup."); }
            } else authorized(result);
        }).addOnFailureListener(error -> finish(null, "Google authorization failed. Check Drive API, test users, and Android OAuth package/release certificate in the configured Google Cloud project."));
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
        if ("connect".equals(current.optString("op"))) listed.clear(); execute();
    }
    private void execute() {
        final JSONObject request = current;
        executor.execute(() -> {
            try {
                String op = request.getString("op"); JSONObject result;
                JSONObject user = new JSONObject(call("GET", "https://www.googleapis.com/drive/v3/about?fields=user(permissionId)", null, null)).getJSONObject("user");
                String accountId = user.getString("permissionId");
                if (request.has("expectedAccount") && !accountId.equals(request.getString("expectedAccount"))) throw new Exception("Google account changed. Reconnect the original account before syncing.");
                if ("connect".equals(op) || "session".equals(op)) result = new JSONObject().put("platform", "Android").put("connected",true).put("accountId",accountId).put("features",new JSONArray().put("fast-transfer-v3").put("parallel-parts-v1").put("drive-changes-v1"));
                else if ("changes".equals(op)) {
                    String dataset=request.getString("dataset"),page=request.optString("pageToken");
                    if(!dataset.matches("[A-Za-z0-9_-]{1,300}"))throw new Exception("Invalid sync workspace ID.");
                    if(page.length()>2048||page.chars().anyMatch(c->Character.isISOControl(c)))throw new Exception("Invalid changes cursor.");
                    String api="https://www.googleapis.com/drive/v3/changes";
                    if(page.isEmpty()) {JSONObject start=new JSONObject(call("GET",api+"/startPageToken?fields=startPageToken",null,null));result=new JSONObject().put("bootstrap",true).put("cursor",start.getString("startPageToken")).put("files",new JSONArray());}
                    else {
                        JSONObject changes=new JSONObject(call("GET",api+"?spaces=appDataFolder&includeRemoved=true&pageSize=1000&pageToken="+enc(page)+"&fields="+enc("nextPageToken,newStartPageToken,changes(fileId,removed,file(id,createdTime,appProperties,trashed))"),null,null));
                        JSONArray files=new JSONArray(),items=changes.optJSONArray("changes");
                        for(int i=0;items!=null&&i<items.length();i++){JSONObject change=items.getJSONObject(i),file=change.optJSONObject("file"),props=file==null?null:file.optJSONObject("appProperties");
                            if(change.optBoolean("removed")||file==null||file.optBoolean("trashed")||props==null||!"1".equals(props.optString("silverlightSnapshot"))||!"auto-v1".equals(props.optString("protocol"))||!dataset.equals(props.optString("dataset")))continue;
                            listed.add(file.getString("id"));files.put(file);
                        }
                        result=new JSONObject().put("files",files).put("nextPageToken",changes.optString("nextPageToken")).put("cursor",changes.optString("newStartPageToken"));
                    }
                }
                else if ("list".equals(op)) {
                    String page = request.optString("pageToken");
                    if (page.isEmpty()) listed.clear();
                    String query = "trashed = false and appProperties has { key='silverlightSnapshot' and value='1' }";
                    if (request.has("dataset")) {
                        String dataset = request.getString("dataset");
                        if (!dataset.matches("[A-Za-z0-9_-]{1,300}")) throw new Exception("Invalid sync workspace ID.");
                        query += " and appProperties has { key='protocol' and value='auto-v1' } and appProperties has { key='dataset' and value='" + dataset + "' }";
                        if (request.has("after")) {
                            String after = request.getString("after");
                            if (!after.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z")) throw new Exception("Invalid sync poll cursor.");
                            query += " and createdTime >= '" + after + "'";
                        }
                    }
                    result = new JSONObject(call("GET", API + "?spaces=appDataFolder&pageSize=100&fields=" + enc("files(id,name,createdTime,appProperties),nextPageToken") + "&q=" + enc(query) + (page.isEmpty()?"":"&pageToken="+enc(page)), null, null));
                    JSONArray files = result.optJSONArray("files");
                    if (files == null) { files = new JSONArray(); result.put("files",files); }
                    for (int i=0;i<files.length();i++) listed.add(files.getJSONObject(i).getString("id"));
                } else if ("batch".equals(op)) {
                    JSONArray items=request.getJSONArray("requests");if(items.length()<1||items.length()>3)throw new Exception("A transfer batch permits one to three parts.");
                    java.util.List<java.util.concurrent.Callable<JSONObject>> jobs=new java.util.ArrayList<>();
                    for(int i=0;i<items.length();i++){final JSONObject item=items.getJSONObject(i);jobs.add(()->{JSONObject entry=new JSONObject();try{JSONObject value;
                        if("download".equals(item.optString("op"))){String id=item.getString("fileId");if(!listed.contains(id)||!id.matches("[A-Za-z0-9_-]+"))throw new Exception("Choose a listed transfer part.");value=new JSONObject().put("snapshot",call("GET",API+"/"+id+"?alt=media",null,null));}
                        else if("upload".equals(item.optString("op"))){String text=item.getString("snapshot");if(text.getBytes(StandardCharsets.UTF_8).length>8*1024*1024||!"silverlight-part-v2".equals(new JSONObject(text).optString("format")))throw new Exception("Only bounded immutable parts can be batch uploaded.");value=upload(item);}
                        else throw new Exception("Invalid transfer batch operation.");entry.put("result",value);
                    }catch(Exception error){entry.put("error",error.getMessage()==null?"Part transfer failed":error.getMessage());}return entry;});}
                    JSONArray values=new JSONArray();for(java.util.concurrent.Future<JSONObject> job:transfers.invokeAll(jobs))values.put(job.get());result=new JSONObject().put("results",values);
                } else if ("download".equals(op)) {
                    String file = request.getString("fileId");
                    if (!listed.contains(file) || !file.matches("[A-Za-z0-9_-]+")) throw new Exception("Choose a snapshot from View cloud copies first.");
                    result = new JSONObject().put("snapshot",call("GET", API+"/"+file+"?alt=media",null,null));
                } else if ("prune".equals(op)) {
                    String file = request.getString("fileId"), replacementId = request.getString("replacementId");
                    if(file.equals(replacementId) || !listed.contains(file) || !listed.contains(replacementId) || !(file+replacementId).matches("[A-Za-z0-9_-]+")) throw new Exception("Cleanup requires listed automatic copies.");
                    JSONObject old = new JSONObject(call("GET",API+"/"+file+"?fields=id,createdTime,appProperties,spaces",null,null));
                    JSONObject replacement = new JSONObject(call("GET",API+"/"+replacementId+"?fields=id,createdTime,appProperties,spaces",null,null));
                    for(JSONObject item: new JSONObject[]{old,replacement}) {
                        JSONObject props=item.getJSONObject("appProperties"); boolean appdata=false;
                        JSONArray parents=item.optJSONArray("spaces");if(parents!=null)for(int i=0;i<parents.length();i++)if("appDataFolder".equals(parents.getString(i)))appdata=true;
                        if(!appdata || !"1".equals(props.optString("silverlightSnapshot")) || !"auto-v1".equals(props.optString("protocol")) || !request.getString("dataset").equals(props.optString("dataset")) || !request.getString("device").equals(props.optString("device")))throw new Exception("Cleanup cannot remove this cloud file.");
                    }
                    long oldTime=java.time.Instant.parse(old.getString("createdTime")).toEpochMilli(),newTime=java.time.Instant.parse(replacement.getString("createdTime")).toEpochMilli(),now=System.currentTimeMillis();
                    if(now-oldTime<=30L*86400000 || newTime<=oldTime || now-newTime>86400000 || !request.getString("revision").equals(replacement.getJSONObject("appProperties").optString("revision")))throw new Exception("Cleanup replacement is not confirmed.");
                    call("DELETE",API+"/"+file,null,null);listed.remove(file);result=new JSONObject().put("removed",true);
                } else {
                    result = upload(request);
                }
                activity.runOnUiThread(() -> finish(result,null));
            } catch (Exception error) { activity.runOnUiThread(() -> finish(null,error.getMessage()==null?"Drive transfer failed. Your local workspace is unchanged.":error.getMessage())); }
        });
    }
    private JSONObject upload(JSONObject request) throws Exception {
                    String snapshot = request.getString("snapshot");
                    byte[] content = snapshot.getBytes(StandardCharsets.UTF_8);
                    if (content.length>LIMIT) throw new Exception("A single transfer request exceeds 256 MB. Update both devices to use multipart transfers.");
                    JSONObject envelope = new JSONObject(snapshot);
                    if (!"silverlight-snapshot-v1".equals(envelope.optString("format")) && !"silverlight-auto-v1".equals(envelope.optString("format")) && !"silverlight-transfer-v2".equals(envelope.optString("format")) && !"silverlight-transfer-v3".equals(envelope.optString("format")) && !"silverlight-part-v2".equals(envelope.optString("format"))) throw new Exception("Invalid snapshot format.");
                    JSONArray boards = envelope.getJSONObject("workspace").getJSONArray("boards");
                    JSONObject properties = new JSONObject().put("silverlightSnapshot","1").put("platform","Android").put("boards",String.valueOf(boards.length())).put("revision",envelope.getString("revision"));
                    boolean part = "silverlight-part-v2".equals(envelope.optString("format"));
                    boolean automatic = "silverlight-auto-v1".equals(envelope.optString("format")) || "silverlight-auto-v1".equals(envelope.optString("originalFormat"));
                    properties.put("protocol",part?"part-v2":automatic?"auto-v1":"manual-v1").put("dataset",automatic?envelope.getJSONObject("auto").getString("dataset"):"").put("device",automatic?envelope.getJSONObject("auto").optString("device"):"");
                    JSONObject metadata = new JSONObject().put("name","silverlight-snapshot-"+UUID.randomUUID()+".json").put("parents",new JSONArray().put("appDataFolder")).put("appProperties",properties);
                    String boundary = "silverlight_"+UUID.randomUUID();
                    byte[] head = ("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+metadata+"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n").getBytes(StandardCharsets.UTF_8);
                    byte[] tail = ("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8);
                    ByteArrayOutputStream body = new ByteArrayOutputStream();body.write(head);body.write(content);body.write(tail);
                    return new JSONObject(call("POST","https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",body.toByteArray(),"multipart/related; boundary="+boundary));
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
    void close(){executor.shutdownNow();transfers.shutdownNow();token=null;}
}
