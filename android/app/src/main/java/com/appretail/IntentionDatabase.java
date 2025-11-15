package com.wingsfly;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class IntentionDatabase {
    
    private static final String TAG = "IntentionDB";
    
    // ✅ Supabase credentials from BuildConfig (loaded from local.properties)
    private static final String SUPABASE_URL = BuildConfig.SUPABASE_URL;
    private static final String SUPABASE_API_KEY = BuildConfig.SUPABASE_ANON_KEY;
    
    public static class IntentionData {
        public String id;
        public String intentionText;
        public String audioFileUrl;
        public String audioFileName;
        public String type; // "text" or "audio"
        
        public IntentionData(String id, String intentionText, String audioFileUrl, String audioFileName, String type) {
            this.id = id;
            this.intentionText = intentionText;
            this.audioFileUrl = audioFileUrl;
            this.audioFileName = audioFileName;
            this.type = type;
        }
        
        public boolean isAudioType() {
            return "audio".equalsIgnoreCase(type);
        }
        
        public boolean isTextType() {
            return "text".equalsIgnoreCase(type);
        }
        
        @Override
        public String toString() {
            return "IntentionData{" +
                    "id='" + id + '\'' +
                    ", type='" + type + '\'' +
                    ", intentionText='" + intentionText + '\'' +
                    ", audioFileUrl='" + audioFileUrl + '\'' +
                    ", audioFileName='" + audioFileName + '\'' +
                    '}';
        }
    }
    
    /**
     * Fetch intention settings from Supabase
     * Returns the most recent intention configuration set by admin
     */
    public static IntentionData fetchIntentionData() {
        IntentionData intentionData = null;
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Fetching intention data from Supabase...");
            
            // Build URL with query parameters - get most recent record
            String urlString = SUPABASE_URL + "/rest/v1/intention_settings" +
                    "?select=*" +
                    "&order=created_at.desc" +
                    "&limit=1";
            
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers
            connection.setRequestMethod("GET");
            connection.setRequestProperty("apikey", SUPABASE_API_KEY);
            connection.setRequestProperty("Authorization", "Bearer " + SUPABASE_API_KEY);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            int responseCode = connection.getResponseCode();
            Log.d(TAG, "Response code: " + responseCode);
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Parse JSON response
                JSONArray jsonArray = new JSONArray(response.toString());
                
                if (jsonArray.length() > 0) {
                    JSONObject intentionObj = jsonArray.getJSONObject(0);
                    
                    String id = intentionObj.getString("id");
                    String intentionText = intentionObj.optString("intention_text", "");
                    String audioFileUrl = intentionObj.optString("audio_file_url", "");
                    String audioFileName = intentionObj.optString("audio_file_name", "");
                    String type = intentionObj.optString("type", "text");
                    
                    intentionData = new IntentionData(
                            id, intentionText, audioFileUrl, audioFileName, type
                    );
                    
                    Log.d(TAG, "✅ Intention data fetched:");
                    Log.d(TAG, "  ID: " + id);
                    Log.d(TAG, "  Type: " + type);
                    
                    if ("audio".equalsIgnoreCase(type)) {
                        Log.d(TAG, "  Audio File: " + audioFileName);
                        Log.d(TAG, "  Audio URL: " + audioFileUrl);
                    } else {
                        Log.d(TAG, "  Text: " + intentionText);
                    }
                } else {
                    Log.w(TAG, "⚠️ No intention data found in database");
                }
                
            } else {
                Log.e(TAG, "❌ Error response code: " + responseCode);
                
                BufferedReader errorReader = new BufferedReader(
                        new InputStreamReader(connection.getErrorStream()));
                StringBuilder errorResponse = new StringBuilder();
                String line;
                
                while ((line = errorReader.readLine()) != null) {
                    errorResponse.append(line);
                }
                errorReader.close();
                
                Log.e(TAG, "Error response: " + errorResponse.toString());
            }
            
            connection.disconnect();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Exception fetching intention data: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return intentionData;
    }
    
    /**
     * Get intention text for TTS
     * Returns empty string if audio type or no data
     */
    public static String getIntentionText(IntentionData data) {
        if (data == null) {
            return "";
        }
        
        if (data.isTextType() && data.intentionText != null && !data.intentionText.isEmpty()) {
            return data.intentionText;
        }
        
        return "";
    }
    
    /**
     * Get audio file URL
     * Returns empty string if text type or no data
     */
    public static String getAudioFileUrl(IntentionData data) {
        if (data == null) {
            return "";
        }
        
        if (data.isAudioType() && data.audioFileUrl != null && !data.audioFileUrl.isEmpty()) {
            return data.audioFileUrl;
        }
        
        return "";
    }
    
    /**
     * Check if intention data exists and is valid
     */
    public static boolean isIntentionDataValid(IntentionData data) {
        if (data == null) {
            return false;
        }
        
        if (data.isTextType()) {
            return data.intentionText != null && !data.intentionText.trim().isEmpty();
        } else if (data.isAudioType()) {
            return data.audioFileUrl != null && !data.audioFileUrl.trim().isEmpty();
        }
        
        return false;
    }
    
    /**
     * Test connection to Supabase
     */
    public static boolean testConnection() {
        try {
            String urlString = SUPABASE_URL + "/rest/v1/";
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            connection.setRequestMethod("GET");
            connection.setRequestProperty("apikey", SUPABASE_API_KEY);
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            connection.disconnect();
            
            boolean isConnected = (responseCode == HttpURLConnection.HTTP_OK);
            Log.d(TAG, "Connection test: " + (isConnected ? "✅ Success" : "❌ Failed"));
            
            return isConnected;
            
        } catch (Exception e) {
            Log.e(TAG, "Connection test failed", e);
            return false;
        }
    }
}