package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;

public class TaskConfirmationAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "TaskConfirmationReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Task confirmation alarm receiver triggered");
        
        try {
            String planId = intent.getStringExtra("planId");
            String taskTitle = intent.getStringExtra("taskTitle");
            String taskDescription = intent.getStringExtra("taskDescription");
            String startTime = intent.getStringExtra("startTime");
            String category = intent.getStringExtra("category");
            String alarmType = intent.getStringExtra("alarmType");
            String evaluationType = intent.getStringExtra("evaluationType"); // ADDED THIS LINE
            
            if (planId == null || taskTitle == null) {
                Log.e(TAG, "Missing task data in confirmation alarm");
                return;
            }
            
            Log.d(TAG, "Task confirmation alarm triggered - ID: " + planId + ", Title: " + taskTitle + ", Type: " + evaluationType);
            
            // Acquire wake lock
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "TaskConfirmation:WakeDevice"
                );
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes max
                Log.d(TAG, "Wake lock acquired");
            }
            
            // Check if device is locked
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // Start the task confirmation activity
            Intent confirmationIntent = new Intent(context, TaskConfirmationAlarmActivity.class);
            confirmationIntent.putExtra("planId", planId);
            confirmationIntent.putExtra("taskTitle", taskTitle);
            confirmationIntent.putExtra("taskDescription", taskDescription);
            confirmationIntent.putExtra("startTime", startTime);
            confirmationIntent.putExtra("category", category);
            confirmationIntent.putExtra("evaluationType", evaluationType); // ADDED THIS LINE
            confirmationIntent.putExtra("isDeviceLocked", isLocked);
            confirmationIntent.putExtra("alarmType", alarmType);
            confirmationIntent.putExtra("triggeredTime", System.currentTimeMillis());
            
            confirmationIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            try {
                context.startActivity(confirmationIntent);
                Log.d(TAG, "Task confirmation activity started with evaluationType: " + evaluationType);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start activity", e);
                
                // Fallback: Start foreground service
                startTaskConfirmationService(context, planId, taskTitle, taskDescription, startTime, category, evaluationType, isLocked);
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
                }, 30000); // 30 seconds
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error in task confirmation receiver", e);
        }
    }
    
    private void startTaskConfirmationService(Context context, String planId, String taskTitle, 
                                             String taskDescription, String startTime, 
                                             String category, String evaluationType, boolean isLocked) { // ADDED evaluationType PARAMETER
        try {
            Intent serviceIntent = new Intent(context, TaskConfirmationAlarmService.class);
            serviceIntent.putExtra("planId", planId);
            serviceIntent.putExtra("taskTitle", taskTitle);
            serviceIntent.putExtra("taskDescription", taskDescription);
            serviceIntent.putExtra("startTime", startTime);
            serviceIntent.putExtra("category", category);
            serviceIntent.putExtra("evaluationType", evaluationType); // ADDED THIS LINE
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("serviceAction", "START_TASK_CONFIRMATION");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Task confirmation service started");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
        }
    }
}