package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceResponse;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONObject;
import java.io.*;
import java.util.UUID;

/** Copy granted content immediately; never expose arbitrary content URIs to the WebView. */
final class ArcanumShare {
    static final String ACK = "org.arcanum.extra.SAVE_ACK";
    private final Activity activity;
    private volatile File file;
    private String token;
    private PendingIntent ack;
    private boolean copying;
    ArcanumShare(Activity activity, Bundle saved) {
        this.activity = activity;
        if (saved != null && saved.containsKey("arcanumToken")) {
            token = saved.getString("arcanumToken");
            file = new File(activity.getCacheDir(), "arcanum-" + token + ".zip");
            ack = saved.getParcelable("arcanumAck");
            if (!file.isFile()) { file = null; token = null; ack = null; }
        }
    }
    synchronized void save(Bundle out) {
        if (file != null) { out.putString("arcanumToken", token); out.putParcelable("arcanumAck", ack); }
    }
    synchronized void accept(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        if (file != null || copying) { message("Finish the pending Archives import, then share the next package again."); return; }
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null || !"content".equals(uri.getScheme())) { message("Share a .arcanum file using a content URI."); return; }
        PendingIntent callback = intent.getParcelableExtra(ACK);
        copying = true;
        new Thread(() -> {
            String next = UUID.randomUUID().toString();
            File target = new File(activity.getCacheDir(), "arcanum-" + next + ".zip");
            try (InputStream input = activity.getContentResolver().openInputStream(uri); OutputStream output = new FileOutputStream(target)) {
                if (input == null) throw new IOException("Cannot read shared file.");
                byte[] buf = new byte[32768]; long total = 0; int n;
                while ((n = input.read(buf)) != -1) { total += n; if (total > 32L*1024*1024) throw new IOException("Transfer exceeds 32 MiB."); output.write(buf, 0, n); }
                if (total == 0) throw new IOException("Empty transfer.");
                synchronized (this) { token = next; ack = callback; file = target; }
            } catch (Exception e) { target.delete(); message("Archives import could not start: " + e.getMessage()); }
            finally { synchronized (this) { copying = false; } }
        }, "arcanum-share-copy").start();
    }
    synchronized WebResourceResponse resource(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost()) || file == null || !uri.getPath().equals("/arcanum/" + token)) return null;
        try { return new WebResourceResponse("application/zip", null, new FileInputStream(file)); }
        catch (IOException e) { return null; }
    }
    synchronized void receive(String raw, JavaScriptReplyProxy proxy) {
        try {
            JSONObject request = new JSONObject(raw);
            if ("poll".equals(request.optString("action"))) {
                proxy.postMessage(new JSONObject().put("token", file == null ? "" : token).toString());
            } else if (file != null && token.equals(request.optString("token")) && "saved".equals(request.optString("action"))) {
                // Only the trusted main-frame importer invokes this after atomic durable save.
                if (ack != null) try { ack.send(activity, Activity.RESULT_OK, null); } catch (PendingIntent.CanceledException ignored) { }
                file.delete(); file = null; token = null; ack = null;
            }
        } catch (Exception e) { message("Share response failed: " + e.getMessage()); }
    }
    private void message(String message) { activity.runOnUiThread(() -> new android.app.AlertDialog.Builder(activity).setTitle("Archives transfer").setMessage(message).setPositiveButton("OK", null).show()); }
}
