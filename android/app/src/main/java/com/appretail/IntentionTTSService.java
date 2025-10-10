package com.wingsfly;

import android.content.Context;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.AsyncTask;
import android.util.Log;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class IntentionTTSService {
    
    private static final String TAG = "IntentionTTS";
    private static final String VOICE_ID = "V79Doapn9P53cEABwysz";
    private static final String API_KEY = BuildConfig.ELEVENLABS_API_KEY;
    private static final String ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID;
    
    private Context context;
    private MediaPlayer mediaPlayer;
    private CompletionCallback completionCallback;
    
    public interface CompletionCallback {
        void onCompleted();
    }
    
    public IntentionTTSService(Context context) {
        this.context = context;
        Log.d(TAG, "Intention TTS Service initialized");
    }
    
    /**
     * Speak intention - checks if audio file exists, otherwise uses TTS
     */
    public void speakIntention(String intentionText, String audioFilePath, CompletionCallback callback) {
        Log.d(TAG, "Speaking intention - Text: " + intentionText + ", Audio: " + audioFilePath);
        this.completionCallback = callback;
        
        // Check if we have an uploaded audio file
        if (audioFilePath != null && !audioFilePath.isEmpty()) {
            File audioFile = new File(audioFilePath);
            if (audioFile.exists()) {
                Log.d(TAG, "Playing uploaded audio file: " + audioFilePath);
                playAudio(audioFilePath, false); // false = uploaded file, don't delete
                return;
            } else {
                Log.w(TAG, "Audio file not found: " + audioFilePath + ", falling back to TTS");
            }
        }
        
        // Fallback to TTS if no audio file or file doesn't exist
        if (intentionText != null && !intentionText.isEmpty()) {
            Log.d(TAG, "Generating TTS for: " + intentionText);
            new GenerateIntentionSpeechTask(intentionText).execute();
        } else {
            Log.e(TAG, "No intention text or audio file available");
            if (completionCallback != null) {
                completionCallback.onCompleted();
            }
        }
    }
    
    /**
     * AsyncTask to generate speech for intention
     */
    private class GenerateIntentionSpeechTask extends AsyncTask<Void, Void, String> {
        
        private String intentionText;
        
        public GenerateIntentionSpeechTask(String intentionText) {
            this.intentionText = intentionText;
        }
        
        @Override
        protected String doInBackground(Void... params) {
            try {
                Log.d(TAG, "Generating audio for intention: " + intentionText);
                
                // Create JSON payload
                JSONObject jsonPayload = new JSONObject();
                jsonPayload.put("text", intentionText);
                jsonPayload.put("model_id", "eleven_multilingual_v2");
                
                // Voice settings - calm, motivational tone
                JSONObject voiceSettings = new JSONObject();
                voiceSettings.put("stability", 0.6);
                voiceSettings.put("similarity_boost", 0.8);
                voiceSettings.put("style", 0.4);
                voiceSettings.put("use_speaker_boost", true);
                
                jsonPayload.put("voice_settings", voiceSettings);
                jsonPayload.put("output_format", "mp3_44100_128");
                
                // Make API request
                URL url = new URL(ELEVENLABS_API_URL);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("xi-api-key", API_KEY);
                connection.setRequestProperty("Accept", "audio/mpeg");
                connection.setDoOutput(true);
                
                connection.getOutputStream().write(jsonPayload.toString().getBytes());
                
                int responseCode = connection.getResponseCode();
                Log.d(TAG, "API response code: " + responseCode);
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    // Save audio file
                    String fileName = "intention_tts_" + System.currentTimeMillis() + ".mp3";
                    File audioFile = new File(context.getCacheDir(), fileName);
                    
                    InputStream inputStream = connection.getInputStream();
                    FileOutputStream outputStream = new FileOutputStream(audioFile);
                    
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    
                    outputStream.close();
                    inputStream.close();
                    connection.disconnect();
                    
                    Log.d(TAG, "TTS audio saved: " + audioFile.getAbsolutePath());
                    return audioFile.getAbsolutePath();
                } else {
                    Log.e(TAG, "API request failed: " + responseCode);
                    connection.disconnect();
                    return null;
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Error generating audio", e);
                return null;
            }
        }
        
        @Override
        protected void onPostExecute(String audioFilePath) {
            if (audioFilePath != null) {
                playAudio(audioFilePath, true); // true = TTS file, delete after
            } else {
                Log.e(TAG, "Failed to generate TTS audio");
                if (completionCallback != null) {
                    completionCallback.onCompleted();
                }
            }
        }
    }
    
    /**
     * Play the audio file (uploaded or TTS generated)
     * @param audioFilePath Path to audio file
     * @param isTTSFile true if TTS-generated (should be deleted), false if uploaded (keep it)
     */
    private void playAudio(String audioFilePath, boolean isTTSFile) {
        try {
            Log.d(TAG, "Playing audio: " + audioFilePath + " (TTS: " + isTTSFile + ")");
            
            if (mediaPlayer != null) {
                mediaPlayer.release();
            }
            
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(audioFilePath);
            
            // Set to alarm volume
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
            }
            
            final boolean shouldDeleteFile = isTTSFile;
            
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "Audio playback completed");
                mp.release();
                mediaPlayer = null;
                
                // Only clean up TTS files, not uploaded audio files
                if (shouldDeleteFile) {
                    cleanupAudioFile(audioFilePath);
                }
                
                // Notify completion
                if (completionCallback != null) {
                    completionCallback.onCompleted();
                }
            });
            
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: " + what + ", " + extra);
                mp.release();
                mediaPlayer = null;
                
                if (shouldDeleteFile) {
                    cleanupAudioFile(audioFilePath);
                }
                
                if (completionCallback != null) {
                    completionCallback.onCompleted();
                }
                return true;
            });
            
            mediaPlayer.prepareAsync();
            mediaPlayer.setOnPreparedListener(mp -> {
                mp.start();
                Log.d(TAG, "Audio playback started");
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Error playing audio", e);
            if (completionCallback != null) {
                completionCallback.onCompleted();
            }
        }
    }
    
    /**
     * Stop audio playback
     */
    public void stopAudio() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "Audio stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping audio", e);
        }
    }
    
    /**
     * Clean up audio file (only TTS files)
     */
    private void cleanupAudioFile(String filePath) {
        try {
            File file = new File(filePath);
            if (file.exists() && file.delete()) {
                Log.d(TAG, "Cleaned up TTS audio file");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up file", e);
        }
    }
    
    /**
     * Clean up all resources
     */
    public void cleanup() {
        stopAudio();
        completionCallback = null;
        
        try {
            // Clean up only cached TTS audio files, NOT uploaded files
            File cacheDir = context.getCacheDir();
            File[] files = cacheDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.getName().startsWith("intention_tts_") && file.getName().endsWith(".mp3")) {
                        file.delete();
                    }
                }
            }
            Log.d(TAG, "Cleanup completed");
        } catch (Exception e) {
            Log.e(TAG, "Error during cleanup", e);
        }
    }
}