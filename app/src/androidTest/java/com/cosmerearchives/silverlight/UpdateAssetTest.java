package com.cosmerearchives.silverlight;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

public class UpdateAssetTest {
    private JSONObject asset(String name) throws Exception {
        return new JSONObject().put("name", name).put("browser_download_url",
            "https://github.com/cosmerearchives-creator/Mind-Map/releases/download/v0.18.1/" + name);
    }
    @Test public void prefersNewNameAndSupportsLegacy() throws Exception {
        JSONObject modern = asset("Archives-of-Arcanum.apk"), legacy = asset("Silverlight.apk");
        assertEquals(modern.getString("browser_download_url"), MainActivity.updateAssetUrl(new JSONArray().put(legacy).put(modern)));
        assertEquals(modern.getString("browser_download_url"), MainActivity.updateAssetUrl(new JSONArray().put(modern)));
        assertEquals(legacy.getString("browser_download_url"), MainActivity.updateAssetUrl(new JSONArray().put(legacy)));
        assertNull(MainActivity.updateAssetUrl(new JSONArray().put(asset("Silverlight-Setup.exe"))));
        modern.put("browser_download_url", "https://example.com/untrusted.apk");
        assertEquals(legacy.getString("browser_download_url"), MainActivity.updateAssetUrl(new JSONArray().put(modern).put(legacy)));
        assertNull(MainActivity.updateAssetUrl(new JSONArray().put(modern).put(JSONObject.NULL)));
        assertNull(MainActivity.updateAssetUrl(null));
    }
}
