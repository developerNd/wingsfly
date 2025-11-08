package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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
            
            // Convert commands to JSON string
            String commandsJson = "";
            if (routineData.hasKey("commands") && routineData.getArray("commands") != null) {
                ReadableArray commandsArray = routineData.getArray("commands");
                JSONArray jsonArray = new JSONArray();
                
                for (int i = 0; i < commandsArray.size(); i++) {
                    ReadableMap cmd = commandsArray.getMap(i);
                    JSONObject jsonCmd = new JSONObject();
                    
                    jsonCmd.put("id", cmd.getString("id"));
                    jsonCmd.put("sequence", cmd.getInt("sequence"));
                    jsonCmd.put("text", cmd.getString("text"));
                    
                    // Duration in minutes - how long to show lock screen
                    if (cmd.hasKey("duration")) {
                        int duration = cmd.getInt("duration");
                        jsonCmd.put("duration", duration);
                        Log.d(TAG, "Command " + (i+1) + " duration: " + duration + " minutes");
                    } else {
                        jsonCmd.put("duration", 2); // Default 2 minutes
                    }
                    
                    // Gap time in minutes
                    if (cmd.hasKey("gap_minutes")) {
                        int gapMinutes = cmd.getInt("gap_minutes");
                        jsonCmd.put("gap_minutes", gapMinutes);
                        Log.d(TAG, "Command " + (i+1) + " gap_minutes: " + gapMinutes);
                    } else {
                        jsonCmd.put("gap_minutes", 0);
                    }
                    
                    jsonArray.put(jsonCmd);
                }
                
                commandsJson = jsonArray.toString();
                Log.d(TAG, "Commands JSON: " + commandsJson);
            }
            
            Log.d(TAG, "Scheduling morning routine alarm for user: " + userId);
            Log.d(TAG, "Name: " + name + ", Time: " + time);
            
            if (!isEnabled) {
                Log.d(TAG, "Morning routine is disabled, not scheduling");
                promise.resolve("routine_disabled");
                return;
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
            
            // Create morning routine alarm intent
            Intent alarmIntent = new Intent(reactContext, MorningRoutineAlarmReceiver.class);
            alarmIntent.putExtra("userId", userId);
            alarmIntent.putExtra("name", name);
            alarmIntent.putExtra("time", time);
            alarmIntent.putExtra("commands", commandsJson);
            alarmIntent.putExtra("alarmType", "MORNING_ROUTINE");
            alarmIntent.setAction("MORNING_ROUTINE_ALARM_" + userId);
            
            int requestCode = Math.abs(("morning_routine_" + userId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel any existing alarm
            alarmManager.cancel(pendingIntent);
            
            // Schedule the alarm
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(nextAlarmTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "Morning routine alarm scheduled using setAlarmClock");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Morning routine alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Morning routine alarm scheduled using set");
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                Log.d(TAG, "Morning routine alarm scheduled for: " + sdf.format(new Date(nextAlarmTime)));
                
                WritableMap result = Arguments.createMap();
                result.putString("userId", userId);
                result.putDouble("nextTriggerTime", nextAlarmTime);
                result.putString("nextTriggerTimeFormatted", sdf.format(new Date(nextAlarmTime)));
                
                promise.resolve(result);
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling alarm", e);
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling morning routine alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelMorningRoutineAlarm(String userId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling morning routine alarm for user: " + userId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, MorningRoutineAlarmReceiver.class);
            alarmIntent.setAction("MORNING_ROUTINE_ALARM_" + userId);
            
            int requestCode = Math.abs(("morning_routine_" + userId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "Morning routine alarm cancelled for user: " + userId);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling morning routine alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
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
}