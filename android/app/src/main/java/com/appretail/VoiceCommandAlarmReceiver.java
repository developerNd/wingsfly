package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.app.KeyguardManager;

public class VoiceCommandAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "VoiceCommandAlarmReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Voice command alarm receiver triggered");
        
        try {
            String alarmId = intent.getStringExtra("alarmId");
            String name = intent.getStringExtra("name");
            String time = intent.getStringExtra("time");
            String days = intent.getStringExtra("days");
            String commands = intent.getStringExtra("commands");
            String alarmType = intent.getStringExtra("alarmType");
            
            if (alarmId == null || commands == null) {
                Log.e(TAG, "Missing alarm data in voice command alarm");
                return;
            }
            
            Log.d(TAG, "Voice command alarm triggered - ID: " + alarmId + ", Name: " + name);
            Log.d(TAG, "Commands: " + commands);
            
            // Acquire wake lock
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "VoiceCommandAlarm:WakeDevice"
                );
                wakeLock.acquire(5 * 60 * 1000L);
                Log.d(TAG, "Wake lock acquired");
            }
            
            // Check if device is locked
            KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            boolean isLocked = keyguardManager != null && keyguardManager.isKeyguardLocked();
            
            // Start the voice command alarm activity
            Intent alarmActivityIntent = new Intent(context, VoiceCommandAlarmActivity.class);
            alarmActivityIntent.putExtra("alarmId", alarmId);
            alarmActivityIntent.putExtra("name", name);
            alarmActivityIntent.putExtra("time", time);
            alarmActivityIntent.putExtra("days", days);
            alarmActivityIntent.putExtra("commands", commands);
            alarmActivityIntent.putExtra("isDeviceLocked", isLocked);
            alarmActivityIntent.putExtra("alarmType", alarmType);
            alarmActivityIntent.putExtra("triggeredTime", System.currentTimeMillis());
            
            alarmActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            
            try {
                context.startActivity(alarmActivityIntent);
                Log.d(TAG, "Voice command alarm activity started");
            } catch (Exception e) {
                Log.e(TAG, "Failed to start activity", e);
                
                // Fallback: Start foreground service
                startVoiceCommandAlarmService(context, alarmId, name, time, days, commands, isLocked);
            }
            
            // Reschedule if repeating
            if (days != null && !days.isEmpty()) {
                rescheduleRepeatingAlarm(context, alarmId, name, time, days, commands);
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
            
        } catch (Exception e) {
            Log.e(TAG, "Error in voice command alarm receiver", e);
        }
    }
    
    private void startVoiceCommandAlarmService(Context context, String alarmId, String name, 
                                              String time, String days, String commands, boolean isLocked) {
        try {
            Intent serviceIntent = new Intent(context, VoiceCommandAlarmService.class);
            serviceIntent.putExtra("alarmId", alarmId);
            serviceIntent.putExtra("name", name);
            serviceIntent.putExtra("time", time);
            serviceIntent.putExtra("days", days);
            serviceIntent.putExtra("commands", commands);
            serviceIntent.putExtra("isDeviceLocked", isLocked);
            serviceIntent.putExtra("serviceAction", "START_VOICE_COMMAND_ALARM");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Voice command alarm service started");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
        }
    }
    
    private void rescheduleRepeatingAlarm(Context context, String alarmId, String name, 
                                         String time, String days, String commands) {
        try {
            Log.d(TAG, "Rescheduling repeating voice command alarm: " + alarmId);
            
            long nextAlarmTime = calculateNextAlarmTime(time, days);
            
            if (nextAlarmTime > System.currentTimeMillis()) {
                android.app.AlarmManager alarmManager = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                
                if (alarmManager != null) {
                    Intent nextAlarmIntent = new Intent(context, VoiceCommandAlarmReceiver.class);
                    nextAlarmIntent.putExtra("alarmId", alarmId);
                    nextAlarmIntent.putExtra("name", name);
                    nextAlarmIntent.putExtra("time", time);
                    nextAlarmIntent.putExtra("days", days);
                    nextAlarmIntent.putExtra("commands", commands);
                    nextAlarmIntent.putExtra("alarmType", "VOICE_COMMAND_ALARM");
                    nextAlarmIntent.setAction("VOICE_COMMAND_ALARM_" + alarmId);
                    
                    int requestCode = Math.abs(("voice_cmd_" + alarmId).hashCode());
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
                    
                    Log.d(TAG, "Next alarm scheduled for: " + new java.util.Date(nextAlarmTime));
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling alarm", e);
        }
    }
    
    private long calculateNextAlarmTime(String time, String days) {
        try {
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.add(java.util.Calendar.DAY_OF_YEAR, 1);
            calendar.set(java.util.Calendar.HOUR_OF_DAY, hour);
            calendar.set(java.util.Calendar.MINUTE, minute);
            calendar.set(java.util.Calendar.SECOND, 0);
            calendar.set(java.util.Calendar.MILLISECOND, 0);
            
            if (days == null || days.isEmpty()) {
                return calendar.getTimeInMillis();
            }
            
            String[] dayArray = days.split(",");
            
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