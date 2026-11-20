package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = 29)
public class SyncDiagnosticSaveTest {
    @Test public void exportsToSelectedDocumentsAndHandlesCancellationAndWriteFailure() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        Activity activity = instrumentation.startActivitySync(new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
        ContentResolver resolver = context.getContentResolver();
        String filename = "archives-of-arcanum-sync-diagnostics.json";
        Uri downloads = null, subfolder = null;
        var nextResult = new AtomicReference<Instrumentation.ActivityResult>();
        var picker = new AtomicReference<Intent>();
        // Supply document picker results deterministically and exercise real ContentResolver writes.
        var monitor = new Instrumentation.ActivityMonitor() {
            @Override public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                if (!Intent.ACTION_CREATE_DOCUMENT.equals(intent.getAction())) return null;
                picker.set(intent);
                return nextResult.get();
            }
        };
        instrumentation.addMonitor(monitor);
        try {
            waitFor(activity, "typeof document.querySelector('#driveSync')?.onclick === 'function' && Boolean(window.ArcanumSyncDiagnostics)", "true");
            evaluate(activity, "document.querySelector('#driveSync').click()");
            waitFor(activity, "Boolean(document.querySelector('#autoDiagnostics'))", "true");
            downloads = newDocument(resolver, "Download/", filename);
            subfolder = newDocument(resolver, "Download/ArcanumTest/", filename);
            for (Uri destination : new Uri[]{downloads, subfolder}) {
                nextResult.set(new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(destination)));
                evaluate(activity, "document.querySelector('#autoDiagnostics').click()");
                waitFor(activity, status(), JSONObject.quote("Diagnostic report saved."));
                try (InputStream input = resolver.openInputStream(destination)) {
                    assertNotNull(input);
                    JSONObject report = new JSONObject(new String(input.readAllBytes(), StandardCharsets.UTF_8));
                    assertEquals("silverlight-sync-diagnostics-v1", report.getString("format"));
                    assertNotNull(report.getJSONArray("events"));
                }
            }
            assertNotNull(picker.get());
            assertEquals(filename, picker.get().getStringExtra(Intent.EXTRA_TITLE));
            assertEquals("application/json", picker.get().getType());
            assertTrue(picker.get().hasCategory(Intent.CATEGORY_OPENABLE));

            nextResult.set(new Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null));
            evaluate(activity, "document.querySelector('#autoDiagnostics').click()");
            waitFor(activity, status(), JSONObject.quote("Diagnostic save cancelled."));
            nextResult.set(new Instrumentation.ActivityResult(Activity.RESULT_OK,
                new Intent().setData(Uri.parse("content://com.cosmerearchives.unavailable/document/test"))));
            evaluate(activity, "document.querySelector('#autoDiagnostics').click()");
            waitFor(activity, "Boolean(("+status()+")?.startsWith('Could not save diagnostics.'))", "true");
        } finally {
            instrumentation.removeMonitor(monitor);
            if (downloads != null) resolver.delete(downloads, null, null);
            if (subfolder != null) resolver.delete(subfolder, null, null);
            instrumentation.runOnMainSync(activity::finish);
        }
    }

    private static Uri newDocument(ContentResolver resolver, String path, String filename) {
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
        values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, path);
        Uri result = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        assertNotNull(result);
        return result;
    }

    private static String status() {
        return "document.querySelector('#autoDiagnosticStatus')?.textContent";
    }

    private static void waitFor(Activity activity, String script, String expected) throws Exception {
        long end = System.currentTimeMillis() + 15000;
        String actual;
        do {
            actual = evaluate(activity, script);
            if (expected.equals(actual)) return;
            Thread.sleep(100);
        } while (System.currentTimeMillis() < end);
        assertEquals(script, expected, actual);
    }

    private static String evaluate(Activity activity, String script) throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        instrumentation.runOnMainSync(() -> {
            ViewGroup content = activity.findViewById(android.R.id.content);
            ((WebView) content.getChildAt(0)).evaluateJavascript(script, value -> {
                result.set(value);
                done.countDown();
            });
        });
        assertTrue(done.await(5, TimeUnit.SECONDS));
        return result.get();
    }
}
