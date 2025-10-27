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
        Log.d(TAG, "CustomAlarmModule initialized");
    }
    
    @Override
    public String getName() {
        return "CustomAlarmModule";
    }
    
    @ReactMethod
    public void scheduleCustomAlarm(ReadableMap alarmData, Promise promise) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "SCHEDULE CUSTOM ALARM REQUESTED");
        Log.d(TAG, "========================================");
        
        try {
            String alarmId = alarmData.getString("id");
            String time = alarmData.getString("time");
            String label = alarmData.getString("label");
            boolean isEnabled = alarmData.getBoolean("isEnabled");
            String userId = alarmData.getString("userId");
            
            // Extract custom tone data
            String toneType = alarmData.hasKey("toneType") ? alarmData.getString("toneType") : "default";
            String customToneUri = alarmData.hasKey("customToneUri") ? alarmData.getString("customToneUri") : null;
            String customToneName = alarmData.hasKey("customToneName") ? alarmData.getString("customToneName") : null;
            
            Log.d(TAG, "Alarm data received:");
            Log.d(TAG, "  - ID: " + alarmId);
            Log.d(TAG, "  - Time: " + time);
            Log.d(TAG, "  - Label: " + label);
            Log.d(TAG, "  - Enabled: " + isEnabled);
            Log.d(TAG, "  - UserID: " + userId);
            Log.d(TAG, "  - ToneType: " + toneType);
            Log.d(TAG, "  - CustomToneUri: " + (customToneUri != null ? customToneUri : "NULL"));
            Log.d(TAG, "  - CustomToneName: " + (customToneName != null ? customToneName : "NULL"));
            
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
                Log.d(TAG, "  - Days: " + days);
            } else {
                Log.d(TAG, "  - Days: NONE (one-time alarm)");
            }
            
            if (!isEnabled) {
                Log.w(TAG, "Alarm is disabled, not scheduling");
                promise.resolve("alarm_disabled");
                return;
            }
            
            // Validate custom tone if provided
            boolean customToneValid = true;
            if ("custom".equals(toneType) && customToneUri != null) {
                Log.d(TAG, "Validating custom tone...");
                customToneValid = validateCustomToneAdvanced(customToneUri);
                if (!customToneValid) {
                    Log.w(TAG, "Custom tone validation FAILED, falling back to default");
                    toneType = "default";
                    customToneUri = null;
                    customToneName = null;
                } else {
                    Log.d(TAG, "Custom tone validation PASSED");
                }
            }
            
            // Calculate next alarm time
            Log.d(TAG, "Calculating next alarm time...");
            long nextAlarmTime = calculateNextAlarmTime(time, days);
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            Log.d(TAG, "  - Current time: " + sdf.format(new Date()));
            Log.d(TAG, "  - Next alarm time: " + sdf.format(new Date(nextAlarmTime)));
            Log.d(TAG, "  - Time until alarm: " + ((nextAlarmTime - System.currentTimeMillis()) / 1000 / 60) + " minutes");
            
            if (nextAlarmTime <= System.currentTimeMillis()) {
                Log.e(TAG, "ALARM TIME IS IN THE PAST!");
                promise.reject("INVALID_TIME", "Calculated alarm time is in the past");
                return;
            }
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available!");
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            // Check for exact alarm permission on Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.e(TAG, "Exact alarm permission NOT GRANTED!");
                    promise.reject("PERMISSION_ERROR", "Exact alarm permission required");
                    return;
                } else {
                    Log.d(TAG, "Exact alarm permission: GRANTED");
                }
            } else {
                Log.d(TAG, "Android version < 12, exact alarm permission not required");
            }
            
            // Create custom alarm intent with tone data
            Intent alarmIntent = new Intent(reactContext, CustomAlarmReceiver.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("time", time);
            alarmIntent.putExtra("label", label);
            alarmIntent.putExtra("days", days);
            alarmIntent.putExtra("userId", userId);
            alarmIntent.putExtra("alarmType", "CUSTOM_ALARM");
            
            // Add custom tone data to intent
            alarmIntent.putExtra("toneType", toneType);
            alarmIntent.putExtra("customToneUri", customToneUri);
            alarmIntent.putExtra("customToneName", customToneName);
            
            alarmIntent.setAction("CUSTOM_ALARM_" + alarmId);
            
            Log.d(TAG, "Creating PendingIntent...");
            int requestCode = Math.abs(alarmId.hashCode());
            Log.d(TAG, "  - Request code: " + requestCode);
            
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel any existing alarm
            Log.d(TAG, "Cancelling any existing alarm with same ID...");
            alarmManager.cancel(pendingIntent);
            
            // Schedule the alarm with highest priority
            try {
                Log.d(TAG, "Scheduling alarm...");
                Log.d(TAG, "  - Android version: " + Build.VERSION.SDK_INT);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(nextAlarmTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "  - Scheduled using setAlarmClock (API 23+) - HIGHEST PRIORITY");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "  - Scheduled using setExact (API 19+)");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextAlarmTime, pendingIntent);
                    Log.d(TAG, "  - Scheduled using set (legacy)");
                }
                
                Log.d(TAG, "========================================");
                Log.d(TAG, "ALARM SCHEDULED SUCCESSFULLY!");
                Log.d(TAG, "  - AlarmID: " + alarmId);
                Log.d(TAG, "  - Next trigger: " + sdf.format(new Date(nextAlarmTime)));
                Log.d(TAG, "  - ToneType: " + toneType);
                if ("custom".equals(toneType)) {
                    Log.d(TAG, "  - CustomToneName: " + customToneName);
                }
                Log.d(TAG, "========================================");
                
                WritableMap result = Arguments.createMap();
                result.putString("alarmId", alarmId);
                result.putDouble("nextTriggerTime", nextAlarmTime);
                result.putString("nextTriggerTimeFormatted", sdf.format(new Date(nextAlarmTime)));
                result.putString("toneType", toneType);
                result.putString("customToneName", customToneName);
                result.putBoolean("customToneValid", customToneValid);
                
                promise.resolve(result);
                
            } catch (SecurityException e) {
                Log.e(TAG, "SECURITY EXCEPTION scheduling alarm", e);
                e.printStackTrace();
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            } catch (Exception e) {
                Log.e(TAG, "EXCEPTION scheduling alarm", e);
                e.printStackTrace();
                promise.reject("SCHEDULE_ERROR", e.getMessage());
            }
            
        } catch (Exception e) {
            Log.e(TAG, "========================================");
            Log.e(TAG, "ERROR SCHEDULING CUSTOM ALARM");
            Log.e(TAG, "========================================");
            Log.e(TAG, "Error details:", e);
            e.printStackTrace();
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelCustomAlarm(String alarmId, Promise promise) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "CANCEL CUSTOM ALARM REQUESTED");
        Log.d(TAG, "  - AlarmID: " + alarmId);
        Log.d(TAG, "========================================");
        
        try {
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available!");
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, CustomAlarmReceiver.class);
            alarmIntent.setAction("CUSTOM_ALARM_" + alarmId);
            
            int requestCode = Math.abs(alarmId.hashCode());
            Log.d(TAG, "  - Request code: " + requestCode);
            
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "Custom alarm CANCELLED successfully");
            Log.d(TAG, "========================================");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling custom alarm", e);
            e.printStackTrace();
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void updateAlarmEnabled(String alarmId, boolean enabled, ReadableMap alarmData, Promise promise) {
        Log.d(TAG, "Update alarm enabled: " + alarmId + " -> " + enabled);
        
        try {
            if (enabled) {
                scheduleCustomAlarm(alarmData, promise);
            } else {
                cancelCustomAlarm(alarmId, promise);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating alarm enabled state", e);
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void checkPermissions(Promise promise) {
        Log.d(TAG, "Checking permissions...");
        
        try {
            WritableMap permissions = Arguments.createMap();
            
            // Check exact alarm permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                boolean hasExactAlarm = alarmManager != null && alarmManager.canScheduleExactAlarms();
                permissions.putBoolean("exactAlarm", hasExactAlarm);
                Log.d(TAG, "  - Exact alarm permission: " + hasExactAlarm);
            } else {
                permissions.putBoolean("exactAlarm", true);
                Log.d(TAG, "  - Exact alarm permission: N/A (Android < 12)");
            }
            
            // Check battery optimization
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    boolean batteryOptDisabled = powerManager.isIgnoringBatteryOptimizations(packageName);
                    permissions.putBoolean("batteryOptimizationDisabled", batteryOptDisabled);
                    Log.d(TAG, "  - Battery optimization disabled: " + batteryOptDisabled);
                } else {
                    permissions.putBoolean("batteryOptimizationDisabled", false);
                    Log.w(TAG, "  - PowerManager is null");
                }
            } else {
                permissions.putBoolean("batteryOptimizationDisabled", true);
                Log.d(TAG, "  - Battery optimization: N/A (Android < 6)");
            }
            
            promise.resolve(permissions);
            
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void testCustomTone(String customToneUri, Promise promise) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "TEST CUSTOM TONE");
        Log.d(TAG, "  - URI: " + (customToneUri != null ? customToneUri : "NULL"));
        Log.d(TAG, "========================================");
        
        try {
            if (customToneUri == null || customToneUri.isEmpty()) {
                Log.w(TAG, "Custom tone URI is null or empty");
                promise.resolve(false);
                return;
            }
            
            boolean isValid = validateCustomToneAdvanced(customToneUri);
            Log.d(TAG, "Validation result: " + isValid);
            Log.d(TAG, "========================================");
            promise.resolve(isValid);
            
        } catch (Exception e) {
            Log.e(TAG, "Error testing custom tone", e);
            e.printStackTrace();
            promise.resolve(false);
        }
    }
    
    private boolean validateCustomToneAdvanced(String customToneUri) {
        if (customToneUri == null || customToneUri.isEmpty()) {
            Log.w(TAG, "Validation FAILED: URI is null or empty");
            return false;
        }
        
        Log.d(TAG, "Advanced validation for: " + customToneUri);
        
        try {
            Uri uri = Uri.parse(customToneUri);
            String scheme = uri.getScheme();
            Log.d(TAG, "  - URI scheme: " + scheme);
            
            // Method 1: Content resolver validation for content:// URIs
            if ("content".equals(scheme)) {
                Log.d(TAG, "  - Validating content:// URI...");
                if (!validateContentUri(uri)) {
                    return false;
                }
            }
            
            // Method 2: File system validation for file:// URIs
            if ("file".equals(scheme)) {
                Log.d(TAG, "  - Validating file:// URI...");
                if (!validateFileUri(uri)) {
                    return false;
                }
            }
            
            // Method 3: MediaMetadataRetriever validation
            Log.d(TAG, "  - Attempting MediaMetadataRetriever validation...");
            if (validateWithMediaMetadataRetriever(uri)) {
                Log.d(TAG, "  - SUCCESS: Validated with MediaMetadataRetriever");
                return true;
            }
            
            // Method 4: MediaPlayer validation (fallback)
            Log.d(TAG, "  - Attempting MediaPlayer validation...");
            if (validateWithMediaPlayer(uri)) {
                Log.d(TAG, "  - SUCCESS: Validated with MediaPlayer");
                return true;
            }
            
            Log.w(TAG, "  - FAILED: All validation methods failed");
            return false;
            
        } catch (Exception e) {
            Log.e(TAG, "  - EXCEPTION during validation", e);
            e.printStackTrace();
            return false;
        }
    }
    
    private boolean validateContentUri(Uri contentUri) {
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            
            try (Cursor cursor = resolver.query(contentUri, null, null, null, null)) {
                if (cursor == null) {
                    Log.w(TAG, "    - Content URI query returned null cursor");
                    return false;
                }
                
                if (cursor.getCount() == 0) {
                    Log.w(TAG, "    - Content URI query returned empty cursor");
                    return false;
                }
                
                Log.d(TAG, "    - Content URI accessible (" + cursor.getCount() + " results)");
                return true;
            }
            
        } catch (Exception e) {
            Log.w(TAG, "    - Content URI validation failed", e);
            return false;
        }
    }
    
    private boolean validateFileUri(Uri fileUri) {
        try {
            if (fileUri.getPath() == null) {
                Log.w(TAG, "    - File URI path is null");
                return false;
            }
            
            java.io.File file = new java.io.File(fileUri.getPath());
            
            if (!file.exists()) {
                Log.w(TAG, "    - File does not exist: " + fileUri.getPath());
                return false;
            }
            
            if (!file.canRead()) {
                Log.w(TAG, "    - File is not readable: " + fileUri.getPath());
                return false;
            }
            
            if (file.length() == 0) {
                Log.w(TAG, "    - File is empty: " + fileUri.getPath());
                return false;
            }
            
            Log.d(TAG, "    - File URI valid: " + fileUri.getPath() + " (" + file.length() + " bytes)");
            return true;
            
        } catch (Exception e) {
            Log.w(TAG, "    - File URI validation failed", e);
            return false;
        }
    }
    
    private boolean validateWithMediaMetadataRetriever(Uri uri) {
        MediaMetadataRetriever retriever = null;
        try {
            retriever = new MediaMetadataRetriever();
            
            if ("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) {
                retriever.setDataSource(reactContext, uri);
            } else {
                retriever.setDataSource(uri.toString());
            }
            
            String mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE);
            String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO);
            
            Log.d(TAG, "    - MIME: " + mimeType + ", Duration: " + duration + ", HasAudio: " + hasAudio);
            
            boolean isAudio = mimeType != null && mimeType.startsWith("audio/");
            boolean hasDuration = false;
            
            if (duration != null) {
                try {
                    long durationMs = Long.parseLong(duration);
                    hasDuration = durationMs > 0;
                } catch (NumberFormatException e) {
                    Log.w(TAG, "    - Could not parse duration");
                }
            }
            
            boolean hasAudioTrack = "yes".equals(hasAudio);
            boolean isValid = isAudio && (hasDuration || hasAudioTrack);
            
            Log.d(TAG, "    - Validation: " + isValid + " (audio:" + isAudio + ", duration:" + hasDuration + ", track:" + hasAudioTrack + ")");
            
            return isValid;
            
        } catch (Exception e) {
            Log.w(TAG, "    - MediaMetadataRetriever failed", e);
            return false;
        } finally {
            if (retriever != null) {
                try {
                    retriever.release();
                } catch (Exception e) {
                    Log.w(TAG, "    - Error releasing MediaMetadataRetriever", e);
                }
            }
        }
    }
    
    private boolean validateWithMediaPlayer(Uri uri) {
        MediaPlayer testPlayer = null;
        try {
            testPlayer = new MediaPlayer();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                testPlayer.setAudioAttributes(attributes);
            } else {
                testPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }
            
            if ("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) {
                testPlayer.setDataSource(reactContext, uri);
            } else {
                testPlayer.setDataSource(uri.toString());
            }
            
            testPlayer.prepare();
            int duration = testPlayer.getDuration();
            
            boolean isValid = duration > 0;
            Log.d(TAG, "    - MediaPlayer: Duration=" + duration + "ms, Valid=" + isValid);
            
            return isValid;
            
        } catch (Exception e) {
            Log.w(TAG, "    - MediaPlayer validation failed", e);
            return false;
        } finally {
            if (testPlayer != null) {
                try {
                    testPlayer.release();
                } catch (Exception e) {
                    Log.w(TAG, "    - Error releasing MediaPlayer", e);
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