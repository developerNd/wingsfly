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

public class VoiceCommandTTSService {
    
    private static final String TAG = "VoiceCommandTTS";
    private static final String VOICE_ID = "V79Doapn9P53cEABwysz";
    private static final String API_KEY = "sk_a8d17c3417ec69810deaa8e76e3e423321a59f3577769982";
    private static final String ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID;
    
    private Context context;
    private MediaPlayer mediaPlayer;
    
    public VoiceCommandTTSService(Context context) {
        this.context = context;
        Log.d(TAG, "Voice Command TTS Service initialized");
    }
    
    /**
     * Speak command - checks if audio file exists, otherwise uses TTS
     */
    public void speakCommand(String commandText, String audioFilePath) {
        Log.d(TAG, "Speaking command - Text: " + commandText + ", Audio: " + audioFilePath);
        
        // Check if we have an uploaded audio file
        if (audioFilePath != null && !audioFilePath.isEmpty()) {
            File audioFile = new File(audioFilePath);
            if (audioFile.exists()) {
                Log.d(TAG, "Playing uploaded audio file: " + audioFilePath);
                playAudio(audioFilePath);
                return;
            } else {
                Log.w(TAG, "Audio file not found: " + audioFilePath + ", falling back to TTS");
            }
        }
        
        // Fallback to TTS if no audio file or file doesn't exist
        if (commandText != null && !commandText.isEmpty()) {
            Log.d(TAG, "Generating TTS for: " + commandText);
            new GenerateCommandSpeechTask(commandText).execute();
        } else {
            Log.e(TAG, "No command text or audio file available");
        }
    }
    
    /**
     * AsyncTask to generate speech for command
     */
    private class GenerateCommandSpeechTask extends AsyncTask<Void, Void, String> {
        
        private String commandText;
        
        public GenerateCommandSpeechTask(String commandText) {
            this.commandText = commandText;
        }
        
        @Override
        protected String doInBackground(Void... params) {
            try {
                Log.d(TAG, "Generating audio for: " + commandText);
                
                // Create JSON payload
                JSONObject jsonPayload = new JSONObject();
                jsonPayload.put("text", commandText);
                jsonPayload.put("model_id", "eleven_multilingual_v2");
                
                // Voice settings - normal speech
                JSONObject voiceSettings = new JSONObject();
                voiceSettings.put("stability", 0.5);
                voiceSettings.put("similarity_boost", 0.75);
                voiceSettings.put("style", 0.5);
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
                    String fileName = "voice_command_tts_" + System.currentTimeMillis() + ".mp3";
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
                playAudio(audioFilePath);
            } else {
                Log.e(TAG, "Failed to generate TTS audio");
            }
        }
    }
    
    /**
     * Play the audio file (uploaded or TTS generated)
     */
    private void playAudio(String audioFilePath) {
        try {
            Log.d(TAG, "Playing audio: " + audioFilePath);
            
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
            
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "Audio playback completed");
                mp.release();
                mediaPlayer = null;
                
                // Only clean up TTS files, not uploaded audio files
                if (audioFilePath.contains("voice_command_tts_")) {
                    cleanupAudioFile(audioFilePath);
                }
            });
            
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: " + what + ", " + extra);
                mp.release();
                mediaPlayer = null;
                
                // Only clean up TTS files
                if (audioFilePath.contains("voice_command_tts_")) {
                    cleanupAudioFile(audioFilePath);
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
        
        try {
            // Clean up only cached TTS audio files, NOT uploaded files
            File cacheDir = context.getCacheDir();
            File[] files = cacheDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.getName().startsWith("voice_command_tts_") && file.getName().endsWith(".mp3")) {
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