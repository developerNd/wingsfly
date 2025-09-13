package com.wingsfly

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import java.io.ByteArrayOutputStream
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.app.AppOpsManager
import android.content.Intent
import android.net.Uri
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import android.app.usage.UsageStatsManager
import android.app.usage.UsageStats
import java.util.Date

// Data class for app usage information
data class AppUsageData(
    val name: String,
    val timeInMinutes: Int,
    val packageName: String,
    val lastTimeUsed: Long
)

// Set of allowed system apps
private val allowedSystemApps = setOf(
    // Social Media & Communication
    "com.whatsapp",
    "com.facebook.katana",
    "com.instagram.android",
    "com.twitter.android",
    "com.snapchat.android",
    "org.telegram.messenger",
    "com.discord",
    
    // Entertainment & Media
    "com.google.android.youtube",
    "com.netflix.mediaclient",
    "com.amazon.avod.thirdpartyclient",
    "com.spotify.music",
    "com.reddit.frontpage",
    "com.pinterest",
    
    // Gaming
    "com.king.candycrushsaga",
    "com.supercell.clashofclans",
    "com.mojang.minecraftpe",
    "com.playrix.homescapes",
    "jp.konami.pesam",
    "com.ea.gp.fifamobile",
    "com.gameloft.android.ANMP.GloftA9HM",
    
    // Shopping & Services
    "com.amazon.mShop.android.shopping",
    "com.tinder",
    "com.ubercab",
    
    // Browsing
    "com.android.chrome",
    
    // Google Apps
    "com.google.android.apps.photos",
    "com.google.android.gm",
    "com.google.android.googlequicksearchbox",
    "com.google.android.apps.maps",
    "com.google.android.apps.docs",
    "com.google.android.apps.sheets",
    "com.google.android.apps.slides",
    "com.google.android.apps.drive",
    "com.google.android.apps.calendar",
    "com.google.android.apps.contacts",
    "com.google.android.apps.messaging",
    "com.google.android.apps.phone",
    "com.google.android.apps.camera",
    "com.google.android.apps.gallery",
    "com.google.android.apps.clock",
    "com.google.android.apps.weather",
    "com.google.android.apps.news",
    "com.google.android.apps.books",
    "com.google.android.apps.magazines",
    "com.google.android.apps.music",
    "com.google.android.apps.videos",
    "com.google.android.apps.movies",
    "com.google.android.apps.games",
    "com.google.android.apps.fitness",
    "com.google.android.apps.health",
    "com.google.android.apps.wallet",
    "com.google.android.apps.pay",
    "com.google.android.apps.shopping",
    "com.google.android.apps.travel",
    "com.google.android.apps.translate",
    "com.google.android.apps.assistant",
    "com.google.android.apps.duo",
    "com.google.android.apps.meetings",
    "com.google.android.apps.classroom"
)

@ReactModule(name = "InstalledApps")
class InstalledAppsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "InstalledAppsModule"
    }
    
    override fun getName() = "InstalledApps"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val appsList = WritableNativeArray()
            
            // Get the set of locked apps
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val lockedApps = prefs.getStringSet("locked_apps", setOf()) ?: setOf()

            for (applicationInfo in apps) {
                if (pm.getLaunchIntentForPackage(applicationInfo.packageName) != null) {
                    val appMap = WritableNativeMap()
                    appMap.putString("packageName", applicationInfo.packageName)
                    appMap.putString("name", pm.getApplicationLabel(applicationInfo).toString())
                    appMap.putBoolean("isSystemApp", 
                        (applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
                    
                    // Add locked status
                    appMap.putBoolean("isLocked", lockedApps.contains(applicationInfo.packageName))
                    
                    // Convert app icon to base64 string
                    val icon = pm.getApplicationIcon(applicationInfo.packageName)
                    val base64Icon = drawableToBase64(icon)
                    appMap.putString("icon", base64Icon)

                    appsList.pushMap(appMap)
                }
            }
            promise.resolve(appsList)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth,
            drawable.intrinsicHeight,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream)
        val byteArray = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }

    @ReactMethod
    fun lockApp(packageName: String, promise: Promise) {
        try {
            Log.d(TAG, "Locking app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val lockedApps = prefs.getStringSet("locked_apps", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
            lockedApps.add(packageName)
            prefs.edit().putStringSet("locked_apps", lockedApps).apply()
            
            // Log the current set of locked apps
            Log.d(TAG, "Current locked apps: ${lockedApps.joinToString()}")
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error locking app: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun unlockApp(packageName: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val lockedApps = prefs.getStringSet("locked_apps", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
            lockedApps.remove(packageName)
            prefs.edit().putStringSet("locked_apps", lockedApps).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setLockPin(pin: String, promise: Promise) {
        try {
            Log.d(TAG, "Setting PIN...")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            prefs.edit().putString("lock_pin", pin).apply()
            Log.d(TAG, "PIN set successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting PIN: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startLockService(promise: Promise) {
        try {
            Log.d(TAG, "Starting lock services...")
            
            // Start main AppLockService
            val mainServiceIntent = Intent(reactApplicationContext, AppLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Using startForegroundService for AppLockService")
                reactApplicationContext.startForegroundService(mainServiceIntent)
            } else {
                Log.d(TAG, "Using startService for AppLockService")
                reactApplicationContext.startService(mainServiceIntent)
            }
            
            // Start UsageLimitBlockingService
            val usageServiceIntent = Intent(reactApplicationContext, UsageLimitBlockingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Using startForegroundService for UsageLimitBlockingService")
                reactApplicationContext.startForegroundService(usageServiceIntent)
            } else {
                Log.d(TAG, "Using startService for UsageLimitBlockingService")
                reactApplicationContext.startService(usageServiceIntent)
            }
            
            Log.d(TAG, "Both lock services started successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting services: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val hasOverlayPermission = Settings.canDrawOverlays(reactApplicationContext)
            val hasUsagePermission = hasUsageStatsPermission()
            
            Log.d(TAG, "Permissions check - Overlay: $hasOverlayPermission, Usage: $hasUsagePermission")
            
            val result = WritableNativeMap().apply {
                putBoolean("overlay", hasOverlayPermission)
                putBoolean("usage", hasUsagePermission)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
    return try {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactApplicationContext.packageName
            )
        } else {
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactApplicationContext.packageName
            )
        }
        
        val hasPermission = mode == AppOpsManager.MODE_ALLOWED
        Log.d(TAG, "Usage stats permission check: $hasPermission (mode: $mode)")
        return hasPermission
    } catch (e: Exception) {
        Log.e(TAG, "Error checking usage stats permission: ${e.message}", e)
        false
    }
}

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
            intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openUsageSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent) 
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // SCHEDULE METHODS
    @ReactMethod
    fun setAppSchedule(packageName: String, schedulesArray: ReadableArray, promise: Promise) {
        try {
            Log.d(TAG, "Setting schedule for app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Convert ReadableArray to JSON string for storage
            val jsonArray = convertReadableArrayToJsonArray(schedulesArray)
            val schedulesJson = jsonArray.toString()
            
            // Store the schedules in preferences
            val schedulesPrefs = prefs.edit()
            schedulesPrefs.putString("schedule_$packageName", schedulesJson)
            schedulesPrefs.apply()
            
            Log.d(TAG, "Schedule saved: $schedulesJson")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting app schedule: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }
    
    // Helper method to convert ReadableArray to JSONArray
    private fun convertReadableArrayToJsonArray(readableArray: ReadableArray): JSONArray {
        val jsonArray = JSONArray()
        for (i in 0 until readableArray.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> jsonArray.put(JSONObject.NULL)
                ReadableType.Boolean -> jsonArray.put(readableArray.getBoolean(i))
                ReadableType.Number -> jsonArray.put(readableArray.getDouble(i))
                ReadableType.String -> jsonArray.put(readableArray.getString(i))
                ReadableType.Map -> {
                    val map = readableArray.getMap(i)
                    if (map != null) {
                        jsonArray.put(convertReadableMapToJsonObject(map))
                    } else {
                        jsonArray.put(JSONObject.NULL)
                    }
                }
                ReadableType.Array -> {
                    val array = readableArray.getArray(i)
                    if (array != null) {
                        jsonArray.put(convertReadableArrayToJsonArray(array))
                    } else {
                        jsonArray.put(JSONArray())
                    }
                }
            }
        }
        return jsonArray
    }
    
    // Helper method to convert ReadableMap to JSONObject
    private fun convertReadableMapToJsonObject(readableMap: ReadableMap): JSONObject {
        val iterator = readableMap.keySetIterator()
        val jsonObject = JSONObject()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                ReadableType.Null -> jsonObject.put(key, JSONObject.NULL)
                ReadableType.Boolean -> jsonObject.put(key, readableMap.getBoolean(key))
                ReadableType.Number -> jsonObject.put(key, readableMap.getDouble(key))
                ReadableType.String -> jsonObject.put(key, readableMap.getString(key))
                ReadableType.Map -> {
                    val map = readableMap.getMap(key)
                    if (map != null) {
                        jsonObject.put(key, convertReadableMapToJsonObject(map))
                    } else {
                        jsonObject.put(key, JSONObject.NULL)
                    }
                }
                ReadableType.Array -> {
                    val array = readableMap.getArray(key)
                    if (array != null) {
                        jsonObject.put(key, convertReadableArrayToJsonArray(array))
                    } else {
                        jsonObject.put(key, JSONArray())
                    }
                }
            }
        }
        return jsonObject
    }

    @ReactMethod
    fun getAppSchedule(packageName: String, promise: Promise) {
        try {
            Log.d(TAG, "Getting schedule for app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Get the schedule JSON string
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            
            if (schedulesJson == null) {
                // No schedules found
                Log.d(TAG, "No schedules found for: $packageName")
                promise.resolve(WritableNativeArray())
                return
            }
            
            // Convert JSON string back to ReadableArray
            val schedulesJsonArray = JSONArray(schedulesJson)
            val result = Arguments.createArray()
            
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                val schedule = Arguments.createMap()
                
                schedule.putString("id", scheduleJson.getString("id"))
                schedule.putString("type", scheduleJson.getString("type"))
                schedule.putBoolean("enabled", scheduleJson.getBoolean("enabled"))
                
                val timeRangesJson = scheduleJson.getJSONArray("timeRanges")
                val timeRanges = Arguments.createArray()
                
                for (j in 0 until timeRangesJson.length()) {
                    val timeRangeJson = timeRangesJson.getJSONObject(j)
                    val timeRange = Arguments.createMap()
                    
                    timeRange.putInt("startHour", timeRangeJson.getInt("startHour"))
                    timeRange.putInt("startMinute", timeRangeJson.getInt("startMinute"))
                    timeRange.putInt("endHour", timeRangeJson.getInt("endHour"))
                    timeRange.putInt("endMinute", timeRangeJson.getInt("endMinute"))
                    
                    // Add days array if it exists
                    if (timeRangeJson.has("days")) {
                        val daysJson = timeRangeJson.getJSONArray("days")
                        val days = Arguments.createArray()
                        for (k in 0 until daysJson.length()) {
                            days.pushInt(daysJson.getInt(k))
                        }
                        timeRange.putArray("days", days)
                    } else {
                        // If no days specified, create an empty array
                        timeRange.putArray("days", Arguments.createArray())
                    }
                    
                    timeRanges.pushMap(timeRange)
                }
                
                schedule.putArray("timeRanges", timeRanges)
                result.pushMap(schedule)
            }
            
            Log.d(TAG, "Returning schedules: $schedulesJson")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting app schedule: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setAllSchedulesEnabled(packageName: String, enabled: Boolean, promise: Promise) {
        try {
            Log.d(TAG, "Setting all schedules for $packageName to enabled=$enabled")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Get the existing schedules
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            
            if (schedulesJson == null) {
                // No schedules found
                Log.d(TAG, "No schedules found for: $packageName")
                promise.resolve(false)
                return
            }
            
            // Parse the schedules
            val schedulesJsonArray = JSONArray(schedulesJson)
            
            // Create a new array with updated enabled status
            val updatedJsonArray = JSONArray()
            
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                
                // Update the enabled flag
                scheduleJson.put("enabled", enabled)
                
                // Add to the new array
                updatedJsonArray.put(scheduleJson)
            }
            
            // Save the updated schedules
            val schedulesPrefs = prefs.edit()
            schedulesPrefs.putString("schedule_$packageName", updatedJsonArray.toString())
            schedulesPrefs.apply()
            
            Log.d(TAG, "Schedules updated for $packageName: enabled=$enabled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting schedule enabled state: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    // USAGE LIMIT METHODS - Enhanced with better tracking
    @ReactMethod
fun setAppUsageLimit(packageName: String, limitMinutes: Int, promise: Promise) {
    try {
        Log.d(TAG, "Setting usage limit for $packageName: $limitMinutes minutes")
        
        if (limitMinutes <= 0) {
            promise.reject("INVALID_LIMIT", "Usage limit must be greater than 0")
            return
        }
        
        if (limitMinutes > 1440) { // 24 hours
            promise.reject("INVALID_LIMIT", "Usage limit cannot exceed 24 hours")
            return
        }
        
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        
        // Get current usage to check if we should reset the limit reached flag
        val todayDate = getTodayDateString()
        val savedDate = prefs.getString("usage_date_$packageName", "")
        val currentUsage = if (savedDate == todayDate) {
            prefs.getLong("usage_today_$packageName", 0L)
        } else {
            0L
        }
        
        // Save the usage limit
        val editor = prefs.edit()
        editor.putLong("usage_limit_$packageName", limitMinutes.toLong())
        
        // IMPORTANT: Reset the limit reached flag if current usage is below new limit
        if (currentUsage < limitMinutes) {
            Log.d(TAG, "Current usage ($currentUsage) is below new limit ($limitMinutes), resetting limit reached flag")
            editor.putBoolean("usage_limit_reached_$packageName", false)
        }
        
        editor.apply()
        
        Log.d(TAG, "Usage limit set successfully for $packageName")
        promise.resolve(true)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error setting usage limit: ${e.message}", e)
        promise.reject("ERROR", "Failed to set usage limit: ${e.message}")
    }
}

    @ReactMethod
    fun getAppUsageLimit(packageName: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
            Log.d(TAG, "Got usage limit for $packageName: $limitMinutes minutes")
            promise.resolve(limitMinutes.toInt())
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting usage limit: ${e.message}", e)
            promise.reject("ERROR", "Failed to get usage limit: ${e.message}")
        }
    }

    @ReactMethod
fun removeAppUsageLimit(packageName: String, promise: Promise) {
    try {
        Log.d(TAG, "Removing usage limit for $packageName")
        
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        prefs.edit()
            .remove("usage_limit_$packageName")
            .putBoolean("usage_limit_reached_$packageName", false) // Always reset when removing limit
            .apply()
        
        Log.d(TAG, "Usage limit removed successfully for $packageName")
        promise.resolve(true)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error removing usage limit: ${e.message}", e)
        promise.reject("ERROR", "Failed to remove usage limit: ${e.message}")
    }
}

    // Enhanced accurate usage tracking method
    @ReactMethod
fun getAppUsageToday(packageName: String, promise: Promise) {
    try {
        Log.d(TAG, "Getting usage today for: $packageName")
        
        // Check if we have usage stats permission first
        if (!hasUsageStatsPermission()) {
            Log.e(TAG, "Usage stats permission not granted")
            promise.resolve(0)
            return
        }
        
        val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        
        // Get today's start time
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()
        
        Log.d(TAG, "Querying usage stats from ${Date(startTime)} to ${Date(endTime)}")
        
        // Query usage stats for today
        val usageStats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )
        
        if (usageStats.isNullOrEmpty()) {
            Log.w(TAG, "No usage stats returned for today")
            promise.resolve(0)
            return
        }
        
        // Find stats for the specific package
        var totalForegroundTime = 0L
        usageStats.forEach { stat ->
            if (stat.packageName == packageName) {
                totalForegroundTime += stat.totalTimeInForeground
                Log.d(TAG, "Found usage for $packageName: ${stat.totalTimeInForeground}ms")
            }
        }
        
        // Convert to minutes
        val usageMinutes = (totalForegroundTime / (1000 * 60)).toInt()
        Log.d(TAG, "Total usage for $packageName today: ${usageMinutes} minutes")
        
        promise.resolve(usageMinutes)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error getting usage today: ${e.message}", e)
        promise.resolve(0)
    }
}

@ReactMethod
fun getRealTimeUsageToday(packageName: String, promise: Promise) {
    try {
        Log.d(TAG, "Getting real-time usage for: $packageName")
        
        if (!hasUsageStatsPermission()) {
            Log.e(TAG, "Usage stats permission not granted")
            promise.resolve(0)
            return
        }
        
        // Get usage from system UsageStats
        val systemUsage = getSystemUsageForToday(packageName)
        
        // Get any additional tracked usage from SharedPreferences
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        val todayDate = getTodayDateString()
        val savedDate = prefs.getString("usage_date_$packageName", "")
        
        val storedUsage = if (savedDate == todayDate) {
            prefs.getLong("usage_today_$packageName", 0L)
        } else {
            0L
        }
        
        // Use the higher of the two values (system stats are more accurate)
        val finalUsage = maxOf(systemUsage.toLong(), storedUsage)
        
        Log.d(TAG, "Real-time usage for $packageName: system=$systemUsage, stored=$storedUsage, final=$finalUsage")
        
        promise.resolve(finalUsage.toInt())
        
    } catch (e: Exception) {
        Log.e(TAG, "Error getting real-time usage: ${e.message}", e)
        promise.resolve(0)
    }
}

private fun getSystemUsageForToday(packageName: String): Int {
    return try {
        val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()
        
        val usageStats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )
        
        var totalTime = 0L
        usageStats?.forEach { stat ->
            if (stat.packageName == packageName) {
                totalTime += stat.totalTimeInForeground
            }
        }
        
        (totalTime / (1000 * 60)).toInt() // Convert to minutes
    } catch (e: Exception) {
        Log.e(TAG, "Error getting system usage: ${e.message}", e)
        0
    }
}


    @ReactMethod
    fun resetAppUsageToday(packageName: String, promise: Promise) {
        try {
            Log.d(TAG, "Resetting usage today for $packageName")
            
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val todayDate = getTodayDateString()
            prefs.edit()
                .putLong("usage_today_$packageName", 0L)
                .putString("usage_date_$packageName", todayDate)
                .putBoolean("usage_limit_reached_$packageName", false) // Reset limit reached flag
                .apply()
            
            Log.d(TAG, "Usage reset successfully for $packageName")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error resetting usage: ${e.message}", e)
            promise.reject("ERROR", "Failed to reset usage: ${e.message}")
        }
    }

    @ReactMethod
fun isAppLimitReached(packageName: String, promise: Promise) {
    try {
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
        
        if (limitMinutes <= 0) {
            // No limit set
            promise.resolve(false)
            return
        }
        
        val todayDate = getTodayDateString()
        val savedDate = prefs.getString("usage_date_$packageName", "")
        
        if (savedDate != todayDate) {
            // New day, reset everything
            prefs.edit()
                .putLong("usage_today_$packageName", 0L)
                .putString("usage_date_$packageName", todayDate)
                .putBoolean("usage_limit_reached_$packageName", false)
                .apply()
            promise.resolve(false)
            return
        }
        
        val usageToday = prefs.getLong("usage_today_$packageName", 0L)
        val isLimitReached = usageToday >= limitMinutes
        
        // IMPORTANT: Always update the limit reached flag based on current status
        val currentFlag = prefs.getBoolean("usage_limit_reached_$packageName", false)
        if (currentFlag != isLimitReached) {
            Log.d(TAG, "Updating limit reached flag for $packageName: $currentFlag -> $isLimitReached")
            prefs.edit()
                .putBoolean("usage_limit_reached_$packageName", isLimitReached)
                .apply()
        }
        
        Log.d(TAG, "Limit check for $packageName: usage=$usageToday, limit=$limitMinutes, reached=$isLimitReached")
        promise.resolve(isLimitReached)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error checking if limit reached: ${e.message}", e)
        promise.resolve(false)
    }
}

// NEW: Method to force re-evaluation of blocking status
@ReactMethod
fun reevaluateAppBlockingStatus(packageName: String, promise: Promise) {
    try {
        Log.d(TAG, "Re-evaluating blocking status for $packageName")
        
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        
        // Force re-check usage limit status
        val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
        if (limitMinutes > 0) {
            val todayDate = getTodayDateString()
            val savedDate = prefs.getString("usage_date_$packageName", "")
            val usageToday = if (savedDate == todayDate) {
                prefs.getLong("usage_today_$packageName", 0L)
            } else {
                0L
            }
            
            val shouldBeReached = usageToday >= limitMinutes
            prefs.edit()
                .putBoolean("usage_limit_reached_$packageName", shouldBeReached)
                .apply()
            
            Log.d(TAG, "Updated limit reached status for $packageName: $shouldBeReached")
        }
        
        // Now check if app should be locked
        val shouldLock = shouldAppBeLockedInternal(packageName)
        promise.resolve(shouldLock)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error re-evaluating blocking status: ${e.message}", e)
        promise.reject("ERROR", "Failed to re-evaluate blocking status: ${e.message}")
    }
}

// HELPER: Internal method for shouldAppBeLocked logic (reusable)
private fun shouldAppBeLockedInternal(packageName: String): Boolean {
    try {
        Log.d(TAG, "Checking if app should be locked: $packageName")
        
        val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
        
        // PRIORITY 1: Check usage limit first (most critical)
        val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
        if (limitMinutes > 0) {
            val todayDate = getTodayDateString()
            val savedDate = prefs.getString("usage_date_$packageName", "")
            
            if (savedDate == todayDate) {
                val usageToday = prefs.getLong("usage_today_$packageName", 0L)
                val shouldBeReached = usageToday >= limitMinutes
                
                // Update the flag to match current reality
                prefs.edit().putBoolean("usage_limit_reached_$packageName", shouldBeReached).apply()
                
                if (shouldBeReached) {
                    Log.d(TAG, "$packageName should be locked due to usage limit: ${usageToday}min >= ${limitMinutes}min")
                    return true
                }
            } else {
                // New day, reset usage data
                prefs.edit()
                    .putLong("usage_today_$packageName", 0L)
                    .putString("usage_date_$packageName", todayDate)
                    .putBoolean("usage_limit_reached_$packageName", false)
                    .apply()
            }
        }
        
        // PRIORITY 2: Check if Pomodoro mode is active and should block this app
        val isPomodoroMode = prefs.getBoolean("pomodoro_mode", false)
        val isPaused = prefs.getBoolean("pomodoro_paused", false)
        val isPomodoroActive = isPomodoroMode && !isPaused
        
        if (isPomodoroActive) {
            val excludedApps = prefs.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            val neverBlockApps = setOf(
                "com.android.systemui",
                "com.android.launcher",
                "com.android.launcher2", 
                "com.android.launcher3",
                "com.google.android.dialer",
                "com.android.dialer",
                "com.android.phone",
                "com.android.emergency",
                "com.android.settings",
                "com.wingsfly",
                reactApplicationContext.packageName
            )
            
            if (!neverBlockApps.contains(packageName) && !excludedApps.contains(packageName)) {
                try {
                    val packageManager = reactApplicationContext.packageManager
                    val appInfo = packageManager.getApplicationInfo(packageName, 0)
                    if ((appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0) {
                        Log.d(TAG, "$packageName should be locked due to Pomodoro mode")
                        return true
                    }
                } catch (e: Exception) {
                    // If we can't check, err on the side of caution and don't block
                }
            }
        }
        
        // PRIORITY 3: Check manual locks and schedules
        val lockedApps = prefs.getStringSet("locked_apps", setOf()) ?: setOf()
        
        if (lockedApps.contains(packageName)) {
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            if (schedulesJson != null) {
                val shouldLock = shouldLockBySchedule(packageName, schedulesJson)
                Log.d(TAG, "$packageName manual lock with schedule check: $shouldLock")
                return shouldLock
            } else {
                Log.d(TAG, "$packageName should be locked (manual lock)")
                return true
            }
        }
        
        // PRIORITY 4: Check if app should be locked by schedule only
        val schedulesJson = prefs.getString("schedule_$packageName", null)
        if (schedulesJson != null) {
            val shouldLock = shouldLockBySchedule(packageName, schedulesJson)
            Log.d(TAG, "$packageName schedule-only check: $shouldLock")
            return shouldLock
        }
        
        // App should not be locked
        Log.d(TAG, "$packageName should not be locked")
        return false
        
    } catch (e: Exception) {
        Log.e(TAG, "Error checking if app should be locked: ${e.message}", e)
        return false
    }
}

    @ReactMethod
fun getAllAppsUsageToday(promise: Promise) {
    try {
        Log.d(TAG, "Getting usage data for all apps using system stats")
        
        if (!hasUsageStatsPermission()) {
            Log.e(TAG, "Usage stats permission not granted for getAllAppsUsageToday")
            promise.resolve(WritableNativeMap())
            return
        }
        
        val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        
        // Get today's range
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()
        
        Log.d(TAG, "Querying all usage stats from ${Date(startTime)} to ${Date(endTime)}")
        
        val usageStats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )
        
        val result = WritableNativeMap()
        val usageMap = mutableMapOf<String, Long>()
        
        // Aggregate usage stats
        usageStats?.forEach { stat ->
            if (stat.totalTimeInForeground > 0) {
                usageMap[stat.packageName] = usageMap.getOrDefault(stat.packageName, 0L) + stat.totalTimeInForeground
            }
        }
        
        // Convert to minutes and add to result
        usageMap.forEach { (packageName, timeMs) ->
            val timeMinutes = (timeMs / (1000 * 60)).toInt()
            if (timeMinutes > 0) {
                result.putInt(packageName, timeMinutes)
                Log.d(TAG, "Usage for $packageName: $timeMinutes minutes")
            }
        }
        
        Log.d(TAG, "Retrieved usage data for ${result.entryIterator.asSequence().count()} apps")
        promise.resolve(result)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error getting all apps usage: ${e.message}", e)
        promise.resolve(WritableNativeMap())
    }
}
    // Helper method to get today's date string
    private fun getTodayDateString(): String {
        val calendar = Calendar.getInstance()
        return "${calendar.get(Calendar.YEAR)}-${calendar.get(Calendar.MONTH) + 1}-${calendar.get(Calendar.DAY_OF_MONTH)}"
    }

    // UPDATED shouldAppBeLocked method to include usage limits
@ReactMethod
fun shouldAppBeLocked(packageName: String, promise: Promise) {
    try {
        val shouldLock = shouldAppBeLockedInternal(packageName)
        promise.resolve(shouldLock)
    } catch (e: Exception) {
        Log.e(TAG, "Error checking if app should be locked: ${e.message}", e)
        promise.reject("ERROR", "Failed to check lock status: ${e.message}")
    }
}

    // Utility function to check if current time is in a time range
    fun isInTimeRange(startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, days: List<Int>): Boolean {
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentMinute = calendar.get(Calendar.MINUTE)
        val currentDay = calendar.get(Calendar.DAY_OF_WEEK) - 1 // Convert to 0-6 format
        
        // First check if current day is in the schedule
        // If days list is empty or contains all days (0-6), treat as everyday
        if (days.isEmpty() || (days.size == 7 && days.containsAll(listOf(0, 1, 2, 3, 4, 5, 6)))) {
            // Everyday schedule, continue with time check
        } else if (!days.contains(currentDay)) {
            return false
        }
        
        // Convert to minutes for easier comparison
        val currentTimeMinutes = currentHour * 60 + currentMinute
        val startTimeMinutes = startHour * 60 + startMinute
        val endTimeMinutes = endHour * 60 + endMinute
        
        // Handle ranges that cross midnight
        return if (startTimeMinutes > endTimeMinutes) {
            // Range crosses midnight, e.g., 22:00-06:00
            currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes
        } else {
            // Normal range, e.g., 08:00-17:00
            currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes
        }
    }
    
    private fun shouldLockBySchedule(packageName: String, schedulesJson: String): Boolean {
        try {
            val schedulesJsonArray = JSONArray(schedulesJson)
            
            // Get current time and day
            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            val currentDay = calendar.get(Calendar.DAY_OF_WEEK) - 1 // Convert to 0-6 format
            
            Log.d(TAG, "Checking schedules for $packageName: $schedulesJson")
            Log.d(TAG, "Current time: $currentHour:$currentMinute, Day: $currentDay")
            
            // First check if there are any UNLOCK schedules - these take absolute priority
            var hasUnlockSchedule = false
            
            // Find any enabled UNLOCK schedules
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                
                // Skip disabled schedules
                if (!scheduleJson.getBoolean("enabled")) continue
                
                val scheduleType = scheduleJson.getString("type")
                
                if (scheduleType == "unlock") {
                    hasUnlockSchedule = true
                    break
                }
            }
            
            // If there are UNLOCK schedules, they take absolute priority
            if (hasUnlockSchedule) {
                Log.d(TAG, "$packageName has UNLOCK schedules - checking if in any UNLOCK time range")
                
                // Check if we're in any UNLOCK time range
                var isInUnlockRange = false
                
                for (i in 0 until schedulesJsonArray.length()) {
                    val scheduleJson = schedulesJsonArray.getJSONObject(i)
                    
                    // Skip disabled schedules or non-UNLOCK schedules
                    if (!scheduleJson.getBoolean("enabled") || scheduleJson.getString("type") != "unlock") continue
                    
                    val timeRangesJson = scheduleJson.getJSONArray("timeRanges")
                    
                    for (j in 0 until timeRangesJson.length()) {
                        val timeRangeJson = timeRangesJson.getJSONObject(j)
                        val startHour = timeRangeJson.getInt("startHour")
                        val startMinute = timeRangeJson.getInt("startMinute")
                        val endHour = timeRangeJson.getInt("endHour")
                        val endMinute = timeRangeJson.getInt("endMinute")
                        val days = timeRangeJson.getJSONArray("days")
                        
                        // Convert days array to List<Int>
                        val daysList = mutableListOf<Int>()
                        for (k in 0 until days.length()) {
                            daysList.add(days.getInt(k))
                        }
                        
                        val inRange = isInTimeRange(startHour, startMinute, endHour, endMinute, daysList)
                        Log.d(TAG, "Checking UNLOCK range $startHour:$startMinute-$endHour:$endMinute, inRange=$inRange")
                        
                        if (inRange) {
                            Log.d(TAG, "$packageName is in UNLOCK time range: $startHour:$startMinute-$endHour:$endMinute")
                            isInUnlockRange = true
                            break
                        }
                    }
                    
                    if (isInUnlockRange) break
                }
                
                // If we have UNLOCK schedules, the rule is simple:
                // - If in an UNLOCK range, do not lock
                // - If not in an UNLOCK range, lock
                val shouldLock = !isInUnlockRange
                Log.d(TAG, "UNLOCK schedule decision for $packageName: isInUnlockRange=$isInUnlockRange, shouldLock=$shouldLock")
                return shouldLock
            }
            
            // No UNLOCK schedules, check LOCK schedules
            Log.d(TAG, "$packageName has no UNLOCK schedules - checking LOCK schedules")
            var hasLockSchedule = false
            var isInLockRange = false
            
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                
                // Skip disabled schedules
                if (!scheduleJson.getBoolean("enabled")) continue
                
                val scheduleType = scheduleJson.getString("type")
                
                if (scheduleType == "lock") {
                    hasLockSchedule = true
                    // LOCK schedule: lock during these times
                    val timeRangesJson = scheduleJson.getJSONArray("timeRanges")
                    
                    for (j in 0 until timeRangesJson.length()) {
                        val timeRangeJson = timeRangesJson.getJSONObject(j)
                        val startHour = timeRangeJson.getInt("startHour")
                        val startMinute = timeRangeJson.getInt("startMinute")
                        val endHour = timeRangeJson.getInt("endHour")
                        val endMinute = timeRangeJson.getInt("endMinute")
                        val days = timeRangeJson.getJSONArray("days")
                        
                        // Convert days array to List<Int>
                        val daysList = mutableListOf<Int>()
                        for (k in 0 until days.length()) {
                            daysList.add(days.getInt(k))
                        }
                        
                        val inRange = isInTimeRange(startHour, startMinute, endHour, endMinute, daysList)
                        Log.d(TAG, "Checking LOCK range $startHour:$startMinute-$endHour:$endMinute, inRange=$inRange")
                        
                        if (inRange) {
                            Log.d(TAG, "$packageName is in LOCK time range: $startHour:$startMinute-$endHour:$endMinute")
                            isInLockRange = true
                            break
                        }
                    }
                    
                    if (isInLockRange) break
                }
            }
            
            // Set lock state based on LOCK schedules only
            var shouldLock = false
            if (isInLockRange) {
                // In a lock range, so should be locked
                shouldLock = true
            }
            
            Log.d(TAG, "LOCK schedule decision for $packageName: hasLockSchedule=$hasLockSchedule, isInLockRange=$isInLockRange, shouldLock=$shouldLock")
            return shouldLock
        } catch (e: Exception) {
            Log.e(TAG, "Error checking schedule: ${e.message}", e)
            return false
        }
    }
    

    @ReactMethod
    fun getAppUsageData(filterType: String, promise: Promise) {
        try {
            val context = reactApplicationContext

            // Check for USAGE_STATS permission
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
            if (mode != AppOpsManager.MODE_ALLOWED) {
                promise.reject("PERMISSION_DENIED", "Usage stats permission not granted")
                return
            }

            val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            var startTime: Long
            var endTime = System.currentTimeMillis()

            val calendar = Calendar.getInstance().apply { timeInMillis = endTime }

            startTime = when (filterType) {
                "TODAY" -> {
                    calendar.set(Calendar.HOUR_OF_DAY, 0)
                    calendar.set(Calendar.MINUTE, 0)
                    calendar.set(Calendar.SECOND, 0)
                    calendar.set(Calendar.MILLISECOND, 0)
                    calendar.timeInMillis
                }
                "YESTERDAY" -> {
                    calendar.add(Calendar.DAY_OF_YEAR, -1)
                    calendar.set(Calendar.HOUR_OF_DAY, 0)
                    calendar.set(Calendar.MINUTE, 0)
                    calendar.set(Calendar.SECOND, 0)
                    calendar.set(Calendar.MILLISECOND, 0)
                    val yesterdayStart = calendar.timeInMillis
                    calendar.add(Calendar.DAY_OF_YEAR, 1)
                    endTime = calendar.timeInMillis
                    yesterdayStart
                }
                "LAST_7_DAYS" -> {
                    calendar.add(Calendar.DAY_OF_YEAR, -7)
                    calendar.set(Calendar.HOUR_OF_DAY, 0)
                    calendar.set(Calendar.MINUTE, 0)
                    calendar.set(Calendar.SECOND, 0)
                    calendar.set(Calendar.MILLISECOND, 0)
                    calendar.timeInMillis
                }
                "LAST_30_DAYS" -> {
                    calendar.add(Calendar.DAY_OF_YEAR, -30)
                    calendar.set(Calendar.HOUR_OF_DAY, 0)
                    calendar.set(Calendar.MINUTE, 0)
                    calendar.set(Calendar.SECOND, 0)
                    calendar.set(Calendar.MILLISECOND, 0)
                    calendar.timeInMillis
                }
                else -> endTime - 7 * 24 * 3600_000
            }

            Log.d(TAG, "Fetching usage from ${Date(startTime)} to ${Date(endTime)}")

            // Get all installed apps first
            val installedApps = context.packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            Log.d(TAG, "Found ${installedApps.size} installed apps")

            // Get usage stats
            val usageStats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                startTime,
                endTime
            )

            Log.d(TAG, "Found ${usageStats?.size ?: 0} usage stats entries")

            val appUsageMap = WritableNativeMap()
            val aggregatedStats = mutableMapOf<String, Long>()

            // Aggregate usage stats
            usageStats?.forEach { stat ->
                // Only count foreground time
                stat.totalTimeInForeground.takeIf { it > 0 }?.let {
                    aggregatedStats.merge(stat.packageName, it) { a, b -> a + b }
                }
            }

            // Process all installed apps
            var appCount = 0
            installedApps.forEach { appInfo ->
                try {
                    val pkg = appInfo.packageName
                    
                    // Skip system apps that are not in allowedSystemApps
                    val isSystemApp = (appInfo.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0
                    if (isSystemApp && pkg !in allowedSystemApps) {
                        Log.d(TAG, "Filtered system app: $pkg")
                        return@forEach
                    }

                    val totalMs = aggregatedStats[pkg] ?: 0L
                    // Convert milliseconds to minutes with 2 decimal places
                    val timeMinutes = (totalMs / 60000.0).let { "%.2f".format(it).toDouble() }

                    WritableNativeMap().apply {
                        putString("name", context.packageManager.getApplicationLabel(appInfo).toString())
                        putDouble("timeInMinutes", timeMinutes)
                        putString("packageName", pkg)
                        val lastUsed = usageStats
                            ?.filter { it.packageName == pkg }
                            ?.maxByOrNull { it.lastTimeUsed }
                            ?.lastTimeUsed ?: 0.0
                        putDouble("lastTimeUsed", lastUsed.toDouble())
                        appUsageMap.putMap(pkg, this)
                        appCount++
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing app: ${appInfo.packageName}", e)
                }
            }

            Log.d(TAG, "Found ${usageStats?.count() ?: 0} usage stats entries")
            Log.d(TAG, "Returning $appCount apps in usage data")
            promise.resolve(appUsageMap)
        } catch (e: Exception) {
            Log.e(TAG, "Error: ${e.message}", e)
            promise.reject("ERROR", "Failed: ${e.message}")
        }
    }

    // POMODORO EXCLUSION METHODS
    @ReactMethod
    fun setAppPomodoroExclusion(packageName: String, excluded: Boolean, promise: Promise) {
        try {
            Log.d(TAG, "Setting Pomodoro exclusion for $packageName: $excluded")
            
            val sharedPreferences = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Get existing excluded apps
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", mutableSetOf()) ?: mutableSetOf()
            val updatedExcludedApps = excludedApps.toMutableSet()
            
            if (excluded) {
                // Add app to excluded list
                updatedExcludedApps.add(packageName)
                Log.d(TAG, "Added $packageName to Pomodoro exclusion list")
            } else {
                // Remove app from excluded list
                updatedExcludedApps.remove(packageName)
                Log.d(TAG, "Removed $packageName from Pomodoro exclusion list")
            }
            
            // Save updated exclusion list
            sharedPreferences.edit()
                .putStringSet("pomodoro_excluded_apps", updatedExcludedApps)
                .apply()
            
            Log.d(TAG, "Pomodoro exclusion list updated: ${updatedExcludedApps.joinToString()}")
            promise.resolve("Success")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error setting Pomodoro exclusion: ${e.message}", e)
            promise.reject("ERROR", "Failed to set Pomodoro exclusion: ${e.message}")
        }
    }

    @ReactMethod
    fun getAppPomodoroExclusion(packageName: String, promise: Promise) {
        try {
            val sharedPreferences = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            val isExcluded = excludedApps.contains(packageName)
            Log.d(TAG, "Pomodoro exclusion status for $packageName: $isExcluded")
            
            promise.resolve(isExcluded)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting Pomodoro exclusion: ${e.message}", e)
            promise.reject("ERROR", "Failed to get Pomodoro exclusion: ${e.message}")
        }
    }

    @ReactMethod
    fun getPomodoroExcludedApps(promise: Promise) {
        try {
            val sharedPreferences = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            Log.d(TAG, "Getting all Pomodoro excluded apps: ${excludedApps.joinToString()}")
            
            val resultArray = WritableNativeArray()
            excludedApps.forEach { packageName ->
                resultArray.pushString(packageName)
            }
            
            promise.resolve(resultArray)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting Pomodoro excluded apps: ${e.message}", e)
            promise.reject("ERROR", "Failed to get Pomodoro excluded apps: ${e.message}")
        }
    }
}