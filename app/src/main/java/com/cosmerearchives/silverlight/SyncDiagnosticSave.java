package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** Saves one bounded diagnostic report through the Android document picker. */
final class SyncDiagnosticSave {
    static final int CREATE = 506;
    private static final int MAX_BYTES = 512 * 1024;
    private final Activity activity;
    private final ExecutorService writer = Executors.newSingleThreadExecutor();
    private byte[] report;
    private Consumer<String> reply;
    private boolean closed;

    SyncDiagnosticSave(Activity activity) {
        this.activity = activity;
    }

    void begin(String json, Consumer<String> response) {
        if (closed || reply != null) return;
        if (json.isEmpty() || json.length() > MAX_BYTES) {
            response.accept("invalid");
            return;
        }
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) {
            response.accept("invalid");
            return;
        }
        report = bytes;
        reply = response;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .setType("application/json")
            .addCategory(Intent.CATEGORY_OPENABLE)
            .putExtra(Intent.EXTRA_TITLE, "archives-of-arcanum-sync-diagnostics.json");
        try {
            activity.startActivityForResult(intent, CREATE);
        } catch (RuntimeException error) {
            finish("picker-failed");
        }
    }

    void result(int code, Intent data) {
        if (reply == null || report == null) return;
        Uri destination = data == null ? null : data.getData();
        if (code == Activity.RESULT_CANCELED) {
            finish("cancelled");
            return;
        }
        if (code != Activity.RESULT_OK || destination == null || !"content".equals(destination.getScheme())) {
            finish("write-failed");
            return;
        }
        byte[] bytes = report;
        report = null;
        reply.accept("writing");
        writer.execute(() -> {
            String result = "saved";
            try (OutputStream output = activity.getContentResolver().openOutputStream(destination, "wt")) {
                if (output == null) throw new IOException("Document provider unavailable.");
                output.write(bytes);
            } catch (IOException | RuntimeException error) {
                result = "write-failed";
            }
            String status = result;
            activity.runOnUiThread(() -> finish(status));
        });
    }

    private void finish(String status) {
        Consumer<String> response = reply;
        reply = null;
        report = null;
        if (response != null && !closed) response.accept(status);
    }

    void close() {
        closed = true;
        reply = null;
        report = null;
        writer.shutdown();
    }
}
