package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Calendar;

public class DateReminderScheduler {
    
    private static final String TAG = "DateReminderScheduler";
    private static final String PREFS_NAME = "DateReminderPrefs";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_MORNING_TIME = "morning_time";
    private static final String KEY_EVENING_TIME = "evening_time";
    
    private static final int MORNING_REQUEST_CODE = 7000;
    private static final int EVENING_REQUEST_CODE = 7001;
    
    /**
     * Reschedule reminders after boot or app restart
     */
    public static void scheduleDailyReminders(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
            
            if (!enabled) {
                Log.d(TAG, "Date reminders are disabled - skipping schedule");
                return;
            }
            
            String morningTime = prefs.getString(KEY_MORNING_TIME, "7:0");
            String eveningTime = prefs.getString(KEY_EVENING_TIME, "19:0");
            
            String[] morningParts = morningTime.split(":");
            int morningHour = Integer.parseInt(morningParts[0]);
            int morningMinute = Integer.parseInt(morningParts[1]);
            
            String[] eveningParts = eveningTime.split(":");
            int eveningHour = Integer.parseInt(eveningParts[0]);
            int eveningMinute = Integer.parseInt(eveningParts[1]);
            
            scheduleCustomReminders(context, morningHour, morningMinute, eveningHour, eveningMinute);
            
            Log.d(TAG, "✅ Daily reminders rescheduled from preferences");
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling daily reminders: " + e.getMessage(), e);
        }
    }
    
    /**
     * Schedule reminders with custom times
     */
    public static void scheduleCustomReminders(Context context, int morningHour, int morningMinute, 
                                               int eveningHour, int eveningMinute) {
        // Cancel existing alarms first
        cancelAllReminders(context);
        
        // Schedule new alarms
        scheduleReminder(context, morningHour, morningMinute, MORNING_REQUEST_CODE);
        scheduleReminder(context, eveningHour, eveningMinute, EVENING_REQUEST_CODE);
        
        Log.d(TAG, "✅ Custom reminders scheduled for " + morningHour + ":" + String.format("%02d", morningMinute) + 
              " and " + eveningHour + ":" + String.format("%02d", eveningMinute));
    }
    
    private static void scheduleReminder(Context context, int hour, int minute, int requestCode) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "❌ AlarmManager not available");
                return;
            }
            
            // Create intent for the receiver
            Intent intent = new Intent(context, DateReminderReceiver.class);
            intent.setAction("DATE_REMINDER_" + requestCode);
            intent.putExtra("requestCode", requestCode);
            
            // CRITICAL: Use FLAG_IMMUTABLE for Android 12+ and FLAG_UPDATE_CURRENT for reliability
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Set the calendar for the reminder time (TODAY)
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            // If the time has already passed today, schedule for tomorrow
            long currentTime = System.currentTimeMillis();
            if (calendar.getTimeInMillis() <= currentTime) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
                Log.d(TAG, "⏰ Time already passed, scheduling for tomorrow");
            }
            
            long triggerTime = calendar.getTimeInMillis();
            
            // CRITICAL: Use setExactAndAllowWhileIdle for MAXIMUM RELIABILITY
            // This works even in Doze mode and when device is locked
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // setExactAndAllowWhileIdle is the MOST RELIABLE method
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled with setExactAndAllowWhileIdle (Android 6+) - Works in Doze & locked");
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled with setExact (Android 4.4+)");
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                Log.d(TAG, "✅ Scheduled with set (Android < 4.4)");
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault());
            Log.d(TAG, "📅 Reminder set for " + hour + ":" + String.format("%02d", minute) + 
                  " (" + sdf.format(calendar.getTime()) + ")");
            Log.d(TAG, "Trigger time: " + triggerTime + " ms (Current: " + currentTime + " ms)");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error scheduling reminder: " + e.getMessage(), e);
        }
    }
    
    public static void cancelAllReminders(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "❌ AlarmManager not available for cancellation");
                return;
            }
            
            // Cancel morning reminder
            Intent morningIntent = new Intent(context, DateReminderReceiver.class);
            morningIntent.setAction("DATE_REMINDER_" + MORNING_REQUEST_CODE);
            PendingIntent morningPendingIntent = PendingIntent.getBroadcast(
                context, MORNING_REQUEST_CODE, morningIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(morningPendingIntent);
            
            // Cancel evening reminder
            Intent eveningIntent = new Intent(context, DateReminderReceiver.class);
            eveningIntent.setAction("DATE_REMINDER_" + EVENING_REQUEST_CODE);
            PendingIntent eveningPendingIntent = PendingIntent.getBroadcast(
                context, EVENING_REQUEST_CODE, eveningIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(eveningPendingIntent);
            
            Log.d(TAG, "✅ All date reminders cancelled");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error cancelling reminders: " + e.getMessage(), e);
        }
    }
}