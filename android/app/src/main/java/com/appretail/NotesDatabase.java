package com.wingsfly;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class NotesDatabase {
    
    private static final String TAG = "NotesDatabase";
    
    // ✅ Supabase credentials from BuildConfig (loaded from local.properties)
    private static final String SUPABASE_URL = BuildConfig.SUPABASE_URL;
    private static final String SUPABASE_API_KEY = BuildConfig.SUPABASE_ANON_KEY;
    
    public static class Note {
        public String id;
        public String userId;
        public String content;
        public String createdAt;
        public String updatedAt;
        
        public Note(String id, String userId, String content, String createdAt, String updatedAt) {
            this.id = id;
            this.userId = userId;
            this.content = content;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
        
        @Override
        public String toString() {
            return "Note{" +
                    "id='" + id + '\'' +
                    ", userId='" + userId + '\'' +
                    ", content='" + (content != null && content.length() > 50 ? content.substring(0, 50) + "..." : content) + '\'' +
                    ", updatedAt='" + updatedAt + '\'' +
                    '}';
        }
    }
    
    /**
     * Fetch user's notes from Supabase
     * Returns the most recent note for the user
     */
    public static Note getUserNotes(String userId) {
        Note note = null;
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Fetching notes for user: " + userId);
            
            // Build URL with query parameters
            String urlString = SUPABASE_URL + "/rest/v1/notes" +
                    "?user_id=eq." + userId +
                    "&select=*" +
                    "&order=updated_at.desc" +
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
                    JSONObject noteObj = jsonArray.getJSONObject(0);
                    
                    String id = noteObj.getString("id");
                    String user_id = noteObj.getString("user_id");
                    String content = noteObj.optString("content", "");
                    String createdAt = noteObj.getString("created_at");
                    String updatedAt = noteObj.getString("updated_at");
                    
                    note = new Note(id, user_id, content, createdAt, updatedAt);
                    
                    Log.d(TAG, "✅ Found note:");
                    Log.d(TAG, "  ID: " + id);
                    Log.d(TAG, "  Content length: " + content.length() + " characters");
                    Log.d(TAG, "  Last updated: " + updatedAt);
                } else {
                    Log.d(TAG, "ℹ️ No notes found for user");
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
            Log.e(TAG, "❌ Exception fetching notes: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return note;
    }
    
    /**
     * Create new notes for user
     */
    public static Note createNotes(String userId, String content) {
        Note note = null;
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Creating notes for user: " + userId);
            
            String urlString = SUPABASE_URL + "/rest/v1/notes";
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", SUPABASE_API_KEY);
            connection.setRequestProperty("Authorization", "Bearer " + SUPABASE_API_KEY);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Prefer", "return=representation");
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            // Create JSON body
            JSONObject jsonBody = new JSONObject();
            jsonBody.put("user_id", userId);
            jsonBody.put("content", content != null ? content : "");
            jsonBody.put("created_at", getCurrentTimestamp());
            jsonBody.put("updated_at", getCurrentTimestamp());
            
            // Send request
            OutputStream os = connection.getOutputStream();
            byte[] input = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
            os.close();
            
            int responseCode = connection.getResponseCode();
            Log.d(TAG, "Response code: " + responseCode);
            
            if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Parse response
                JSONArray jsonArray = new JSONArray(response.toString());
                if (jsonArray.length() > 0) {
                    JSONObject noteObj = jsonArray.getJSONObject(0);
                    
                    String id = noteObj.getString("id");
                    String user_id = noteObj.getString("user_id");
                    String noteContent = noteObj.optString("content", "");
                    String createdAt = noteObj.getString("created_at");
                    String updatedAt = noteObj.getString("updated_at");
                    
                    note = new Note(id, user_id, noteContent, createdAt, updatedAt);
                    
                    Log.d(TAG, "✅ Note created successfully");
                    Log.d(TAG, "  ID: " + id);
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
            Log.e(TAG, "❌ Exception creating notes: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return note;
    }
    
    /**
     * Update existing notes
     */
    public static Note updateNotes(String noteId, String content) {
        Note note = null;
        
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Updating note: " + noteId);
            
            String urlString = SUPABASE_URL + "/rest/v1/notes?id=eq." + noteId;
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers
            connection.setRequestMethod("PATCH");
            connection.setRequestProperty("apikey", SUPABASE_API_KEY);
            connection.setRequestProperty("Authorization", "Bearer " + SUPABASE_API_KEY);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Prefer", "return=representation");
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            // Create JSON body
            JSONObject jsonBody = new JSONObject();
            jsonBody.put("content", content != null ? content : "");
            jsonBody.put("updated_at", getCurrentTimestamp());
            
            // Send request
            OutputStream os = connection.getOutputStream();
            byte[] input = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
            os.close();
            
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
                
                // Parse response
                JSONArray jsonArray = new JSONArray(response.toString());
                if (jsonArray.length() > 0) {
                    JSONObject noteObj = jsonArray.getJSONObject(0);
                    
                    String id = noteObj.getString("id");
                    String user_id = noteObj.getString("user_id");
                    String noteContent = noteObj.optString("content", "");
                    String createdAt = noteObj.getString("created_at");
                    String updatedAt = noteObj.getString("updated_at");
                    
                    note = new Note(id, user_id, noteContent, createdAt, updatedAt);
                    
                    Log.d(TAG, "✅ Note updated successfully");
                    Log.d(TAG, "  Content length: " + noteContent.length() + " characters");
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
            Log.e(TAG, "❌ Exception updating notes: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "========================================");
        return note;
    }
    
    /**
     * Save or update notes (smart save)
     */
    public static Note saveNotes(String userId, String content, String noteId) {
        try {
            if (noteId != null && !noteId.isEmpty()) {
                // Update existing notes
                return updateNotes(noteId, content);
            } else {
                // Check if user already has notes
                Note existingNote = getUserNotes(userId);
                
                if (existingNote != null) {
                    // Update existing notes
                    return updateNotes(existingNote.id, content);
                } else {
                    // Create new notes
                    return createNotes(userId, content);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error in saveNotes: " + e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Clear notes content (set to empty string)
     */
    public static Note clearNotes(String noteId) {
        try {
            Log.d(TAG, "Clearing notes: " + noteId);
            return updateNotes(noteId, "");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error clearing notes: " + e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Delete notes completely
     */
    public static boolean deleteNotes(String noteId) {
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Deleting note: " + noteId);
            
            String urlString = SUPABASE_URL + "/rest/v1/notes?id=eq." + noteId;
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers
            connection.setRequestMethod("DELETE");
            connection.setRequestProperty("apikey", SUPABASE_API_KEY);
            connection.setRequestProperty("Authorization", "Bearer " + SUPABASE_API_KEY);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            int responseCode = connection.getResponseCode();
            Log.d(TAG, "Response code: " + responseCode);
            
            boolean success = (responseCode == HttpURLConnection.HTTP_OK || 
                             responseCode == HttpURLConnection.HTTP_NO_CONTENT);
            
            if (success) {
                Log.d(TAG, "✅ Note deleted successfully");
            } else {
                Log.e(TAG, "❌ Failed to delete note");
            }
            
            connection.disconnect();
            Log.d(TAG, "========================================");
            
            return success;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Exception deleting notes: " + e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Get current timestamp in ISO format
     */
    private static String getCurrentTimestamp() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                .format(new java.util.Date());
    }
    
    /**
     * Get user ID from SharedPreferences
     * This matches the user_id stored by the React Native app
     */
    public static String getUserIdFromPrefs(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("RN_USER_DATA", Context.MODE_PRIVATE);
            String userId = prefs.getString("user_id", null);
            Log.d(TAG, "Retrieved userId from prefs: " + userId);
            return userId;
        } catch (Exception e) {
            Log.e(TAG, "Error getting userId from prefs: " + e.getMessage(), e);
            return null;
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