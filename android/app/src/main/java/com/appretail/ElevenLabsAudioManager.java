package com.wingsfly;

import android.content.Context;
import android.util.Log;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Wrapper around ElevenLabsNativeService to ensure only ONE audio stream plays at a time
 * This prevents multiple audio instances even if called multiple times
 */
public class ElevenLabsAudioManager {
    
    private static final String TAG = "ElevenLabsAudioManager";
    private static ElevenLabsAudioManager instance;
    private static final ReentrantLock instanceLock = new ReentrantLock();
    
    // Global audio control
    private final AtomicBoolean isAudioPlaying = new AtomicBoolean(false);
    private final AtomicBoolean isAudioStarting = new AtomicBoolean(false);
    private final ReentrantLock audioLock = new ReentrantLock();
    
    private ElevenLabsNativeService currentAudioService;
    private String currentPlayingAlarmId;
    private long lastAudioStartTime = 0;
    private static final long MIN_AUDIO_INTERVAL = 5000; // 5 seconds minimum between audio starts
    
    private ElevenLabsAudioManager() {
        Log.d(TAG, "ElevenLabsAudioManager instance created");
    }
    
    public static ElevenLabsAudioManager getInstance() {
        if (instance == null) {
            instanceLock.lock();
            try {
                if (instance == null) {
                    instance = new ElevenLabsAudioManager();
                }
            } finally {
                instanceLock.unlock();
            }
        }
        return instance;
    }
    
    /**
     * Request to play ElevenLabs audio - only one can play at a time
     */
    public boolean requestAudioPlayback(String alarmId, String taskTitle, String scheduleTime, 
                                      String userName, Context context, String source) {
        audioLock.lock();
        try {
            Log.d(TAG, "Audio playback requested by " + source + " for alarm: " + alarmId);
            
            // Check if audio is already starting or playing
            if (isAudioStarting.get() || isAudioPlaying.get()) {
                Log.w(TAG, "BLOCKED: Audio already starting/playing. Current alarm: " + currentPlayingAlarmId);
                return false;
            }
            
            // Check minimum interval between audio starts
            long currentTime = System.currentTimeMillis();
            if (currentTime - lastAudioStartTime < MIN_AUDIO_INTERVAL) {
                Log.w(TAG, "BLOCKED: Audio started too recently (" + (currentTime - lastAudioStartTime) + "ms ago)");
                return false;
            }
            
            // Mark as starting to prevent race conditions
            isAudioStarting.set(true);
            currentPlayingAlarmId = alarmId;
            lastAudioStartTime = currentTime;
            
            Log.d(TAG, "✅ AUDIO PERMISSION GRANTED for alarm: " + alarmId + " from " + source);
            
            // Start audio in background thread to prevent blocking
            new Thread(() -> {
                try {
                    startAudioSafely(alarmId, taskTitle, scheduleTime, userName, context, source);
                } catch (Exception e) {
                    Log.e(TAG, "Error in audio thread", e);
                    markAudioStopped("ERROR");
                }
            }).start();
            
            return true;
            
        } finally {
            audioLock.unlock();
        }
    }
    
    private void startAudioSafely(String alarmId, String taskTitle, String scheduleTime, 
                                String userName, Context context, String source) {
        try {
            Log.d(TAG, "🎵 STARTING ElevenLabs audio - " + source + " for " + alarmId);
            
            // Stop any existing audio first
            stopCurrentAudio("NEW_AUDIO_REQUEST");
            
            // Create new audio service
            currentAudioService = new ElevenLabsNativeService(context);
            
            if (userName != null && !userName.trim().isEmpty()) {
                currentAudioService.setUserProfile(userName.trim());
            } else {
                currentAudioService.setUserProfile("there");
            }
            
            // Mark as playing before starting
            isAudioPlaying.set(true);
            isAudioStarting.set(false);
            
            // Start the actual audio
            currentAudioService.playEnhancedAlarmSpeech(taskTitle, scheduleTime);
            
            Log.d(TAG, "✅ ElevenLabs audio started successfully for: " + alarmId);
            
            // Auto-stop after 2 minutes
            new Thread(() -> {
                try {
                    Thread.sleep(120000); // 2 minutes
                    if (alarmId.equals(currentPlayingAlarmId) && isAudioPlaying.get()) {
                        Log.d(TAG, "Auto-stopping audio after 2 minutes for: " + alarmId);
                        markAudioStopped("AUTO_TIMEOUT");
                    }
                } catch (InterruptedException e) {
                    Log.d(TAG, "Auto-stop thread interrupted for: " + alarmId);
                }
            }).start();
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting ElevenLabs audio", e);
            markAudioStopped("START_ERROR");
        }
    }
    
    /**
     * Request to play repeat audio (less restrictive)
     */
    public boolean requestRepeatAudio(String alarmId, Context context, String source) {
        audioLock.lock();
        try {
            Log.d(TAG, "Repeat audio requested by " + source + " for alarm: " + alarmId);
            
            // For repeat, only block if different alarm is playing
            if (isAudioPlaying.get() && !alarmId.equals(currentPlayingAlarmId)) {
                Log.w(TAG, "BLOCKED: Different alarm audio is playing: " + currentPlayingAlarmId);
                return false;
            }
            
            // Stop current audio first
            stopCurrentAudio("MANUAL_REPEAT");
            
            // Start repeat audio in background
            new Thread(() -> {
                try {
                    Thread.sleep(500); // Brief pause before repeat
                    
                    currentAudioService = new ElevenLabsNativeService(context);
                    currentAudioService.setUserProfile("there");
                    
                    isAudioPlaying.set(true);
                    currentPlayingAlarmId = alarmId;
                    
                    currentAudioService.playHindiQuoteOnly();
                    
                    Log.d(TAG, "✅ Repeat audio started for: " + alarmId);
                    
                } catch (Exception e) {
                    Log.e(TAG, "Error in repeat audio", e);
                    markAudioStopped("REPEAT_ERROR");
                }
            }).start();
            
            return true;
            
        } finally {
            audioLock.unlock();
        }
    }
    
    /**
     * Stop current audio
     */
    public void stopAudio(String alarmId, String source) {
        audioLock.lock();
        try {
            Log.d(TAG, "Stop audio requested by " + source + " for alarm: " + alarmId);
            
            if (alarmId.equals(currentPlayingAlarmId) || source.equals("FORCE_STOP")) {
                stopCurrentAudio(source);
                Log.d(TAG, "✅ Audio stopped for: " + alarmId);
            } else {
                Log.d(TAG, "Stop request ignored - different alarm playing: " + currentPlayingAlarmId);
            }
        } finally {
            audioLock.unlock();
        }
    }
    
    private void stopCurrentAudio(String reason) {
        try {
            if (currentAudioService != null) {
                currentAudioService.stopAudio();
                currentAudioService.cleanup();
                currentAudioService = null;
                Log.d(TAG, "Audio service stopped - " + reason);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping audio service", e);
        }
        
        markAudioStopped(reason);
    }
    
    private void markAudioStopped(String reason) {
        isAudioPlaying.set(false);
        isAudioStarting.set(false);
        currentPlayingAlarmId = null;
        Log.d(TAG, "Audio marked as stopped - " + reason);
    }
    
    /**
     * Force stop all audio
     */
    public void forceStopAll(String source) {
        audioLock.lock();
        try {
            Log.d(TAG, "Force stop all audio requested by: " + source);
            stopCurrentAudio("FORCE_STOP_" + source);
        } finally {
            audioLock.unlock();
        }
    }
    
    /**
     * Check if audio is currently playing
     */
    public boolean isAudioPlaying() {
        return isAudioPlaying.get();
    }
    
    /**
     * Get current playing alarm ID
     */
    public String getCurrentPlayingAlarmId() {
        return currentPlayingAlarmId;
    }
    
    /**
     * Get status for debugging
     */
    public String getStatus() {
        return String.format("Playing: %s, Starting: %s, Current Alarm: %s, Last Start: %dms ago",
            isAudioPlaying.get(), isAudioStarting.get(), currentPlayingAlarmId,
            System.currentTimeMillis() - lastAudioStartTime);
    }
}