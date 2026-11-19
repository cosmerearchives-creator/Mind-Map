package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.content.Intent;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class CodexPdfTest {
    @Test public void importsPackagedPdfOffline() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        Activity activity = instrumentation.startActivitySync(new Intent(
            instrumentation.getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        try {
            long readyUntil = System.currentTimeMillis() + 15000;
            String ready;
            do {
                ready = evaluate(activity, "typeof SilverlightCodexImport === 'object'");
                if (!"true".equals(ready)) Thread.sleep(100);
            } while (!"true".equals(ready) && System.currentTimeMillis() < readyUntil);
            assertEquals("Codex importer must load in WebView", "true", ready);

            evaluate(activity, "window.pdfTestResult = null; SilverlightCodexImport.analyze(new File(["
                + JSONObject.quote(pdfFixture()) + "], 'fixture.pdf', {type:'application/pdf'})).then(result => {"
                + "const chapter = result.chapters[0]; window.pdfTestResult = chapter.pdfPage + ' ' + chapter.text;"
                + "}).catch(error => window.pdfTestResult = error.message)");
            long deadline = System.currentTimeMillis() + 30000;
            String result;
            do {
                result = evaluate(activity, "window.pdfTestResult");
                if ("null".equals(result)) Thread.sleep(100);
            } while ("null".equals(result) && System.currentTimeMillis() < deadline);
            assertEquals("The bundled PDF worker should extract text offline", "\"1 Android PDF text\"", result);
        } finally {
            instrumentation.runOnMainSync(activity::finish);
        }
    }

    private static String evaluate(Activity activity, String script) throws InterruptedException {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        CountDownLatch latch = new CountDownLatch(1);
        String[] result = {null};
        instrumentation.runOnMainSync(() -> {
            ViewGroup content = activity.findViewById(android.R.id.content);
            ((WebView) content.getChildAt(0)).evaluateJavascript(script, value -> {
                result[0] = value;
                latch.countDown();
            });
        });
        assertTrue("WebView should answer", latch.await(5, TimeUnit.SECONDS));
        return result[0];
    }

    private static String pdfFixture() {
        String stream = "BT /F1 12 Tf 40 720 Td (Android PDF text) Tj ET";
        String[] objects = {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]"
                + " /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            "<< /Length " + stream.length() + " >>\nstream\n" + stream + "\nendstream"
        };
        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        StringBuilder xref = new StringBuilder("xref\n0 6\n0000000000 65535 f \n");
        for (int i = 0; i < objects.length; i++) {
            xref.append(String.format(Locale.ROOT, "%010d 00000 n \n", pdf.length()));
            pdf.append(i + 1).append(" 0 obj\n").append(objects[i]).append("\nendobj\n");
        }
        int offset = pdf.length();
        return pdf.append(xref).append("trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n")
            .append(offset).append("\n%%EOF\n").toString();
    }
}
