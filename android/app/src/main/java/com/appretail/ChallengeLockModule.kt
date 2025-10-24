package com.wingsfly

import android.content.Intent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.text.SimpleDateFormat
import java.util.*

class ChallengeLockModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
        
    companion object {
        private const val TAG = "ChallengeLockModule"
    }
    
    // Receiver for challenge completion
    private val challengeCompletionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.wingsfly.CHALLENGE_COMPLETED") {
                val challengeId = intent.getStringExtra("challenge_id")
                val userId = intent.getStringExtra("user_id")
                val dayNumber = intent.getIntExtra("day_number", 0)
                val completed = intent.getBooleanExtra("completed", false)
                val videoCompleted = intent.getBooleanExtra("video_completed", false)
                val hoursCompleted = intent.getDoubleExtra("hours_completed", 0.0)
                
                android.util.Log.d(TAG, "📢 Challenge completion broadcast received:")
                android.util.Log.d(TAG, "   Challenge ID: $challengeId")
                android.util.Log.d(TAG, "   User ID: $userId")
                android.util.Log.d(TAG, "   Day Number: $dayNumber")
                android.util.Log.d(TAG, "   Fully Completed: $completed")
                android.util.Log.d(TAG, "   Video Completed: $videoCompleted")
                android.util.Log.d(TAG, "   🎯 Hours Completed: $hoursCompleted")
                
                sendChallengeCompletionEvent(
                    challengeId,
                    userId,
                    dayNumber,
                    completed,
                    videoCompleted,
                    hoursCompleted
                )
            }
        }
    }
    
    // Receiver for real-time completion updates (during challenge)
    private val challengeUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.wingsfly.CHALLENGE_COMPLETION_UPDATE") {
                val challengeId = intent.getStringExtra("challenge_id")
                val userId = intent.getStringExtra("user_id")
                val dayNumber = intent.getIntExtra("day_number", 0)
                val hoursCompleted = intent.getDoubleExtra("hours_completed", 0.0)
                val videoCompleted = intent.getBooleanExtra("video_completed", false)
                val completedDate = intent.getStringExtra("completed_date")
                val isFullyCompleted = intent.getBooleanExtra("is_fully_completed", false)
                
                android.util.Log.d(TAG, "📊 Completion update broadcast received:")
                android.util.Log.d(TAG, "   Challenge ID: $challengeId")
                android.util.Log.d(TAG, "   User ID: $userId")
                android.util.Log.d(TAG, "   Day Number: $dayNumber")
                android.util.Log.d(TAG, "   Hours: $hoursCompleted")
                android.util.Log.d(TAG, "   Video: $videoCompleted")
                android.util.Log.d(TAG, "   Date: $completedDate")
                android.util.Log.d(TAG, "   Fully Completed: $isFullyCompleted")
                
                sendCompletionUpdateEvent(
                    challengeId,
                    userId,
                    dayNumber,
                    hoursCompleted,
                    videoCompleted,
                    completedDate,
                    isFullyCompleted
                )
            }
        }
    }
    
    init {
        // Register completion receiver
        val completionFilter = IntentFilter("com.wingsfly.CHALLENGE_COMPLETED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(challengeCompletionReceiver, completionFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(challengeCompletionReceiver, completionFilter)
        }
        
        // Register update receiver
        val updateFilter = IntentFilter("com.wingsfly.CHALLENGE_COMPLETION_UPDATE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(challengeUpdateReceiver, updateFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(challengeUpdateReceiver, updateFilter)
        }
        
        android.util.Log.d(TAG, "✅ ChallengeLockModule initialized with receivers")
    }
    
    override fun getName(): String {
        return "ChallengeLockModule"
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }
    
    // Send final challenge completion event
    private fun sendChallengeCompletionEvent(
        challengeId: String?,
        userId: String?,
        dayNumber: Int,
        completed: Boolean,
        videoCompleted: Boolean,
        hoursCompleted: Double
    ) {
        val params: WritableMap = Arguments.createMap()
        params.putString("challengeId", challengeId)
        params.putString("userId", userId)
        params.putInt("dayNumber", dayNumber)
        params.putBoolean("completed", completed)
        params.putBoolean("videoCompleted", videoCompleted)
        params.putDouble("hoursCompleted", hoursCompleted)
        
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onChallengeCompleted", params)
            
        android.util.Log.d(TAG, "✅ Sent onChallengeCompleted event to React Native")
    }
    
    // Send real-time completion update event
    private fun sendCompletionUpdateEvent(
        challengeId: String?,
        userId: String?,
        dayNumber: Int,
        hoursCompleted: Double,
        videoCompleted: Boolean,
        completedDate: String?,
        isFullyCompleted: Boolean
    ) {
        val params: WritableMap = Arguments.createMap()
        params.putString("challengeId", challengeId)
        params.putString("userId", userId)
        params.putInt("dayNumber", dayNumber)
        params.putDouble("hoursCompleted", hoursCompleted)
        params.putBoolean("videoCompleted", videoCompleted)
        params.putString("completedDate", completedDate)
        params.putBoolean("isFullyCompleted", isFullyCompleted)
        
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onChallengeCompletionUpdate", params)
            
        android.util.Log.d(TAG, "✅ Sent onChallengeCompletionUpdate event to React Native")
    }
    
    @ReactMethod
    fun startChallengeLock(challengeData: ReadableMap, promise: Promise) {
        try {
            val currentActivity = currentActivity
                        
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available")
                return
            }
            
            // Get duration from React Native
            val durationMinutes = if (challengeData.hasKey("durationMinutes")) {
                challengeData.getInt("durationMinutes")
            } else {
                60 // Default 1 hour
            }
            
            // Get day number
            val dayNumber = if (challengeData.hasKey("dayNumber")) {
                challengeData.getInt("dayNumber")
            } else {
                1 // Default day 1
            }
            
            // ✅ GET HOURS PER DAY FROM CHALLENGE DATA
            val hoursPerDay = if (challengeData.hasKey("hoursPerDay")) {
                challengeData.getDouble("hoursPerDay")
            } else {
                1.0 // Default 1 hour
            }
            
            // Get user ID
            val userId = if (challengeData.hasKey("userId")) {
                challengeData.getString("userId")
            } else {
                null
            }
            
            // Calculate end time
            val startTime = Calendar.getInstance()
            val endTimeCalendar = Calendar.getInstance()
            endTimeCalendar.add(Calendar.MINUTE, durationMinutes)
            
            val endTimeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            val endTime = endTimeFormat.format(endTimeCalendar.time)
            
            android.util.Log.d(TAG, "========================================")
            android.util.Log.d(TAG, "⏱️ Challenge Lock Starting")
            android.util.Log.d(TAG, "▶️  Start time: ${SimpleDateFormat("h:mm:ss a", Locale.getDefault()).format(startTime.time)}")
            android.util.Log.d(TAG, "⏳ Duration: $durationMinutes minutes")
            android.util.Log.d(TAG, "🏁 End time: $endTime")
            android.util.Log.d(TAG, "📅 Day Number: $dayNumber")
            android.util.Log.d(TAG, "🎯 Hours Per Day: $hoursPerDay")
            android.util.Log.d(TAG, "👤 User ID: $userId")
            
            // Check for video source
            val hasVideoPath = challengeData.hasKey("videoPath") && !challengeData.getString("videoPath").isNullOrEmpty()
            val hasYoutubeLink = challengeData.hasKey("youtubeLink") && !challengeData.getString("youtubeLink").isNullOrEmpty()
            
            android.util.Log.d(TAG, "📹 Has video path: $hasVideoPath")
            android.util.Log.d(TAG, "📺 Has YouTube link: $hasYoutubeLink")
            
            if (hasYoutubeLink) {
                android.util.Log.d(TAG, "🔗 YouTube link: ${challengeData.getString("youtubeLink")}")
            } else if (hasVideoPath) {
                android.util.Log.d(TAG, "📁 Video path: ${challengeData.getString("videoPath")}")
            }
            android.util.Log.d(TAG, "========================================")
                        
            val intent = Intent(reactApplicationContext, ChallengeLockActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            
                putExtra("challenge_id", challengeData.getString("challengeId"))
                putExtra("challenge_name", challengeData.getString("challengeName"))
                putExtra("category", challengeData.getString("category"))
                putExtra("duration_minutes", durationMinutes)
                putExtra("day_number", dayNumber)
                putExtra("user_id", userId)
                putExtra("hours_per_day", hoursPerDay) 
                
                // Pass either video path or YouTube link
                if (hasVideoPath) {
                    putExtra("video_path", challengeData.getString("videoPath"))
                }
                
                if (hasYoutubeLink) {
                    putExtra("youtube_link", challengeData.getString("youtubeLink"))
                }
                
                if (challengeData.hasKey("slotNumber")) {
                    putExtra("slot_number", challengeData.getInt("slotNumber"))
                }
            }
            
            android.util.Log.d(TAG, "✅ Starting ChallengeLockActivity")
            android.util.Log.d(TAG, "   Challenge ID: ${challengeData.getString("challengeId")}")
            android.util.Log.d(TAG, "   Duration: $durationMinutes minutes")
            android.util.Log.d(TAG, "   Day Number: $dayNumber")
            android.util.Log.d(TAG, "   Hours Per Day: $hoursPerDay")
                        
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
                    
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Error starting challenge: ${e.message}", e)
            promise.reject("START_ERROR", "Failed to start challenge: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopChallengeLock(promise: Promise) {
        try {
            val intent = Intent("com.wingsfly.STOP_CHALLENGE")
            reactApplicationContext.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop challenge: ${e.message}")
        }
    }
    
    @ReactMethod
    fun isChallengeLockActive(promise: Promise) {
        try {
            promise.resolve(ChallengeLockActivity.isLockActive)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check lock status: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getChallengeStatus(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                "ChallengePrefs",
                ReactApplicationContext.MODE_PRIVATE
            )
                        
            val status = Arguments.createMap()
            status.putBoolean("isActive", prefs.getBoolean("challenge_active", false))
            status.putString("challengeId", prefs.getString("challenge_id", null))
            status.putString("videoPath", prefs.getString("video_path", null))
            status.putString("youtubeLink", prefs.getString("youtube_link", null))
            status.putString("userId", prefs.getString("user_id", null))
            status.putInt("dayNumber", prefs.getInt("current_day_number", 1))
                        
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get challenge status: ${e.message}")
        }
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            reactContext.unregisterReceiver(challengeCompletionReceiver)
            reactContext.unregisterReceiver(challengeUpdateReceiver)
            android.util.Log.d(TAG, "✅ Receivers unregistered")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error unregistering receivers: ${e.message}")
        }
    }
}