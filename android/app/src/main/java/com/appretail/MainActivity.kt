package com.wingsfly

import android.app.ActivityManager
import android.app.AppOpsManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.view.KeyEvent
import com.wingsfly.YouTubeNightModeModule

class MainActivity : ReactActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val PREFS_NAME = "DetoxPrefs"
        private const val KEY_DETOX_ACTIVE = "detox_active"
        private const val KEY_DETOX_END_TIME = "detox_end_time"

        private const val KEY_APP_UNLOCKED_UNTIL = "app_unlocked_until"
        
        // ✅ NEW: Track if MainActivity is properly initialized
        var isMainActivityVisible = false
    }

    init {
        Log.e(TAG, "===========================================")
        Log.e(TAG, "MAINACTIVITY CONSTRUCTOR - FIXED VERSION")
        Log.e(TAG, "===========================================")
    }
    
    private val USAGE_ACCESS_REQUEST_CODE = 1001
    private val OVERLAY_PERMISSION_REQUEST_CODE = 1002
    
    private var appLockService: AppLockService? = null
    private var serviceBound = false
    
    private var pendingIntentData: Intent? = null
    private var hasProcessedIntent = false
    
    private lateinit var prefs: SharedPreferences
    private var isDetoxUnlocked = false
    
    // ✅ FIXED: Better state tracking
    private var isRelocking = false
    private var hasScheduledRelock = false
    private var isActivityInitialized = false
    private val relockHandler = Handler(Looper.getMainLooper())
    
    private var userInteractionTime = 0L
    private var isUserInteracting = false
    
    private val closeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "📪 Received close broadcast - finishing MainActivity")
            finish()
        }
    }
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            Log.d(TAG, "Service connected")
            val binder = service as AppLockService.ServiceBinder
            appLockService = binder.asService()
            serviceBound = true
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            Log.d(TAG, "Service disconnected")
            appLockService = null
            serviceBound = false
        }
    }

    override fun getMainComponentName(): String = "AppRetail"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

       private fun handleNightModeIntent(intent: Intent?) {
    // ✅ GET DEVICE INFO
    val androidVersion = Build.VERSION.SDK_INT
    val androidRelease = Build.VERSION.RELEASE
    val deviceManufacturer = Build.MANUFACTURER
    val deviceModel = Build.MODEL
    val deviceBrand = Build.BRAND
    
    Log.e(TAG, "")
    Log.e(TAG, "🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍")
    Log.e(TAG, "🔍 MAINACTIVITY - handleNightModeIntent CALLED")
    Log.e(TAG, "🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍")
    Log.e(TAG, "")
    Log.e(TAG, "📱 DEVICE INFO:")
    Log.e(TAG, "   Manufacturer: $deviceManufacturer")
    Log.e(TAG, "   Brand: $deviceBrand")
    Log.e(TAG, "   Model: $deviceModel")
    Log.e(TAG, "   Android Version: $androidRelease (API $androidVersion)")
    Log.e(TAG, "")
    Log.e(TAG, "📦 INTENT INFO:")
    Log.e(TAG, "   Intent is null: ${intent == null}")
    
    if (intent != null) {
        Log.e(TAG, "   Intent action: ${intent.action}")
        Log.e(TAG, "   Has extras: ${intent.extras != null}")
        
        if (intent.extras != null) {
            Log.e(TAG, "   All extras:")
            for (key in intent.extras!!.keySet()) {
                Log.e(TAG, "      - $key = ${intent.extras!!.get(key)}")
            }
        }
    }
    Log.e(TAG, "")
    
    if (intent?.action == "TRIGGER_NIGHT_MODE") {
        Log.e(TAG, "✅ Action matches TRIGGER_NIGHT_MODE")
        
        val triggerNightMode = intent.getBooleanExtra("trigger_night_mode", false)
        val fromAlarm = intent.getBooleanExtra("from_alarm", false)
        val appWasKilled = intent.getBooleanExtra("app_was_killed", false)
        
        Log.e(TAG, "")
        Log.e(TAG, "🎯 TRIGGER FLAGS:")
        Log.e(TAG, "   trigger_night_mode: $triggerNightMode")
        Log.e(TAG, "   from_alarm: $fromAlarm")
        Log.e(TAG, "   app_was_killed: $appWasKilled")
        Log.e(TAG, "")
        
        if (triggerNightMode) {
            Log.e(TAG, "✅ triggerNightMode is TRUE - Processing...")
            
            val bedHour = intent.getIntExtra("bed_hour", 0)
            val bedMinute = intent.getIntExtra("bed_minute", 0)

            Log.e(TAG, "")
            Log.e(TAG, "🛏️ BED TIME INFO:")
            Log.e(TAG, "   Hour: $bedHour")
            Log.e(TAG, "   Minute: $bedMinute")
            Log.e(TAG, "   Formatted: $bedHour:${String.format("%02d", bedMinute)}")
            Log.e(TAG, "")

            // Store trigger data in SharedPreferences
            Log.e(TAG, "💾 Storing to SharedPreferences...")
            val nightModePrefs = getSharedPreferences("NightModeTrigger", Context.MODE_PRIVATE)
            val editor = nightModePrefs.edit()
            editor.putBoolean("should_trigger", true)
            editor.putBoolean("from_alarm", fromAlarm)
            editor.putBoolean("app_was_killed", appWasKilled)
            editor.putInt("bed_hour", bedHour)
            editor.putInt("bed_minute", bedMinute)
            editor.putLong("trigger_time", System.currentTimeMillis())
            val saved = editor.commit() // Use commit() instead of apply() for immediate save
            
            Log.e(TAG, "💾 SharedPreferences save result: $saved")
            Log.e(TAG, "")

            // Verify it was saved
            Log.e(TAG, "✅ Verifying saved data...")
            val shouldTrigger = nightModePrefs.getBoolean("should_trigger", false)
            val savedBedHour = nightModePrefs.getInt("bed_hour", -1)
            val savedBedMinute = nightModePrefs.getInt("bed_minute", -1)
            Log.e(TAG, "   should_trigger: $shouldTrigger")
            Log.e(TAG, "   bed_hour: $savedBedHour")
            Log.e(TAG, "   bed_minute: $savedBedMinute")
            Log.e(TAG, "")

            // Send event to React Native with retry logic
            Log.e(TAG, "📡 Attempting to send event to React Native...")
            sendNightModeEventWithRetry(bedHour, bedMinute, fromAlarm, appWasKilled, 0)
            
        } else {
            Log.e(TAG, "⚠️ triggerNightMode is FALSE - Skipping processing")
        }
    } else {
        Log.e(TAG, "⚠️ Action does NOT match TRIGGER_NIGHT_MODE")
        Log.e(TAG, "   Expected: TRIGGER_NIGHT_MODE")
        Log.e(TAG, "   Got: ${intent?.action}")
    }
    
    Log.e(TAG, "")
    Log.e(TAG, "🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍")
    Log.e(TAG, "")
}

/**
 * ✅ NEW: Send Night Mode event with retry logic
 */
private fun sendNightModeEventWithRetry(
    bedHour: Int, 
    bedMinute: Int, 
    fromAlarm: Boolean, 
    appWasKilled: Boolean,
    attempt: Int
) {
    val maxAttempts = 5
    val delayMs = when(attempt) {
        0 -> 500L    // First try after 500ms
        1 -> 1000L   // Second try after 1s
        2 -> 2000L   // Third try after 2s
        3 -> 3000L   // Fourth try after 3s
        else -> 5000L // Final try after 5s
    }

    Log.e(TAG, "⏳ Scheduling event send attempt ${attempt + 1}/$maxAttempts in ${delayMs}ms")

    Handler(Looper.getMainLooper()).postDelayed({
        try {
            Log.e(TAG, "")
            Log.e(TAG, "📡 EVENT SEND ATTEMPT ${attempt + 1}/$maxAttempts")
            Log.e(TAG, "")
            
            val reactContext = reactInstanceManager?.currentReactContext
            
            Log.e(TAG, "   reactInstanceManager: ${reactInstanceManager != null}")
            Log.e(TAG, "   reactContext: ${reactContext != null}")
            
            if (reactContext != null) {
                Log.e(TAG, "   ✅ React Native context is READY!")
                
                val params = Arguments.createMap().apply {
                    putInt("bed_hour", bedHour)
                    putInt("bed_minute", bedMinute)
                    putBoolean("from_alarm", fromAlarm)
                    putBoolean("app_was_killed", appWasKilled)
                    putString("message", "It's time to wind down for bed!")
                }

                Log.e(TAG, "")
                Log.e(TAG, "📤 Emitting TRIGGER_NIGHT_MODE event...")
                Log.e(TAG, "   Event data:")
                Log.e(TAG, "      bed_hour: $bedHour")
                Log.e(TAG, "      bed_minute: $bedMinute")
                Log.e(TAG, "      from_alarm: $fromAlarm")
                Log.e(TAG, "      app_was_killed: $appWasKilled")

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("TRIGGER_NIGHT_MODE", params)
                
                Log.e(TAG, "")
                Log.e(TAG, "✅✅✅ NIGHT MODE EVENT SENT SUCCESSFULLY! ✅✅✅")
                Log.e(TAG, "")
                
                // Clear the SharedPreferences flag after successful send
                val nightModePrefs = getSharedPreferences("NightModeTrigger", Context.MODE_PRIVATE)
                nightModePrefs.edit().putBoolean("should_trigger", false).commit()
                
                Log.e(TAG, "🧹 Cleared 'should_trigger' flag from SharedPreferences")
                
            } else if (attempt < maxAttempts - 1) {
                Log.e(TAG, "   ⚠️ React Native context NOT ready yet")
                Log.e(TAG, "   🔄 Will retry (attempt ${attempt + 2}/$maxAttempts)...")
                sendNightModeEventWithRetry(bedHour, bedMinute, fromAlarm, appWasKilled, attempt + 1)
            } else {
                Log.e(TAG, "")
                Log.e(TAG, "❌❌❌ FAILED: React Native context not ready after $maxAttempts attempts!")
                Log.e(TAG, "")
                Log.e(TAG, "💾 Night Mode data is saved in SharedPreferences")
                Log.e(TAG, "   It will be checked when React Native becomes ready")
                Log.e(TAG, "")
            }
        } catch (e: Exception) {
            Log.e(TAG, "")
            Log.e(TAG, "❌ ERROR in event send attempt ${attempt + 1}: ${e.message}")
            Log.e(TAG, "")
            e.printStackTrace()
            
            if (attempt < maxAttempts - 1) {
                Log.e(TAG, "🔄 Will retry due to error (attempt ${attempt + 2}/$maxAttempts)...")
                sendNightModeEventWithRetry(bedHour, bedMinute, fromAlarm, appWasKilled, attempt + 1)
            } else {
                Log.e(TAG, "")
                Log.e(TAG, "❌❌❌ FAILED: All retry attempts exhausted!")
                Log.e(TAG, "")
            }
        }
    }, delayMs)
}

/**
 * ✅ NEW: Handle Block Time intent from BlockTimeLockActivity
 */
private fun handleBlockTimeIntent(intent: Intent?) {
    val androidVersion = Build.VERSION.SDK_INT
    val androidRelease = Build.VERSION.RELEASE
    val deviceManufacturer = Build.MANUFACTURER
    val deviceModel = Build.MODEL
    val deviceBrand = Build.BRAND
    
    Log.e(TAG, "")
    Log.e(TAG, "⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰")
    Log.e(TAG, "⏰ MAINACTIVITY - handleBlockTimeIntent CALLED")
    Log.e(TAG, "⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰")
    Log.e(TAG, "")
    Log.e(TAG, "📱 DEVICE INFO:")
    Log.e(TAG, "   Manufacturer: $deviceManufacturer")
    Log.e(TAG, "   Brand: $deviceBrand")
    Log.e(TAG, "   Model: $deviceModel")
    Log.e(TAG, "   Android Version: $androidRelease (API $androidVersion)")
    Log.e(TAG, "")
    Log.e(TAG, "📦 INTENT INFO:")
    Log.e(TAG, "   Intent is null: ${intent == null}")
    
    if (intent != null) {
        Log.e(TAG, "   Intent action: ${intent.action}")
        Log.e(TAG, "   Has extras: ${intent.extras != null}")
        
        if (intent.extras != null) {
            Log.e(TAG, "   All extras:")
            for (key in intent.extras!!.keySet()) {
                Log.e(TAG, "      - $key = ${intent.extras!!.get(key)}")
            }
        }
    }
    Log.e(TAG, "")
    
    if (intent?.action == "TRIGGER_BLOCK_TIME") {
        Log.e(TAG, "✅ Action matches TRIGGER_BLOCK_TIME")
        
        val triggerBlockTime = intent.getBooleanExtra("trigger_block_time", true)
        val fromAlarm = intent.getBooleanExtra("from_alarm", false)
        val appWasKilled = intent.getBooleanExtra("app_was_killed", false)
        val fromLockScreen = intent.getBooleanExtra("from_lock_screen", false)
        
        Log.e(TAG, "")
        Log.e(TAG, "🎯 TRIGGER FLAGS:")
        Log.e(TAG, "   trigger_block_time: $triggerBlockTime")
        Log.e(TAG, "   from_alarm: $fromAlarm")
        Log.e(TAG, "   app_was_killed: $appWasKilled")
        Log.e(TAG, "   from_lock_screen: $fromLockScreen")
        Log.e(TAG, "")
        
        if (triggerBlockTime) {
            Log.e(TAG, "✅ triggerBlockTime is TRUE - Processing...")
            
            // Extract task data
            val taskId = intent.getStringExtra("task_id") ?: ""
            val taskTitle = intent.getStringExtra("task_title") ?: "Block Time Task"
            val taskDescription = intent.getStringExtra("task_description") ?: ""
            val evaluationType = intent.getStringExtra("evaluation_type") ?: "timer"
            val startTime = intent.getStringExtra("start_time") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val source = intent.getStringExtra("source") ?: "tasks"
            val taskDataJson = intent.getStringExtra("task_data") ?: "{}"

            Log.e(TAG, "")
            Log.e(TAG, "📋 TASK INFO:")
            Log.e(TAG, "   Task ID: $taskId")
            Log.e(TAG, "   Title: $taskTitle")
            Log.e(TAG, "   Type: $evaluationType")
            Log.e(TAG, "   Start Time: $startTime")
            Log.e(TAG, "   Source: $source")
            Log.e(TAG, "")

            // Store trigger data in SharedPreferences
            Log.e(TAG, "💾 Storing to SharedPreferences...")
            val blockTimePrefs = getSharedPreferences("BlockTimeTrigger", Context.MODE_PRIVATE)
            val editor = blockTimePrefs.edit()
            editor.putBoolean("should_trigger", true)
            editor.putBoolean("from_alarm", fromAlarm)
            editor.putBoolean("app_was_killed", appWasKilled)
            editor.putBoolean("from_lock_screen", fromLockScreen)
            editor.putString("task_id", taskId)
            editor.putString("task_title", taskTitle)
            editor.putString("task_description", taskDescription)
            editor.putString("evaluation_type", evaluationType)
            editor.putString("start_time", startTime)
            editor.putString("category", category)
            editor.putString("source", source)
            editor.putString("task_data", taskDataJson)
            editor.putLong("trigger_time", System.currentTimeMillis())
            val saved = editor.commit()
            
            Log.e(TAG, "💾 SharedPreferences save result: $saved")
            Log.e(TAG, "")

            // Verify it was saved
            Log.e(TAG, "✅ Verifying saved data...")
            val shouldTrigger = blockTimePrefs.getBoolean("should_trigger", false)
            val savedTaskId = blockTimePrefs.getString("task_id", "")
            val savedEvalType = blockTimePrefs.getString("evaluation_type", "")
            Log.e(TAG, "   should_trigger: $shouldTrigger")
            Log.e(TAG, "   task_id: $savedTaskId")
            Log.e(TAG, "   evaluation_type: $savedEvalType")
            Log.e(TAG, "")

            // Send event to React Native with retry logic
            Log.e(TAG, "📡 Attempting to send event to React Native...")
            sendBlockTimeEventWithRetry(
                taskId, taskTitle, taskDescription, evaluationType,
                startTime, category, source, taskDataJson,
                fromAlarm, fromLockScreen, appWasKilled, 0
            )
            
        } else {
            Log.e(TAG, "⚠️ triggerBlockTime is FALSE - Skipping processing")
        }
    } else {
        Log.e(TAG, "⚠️ Action does NOT match TRIGGER_BLOCK_TIME")
        Log.e(TAG, "   Expected: TRIGGER_BLOCK_TIME")
        Log.e(TAG, "   Got: ${intent?.action}")
    }
    
    Log.e(TAG, "")
    Log.e(TAG, "⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰")
    Log.e(TAG, "")
}

/**
 * ✅ ENHANCED: Send Block Time event with retry logic and complete task data logging
 */
private fun sendBlockTimeEventWithRetry(
    taskId: String,
    taskTitle: String,
    taskDescription: String,
    evaluationType: String,
    startTime: String,
    category: String,
    source: String,
    taskDataJson: String,
    fromAlarm: Boolean,
    fromLockScreen: Boolean,
    appWasKilled: Boolean,
    attempt: Int
) {
    val maxAttempts = 5
    val delayMs = when(attempt) {
        0 -> 500L
        1 -> 1000L
        2 -> 2000L
        3 -> 3000L
        else -> 5000L
    }

    Log.e(TAG, "⏳ Scheduling Block Time event send attempt ${attempt + 1}/$maxAttempts in ${delayMs}ms")

    Handler(Looper.getMainLooper()).postDelayed({
        try {
            Log.e(TAG, "")
            Log.e(TAG, "📡 BLOCK TIME EVENT SEND ATTEMPT ${attempt + 1}/$maxAttempts")
            Log.e(TAG, "")
            
            val reactContext = reactInstanceManager?.currentReactContext
            
            Log.e(TAG, "   reactInstanceManager: ${reactInstanceManager != null}")
            Log.e(TAG, "   reactContext: ${reactContext != null}")
            
            if (reactContext != null) {
                Log.e(TAG, "   ✅ React Native context is READY!")
                
                // ✅ CRITICAL: Log complete task data JSON for debugging
                Log.e(TAG, "")
                Log.e(TAG, "📦 COMPLETE TASK DATA JSON:")
                Log.e(TAG, "   Length: ${taskDataJson.length} characters")
                Log.e(TAG, "   Content preview (first 500 chars):")
                Log.e(TAG, "   ${taskDataJson.take(500)}")
                
                // ✅ NEW: Try to parse and log Pomodoro settings from JSON
                try {
                    val jsonObject = org.json.JSONObject(taskDataJson)
                    Log.e(TAG, "")
                    Log.e(TAG, "⏰ POMODORO SETTINGS IN TASK DATA:")
                    Log.e(TAG, "   focus_duration: ${jsonObject.optInt("focus_duration", -1)}")
                    Log.e(TAG, "   short_break_duration: ${jsonObject.optInt("short_break_duration", -1)}")
                    Log.e(TAG, "   long_break_duration: ${jsonObject.optInt("long_break_duration", -1)}")
                    Log.e(TAG, "   focus_sessions_per_round: ${jsonObject.optInt("focus_sessions_per_round", -1)}")
                    Log.e(TAG, "   auto_start_short_breaks: ${jsonObject.optBoolean("auto_start_short_breaks", false)}")
                    Log.e(TAG, "   auto_start_focus_sessions: ${jsonObject.optBoolean("auto_start_focus_sessions", false)}")
                    Log.e(TAG, "   pomodoro_duration: ${jsonObject.optInt("pomodoro_duration", -1)}")
                    
                    // Check if duration_data exists
                    if (jsonObject.has("duration_data")) {
                        val durationData = jsonObject.getJSONObject("duration_data")
                        Log.e(TAG, "   duration_data.totalMinutes: ${durationData.optInt("totalMinutes", -1)}")
                        Log.e(TAG, "   duration_data.hours: ${durationData.optInt("hours", -1)}")
                        Log.e(TAG, "   duration_data.minutes: ${durationData.optInt("minutes", -1)}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "   ⚠️ Could not parse task data JSON: ${e.message}")
                }
                Log.e(TAG, "")
                
                val params = Arguments.createMap().apply {
    putString("task_id", taskId)
    putString("task_title", taskTitle)
    putString("task_description", taskDescription)
    putString("evaluation_type", evaluationType)
    putString("start_time", startTime)
    putString("category", category)
    putString("source", source)
    putString("task_data", taskDataJson)
    putBoolean("from_alarm", fromAlarm)
    putBoolean("from_lock_screen", fromLockScreen)
    putBoolean("app_was_killed", appWasKilled)
    putDouble("timestamp", System.currentTimeMillis().toDouble())
    
    // ✅ CRITICAL FIX: Extract Pomodoro settings from JSON and add to params
    try {
        val jsonObject = org.json.JSONObject(taskDataJson)
        
        // Extract Pomodoro settings
        val focusDuration = jsonObject.optInt("focus_duration", -1)
        val shortBreak = jsonObject.optInt("short_break_duration", -1)
        val longBreak = jsonObject.optInt("long_break_duration", -1)
        val sessionsPerRound = jsonObject.optInt("focus_sessions_per_round", -1)
        val autoStartBreaks = jsonObject.optBoolean("auto_start_short_breaks", false)
        val autoStartFocus = jsonObject.optBoolean("auto_start_focus_sessions", false)
        val pomodoroDuration = jsonObject.optInt("pomodoro_duration", -1)
        
        Log.e(TAG, "⏰ Extracting Pomodoro settings to params:")
        Log.e(TAG, "   focus_duration: $focusDuration")
        Log.e(TAG, "   short_break: $shortBreak")
        Log.e(TAG, "   long_break: $longBreak")
        
        // Add to params
        if (focusDuration != -1) putInt("focus_duration", focusDuration)
        if (shortBreak != -1) putInt("short_break_duration", shortBreak)
        if (longBreak != -1) putInt("long_break_duration", longBreak)
        if (sessionsPerRound != -1) putInt("focus_sessions_per_round", sessionsPerRound)
        if (pomodoroDuration != -1) putInt("pomodoro_duration", pomodoroDuration)
        putBoolean("auto_start_short_breaks", autoStartBreaks)
        putBoolean("auto_start_focus_sessions", autoStartFocus)
        
        // Extract duration_data
        if (jsonObject.has("duration_data")) {
            val durationData = jsonObject.getJSONObject("duration_data")
            val totalMinutes = durationData.optInt("totalMinutes", -1)
            val hours = durationData.optInt("hours", -1)
            val minutes = durationData.optInt("minutes", -1)
            
            if (totalMinutes != -1) putInt("duration_total_minutes", totalMinutes)
            if (hours != -1) putInt("duration_hours", hours)
            if (minutes != -1) putInt("duration_minutes", minutes)
        }
        
        Log.e(TAG, "✅ Pomodoro settings added to params")
    } catch (e: Exception) {
        Log.e(TAG, "⚠️ Could not extract Pomodoro settings: ${e.message}")
    }
}

                Log.e(TAG, "")
                Log.e(TAG, "📤 Emitting TRIGGER_BLOCK_TIME event...")
                Log.e(TAG, "   Event data:")
                Log.e(TAG, "      task_id: $taskId")
                Log.e(TAG, "      task_title: $taskTitle")
                Log.e(TAG, "      evaluation_type: $evaluationType")
                Log.e(TAG, "      source: $source")
                Log.e(TAG, "      task_data length: ${taskDataJson.length} chars")

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("TRIGGER_BLOCK_TIME", params)
                
                Log.e(TAG, "")
                Log.e(TAG, "✅✅✅ BLOCK TIME EVENT SENT SUCCESSFULLY! ✅✅✅")
                Log.e(TAG, "")
                
                // Clear the SharedPreferences flag after successful send
                val blockTimePrefs = getSharedPreferences("BlockTimeTrigger", Context.MODE_PRIVATE)
                blockTimePrefs.edit().putBoolean("should_trigger", false).commit()
                
                Log.e(TAG, "🧹 Cleared 'should_trigger' flag from SharedPreferences")
                
            } else if (attempt < maxAttempts - 1) {
                Log.e(TAG, "   ⚠️ React Native context NOT ready yet")
                Log.e(TAG, "   🔄 Will retry (attempt ${attempt + 2}/$maxAttempts)...")
                sendBlockTimeEventWithRetry(
                    taskId, taskTitle, taskDescription, evaluationType,
                    startTime, category, source, taskDataJson,
                    fromAlarm, fromLockScreen, appWasKilled, attempt + 1
                )
            } else {
                Log.e(TAG, "")
                Log.e(TAG, "❌❌❌ FAILED: React Native context not ready after $maxAttempts attempts!")
                Log.e(TAG, "")
                Log.e(TAG, "💾 Block Time data is saved in SharedPreferences")
                Log.e(TAG, "   It will be checked when React Native becomes ready")
                Log.e(TAG, "")
            }
        } catch (e: Exception) {
            Log.e(TAG, "")
            Log.e(TAG, "❌ ERROR in Block Time event send attempt ${attempt + 1}: ${e.message}")
            Log.e(TAG, "")
            e.printStackTrace()
            
            if (attempt < maxAttempts - 1) {
                Log.e(TAG, "🔄 Will retry due to error (attempt ${attempt + 2}/$maxAttempts)...")
                sendBlockTimeEventWithRetry(
                    taskId, taskTitle, taskDescription, evaluationType,
                    startTime, category, source, taskDataJson,
                    fromAlarm, fromLockScreen, appWasKilled, attempt + 1
                )
            } else {
                Log.e(TAG, "")
                Log.e(TAG, "❌❌❌ FAILED: All retry attempts exhausted!")
                Log.e(TAG, "")
            }
        }
    }, delayMs)
}

    override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    Log.d(TAG, "========================================")
    Log.d(TAG, "MainActivity onCreate - UPDATED VERSION")
    Log.d(TAG, "========================================")
    
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    val closeFilter = IntentFilter("com.wingsfly.CLOSE_MAIN_ACTIVITY")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(closeReceiver, closeFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
        registerReceiver(closeReceiver, closeFilter)
    }

    handleNightModeIntent(intent)

    handleBlockTimeIntent(intent)
    
    val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
    val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
    val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
    val detoxUnlockedExtra = intent?.getBooleanExtra("detox_unlocked", false) ?: false
    
    // ✅ CRITICAL FIX: Check persistent unlock state with Long.MAX_VALUE support
    val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
    val isPersisentlyUnlocked = unlockedUntil == Long.MAX_VALUE || unlockedUntil > System.currentTimeMillis()
    
    Log.d(TAG, "🔍 Detox Status on Create:")
    Log.d(TAG, "  - Detox active (prefs): $detoxActive")
    Log.d(TAG, "  - Has time remaining: $hasTimeRemaining")
    Log.d(TAG, "  - Intent unlock flag: $detoxUnlockedExtra")
    Log.d(TAG, "  - Lock activity unlock flag: ${DigitalDetoxLockActivity.isAppUnlocked}")
    Log.d(TAG, "  - Persistent unlock until: $unlockedUntil")
    Log.d(TAG, "  - Is persistently unlocked: $isPersisentlyUnlocked")
    
    if (detoxActive && hasTimeRemaining) {
        // ✅ FIX: Check persistent unlock state OR intent flags
        if (!detoxUnlockedExtra && !DigitalDetoxLockActivity.isAppUnlocked && !isPersisentlyUnlocked) {
            Log.w(TAG, "🚨 MainActivity opened during detox WITHOUT unlock - triggering relock")
            hasScheduledRelock = true
            relockHandler.postDelayed({
                directRelockToDetoxActivity()
                finish()
            }, 100)
            return
        } else {
            Log.d(TAG, "✅ App unlocked - allowing access")
            isDetoxUnlocked = true
            DigitalDetoxLockActivity.isAppUnlocked = true
            DigitalDetoxLockActivity.isUnlockInProgress = false
            DigitalDetoxLockActivity.isHiddenForAppUnlock = true
            userInteractionTime = System.currentTimeMillis()
        }
    } else {
        Log.d(TAG, "✅ No active detox - normal app flow")
    }
    
    isActivityInitialized = true
    
    ensureServiceIsRunning()
    
    if (shouldProcessIntent(intent)) {
        Log.d(TAG, "Storing intent for later processing")
        pendingIntentData = intent
        hasProcessedIntent = false
    }
}
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)

        handleNightModeIntent(intent)

        handleBlockTimeIntent(intent)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onNewIntent")
        Log.d(TAG, "========================================")

        // ✅ ADD THIS: Handle floating button tap to open notes
    if (intent?.getBooleanExtra("openNotes", false) == true) {
        Log.d(TAG, "📝 Opening notes from floating button")
        
        // Send event to React Native to open notes
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                val reactContext = reactInstanceManager?.currentReactContext
                
                if (reactContext != null) {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        ?.emit("openNotesFromFloating", null)
                    Log.d(TAG, "✅ Notes open event sent")
                } else {
                    Log.e(TAG, "❌ React context not available")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error sending notes event: ${e.message}")
            }
        }, 300)
    }
        
        val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
        
        if (detoxActive && hasTimeRemaining) {
            val newUnlockStatus = intent?.getBooleanExtra("detox_unlocked", false) ?: false
            
            Log.d(TAG, "📱 New intent during active detox - unlock: $newUnlockStatus")
            
            if (newUnlockStatus) {
                isDetoxUnlocked = true
                DigitalDetoxLockActivity.isAppUnlocked = true
                DigitalDetoxLockActivity.isUnlockInProgress = false  // ✅ CLEAR unlock flag
                userInteractionTime = System.currentTimeMillis()
                hasScheduledRelock = false
                relockHandler.removeCallbacksAndMessages(null)
            } else if (!hasScheduledRelock) {
                Log.w(TAG, "🚨 New intent without unlock - relock")
                hasScheduledRelock = true
                directRelockToDetoxActivity()
                finish()
                return
            }
        }
        
        if (shouldProcessIntent(intent)) {
            pendingIntentData = intent
            hasProcessedIntent = false
        }
    }
    
   override fun onResume() {
    super.onResume()
    isUserInteracting = true
    userInteractionTime = System.currentTimeMillis()
    
    Log.d(TAG, "========================================")
    Log.d(TAG, "MainActivity onResume")
    Log.d(TAG, "Initialized: $isActivityInitialized")
    Log.d(TAG, "Detox unlocked: $isDetoxUnlocked")
    Log.d(TAG, "========================================")
    
    val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
    val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
    val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
    
    // ✅ CRITICAL FIX: Check persistent unlock state with Long.MAX_VALUE support
    val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
    val isPersisentlyUnlocked = unlockedUntil == Long.MAX_VALUE || unlockedUntil > System.currentTimeMillis()
    
    Log.d(TAG, "   Persistent unlock until: $unlockedUntil")
    Log.d(TAG, "   Is persistently unlocked: $isPersisentlyUnlocked")
    
    if (detoxActive && hasTimeRemaining) {
        if (!isDetoxUnlocked && !hasScheduledRelock && !isPersisentlyUnlocked) {
            Log.w(TAG, "🚨 Resumed during active detox WITHOUT unlock - relock")
            hasScheduledRelock = true
            directRelockToDetoxActivity()
            finish()
            return
        } else if (isDetoxUnlocked || isPersisentlyUnlocked) {
            Log.d(TAG, "✅ Resumed with valid unlock - DISABLING LOCK MONITORING")
            
            // Update unlock state
            isDetoxUnlocked = true
            
            hasScheduledRelock = false
            relockHandler.removeCallbacksAndMessages(null)
            
            DigitalDetoxLockActivity.isAppUnlocked = true
            DigitalDetoxLockActivity.isHiddenForAppUnlock = true
            
            window.decorView.post {
                window.decorView.visibility = android.view.View.VISIBLE
                window.decorView.requestFocus()
                window.decorView.bringToFront()
                isMainActivityVisible = true
                Log.d(TAG, "📱 MainActivity UI forced visible - monitoring disabled")
            }
        }
    } else {
        isMainActivityVisible = true
    }
    
    ensureServiceIsRunning()
    
    if (!serviceBound) {
        bindToService()
    }
    
    if (shouldProcessIntent(intent) && !hasProcessedIntent) {
        pendingIntentData = intent
    }
    
    processPendingIntent()
}
    
    override fun onPause() {
        super.onPause()
        isUserInteracting = false
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onPause")
        Log.d(TAG, "Is relocking: $isRelocking | Has scheduled: $hasScheduledRelock")
        Log.d(TAG, "========================================")
        
        // ✅ FIX: Don't relock if already in progress
        if (isRelocking || hasScheduledRelock) {
            Log.d(TAG, "⏭️ Skip relock - already in progress")
            return
        }
        
        val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
        val timeSinceInteraction = System.currentTimeMillis() - userInteractionTime
        
        // ✅ FIX: Only relock if user was actually using app for more than 2 seconds
        if (detoxActive && hasTimeRemaining && isDetoxUnlocked && timeSinceInteraction > 2000) {
            Log.d(TAG, "🚨 User leaving - scheduling relock")
            scheduleRelockIfNeeded()
        }
    }
    
    override fun onStop() {
        super.onStop()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onStop")
        Log.d(TAG, "========================================")
        
        if (isRelocking || hasScheduledRelock) {
            Log.d(TAG, "⏭️ Skip relock from onStop")
            return
        }
        
        val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
        val timeSinceInteraction = System.currentTimeMillis() - userInteractionTime
        
        if (detoxActive && hasTimeRemaining && isDetoxUnlocked && timeSinceInteraction > 2000) {
            Log.d(TAG, "⚠️ User left app during detox")
            scheduleRelockIfNeeded()
        }
    }
    
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onUserLeaveHint")
        Log.d(TAG, "========================================")
        
        if (isRelocking || hasScheduledRelock) {
            Log.d(TAG, "⏭️ Skip relock from userLeaveHint")
            return
        }
        
        val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
        
        if (detoxActive && hasTimeRemaining && isDetoxUnlocked) {
            Log.d(TAG, "🚨 User leaving app during detox")
            scheduleRelockIfNeeded()
        }
    }
    
    private fun scheduleRelockIfNeeded() {
        if (hasScheduledRelock || isRelocking) {
            Log.d(TAG, "⏭️ Relock already scheduled")
            return
        }
        
        hasScheduledRelock = true
        
        relockHandler.postDelayed({
            if (!isFinishing && !isDestroyed) {
                directRelockToDetoxActivity()
            }
        }, 500)
    }
    
    private fun directRelockToDetoxActivity() {
    if (isRelocking) {
        Log.d(TAG, "⏭️ Already relocking")
        return
    }
    
    try {
        isRelocking = true
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "⚡ DIRECT RELOCK TO DETOX ACTIVITY")
        Log.d(TAG, "========================================")
        
        // ✅ CRITICAL FIX: Set relock flag BEFORE clearing unlock state
        prefs.edit().apply {
            putBoolean("is_relocking", true)
            putLong("relock_started_at", System.currentTimeMillis())
        }.commit()
        
        Thread.sleep(50)
        
        // Clear unlock state
        prefs.edit().remove(KEY_APP_UNLOCKED_UNTIL).commit()
        
        isDetoxUnlocked = false
        DigitalDetoxLockActivity.isAppUnlocked = false
        DigitalDetoxLockActivity.isUnlockInProgress = false
        DigitalDetoxLockActivity.isHiddenForAppUnlock = false
        isMainActivityVisible = false
        
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val remainingMillis = detoxEndTime - System.currentTimeMillis()
        val remainingMinutes = (remainingMillis / 60000).toInt().coerceAtLeast(1)
        
        Log.d(TAG, "Remaining: ${remainingMillis}ms")
        
        // ✅ FIX: Don't kill the service - ensure it's running
        ensureDetoxServiceRunning()
        
        // ✅ FIX: Send broadcast to pause monitoring during transition
        val pauseIntent = Intent("com.wingsfly.PAUSE_MONITORING")
        sendBroadcast(pauseIntent)
        
        // ✅ CRITICAL FIX: Use moveTaskToBack instead of finish()
        // This minimizes the app WITHOUT killing it
        relockHandler.postDelayed({
            try {
                // Start lock activity WITHOUT killing MainActivity
                val intent = Intent(this, DigitalDetoxLockActivity::class.java)
                intent.putExtra("duration_minutes", remainingMinutes)
                intent.putExtra("from_relock", true)
                
                // ✅ CRITICAL: Use NEW_TASK + SINGLE_TOP (no CLEAR_TOP/CLEAR_TASK!)
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
                    // REMOVED: FLAG_ACTIVITY_CLEAR_TOP - this kills the app!
                    // REMOVED: FLAG_ACTIVITY_REORDER_TO_FRONT - can cause issues
                )
                
                startActivity(intent)
                
                // Wait for lock screen to appear
                relockHandler.postDelayed({
                    // Send relock broadcast to show lock screen
                    val relockIntent = Intent("com.wingsfly.RELOCK_DETOX")
                    sendBroadcast(relockIntent)
                    
                    // ✅ NEW: Move MainActivity to background instead of finish()
                    relockHandler.postDelayed({
                        // Move task to back WITHOUT killing it
                        moveTaskToBack(true)
                        
                        // Clear relock flags after background
                        prefs.edit().apply {
                            remove("is_relocking")
                            remove("relock_started_at")
                        }.commit()
                        
                        // Resume monitoring
                        val resumeIntent = Intent("com.wingsfly.RESUME_MONITORING")
                        sendBroadcast(resumeIntent)
                        
                        isRelocking = false
                        hasScheduledRelock = false
                        
                        Log.d(TAG, "✅ Relock complete - MainActivity in background (NOT killed)")
                    }, 500)
                }, 300)
                
                Log.d(TAG, "✅ Direct relock initiated")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error starting lock: ${e.message}")
                prefs.edit().apply {
                    remove("is_relocking")
                    remove("relock_started_at")
                }.commit()
                isRelocking = false
                hasScheduledRelock = false
            }
        }, 200)
        
    } catch (e: Exception) {
        Log.e(TAG, "❌ Error in direct relock: ${e.message}")
        prefs.edit().apply {
            remove("is_relocking")
            remove("relock_started_at")
        }.commit()
        isRelocking = false
        hasScheduledRelock = false
    }
}
    
    private fun ensureDetoxServiceRunning() {
        try {
            val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
            val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
            val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
            
            if (detoxActive && hasTimeRemaining) {
                if (!isDetoxServiceRunning()) {
                    Log.d(TAG, "🔄 Restarting DetoxService")
                    
                    val serviceIntent = Intent(this, DigitalDetoxService::class.java)
                    val remainingMinutes = ((detoxEndTime - System.currentTimeMillis()) / 60000).toInt()
                    serviceIntent.putExtra("duration_minutes", remainingMinutes)
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error ensuring detox service: ${e.message}")
        }
    }
    
    private fun isDetoxServiceRunning(): Boolean {
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            for (serviceInfo in runningServices) {
                if (DigitalDetoxService::class.java.name == serviceInfo.service.className) {
                    return true
                }
            }
            return false
        } catch (e: Exception) {
            return false
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            USAGE_ACCESS_REQUEST_CODE -> {
                if (hasUsageAccessPermission()) {
                    Log.d(TAG, "Usage access permission granted")
                    checkAndRequestPermissions()
                } else {
                    Toast.makeText(this, "Usage Access permission is required", Toast.LENGTH_LONG).show()
                    GlobalScope.launch {
                        delay(2000)
                        runOnUiThread {
                            checkAndRequestPermissions()
                        }
                    }
                }
            }
            
            OVERLAY_PERMISSION_REQUEST_CODE -> {
                if (hasOverlayPermission()) {
                    Log.d(TAG, "Overlay permission granted")
                    ensureServiceIsRunning()
                } else {
                    Toast.makeText(this, "Overlay permission is required", Toast.LENGTH_LONG).show()
                    GlobalScope.launch {
                        delay(2000)
                        runOnUiThread {
                            checkAndRequestPermissions()
                        }
                    }
                }
            }
        }
    }
    
    private fun shouldProcessIntent(intent: Intent?): Boolean {
        return intent != null && (
            intent.action == "OPEN_POMO_TRACKER" || 
            intent.action == "OPEN_EDIT_PLAN_TIMER_TRACKER" ||
            intent.action == "OPEN_EDIT_PLAN" ||
            intent.hasExtra("planId")
        )
    }
    
    private fun processPendingIntent() {
        if (pendingIntentData == null || hasProcessedIntent) {
            Log.d(TAG, "No pending intent to process")
            return
        }
        
        val intentData = pendingIntentData
        val action = intentData?.action
        
        Log.d(TAG, "Processing pending intent with action: $action")
        
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                val reactContext = reactInstanceManager?.currentReactContext
                if (reactContext != null) {
                    Log.d(TAG, "React Native is ready, processing intent")
                    
                    when (action) {
                        "OPEN_POMO_TRACKER" -> handlePomoTrackerIntent(intentData)
                        "OPEN_EDIT_PLAN_TIMER_TRACKER" -> handleEditPlanTimerTrackerIntent(intentData)
                        "OPEN_EDIT_PLAN" -> handleEditPlanIntent(intentData)
                        else -> {
                            if (intentData?.hasExtra("planId") == true) {
                                handlePomoTrackerIntent(intentData)
                            }
                        }
                    }
                    
                    hasProcessedIntent = true
                    pendingIntentData = null
                } else {
                    Log.d(TAG, "React Native not ready, retrying...")
                    Handler(Looper.getMainLooper()).postDelayed({
                        processPendingIntent()
                    }, 2000)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing pending intent", e)
            }
        }, 1500)
    }
    
    private fun handlePomoTrackerIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""

            if (planId == null || taskTitle == null) return

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_POMO_TRACKER", params)

            Log.d(TAG, "POMO event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending POMO event", e)
        }
    }
    
    private fun handleEditPlanTimerTrackerIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val evaluationType = intent.getStringExtra("evaluationType") ?: "timerTracker"
            val fromReschedule = intent.getBooleanExtra("fromReschedule", false)

            if (planId == null) return

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)
            params.putString("evaluationType", evaluationType)
            params.putBoolean("fromReschedule", fromReschedule)
            params.putString("screen", "EditPlanTimerTrackerScreen")

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_EDIT_SCREEN", params)

            Log.d(TAG, "Edit timer tracker event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending edit timer tracker event", e)
        }
    }
    
    private fun handleEditPlanIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val evaluationType = intent.getStringExtra("evaluationType") ?: "yesNo"
            val fromReschedule = intent.getBooleanExtra("fromReschedule", false)

            if (planId == null) return

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)
            params.putString("evaluationType", evaluationType)
            params.putBoolean("fromReschedule", fromReschedule)
            params.putString("screen", "EditPlanScreen")

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_EDIT_SCREEN", params)

            Log.d(TAG, "Edit plan event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending edit plan event", e)
        }
    }
    
    override fun onDestroy() {
    Log.d(TAG, "========================================")
    Log.d(TAG, "MainActivity onDestroy")
    Log.d(TAG, "Is finishing: $isFinishing")
    Log.d(TAG, "Is relocking: $isRelocking")
    Log.d(TAG, "========================================")
    
    // ✅ If we're just being moved to background during relock, don't clean up
    if (isRelocking && !isFinishing) {
        Log.d(TAG, "⏭️ Being moved to background during relock - minimal cleanup")
        isMainActivityVisible = false
        try {
            if (serviceBound) {
                unbindService(serviceConnection)
                serviceBound = false
            }
        } catch (e: Exception) { }
        super.onDestroy()
        return
    }
    
    // Normal cleanup
    isMainActivityVisible = false
    
    try {
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
        
        unregisterReceiver(closeReceiver)
    } catch (e: Exception) {
        Log.e(TAG, "Error in onDestroy: ${e.message}", e)
    }
    
    relockHandler.removeCallbacksAndMessages(null)
    isRelocking = false
    hasScheduledRelock = false
    isActivityInitialized = false
    
    super.onDestroy()
}
    
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        
        if (hasFocus && isDetoxUnlocked) {
            try {
                val focusIntent = Intent("com.wingsfly.MAINACTIVITY_FOCUSED")
                sendBroadcast(focusIntent)
                Log.d(TAG, "📱 MainActivity gained focus - notified service")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending focus broadcast: ${e.message}")
            }
        }
    }
    
    override fun onBackPressed() {
        if (YouTubeNightModeModule.isLockActive) {
        Log.d(TAG, "🚫 Back button blocked - Night Mode is locked")
        return
    }

        val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val hasTimeRemaining = detoxEndTime > System.currentTimeMillis()
        
        if (detoxActive && hasTimeRemaining && isDetoxUnlocked) {
            Log.d(TAG, "🚨 Back pressed during detox - schedule relock")
            scheduleRelockIfNeeded()
            return
        }
        
        super.onBackPressed()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    // Check if YouTube Night Mode lock is active
    if (YouTubeNightModeModule.isLockActive) {
        Log.d(TAG, "🚫 Key event blocked - Night Mode is locked: $keyCode")
        
        // Block all navigation keys when Night Mode is locked
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_APP_SWITCH,
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_RECENT_APPS -> {
                // Block these keys completely
                true
            }
            else -> {
                // Allow other keys (volume, etc.)
                super.onKeyDown(keyCode, event)
            }
        }
    }
    
    // Normal behavior when not locked
    return super.onKeyDown(keyCode, event)
}
    
    private fun checkAndRequestPermissions() {
        if (!hasUsageAccessPermission()) {
            requestUsageAccessPermission()
            return
        }
        
        if (!hasOverlayPermission()) {
            requestOverlayPermission()
            return
        }
        
        Log.d(TAG, "All permissions granted")
    }
    
    private fun hasUsageAccessPermission(): Boolean {
        try {
            val appOpsManager = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOpsManager.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
            return mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            Log.e(TAG, "Error checking usage access permission: ${e.message}", e)
            return false
        }
    }
    
    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }
    
    private fun requestUsageAccessPermission() {
        try {
            Toast.makeText(this, "Please grant Usage Access permission", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting usage access permission: ${e.message}", e)
        }
    }
    
    private fun requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Toast.makeText(this, "Please grant Overlay permission", Toast.LENGTH_LONG).show()
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                intent.data = Uri.parse("package:$packageName")
                startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
        }
    }
    
    private fun ensureServiceIsRunning() {
        try {
            if (!hasAllPermissions()) {
                Log.d(TAG, "Not all permissions granted")
                return
            }
            
            if (!isServiceRunning()) {
                Log.d(TAG, "Service not running, starting it")
                startAppLockService()
            } else {
                Log.d(TAG, "Service is already running")
                if (!serviceBound) {
                    bindToService()
                }
                refreshServiceNotification()
            }
            
            AppLockService.scheduleServiceAlarm(this)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error ensuring service is running: ${e.message}", e)
        }
    }
    
    private fun hasAllPermissions(): Boolean {
        return hasUsageAccessPermission() && hasOverlayPermission()
    }
    
    private fun isServiceRunning(): Boolean {
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            for (serviceInfo in runningServices) {
                if (AppLockService::class.java.name == serviceInfo.service.className) {
                    return true
                }
            }
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if service is running: ${e.message}", e)
            return false
        }
    }
    
    private fun startAppLockService() {
        try {
            val serviceIntent = Intent(this, AppLockService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            
            Log.d(TAG, "AppLockService start requested")
            
            GlobalScope.launch {
                delay(1000)
                runOnUiThread {
                    bindToService()
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting AppLockService: ${e.message}", e)
        }
    }
    
    private fun bindToService() {
        try {
            if (!serviceBound) {
                val serviceIntent = Intent(this, AppLockService::class.java)
                bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)
                Log.d(TAG, "Attempting to bind to service")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error binding to service: ${e.message}", e)
        }
    }
    
    private fun refreshServiceNotification() {
        try {
            val serviceIntent = Intent(this, AppLockService::class.java)
            serviceIntent.putExtra("refresh_notification", true)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            
            Log.d(TAG, "Service notification refresh requested")
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing service notification: ${e.message}", e)
        }
    }
    
    fun checkAndBlockApp(packageName: String) {
        appLockService?.checkAndBlockApp(packageName)
    }
    
    fun ensureServiceVisibility() {
        ensureServiceIsRunning()
        refreshServiceNotification()
    }
}