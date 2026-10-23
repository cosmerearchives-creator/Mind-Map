package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.util.Base64;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Called only by the explicit Paste action through a main-frame, origin-restricted bridge. */
final class ClipboardBridge {
    static void read(Activity activity, String message, JavaScriptReplyProxy proxy) {
        final JSONObject request;
        try { request = new JSONObject(message); } catch (Exception ignored) { return; }
        if ("media".equals(request.optString("op"))) { MilanoteMedia.read(request, proxy); return; }
        if (!"read".equals(request.optString("op"))) return;
        final String id = request.optString("id");
        activity.runOnUiThread(() -> {
            try {
                ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = clipboard.getPrimaryClip();
                // Capture text/URI while the foreground activity has clipboard access.
                JSONArray texts = new JSONArray();
                java.util.ArrayList<Uri> images = new java.util.ArrayList<>();
                if (clip != null) for (int i = 0; i < Math.min(clip.getItemCount(), 32); i++) {
                    ClipData.Item item = clip.getItemAt(i);
                    Uri uri = item.getUri();
                    String type = uri == null ? null : activity.getContentResolver().getType(uri);
                    if (uri != null && "content".equals(uri.getScheme()) && type != null && type.startsWith("image/")) images.add(uri);
                    else {
                        CharSequence text = item.getText();
                        if (item.getHtmlText() != null) texts.put(new JSONObject().put("type", "text/html").put("text", item.getHtmlText()));
                        if (text != null) texts.put(new JSONObject().put("type", "text/plain").put("text", text.toString()));
                        else if (uri != null) texts.put(new JSONObject().put("type", "text/plain").put("text", uri.toString()));
                    }
                }
                new Thread(() -> {
                    JSONObject response = new JSONObject();
                    try {
                        int total = 0;
                        for (Uri uri : images) {
                            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                            try (InputStream input = activity.getContentResolver().openInputStream(uri)) {
                                if (input == null) throw new Exception("Image is unavailable.");
                                byte[] chunk = new byte[8192]; int count;
                                while ((count = input.read(chunk)) != -1) {
                                    total += count;
                                    if (total > 8 * 1024 * 1024) throw new Exception("Clipboard images exceed 8 MB. Paste smaller images.");
                                    bytes.write(chunk, 0, count);
                                }
                            }
                            texts.put(new JSONObject().put("type", activity.getContentResolver().getType(uri)).put("base64", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)));
                        }
                        response.put("id", id).put("items", texts);
                    } catch (Exception error) {
                        try { response.put("id", id).put("error", "Clipboard image could not be read. Copy it again or paste a smaller image."); } catch (Exception ignored) { }
                    }
                    activity.runOnUiThread(() -> proxy.postMessage(response.toString()));
                }, "silverlight-clipboard").start();
            } catch (Exception error) {
                try { proxy.postMessage(new JSONObject().put("id", id).put("error", "Clipboard is unavailable. Copy content again while Silverlight is open.").toString()); } catch (Exception ignored) { }
            }
        });
    }
}
