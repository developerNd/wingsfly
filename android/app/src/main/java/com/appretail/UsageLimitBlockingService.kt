package com.wingsfly

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.content.pm.ServiceInfo
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import kotlinx.coroutines.*
import java.util.Calendar
import java.util.concurrent.ConcurrentHashMap

class UsageLimitBlockingService : Service() {
    private lateinit var windowManager: WindowManager
    private var usageLimitLockView: View? = null
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var sharedPreferences: SharedPreferences
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Enhanced tracking with better precision
    private val activeAppSessions = ConcurrentHashMap<String, AppSession>()
    private var currentForegroundApp = ""
    private var lastAppSwitchTime = 0L
    
    // Monitoring jobs
    private var usageMonitoringJob: Job? = null
    private var continuousUsageUpdateJob: Job? = null
    private var realTimeBlockingJob: Job? = null
    private var systemUsageUpdateJob: Job? = null
    
    // Constants
    private val TAG = "UsageLimitBlocking"
    private val NOTIFICATION_CHANNEL_ID = "UsageLimitChannel"
    private val NOTIFICATION_ID = 2001
    
    // More frequent monitoring for better accuracy
    private val APP_SWITCH_CHECK_INTERVAL = 100L
    private val USAGE_UPDATE_INTERVAL = 5000L     // Update every 5 seconds
    private val BLOCKING_CHECK_INTERVAL = 200L    // Check blocking every 200ms
    private val SYSTEM_USAGE_SYNC_INTERVAL = 10000L // Sync with system every 10 seconds
    
    data class AppSession(
        var startTime: Long = 0L,
        var totalSessionTime: Long = 0L,
        var isActive: Boolean = false,
        var lastUpdateTime: Long = 0L
    )
    
    companion object {
        private const val SERVICE_ALARM_REQUEST_CODE = 2001
        private const val SERVICE_CHECK_INTERVAL = 30 * 1000L
        
        fun scheduleUsageAlarm(context: Context) {
            Log.d("UsageLimitBlocking", "Scheduling usage limit service alarm")
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, UsageAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    SERVICE_ALARM_REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                alarmManager.cancel(pendingIntent)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + SERVICE_CHECK_INTERVAL,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + SERVICE_CHECK_INTERVAL,
                        pendingIntent
                    )
                }
                
                Log.d("UsageLimitBlocking", "Usage limit service alarm scheduled")
            } catch (e: Exception) {
                Log.e("UsageLimitBlocking", "Error scheduling usage alarm: ${e.message}", e)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "UsageLimitBlockingService onCreate")
        
        try {
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            sharedPreferences = getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            startForegroundService()
            startAllMonitoringJobs()
            scheduleUsageAlarm(this)
            
            Log.d(TAG, "UsageLimitBlockingService initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onCreate: ${e.message}", e)
        }
    }

    private fun startForegroundService() {
        try {
            val channelId = NOTIFICATION_CHANNEL_ID
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Usage Limit Monitor",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Monitors app usage limits in real-time"
                    setShowBadge(false)
                    enableLights(false)
                    enableVibration(false)
                }
                notificationManager.createNotificationChannel(channel)
            }
            
            val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }.apply {
                setContentTitle("Usage Limit Monitor Active")
                setContentText("Monitoring app usage limits in real-time")
                setSmallIcon(android.R.drawable.ic_dialog_info)
                setOngoing(true)
                setCategory(Notification.CATEGORY_SERVICE)
                setVisibility(Notification.VISIBILITY_PUBLIC)
                setAutoCancel(false)
            }.build()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            
            Log.d(TAG, "Foreground service started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }
    }

    private fun startAllMonitoringJobs() {
        startUsageMonitoring()
        startContinuousUsageUpdate()
        startRealTimeBlocking()
        startSystemUsageSync()
    }

    private fun startUsageMonitoring() {
        Log.d(TAG, "Starting precise usage monitoring")
        usageMonitoringJob = GlobalScope.launch {
            try {
                while (true) {
                    checkAppSwitches()
                    delay(APP_SWITCH_CHECK_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in usage monitoring: ${e.message}", e)
                delay(5000)
                if (isActive) startUsageMonitoring()
            }
        }
    }

    private fun startContinuousUsageUpdate() {
        Log.d(TAG, "Starting continuous usage updates")
        continuousUsageUpdateJob = GlobalScope.launch {
            try {
                while (true) {
                    updateCurrentAppUsage()
                    delay(USAGE_UPDATE_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in continuous usage update: ${e.message}", e)
                delay(5000)
                if (isActive) startContinuousUsageUpdate()
            }
        }
    }

    private fun startRealTimeBlocking() {
        Log.d(TAG, "Starting real-time blocking monitor")
        realTimeBlockingJob = GlobalScope.launch {
            try {
                while (true) {
                    checkForUsageLimitViolations()
                    delay(BLOCKING_CHECK_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in real-time blocking: ${e.message}", e)
                delay(5000)
                if (isActive) startRealTimeBlocking()
            }
        }
    }

    // NEW: Sync with system usage stats periodically
    private fun startSystemUsageSync() {
        Log.d(TAG, "Starting system usage sync")
        systemUsageUpdateJob = GlobalScope.launch {
            try {
                while (true) {
                    syncWithSystemUsageStats()
                    delay(SYSTEM_USAGE_SYNC_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in system usage sync: ${e.message}", e)
                delay(10000)
                if (isActive) startSystemUsageSync()
            }
        }
    }

    // IMPROVED: Better system usage synchronization
    private suspend fun syncWithSystemUsageStats() {
        try {
            Log.d(TAG, "Syncing with system usage stats")
            
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
            
            if (usageStats != null) {
                val todayDate = getTodayDateString()
                val editor = sharedPreferences.edit()
                
                // Process each app with usage limits
                usageStats.forEach { stat ->
                    if (stat.totalTimeInForeground > 0) {
                        val packageName = stat.packageName
                        val limitMinutes = sharedPreferences.getLong("usage_limit_$packageName", 0L)
                        
                        if (limitMinutes > 0) {
                            val systemUsageMinutes = (stat.totalTimeInForeground / (60 * 1000)).toInt()
                            val savedDate = sharedPreferences.getString("usage_date_$packageName", "")
                            val storedUsage = if (savedDate == todayDate) {
                                sharedPreferences.getLong("usage_today_$packageName", 0L).toInt()
                            } else {
                                0
                            }
                            
                            // Use the higher value between system and stored usage
                            val finalUsage = maxOf(systemUsageMinutes, storedUsage)
                            
                            if (finalUsage != storedUsage) {
                                Log.d(TAG, "Updating usage for $packageName: system=$systemUsageMinutes, stored=$storedUsage, final=$finalUsage")
                                editor.putLong("usage_today_$packageName", finalUsage.toLong())
                                editor.putString("usage_date_$packageName", todayDate)
                                
                                // Check if limit is reached
                                if (finalUsage >= limitMinutes) {
                                    editor.putBoolean("usage_limit_reached_$packageName", true)
                                    Log.d(TAG, "USAGE LIMIT REACHED: $packageName used ${finalUsage}min >= ${limitMinutes}min")
                                }
                            }
                        }
                    }
                }
                
                editor.apply()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing with system usage stats: ${e.message}", e)
        }
    }

    private suspend fun checkAppSwitches() {
        try {
            val currentApp = getCurrentForegroundApp()
            val currentTime = System.currentTimeMillis()
            
            if (currentApp.isNotEmpty() && currentApp != currentForegroundApp) {
                handleAppSwitch(currentForegroundApp, currentApp, currentTime)
                currentForegroundApp = currentApp
                lastAppSwitchTime = currentTime
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking app switches: ${e.message}", e)
        }
    }

    private fun handleAppSwitch(fromApp: String, toApp: String, switchTime: Long) {
        Log.d(TAG, "App switch detected: $fromApp -> $toApp")
        
        // End session for previous app
        if (fromApp.isNotEmpty()) {
            val session = activeAppSessions[fromApp]
            if (session?.isActive == true) {
                val sessionDuration = switchTime - session.startTime
                session.totalSessionTime += sessionDuration
                session.isActive = false
                session.lastUpdateTime = switchTime
                
                // Save accumulated usage
                saveSessionUsage(fromApp, sessionDuration)
                Log.d(TAG, "Ended session for $fromApp: ${sessionDuration / 1000}s")
            }
        }
        
        // Start session for new app
        if (toApp.isNotEmpty()) {
            val session = activeAppSessions.getOrPut(toApp) { AppSession() }
            session.startTime = switchTime
            session.isActive = true
            session.lastUpdateTime = switchTime
            Log.d(TAG, "Started session for $toApp")
        }
    }

    private suspend fun updateCurrentAppUsage() {
        try {
            val currentTime = System.currentTimeMillis()
            
            if (currentForegroundApp.isNotEmpty()) {
                val session = activeAppSessions[currentForegroundApp]
                if (session?.isActive == true) {
                    val sessionDuration = currentTime - session.lastUpdateTime
                    
                    if (sessionDuration > 0) {
                        session.totalSessionTime += sessionDuration
                        session.lastUpdateTime = currentTime
                        
                        // Save incremental usage
                        saveIncrementalUsage(currentForegroundApp, sessionDuration)
                        
                        Log.d(TAG, "Updated usage for $currentForegroundApp: +${sessionDuration / 1000}s")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating current app usage: ${e.message}", e)
        }
    }

    // IMPROVED: Better usage limit violation checking
    private suspend fun checkForUsageLimitViolations() {
        try {
            if (currentForegroundApp.isEmpty()) return
            
            val usageLimit = getAppUsageLimit(currentForegroundApp)
            if (usageLimit <= 0) return
            
            val totalUsageMinutes = getTotalUsageToday(currentForegroundApp)
            
            // Log current usage status
            Log.d(TAG, "Usage check for $currentForegroundApp: ${totalUsageMinutes}min / ${usageLimit}min")
            
            if (totalUsageMinutes >= usageLimit) {
                Log.d(TAG, "USAGE LIMIT EXCEEDED: $currentForegroundApp used ${totalUsageMinutes}min >= ${usageLimit}min")
                
                // Mark limit as reached immediately
                markLimitReached(currentForegroundApp)
                
                // Block immediately on main thread
                mainHandler.post {
                    blockAppForUsageLimit(currentForegroundApp)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking usage limit violations: ${e.message}", e)
        }
    }

    private fun getCurrentForegroundApp(): String {
        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 2000 // Check last 2 seconds
            
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()
            var foregroundApp = ""
            var lastEventTime = 0L

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && 
                    event.timeStamp > lastEventTime) {
                    foregroundApp = event.packageName
                    lastEventTime = event.timeStamp
                }
            }
            
            return foregroundApp
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current foreground app", e)
            return ""
        }
    }

    private fun saveSessionUsage(packageName: String, sessionDurationMs: Long) {
        try {
            val sessionSeconds = sessionDurationMs / 1000
            if (sessionSeconds >= 5) { // Only save sessions longer than 5 seconds
                val sessionMinutes = (sessionSeconds + 30) / 60 // Round to nearest minute
                
                if (sessionMinutes > 0) {
                    val todayDate = getTodayDateString()
                    val currentUsage = sharedPreferences.getLong("usage_today_$packageName", 0L)
                    val savedDate = sharedPreferences.getString("usage_date_$packageName", "")
                    
                    val newUsage = if (savedDate == todayDate) {
                        currentUsage + sessionMinutes
                    } else {
                        sessionMinutes
                    }
                    
                    sharedPreferences.edit()
                        .putLong("usage_today_$packageName", newUsage)
                        .putString("usage_date_$packageName", todayDate)
                        .apply()
                    
                    Log.d(TAG, "Saved session usage for $packageName: +${sessionMinutes}min, total: ${newUsage}min")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving session usage: ${e.message}", e)
        }
    }

    private fun saveIncrementalUsage(packageName: String, incrementMs: Long) {
        try {
            val incrementSeconds = incrementMs / 1000
            if (incrementSeconds >= 30) { // Save every 30 seconds of usage
                val incrementMinutes = (incrementSeconds + 30) / 60 // Round to nearest minute
                
                if (incrementMinutes > 0) {
                    val todayDate = getTodayDateString()
                    val currentUsage = sharedPreferences.getLong("usage_today_$packageName", 0L)
                    val savedDate = sharedPreferences.getString("usage_date_$packageName", "")
                    
                    val newUsage = if (savedDate == todayDate) {
                        currentUsage + incrementMinutes
                    } else {
                        incrementMinutes
                    }
                    
                    sharedPreferences.edit()
                        .putLong("usage_today_$packageName", newUsage)
                        .putString("usage_date_$packageName", todayDate)
                        .apply()
                    
                    Log.d(TAG, "Incremental usage for $packageName: +${incrementMinutes}min, total: ${newUsage}min")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving incremental usage: ${e.message}", e)
        }
    }

    // IMPROVED: More accurate usage calculation
    private fun getTotalUsageToday(packageName: String): Long {
        try {
            val todayDate = getTodayDateString()
            val savedDate = sharedPreferences.getString("usage_date_$packageName", "")
            
            val storedUsageMinutes = if (savedDate == todayDate) {
                sharedPreferences.getLong("usage_today_$packageName", 0L)
            } else {
                0L
            }
            
            // Add current active session time (in minutes)
            val activeSession = activeAppSessions[packageName]
            val currentSessionMinutes = if (activeSession?.isActive == true) {
                val sessionMs = System.currentTimeMillis() - activeSession.startTime
                (sessionMs / (60 * 1000))
            } else {
                0L
            }
            
            val totalMinutes = storedUsageMinutes + currentSessionMinutes
            Log.d(TAG, "Total usage for $packageName today: stored=${storedUsageMinutes}min, active=${currentSessionMinutes}min, total=${totalMinutes}min")
            
            return totalMinutes
        } catch (e: Exception) {
            Log.e(TAG, "Error getting total usage today: ${e.message}", e)
            return 0L
        }
    }

    private fun getAppUsageLimit(packageName: String): Long {
        return sharedPreferences.getLong("usage_limit_$packageName", 0L)
    }

    private fun markLimitReached(packageName: String) {
        val todayDate = getTodayDateString()
        sharedPreferences.edit()
            .putBoolean("usage_limit_reached_$packageName", true)
            .putString("usage_date_$packageName", todayDate)
            .apply()
        
        Log.d(TAG, "Marked limit reached for $packageName")
    }

    // IMPROVED: More aggressive blocking
    private fun blockAppForUsageLimit(packageName: String) {
        try {
            Log.d(TAG, "Blocking app for usage limit: $packageName")
            
            // Force close the app multiple times
            forceCloseApp(packageName)
            
            // Show usage limit lock screen
            showUsageLimitLockScreen(packageName)
            
            // Schedule additional force closes
            mainHandler.postDelayed({ forceCloseApp(packageName) }, 100)
            mainHandler.postDelayed({ forceCloseApp(packageName) }, 300)
            mainHandler.postDelayed({ forceCloseApp(packageName) }, 500)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error blocking app: ${e.message}", e)
        }
    }

    private fun forceCloseApp(packageName: String) {
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            
            // Kill background processes
            activityManager.killBackgroundProcesses(packageName)
            
            // Send to home screen immediately
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                       Intent.FLAG_ACTIVITY_CLEAR_TOP or
                       Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(homeIntent)
            
            Log.d(TAG, "Force closed app: $packageName")
        } catch (e: Exception) {
            Log.e(TAG, "Error force closing app: ${e.message}", e)
        }
    }

    private fun showUsageLimitLockScreen(packageName: String) {
        try {
            if (isUsageLimitLockViewShowing()) {
                removeUsageLimitLockScreen()
            }
            
            val packageManager = applicationContext.packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            val appName = packageManager.getApplicationLabel(appInfo).toString()
            val appIcon = packageManager.getApplicationIcon(appInfo)
            
            val usageMinutes = getTotalUsageToday(packageName)
            val limitMinutes = getAppUsageLimit(packageName)
            
            val inflater = LayoutInflater.from(this)
            usageLimitLockView = inflater.inflate(R.layout.usage_limit_lock_screen, null)
            
            // Set up the lock screen UI
            val appNameText = usageLimitLockView!!.findViewById<TextView>(R.id.appName)
            val lockMessage = usageLimitLockView!!.findViewById<TextView>(R.id.lockMessage)
            val usageInfo = usageLimitLockView!!.findViewById<TextView>(R.id.usageInfo)
            val appIconView = usageLimitLockView!!.findViewById<ImageView>(R.id.appIcon)
            val closeButton = usageLimitLockView!!.findViewById<Button>(R.id.closeButton)
            
            appNameText.text = appName
            appIconView.setImageDrawable(appIcon)
            lockMessage.text = "Daily Usage Limit Reached!"
            usageInfo.text = "You've used $appName for ${formatTime(usageMinutes)} today.\nLimit: ${formatTime(limitMinutes)}"
            
            closeButton.setOnClickListener {
                removeUsageLimitLockScreen()
                forceCloseApp(packageName)
            }
            
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            )
            
            windowManager.addView(usageLimitLockView, params)
            Log.d(TAG, "Usage limit lock screen shown for $packageName")
            
            // Auto-dismiss after 3 seconds and force close again
            mainHandler.postDelayed({
                removeUsageLimitLockScreen()
                forceCloseApp(packageName)
            }, 3000)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error showing usage limit lock screen: ${e.message}", e)
        }
    }

    private fun removeUsageLimitLockScreen() {
        try {
            if (isUsageLimitLockViewShowing()) {
                windowManager.removeView(usageLimitLockView)
                usageLimitLockView = null
                Log.d(TAG, "Usage limit lock screen removed")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing usage limit lock screen: ${e.message}", e)
        }
    }

    private fun isUsageLimitLockViewShowing(): Boolean {
        return usageLimitLockView != null && usageLimitLockView?.parent != null
    }

    private fun formatTime(minutes: Long): String {
        return if (minutes < 60) {
            "${minutes}m"
        } else {
            val hours = minutes / 60
            val remainingMinutes = minutes % 60
            if (remainingMinutes == 0L) {
                "${hours}h"
            } else {
                "${hours}h ${remainingMinutes}m"
            }
        }
    }

    private fun getTodayDateString(): String {
        val calendar = Calendar.getInstance()
        return "${calendar.get(Calendar.YEAR)}-${calendar.get(Calendar.MONTH) + 1}-${calendar.get(Calendar.DAY_OF_MONTH)}"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "UsageLimitBlockingService onStartCommand")
        
        // Ensure all monitoring is running
        if (usageMonitoringJob?.isActive != true) {
            startUsageMonitoring()
        }
        if (continuousUsageUpdateJob?.isActive != true) {
            startContinuousUsageUpdate()
        }
        if (realTimeBlockingJob?.isActive != true) {
            startRealTimeBlocking()
        }
        if (systemUsageUpdateJob?.isActive != true) {
            startSystemUsageSync()
        }
        
        scheduleUsageAlarm(this)
        
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        try {
            // Save any active sessions before destroying
            val currentTime = System.currentTimeMillis()
            activeAppSessions.forEach { (packageName, session) ->
                if (session.isActive) {
                    val sessionDuration = currentTime - session.startTime
                    saveSessionUsage(packageName, sessionDuration)
                }
            }
            
            usageMonitoringJob?.cancel()
            continuousUsageUpdateJob?.cancel()
            realTimeBlockingJob?.cancel()
            systemUsageUpdateJob?.cancel()
            
            if (isUsageLimitLockViewShowing()) {
                removeUsageLimitLockScreen()
            }
            
            Log.d(TAG, "UsageLimitBlockingService destroyed")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy: ${e.message}", e)
        }
    }
}