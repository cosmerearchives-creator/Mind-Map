package com.cosmerearchives.silverlight;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.*;
import java.io.*;
import java.util.concurrent.*;
import java.util.zip.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class SharingTest {
    public static class FixtureProvider extends ContentProvider {
        public boolean onCreate(){return true;}
        public String getType(Uri uri){return "application/vnd.arcanum.package+zip";}
        public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{return ParcelFileDescriptor.open(new File(getContext().getCacheDir(),uri.getLastPathSegment()),ParcelFileDescriptor.MODE_READ_ONLY);}
        public android.database.Cursor query(Uri u,String[] p,String s,String[] a,String o){return null;}
        public Uri insert(Uri u,ContentValues v){return null;} public int delete(Uri u,String s,String[] a){return 0;}public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
    }
    private String js(Activity activity,String script)throws Exception{
        CountDownLatch latch=new CountDownLatch(1);String[] value={null};
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->((WebView)((android.view.ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0)).evaluateJavascript(script,v->{value[0]=v;latch.countDown();}));
        assertTrue(latch.await(5,TimeUnit.SECONDS));return value[0];
    }
    @Test public void coldActivityShareSavesBeforeAcknowledgingAndWarmShareDeduplicates()throws Exception{
        var instrumentation=InstrumentationRegistry.getInstrumentation();Context sender=instrumentation.getContext(),target=instrumentation.getTargetContext();
        File fixture=new File(sender.getCacheDir(),"fixture.arcanum");
        JSONObject item=new JSONObject().put("sourceId","instrumentation:wob1").put("title","Offline shared WoB").put("body","Transcript and personal notes").put("tags",new JSONArray().put("Cosmere")).put("sourceUrl","https://wob.coppermind.net/entry/1/").put("metadata",new JSONObject().put("needs_review",1)).put("assets",new JSONArray());
        JSONObject manifest=new JSONObject().put("format","arcanum-package").put("version",1).put("packageId","instrumentation").put("origin","android-test").put("items",new JSONArray().put(item));
        try(ZipOutputStream zip=new ZipOutputStream(new FileOutputStream(fixture))){zip.putNextEntry(new ZipEntry("manifest.json"));zip.write(manifest.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));zip.closeEntry();}
        Activity activity=null;
        for(int round=0;round<2;round++){
            CountDownLatch acked=new CountDownLatch(1);int[] code={0};String action=target.getPackageName()+".TEST_ACK_"+round;
            BroadcastReceiver receiver=new BroadcastReceiver(){public void onReceive(Context c,Intent i){code[0]=getResultCode();acked.countDown();}};
            if(Build.VERSION.SDK_INT>=33)target.registerReceiver(receiver,new IntentFilter(action),Context.RECEIVER_NOT_EXPORTED);else target.registerReceiver(receiver,new IntentFilter(action));
            PendingIntent ack=PendingIntent.getBroadcast(target,round,new Intent(action).setPackage(target.getPackageName()),PendingIntent.FLAG_ONE_SHOT|PendingIntent.FLAG_IMMUTABLE);
            Uri uri=Uri.parse("content://com.cosmerearchives.silverlight.test.fixtures/fixture.arcanum");sender.grantUriPermission(target.getPackageName(),uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent intent=new Intent(Intent.ACTION_SEND).setClass(target,MainActivity.class).setType("application/vnd.arcanum.package+zip").putExtra(Intent.EXTRA_STREAM,uri).putExtra("org.arcanum.extra.SAVE_ACK",ack).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("fixture",uri));
            if(round==0)activity=instrumentation.startActivitySync(intent);else target.startActivity(intent);
            assertTrue("Saved acknowledgment must arrive",acked.await(90,TimeUnit.SECONDS));assertEquals(Activity.RESULT_OK,code[0]);target.unregisterReceiver(receiver);
            js(activity,"window.testSaved=null;var q=indexedDB.open('openboard-workspace');q.onsuccess=()=>SilverlightAssetStore.read(q.result,'main',true).then(r=>window.testSaved=r.state.boards.find(b=>b.id==='arcanum-global-dumping-ground').cards.filter(c=>c.source?.id==='instrumentation:wob1').length)");
            long until=System.currentTimeMillis()+10000;String count="null";while(System.currentTimeMillis()<until){count=js(activity,"window.testSaved");if("1".equals(count))break;Thread.sleep(100);}assertEquals("Durably saved exactly one copy", "1",count);
            instrumentation.getUiAutomation().executeShellCommand("input keyevent 4").close();
        }
    }
}
