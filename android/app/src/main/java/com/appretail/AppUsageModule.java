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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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

            // Get precise start and end times for TODAY ONLY
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis(); // Start of today
            long endTime = System.currentTimeMillis(); // Now

            Log.d(TAG, "Querying TODAY's usage stats from: " + new Date(startTime) + " to: " + new Date(endTime));

            // Use both methods to get comprehensive usage data
            Map<String, Long> accurateUsageMap = calculateAccurateUsageFromEvents(startTime, endTime);
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

            // Filter UsageStats to only include today's data
            List<UsageStats> todayStats = filterStatsForToday(stats, startTime);

            // Merge data from both sources
            Map<String, UsageData> mergedUsageMap = mergeUsageData(accurateUsageMap, todayStats);

            WritableArray result = new WritableNativeArray();
            
            if (!mergedUsageMap.isEmpty()) {
                // Convert to sorted list
                List<Map.Entry<String, UsageData>> sortedUsage = new ArrayList<>(mergedUsageMap.entrySet());
                Collections.sort(sortedUsage, new Comparator<Map.Entry<String, UsageData>>() {
                    @Override
                    public int compare(Map.Entry<String, UsageData> lhs, Map.Entry<String, UsageData> rhs) {
                        return Long.compare(rhs.getValue().totalTime, lhs.getValue().totalTime);
                    }
                });

                for (Map.Entry<String, UsageData> entry : sortedUsage) {
                    String packageName = entry.getKey();
                    UsageData usageData = entry.getValue();
                    
                    // Include apps with meaningful usage (keep original 10-second threshold for accuracy)
                    if (usageData.totalTime > 10000) {
                        WritableMap appUsage = createEnhancedUsageStatsMap(packageName, usageData);
                        if (appUsage != null) {
                            result.pushMap(appUsage);
                        }
                    }
                }
            }

            Log.d(TAG, "Returning " + result.size() + " apps with TODAY's usage data");
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

            // For weekly stats, use both methods but prioritize UsageStats for performance
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_WEEKLY, startTime, endTime);

            // Also get events for apps that might be missing from UsageStats
            Map<String, Long> eventUsageMap = calculateAccurateUsageFromEvents(startTime, endTime);
            Map<String, UsageData> mergedUsageMap = mergeUsageData(eventUsageMap, stats);

            WritableArray result = new WritableNativeArray();
            
            if (!mergedUsageMap.isEmpty()) {
                List<Map.Entry<String, UsageData>> sortedUsage = new ArrayList<>(mergedUsageMap.entrySet());
                Collections.sort(sortedUsage, new Comparator<Map.Entry<String, UsageData>>() {
                    @Override
                    public int compare(Map.Entry<String, UsageData> lhs, Map.Entry<String, UsageData> rhs) {
                        return Long.compare(rhs.getValue().totalTime, lhs.getValue().totalTime);
                    }
                });

                for (Map.Entry<String, UsageData> entry : sortedUsage) {
                    String packageName = entry.getKey();
                    UsageData usageData = entry.getValue();
                    
                    if (usageData.totalTime > 10000) {
                        WritableMap appUsage = createEnhancedUsageStatsMap(packageName, usageData);
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

    // Filter UsageStats to only include apps that were actually used today
    private List<UsageStats> filterStatsForToday(List<UsageStats> stats, long todayStartTime) {
        List<UsageStats> todayStats = new ArrayList<>();
        
        if (stats == null) return todayStats;
        
        for (UsageStats stat : stats) {
            // Only include apps that have been used today (lastTimeUsed is today)
            if (stat.getLastTimeUsed() >= todayStartTime) {
                todayStats.add(stat);
                Log.d(TAG, stat.getPackageName() + " - Last used: " + new Date(stat.getLastTimeUsed()) + 
                      " (included for today)");
            } else {
                Log.d(TAG, stat.getPackageName() + " - Last used: " + new Date(stat.getLastTimeUsed()) + 
                      " (excluded - not used today)");
            }
        }
        
        Log.d(TAG, "Filtered UsageStats: " + todayStats.size() + " apps used today out of " + stats.size() + " total");
        return todayStats;
    }

    // Enhanced method to calculate accurate usage from events (keeping original accuracy)
    private Map<String, Long> calculateAccurateUsageFromEvents(long startTime, long endTime) {
        Map<String, Long> usageMap = new HashMap<>();
        Map<String, Long> appStartTimes = new HashMap<>();
        Set<String> validPackages = getInstalledPackages();
        
        try {
            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            Log.d(TAG, "Processing usage events from " + new Date(startTime) + " to " + new Date(endTime));
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                String packageName = event.getPackageName();
                long eventTime = event.getTimeStamp();
                int eventType = event.getEventType();
                
                // Skip if package is not valid or is launcher
                if (packageName == null || packageName.isEmpty() || 
                    !validPackages.contains(packageName) || isLauncherPackage(packageName)) {
                    continue;
                }
                
                // IMPORTANT: Only process events that happened TODAY
                if (eventTime < startTime) {
                    continue; // Skip events from before today
                }
                
                // Keep original accurate event handling - only RESUMED/FOREGROUND and PAUSED/BACKGROUND
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
                        // Keep original strict validation (max 24 hours per session)
                        if (sessionDuration > 0 && sessionDuration < 24 * 60 * 60 * 1000) {
                            Long currentUsage = usageMap.get(packageName);
                            long newUsage = (currentUsage != null ? currentUsage : 0) + sessionDuration;
                            usageMap.put(packageName, newUsage);
                            Log.d(TAG, packageName + " session: " + formatDuration(sessionDuration) + 
                                  ", total: " + formatDuration(newUsage));
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
                
                // Keep original validation (max 24 hours)
                if (sessionDuration > 0 && sessionDuration < 24 * 60 * 60 * 1000) {
                    Long currentUsage = usageMap.get(packageName);
                    usageMap.put(packageName, (currentUsage != null ? currentUsage : 0) + sessionDuration);
                }
            }
            
            Log.d(TAG, "Event-based calculation found " + usageMap.size() + " apps with usage");
            
        } catch (Exception e) {
            Log.e(TAG, "Error calculating accurate usage from events", e);
        }
        
        return usageMap;
    }

    // Get list of installed packages for validation
    private Set<String> getInstalledPackages() {
        Set<String> packages = new HashSet<>();
        try {
            List<ApplicationInfo> installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA);
            for (ApplicationInfo appInfo : installedApps) {
                packages.add(appInfo.packageName);
            }
            Log.d(TAG, "Found " + packages.size() + " installed packages");
        } catch (Exception e) {
            Log.w(TAG, "Error getting installed packages", e);
        }
        return packages;
    }

    // Check if package is a launcher (to avoid inflated usage stats)
    private boolean isLauncherPackage(String packageName) {
        // Common launcher packages to filter out
        return packageName.contains("launcher") || 
               packageName.contains("homescreen") ||
               packageName.equals("com.android.systemui") ||
               packageName.equals("com.google.android.apps.nexuslauncher") ||
               packageName.equals("com.miui.home") ||
               packageName.equals("com.samsung.android.app.launcher") ||
               packageName.equals("com.huawei.android.launcher");
    }

    // Data class to hold usage information
    private static class UsageData {
        long totalTime;
        long firstTimeStamp;
        long lastTimeStamp;
        long lastTimeUsed;
        boolean fromEvents;
        boolean fromUsageStats;

        UsageData(long totalTime, long firstTimeStamp, long lastTimeStamp, long lastTimeUsed) {
            this.totalTime = totalTime;
            this.firstTimeStamp = firstTimeStamp;
            this.lastTimeStamp = lastTimeStamp;
            this.lastTimeUsed = lastTimeUsed;
        }
    }

    // Merge data from events and UsageStats - prioritize accuracy from original code
    private Map<String, UsageData> mergeUsageData(Map<String, Long> eventUsageMap, List<UsageStats> usageStatsList) {
        Map<String, UsageData> mergedMap = new HashMap<>();
        
        // First, add data from UsageStats
        if (usageStatsList != null) {
            for (UsageStats stat : usageStatsList) {
                String packageName = stat.getPackageName();
                if (packageName != null && !packageName.isEmpty() && !isLauncherPackage(packageName)) {
                    UsageData data = new UsageData(
                        stat.getTotalTimeInForeground(),
                        stat.getFirstTimeStamp(),
                        stat.getLastTimeStamp(),
                        stat.getLastTimeUsed()
                    );
                    data.fromUsageStats = true;
                    mergedMap.put(packageName, data);
                }
            }
        }
        
        // Then, merge or add data from events - prioritize event accuracy when significantly different
        for (Map.Entry<String, Long> entry : eventUsageMap.entrySet()) {
            String packageName = entry.getKey();
            long eventUsageTime = entry.getValue();
            
            if (mergedMap.containsKey(packageName)) {
                // Package exists in UsageStats
                UsageData existing = mergedMap.get(packageName);
                long usageStatTime = existing.totalTime;
                
                // Only use event time if it's significantly more accurate or if UsageStats shows 0
                // This prevents inflated times while catching missing usage
                if (usageStatTime == 0 || 
                    (eventUsageTime > 0 && Math.abs(eventUsageTime - usageStatTime) / (double)Math.max(eventUsageTime, usageStatTime) > 0.5)) {
                    
                    Log.d(TAG, packageName + " - Significant difference detected. Event: " + 
                          formatDuration(eventUsageTime) + " vs UsageStats: " + formatDuration(usageStatTime));
                    
                    // Use the more reasonable time (prevent inflation)
                    if (eventUsageTime < usageStatTime * 2) { // Don't allow more than 2x inflation
                        existing.totalTime = eventUsageTime;
                        existing.fromEvents = true;
                    }
                } else {
                    // Use UsageStats time as it's usually more reliable for established apps
                    Log.d(TAG, packageName + " - Using UsageStats time: " + formatDuration(usageStatTime) + 
                          " (Event time: " + formatDuration(eventUsageTime) + ")");
                }
            } else {
                // Package not in UsageStats, add from events (this catches missing apps)
                UsageData data = new UsageData(eventUsageTime, 0, 0, 0);
                data.fromEvents = true;
                mergedMap.put(packageName, data);
                Log.d(TAG, packageName + " - Added from events only: " + formatDuration(eventUsageTime));
            }
        }
        
        Log.d(TAG, "Merged usage data for " + mergedMap.size() + " packages");
        return mergedMap;
    }

    // Create enhanced usage stats map
    private WritableMap createEnhancedUsageStatsMap(String packageName, UsageData usageData) {
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
            
            // Use the usage time from merged data
            map.putDouble("totalTimeInForeground", usageData.totalTime);
            map.putDouble("firstTimeStamp", usageData.firstTimeStamp);
            map.putDouble("lastTimeStamp", usageData.lastTimeStamp);
            map.putDouble("lastTimeUsed", usageData.lastTimeUsed);
            
            // Add source information for debugging
            String source = "";
            if (usageData.fromEvents && usageData.fromUsageStats) {
                source = "merged";
            } else if (usageData.fromEvents) {
                source = "events";
            } else if (usageData.fromUsageStats) {
                source = "usage_stats";
            }
            map.putString("dataSource", source);
            
            // Format duration
            map.putString("formattedDuration", formatDuration(usageData.totalTime));
            
            // Format last used time
            if (usageData.lastTimeUsed > 0) {
                SimpleDateFormat sdf = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());
                map.putString("formattedLastUsed", sdf.format(new Date(usageData.lastTimeUsed)));
            } else {
                map.putString("formattedLastUsed", "Never");
            }
            
            Log.d(TAG, packageName + " - Time: " + formatDuration(usageData.totalTime) + 
                  " (" + usageData.totalTime + "ms), Source: " + source);
            
            return map;
        } catch (Exception e) {
            Log.e(TAG, "Error creating enhanced usage stats map for " + packageName, e);
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

            // Get precise start and end times for TODAY ONLY
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            // Use enhanced merging for most used apps
            Map<String, Long> eventUsageMap = calculateAccurateUsageFromEvents(startTime, endTime);
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

            // Filter to today's data only
            List<UsageStats> todayStats = filterStatsForToday(stats, startTime);
            Map<String, UsageData> mergedUsageMap = mergeUsageData(eventUsageMap, todayStats);

            WritableArray result = new WritableNativeArray();
            
            if (!mergedUsageMap.isEmpty()) {
                // Convert to sorted list
                List<Map.Entry<String, UsageData>> sortedUsage = new ArrayList<>(mergedUsageMap.entrySet());
                Collections.sort(sortedUsage, new Comparator<Map.Entry<String, UsageData>>() {
                    @Override
                    public int compare(Map.Entry<String, UsageData> lhs, Map.Entry<String, UsageData> rhs) {
                        return Long.compare(rhs.getValue().totalTime, lhs.getValue().totalTime);
                    }
                });

                int count = 0;
                for (Map.Entry<String, UsageData> entry : sortedUsage) {
                    if (count >= limit) break;
                    
                    String packageName = entry.getKey();
                    UsageData usageData = entry.getValue();
                    
                    if (usageData.totalTime > 10000) { // More than 10 seconds
                        WritableMap appUsage = createEnhancedUsageStatsMap(packageName, usageData);
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