package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONObject;
import java.io.*;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Bounded disk staging. Lifecycle interruption deletes incomplete output, never workspace data. */
final class BackupFiles {
    static final int CREATE = 505;
    private final Activity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private File temporary;
    private OutputStream output;
    private Uri destination;
    private String token, beginId;
    private JavaScriptReplyProxy beginReply;
    private volatile boolean closed,interrupted;
    private long progressAt;
    BackupFiles(Activity activity) { this.activity = activity; }
    void receive(String message, JavaScriptReplyProxy proxy) {
        try {
            JSONObject r = new JSONObject(message);
            if (!"arcanum-backup".equals(r.optString("channel"))) return;
            String id = r.optString("id"), op = r.optString("op");if("abort".equals(op))interrupted=true;
            if ("begin".equals(op)) {
                if (token != null || beginReply != null || closed) throw new IOException("Another backup is running.");
                beginReply = proxy; beginId = id;
                String name = r.optString("name", "archives-backup.jsonl").replaceAll("[^a-zA-Z0-9._ -]", "_");
                if (name.length() > 200) name = name.substring(0, 200);
                String mime = r.optString("mime", "application/x-ndjson");
                if (!mime.matches("[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+")) mime = "application/octet-stream";
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,name);
                try { activity.startActivityForResult(intent, CREATE); } catch (Exception e) { beginReply = null; throw e; }
                return;
            }
            executor.execute(() -> {
                try {
                    if (closed || token == null || !token.equals(r.optString("token"))) throw new IOException("Backup session expired.");
                    JSONObject result = new JSONObject();
                    if ("write".equals(op)) {
                        String data = r.getString("data"); if (data.length() > 400000) throw new IOException("Backup block is too large.");
                        byte[] bytes = Base64.decode(data,Base64.NO_WRAP); output.write(bytes); result.put("written",bytes.length);
                    } else if ("commit".equals(op)) {
                        output.close(); output = null;
                        String expected = r.getString("hash");
                        if (!expected.equals(BackupIO.digest(new FileInputStream(temporary),n->pulse(proxy,id,"verifying-file",n),()->closed||interrupted))) throw new IOException("Backup staging verification failed.");
                        try (InputStream in = new FileInputStream(temporary); OutputStream out = activity.getContentResolver().openOutputStream(destination,"wt")) { if (out == null) throw new IOException("Backup destination unavailable."); byte[] buffer = new byte[65536]; int n;long copied=0;pulse(proxy,id,"copying-file",0);while ((n=in.read(buffer))!=-1) { if (closed||interrupted) throw new IOException("Backup interrupted."); out.write(buffer,0,n);copied+=n;pulse(proxy,id,"copying-file",copied); } }
                        if (!expected.equals(BackupIO.digest(activity.getContentResolver().openInputStream(destination),n->pulse(proxy,id,"checking-file",n),()->closed||interrupted))) throw new IOException("Saved backup verification failed.");
                        result.put("verified",true); destination = null; cleanup();
                    } else if ("abort".equals(op)) { cleanup(); result.put("cancelled",true); }
                    else throw new IOException("Unsupported backup operation.");
                    respond(proxy,id,result,null);
                } catch (Exception error) { cleanup(); respond(proxy,id,null,"Backup interrupted or unavailable: " + error.getMessage()); }
            });
        } catch (Exception e) { try { respond(proxy,new JSONObject(message).optString("id"),null,e.getMessage()); } catch (Exception ignored) {} }
    }
    void result(int code,Intent data) {
        JavaScriptReplyProxy proxy=beginReply; String id=beginId; beginReply=null; beginId=null;
        if (proxy==null) return;
        try {
            if (code!=Activity.RESULT_OK || data==null || data.getData()==null) throw new IOException("Backup cancelled.");
            Uri candidate=data.getData();
            try(android.database.Cursor info=activity.getContentResolver().query(candidate,new String[]{android.provider.OpenableColumns.SIZE},null,null,null)) {
                if(info==null||!info.moveToFirst()||info.isNull(0)||info.getLong(0)!=0)throw new IOException("Choose a new, empty backup file so an existing backup is never overwritten.");
            }
            destination=candidate; temporary=File.createTempFile("archives-backup-",".partial",activity.getCacheDir()); output=new FileOutputStream(temporary); interrupted=false;token=UUID.randomUUID().toString();activity.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); respond(proxy,id,new JSONObject().put("token",token),null);
        } catch (Exception e) { cleanup(); respond(proxy,id,null,e.getMessage()); }
    }
    private void pulse(JavaScriptReplyProxy proxy,String id,String stage,long bytes){long now=android.os.SystemClock.elapsedRealtime();if(bytes!=0&&now-progressAt<500)return;progressAt=now;long total=temporary == null ? 0 : temporary.length();activity.runOnUiThread(()->{if(closed)return;try{proxy.postMessage(new JSONObject().put("channel","arcanum-backup").put("id",id).put("progress",new JSONObject().put("stage",stage).put("bytes",bytes).put("total",total)).toString());}catch(Exception ignored){}});}
    private void respond(JavaScriptReplyProxy proxy,String id,JSONObject result,String error) { activity.runOnUiThread(()->{if(closed)return;try{JSONObject r=new JSONObject().put("channel","arcanum-backup").put("id",id);if(error!=null)r.put("error",error);else r.put("result",result);proxy.postMessage(r.toString());}catch(Exception ignored){}}); }
    private void cleanup(){try{if(output!=null)output.close();}catch(Exception ignored){}output=null;if(temporary!=null)temporary.delete();temporary=null;if(destination!=null){try{DocumentsContract.deleteDocument(activity.getContentResolver(),destination);}catch(Exception ignored){}}destination=null;token=null;activity.runOnUiThread(()->activity.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));}
    void pause(){if(token!=null){interrupted=true;executor.execute(this::cleanup);}}
    void close(){closed=true;executor.execute(this::cleanup);executor.shutdown();}
}
