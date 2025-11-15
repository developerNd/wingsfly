package com.wingsfly;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class DateReminderDatabase {
    
    private static final String TAG = "DateReminderDB";
    
    // ✅ Supabase credentials from BuildConfig
    private static final String SUPABASE_URL = BuildConfig.SUPABASE_URL;
    private static final String SUPABASE_API_KEY = BuildConfig.SUPABASE_ANON_KEY;
    
    public static class Settings {
        public boolean autoClose;
        public String morningTime; // Format: "HH:mm"
        public String eveningTime; // Format: "HH:mm"
        public String morningImageUrl;
        public String eveningImageUrl;
        
        public Settings(boolean autoClose, String morningTime, String eveningTime, 
                       String morningImageUrl, String eveningImageUrl) {
            this.autoClose = autoClose;
            this.morningTime = morningTime;
            this.eveningTime = eveningTime;
            this.morningImageUrl = morningImageUrl;
            this.eveningImageUrl = eveningImageUrl;
        }
        
        @Override
        public String toString() {
            return "Settings{" +
                    "autoClose=" + autoClose +
                    ", morningTime='" + morningTime + '\'' +
                    ", eveningTime='" + eveningTime + '\'' +
                    ", morningImageUrl='" + morningImageUrl + '\'' +
                    ", eveningImageUrl='" + eveningImageUrl + '\'' +
                    '}';
        }
    }
    
    /**
     * Fetch date reminder settings from Supabase
     * Returns the most recent settings entry
     */
    public static Settings fetchSettings() {
        Settings settings = null;
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Fetching date reminder settings from Supabase...");
            
            // Build URL - get the most recent settings
            String urlString = SUPABASE_URL + "/rest/v1/date_reminder_settings" +
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
                    JSONObject settingsObj = jsonArray.getJSONObject(0);
                    
                    boolean autoClose = settingsObj.getBoolean("auto_close_after_30s");
                    String morningTime = settingsObj.getString("morning_time").substring(0, 5); // HH:mm:ss -> HH:mm
                    String eveningTime = settingsObj.getString("evening_time").substring(0, 5);
                    String morningImageUrl = settingsObj.optString("morning_image_url", null);
                    String eveningImageUrl = settingsObj.optString("evening_image_url", null);
                    
                    settings = new Settings(autoClose, morningTime, eveningTime, 
                                          morningImageUrl, eveningImageUrl);
                    
                    Log.d(TAG, "✅ Settings fetched successfully:");
                    Log.d(TAG, "  Auto Close: " + autoClose);
                    Log.d(TAG, "  Morning: " + morningTime);
                    Log.d(TAG, "  Evening: " + eveningTime);
                    Log.d(TAG, "  Morning Image: " + (morningImageUrl != null ? "Yes" : "No"));
                    Log.d(TAG, "  Evening Image: " + (eveningImageUrl != null ? "Yes" : "No"));
                    
                } else {
                    Log.w(TAG, "⚠️ No settings found in database");
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
            Log.e(TAG, "❌ Exception fetching settings: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return settings;
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