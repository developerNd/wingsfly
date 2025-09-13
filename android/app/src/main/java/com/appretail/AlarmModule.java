package com.wingsfly;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class AlarmModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "AlarmModule";
    private ReactApplicationContext reactContext;
    
    public AlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "AlarmModule";
    }
    
    @ReactMethod
    public void scheduleAlarm(ReadableMap alarmData, Promise promise) {
        try {
            String alarmId = alarmData.getString("id");
            String taskTitle = alarmData.getString("taskTitle");
            String taskMessage = alarmData.getString("taskMessage");
            String taskId = alarmData.getString("taskId");
            double timestamp = alarmData.getDouble("timestamp");
            
            // TTS related fields - CRITICAL for personalized messages
            String ttsMessage = alarmData.hasKey("ttsMessage") ? alarmData.getString("ttsMessage") : null;
            String userName = alarmData.hasKey("userName") ? alarmData.getString("userName") : null;
            
            // NEW: ElevenLabs specific fields - ENHANCED INTEGRATION
            boolean useElevenLabs = alarmData.hasKey("useElevenLabs") ? alarmData.getBoolean("useElevenLabs") : false;
            String taskData = alarmData.hasKey("taskData") ? alarmData.getString("taskData") : null;
            String reminderData = alarmData.hasKey("reminderData") ? alarmData.getString("reminderData") : null;
            
            Log.d(TAG, "Scheduling ElevenLabs VOICE-ONLY alarm: " + alarmId + " for " + taskTitle + " at " + timestamp);
            Log.d(TAG, "ElevenLabs enabled: " + useElevenLabs);
            
            if (ttsMessage != null) {
                Log.d(TAG, "TTS Message: " + ttsMessage);
                Log.d(TAG, "User Name: " + userName);
            } else {
                Log.w(TAG, "No TTS message provided - using fallback");
            }
            
            if (useElevenLabs) {
                Log.d(TAG, "✅ ElevenLabs TTS will be used with Hindi quotes and automatic screen activation");
                if (taskData != null) {
                    Log.d(TAG, "Task data provided for enhanced TTS");
                }
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
            
            // Check battery optimization status
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    boolean isIgnored = powerManager.isIgnoringBatteryOptimizations(packageName);
                    if (!isIgnored) {
                        Log.w(TAG, "App is not whitelisted from battery optimization - may cause delays");
                    }
                }
            }
            
            long alarmTime = (long) timestamp;
            long currentTime = System.currentTimeMillis();
            
            // Minimal buffer for system processing
            long timeBuffer = 1000; // 1 second buffer
            
            // Validate alarm time
            if (alarmTime <= currentTime + timeBuffer) {
                Log.e(TAG, "Alarm time is too close or in the past: " + alarmTime + " vs " + (currentTime + timeBuffer));
                promise.reject("INVALID_TIME", "Alarm time must be at least 1 second in the future");
                return;
            }
            
            // Create alarm intent with ElevenLabs configuration
            Intent alarmIntent = new Intent(reactContext, AlarmReceiver.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("taskTitle", taskTitle);
            alarmIntent.putExtra("taskMessage", taskMessage);
            alarmIntent.putExtra("taskId", taskId);
            alarmIntent.putExtra("scheduledTime", alarmTime);
            alarmIntent.putExtra("alarmType", "VOICE_ONLY"); // Mark as voice-only alarm
            
            // NEW: ElevenLabs specific data - CRITICAL FOR INTEGRATION
            alarmIntent.putExtra("useElevenLabs", useElevenLabs);
            
            if (taskData != null && !taskData.trim().isEmpty()) {
                alarmIntent.putExtra("taskData", taskData.trim());
                Log.d(TAG, "Added task data for ElevenLabs TTS");
            }
            
            if (reminderData != null && !reminderData.trim().isEmpty()) {
                alarmIntent.putExtra("reminderData", reminderData.trim());
                Log.d(TAG, "Added reminder data for ElevenLabs TTS");
            }
            
            // CRITICAL: Pass TTS data to ensure personalized messages work
            if (ttsMessage != null && !ttsMessage.trim().isEmpty()) {
                alarmIntent.putExtra("ttsMessage", ttsMessage.trim());
                Log.d(TAG, "Added TTS message to alarm intent: " + ttsMessage.trim());
            } else {
                Log.w(TAG, "No valid TTS message - receiver will use fallback");
            }
            
            if (userName != null && !userName.trim().isEmpty()) {
                alarmIntent.putExtra("userName", userName.trim());
                Log.d(TAG, "Added user name to alarm intent: " + userName.trim());
            } else {
                Log.w(TAG, "No user name provided");
            }
            
            alarmIntent.setAction("TASK_ALARM_" + alarmId);
            
            // Use unique request code based on alarm ID
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Cancel any existing alarm with same ID first
            alarmManager.cancel(pendingIntent);
            
            // Schedule with the most precise method available for ElevenLabs alarm
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    // Use setAlarmClock for highest priority - DIRECT SCREEN ACTIVATION
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(alarmTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    Log.d(TAG, "ElevenLabs VOICE-ONLY alarm scheduled using setAlarmClock (highest priority + automatic screen activation)");
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent);
                    Log.d(TAG, "ElevenLabs VOICE-ONLY alarm scheduled using setExact");
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent);
                    Log.d(TAG, "ElevenLabs VOICE-ONLY alarm scheduled using set (legacy)");
                }
                
                // Log precise timing for debugging
                long scheduleDelay = alarmTime - currentTime;
                String alarmTypeDesc = useElevenLabs ? "ElevenLabs (English + Hindi quotes)" : "Standard TTS";
                
                Log.d(TAG, "Alarm scheduled successfully: " + alarmId + 
                      ", Target time: " + new java.util.Date(alarmTime) +
                      ", Delay from now: " + scheduleDelay + "ms" +
                      ", Has TTS: " + (ttsMessage != null && !ttsMessage.trim().isEmpty()) +
                      ", User: " + (userName != null ? userName.trim() : "unknown") +
                      ", Audio Type: " + alarmTypeDesc +
                      ", Screen Activation: AUTOMATIC (no tap required)" +
                      ", Type: VOICE_ONLY (no alarm sound)");
                
                promise.resolve(alarmId);
                
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception scheduling ElevenLabs alarm - may need exact alarm permission", e);
                promise.reject("SECURITY_ERROR", "Permission required for exact alarms");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling ElevenLabs alarm", e);
            promise.reject("SCHEDULE_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling ElevenLabs alarm: " + alarmId);
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, AlarmReceiver.class);
            alarmIntent.setAction("TASK_ALARM_" + alarmId);
            
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            
            Log.d(TAG, "ElevenLabs alarm cancelled: " + alarmId);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void requestExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                    Log.d(TAG, "Requesting exact alarm permission for ElevenLabs alarms");
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve("permission_requested");
                } else {
                    promise.resolve("permission_granted");
                }
            } else {
                promise.resolve("permission_not_required");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting exact alarm permission", e);
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void checkExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    boolean canSchedule = alarmManager.canScheduleExactAlarms();
                    Log.d(TAG, "ElevenLabs alarm permission status: " + canSchedule);
                    promise.resolve(canSchedule);
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking exact alarm permission", e);
            promise.resolve(false);
        }
    }
    
    @ReactMethod
    public void checkBatteryOptimization(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    boolean isIgnored = powerManager.isIgnoringBatteryOptimizations(packageName);
                    Log.d(TAG, "Battery optimization ignored: " + isIgnored);
                    promise.resolve(!isIgnored); // Return true if optimization is enabled (bad for alarms)
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization", e);
            promise.resolve(false);
        }
    }
    
    @ReactMethod
    public void requestBatteryOptimizationWhitelist(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    String packageName = reactContext.getPackageName();
                    if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                        Log.d(TAG, "Requesting battery optimization whitelist for ElevenLabs alarms");
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(android.net.Uri.parse("package:" + packageName));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        reactContext.startActivity(intent);
                        promise.resolve("whitelist_requested");
                    } else {
                        promise.resolve("already_whitelisted");
                    }
                } else {
                    promise.reject("POWER_MANAGER_ERROR", "PowerManager not available");
                }
            } else {
                promise.resolve("not_required");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization whitelist", e);
            promise.reject("WHITELIST_ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void getAlarmInfo(String alarmId, Promise promise) {
        try {
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
                return;
            }
            
            Intent alarmIntent = new Intent(reactContext, AlarmReceiver.class);
            alarmIntent.setAction("TASK_ALARM_" + alarmId);
            
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            
            boolean isScheduled = (pendingIntent != null);
            promise.resolve(isScheduled);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting alarm info", e);
            promise.resolve(false);
        }
    }
    
    @ReactMethod 
    public void getSystemInfo(Promise promise) {
        try {
            PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            String batteryOptStatus = "unknown";
            String exactAlarmStatus = "unknown";
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
                String packageName = reactContext.getPackageName();
                boolean isIgnored = powerManager.isIgnoringBatteryOptimizations(packageName);
                batteryOptStatus = isIgnored ? "whitelisted" : "not_whitelisted";
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager != null) {
                exactAlarmStatus = alarmManager.canScheduleExactAlarms() ? "granted" : "denied";
            } else {
                exactAlarmStatus = "not_required";
            }
            
            String info = "Android " + Build.VERSION.RELEASE + 
                         " (API " + Build.VERSION.SDK_INT + ")" +
                         ", Manufacturer: " + Build.MANUFACTURER +
                         ", Model: " + Build.MODEL +
                         ", Battery optimization: " + batteryOptStatus +
                         ", Exact alarm permission: " + exactAlarmStatus +
                         ", Alarm Type: ElevenLabs VOICE_ONLY (TTS personalized messages)" +
                         ", Screen Activation: AUTOMATIC (no tap required)" +
                         ", Sound: DISABLED (ElevenLabs voice messages only)" +
                         ", Features: English + Hindi motivational quotes + automatic screen activation";
            
            Log.d(TAG, "System info for ElevenLabs alarms: " + info);
            promise.resolve(info);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting system info", e);
            promise.reject("SYSTEM_INFO_ERROR", e.getMessage());
        }
    }
    
    // Enhanced test alarm method for ElevenLabs testing with automatic screen activation
    @ReactMethod
    public void scheduleImmediateTestAlarm(String testUserName, Promise promise) {
        try {
            long testTime = System.currentTimeMillis() + 15000; // 15 seconds from now
            String testAlarmId = "immediate_elevenlabs_test_" + System.currentTimeMillis();
            String userName = (testUserName != null && !testUserName.isEmpty()) ? testUserName : "Test User";
            
            // Create test TTS message in exact format you want
            String testTTSMessage = String.format("%s, your task is at %s. Are you available?", 
                userName, 
                "test time" // This will be replaced with actual time in production
            );
            
            Intent alarmIntent = new Intent(reactContext, AlarmReceiver.class);
            alarmIntent.putExtra("alarmId", testAlarmId);
            alarmIntent.putExtra("taskTitle", "ElevenLabs Test Alarm");
            alarmIntent.putExtra("taskMessage", "Testing immediate ElevenLabs alarm trigger with automatic screen activation");
            alarmIntent.putExtra("taskId", "test");
            alarmIntent.putExtra("ttsMessage", testTTSMessage);
            alarmIntent.putExtra("userName", userName);
            alarmIntent.putExtra("alarmType", "VOICE_ONLY"); // Mark as voice-only
            alarmIntent.putExtra("useElevenLabs", true); // CRITICAL: Enable ElevenLabs
            alarmIntent.setAction("TASK_ALARM_" + testAlarmId);
            
            int requestCode = Math.abs(testAlarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, 
                requestCode, 
                alarmIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(testTime, pendingIntent);
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, testTime, pendingIntent);
                }
                
                Log.d(TAG, "ElevenLabs test alarm scheduled for: " + new java.util.Date(testTime));
                Log.d(TAG, "Test TTS message: " + testTTSMessage);
                Log.d(TAG, "✅ ElevenLabs ENABLED - Will play English + Hindi quotes");
                Log.d(TAG, "✅ AUTOMATIC SCREEN ACTIVATION - No tap required");
                promise.resolve(testAlarmId);
            } else {
                promise.reject("ALARM_ERROR", "AlarmManager not available");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling immediate ElevenLabs test alarm", e);
            promise.reject("TEST_ERROR", e.getMessage());
        }
    }
}