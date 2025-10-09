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
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class TaskConfirmationAlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "TaskConfirmationModule";
    private static final int CONFIRMATION_MINUTES_BEFORE = 5;
    private ReactApplicationContext reactContext;
    
    public TaskConfirmationAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "TaskConfirmationAlarmModule";
    }
    
    /**
     * Schedule a confirmation alarm for a Plan Your Day task
     * Triggers 5 minutes before the task start time
     */
   @ReactMethod
public void scheduleTaskConfirmationAlarm(ReadableMap taskData, Promise promise) {
    try {
        String planId = taskData.getString("id");
        String taskTitle = taskData.getString("title");
        String taskDescription = taskData.hasKey("description") ? taskData.getString("description") : "";
        String startDate = taskData.getString("start_date");
        String startTime = taskData.getString("start_time");
        String category = taskData.hasKey("category") ? taskData.getString("category") : "";
        
        // FIXED: Use proper default and add logging
        String evaluationType = "yesNo"; // Correct default
        if (taskData.hasKey("evaluationType")) {
            evaluationType = taskData.getString("evaluationType");
            Log.d(TAG, "✓ Found evaluationType in taskData: " + evaluationType);
        } else {
            Log.w(TAG, "✗ evaluationType NOT found in taskData, using default: yesNo");
            Log.d(TAG, "Available keys in taskData: " + taskData.toHashMap().keySet());
        }
        
        Log.d(TAG, "Scheduling confirmation alarm for task: " + taskTitle);
        Log.d(TAG, "Start date: " + startDate + ", Start time: " + startTime);
        Log.d(TAG, "Evaluation type: " + evaluationType);
            
            // Calculate alarm time (5 minutes before start time)
            long alarmTime = calculateConfirmationTime(startDate, startTime);
            
            if (alarmTime <= System.currentTimeMillis()) {
                Log.w(TAG, "Calculated alarm time is in the past");
                promise.reject("INVALID_TIME", "Task start time is in the past or too soon");
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
            
            // Create confirmation alarm intent
            Intent alarmIntent = new Intent(reactContext, TaskConfirmationAlarmReceiver.class);
            alarmIntent.putExtra("planId", planId);
            alarmIntent.putExtra("taskTitle", taskTitle);
            alarmIntent.putExtra("taskDescription", taskDescription);
            alarmIntent.putExtra("startTime", startTime);
            alarmIntent.putExtra("category", category);
            alarmIntent.putExtra("evaluationType", evaluationType); // ADDED THIS LINE
            alarmIntent.putExtra("alarmType", "TASK_CONFIRMATION");
            alarmIntent.setAction("TASK_CONFIRMATION_" + planId);
            
            int requestCode = Math.abs(("task_confirm_" + planId).hashCode());
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
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(alarmTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "Confirmation alarm scheduled using setAlarmClock");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent);
                    Log.d(TAG, "Confirmation alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent);
                    Log.d(TAG, "Confirmation alarm scheduled using set");
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                Log.d(TAG, "Task confirmation alarm scheduled for: " + sdf.format(new Date(alarmTime)));
                
                WritableMap result = Arguments.createMap();
                result.putString("planId", planId);
                result.putDouble("confirmationTime", alarmTime);
                result.putString("confirmationTimeFormatted", sdf.format(new Date(alarmTime)));
                result.putInt("minutesBefore", CONFIRMATION_MINUTES_BEFORE);
                
                promise.resolve(result);
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling alarm", e);
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling task confirmation alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    /**
     * Cancel a task confirmation alarm
     */
    @ReactMethod
    public void cancelTaskConfirmationAlarm(String planId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling task confirmation alarm: " + planId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, TaskConfirmationAlarmReceiver.class);
            alarmIntent.setAction("TASK_CONFIRMATION_" + planId);
            
            int requestCode = Math.abs(("task_confirm_" + planId).hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "Task confirmation alarm cancelled: " + planId);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling task confirmation alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    /**
     * Update task confirmation alarm (cancel old and schedule new)
     */
    @ReactMethod
    public void updateTaskConfirmationAlarm(String oldPlanId, ReadableMap newTaskData, Promise promise) {
        try {
            // Cancel old alarm
            cancelTaskConfirmationAlarm(oldPlanId, new Promise() {
                @Override
                public void resolve(Object value) {
                    // Schedule new alarm
                    scheduleTaskConfirmationAlarm(newTaskData, promise);
                }
                
                @Override
                public void reject(String code, String message) {
                    promise.reject(code, message);
                }
                
                @Override
                public void reject(String code, Throwable throwable) {
                    promise.reject(code, throwable);
                }
                
                @Override
                public void reject(String code, String message, Throwable throwable) {
                    promise.reject(code, message, throwable);
                }
                
                @Override
                public void reject(Throwable throwable) {
                    promise.reject(throwable);
                }
                
                @Override
                public void reject(Throwable throwable, WritableMap userInfo) {
                    promise.reject(throwable);
                }
                
                @Override
                public void reject(String code, WritableMap userInfo) {
                    promise.reject(code, userInfo.toString());
                }
                
                @Override
                public void reject(String code, Throwable throwable, WritableMap userInfo) {
                    promise.reject(code, throwable);
                }
                
                @Override
                public void reject(String code, String message, WritableMap userInfo) {
                    promise.reject(code, message);
                }
                
                @Override
                public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {
                    promise.reject(code, message, throwable);
                }
                
                @Override
                public void reject(String message) {
                    promise.reject(message);
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating task confirmation alarm", e);
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }
    
    /**
     * Calculate the alarm time (5 minutes before task start time)
     */
    private long calculateConfirmationTime(String startDate, String startTime) {
        try {
            // Parse date and time
            String[] dateParts = startDate.split("-");
            String[] timeParts = startTime.split(":");
            
            int year = Integer.parseInt(dateParts[0]);
            int month = Integer.parseInt(dateParts[1]) - 1; // Calendar months are 0-indexed
            int day = Integer.parseInt(dateParts[2]);
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.YEAR, year);
            calendar.set(Calendar.MONTH, month);
            calendar.set(Calendar.DAY_OF_MONTH, day);
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            // Subtract 5 minutes
            calendar.add(Calendar.MINUTE, -CONFIRMATION_MINUTES_BEFORE);
            
            return calendar.getTimeInMillis();
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating confirmation time", e);
            return System.currentTimeMillis() + (5 * 60 * 1000); // Default to 5 minutes from now
        }
    }
}