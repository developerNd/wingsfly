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
        Log.d(TAG, "Custom alarm receiver triggered");
        
        try {
            String alarmId = intent.getStringExtra("alarmId");
            String time = intent.getStringExtra("time");
            String label = intent.getStringExtra("label");
            String days = intent.getStringExtra("days");
            String userId = intent.getStringExtra("userId");
            String alarmType = intent.getStringExtra("alarmType");
            boolean isSnooze = intent.getBooleanExtra("isSnooze", false);
            
            // NEW: Extract custom tone data
            String toneType = intent.getStringExtra("toneType");
            String customToneUri = intent.getStringExtra("customToneUri");
            String customToneName = intent.getStringExtra("customToneName");
            
            if (alarmId == null) {
                Log.e(TAG, "No alarm ID provided in custom alarm");
                return;
            }
            
            Log.d(TAG, "Custom alarm triggered - ID: " + alarmId + ", Time: " + time + ", Label: " + label);
            Log.d(TAG, "Is snooze: " + isSnooze + ", Type: " + alarmType);
            Log.d(TAG, "Tone type: " + toneType + ", Custom tone: " + (customToneUri != null ? "PROVIDED" : "NULL"));
            
            // Acquire wake lock to ensure device wakes up
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "CustomAlarm:WakeDevice"
                );
                wakeLock.acquire(5 * 60 * 1000L); // 5 minutes
                Log.d(TAG, "Wake lock acquired for custom alarm");
            }
            
            // Check if device is locked
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // Start the custom alarm activity
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
            
            // NEW: Pass custom tone data to activity
            alarmActivityIntent.putExtra("toneType", toneType != null ? toneType : "default");
            alarmActivityIntent.putExtra("customToneUri", customToneUri);
            alarmActivityIntent.putExtra("customToneName", customToneName);
            
            // Add flags for proper activity launch
            alarmActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            try {
                context.startActivity(alarmActivityIntent);
                Log.d(TAG, "Custom alarm activity started successfully with tone type: " + toneType);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start custom alarm activity", e);
                
                // Fallback: Start foreground service if activity fails
                startCustomAlarmService(context, alarmId, time, label, days, userId, isLocked, isSnooze, toneType, customToneUri, customToneName);
            }
            
            // If this is not a snooze, reschedule for next occurrence (if repeating)
            if (!isSnooze && days != null && !days.isEmpty()) {
                rescheduleRepeatingAlarm(context, alarmId, time, label, days, userId, toneType, customToneUri, customToneName);
            }
            
            // Release wake lock after a delay
            final PowerManager.WakeLock finalWakeLock = wakeLock;
            if (finalWakeLock != null) {
                android.os.Handler handler = new android.os.Handler();
                handler.postDelayed(() -> {
                    try {
                        if (finalWakeLock.isHeld()) {
                            finalWakeLock.release();
                            Log.d(TAG, "Wake lock released for custom alarm");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error releasing wake lock", e);
                    }
                }, 30000); // Release after 30 seconds
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error in custom alarm receiver", e);
        }
    }
    
    private void startCustomAlarmService(Context context, String alarmId, String time, String label, 
                                       String days, String userId, boolean isLocked, boolean isSnooze,
                                       String toneType, String customToneUri, String customToneName) {
        try {
            Intent serviceIntent = new Intent(context, CustomAlarmService.class);
            serviceIntent.putExtra("alarmId", alarmId);
            serviceIntent.putExtra("time", time);
            serviceIntent.putExtra("label", label);
            serviceIntent.putExtra("days", days);
            serviceIntent.putExtra("userId", userId);
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("isSnooze", isSnooze);
            serviceIntent.putExtra("serviceAction", "START_CUSTOM_ALARM");
            
            // NEW: Pass custom tone data to service
            serviceIntent.putExtra("toneType", toneType != null ? toneType : "default");
            serviceIntent.putExtra("customToneUri", customToneUri);
            serviceIntent.putExtra("customToneName", customToneName);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Custom alarm service started as fallback with tone type: " + toneType);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start custom alarm service", e);
        }
    }
    
    private void rescheduleRepeatingAlarm(Context context, String alarmId, String time, String label, 
                                        String days, String userId, String toneType, String customToneUri, String customToneName) {
        try {
            Log.d(TAG, "Rescheduling repeating custom alarm: " + alarmId);
            
            // Calculate next occurrence
            long nextAlarmTime = calculateNextAlarmTime(time, days);
            
            if (nextAlarmTime > System.currentTimeMillis()) {
                android.app.AlarmManager alarmManager = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                
                if (alarmManager != null) {
                    Intent nextAlarmIntent = new Intent(context, CustomAlarmReceiver.class);
                    nextAlarmIntent.putExtra("alarmId", alarmId);
                    nextAlarmIntent.putExtra("time", time);
                    nextAlarmIntent.putExtra("label", label);
                    nextAlarmIntent.putExtra("days", days);
                    nextAlarmIntent.putExtra("userId", userId);
                    nextAlarmIntent.putExtra("alarmType", "CUSTOM_ALARM");
                    
                    // NEW: Include custom tone data in rescheduled alarm
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
                    } else {
                        alarmManager.setExact(android.app.AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    }
                    
                    Log.d(TAG, "Next custom alarm scheduled for: " + new java.util.Date(nextAlarmTime) + " with tone type: " + toneType);
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling repeating alarm", e);
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
                return calendar.getTimeInMillis();
            }
            
            String[] dayArray = days.split(",");
            
            // Find next matching day within the next week
            for (int i = 0; i < 7; i++) {
                int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
                String dayString = getDayString(dayOfWeek);
                
                for (String day : dayArray) {
                    if (day.trim().equals(dayString)) {
                        return calendar.getTimeInMillis();
                    }
                }
                
                calendar.add(java.util.Calendar.DAY_OF_YEAR, 1);
            }
            
            // Fallback
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