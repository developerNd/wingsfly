package com.wingsfly;

import android.app.ActivityManager;
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
import android.os.Build;
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
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class RunningAppsModule extends ReactContextBaseJavaModule {

    private static final String TAG = "RunningAppsModule";
    private final ReactApplicationContext reactContext;
    private UsageStatsManager usageStatsManager;
    private ActivityManager activityManager;
    private PackageManager packageManager;

    public RunningAppsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        this.activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
        this.packageManager = reactContext.getPackageManager();
    }

    @NonNull
    @Override
    public String getName() {
        return "RunningAppsModule";
    }

    @ReactMethod
    public void checkUsageStatsPermission(Promise promise) {
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.MINUTE, -5);
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

    // IMPROVED REAL-TIME METHOD - FASTEST DETECTION
    @ReactMethod
    public void getRealtimeRunningApps(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            WritableArray result = new WritableNativeArray();
            
            // Method 1: Get very recent events (last 30 seconds)
            Set<String> veryRecentApps = getVeryRecentApps();
            
            // Method 2: Get running processes
            Set<String> processApps = getImportantRunningProcesses();
            
            // Method 3: Check foreground app specifically
            String foregroundApp = getCurrentForegroundApp();
            
            // Combine all methods
            Set<String> allRunningApps = new HashSet<>();
            allRunningApps.addAll(veryRecentApps);
            allRunningApps.addAll(processApps);
            if (foregroundApp != null) {
                allRunningApps.add(foregroundApp);
            }
            
            for (String packageName : allRunningApps) {
                WritableMap appInfo = createEnhancedAppInfoMap(packageName, 
                    veryRecentApps.contains(packageName),
                    processApps.contains(packageName),
                    packageName.equals(foregroundApp));
                if (appInfo != null) {
                    result.pushMap(appInfo);
                }
            }

            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting realtime running apps", e);
            promise.reject("REALTIME_APPS_ERROR", "Failed to get realtime running apps", e);
        }
    }

    // IMPROVED METHOD - BETTER DETECTION WITH BACKGROUND TRACKING
    @ReactMethod
    public void getRunningAppsImproved(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            // Use shorter time window and track both foreground/background events
            Set<String> runningApps = getActiveAppsWithBackgroundTracking();
            
            // Also get currently running processes
            Set<String> runningProcesses = getRunningProcesses();
            runningApps.addAll(runningProcesses);

            WritableArray result = new WritableNativeArray();
            
            for (String packageName : runningApps) {
                WritableMap appInfo = createAppInfoMap(packageName, 
                    runningApps.contains(packageName), 
                    runningProcesses.contains(packageName));
                if (appInfo != null) {
                    result.pushMap(appInfo);
                }
            }

            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting running apps", e);
            promise.reject("RUNNING_APPS_ERROR", "Failed to get running apps", e);
        }
    }

    // ORIGINAL METHOD - KEPT FOR COMPATIBILITY
    @ReactMethod
    public void getRunningApps(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            Set<String> runningApps = new HashSet<>();
            
            // Method 1: Get recently active apps using UsageEvents
            Set<String> recentlyActiveApps = getRecentlyActiveApps();
            runningApps.addAll(recentlyActiveApps);
            
            // Method 2: Get running processes (limited on modern Android)
            Set<String> runningProcesses = getRunningProcesses();
            runningApps.addAll(runningProcesses);

            WritableArray result = new WritableNativeArray();
            
            for (String packageName : runningApps) {
                WritableMap appInfo = createAppInfoMap(packageName, 
                    recentlyActiveApps.contains(packageName), 
                    runningProcesses.contains(packageName));
                if (appInfo != null) {
                    result.pushMap(appInfo);
                }
            }

            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting running apps", e);
            promise.reject("RUNNING_APPS_ERROR", "Failed to get running apps", e);
        }
    }

    @ReactMethod
    public void getForegroundApp(Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted");
                return;
            }

            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.SECOND, -10); // Reduced from 1 minute to 10 seconds
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            String foregroundApp = null;
            long latestTimestamp = 0;

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                int eventType = event.getEventType();
                if ((eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                     eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) &&
                    event.getTimeStamp() > latestTimestamp) {
                    foregroundApp = event.getPackageName();
                    latestTimestamp = event.getTimeStamp();
                }
            }

            if (foregroundApp != null) {
                WritableMap appInfo = createAppInfoMap(foregroundApp, true, true);
                if (appInfo != null) {
                    appInfo.putBoolean("isForeground", true);
                    appInfo.putDouble("foregroundTimestamp", latestTimestamp);
                    promise.resolve(appInfo);
                } else {
                    promise.resolve(null);
                }
            } else {
                promise.resolve(null);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error getting foreground app", e);
            promise.reject("FOREGROUND_APP_ERROR", "Failed to get foreground app", e);
        }
    }

    @ReactMethod
    public void getDetailedRunningApps(Promise promise) {
        try {
            WritableArray result = new WritableNativeArray();
            
            List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
            if (processes != null) {
                for (ActivityManager.RunningAppProcessInfo process : processes) {
                    WritableMap processInfo = new WritableNativeMap();
                    processInfo.putString("processName", process.processName);
                    processInfo.putInt("pid", process.pid);
                    processInfo.putInt("uid", process.uid);
                    processInfo.putString("importance", getImportanceString(process.importance));
                    processInfo.putInt("importanceLevel", process.importance);
                    
                    WritableArray packages = new WritableNativeArray();
                    if (process.pkgList != null) {
                        for (String packageName : process.pkgList) {
                            WritableMap packageInfo = createAppInfoMap(packageName, false, true);
                            if (packageInfo != null) {
                                packages.pushMap(packageInfo);
                            }
                        }
                    }
                    processInfo.putArray("packages", packages);
                    
                    result.pushMap(processInfo);
                }
            }

            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting detailed running apps", e);
            promise.reject("DETAILED_APPS_ERROR", "Failed to get detailed running apps", e);
        }
    }

    // NEW IMPROVED METHODS FOR FASTER DETECTION

    private Set<String> getVeryRecentApps() {
        Set<String> recentApps = new HashSet<>();
        
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.SECOND, -30); // Only last 30 seconds
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            Map<String, Long> lastForeground = new HashMap<>();
            Map<String, Long> lastBackground = new HashMap<>();
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                String packageName = event.getPackageName();
                int eventType = event.getEventType();
                long timestamp = event.getTimeStamp();
                
                if (eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                    eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastForeground.put(packageName, timestamp);
                } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED || 
                           eventType == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                    lastBackground.put(packageName, timestamp);
                }
            }
            
            // Only include apps that were foregrounded more recently than backgrounded
            for (String packageName : lastForeground.keySet()) {
                Long foregroundTime = lastForeground.get(packageName);
                Long backgroundTime = lastBackground.get(packageName);
                
                if (backgroundTime == null || foregroundTime > backgroundTime) {
                    recentApps.add(packageName);
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting very recent apps", e);
        }
        
        return recentApps;
    }

    private Set<String> getActiveAppsWithBackgroundTracking() {
        Set<String> activeApps = new HashSet<>();
        Map<String, Long> lastForegroundTime = new HashMap<>();
        Map<String, Long> lastBackgroundTime = new HashMap<>();
        
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.MINUTE, -2); // Reduced to 2 minutes for faster detection
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            // First pass: collect all foreground and background events
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                String packageName = event.getPackageName();
                int eventType = event.getEventType();
                long timestamp = event.getTimeStamp();
                
                if (eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                    eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastForegroundTime.put(packageName, timestamp);
                } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED || 
                           eventType == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                    lastBackgroundTime.put(packageName, timestamp);
                }
            }
            
            // Second pass: determine which apps are actually active
            long currentTime = System.currentTimeMillis();
            long recentThreshold = currentTime - (30 * 1000); // 30 seconds threshold
            
            for (String packageName : lastForegroundTime.keySet()) {
                Long foregroundTime = lastForegroundTime.get(packageName);
                Long backgroundTime = lastBackgroundTime.get(packageName);
                
                // App is considered active if:
                // 1. It was brought to foreground recently, AND
                // 2. Either no background event exists, OR foreground event is more recent
                if (foregroundTime != null && foregroundTime > recentThreshold) {
                    if (backgroundTime == null || foregroundTime > backgroundTime) {
                        activeApps.add(packageName);
                    }
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting active apps with background tracking", e);
        }
        
        return activeApps;
    }

    private Set<String> getImportantRunningProcesses() {
        Set<String> runningApps = new HashSet<>();
        
        try {
            List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
            if (processes != null) {
                for (ActivityManager.RunningAppProcessInfo process : processes) {
                    // Include foreground and visible apps only for faster detection
                    if (process.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE) {
                        if (process.pkgList != null) {
                            for (String packageName : process.pkgList) {
                                runningApps.add(packageName);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting important running processes", e);
        }
        
        return runningApps;
    }

    private String getCurrentForegroundApp() {
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.SECOND, -10); // Last 10 seconds only
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            String foregroundApp = null;
            long latestTimestamp = 0;

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                int eventType = event.getEventType();
                if ((eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                     eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) &&
                    event.getTimeStamp() > latestTimestamp) {
                    foregroundApp = event.getPackageName();
                    latestTimestamp = event.getTimeStamp();
                }
            }
            
            return foregroundApp;
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting current foreground app", e);
            return null;
        }
    }

    // ORIGINAL METHODS - KEPT FOR COMPATIBILITY

    private Set<String> getRecentlyActiveApps() {
        Set<String> activeApps = new HashSet<>();
        
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.MINUTE, -5);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                
                String packageName = event.getPackageName();
                int eventType = event.getEventType();
                
                if (eventType == UsageEvents.Event.ACTIVITY_RESUMED || 
                    eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    activeApps.add(packageName);
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting recently active apps", e);
        }
        
        return activeApps;
    }

    private Set<String> getRunningProcesses() {
        Set<String> runningApps = new HashSet<>();
        
        try {
            List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
            if (processes != null) {
                for (ActivityManager.RunningAppProcessInfo process : processes) {
                    // Only include important processes
                    if (process.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE) {
                        if (process.pkgList != null) {
                            for (String packageName : process.pkgList) {
                                runningApps.add(packageName);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting running processes", e);
        }
        
        return runningApps;
    }

    private boolean hasUsageStatsPermission() {
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.add(Calendar.MINUTE, -1);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();
            
            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
            
            return stats != null && !stats.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    // ENHANCED APP INFO CREATION

    private WritableMap createEnhancedAppInfoMap(String packageName, boolean isVeryRecent, 
                                               boolean isRunningProcess, boolean isForeground) {
        try {
            WritableMap map = new WritableNativeMap();
            map.putString("packageName", packageName);
            map.putBoolean("isVeryRecent", isVeryRecent);
            map.putBoolean("isRunningProcess", isRunningProcess);
            map.putBoolean("isForeground", isForeground);
            map.putBoolean("isActive", isVeryRecent || isRunningProcess || isForeground);
            
            try {
                ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
                String appName = packageManager.getApplicationLabel(appInfo).toString();
                map.putString("appName", appName);
                
                boolean isSystemApp = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                map.putBoolean("isSystemApp", isSystemApp);
                
                try {
                    Drawable icon = appInfo.loadIcon(packageManager);
                    String base64Icon = drawableToBase64(icon);
                    map.putString("iconBase64", base64Icon);
                } catch (Exception e) {
                    map.putString("iconBase64", null);
                }
                
            } catch (PackageManager.NameNotFoundException e) {
                map.putString("appName", packageName);
                map.putBoolean("isSystemApp", false);
                map.putString("iconBase64", null);
            }
            
            map.putDouble("timestamp", System.currentTimeMillis());
            
            return map;
        } catch (Exception e) {
            Log.e(TAG, "Error creating enhanced app info map for " + packageName, e);
            return null;
        }
    }

    private WritableMap createAppInfoMap(String packageName, boolean isRecentlyActive, boolean isRunningProcess) {
        try {
            WritableMap map = new WritableNativeMap();
            map.putString("packageName", packageName);
            map.putBoolean("isRecentlyActive", isRecentlyActive);
            map.putBoolean("isRunningProcess", isRunningProcess);
            
            try {
                ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
                String appName = packageManager.getApplicationLabel(appInfo).toString();
                map.putString("appName", appName);
                
                boolean isSystemApp = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                map.putBoolean("isSystemApp", isSystemApp);
                
                try {
                    Drawable icon = appInfo.loadIcon(packageManager);
                    String base64Icon = drawableToBase64(icon);
                    map.putString("iconBase64", base64Icon);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to get icon for " + packageName);
                    map.putString("iconBase64", null);
                }
                
            } catch (PackageManager.NameNotFoundException e) {
                map.putString("appName", packageName);
                map.putBoolean("isSystemApp", false);
                map.putString("iconBase64", null);
            }
            
            map.putDouble("timestamp", System.currentTimeMillis());
            
            return map;
        } catch (Exception e) {
            Log.e(TAG, "Error creating app info map for " + packageName, e);
            return null;
        }
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) return null;
        
        try {
            Bitmap bitmap;
            
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
                if (bitmap == null) return null;
            } else {
                int width = Math.min(drawable.getIntrinsicWidth(), 96);
                int height = Math.min(drawable.getIntrinsicHeight(), 96);
                
                if (width <= 0) width = 96;
                if (height <= 0) height = 96;
                
                bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 70, outputStream);
            byte[] byteArray = outputStream.toByteArray();
            
            return Base64.encodeToString(byteArray, Base64.NO_WRAP);
            
        } catch (Exception e) {
            Log.w(TAG, "Error converting drawable to base64: " + e.getMessage());
            return null;
        }
    }

    private String getImportanceString(int importance) {
        switch (importance) {
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND:
                return "FOREGROUND";
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE:
                return "VISIBLE";
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_SERVICE:
                return "SERVICE";
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_BACKGROUND:
                return "BACKGROUND";
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_EMPTY:
                return "EMPTY";
            case ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE:
                return "FOREGROUND_SERVICE";
            default:
                return "UNKNOWN";
        }
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("IMPORTANCE_FOREGROUND", ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND);
        constants.put("IMPORTANCE_VISIBLE", ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE);
        constants.put("IMPORTANCE_SERVICE", ActivityManager.RunningAppProcessInfo.IMPORTANCE_SERVICE);
        constants.put("IMPORTANCE_BACKGROUND", ActivityManager.RunningAppProcessInfo.IMPORTANCE_BACKGROUND);
        constants.put("IMPORTANCE_EMPTY", ActivityManager.RunningAppProcessInfo.IMPORTANCE_EMPTY);
        constants.put("IMPORTANCE_FOREGROUND_SERVICE", ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE);
        return constants;
    }
}