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

/** Explicit clipboard actions through the main-frame, origin-restricted bridge. */
final class ClipboardBridge {
    static void read(Activity activity, String message, JavaScriptReplyProxy proxy) {
        final JSONObject request;
        try { request = new JSONObject(message); } catch (Exception ignored) { return; }
        if ("preview".equals(request.optString("op"))||"previewImage".equals(request.optString("op"))) { WebPreview.read(request, proxy); return; }
        if ("media".equals(request.optString("op"))) { MilanoteMedia.read(request, proxy); return; }
        if ("write".equals(request.optString("op"))) {
            activity.runOnUiThread(() -> {
                JSONObject response = new JSONObject();
                try {
                    response.put("id", request.optString("id"));
                    String text = request.getString("text");
                    // Stay below Android's Binder transaction budget. Large selections
                    // can still be copied directly between Boards without the clipboard.
                    if (text.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 512 * 1024) throw new Exception("This clipboard selection is too large. Use Copy to Board instead.");
                    JSONObject selection = new JSONObject(text);
                    if (!"silverlight-selection-v1".equals(selection.optString("format")) && !("silverlight-assets-v1".equals(selection.optString("format")) && "silverlight-selection-v1".equals(selection.getJSONObject("document").optString("format")))) throw new Exception("Invalid Silverlight clipboard selection.");
                    ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                    clipboard.setPrimaryClip(ClipData.newPlainText("Silverlight selection", text));
                    response.put("items", new JSONArray());
                } catch (Exception error) {
                    try { response.put("error", error.getMessage() == null ? "Clipboard is unavailable. Use Copy to Board instead." : error.getMessage()); } catch (Exception ignored) { }
                }
                try { proxy.postMessage(response.toString()); } catch (Exception ignored) { }
            });
            return;
        }
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
