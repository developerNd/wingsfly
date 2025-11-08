package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;

public class MorningRoutineAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "MorningRoutineReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "Morning routine alarm receiver triggered");
        Log.d(TAG, "========================================");
        
        try {
            String action = intent.getAction();
            
            // Handle boot completed - reschedule alarms
            if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
                Log.d(TAG, "Device booted - will reschedule morning routine alarms");
                // TODO: Reschedule alarms from storage
                return;
            }
            
            String userId = intent.getStringExtra("userId");
            String name = intent.getStringExtra("name");
            String time = intent.getStringExtra("time");
            String commands = intent.getStringExtra("commands");
            String alarmType = intent.getStringExtra("alarmType");
            
            // CRITICAL: Get the starting command index
            int startFromIndex = intent.getIntExtra("startFromIndex", 0);
            
            if (userId == null || commands == null) {
                Log.e(TAG, "Missing data in morning routine alarm");
                return;
            }
            
            Log.d(TAG, "Morning routine triggered - User: " + userId + ", Name: " + name);
            Log.d(TAG, "Alarm Type: " + alarmType);
            Log.d(TAG, "Start from command index: " + startFromIndex);
            Log.d(TAG, "Commands: " + commands);
            
            // Acquire wake lock
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "MorningRoutine:WakeDevice"
                );
                wakeLock.acquire(5 * 60 * 1000L);
                Log.d(TAG, "Wake lock acquired");
            }
            
            // Check if device is locked
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // Start the morning voice command activity
            Intent activityIntent = new Intent(context, MorningVoiceCommandActivity.class);
            activityIntent.putExtra("userId", userId);
            activityIntent.putExtra("name", name);
            activityIntent.putExtra("time", time);
            activityIntent.putExtra("commands", commands);
            activityIntent.putExtra("isDeviceLocked", isLocked);
            activityIntent.putExtra("alarmType", alarmType);
            activityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            
            // CRITICAL: Pass the starting command index to activity
            activityIntent.putExtra("startFromIndex", startFromIndex);
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            try {
                context.startActivity(activityIntent);
                Log.d(TAG, "✅ Morning voice command activity started with command index: " + startFromIndex);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start activity", e);
                
                // Fallback: Start foreground service
                startMorningRoutineService(context, userId, name, time, commands, isLocked, startFromIndex);
            }
            
            // Release wake lock after delay
            final PowerManager.WakeLock finalWakeLock = wakeLock;
            if (finalWakeLock != null) {
                android.os.Handler handler = new android.os.Handler();
                handler.postDelayed(() -> {
                    try {
                        if (finalWakeLock.isHeld()) {
                            finalWakeLock.release();
                            Log.d(TAG, "Wake lock released");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error releasing wake lock", e);
                    }
                }, 30000);
            }
            
            Log.d(TAG, "========================================");
            
        } catch (Exception e) {
            Log.e(TAG, "Error in morning routine receiver", e);
        }
    }
    
    private void startMorningRoutineService(Context context, String userId, String name, 
                                           String time, String commands, boolean isLocked, int startFromIndex) {
        try {
            Intent serviceIntent = new Intent(context, MorningRoutineService.class);
            serviceIntent.putExtra("userId", userId);
            serviceIntent.putExtra("name", name);
            serviceIntent.putExtra("time", time);
            serviceIntent.putExtra("commands", commands);
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("startFromIndex", startFromIndex);
            serviceIntent.putExtra("serviceAction", "START_MORNING_ROUTINE");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Morning routine service started");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
        }
    }
}