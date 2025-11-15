package com.wingsfly;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class MorningRoutineDatabase {
    
    private static final String TAG = "MorningRoutineDB";
    
   // ✅ Supabase credentials from BuildConfig (loaded from local.properties)
    private static final String SUPABASE_URL = BuildConfig.SUPABASE_URL;
    private static final String SUPABASE_API_KEY = BuildConfig.SUPABASE_ANON_KEY;
    
    public static class VoiceCommand {
        public String id;
        public String text;
        public int lockDurationSeconds; // Total seconds from database
        public int gapTimeSeconds; // Total seconds from database
        public int sequenceOrder;
        
        public VoiceCommand(String id, String text, int lockDurationSeconds, int gapTimeSeconds, int sequenceOrder) {
            this.id = id;
            this.text = text;
            this.lockDurationSeconds = lockDurationSeconds;
            this.gapTimeSeconds = gapTimeSeconds;
            this.sequenceOrder = sequenceOrder;
        }
        
        @Override
        public String toString() {
            return "VoiceCommand{" +
                    "id='" + id + '\'' +
                    ", text='" + text + '\'' +
                    ", lockDurationSeconds=" + lockDurationSeconds +
                    ", gapTimeSeconds=" + gapTimeSeconds +
                    ", sequenceOrder=" + sequenceOrder +
                    '}';
        }
    }
    
    /**
     * Fetch morning routine voice commands from Supabase
     * Returns list of commands ordered by sequence_order
     */
    public static List<VoiceCommand> fetchVoiceCommands() {
        List<VoiceCommand> commands = new ArrayList<>();
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Fetching voice commands from Supabase...");
            
            // Build URL with query parameters
            String urlString = SUPABASE_URL + "/rest/v1/morning_routine_voice_commands" +
                    "?select=*" +
                    "&order=sequence_order.asc";
            
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
                
                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONObject cmdObj = jsonArray.getJSONObject(i);
                    
                    String id = cmdObj.getString("id");
                    String commandText = cmdObj.getString("command_text");
                    int lockDuration = cmdObj.getInt("lock_duration"); // seconds from DB
                    int gapTime = cmdObj.getInt("gap_time"); // seconds from DB
                    int sequenceOrder = cmdObj.getInt("sequence_order");
                    
                    VoiceCommand command = new VoiceCommand(
                            id, commandText, lockDuration, gapTime, sequenceOrder
                    );
                    
                    commands.add(command);
                    
                    Log.d(TAG, "Command #" + (i+1) + ":");
                    Log.d(TAG, "  Text: " + commandText);
                    Log.d(TAG, "  Lock Duration: " + lockDuration + " seconds (" + formatSeconds(lockDuration) + ")");
                    Log.d(TAG, "  Gap Time: " + gapTime + " seconds (" + formatSeconds(gapTime) + ")");
                }
                
                Log.d(TAG, "✅ Successfully fetched " + commands.size() + " commands");
                
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
            Log.e(TAG, "❌ Exception fetching commands: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return commands;
    }
    
    /**
     * Convert database commands to JSON format for Android activity
     * CRITICAL: Lock duration and gap time are in SECONDS (as stored in database)
     */
    public static String convertCommandsToJson(List<VoiceCommand> commands) {
        try {
            JSONArray jsonArray = new JSONArray();
            
            for (int i = 0; i < commands.size(); i++) {
                VoiceCommand cmd = commands.get(i);
                JSONObject jsonCmd = new JSONObject();
                
                jsonCmd.put("id", cmd.id);
                jsonCmd.put("sequence", i + 1);
                jsonCmd.put("text", cmd.text);
                
                // ✅ CRITICAL: Store SECONDS in JSON (not minutes)
                // The activity will handle the conversion for display/timing
                jsonCmd.put("lock_duration_seconds", cmd.lockDurationSeconds);
                jsonCmd.put("gap_time_seconds", cmd.gapTimeSeconds);
                
                // Also include formatted strings for display
                jsonCmd.put("lock_duration_display", formatSeconds(cmd.lockDurationSeconds));
                jsonCmd.put("gap_time_display", formatSeconds(cmd.gapTimeSeconds));
                
                jsonArray.put(jsonCmd);
                
                Log.d(TAG, "JSON Command " + (i+1) + ": lock=" + cmd.lockDurationSeconds + "s, gap=" + cmd.gapTimeSeconds + "s");
            }
            
            String jsonString = jsonArray.toString();
            Log.d(TAG, "Commands JSON: " + jsonString);
            return jsonString;
            
        } catch (Exception e) {
            Log.e(TAG, "Error converting commands to JSON", e);
            return "[]";
        }
    }
    
    /**
     * Format seconds to human-readable string
     * Examples: 
     *   - 120 seconds → "2m"
     *   - 90 seconds → "1m 30s"
     *   - 45 seconds → "45s"
     */
    public static String formatSeconds(int totalSeconds) {
        if (totalSeconds <= 0) {
            return "0s";
        }
        
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        
        if (minutes > 0 && seconds > 0) {
            return minutes + "m " + seconds + "s";
        } else if (minutes > 0) {
            return minutes + "m";
        } else {
            return seconds + "s";
        }
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