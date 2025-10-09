package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.content.ContentResolver;
import android.database.Cursor;
import android.media.MediaPlayer;
import android.media.AudioAttributes;
import android.media.AudioManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.util.Calendar;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.util.Locale;

public class CustomAlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "CustomAlarmModule";
    private ReactApplicationContext reactContext;
    
    public CustomAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "CustomAlarmModule";
    }
    
    @ReactMethod
    public void scheduleCustomAlarm(ReadableMap alarmData, Promise promise) {
        try {
            String alarmId = alarmData.getString("id");
            String time = alarmData.getString("time"); // Format: "HH:mm"
            String label = alarmData.getString("label");
            boolean isEnabled = alarmData.getBoolean("isEnabled");
            String userId = alarmData.getString("userId");
            
            // FIXED: Extract custom tone data with better validation
            String toneType = alarmData.hasKey("toneType") ? alarmData.getString("toneType") : "default";
            String customToneUri = alarmData.hasKey("customToneUri") ? alarmData.getString("customToneUri") : null;
            String customToneName = alarmData.hasKey("customToneName") ? alarmData.getString("customToneName") : null;
            
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
            
            Log.d(TAG, "Scheduling custom alarm: " + alarmId + " for time: " + time + " with label: " + label);
            Log.d(TAG, "Tone type: " + toneType + ", Custom tone URI: " + (customToneUri != null ? customToneUri : "NULL"));
            
            if (!isEnabled) {
                Log.d(TAG, "Alarm is disabled, not scheduling");
                promise.resolve("alarm_disabled");
                return;
            }
            
            // FIXED: Validate custom tone if provided with improved validation
            boolean customToneValid = true;
            if ("custom".equals(toneType) && customToneUri != null) {
                customToneValid = validateCustomToneAdvanced(customToneUri);
                if (!customToneValid) {
                    Log.w(TAG, "Custom tone validation failed, falling back to default");
                    toneType = "default";
                    customToneUri = null;
                    customToneName = null;
                }
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
            
            // Create custom alarm intent with tone data
            Intent alarmIntent = new Intent(reactContext, CustomAlarmReceiver.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("time", time);
            alarmIntent.putExtra("label", label);
            alarmIntent.putExtra("days", days);
            alarmIntent.putExtra("userId", userId);
            alarmIntent.putExtra("alarmType", "CUSTOM_ALARM");
            
            // FIXED: Add custom tone data to intent with validated values
            alarmIntent.putExtra("toneType", toneType);
            alarmIntent.putExtra("customToneUri", customToneUri);
            alarmIntent.putExtra("customToneName", customToneName);
            
            alarmIntent.setAction("CUSTOM_ALARM_" + alarmId);
            
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel any existing alarm
            alarmManager.cancel(pendingIntent);
            
            // Schedule the alarm with highest priority
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(nextAlarmTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "Custom alarm scheduled using setAlarmClock for maximum priority");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Custom alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "Custom alarm scheduled using set (legacy)");
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                Log.d(TAG, "Custom alarm scheduled successfully for: " + sdf.format(new Date(nextAlarmTime)));
                
                WritableMap result = Arguments.createMap();
                result.putString("alarmId", alarmId);
                result.putDouble("nextTriggerTime", nextAlarmTime);
                result.putString("nextTriggerTimeFormatted", sdf.format(new Date(nextAlarmTime)));
                result.putString("toneType", toneType);
                result.putString("customToneName", customToneName);
                result.putBoolean("customToneValid", customToneValid);
                
                promise.resolve(result);
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling custom alarm", e);
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling custom alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelCustomAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling custom alarm: " + alarmId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, CustomAlarmReceiver.class);
            alarmIntent.setAction("CUSTOM_ALARM_" + alarmId);
            
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "Custom alarm cancelled: " + alarmId);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling custom alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void updateAlarmEnabled(String alarmId, boolean enabled, ReadableMap alarmData, Promise promise) {
        try {
            if (enabled) {
                // Re-schedule the alarm
                scheduleCustomAlarm(alarmData, promise);
            } else {
                // Cancel the alarm
                cancelCustomAlarm(alarmId, promise);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating alarm enabled state", e);
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void getAllScheduledAlarms(Promise promise) {
        try {
            // This would typically query your database or shared preferences
            // For now, we'll return a placeholder
            WritableMap result = Arguments.createMap();
            result.putString("message", "Query your alarm database here");
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting scheduled alarms", e);
            promise.reject("GET_ALARMS_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void snoozeAlarm(String alarmId, int snoozeMinutes, Promise promise) {
        try {
            Log.d(TAG, "Snoozing alarm: " + alarmId + " for " + snoozeMinutes + " minutes");
            
            long snoozeTime = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent snoozeIntent = new Intent(reactContext, CustomAlarmReceiver.class);
            snoozeIntent.putExtra("alarmId", alarmId);
            snoozeIntent.putExtra("isSnooze", true);
            snoozeIntent.putExtra("alarmType", "CUSTOM_ALARM_SNOOZE");
            snoozeIntent.setAction("CUSTOM_ALARM_SNOOZE_" + alarmId);
            
            int requestCode = Math.abs(("snooze_" + alarmId).hashCode());
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
            }
            
            Log.d(TAG, "Alarm snoozed until: " + new Date(snoozeTime));
            promise.resolve("snoozed");
            
        } catch (Exception e) {
            Log.e(TAG, "Error snoozing alarm", e);
            promise.reject("SNOOZE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void checkPermissions(Promise promise) {
        try {
            WritableMap permissions = Arguments.createMap();
            
            // Check exact alarm permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                permissions.putBoolean("exactAlarm", alarmManager != null && alarmManager.canScheduleExactAlarms());
            } else {
                permissions.putBoolean("exactAlarm", true);
            }
            
            // Check battery optimization
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    permissions.putBoolean("batteryOptimizationDisabled", powerManager.isIgnoringBatteryOptimizations(packageName));
                } else {
                    permissions.putBoolean("batteryOptimizationDisabled", false);
                }
            } else {
                permissions.putBoolean("batteryOptimizationDisabled", true);
            }
            
            promise.resolve(permissions);
            
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void requestExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve("permission_requested");
                } else {
                    promise.resolve("permission_already_granted");
                }
            } else {
                promise.resolve("permission_not_required");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting exact alarm permission", e);
            promise.reject("PERMISSION_REQUEST_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void requestBatteryOptimizationDisable(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(android.net.Uri.parse("package:" + packageName));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        reactContext.startActivity(intent);
                        promise.resolve("optimization_disable_requested");
                    } else {
                        promise.resolve("already_disabled");
                    }
                } else {
                    promise.reject("POWER_MANAGER_ERROR", "PowerManager not available");
                }
            } else {
                promise.resolve("not_required");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization disable", e);
            promise.reject("OPTIMIZATION_REQUEST_ERROR", e.getMessage());
        }
    }
    
    /**
     * FIXED: Enhanced test custom tone method with multiple validation approaches
     */
    @ReactMethod
    public void testCustomTone(String customToneUri, Promise promise) {
        try {
            if (customToneUri == null || customToneUri.isEmpty()) {
                promise.resolve(false);
                return;
            }
            
            boolean isValid = validateCustomToneAdvanced(customToneUri);
            Log.d(TAG, "Custom tone validation result: " + isValid + " for URI: " + customToneUri);
            promise.resolve(isValid);
            
        } catch (Exception e) {
            Log.e(TAG, "Error testing custom tone", e);
            promise.resolve(false);
        }
    }
    
    /**
     * FIXED: Advanced custom tone validation with multiple approaches
     */
    private boolean validateCustomToneAdvanced(String customToneUri) {
        if (customToneUri == null || customToneUri.isEmpty()) {
            Log.d(TAG, "Custom tone URI is null or empty");
            return false;
        }
        
        Log.d(TAG, "Advanced validation for custom tone URI: " + customToneUri);
        
        try {
            Uri uri = Uri.parse(customToneUri);
            
            // Method 1: Content resolver validation for content:// URIs
            if ("content".equals(uri.getScheme())) {
                if (!validateContentUri(uri)) {
                    return false;
                }
            }
            
            // Method 2: File system validation for file:// URIs
            if ("file".equals(uri.getScheme())) {
                if (!validateFileUri(uri)) {
                    return false;
                }
            }
            
            // Method 3: MediaMetadataRetriever validation
            if (validateWithMediaMetadataRetriever(uri)) {
                Log.d(TAG, "Custom tone validated successfully with MediaMetadataRetriever");
                return true;
            }
            
            // Method 4: MediaPlayer validation (fallback)
            if (validateWithMediaPlayer(uri)) {
                Log.d(TAG, "Custom tone validated successfully with MediaPlayer");
                return true;
            }
            
            Log.w(TAG, "All validation methods failed for custom tone");
            return false;
            
        } catch (Exception e) {
            Log.e(TAG, "Exception during custom tone validation", e);
            return false;
        }
    }
    
    /**
     * FIXED: Validate content:// URIs
     */
    private boolean validateContentUri(Uri contentUri) {
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            
            // Check if we can access the content URI
            try (Cursor cursor = resolver.query(contentUri, null, null, null, null)) {
                if (cursor == null) {
                    Log.w(TAG, "Content URI query returned null cursor");
                    return false;
                }
                
                if (cursor.getCount() == 0) {
                    Log.w(TAG, "Content URI query returned empty cursor");
                    return false;
                }
                
                Log.d(TAG, "Content URI is accessible with " + cursor.getCount() + " results");
                return true;
                
            } catch (Exception e) {
                Log.w(TAG, "Error querying content URI", e);
                return false;
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Content URI validation failed", e);
            return false;
        }
    }
    
    /**
     * FIXED: Validate file:// URIs
     */
    private boolean validateFileUri(Uri fileUri) {
        try {
            if (fileUri.getPath() == null) {
                Log.w(TAG, "File URI path is null");
                return false;
            }
            
            java.io.File file = new java.io.File(fileUri.getPath());
            if (!file.exists()) {
                Log.w(TAG, "File does not exist: " + fileUri.getPath());
                return false;
            }
            
            if (!file.canRead()) {
                Log.w(TAG, "File is not readable: " + fileUri.getPath());
                return false;
            }
            
            if (file.length() == 0) {
                Log.w(TAG, "File is empty: " + fileUri.getPath());
                return false;
            }
            
            Log.d(TAG, "File URI validation passed: " + fileUri.getPath() + " (size: " + file.length() + " bytes)");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "File URI validation failed", e);
            return false;
        }
    }
    
    /**
     * FIXED: Enhanced MediaMetadataRetriever validation
     */
    private boolean validateWithMediaMetadataRetriever(Uri uri) {
        MediaMetadataRetriever retriever = null;
        try {
            retriever = new MediaMetadataRetriever();
            
            if ("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) {
                retriever.setDataSource(reactContext, uri);
            } else {
                retriever.setDataSource(uri.toString());
            }
            
            // Get basic metadata to verify it's a valid audio file
            String mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE);
            String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO);
            
            Log.d(TAG, "MediaMetadataRetriever results - MIME: " + mimeType + ", Duration: " + duration + ", HasAudio: " + hasAudio);
            
            // Check if it's an audio file
            boolean isAudio = mimeType != null && mimeType.startsWith("audio/");
            
            // Check if it has duration
            boolean hasDuration = false;
            if (duration != null) {
                try {
                    long durationMs = Long.parseLong(duration);
                    hasDuration = durationMs > 0;
                } catch (NumberFormatException e) {
                    Log.w(TAG, "Could not parse duration: " + duration);
                }
            }
            
            // Check if it explicitly has audio track
            boolean hasAudioTrack = "yes".equals(hasAudio);
            
            boolean isValid = isAudio && (hasDuration || hasAudioTrack);
            
            Log.d(TAG, "MediaMetadataRetriever validation result: " + isValid + " (isAudio: " + isAudio + ", hasDuration: " + hasDuration + ", hasAudioTrack: " + hasAudioTrack + ")");
            
            return isValid;
            
        } catch (Exception e) {
            Log.w(TAG, "MediaMetadataRetriever validation failed for URI: " + uri.toString(), e);
            return false;
        } finally {
            if (retriever != null) {
                try {
                    retriever.release();
                } catch (Exception e) {
                    Log.w(TAG, "Error releasing MediaMetadataRetriever", e);
                }
            }
        }
    }
    
    /**
     * FIXED: Enhanced MediaPlayer validation
     */
    private boolean validateWithMediaPlayer(Uri uri) {
        MediaPlayer testPlayer = null;
        try {
            testPlayer = new MediaPlayer();
            
            // Set audio attributes
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                testPlayer.setAudioAttributes(attributes);
            } else {
                testPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }
            
            // Set data source
            if ("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) {
                testPlayer.setDataSource(reactContext, uri);
            } else {
                testPlayer.setDataSource(uri.toString());
            }
            
            // Prepare synchronously
            testPlayer.prepare();
            
            // Get duration
            int duration = testPlayer.getDuration();
            
            boolean isValid = duration > 0;
            
            Log.d(TAG, "MediaPlayer validation - URI: " + uri.toString() + ", Duration: " + duration + "ms, Valid: " + isValid);
            
            return isValid;
            
        } catch (Exception e) {
            Log.w(TAG, "MediaPlayer validation failed for URI: " + uri.toString(), e);
            return false;
        } finally {
            if (testPlayer != null) {
                try {
                    testPlayer.release();
                } catch (Exception e) {
                    Log.w(TAG, "Error releasing test MediaPlayer", e);
                }
            }
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
            return System.currentTimeMillis() + 60000; // Default to 1 minute from now
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