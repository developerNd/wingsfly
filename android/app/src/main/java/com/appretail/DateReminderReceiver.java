package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

public class DateReminderReceiver extends BroadcastReceiver {
    
    private static final String TAG = "DateReminderReceiver";
    private static final String PREFS_NAME = "DateReminderPrefs";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_MORNING_TIME = "morning_time";
    private static final String KEY_EVENING_TIME = "evening_time";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "Date reminder TRIGGERED!");
        Log.d(TAG, "Action: " + intent.getAction());
        Log.d(TAG, "========================================");
        
        // Check if reminders are still enabled
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
        
        if (!enabled) {
            Log.w(TAG, "⚠️ Reminders are disabled - ignoring trigger");
            return;
        }
        
        // Determine if this is morning (7000) or evening (7001) reminder
        int requestCode = intent.getIntExtra("requestCode", -1);
        boolean isMorning = (requestCode == 7000);
        
        Log.d(TAG, "Request Code: " + requestCode + " - Type: " + (isMorning ? "MORNING" : "EVENING"));
        
        // Launch the date reminder activity
        try {
            Intent reminderIntent = new Intent(context, DateReminderActivity.class);
            reminderIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK | 
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_NO_ANIMATION
            );
            // Pass reminder type to activity
            reminderIntent.putExtra("isMorning", isMorning);
            
            context.startActivity(reminderIntent);
            
            Log.d(TAG, "✅ Date reminder activity launched successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error launching date reminder activity: " + e.getMessage(), e);
        }
        
        // Reschedule for next occurrence (tomorrow at same time)
        rescheduleNextOccurrence(context, intent);
    }
    
    private void rescheduleNextOccurrence(Context context, Intent intent) {
        try {
            int requestCode = intent.getIntExtra("requestCode", -1);
            if (requestCode == -1) {
                Log.w(TAG, "⚠️ No request code found - skipping reschedule");
                return;
            }
            
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String timeStr;
            
            if (requestCode == 7000) {
                timeStr = prefs.getString(KEY_MORNING_TIME, "7:0");
            } else if (requestCode == 7001) {
                timeStr = prefs.getString(KEY_EVENING_TIME, "19:0");
            } else {
                Log.w(TAG, "⚠️ Unknown request code: " + requestCode);
                return;
            }
            
            String[] timeParts = timeStr.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            // Schedule for tomorrow at same time
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_YEAR, 1);
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "❌ AlarmManager not available for rescheduling");
                return;
            }
            
            Intent rescheduleIntent = new Intent(context, DateReminderReceiver.class);
            rescheduleIntent.setAction("DATE_REMINDER_" + requestCode);
            rescheduleIntent.putExtra("requestCode", requestCode);
            
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                rescheduleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            long triggerTime = calendar.getTimeInMillis();
            
            // CRITICAL: Use setExactAndAllowWhileIdle for rescheduling too
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Rescheduled with setExactAndAllowWhileIdle - Works even when locked");
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Rescheduled with setExact");
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Rescheduled with set");
            }
            
            Log.d(TAG, "✅ Rescheduled for tomorrow at " + hour + ":" + String.format("%02d", minute));
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error rescheduling reminder: " + e.getMessage(), e);
        }
    }
}