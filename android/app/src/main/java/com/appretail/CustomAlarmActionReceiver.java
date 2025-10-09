package com.wingsfly;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CustomAlarmActionReceiver extends BroadcastReceiver {
    
    private static final String TAG = "CustomAlarmActionReceiver";
    private static final int SNOOZE_MINUTES = 5; // Changed to 5 minutes
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String action = intent.getStringExtra("action");
        
        Log.d(TAG, "Received action: " + action + " for alarm: " + alarmId);
        
        if (alarmId == null || action == null) {
            Log.e(TAG, "Missing alarmId or action in intent");
            return;
        }
        
        switch (action) {
            case "snooze":
                handleSnoozeAction(context, alarmId);
                break;
            case "stop":
                handleStopAction(context, alarmId);
                break;
            default:
                Log.w(TAG, "Unknown action: " + action);
        }
    }
    
    private void handleSnoozeAction(Context context, String alarmId) {
        Log.d(TAG, "Handling snooze action for alarm: " + alarmId);
        
        try {
            // Stop the current service
            CustomAlarmService.stopAlarmService(context, alarmId);
            
            // Schedule snooze alarm
            scheduleSnoozeAlarm(context, alarmId);
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling snooze action", e);
        }
    }
    
    private void handleStopAction(Context context, String alarmId) {
        Log.d(TAG, "Handling stop action for alarm: " + alarmId);
        
        try {
            // Stop the current service
            CustomAlarmService.stopAlarmService(context, alarmId);
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling stop action", e);
        }
    }
    
    private void scheduleSnoozeAlarm(Context context, String alarmId) {
        try {
            long snoozeTime = System.currentTimeMillis() + (SNOOZE_MINUTES * 60 * 1000); // 5 minutes
            
            android.app.AlarmManager alarmManager = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager != null) {
                Intent snoozeIntent = new Intent(context, CustomAlarmReceiver.class);
                snoozeIntent.putExtra("alarmId", alarmId);
                snoozeIntent.putExtra("time", ""); // Will be filled from original alarm data
                snoozeIntent.putExtra("label", "Snoozed Alarm");
                snoozeIntent.putExtra("days", "");
                snoozeIntent.putExtra("userId", "");
                snoozeIntent.putExtra("isSnooze", true);
                snoozeIntent.putExtra("alarmType", "CUSTOM_ALARM_SNOOZE");
                snoozeIntent.setAction("CUSTOM_ALARM_SNOOZE_" + alarmId + "_" + System.currentTimeMillis());
                
                int requestCode = Math.abs(("notification_snooze_" + alarmId).hashCode());
                android.app.PendingIntent snoozePendingIntent = android.app.PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    snoozeIntent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );
                
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
                } else {
                    alarmManager.setExact(android.app.AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
                }
                
                Log.d(TAG, "Snooze alarm scheduled for: " + new java.util.Date(snoozeTime) + " (" + SNOOZE_MINUTES + " minutes from now)");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling snooze alarm", e);
        }
    }
}