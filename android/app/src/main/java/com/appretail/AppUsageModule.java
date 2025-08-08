package com.wingsfly;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class AppUsageModule extends ReactContextBaseJavaModule {

    private static final String TAG = "AppUsageModule";
    private final ReactApplicationContext reactContext;
    private UsageStatsManager usageStatsManager;
    private PackageManager packageManager;

    public AppUsageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        this.packageManager = reactContext.getPackageManager();
    }

    @NonNull
    @Override
    public String getName() {
        return "AppUsageModule";
    }

    @ReactMethod
    public void checkUsageStatsPermission(Promise promise) {
        try {
            // Try to query usage stats to check if permission is granted
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_YEAR, -1); // Yesterday
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();
            
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
            
            boolean hasPermission = stats != null && !stats.isEmpty();
            promise.resolve(hasPermission);
        } catch (Exception e) {
            Log.e(TAG, "Error checking usage stats permission", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestUsageStatsPermission(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error opening usage stats settings", e);
            promise.reject("PERMISSION_ERROR", "Failed to open usage stats settings", e);
        }
    }

    @ReactMethod
    public void getDailyUsageStats(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            // Get precise start and end times for today
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis(); // Start of today
            long endTime = System.currentTimeMillis(); // Now

            Log.d(TAG, "Querying usage stats from: " + new Date(startTime) + " to: " + new Date(endTime));

            // Calculate accurate usage using events instead of just UsageStats
            Map<String, Long> accurateUsageMap = calculateAccurateUsageFromEvents(startTime, endTime);

            // Also get the regular usage stats for additional information
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

            WritableArray result = new WritableNativeArray();
            
            if (stats != null && !accurateUsageMap.isEmpty()) {
                // Create a map of package names to UsageStats for easy lookup
                Map<String, UsageStats> statsMap = new HashMap<>();
                for (UsageStats stat : stats) {
                    statsMap.put(stat.getPackageName(), stat);
                }

                // Convert accurate usage map to list and sort
                List<Map.Entry<String, Long>> sortedUsage = new ArrayList<>(accurateUsageMap.entrySet());
                Collections.sort(sortedUsage, new Comparator<Map.Entry<String, Long>>() {
                    @Override
                    public int compare(Map.Entry<String, Long> lhs, Map.Entry<String, Long> rhs) {
                        return Long.compare(rhs.getValue(), lhs.getValue());
                    }
                });

                for (Map.Entry<String, Long> entry : sortedUsage) {
                    String packageName = entry.getKey();
                    long accurateUsageTime = entry.getValue();
                    
                    // Only include apps with meaningful usage (more than 10 seconds)
                    if (accurateUsageTime > 10000) {
                        UsageStats usageStat = statsMap.get(packageName);
                        WritableMap appUsage = createAccurateUsageStatsMap(packageName, accurateUsageTime, usageStat);
                        if (appUsage != null) {
                            result.pushMap(appUsage);
                        }
                    }
                }
            } else if (stats != null) {
                // Fallback to regular method if event calculation fails
                Collections.sort(stats, new Comparator<UsageStats>() {
                    @Override
                    public int compare(UsageStats lhs, UsageStats rhs) {
                        return Long.compare(rhs.getTotalTimeInForeground(), lhs.getTotalTimeInForeground());
                    }
                });

                for (UsageStats usageStat : stats) {
                    if (usageStat.getTotalTimeInForeground() > 10000) {
                        WritableMap appUsage = createUsageStatsMap(usageStat);
                        if (appUsage != null) {
                            result.pushMap(appUsage);
                        }
                    }
                }
            }

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting daily usage stats", e);
            promise.reject("USAGE_STATS_ERROR", "Failed to get usage stats", e);
        }
    }

    @ReactMethod
    public void getWeeklyUsageStats(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_YEAR, -7); // 7 days ago
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            // For weekly stats, we'll use the aggregated method since event calculation over 7 days might be intensive
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_WEEKLY, startTime, endTime);

            WritableArray result = new WritableNativeArray();
            
            if (stats != null) {
                Collections.sort(stats, new Comparator<UsageStats>() {
                    @Override
                    public int compare(UsageStats lhs, UsageStats rhs) {
                        return Long.compare(rhs.getTotalTimeInForeground(), lhs.getTotalTimeInForeground());
                    }
                });

                for (UsageStats usageStat : stats) {
                    if (usageStat.getTotalTimeInForeground() > 10000) {
                        WritableMap appUsage = createUsageStatsMap(usageStat);
                        if (appUsage != null) {
                            result.pushMap(appUsage);
                        }
                    }
                }
            }

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting weekly usage stats", e);
            promise.reject("USAGE_STATS_ERROR", "Failed to get weekly usage stats", e);
        }
    }

    // New method to calculate accurate usage from events
    private Map<String, Long> calculateAccurateUsageFromEvents(long startTime, long endTime) {
        Map<String, Long> usageMap = new HashMap<>();
        Map<String, Long> appStartTimes = new HashMap<>();
        
        try {
            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                String packageName = event.getPackageName();
                long eventTime = event.getTimeStamp();
                int eventType = event.getEventType();
                
                if (eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                    eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    // App moved to foreground
                    appStartTimes.put(packageName, eventTime);
                } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED || 
                           eventType == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                    // App moved to background
                    Long startTimeForApp = appStartTimes.get(packageName);
                    if (startTimeForApp != null) {
                        long sessionDuration = eventTime - startTimeForApp;
                        if (sessionDuration > 0 && sessionDuration < 24 * 60 * 60 * 1000) { // Max 24 hours per session
                            Long currentUsage = usageMap.get(packageName);
                            usageMap.put(packageName, (currentUsage != null ? currentUsage : 0) + sessionDuration);
                        }
                        appStartTimes.remove(packageName);
                    }
                }
            }
            
            // Handle apps that are still in foreground (no pause event yet)
            long currentTime = System.currentTimeMillis();
            for (Map.Entry<String, Long> entry : appStartTimes.entrySet()) {
                String packageName = entry.getKey();
                long startTimeForApp = entry.getValue();
                long sessionDuration = currentTime - startTimeForApp;
                
                if (sessionDuration > 0 && sessionDuration < 24 * 60 * 60 * 1000) { // Max 24 hours
                    Long currentUsage = usageMap.get(packageName);
                    usageMap.put(packageName, (currentUsage != null ? currentUsage : 0) + sessionDuration);
                }
            }
            
            Log.d(TAG, "Calculated accurate usage for " + usageMap.size() + " apps using events");
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating accurate usage from events", e);
        }
        
        return usageMap;
    }

    // Create usage stats map with accurate time calculation
    private WritableMap createAccurateUsageStatsMap(String packageName, long accurateUsageTime, UsageStats usageStat) {
        try {
            WritableMap map = new WritableNativeMap();
            map.putString("packageName", packageName);
            
            // Get app name and icon
            try {
                ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
                String appName = packageManager.getApplicationLabel(appInfo).toString();
                map.putString("appName", appName);
                
                // Check if it's a system app
                boolean isSystemApp = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                map.putBoolean("isSystemApp", isSystemApp);
                
                // Get app icon as base64
                try {
                    Drawable icon = appInfo.loadIcon(packageManager);
                    String base64Icon = drawableToBase64(icon);
                    map.putString("iconBase64", base64Icon);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to get icon for " + packageName + ": " + e.getMessage());
                    map.putString("iconBase64", null);
                }
                
            } catch (PackageManager.NameNotFoundException e) {
                map.putString("appName", packageName);
                map.putBoolean("isSystemApp", false);
                map.putString("iconBase64", null);
            }
            
            // Use accurate usage time instead of UsageStats time
            map.putDouble("totalTimeInForeground", accurateUsageTime);
            
            // Use UsageStats data for other fields if available
            if (usageStat != null) {
                map.putDouble("firstTimeStamp", usageStat.getFirstTimeStamp());
                map.putDouble("lastTimeStamp", usageStat.getLastTimeStamp());
                map.putDouble("lastTimeUsed", usageStat.getLastTimeUsed());
                
                // Format last used time
                if (usageStat.getLastTimeUsed() > 0) {
                    SimpleDateFormat sdf = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());
                    map.putString("formattedLastUsed", sdf.format(new Date(usageStat.getLastTimeUsed())));
                } else {
                    map.putString("formattedLastUsed", "Never");
                }
            } else {
                map.putDouble("firstTimeStamp", 0);
                map.putDouble("lastTimeStamp", 0);
                map.putDouble("lastTimeUsed", 0);
                map.putString("formattedLastUsed", "Unknown");
            }
            
            // Format accurate duration
            map.putString("formattedDuration", formatDuration(accurateUsageTime));
            
            Log.d(TAG, packageName + " - Accurate time: " + formatDuration(accurateUsageTime) + 
                  " (" + accurateUsageTime + "ms)");
            
            return map;
        } catch (Exception e) {
            Log.e(TAG, "Error creating accurate usage stats map for " + packageName, e);
            return null;
        }
    }

    @ReactMethod
    public void getAppUsageEvents(String packageName, Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis(); // Start of today
            long endTime = System.currentTimeMillis(); // Now

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            WritableArray events = new WritableNativeArray();

            UsageEvents.Event event = new UsageEvents.Event();
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                if (packageName.equals(event.getPackageName())) {
                    WritableMap eventMap = new WritableNativeMap();
                    eventMap.putString("packageName", event.getPackageName());
                    eventMap.putString("className", event.getClassName() != null ? event.getClassName() : "");
                    eventMap.putDouble("timestamp", event.getTimeStamp());
                    eventMap.putString("eventType", getEventTypeName(event.getEventType()));
                    eventMap.putInt("eventTypeCode", event.getEventType());
                    
                    // Format timestamp for readability
                    SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
                    eventMap.putString("formattedTime", sdf.format(new Date(event.getTimeStamp())));
                    
                    events.pushMap(eventMap);
                }
            }

            promise.resolve(events);
        } catch (Exception e) {
            Log.e(TAG, "Error getting app usage events", e);
            promise.reject("USAGE_EVENTS_ERROR", "Failed to get usage events", e);
        }
    }

    @ReactMethod
    public void getMostUsedApps(int limit, Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            // Use accurate calculation for most used apps
            Map<String, Long> accurateUsageMap = calculateAccurateUsageFromEvents(startTime, endTime);
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

            WritableArray result = new WritableNativeArray();
            
            if (!accurateUsageMap.isEmpty()) {
                // Create a map of package names to UsageStats for easy lookup
                Map<String, UsageStats> statsMap = new HashMap<>();
                if (stats != null) {
                    for (UsageStats stat : stats) {
                        statsMap.put(stat.getPackageName(), stat);
                    }
                }

                // Convert to sorted list
                List<Map.Entry<String, Long>> sortedUsage = new ArrayList<>(accurateUsageMap.entrySet());
                Collections.sort(sortedUsage, new Comparator<Map.Entry<String, Long>>() {
                    @Override
                    public int compare(Map.Entry<String, Long> lhs, Map.Entry<String, Long> rhs) {
                        return Long.compare(rhs.getValue(), lhs.getValue());
                    }
                });

                int count = 0;
                for (Map.Entry<String, Long> entry : sortedUsage) {
                    if (count >= limit) break;
                    
                    String packageName = entry.getKey();
                    long accurateUsageTime = entry.getValue();
                    
                    if (accurateUsageTime > 10000) { // More than 10 seconds
                        UsageStats usageStat = statsMap.get(packageName);
                        WritableMap appUsage = createAccurateUsageStatsMap(packageName, accurateUsageTime, usageStat);
                        if (appUsage != null) {
                            result.pushMap(appUsage);
                            count++;
                        }
                    }
                }
            }

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting most used apps", e);
            promise.reject("USAGE_STATS_ERROR", "Failed to get most used apps", e);
        }
    }

    private boolean hasUsageStatsPermission() {
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.DAY_OF_YEAR, -1);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();
            
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
            
            return stats != null && !stats.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private WritableMap createUsageStatsMap(UsageStats usageStat) {
        try {
            WritableMap map = new WritableNativeMap();
            map.putString("packageName", usageStat.getPackageName());
            
            // Get app name and icon
            try {
                ApplicationInfo appInfo = packageManager.getApplicationInfo(usageStat.getPackageName(), 0);
                String appName = packageManager.getApplicationLabel(appInfo).toString();
                map.putString("appName", appName);
                
                // Check if it's a system app
                boolean isSystemApp = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                map.putBoolean("isSystemApp", isSystemApp);
                
                // Get app icon as base64
                try {
                    Drawable icon = appInfo.loadIcon(packageManager);
                    String base64Icon = drawableToBase64(icon);
                    map.putString("iconBase64", base64Icon);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to get icon for " + usageStat.getPackageName() + ": " + e.getMessage());
                    map.putString("iconBase64", null);
                }
                
            } catch (PackageManager.NameNotFoundException e) {
                map.putString("appName", usageStat.getPackageName());
                map.putBoolean("isSystemApp", false);
                map.putString("iconBase64", null);
            }
            
            map.putDouble("totalTimeInForeground", usageStat.getTotalTimeInForeground());
            map.putDouble("firstTimeStamp", usageStat.getFirstTimeStamp());
            map.putDouble("lastTimeStamp", usageStat.getLastTimeStamp());
            map.putDouble("lastTimeUsed", usageStat.getLastTimeUsed());
            
            // Format time duration
            map.putString("formattedDuration", formatDuration(usageStat.getTotalTimeInForeground()));
            
            // Format last used time
            if (usageStat.getLastTimeUsed() > 0) {
                SimpleDateFormat sdf = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());
                map.putString("formattedLastUsed", sdf.format(new Date(usageStat.getLastTimeUsed())));
            } else {
                map.putString("formattedLastUsed", "Never");
            }
            
            return map;
        } catch (Exception e) {
            Log.e(TAG, "Error creating usage stats map for " + usageStat.getPackageName(), e);
            return null;
        }
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) {
            Log.w(TAG, "Drawable is null, cannot convert to base64");
            return null;
        }
        
        try {
            Bitmap bitmap;
            
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
                if (bitmap == null) {
                    Log.w(TAG, "BitmapDrawable contains null bitmap");
                    return null;
                }
            } else {
                int width = drawable.getIntrinsicWidth();
                int height = drawable.getIntrinsicHeight();
                
                if (width <= 0) width = 96;
                if (height <= 0) height = 96;
                if (width > 512) width = 512;
                if (height > 512) height = 512;
                
                try {
                    bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                    drawable.draw(canvas);
                } catch (OutOfMemoryError e) {
                    Log.w(TAG, "Out of memory creating bitmap for icon: " + e.getMessage());
                    return null;
                }
            }
            
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            boolean compressed = bitmap.compress(Bitmap.CompressFormat.PNG, 85, outputStream);
            
            if (!compressed) {
                Log.w(TAG, "Failed to compress bitmap to PNG");
                return null;
            }
            
            byte[] byteArray = outputStream.toByteArray();
            
            if (byteArray.length == 0) {
                Log.w(TAG, "Compressed bitmap resulted in empty byte array");
                return null;
            }
            
            return Base64.encodeToString(byteArray, Base64.NO_WRAP);
            
        } catch (Exception e) {
            Log.w(TAG, "Error converting drawable to base64: " + e.getMessage());
            return null;
        }
    }

    private String formatDuration(long milliseconds) {
        if (milliseconds < 1000) {
            return "0s";
        }
        
        long seconds = milliseconds / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        
        if (hours > 0) {
            long remainingMinutes = minutes % 60;
            if (remainingMinutes > 0) {
                return String.format(Locale.getDefault(), "%dh %dm", hours, remainingMinutes);
            } else {
                return String.format(Locale.getDefault(), "%dh", hours);
            }
        } else if (minutes > 0) {
            long remainingSeconds = seconds % 60;
            if (remainingSeconds > 0) {
                return String.format(Locale.getDefault(), "%dm %ds", minutes, remainingSeconds);
            } else {
                return String.format(Locale.getDefault(), "%dm", minutes);
            }
        } else {
            return String.format(Locale.getDefault(), "%ds", seconds);
        }
    }

    private String getEventTypeName(int eventType) {
        switch (eventType) {
            case UsageEvents.Event.ACTIVITY_PAUSED:
                return "ACTIVITY_PAUSED";
            case UsageEvents.Event.ACTIVITY_RESUMED:
                return "ACTIVITY_RESUMED";
            case UsageEvents.Event.ACTIVITY_STOPPED:
                return "ACTIVITY_STOPPED";
            case UsageEvents.Event.CONFIGURATION_CHANGE:
                return "CONFIGURATION_CHANGE";
            case UsageEvents.Event.DEVICE_SHUTDOWN:
                return "DEVICE_SHUTDOWN";
            case UsageEvents.Event.DEVICE_STARTUP:
                return "DEVICE_STARTUP";
            case UsageEvents.Event.FOREGROUND_SERVICE_START:
                return "FOREGROUND_SERVICE_START";
            case UsageEvents.Event.FOREGROUND_SERVICE_STOP:
                return "FOREGROUND_SERVICE_STOP";
            case UsageEvents.Event.KEYGUARD_HIDDEN:
                return "KEYGUARD_HIDDEN";
            case UsageEvents.Event.KEYGUARD_SHOWN:
                return "KEYGUARD_SHOWN";
            case UsageEvents.Event.SCREEN_INTERACTIVE:
                return "SCREEN_INTERACTIVE";
            case UsageEvents.Event.SCREEN_NON_INTERACTIVE:
                return "SCREEN_NON_INTERACTIVE";
            case UsageEvents.Event.SHORTCUT_INVOCATION:
                return "SHORTCUT_INVOCATION";
            case UsageEvents.Event.STANDBY_BUCKET_CHANGED:
                return "STANDBY_BUCKET_CHANGED";
            case UsageEvents.Event.USER_INTERACTION:
                return "USER_INTERACTION";
            default:
                return "UNKNOWN_EVENT_" + eventType;
        }
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("INTERVAL_DAILY", UsageStatsManager.INTERVAL_DAILY);
        constants.put("INTERVAL_WEEKLY", UsageStatsManager.INTERVAL_WEEKLY);
        constants.put("INTERVAL_MONTHLY", UsageStatsManager.INTERVAL_MONTHLY);
        constants.put("INTERVAL_YEARLY", UsageStatsManager.INTERVAL_YEARLY);
        constants.put("INTERVAL_BEST", UsageStatsManager.INTERVAL_BEST);
        return constants;
    }
}