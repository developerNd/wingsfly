package com.wingsfly;

import android.content.Context;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.AsyncTask;
import android.os.Handler;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Random;
import java.util.regex.Pattern;

import org.json.JSONObject;

public class ElevenLabsNativeService {
    
    private static final String TAG = "ElevenLabsNative";
    private static final String VOICE_ID = "V79Doapn9P53cEABwysz";
    private static final String API_KEY = BuildConfig.ELEVENLABS_API_KEY;
    private static final String ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID;
    
    private Context context;
    private MediaPlayer mediaPlayer;
    private String userProfile = "there";
    
    // Pattern to detect Hindi (Devanagari) characters
    private static final Pattern HINDI_PATTERN = Pattern.compile("[\\u0900-\\u097F]");
    
    // Dynamic motivational quotes with placeholders (ONLY these quotes - no additional ones)
    private static final String[] MOTIVATIONAL_QUOTES = {
        "{name}, याद रखो — सफलता सुबह की मेहनत से शुरू होती है। अभी {time} बजे तुम्हारा कार्य है: {task}।",
        "{name}, मेहनत कभी बेकार नहीं जाती। यह {time} का समय है, अब तुम्हें पूरा करना है: {task}।",
        "हर बड़ा सपना मेहनत से पूरा होता है, {name}। अभी {time} बजे तुम्हारा कार्य है: {task}।",
        "{name}, हार मत मानो। लगातार कोशिश ही जीत दिलाती है। {time} बजे तुम्हें करना है: {task}।",
        "मुश्किल रास्ते ही खूबसूरत मंज़िल तक ले जाते हैं, {name}। तुम्हारा कार्य {task} {time} बजे पूरा होना चाहिए।"
    };
    
    public ElevenLabsNativeService(Context context) {
        this.context = context;
        Log.d(TAG, "🚀 ElevenLabs Native Service initialized - UPDATED FLOW: English message + Dynamic quote only");
    }
    
    public void setUserProfile(String userName) {
        this.userProfile = userName != null ? userName : "there";
        Log.d(TAG, "👤 User profile set: " + this.userProfile);
    }
    
    private boolean containsHindi(String text) {
        return HINDI_PATTERN.matcher(text).find();
    }
    
    private JSONObject getVoiceSettings(boolean isHindi) throws Exception {
        JSONObject voiceSettings = new JSONObject();
        
        if (isHindi) {
            Log.d(TAG, "🐌 Using SLOW settings for Hindi text");
            voiceSettings.put("stability", 0.85);
            voiceSettings.put("similarity_boost", 0.9);
            voiceSettings.put("style", 0.2);
            voiceSettings.put("use_speaker_boost", true);
            voiceSettings.put("speaking_rate", 0.6); // 60% speed for Hindi
            voiceSettings.put("pitch", 0.9);
        } else {
            Log.d(TAG, "⚡ Using NORMAL settings for English text");
            voiceSettings.put("stability", 0.5);
            voiceSettings.put("similarity_boost", 0.5);
            voiceSettings.put("style", 0.5);
            voiceSettings.put("use_speaker_boost", true);
            voiceSettings.put("speaking_rate", 1.0); // Normal speed for English
            voiceSettings.put("pitch", 1.0);
        }
        
        return voiceSettings;
    }
    
    // UPDATED: Main method with new flow - English message first, then dynamic quote
    public void playEnhancedAlarmSpeech(String taskTitle, String scheduleTime) {
        Log.d(TAG, "🚨 === NEW FLOW: ENGLISH MESSAGE + DYNAMIC QUOTE ONLY ===");
        Log.d(TAG, "📱 Playing enhanced alarm speech with ElevenLabs (NATIVE - works when app closed)");
        
        // Generate English message (simple task notification)
        String englishMessage = generateSimpleEnglishMessage(taskTitle, scheduleTime);
        
        // Generate dynamic motivational quote with placeholders
        String dynamicQuote = generateDynamicQuote(taskTitle, scheduleTime);
        
        Log.d(TAG, "📢 English Message: " + englishMessage);
        Log.d(TAG, "🎯 Dynamic Quote: " + dynamicQuote);
        
        // Generate both audio files
        new GenerateSpeechTask("two_part", englishMessage, dynamicQuote).execute();
    }
    
    // NEW: Generate simple English message for task notification
    private String generateSimpleEnglishMessage(String taskTitle, String scheduleTime) {
        String message = String.format("Hello %s, your task %s is scheduled at %s", 
            userProfile, 
            taskTitle != null ? taskTitle : "reminder", 
            scheduleTime);
        
        Log.d(TAG, "Generated English message: " + message);
        return message;
    }
    
    // UPDATED: Generate dynamic motivational quote with placeholders filled
    private String generateDynamicQuote(String taskTitle, String scheduleTime) {
        Random random = new Random();
        String selectedQuote = MOTIVATIONAL_QUOTES[random.nextInt(MOTIVATIONAL_QUOTES.length)];
        
        // Replace placeholders with actual data
        String personalizedQuote = selectedQuote
            .replace("{name}", userProfile)
            .replace("{time}", scheduleTime)
            .replace("{task}", taskTitle != null ? taskTitle : "reminder");
        
        Log.d(TAG, "Selected quote template: " + selectedQuote);
        Log.d(TAG, "Generated dynamic quote: " + personalizedQuote);
        
        return personalizedQuote;
    }
    
    // UPDATED: AsyncTask for two-part speech generation
    private class GenerateSpeechTask extends AsyncTask<Void, Void, SpeechResult> {
        
        private String phase;
        private String englishText;
        private String hindiText;
        
        public GenerateSpeechTask(String phase, String englishText, String hindiText) {
            this.phase = phase;
            this.englishText = englishText;
            this.hindiText = hindiText;
        }
        
        @Override
        protected SpeechResult doInBackground(Void... params) {
            SpeechResult result = new SpeechResult();
            
            try {
                if ("two_part".equals(phase)) {
                    // Generate English audio with normal speed
                    Log.d(TAG, "🎵 Generating ENGLISH audio with normal speed...");
                    result.englishPath = generateAudioForText(englishText, false);
                    
                    if (result.englishPath != null) {
                        // Generate dynamic quote audio with Hindi settings (slow speed)
                        Log.d(TAG, "🎵 Generating DYNAMIC QUOTE audio with slow speed...");
                        result.hindiPath = generateAudioForText(hindiText, true);
                    }
                } else if ("combined".equals(phase)) {
                    // Fallback: combined message
                    Log.d(TAG, "🔄 Generating combined message...");
                    String combinedMessage = englishText + ". " + hindiText;
                    result.combinedPath = generateAudioForText(combinedMessage, true);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error in GenerateSpeechTask: " + e.getMessage());
                result.error = e.getMessage();
            }
            
            return result;
        }
        
        private String generateAudioForText(String text, boolean isHindi) {
            try {
                Log.d(TAG, String.format("🎤 Generating %s audio: %s", 
                    isHindi ? "HINDI (SLOW)" : "ENGLISH (NORMAL)", text));
                
                JSONObject jsonPayload = new JSONObject();
                jsonPayload.put("text", text);
                jsonPayload.put("model_id", "eleven_multilingual_v2");
                
                JSONObject voiceSettings = getVoiceSettings(isHindi);
                jsonPayload.put("voice_settings", voiceSettings);
                
                jsonPayload.put("output_format", "mp3_44100_128");
                jsonPayload.put("optimize_streaming_latency", 0);
                
                if (isHindi) {
                    jsonPayload.put("language_code", "hi");
                }
                
                Log.d(TAG, "📝 Request payload: " + jsonPayload.toString());
                
                URL url = new URL(ELEVENLABS_API_URL);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("xi-api-key", API_KEY);
                connection.setRequestProperty("Accept", "audio/mpeg");
                connection.setRequestProperty("User-Agent", "WingsFly-App/1.0");
                connection.setDoOutput(true);
                
                connection.getOutputStream().write(jsonPayload.toString().getBytes());
                
                int responseCode = connection.getResponseCode();
                Log.d(TAG, "📡 ElevenLabs API response code: " + responseCode);
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    String fileName = String.format("elevenlabs_%s_%d.mp3", 
                        isHindi ? "quote" : "english", System.currentTimeMillis());
                    File audioFile = new File(context.getCacheDir(), fileName);
                    
                    InputStream inputStream = connection.getInputStream();
                    FileOutputStream outputStream = new FileOutputStream(audioFile);
                    
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    int totalBytes = 0;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        totalBytes += bytesRead;
                    }
                    
                    outputStream.close();
                    inputStream.close();
                    connection.disconnect();
                    
                    Log.d(TAG, String.format("✅ %s audio saved: %s (Size: %dKB)", 
                        isHindi ? "DYNAMIC QUOTE (SLOW)" : "ENGLISH (NORMAL)", 
                        audioFile.getAbsolutePath(), totalBytes / 1024));
                    
                    return audioFile.getAbsolutePath();
                } else {
                    InputStream errorStream = connection.getErrorStream();
                    if (errorStream != null) {
                        byte[] errorBuffer = new byte[1024];
                        int errorBytes = errorStream.read(errorBuffer);
                        String errorResponse = new String(errorBuffer, 0, errorBytes);
                        Log.e(TAG, "❌ ElevenLabs API error response: " + errorResponse);
                        errorStream.close();
                    }
                    
                    Log.e(TAG, "❌ ElevenLabs API request failed with code: " + responseCode);
                    connection.disconnect();
                    return null;
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error generating audio: " + e.getMessage());
                return null;
            }
        }
        
        @Override
        protected void onPostExecute(SpeechResult result) {
            if (result.error != null) {
                Log.e(TAG, "❌ Speech generation failed: " + result.error);
                return;
            }
            
            if ("two_part".equals(phase)) {
                if (result.englishPath != null && result.hindiPath != null) {
                    // Play English first, then dynamic quote after 1-2 seconds
                    playTwoPartAudio(result.englishPath, result.hindiPath);
                } else if (result.englishPath != null) {
                    Log.d(TAG, "⚠️ Dynamic quote generation failed, playing English only");
                    playAudioFile(result.englishPath, "English only");
                } else {
                    // Try combined fallback
                    Log.d(TAG, "🔄 Trying combined fallback...");
                    new GenerateSpeechTask("combined", englishText, hindiText).execute();
                }
            } else if ("combined".equals(phase)) {
                if (result.combinedPath != null) {
                    playAudioFile(result.combinedPath, "Combined message");
                } else {
                    Log.e(TAG, "❌ All speech generation methods failed");
                }
            }
        }
    }
    
    // NEW: Play two-part audio with proper timing
    private void playTwoPartAudio(String englishPath, String quotePath) {
        Log.d(TAG, "🎵 Playing two-part audio: English message, then dynamic quote");
        
        // Play English message first
        playAudioFileWithCallback(englishPath, "English message (normal speed)", new Runnable() {
            @Override
            public void run() {
                // Wait 1.5 seconds, then play dynamic quote
                new Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        Log.d(TAG, "▶️ Now playing dynamic motivational quote at slow speed...");
                        playAudioFile(quotePath, "Dynamic quote (slow speed - 60%)");
                        
                        // Clean up both files after quote finishes
                        new Handler().postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                cleanupAudioFile(englishPath);
                                cleanupAudioFile(quotePath);
                            }
                        }, 10000);
                    }
                }, 1500); // 1.5 second pause
            }
        });
    }
    
    private void playAudioFileWithCallback(String audioFilePath, String description, Runnable callback) {
        try {
            Log.d(TAG, "🔊 Playing audio: " + description + " - " + audioFilePath);
            
            if (mediaPlayer != null) {
                mediaPlayer.release();
            }
            
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(audioFilePath);
            
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
            }
            
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "✅ Audio playback completed: " + description);
                mp.release();
                mediaPlayer = null;
                
                if (callback != null) {
                    callback.run();
                }
            });
            
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "❌ MediaPlayer error: " + what + ", " + extra);
                mp.release();
                mediaPlayer = null;
                
                if (callback != null) {
                    callback.run();
                }
                return true;
            });
            
            mediaPlayer.prepareAsync();
            mediaPlayer.setOnPreparedListener(mp -> {
                mp.start();
                Log.d(TAG, "▶️ Audio playback started: " + description);
            });
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error playing audio: " + e.getMessage());
            if (callback != null) {
                callback.run();
            }
        }
    }
    
    private void playAudioFile(String audioFilePath, String description) {
        playAudioFileWithCallback(audioFilePath, description, null);
    }
    
    private void cleanupAudioFile(String filePath) {
        try {
            File file = new File(filePath);
            if (file.exists() && file.delete()) {
                Log.d(TAG, "🧹 Cleaned up audio file: " + filePath);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error cleaning up audio file: " + e.getMessage());
        }
    }
    
    // UPDATED: Play only dynamic quote (for testing)
    public void playDynamicQuoteOnly(String taskTitle, String scheduleTime) {
        String dynamicQuote = generateDynamicQuote(taskTitle, scheduleTime);
        Log.d(TAG, "🎯 === PLAYING DYNAMIC QUOTE ONLY ===");
        Log.d(TAG, "📝 Dynamic quote: " + dynamicQuote);
        
        new GenerateSpeechTask("combined", "", dynamicQuote).execute();
    }
    
    // LEGACY METHOD: For backward compatibility with existing manager classes
    public void playHindiQuoteOnly() {
        // Use a default dynamic quote for compatibility
        String defaultQuote = generateDynamicQuote("your task", "now");
        Log.d(TAG, "🔄 === LEGACY HINDI QUOTE METHOD - USING DYNAMIC QUOTE ===");
        Log.d(TAG, "📝 Using dynamic quote: " + defaultQuote);
        
        new GenerateSpeechTask("combined", "", defaultQuote).execute();
    }
    
    // UPDATED: Play only English message (for testing)
    public void playEnglishMessageOnly(String taskTitle, String scheduleTime) {
        String englishMessage = generateSimpleEnglishMessage(taskTitle, scheduleTime);
        Log.d(TAG, "📢 === PLAYING ENGLISH MESSAGE ONLY ===");
        Log.d(TAG, "📝 English message: " + englishMessage);
        
        new GenerateSpeechTask("combined", englishMessage, "").execute();
    }
    
    public void stopAudio() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "🛑 ElevenLabs audio stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping ElevenLabs audio: " + e.getMessage());
        }
    }
    
    public void cleanup() {
        stopAudio();
        
        try {
            File cacheDir = context.getCacheDir();
            File[] files = cacheDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.getName().startsWith("elevenlabs_") && file.getName().endsWith(".mp3")) {
                        if (file.delete()) {
                            Log.d(TAG, "🧹 Cleaned up cached audio: " + file.getName());
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error during cleanup: " + e.getMessage());
        }
        
        Log.d(TAG, "✅ ElevenLabs Native Service cleanup completed");
    }
    
    private static class SpeechResult {
        String englishPath;
        String hindiPath;
        String combinedPath;
        String error;
    }
    
    public String getServiceInfo() {
        return String.format(
            "ElevenLabs Native Service - UPDATED FLOW\n" +
            "Voice ID: %s\n" +
            "Model: eleven_multilingual_v2\n" +
            "Flow: English message + Dynamic quote only\n" +
            "English Speed: 100%% (1.0x - NORMAL)\n" +
            "Quote Speed: 60%% (0.6x - SLOW)\n" +
            "User: %s\n" +
            "Dynamic Quotes Available: %d\n" +
            "Status: TWO-PART FLOW WITH DYNAMIC QUOTES",
            VOICE_ID, userProfile, MOTIVATIONAL_QUOTES.length
        );
    }
}