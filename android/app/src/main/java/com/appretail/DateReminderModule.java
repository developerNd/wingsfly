package com.wingsfly;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class DateReminderModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "DateReminderModule";
    private static final String PREFS_NAME = "DateReminderPrefs";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_MORNING_TIME = "morning_time";
    private static final String KEY_EVENING_TIME = "evening_time";
    private static final String KEY_MORNING_IMAGE_URI = "morning_image_uri";
    private static final String KEY_EVENING_IMAGE_URI = "evening_image_uri";
    private static final String KEY_AUTO_CLOSE = "auto_close";
    
    private final ReactApplicationContext reactContext;
    
    public DateReminderModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }
    
    @Override
    public String getName() {
        return "DateReminderModule";
    }
    
    @ReactMethod
    public void scheduleReminders(String morningTime, String eveningTime, 
                                  String morningImageUri, String eveningImageUri, 
                                  boolean autoClose, Promise promise) {
        try {
            Log.d(TAG, "Scheduling reminders - Morning: " + morningTime + ", Evening: " + eveningTime);
            Log.d(TAG, "Morning Image: " + (morningImageUri != null && !morningImageUri.isEmpty() ? "Yes" : "No"));
            Log.d(TAG, "Evening Image: " + (eveningImageUri != null && !eveningImageUri.isEmpty() ? "Yes" : "No"));
            Log.d(TAG, "Auto Close: " + autoClose);
            
            // Save settings
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean(KEY_ENABLED, true);
            editor.putString(KEY_MORNING_TIME, morningTime);
            editor.putString(KEY_EVENING_TIME, eveningTime);
            editor.putBoolean(KEY_AUTO_CLOSE, autoClose);
            
            // Save image URIs (can be empty strings)
            editor.putString(KEY_MORNING_IMAGE_URI, morningImageUri != null ? morningImageUri : "");
            editor.putString(KEY_EVENING_IMAGE_URI, eveningImageUri != null ? eveningImageUri : "");
            
            editor.apply();
            
            // Parse times
            String[] morningParts = morningTime.split(":");
            int morningHour = Integer.parseInt(morningParts[0]);
            int morningMinute = Integer.parseInt(morningParts[1]);
            
            String[] eveningParts = eveningTime.split(":");
            int eveningHour = Integer.parseInt(eveningParts[0]);
            int eveningMinute = Integer.parseInt(eveningParts[1]);
            
            // Schedule alarms
            DateReminderScheduler.scheduleCustomReminders(
                reactContext,
                morningHour,
                morningMinute,
                eveningHour,
                eveningMinute
            );
            
            Log.d(TAG, "Reminders scheduled successfully with separate images and auto-close: " + autoClose);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling reminders: " + e.getMessage(), e);
            promise.reject("ERROR", "Failed to schedule reminders: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void cancelReminders(Promise promise) {
        try {
            Log.d(TAG, "Cancelling reminders");
            
            // Update settings
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean(KEY_ENABLED, false)
                .apply();
            
            // Cancel alarms
            DateReminderScheduler.cancelAllReminders(reactContext);
            
            Log.d(TAG, "Reminders cancelled successfully");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling reminders: " + e.getMessage(), e);
            promise.reject("ERROR", "Failed to cancel reminders: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void getSettings(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
            String morningTime = prefs.getString(KEY_MORNING_TIME, "7:0");
            String eveningTime = prefs.getString(KEY_EVENING_TIME, "19:0");
            String morningImageUri = prefs.getString(KEY_MORNING_IMAGE_URI, "");
            String eveningImageUri = prefs.getString(KEY_EVENING_IMAGE_URI, "");
            boolean autoClose = prefs.getBoolean(KEY_AUTO_CLOSE, false);
            
            WritableMap settings = Arguments.createMap();
            settings.putBoolean("enabled", enabled);
            settings.putString("morningTime", morningTime);
            settings.putString("eveningTime", eveningTime);
            settings.putString("morningImageUri", morningImageUri);
            settings.putString("eveningImageUri", eveningImageUri);
            settings.putBoolean("autoClose", autoClose);
            
            Log.d(TAG, "Retrieved settings - Enabled: " + enabled);
            Log.d(TAG, "Morning: " + morningTime + ", Has image: " + !morningImageUri.isEmpty());
            Log.d(TAG, "Evening: " + eveningTime + ", Has image: " + !eveningImageUri.isEmpty());
            Log.d(TAG, "Auto Close: " + autoClose);
            
            promise.resolve(settings);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting settings: " + e.getMessage(), e);
            promise.reject("ERROR", "Failed to get settings: " + e.getMessage());
        }
    }
}