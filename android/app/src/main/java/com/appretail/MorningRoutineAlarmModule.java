package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class MorningRoutineAlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "MorningRoutineAlarm";
    private static final String PREFS_NAME = "MorningRoutinePrefs";
    private ReactApplicationContext reactContext;
    
    public MorningRoutineAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "MorningRoutineAlarmModule";
    }
    
    @ReactMethod
    public void scheduleMorningRoutineAlarm(ReadableMap routineData, Promise promise) {
        try {
            String userId = routineData.getString("userId");
            String name = routineData.getString("name");
            String time = routineData.getString("time");
            boolean isEnabled = routineData.getBoolean("isEnabled");
            
            Log.d(TAG, "========================================");
            Log.d(TAG, "SCHEDULING DAILY MORNING WAKE-UP ALARM");
            Log.d(TAG, "User: " + userId + ", Name: " + name);
            Log.d(TAG, "Time: " + time + ", Enabled: " + isEnabled);
            
            if (!isEnabled) {
                Log.d(TAG, "Morning routine is disabled, not scheduling");
                promise.resolve("routine_disabled");
                return;
            }
            
            // ✅ SAVE ROUTINE CONFIG TO SHARED PREFERENCES for auto-rescheduling
            saveRoutineConfig(userId, name, time, isEnabled);
            Log.d(TAG, "✅ Routine config saved to SharedPreferences");
            
            // Convert commands to JSON string (optional - we fetch from DB on trigger)
            String commandsJson = "";
            if (routineData.hasKey("commands") && routineData.getArray("commands") != null) {
                ReadableArray commandsArray = routineData.getArray("commands");
                JSONArray jsonArray = new JSONArray();
                
                Log.d(TAG, "Converting " + commandsArray.size() + " commands to JSON...");
                
                for (int i = 0; i < commandsArray.size(); i++) {
                    ReadableMap cmd = commandsArray.getMap(i);
                    JSONObject jsonCmd = new JSONObject();
                    
                    jsonCmd.put("id", cmd.getString("id"));
                    jsonCmd.put("sequence", cmd.getInt("sequence"));
                    jsonCmd.put("text", cmd.getString("text"));
                    
                    int lockDurationSeconds = 0;
                    int gapTimeSeconds = 0;
                    
                    if (cmd.hasKey("lock_duration_seconds")) {
                        lockDurationSeconds = cmd.getInt("lock_duration_seconds");
                    } else if (cmd.hasKey("duration")) {
                        lockDurationSeconds = cmd.getInt("duration") * 60;
                    }
                    
                    if (cmd.hasKey("gap_time_seconds")) {
                        gapTimeSeconds = cmd.getInt("gap_time_seconds");
                    } else if (cmd.hasKey("gap_minutes")) {
                        gapTimeSeconds = cmd.getInt("gap_minutes") * 60;
                    }
                    
                    jsonCmd.put("lock_duration_seconds", lockDurationSeconds);
                    jsonCmd.put("gap_time_seconds", gapTimeSeconds);
                    
                    jsonArray.put(jsonCmd);
                    
                    Log.d(TAG, "Command " + (i+1) + ": " + cmd.getString("text"));
                    Log.d(TAG, "  Lock: " + lockDurationSeconds + "s (" + formatSeconds(lockDurationSeconds) + ")");
                    Log.d(TAG, "  Gap: " + gapTimeSeconds + "s (" + formatSeconds(gapTimeSeconds) + ")");
                }
                
                commandsJson = jsonArray.toString();
                Log.d(TAG, "Commands JSON created");
            }
            
            // Calculate next alarm time
            long nextAlarmTime = calculateNextAlarmTime(time);
            
            if (nextAlarmTime <= System.currentTimeMillis()) {
                promise.reject("INVALID_TIME", "Calculated alarm time is in the past");
                return;
            }
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            // Check for exact alarm permission on Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.e(TAG, "Exact alarm permission not granted");
                    promise.reject("PERMISSION_ERROR", "Exact alarm permission required");
                    return;
                }
            }
            
            // ✅ Schedule the alarm (will auto-reschedule in receiver)
            boolean scheduled = scheduleAlarmInternal(reactContext, userId, name, time, commandsJson, nextAlarmTime);
            
            if (!scheduled) {
                promise.reject("SCHEDULE_ERROR", "Failed to schedule alarm");
                return;
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "✅ Daily morning alarm scheduled for: " + sdf.format(new Date(nextAlarmTime)));
            Log.d(TAG, "⏰ Will automatically reschedule every day at this time");
            Log.d(TAG, "========================================");
            
            WritableMap result = Arguments.createMap();
            result.putString("userId", userId);
            result.putDouble("nextTriggerTime", nextAlarmTime);
            result.putString("nextTriggerTimeFormatted", sdf.format(new Date(nextAlarmTime)));
            result.putBoolean("isDailyRecurring", true);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling morning wake-up alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    /**
     * Internal method to schedule alarm - used by both JS and auto-reschedule
     */
    public static boolean scheduleAlarmInternal(Context context, String userId, String name, 
                                               String time, String commandsJson, long triggerTime) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available");
                return false;
            }
            
            // Check permission on Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.e(TAG, "Exact alarm permission not granted");
                    return false;
                }
            }
            
            // Create morning WAKE-UP alarm intent
            Intent alarmIntent = new Intent(context, MorningRoutineWakeUpAlarmReceiver.class);
            alarmIntent.putExtra("userId", userId);
            alarmIntent.putExtra("name", name);
            alarmIntent.putExtra("time", time);
            alarmIntent.putExtra("commands", commandsJson);
            alarmIntent.putExtra("alarmType", "MORNING_WAKEUP");
            alarmIntent.setAction("MORNING_WAKEUP_ALARM_" + userId);
            
            int requestCode = Math.abs(("morning_wakeup_" + userId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel any existing alarm
            alarmManager.cancel(pendingIntent);
            
            // Schedule the alarm
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "✅ Alarm scheduled using setAlarmClock");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                    Log.d(TAG, "✅ Alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                    Log.d(TAG, "✅ Alarm scheduled using set");
                }
                
                return true;
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling alarm", e);
                return false;
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error in scheduleAlarmInternal", e);
            return false;
        }
    }
    
    @ReactMethod
    public void cancelMorningRoutineAlarm(String userId, Promise promise) {
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Cancelling daily morning wake-up alarm for user: " + userId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, MorningRoutineWakeUpAlarmReceiver.class);
            alarmIntent.setAction("MORNING_WAKEUP_ALARM_" + userId);
            
            int requestCode = Math.abs(("morning_wakeup_" + userId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            // ✅ CLEAR SAVED CONFIG to prevent auto-reschedule
            clearRoutineConfig(userId);
            Log.d(TAG, "✅ Routine config cleared from SharedPreferences");
            
            Log.d(TAG, "✅ Daily morning alarm cancelled for user: " + userId);
            Log.d(TAG, "========================================");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling morning wake-up alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    /**
     * Save routine configuration to SharedPreferences
     */
    private void saveRoutineConfig(String userId, String name, String time, boolean isEnabled) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString("userId", userId);
            editor.putString("name", name);
            editor.putString("time", time);
            editor.putBoolean("isEnabled", isEnabled);
            editor.putLong("lastScheduled", System.currentTimeMillis());
            
            editor.apply();
            Log.d(TAG, "Routine config saved: " + userId + " at " + time);
        } catch (Exception e) {
            Log.e(TAG, "Error saving routine config", e);
        }
    }
    
    /**
     * Clear routine configuration from SharedPreferences
     */
    private void clearRoutineConfig(String userId) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.clear();
            editor.apply();
            Log.d(TAG, "Routine config cleared for user: " + userId);
        } catch (Exception e) {
            Log.e(TAG, "Error clearing routine config", e);
        }
    }
    
    /**
     * Get saved routine configuration
     */
    public static RoutineConfig getRoutineConfig(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            String userId = prefs.getString("userId", null);
            String name = prefs.getString("name", null);
            String time = prefs.getString("time", null);
            boolean isEnabled = prefs.getBoolean("isEnabled", false);
            
            if (userId != null && time != null && isEnabled) {
                return new RoutineConfig(userId, name, time, isEnabled);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting routine config", e);
        }
        
        return null;
    }
    
    private long calculateNextAlarmTime(String time) {
        try {
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            // If time has passed today, schedule for tomorrow
            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
            }
            
            return calendar.getTimeInMillis();
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating next alarm time", e);
            return System.currentTimeMillis() + 60000;
        }
    }
    
    /**
     * Calculate next day's alarm time (for auto-reschedule)
     */
    public static long calculateNextDayAlarmTime(String time) {
        try {
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_YEAR, 1); // ✅ Always schedule for tomorrow
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            return calendar.getTimeInMillis();
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating next day alarm time", e);
            return System.currentTimeMillis() + 86400000; // +24 hours
        }
    }
    
    private String formatSeconds(int totalSeconds) {
        if (totalSeconds <= 0) {
            return "0s";
        }
        
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        
        if (minutes > 0 && seconds > 0) {
            return minutes + "m " + seconds + "s";
        } else if (minutes > 0) {
            return minutes + "m";
        } else {
            return seconds + "s";
        }
    }
    
    /**
     * Inner class to hold routine configuration
     */
    public static class RoutineConfig {
        public String userId;
        public String name;
        public String time;
        public boolean isEnabled;
        
        public RoutineConfig(String userId, String name, String time, boolean isEnabled) {
            this.userId = userId;
            this.name = name;
            this.time = time;
            this.isEnabled = isEnabled;
        }
    }
}