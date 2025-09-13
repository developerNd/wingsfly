package com.wingsfly;

import android.content.Context;
import android.util.Log;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Absolute singleton wrapper for ElevenLabsNativeService
 * Prevents ANY duplicate audio instances from being created
 */
public class ElevenLabsNativeServiceSingleton {
    
    private static final String TAG = "ElevenLabsSingleton";
    
    // Absolute global singleton instance
    private static volatile ElevenLabsNativeServiceSingleton instance;
    private static final Object INSTANCE_LOCK = new Object();
    
    // Audio state tracking
    private final AtomicBoolean isAudioActive = new AtomicBoolean(false);
    private final AtomicBoolean isAudioStarting = new AtomicBoolean(false);
    private final AtomicReference<String> currentAlarmId = new AtomicReference<>(null);
    private final AtomicReference<String> currentSource = new AtomicReference<>(null);
    
    // The actual service instance
    private ElevenLabsNativeService activeService;
    private long lastAudioStartTime = 0;
    private static final long MIN_AUDIO_INTERVAL_MS = 3000; // 3 seconds minimum between starts
    
    private ElevenLabsNativeServiceSingleton() {
        Log.d(TAG, "ElevenLabsNativeServiceSingleton created - ABSOLUTE audio control");
    }
    
    public static ElevenLabsNativeServiceSingleton getInstance() {
        if (instance == null) {
            synchronized (INSTANCE_LOCK) {
                if (instance == null) {
                    instance = new ElevenLabsNativeServiceSingleton();
                    Log.d(TAG, "Global singleton instance initialized");
                }
            }
        }
        return instance;
    }
    
    /**
     * Play ElevenLabs audio - ONLY ONE can play globally
     */
    public synchronized boolean playEnhancedAlarmSpeech(String alarmId, String taskTitle, 
                                                       String scheduleTime, String userName, 
                                                       Context context, String source) {
        
        Log.d(TAG, "playEnhancedAlarmSpeech requested - AlarmId: " + alarmId + ", Source: " + source);
        Log.d(TAG, "Current state - Active: " + isAudioActive.get() + ", Starting: " + isAudioStarting.get() + 
              ", CurrentAlarm: " + currentAlarmId.get() + ", CurrentSource: " + currentSource.get());
        
        // ABSOLUTE BLOCK: If any audio is active or starting
        if (isAudioActive.get() || isAudioStarting.get()) {
            Log.w(TAG, "ABSOLUTELY BLOCKED - Audio already active/starting. Current: " + 
                  currentAlarmId.get() + " from " + currentSource.get());
            return false;
        }
        
        // Check minimum time interval
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastAudioStartTime < MIN_AUDIO_INTERVAL_MS) {
            Log.w(TAG, "ABSOLUTELY BLOCKED - Too soon after last audio (" + 
                  (currentTime - lastAudioStartTime) + "ms ago)");
            return false;
        }
        
        // Mark as starting to prevent any other requests
        if (!isAudioStarting.compareAndSet(false, true)) {
            Log.w(TAG, "ABSOLUTELY BLOCKED - Another thread is starting audio");
            return false;
        }
        
        try {
            Log.d(TAG, "STARTING ABSOLUTE SINGLE AUDIO - " + alarmId + " from " + source);
            
            // Force stop any existing audio first
            forceStopCurrentAudio("NEW_AUDIO_REQUEST");
            
            // Create new service instance
            activeService = new ElevenLabsNativeService(context);
            
            // Set user profile
            if (userName != null && !userName.trim().isEmpty()) {
                activeService.setUserProfile(userName.trim());
            } else {
                activeService.setUserProfile("there");
            }
            
            // Update state before starting
            currentAlarmId.set(alarmId);
            currentSource.set(source);
            lastAudioStartTime = currentTime;
            isAudioActive.set(true);
            
            Log.d(TAG, "CALLING ElevenLabsNativeService.playEnhancedAlarmSpeech - " + alarmId);
            
            // Start the actual audio
            activeService.playEnhancedAlarmSpeech(taskTitle, scheduleTime);
            
            Log.d(TAG, "SUCCESS - Single ElevenLabs audio started for: " + alarmId + " from " + source);
            
            // Schedule auto-cleanup after 2 minutes
            scheduleAutoCleanup(alarmId);
            
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "ERROR starting ElevenLabs audio", e);
            // Reset state on error
            isAudioActive.set(false);
            currentAlarmId.set(null);
            currentSource.set(null);
            return false;
        } finally {
            isAudioStarting.set(false);
        }
    }
    
    /**
     * Play repeat audio (Hindi only)
     */
    public synchronized boolean playHindiQuoteOnly(String alarmId, String source, Context context) {
        Log.d(TAG, "playHindiQuoteOnly requested - AlarmId: " + alarmId + ", Source: " + source);
        
        // For manual repeat, allow if it's the same alarm or no audio is playing
        String currentAlarm = currentAlarmId.get();
        if (isAudioActive.get() && currentAlarm != null && !currentAlarm.equals(alarmId)) {
            Log.w(TAG, "BLOCKED - Different alarm audio is playing: " + currentAlarm);
            return false;
        }
        
        // Stop current audio first
        forceStopCurrentAudio("MANUAL_REPEAT");
        
        try {
            // Brief pause before repeat
            Thread.sleep(500);
            
            // Create new service for repeat
            activeService = new ElevenLabsNativeService(context);
            activeService.setUserProfile("there");
            
            // Update state
            currentAlarmId.set(alarmId);
            currentSource.set(source);
            isAudioActive.set(true);
            
            Log.d(TAG, "CALLING ElevenLabsNativeService.playHindiQuoteOnly - " + alarmId);
            activeService.playHindiQuoteOnly();
            
            Log.d(TAG, "SUCCESS - Hindi repeat audio started for: " + alarmId);
            
            scheduleAutoCleanup(alarmId);
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "ERROR in Hindi repeat audio", e);
            isAudioActive.set(false);
            currentAlarmId.set(null);
            currentSource.set(null);
            return false;
        }
    }
    
    /**
     * Stop audio for specific alarm
     */
    public synchronized void stopAudio(String alarmId, String source) {
        Log.d(TAG, "stopAudio requested - AlarmId: " + alarmId + ", Source: " + source);
        
        String currentAlarm = currentAlarmId.get();
        if (alarmId.equals(currentAlarm) || source.equals("FORCE_STOP")) {
            forceStopCurrentAudio("STOP_REQUEST_" + source);
            Log.d(TAG, "Audio stopped for: " + alarmId + " by " + source);
        } else {
            Log.d(TAG, "Stop request ignored - Different alarm: " + currentAlarm + " vs " + alarmId);
        }
    }
    
    /**
     * Force stop all audio immediately
     */
    public synchronized void forceStopAll(String source) {
        Log.d(TAG, "forceStopAll requested by: " + source);
        forceStopCurrentAudio("FORCE_STOP_ALL_" + source);
    }
    
    /**
     * Internal method to force stop current audio
     */
    private void forceStopCurrentAudio(String reason) {
        try {
            if (activeService != null) {
                Log.d(TAG, "Stopping active ElevenLabsNativeService - " + reason);
                activeService.stopAudio();
                activeService.cleanup();
                activeService = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping active service", e);
        }
        
        // Reset all state
        isAudioActive.set(false);
        isAudioStarting.set(false);
        currentAlarmId.set(null);
        currentSource.set(null);
        
        Log.d(TAG, "Audio state reset - " + reason);
    }
    
    /**
     * Schedule automatic cleanup
     */
    private void scheduleAutoCleanup(String alarmId) {
        new Thread(() -> {
            try {
                Thread.sleep(120000); // 2 minutes
                
                synchronized (this) {
                    if (alarmId.equals(currentAlarmId.get()) && isAudioActive.get()) {
                        Log.d(TAG, "Auto-cleanup triggered for: " + alarmId);
                        forceStopCurrentAudio("AUTO_CLEANUP");
                    }
                }
            } catch (InterruptedException e) {
                Log.d(TAG, "Auto-cleanup thread interrupted for: " + alarmId);
            }
        }).start();
    }
    
    /**
     * Check if audio is currently active
     */
    public boolean isAudioPlaying() {
        return isAudioActive.get();
    }
    
    /**
     * Get current playing alarm ID
     */
    public String getCurrentAlarmId() {
        return currentAlarmId.get();
    }
    
    /**
     * Get current source
     */
    public String getCurrentSource() {
        return currentSource.get();
    }
    
    /**
     * Get detailed status for debugging
     */
    public String getStatus() {
        return String.format("Active: %s, Starting: %s, AlarmId: %s, Source: %s, LastStart: %dms ago",
            isAudioActive.get(), isAudioStarting.get(), currentAlarmId.get(), currentSource.get(),
            System.currentTimeMillis() - lastAudioStartTime);
    }
}