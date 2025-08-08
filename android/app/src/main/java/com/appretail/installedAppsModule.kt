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
    "com.google.android.apps.classroom",
    "com.google.android.apps.work.clouddpc",
    "com.google.android.apps.work.oobconfig",
    "com.google.android.apps.work.profile",
    "com.google.android.apps.work.profilepolicy",
    "com.google.android.apps.work.profilecontacts",
    "com.google.android.apps.work.profilecalendar",
    "com.google.android.apps.work.profilegmail",
    "com.google.android.apps.work.profilegallery",
    "com.google.android.apps.work.profileclock",
    "com.google.android.apps.work.profileweather",
    "com.google.android.apps.work.profilenews",
    "com.google.android.apps.work.profilebooks",
    "com.google.android.apps.work.profilemagazines",
    "com.google.android.apps.work.profilemusic",
    "com.google.android.apps.work.profilevideos",
    "com.google.android.apps.work.profilemovies",
    "com.google.android.apps.work.profilegames",
    "com.google.android.apps.work.profilefitness",
    "com.google.android.apps.work.profilehealth",
    "com.google.android.apps.work.profilewallet",
    "com.google.android.apps.work.profilepay",
    "com.google.android.apps.work.profileshopping",
    "com.google.android.apps.work.profiletravel",
    "com.google.android.apps.work.profiletranslate",
    "com.google.android.apps.work.profileassistant",
    "com.google.android.apps.work.profileduo",
    "com.google.android.apps.work.profilemeetings",
    "com.google.android.apps.work.profileclassroom"
)

enum class TimeFilter {
    LAST_HOUR,
    TODAY,
    YESTERDAY,
    LAST_7_DAYS,
    LAST_30_DAYS
}

@ReactModule(name = "InstalledApps")
class InstalledAppsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
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
            Log.d("AppLock", "Locking app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val lockedApps = prefs.getStringSet("locked_apps", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
            lockedApps.add(packageName)
            prefs.edit().putStringSet("locked_apps", lockedApps).apply()
            
            // Log the current set of locked apps
            Log.d("AppLock", "Current locked apps: ${lockedApps.joinToString()}")
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AppLock", "Error locking app: ${e.message}", e)
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
            Log.d("AppLock", "Setting PIN...")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            prefs.edit().putString("lock_pin", pin).apply()
            Log.d("AppLock", "PIN set successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AppLock", "Error setting PIN: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startLockService(promise: Promise) {
        try {
            Log.d("AppLock", "Starting lock service...")
            val intent = Intent(reactApplicationContext, AppLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d("AppLock", "Using startForegroundService")
                reactApplicationContext.startForegroundService(intent)
            } else {
                Log.d("AppLock", "Using startService")
                reactApplicationContext.startService(intent)
            }
            Log.d("AppLock", "Lock service started successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AppLock", "Error starting service: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val hasOverlayPermission = Settings.canDrawOverlays(reactApplicationContext)
            val hasUsagePermission = hasUsageStatsPermission()
            
            Log.d("AppLock", "Permissions check - Overlay: $hasOverlayPermission, Usage: $hasUsagePermission")
            
            val result = WritableNativeMap().apply {
                putBoolean("overlay", hasOverlayPermission)
                putBoolean("usage", hasUsagePermission)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking permissions: ${e.message}", e)
            promise.reject("ERROR", e.message)
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
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
        return mode == AppOpsManager.MODE_ALLOWED
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

    @ReactMethod
    fun setAppSchedule(packageName: String, schedulesArray: ReadableArray, promise: Promise) {
        try {
            Log.d("AppLock", "Setting schedule for app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Convert ReadableArray to JSON string for storage
            val jsonArray = convertReadableArrayToJsonArray(schedulesArray)
            val schedulesJson = jsonArray.toString()
            
            // Store the schedules in preferences
            val schedulesPrefs = prefs.edit()
            schedulesPrefs.putString("schedule_$packageName", schedulesJson)
            schedulesPrefs.apply()
            
            Log.d("AppLock", "Schedule saved: $schedulesJson")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AppLock", "Error setting app schedule: ${e.message}", e)
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
            Log.d("AppLock", "Getting schedule for app: $packageName")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Get the schedule JSON string
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            
            if (schedulesJson == null) {
                // No schedules found
                Log.d("AppLock", "No schedules found for: $packageName")
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
            
            Log.d("AppLock", "Returning schedules: $schedulesJson")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e("AppLock", "Error getting app schedule: ${e.message}", e)
            promise.reject("ERROR", e.message)
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

    @ReactMethod
    fun shouldAppBeLocked(packageName: String, promise: Promise) {
        try {
            Log.d("AppLock", "Checking if app should be locked: $packageName")
            
            // Get the app schedules if any
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            
            if (schedulesJson != null) {
                // App has schedules, check if it should be locked based on them
                val isCurrentlyLocked = shouldLockBySchedule(packageName, schedulesJson)
                promise.resolve(isCurrentlyLocked)
                return
            }
            
            // No schedules, so not locked
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking if app should be locked: ${e.message}", e)
            promise.reject("ERROR", e.message)
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
            
            Log.d("AppLock", "Checking schedules for $packageName: $schedulesJson")
            Log.d("AppLock", "Current time: $currentHour:$currentMinute, Day: $currentDay")
            
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
                Log.d("AppLock", "$packageName has UNLOCK schedules - checking if in any UNLOCK time range")
                
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
                        Log.d("AppLock", "Checking UNLOCK range $startHour:$startMinute-$endHour:$endMinute, inRange=$inRange")
                        
                        if (inRange) {
                            Log.d("AppLock", "$packageName is in UNLOCK time range: $startHour:$startMinute-$endHour:$endMinute")
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
                Log.d("AppLock", "UNLOCK schedule decision for $packageName: isInUnlockRange=$isInUnlockRange, shouldLock=$shouldLock")
                return shouldLock
            }
            
            // No UNLOCK schedules, check LOCK schedules
            Log.d("AppLock", "$packageName has no UNLOCK schedules - checking LOCK schedules")
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
                        Log.d("AppLock", "Checking LOCK range $startHour:$startMinute-$endHour:$endMinute, inRange=$inRange")
                        
                        if (inRange) {
                            Log.d("AppLock", "$packageName is in LOCK time range: $startHour:$startMinute-$endHour:$endMinute")
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
            
            Log.d("AppLock", "LOCK schedule decision for $packageName: hasLockSchedule=$hasLockSchedule, isInLockRange=$isInLockRange, shouldLock=$shouldLock")
            return shouldLock
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking schedule: ${e.message}", e)
            return false
        }
    }

    @ReactMethod
    fun setAllSchedulesEnabled(packageName: String, enabled: Boolean, promise: Promise) {
        try {
            Log.d("AppLock", "Setting all schedules for $packageName to enabled=$enabled")
            val prefs = reactApplicationContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            // Get the existing schedules
            val schedulesJson = prefs.getString("schedule_$packageName", null)
            
            if (schedulesJson == null) {
                // No schedules found
                Log.d("AppLock", "No schedules found for: $packageName")
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
            
            Log.d("AppLock", "Schedules updated for $packageName: enabled=$enabled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AppLock", "Error setting schedule enabled state: ${e.message}", e)
            promise.reject("ERROR", e.message)
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

            Log.d("AppLock", "Fetching usage from ${Date(startTime)} to ${Date(endTime)}")

            // Get all installed apps first
            val installedApps = context.packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            Log.d("AppLock", "Found ${installedApps.size} installed apps")

            // Get usage stats
            val usageStats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                startTime,
                endTime
            )

            Log.d("AppLock", "Found ${usageStats?.size ?: 0} usage stats entries")

            // Log WhatsApp specific stats
            usageStats?.filter { it.packageName == "com.whatsapp" }?.forEach { stat ->
                Log.d("AppLock", "WhatsApp stats - Total time: ${stat.totalTimeInForeground}ms, Last used: ${stat.lastTimeUsed}")
            }

            val appUsageMap = WritableNativeMap()
            val aggregatedStats = mutableMapOf<String, Long>()

            // Aggregate usage stats
            usageStats?.forEach { stat ->
                // Only count foreground time
                stat.totalTimeInForeground.takeIf { it > 0 }?.let {
                    aggregatedStats.merge(stat.packageName, it) { a, b -> a + b }
                }
            }

            // Log WhatsApp aggregated stats
            Log.d("AppLock", "WhatsApp aggregated time: ${aggregatedStats["com.whatsapp"] ?: 0}ms")

            // Process all installed apps
            var appCount = 0
            installedApps.forEach { appInfo ->
                try {
                    val pkg = appInfo.packageName
                    
                    // Skip system apps that are not in allowedSystemApps
                    val isSystemApp = (appInfo.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0
                    if (isSystemApp && pkg !in allowedSystemApps) {
                        Log.d("AppLock", "Filtered system app: $pkg")
                        return@forEach
                    }

                    val totalMs = aggregatedStats[pkg] ?: 0L
                    // Convert milliseconds to minutes with 2 decimal places
                    val timeMinutes = (totalMs / 60000.0).let { "%.2f".format(it).toDouble() }

                    // Log detailed usage for WhatsApp and YouTube
                    if (pkg == "com.whatsapp" || pkg == "com.google.android.youtube") {
                        Log.d("AppLock", "$pkg usage - Total ms: $totalMs, Minutes: $timeMinutes")
                    }

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
                    Log.e("AppLock", "Error processing app: ${appInfo.packageName}", e)
                }
            }

            Log.d("AppLock", "Found ${usageStats?.count() ?: 0} usage stats entries")
            Log.d("AppLock", "Returning $appCount apps in usage data")
            promise.resolve(appUsageMap)
        } catch (e: Exception) {
            Log.e("AppLock", "Error: ${e.message}", e)
            promise.reject("ERROR", "Failed: ${e.message}")
        }
    }
} 