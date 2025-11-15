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
    private static final String KEY_LAST_SYNC = "last_sync_time";
    
    private final ReactApplicationContext reactContext;
    
    public DateReminderModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }
    
    @Override
    public String getName() {
        return "DateReminderModule";
    }
    
    /**
     * Enable reminders - fetch from database and schedule
     */
    @ReactMethod
    public void enableReminders(Promise promise) {
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "Enabling date reminders - fetching from database...");
            
            // Fetch and apply settings
            boolean success = syncAndScheduleFromDatabase();
            
            if (success) {
                // Mark as enabled
                SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putBoolean(KEY_ENABLED, true).apply();
                
                Log.d(TAG, "✅ Reminders enabled successfully");
                Log.d(TAG, "========================================");
                promise.resolve(true);
            } else {
                Log.e(TAG, "❌ Failed to enable reminders");
                Log.d(TAG, "========================================");
                promise.reject("ERROR", "No settings found in database");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error enabling reminders: " + e.getMessage(), e);
            Log.d(TAG, "========================================");
            promise.reject("ERROR", "Failed to enable reminders: " + e.getMessage());
        }
    }
    
    /**
     * Disable reminders - cancel alarms
     */
    @ReactMethod
    public void disableReminders(Promise promise) {
        try {
            Log.d(TAG, "Disabling reminders");
            
            // Update local settings
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean(KEY_ENABLED, false)
                .apply();
            
            // Cancel all alarms
            DateReminderScheduler.cancelAllReminders(reactContext);
            
            Log.d(TAG, "✅ Reminders disabled successfully");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error disabling reminders: " + e.getMessage(), e);
            promise.reject("ERROR", "Failed to disable reminders: " + e.getMessage());
        }
    }
    
    /**
     * Sync settings from database if enabled
     * Called when app comes to foreground or periodically
     */
    @ReactMethod
    public void syncSettings(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
            
            if (!enabled) {
                Log.d(TAG, "Reminders disabled - skipping sync");
                promise.resolve(false);
                return;
            }
            
            Log.d(TAG, "========================================");
            Log.d(TAG, "Syncing settings from database...");
            
            boolean success = syncAndScheduleFromDatabase();
            
            if (success) {
                Log.d(TAG, "✅ Settings synced and rescheduled successfully");
                Log.d(TAG, "========================================");
                promise.resolve(true);
            } else {
                Log.w(TAG, "⚠️ Sync failed - keeping existing settings");
                Log.d(TAG, "========================================");
                promise.resolve(false);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error syncing settings: " + e.getMessage(), e);
            Log.d(TAG, "========================================");
            promise.reject("ERROR", "Failed to sync settings: " + e.getMessage());
        }
    }
    
    /**
     * Force refresh - fetch from database and reschedule
     */
    @ReactMethod
    public void forceRefresh(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
            
            if (!enabled) {
                promise.reject("ERROR", "Reminders are not enabled");
                return;
            }
            
            Log.d(TAG, "========================================");
            Log.d(TAG, "Force refreshing settings from database...");
            
            boolean success = syncAndScheduleFromDatabase();
            
            if (success) {
                Log.d(TAG, "✅ Force refresh successful");
                Log.d(TAG, "========================================");
                promise.resolve(true);
            } else {
                Log.e(TAG, "❌ Force refresh failed");
                Log.d(TAG, "========================================");
                promise.reject("ERROR", "Failed to refresh settings");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error in force refresh: " + e.getMessage(), e);
            Log.d(TAG, "========================================");
            promise.reject("ERROR", "Failed to force refresh: " + e.getMessage());
        }
    }
    
    /**
     * Get current settings and sync status
     */
    @ReactMethod
    public void getSettings(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
            long lastSync = prefs.getLong(KEY_LAST_SYNC, 0);
            
            WritableMap settings = Arguments.createMap();
            settings.putBoolean("enabled", enabled);
            settings.putDouble("lastSyncTime", lastSync);
            
            // Add current times for display (if available)
            if (enabled) {
                String morningTime = prefs.getString("morning_time", "");
                String eveningTime = prefs.getString("evening_time", "");
                boolean autoClose = prefs.getBoolean("auto_close", false);
                
                settings.putString("morningTime", morningTime);
                settings.putString("eveningTime", eveningTime);
                settings.putBoolean("autoClose", autoClose);
            }
            
            Log.d(TAG, "Retrieved settings - Enabled: " + enabled + ", Last sync: " + lastSync);
            
            promise.resolve(settings);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting settings: " + e.getMessage(), e);
            promise.reject("ERROR", "Failed to get settings: " + e.getMessage());
        }
    }
    
    /**
     * Internal method to sync from database and schedule alarms
     * Returns true if successful, false otherwise
     */
    private boolean syncAndScheduleFromDatabase() {
        try {
            // Fetch settings from Supabase database
            DateReminderDatabase.Settings settings = DateReminderDatabase.fetchSettings();
            
            if (settings == null) {
                Log.e(TAG, "❌ No settings found in database");
                return false;
            }
            
            Log.d(TAG, "Settings fetched:");
            Log.d(TAG, "  Morning: " + settings.morningTime);
            Log.d(TAG, "  Evening: " + settings.eveningTime);
            Log.d(TAG, "  Auto Close: " + settings.autoClose);
            Log.d(TAG, "  Morning Image: " + (settings.morningImageUrl != null ? "Yes" : "No"));
            Log.d(TAG, "  Evening Image: " + (settings.eveningImageUrl != null ? "Yes" : "No"));
            
            // Save to SharedPreferences
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("morning_time", settings.morningTime);
            editor.putString("evening_time", settings.eveningTime);
            editor.putBoolean("auto_close", settings.autoClose);
            editor.putString("morning_image_uri", settings.morningImageUrl != null ? settings.morningImageUrl : "");
            editor.putString("evening_image_uri", settings.eveningImageUrl != null ? settings.eveningImageUrl : "");
            editor.putLong(KEY_LAST_SYNC, System.currentTimeMillis());
            editor.apply();
            
            // Parse times
            String[] morningParts = settings.morningTime.split(":");
            int morningHour = Integer.parseInt(morningParts[0]);
            int morningMinute = Integer.parseInt(morningParts[1]);
            
            String[] eveningParts = settings.eveningTime.split(":");
            int eveningHour = Integer.parseInt(eveningParts[0]);
            int eveningMinute = Integer.parseInt(eveningParts[1]);
            
            // Cancel existing alarms and schedule new ones
            DateReminderScheduler.cancelAllReminders(reactContext);
            DateReminderScheduler.scheduleCustomReminders(
                reactContext,
                morningHour,
                morningMinute,
                eveningHour,
                eveningMinute
            );
            
            Log.d(TAG, "✅ Settings synced and alarms rescheduled");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error syncing from database: " + e.getMessage(), e);
            return false;
        }
    }
}