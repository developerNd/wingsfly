package com.wingsfly.notification

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.util.Log
import com.wingsfly.MainActivity
import com.wingsfly.R
import kotlin.random.Random

/**
 * Unified Notification Manager - Single source of truth for all notifications
 * Manages App Lock, Pomodoro, and Usage Limit notifications in one place
 */
class UnifiedNotificationManager private constructor(private val context: Context) {
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
    
    private val notificationManager: NotificationManager = 
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    
    private val channelId = "UnifiedAppLockChannel"
    private val notificationId = 1000
    
    // Rate limiting - 30 minutes
    private val rateLimitInterval = 30 * 60 * 1000L
    private val maxNotificationsPerInterval = 1
    private var notificationTimestamps = mutableListOf<Long>()
    
    companion object {
        private const val TAG = "UnifiedNotificationMgr"
        
        @Volatile
        private var instance: UnifiedNotificationManager? = null
        
        fun getInstance(context: Context): UnifiedNotificationManager {
            return instance ?: synchronized(this) {
                instance ?: UnifiedNotificationManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
    
    init {
        loadNotificationTimestamps()
        ensureNotificationChannel()
    }
    
    // ============ PUBLIC API ============
    
    /**
     * Update notification based on current state
     * @param bypassRateLimit true for Pomodoro state changes, false for periodic updates
     */
    fun updateNotification(bypassRateLimit: Boolean = false) {
        try {
            Log.d(TAG, "updateNotification - bypass: $bypassRateLimit")
            
            // Check rate limiting for non-critical updates
            if (!bypassRateLimit && !canShowNotification()) {
                Log.d(TAG, "Rate limited - skipping update")
                return
            }
            
            // Get current state
            val state = getCurrentState()
            
            // Generate notification content
            val title = generateTitle(state)
            val text = generateText(state)
            
            // Build and show notification
            val notification = buildNotification(title, text)
            notificationManager.notify(notificationId, notification)
            
            // Record timestamp only if not bypassed
            if (!bypassRateLimit) {
                recordNotificationTimestamp()
            }
            
            Log.d(TAG, "Notification updated - Title: $title")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification: ${e.message}", e)
        }
    }
    
    /**
     * Show foreground notification for a service
     * @param service The service that needs foreground notification
     */
    fun showForegroundNotification(service: Service): Notification {
        ensureNotificationChannel()
        val state = getCurrentState()
        val title = generateTitle(state)
        val text = generateText(state)
        return buildNotification(title, text)
    }
    
    /**
     * Notify that Pomodoro state changed (bypass rate limit)
     */
    fun onPomodoroStateChanged() {
        Log.d(TAG, "Pomodoro state changed - immediate update")
        updateNotification(bypassRateLimit = true)
    }
    
    /**
     * Notify that usage limits changed
     */
    fun onUsageLimitsChanged() {
        Log.d(TAG, "Usage limits changed")
        updateNotification(bypassRateLimit = true)
    }
    
    /**
     * Notify that app lock state changed
     */
    fun onAppLockStateChanged() {
        Log.d(TAG, "App lock state changed")
        updateNotification(bypassRateLimit = false)
    }
    
    // ============ STATE DETECTION ============
    
    private data class NotificationState(
        val isPomodoroActive: Boolean = false,
        val isPomodoroEnabled: Boolean = false,
        val isPaused: Boolean = false,
        val hasUsageLimits: Boolean = false,
        val hasLockedApps: Boolean = false,
        val excludedAppsCount: Int = 0,
        val userName: String = "WingsFly"
    )
    
    private fun getCurrentState(): NotificationState {
        val pomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
        val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
        val isPomodoroActive = pomodoroMode && !isPaused
        
        val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
        
        val hasUsageLimits = checkHasUsageLimits()
        val hasLockedApps = checkHasLockedApps()
        val userName = getUserName()
        
        return NotificationState(
            isPomodoroActive = isPomodoroActive,
            isPomodoroEnabled = pomodoroMode,
            isPaused = isPaused,
            hasUsageLimits = hasUsageLimits,
            hasLockedApps = hasLockedApps,
            excludedAppsCount = excludedApps.size,
            userName = userName
        )
    }
    
    private fun checkHasUsageLimits(): Boolean {
        val allPrefs = sharedPreferences.all
        for ((key, value) in allPrefs) {
            if (key.startsWith("usage_limit_") && value is Long && value > 0) {
                return true
            }
        }
        return false
    }
    
    private fun checkHasLockedApps(): Boolean {
        val lockedApps = sharedPreferences.getStringSet("locked_apps", setOf()) ?: setOf()
        return lockedApps.isNotEmpty()
    }
    
    private fun getUserName(): String {
        val isLoggedIn = sharedPreferences.getBoolean("user_logged_in", false)
        
        if (!isLoggedIn) {
            return "WingsFly"
        }
        
        return sharedPreferences.getString("display_name", null)
            ?: sharedPreferences.getString("username", null)
            ?: sharedPreferences.getString("user_name", null)
            ?: sharedPreferences.getString("user_metadata_display_name", null)
            ?: sharedPreferences.getString("user_metadata_username", null)
            ?: "WingsFly"
    }
    
    // ============ CONTENT GENERATION ============
    
    private fun generateTitle(state: NotificationState): String {
        val icon = when {
            // Priority 1: Pomodoro active
            state.isPomodoroActive -> "⏰"
            
            // Priority 2: Usage limits set
            state.hasUsageLimits -> "🔒⏳"
            
            // Priority 3: App lock active (default)
            else -> "🔒"
        }
        
        return "${state.userName} $icon"
    }
    
    private fun generateText(state: NotificationState): String {
        val quote = getMotivationalQuote()
        
        return when {
            // Active Pomodoro
            state.isPomodoroActive -> {
                if (state.excludedAppsCount > 0) {
                    "$quote • ${state.excludedAppsCount} apps allowed"
                } else {
                    quote
                }
            }
            
            // Paused Pomodoro
            state.isPaused -> {
                "$quote • Paused"
            }
            
            // Usage limits active
            state.hasUsageLimits -> {
                val count = getActiveUsageLimitsCount()
                "$quote"
            }
            
            // Default app lock message
            else -> {
                quote
            }
        }
    }
    
    private fun getActiveUsageLimitsCount(): Int {
        var count = 0
        val allPrefs = sharedPreferences.all
        for ((key, value) in allPrefs) {
            if (key.startsWith("usage_limit_") && value is Long && value > 0) {
                count++
            }
        }
        return count
    }
    
    private fun getMotivationalQuote(): String {
        val quotes = arrayOf(
            "🌟 Stay focused, success is within reach.",
            "💪 Small steps today, big success tomorrow.",
            "🚀 Progress, not perfection—keep going!",
            "🔥 You're stronger than your excuses—act now!",
            "🌱 Consistency wins—show up daily.",
            "✨ Believe in yourself, the rest will follow.",
            "🕒 Use this moment wisely—it won't come back.",
            "🏆 Discipline today brings freedom tomorrow.",
            "🌄 Each day is a fresh chance to grow.",
            "⚡ Today's effort shapes tomorrow's success."
        )
        return quotes[Random.nextInt(quotes.size)]
    }
    
    // ============ NOTIFICATION BUILDING ============
    
    private fun buildNotification(title: String, text: String): Notification {
        ensureNotificationChannel()
        
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, channelId)
        } else {
            Notification.Builder(context).apply {
                setSound(getCustomNotificationSound())
                setPriority(Notification.PRIORITY_MAX)
            }
        }
        
        builder.apply {
            setContentTitle(title)
            setContentText(text)
            setSmallIcon(R.drawable.app_logo)
            setOngoing(true)
            setWhen(System.currentTimeMillis())
            setCategory(Notification.CATEGORY_SERVICE)
            setVisibility(Notification.VISIBILITY_PUBLIC)
            setAutoCancel(false)
            
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            setContentIntent(pendingIntent)
        }
        
        return builder.build()
    }
    
    // ============ CHANNEL MANAGEMENT ============
    
    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val existingChannel = notificationManager.getNotificationChannel(channelId)
                val customSound = getCustomNotificationSound()
                
                val needsRecreation = existingChannel == null || 
                    existingChannel.importance < NotificationManager.IMPORTANCE_HIGH ||
                    existingChannel.sound != customSound
                
                if (needsRecreation) {
                    // Delete old channel if exists
                    existingChannel?.let {
                        Log.d(TAG, "Deleting old channel to recreate with custom sound")
                        notificationManager.deleteNotificationChannel(channelId)
                    }
                    
                    // Create new channel with custom sound
                    val audioAttributes = AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build()
                    
                    val channel = NotificationChannel(
                        channelId,
                        "WingsFly Service",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "App Lock, Pomodoro & Usage monitoring"
                        setShowBadge(false)
                        enableLights(false)
                        enableVibration(false)
                        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                        setSound(customSound, audioAttributes)
                    }
                    
                    notificationManager.createNotificationChannel(channel)
                    Log.d(TAG, "Created notification channel with custom sound")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error ensuring channel: ${e.message}", e)
            }
        }
    }
    
    private fun getCustomNotificationSound(): Uri {
        return try {
            Uri.parse("android.resource://${context.packageName}/${R.raw.noti}")
        } catch (e: Exception) {
            Log.e(TAG, "Error creating custom sound URI: ${e.message}", e)
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        }
    }
    
    // ============ RATE LIMITING ============
    
    private fun loadNotificationTimestamps() {
        try {
            val timestampsString = sharedPreferences.getString("unified_notification_timestamps", "")
            if (!timestampsString.isNullOrEmpty()) {
                val timestamps = timestampsString.split(",").mapNotNull { it.toLongOrNull() }
                notificationTimestamps = timestamps.toMutableList()
                cleanOldTimestamps()
            }
            Log.d(TAG, "Loaded ${notificationTimestamps.size} timestamps")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading timestamps: ${e.message}", e)
            notificationTimestamps = mutableListOf()
        }
    }
    
    private fun saveNotificationTimestamps() {
        try {
            val timestampsString = notificationTimestamps.joinToString(",")
            sharedPreferences.edit()
                .putString("unified_notification_timestamps", timestampsString)
                .apply()
            Log.d(TAG, "Saved ${notificationTimestamps.size} timestamps")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving timestamps: ${e.message}", e)
        }
    }
    
    private fun cleanOldTimestamps() {
        val currentTime = System.currentTimeMillis()
        val cutoffTime = currentTime - rateLimitInterval
        
        val oldSize = notificationTimestamps.size
        notificationTimestamps.removeAll { it < cutoffTime }
        
        if (notificationTimestamps.size != oldSize) {
            Log.d(TAG, "Cleaned timestamps: $oldSize -> ${notificationTimestamps.size}")
            saveNotificationTimestamps()
        }
    }
    
    private fun canShowNotification(): Boolean {
        cleanOldTimestamps()
        val canShow = notificationTimestamps.size < maxNotificationsPerInterval
        Log.d(TAG, "Can show: $canShow (${notificationTimestamps.size}/$maxNotificationsPerInterval)")
        return canShow
    }
    
    private fun recordNotificationTimestamp() {
        val currentTime = System.currentTimeMillis()
        notificationTimestamps.add(currentTime)
        saveNotificationTimestamps()
        Log.d(TAG, "Recorded timestamp. Total: ${notificationTimestamps.size}")
    }
}