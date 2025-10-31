package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;

public class CustomAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "CustomAlarmReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "ALARM RECEIVER TRIGGERED");
        Log.d(TAG, "========================================");
        Log.d(TAG, "Thread: " + Thread.currentThread().getName());
        Log.d(TAG, "Time: " + new java.util.Date().toString());
        
        try {
            String alarmId = intent.getStringExtra("alarmId");
            String time = intent.getStringExtra("time");
            String label = intent.getStringExtra("label");
            String days = intent.getStringExtra("days");
            String userId = intent.getStringExtra("userId");
            String alarmType = intent.getStringExtra("alarmType");
            boolean isSnooze = intent.getBooleanExtra("isSnooze", false);
            
            // Extract custom tone data
            String toneType = intent.getStringExtra("toneType");
            String customToneUri = intent.getStringExtra("customToneUri");
            String customToneName = intent.getStringExtra("customToneName");
            
            Log.d(TAG, "Alarm Data:");
            Log.d(TAG, "  - ID: " + alarmId);
            Log.d(TAG, "  - Time: " + time);
            Log.d(TAG, "  - Label: " + label);
            Log.d(TAG, "  - Days: " + days);
            Log.d(TAG, "  - UserId: " + userId);
            Log.d(TAG, "  - Type: " + alarmType);
            Log.d(TAG, "  - IsSnooze: " + isSnooze);
            Log.d(TAG, "  - ToneType: " + toneType);
            Log.d(TAG, "  - CustomToneUri: " + (customToneUri != null ? customToneUri : "NULL"));
            Log.d(TAG, "  - CustomToneName: " + (customToneName != null ? customToneName : "NULL"));
            
            if (alarmId == null) {
                Log.e(TAG, "CRITICAL ERROR: No alarm ID provided!");
                return;
            }
            
            // Check device state
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            
            boolean isInteractive = false;
            boolean isLocked = false;
            boolean isSecure = false;
            
            if (powerManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                    isInteractive = powerManager.isInteractive();
                } else {
                    isInteractive = powerManager.isScreenOn();
                }
            }
            
            if (keyguardManager != null) {
                isLocked = keyguardManager.isKeyguardLocked();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                    isSecure = keyguardManager.isKeyguardSecure();
                }
            }
            
            Log.d(TAG, "Device State:");
            Log.d(TAG, "  - Screen Interactive: " + isInteractive);
            Log.d(TAG, "  - Device Locked: " + isLocked);
            Log.d(TAG, "  - Secure Lock: " + isSecure);
            Log.d(TAG, "  - Android Version: " + Build.VERSION.SDK_INT);
            Log.d(TAG, "  - Device Model: " + Build.MODEL);
            Log.d(TAG, "  - Manufacturer: " + Build.MANUFACTURER);
            
            // Acquire wake lock IMMEDIATELY
            Log.d(TAG, "Acquiring wake lock...");
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                try {
                    wakeLock = powerManager.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK | 
                        PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                        PowerManager.ON_AFTER_RELEASE,
                        "CustomAlarm:WakeDevice"
                    );
                    wakeLock.acquire(5 * 60 * 1000L); // 5 minutes
                    Log.d(TAG, "Wake lock acquired successfully");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to acquire wake lock", e);
                }
            } else {
                Log.e(TAG, "PowerManager is null - cannot acquire wake lock!");
            }
            
            // Start the custom alarm activity with multiple launch attempts
            Log.d(TAG, "Launching alarm activity...");
            boolean activityLaunched = launchAlarmActivity(
                context, alarmId, time, label, days, userId, 
                isLocked, isSnooze, alarmType, toneType, customToneUri, customToneName
            );
            
            if (!activityLaunched) {
                Log.e(TAG, "Activity launch failed, starting fallback service...");
                startCustomAlarmService(
                    context, alarmId, time, label, days, userId, 
                    isLocked, isSnooze, toneType, customToneUri, customToneName
                );
            }
            
            // If this is not a snooze, reschedule for next occurrence (if repeating)
            if (!isSnooze && days != null && !days.isEmpty()) {
                Log.d(TAG, "Rescheduling repeating alarm...");
                rescheduleRepeatingAlarm(
                    context, alarmId, time, label, days, userId, 
                    toneType, customToneUri, customToneName
                );
            } else {
                Log.d(TAG, "Not rescheduling (isSnooze: " + isSnooze + ", days: " + days + ")");
            }
            
            // Release wake lock after a delay
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
                }, 30000); // Release after 30 seconds
            }
            
            Log.d(TAG, "========================================");
            Log.d(TAG, "ALARM RECEIVER COMPLETED SUCCESSFULLY");
            Log.d(TAG, "========================================");
            
        } catch (Exception e) {
            Log.e(TAG, "========================================");
            Log.e(TAG, "CRITICAL ERROR IN ALARM RECEIVER");
            Log.e(TAG, "========================================");
            Log.e(TAG, "Error details:", e);
            e.printStackTrace();
        }
    }
    
    private boolean launchAlarmActivity(Context context, String alarmId, String time, String label, 
                                   String days, String userId, boolean isLocked, boolean isSnooze,
                                   String alarmType, String toneType, String customToneUri, String customToneName) {
    try {
        Intent alarmActivityIntent = new Intent(context, CustomAlarmActivity.class);
        alarmActivityIntent.putExtra("alarmId", alarmId);
        alarmActivityIntent.putExtra("time", time);
        alarmActivityIntent.putExtra("label", label);
        alarmActivityIntent.putExtra("days", days);
        alarmActivityIntent.putExtra("userId", userId);
        alarmActivityIntent.putExtra("isDeviceLocked", isLocked);
        alarmActivityIntent.putExtra("isSnooze", isSnooze);
        alarmActivityIntent.putExtra("alarmType", alarmType);
        alarmActivityIntent.putExtra("triggeredTime", System.currentTimeMillis());
        
        // Pass custom tone data to activity
        alarmActivityIntent.putExtra("toneType", toneType != null ? toneType : "default");
        alarmActivityIntent.putExtra("customToneUri", customToneUri);
        alarmActivityIntent.putExtra("customToneName", customToneName);
        
        // CRITICAL: Use FULL_SCREEN_INTENT via Notification for locked screen
        if (isLocked) {
            Log.d(TAG, "Device is locked - using notification with full screen intent");
            showFullScreenNotification(context, alarmActivityIntent, alarmId, label);
        } else {
            Log.d(TAG, "Device is unlocked - launching activity directly");
            alarmActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION |
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            );
            
            context.startActivity(alarmActivityIntent);
        }
        
        Log.d(TAG, "Activity launch initiated successfully");
        
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Log.w(TAG, "Sleep interrupted", e);
        }
        
        return true;
        
    } catch (Exception e) {
        Log.e(TAG, "Failed to start alarm activity", e);
        e.printStackTrace();
        return false;
    }
}

// ADD THIS NEW METHOD
private void showFullScreenNotification(Context context, Intent fullScreenIntent, String alarmId, String label) {
    try {
        android.app.NotificationManager notificationManager = 
            (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        String channelId = "custom_alarm_channel";
        
        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                channelId,
                "Custom Alarms",
                android.app.NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for custom alarms");
            channel.enableVibration(true);
            channel.setSound(null, null);
            channel.setBypassDnd(true);
            notificationManager.createNotificationChannel(channel);
        }
        
        // Create PendingIntent for full screen
        android.app.PendingIntent fullScreenPendingIntent = android.app.PendingIntent.getActivity(
            context,
            Math.abs(alarmId.hashCode()),
            fullScreenIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
        );
        
        // Build notification with full screen intent
        android.app.Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new android.app.Notification.Builder(context, channelId);
        } else {
            builder = new android.app.Notification.Builder(context);
        }
        
        builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
               .setContentTitle(label != null ? label : "Alarm")
               .setContentText("Alarm is ringing")
               .setPriority(android.app.Notification.PRIORITY_MAX)
               .setCategory(android.app.Notification.CATEGORY_ALARM)
               .setFullScreenIntent(fullScreenPendingIntent, true)
               .setAutoCancel(true);
        
        notificationManager.notify(Math.abs(alarmId.hashCode()), builder.build());
        
        Log.d(TAG, "Full screen notification shown");
        
    } catch (Exception e) {
        Log.e(TAG, "Error showing full screen notification", e);
    }
}
    
    private void startCustomAlarmService(Context context, String alarmId, String time, String label, 
                                       String days, String userId, boolean isLocked, boolean isSnooze,
                                       String toneType, String customToneUri, String customToneName) {
        try {
            Log.d(TAG, "Starting custom alarm service as fallback...");
            
            Intent serviceIntent = new Intent(context, CustomAlarmService.class);
            serviceIntent.putExtra("alarmId", alarmId);
            serviceIntent.putExtra("time", time);
            serviceIntent.putExtra("label", label);
            serviceIntent.putExtra("days", days);
            serviceIntent.putExtra("userId", userId);
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("isSnooze", isSnooze);
            serviceIntent.putExtra("serviceAction", "START_CUSTOM_ALARM");
            
            // Pass custom tone data to service
            serviceIntent.putExtra("toneType", toneType != null ? toneType : "default");
            serviceIntent.putExtra("customToneUri", customToneUri);
            serviceIntent.putExtra("customToneName", customToneName);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                Log.d(TAG, "Started foreground service (Android O+)");
            } else {
                context.startService(serviceIntent);
                Log.d(TAG, "Started service (pre-Android O)");
            }
            
            Log.d(TAG, "Service started successfully with tone type: " + toneType);
            
        } catch (Exception e) {
            Log.e(TAG, "CRITICAL: Failed to start custom alarm service", e);
            e.printStackTrace();
        }
    }
    
    private void rescheduleRepeatingAlarm(Context context, String alarmId, String time, String label, 
                                        String days, String userId, String toneType, 
                                        String customToneUri, String customToneName) {
        try {
            Log.d(TAG, "Rescheduling repeating alarm: " + alarmId);
            
            // Calculate next occurrence
            long nextAlarmTime = calculateNextAlarmTime(time, days);
            
            Log.d(TAG, "Next alarm calculated for: " + new java.util.Date(nextAlarmTime));
            
            if (nextAlarmTime > System.currentTimeMillis()) {
                android.app.AlarmManager alarmManager = (android.app.AlarmManager) 
                    context.getSystemService(Context.ALARM_SERVICE);
                
                if (alarmManager != null) {
                    Intent nextAlarmIntent = new Intent(context, CustomAlarmReceiver.class);
                    nextAlarmIntent.putExtra("alarmId", alarmId);
                    nextAlarmIntent.putExtra("time", time);
                    nextAlarmIntent.putExtra("label", label);
                    nextAlarmIntent.putExtra("days", days);
                    nextAlarmIntent.putExtra("userId", userId);
                    nextAlarmIntent.putExtra("alarmType", "CUSTOM_ALARM");
                    
                    // Include custom tone data in rescheduled alarm
                    nextAlarmIntent.putExtra("toneType", toneType != null ? toneType : "default");
                    nextAlarmIntent.putExtra("customToneUri", customToneUri);
                    nextAlarmIntent.putExtra("customToneName", customToneName);
                    
                    nextAlarmIntent.setAction("CUSTOM_ALARM_" + alarmId);
                    
                    int requestCode = Math.abs(alarmId.hashCode());
                    android.app.PendingIntent pendingIntent = android.app.PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        nextAlarmIntent,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                    );
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        android.app.AlarmManager.AlarmClockInfo alarmClockInfo = 
                            new android.app.AlarmManager.AlarmClockInfo(nextAlarmTime, pendingIntent);
                        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                        Log.d(TAG, "Rescheduled using setAlarmClock");
                    } else {
                        alarmManager.setExact(android.app.AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                        Log.d(TAG, "Rescheduled using setExact");
                    }
                    
                    Log.d(TAG, "Successfully rescheduled for: " + new java.util.Date(nextAlarmTime));
                } else {
                    Log.e(TAG, "AlarmManager is null - cannot reschedule!");
                }
            } else {
                Log.w(TAG, "Calculated time is in the past, not rescheduling");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling repeating alarm", e);
            e.printStackTrace();
        }
    }
    
    private long calculateNextAlarmTime(String time, String days) {
        try {
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.add(java.util.Calendar.DAY_OF_YEAR, 1); // Start from tomorrow
            calendar.set(java.util.Calendar.HOUR_OF_DAY, hour);
            calendar.set(java.util.Calendar.MINUTE, minute);
            calendar.set(java.util.Calendar.SECOND, 0);
            calendar.set(java.util.Calendar.MILLISECOND, 0);
            
            if (days == null || days.isEmpty()) {
                Log.d(TAG, "No specific days, using tomorrow");
                return calendar.getTimeInMillis();
            }
            
            String[] dayArray = days.split(",");
            Log.d(TAG, "Looking for next occurrence in days: " + days);
            
            // Find next matching day within the next week
            for (int i = 0; i < 7; i++) {
                int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
                String dayString = getDayString(dayOfWeek);
                
                for (String day : dayArray) {
                    if (day.trim().equals(dayString)) {
                        Log.d(TAG, "Found next occurrence on: " + dayString);
                        return calendar.getTimeInMillis();
                    }
                }
                
                calendar.add(java.util.Calendar.DAY_OF_YEAR, 1);
            }
            
            // Fallback
            Log.w(TAG, "Could not find matching day, using fallback");
            return System.currentTimeMillis() + (24 * 60 * 60 * 1000);
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating next alarm time", e);
            return System.currentTimeMillis() + (24 * 60 * 60 * 1000);
        }
    }
    
    private String getDayString(int dayOfWeek) {
        switch (dayOfWeek) {
            case java.util.Calendar.SUNDAY: return "Sun";
            case java.util.Calendar.MONDAY: return "Mon";
            case java.util.Calendar.TUESDAY: return "Tue";
            case java.util.Calendar.WEDNESDAY: return "Wed";
            case java.util.Calendar.THURSDAY: return "Thu";
            case java.util.Calendar.FRIDAY: return "Fri";
            case java.util.Calendar.SATURDAY: return "Sat";
            default: return "Sun";
        }
    }
}