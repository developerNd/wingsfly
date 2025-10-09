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

public class VoiceCommandAlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "VoiceCommandAlarmModule";
    private ReactApplicationContext reactContext;
    
    public VoiceCommandAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "VoiceCommandAlarmModule";
    }
    
    @ReactMethod
    public void scheduleVoiceCommandAlarm(ReadableMap alarmData, Promise promise) {
        try {
            String alarmId = alarmData.getString("id");
            String name = alarmData.getString("name");
            String time = alarmData.getString("start_time");
            boolean isEnabled = alarmData.getBoolean("is_enabled");
            
            // Parse days array
            String days = "";
            if (alarmData.hasKey("days") && alarmData.getArray("days") != null) {
                ReadableArray daysArray = alarmData.getArray("days");
                StringBuilder daysBuilder = new StringBuilder();
                for (int i = 0; i < daysArray.size(); i++) {
                    if (i > 0) daysBuilder.append(",");
                    daysBuilder.append(daysArray.getString(i));
                }
                days = daysBuilder.toString();
            }
            
            // Convert commands to JSON string - INCLUDE gap_minutes AND audio_file_path
            String commandsJson = "";
            if (alarmData.hasKey("commands") && alarmData.getArray("commands") != null) {
                ReadableArray commandsArray = alarmData.getArray("commands");
                JSONArray jsonArray = new JSONArray();
                
                for (int i = 0; i < commandsArray.size(); i++) {
                    ReadableMap cmd = commandsArray.getMap(i);
                    JSONObject jsonCmd = new JSONObject();
                    
                    jsonCmd.put("id", cmd.getString("id"));
                    jsonCmd.put("sequence", cmd.getInt("sequence"));
                    
                    // Handle text (optional if audio file is provided)
                    if (cmd.hasKey("text")) {
                        jsonCmd.put("text", cmd.getString("text"));
                    } else {
                        jsonCmd.put("text", "");
                    }
                    
                    // Extract gap_minutes
                    if (cmd.hasKey("gap_minutes")) {
                        int gapMinutes = cmd.getInt("gap_minutes");
                        jsonCmd.put("gap_minutes", gapMinutes);
                        Log.d(TAG, "Command " + (i+1) + " gap_minutes: " + gapMinutes);
                    } else {
                        jsonCmd.put("gap_minutes", 0);
                        Log.d(TAG, "Command " + (i+1) + " has no gap_minutes, defaulting to 0");
                    }
                    
                    // CRITICAL: Extract audio_file_path
                    if (cmd.hasKey("audio_file_path") && !cmd.isNull("audio_file_path")) {
                        String audioFilePath = cmd.getString("audio_file_path");
                        jsonCmd.put("audio_file_path", audioFilePath);
                        Log.d(TAG, "Command " + (i+1) + " audio_file_path: " + audioFilePath);
                    } else {
                        jsonCmd.put("audio_file_path", JSONObject.NULL);
                    }
                    
                    // Extract audio_file_name
                    if (cmd.hasKey("audio_file_name") && !cmd.isNull("audio_file_name")) {
                        String audioFileName = cmd.getString("audio_file_name");
                        jsonCmd.put("audio_file_name", audioFileName);
                        Log.d(TAG, "Command " + (i+1) + " audio_file_name: " + audioFileName);
                    } else {
                        jsonCmd.put("audio_file_name", JSONObject.NULL);
                    }
                    
                    jsonArray.put(jsonCmd);
                }
                
                commandsJson = jsonArray.toString();
                Log.d(TAG, "Commands JSON: " + commandsJson);
            }
            
            Log.d(TAG, "Scheduling voice command alarm: " + alarmId);
            Log.d(TAG, "Name: " + name + ", Time: " + time);
            
            if (!isEnabled) {
                Log.d(TAG, "Alarm is disabled, not scheduling");
                promise.resolve("alarm_disabled");
                return;
            }
            
            // Calculate next alarm time
            long nextAlarmTime = calculateNextAlarmTime(time, days);
            
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
            
            // Create voice command alarm intent
            Intent alarmIntent = new Intent(reactContext, VoiceCommandAlarmReceiver.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("name", name);
            alarmIntent.putExtra("time", time);
            alarmIntent.putExtra("days", days);
            alarmIntent.putExtra("commands", commandsJson);
            alarmIntent.putExtra("alarmType", "VOICE_COMMAND_ALARM");
            alarmIntent.setAction("VOICE_COMMAND_ALARM_" + alarmId);
            
            int requestCode = Math.abs(("voice_cmd_" + alarmId).hashCode());
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
                    Log.d(TAG, "Voice command alarm scheduled using setAlarmClock");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Voice command alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Voice command alarm scheduled using set");
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                Log.d(TAG, "Voice command alarm scheduled for: " + sdf.format(new Date(nextAlarmTime)));
                
                WritableMap result = Arguments.createMap();
                result.putString("alarmId", alarmId);
                result.putDouble("nextTriggerTime", nextAlarmTime);
                result.putString("nextTriggerTimeFormatted", sdf.format(new Date(nextAlarmTime)));
                
                promise.resolve(result);
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling alarm", e);
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling voice command alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelVoiceCommandAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling voice command alarm: " + alarmId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, VoiceCommandAlarmReceiver.class);
            alarmIntent.setAction("VOICE_COMMAND_ALARM_" + alarmId);
            
            int requestCode = Math.abs(("voice_cmd_" + alarmId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "Voice command alarm cancelled: " + alarmId);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling voice command alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void updateAlarmEnabled(String alarmId, boolean enabled, ReadableMap alarmData, Promise promise) {
        try {
            if (enabled) {
                scheduleVoiceCommandAlarm(alarmData, promise);
            } else {
                cancelVoiceCommandAlarm(alarmId, promise);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating alarm enabled state", e);
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }
    
    private long calculateNextAlarmTime(String time, String days) {
        try {
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            // If no specific days, set for today or tomorrow
            if (days == null || days.isEmpty()) {
                if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                    calendar.add(Calendar.DAY_OF_YEAR, 1);
                }
                return calendar.getTimeInMillis();
            }
            
            // Parse days and find next occurrence
            String[] dayArray = days.split(",");
            Calendar now = Calendar.getInstance();
            
            // Check today first
            int currentDayOfWeek = now.get(Calendar.DAY_OF_WEEK);
            String currentDay = getDayString(currentDayOfWeek);
            
            boolean foundToday = false;
            for (String day : dayArray) {
                if (day.trim().equals(currentDay) && calendar.getTimeInMillis() > System.currentTimeMillis()) {
                    foundToday = true;
                    break;
                }
            }
            
            if (foundToday) {
                return calendar.getTimeInMillis();
            }
            
            // Find next day
            for (int i = 1; i <= 7; i++) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
                int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
                String dayString = getDayString(dayOfWeek);
                
                for (String day : dayArray) {
                    if (day.trim().equals(dayString)) {
                        return calendar.getTimeInMillis();
                    }
                }
            }
            
            // Fallback to tomorrow
            calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            calendar.add(Calendar.DAY_OF_YEAR, 1);
            
            return calendar.getTimeInMillis();
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating next alarm time", e);
            return System.currentTimeMillis() + 60000;
        }
    }
    
    private String getDayString(int dayOfWeek) {
        switch (dayOfWeek) {
            case Calendar.SUNDAY: return "Sun";
            case Calendar.MONDAY: return "Mon";
            case Calendar.TUESDAY: return "Tue";
            case Calendar.WEDNESDAY: return "Wed";
            case Calendar.THURSDAY: return "Thu";
            case Calendar.FRIDAY: return "Fri";
            case Calendar.SATURDAY: return "Sat";
            default: return "Sun";
        }
    }
}