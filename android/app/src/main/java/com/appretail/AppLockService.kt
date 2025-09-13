package com.wingsfly

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.content.SharedPreferences
import kotlinx.coroutines.*
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.content.pm.ServiceInfo
import android.widget.TextView
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import java.io.File
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject
import android.view.ViewGroup
import android.content.ComponentName
import java.util.concurrent.ConcurrentHashMap

class AppLockService : Service() {
    private lateinit var windowManager: WindowManager
    private var lockView: View? = null
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var serviceJob: Job
    private var lastApp = ""
    private var currentLockedApp = ""
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isServiceRunning = false
    
    // Track blocked apps more aggressively
    private val blockedAppsTracker = ConcurrentHashMap<String, Long>()
    private var continuousMonitoringJob: Job? = null
    
    // Constants for service
    private val NOTIFICATION_CHANNEL_ID = "AppLockServiceChannel"
    private val NOTIFICATION_ID = 1
    private val TAG = "AppLock"
    
    // More aggressive monitoring intervals
    private val FAST_CHECK_INTERVAL = 50L // Check every 50ms for better responsiveness
    private val SLOW_CHECK_INTERVAL = 200L // Fallback interval

    companion object {
        private const val SERVICE_ALARM_REQUEST_CODE = 1234
        private const val SERVICE_CHECK_INTERVAL = 60 * 1000L // 1 minute
        
        // Method to schedule an alarm that periodically checks if our service is running
        fun scheduleServiceAlarm(context: Context) {
            Log.d("AppLock", "Scheduling service alarm")
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, ServiceAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    SERVICE_ALARM_REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Cancel any existing alarms
                alarmManager.cancel(pendingIntent)
                
                // Schedule a new one
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
                
                Log.d("AppLock", "Service alarm scheduled successfully")
            } catch (e: Exception) {
                Log.e("AppLock", "Error scheduling service alarm: ${e.message}", e)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d("AppLock", "Service onCreate called")
        try {
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            sharedPreferences = getSharedPreferences("AppLock", Context.MODE_PRIVATE)
            
            startForeground()
            startAppMonitoring()
            startContinuousMonitoring()
            
            // Schedule our alarm as another layer of protection
            scheduleServiceAlarm(this)
            
            Log.d("AppLock", "Service initialized successfully")
        } catch (e: Exception) {
            Log.e("AppLock", "Error in onCreate: ${e.message}", e)
        }
    }
    
    private fun startForeground() {
        try {
            val channelId = "AppLockService"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Check if channel exists first
                var channel = notificationManager.getNotificationChannel(channelId)
                if (channel == null) {
                    // Create the channel if it doesn't exist
                    channel = NotificationChannel(
                        channelId,
                        "App Lock Service",
                        NotificationManager.IMPORTANCE_HIGH // Changed to HIGH for better visibility
                    ).apply {
                        description = "Monitors locked applications"
                        setShowBadge(false)
                        enableLights(false)
                        enableVibration(false)
                        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    }
                    notificationManager.createNotificationChannel(channel)
                    Log.d(TAG, "Created notification channel: $channelId")
                } else {
                    Log.d(TAG, "Notification channel already exists: $channelId")
                    // Update existing channel to proper importance if needed
                    if (channel.importance < NotificationManager.IMPORTANCE_HIGH) {
                        // We need to recreate the channel with proper importance
                        notificationManager.deleteNotificationChannel(channelId)
                        channel = NotificationChannel(
                            channelId,
                            "App Lock Service",
                            NotificationManager.IMPORTANCE_HIGH
                        ).apply {
                            description = "Monitors locked applications"
                            setShowBadge(false)
                            enableLights(false)
                            enableVibration(false)
                            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                        }
                        notificationManager.createNotificationChannel(channel)
                        Log.d(TAG, "Updated notification channel importance: $channelId")
                    }
                }
            }
            
            // Check if Pomodoro is active for initial notification
            val isPomodoroActive = isPomodoroModeActive()
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            val title = if (isPomodoroActive) "Pomodoro Focus Mode Active" else "App Lock Active"
            val text = if (isPomodoroActive) {
                if (excludedApps.isNotEmpty()) {
                    "Most apps blocked • ${excludedApps.size} apps excluded"
                } else {
                    "All apps are blocked during focus session"
                }
            } else {
                "Monitoring apps for your security"
            }
            val icon = if (isPomodoroActive) android.R.drawable.ic_media_pause else android.R.drawable.ic_lock_lock
            
            // Create a more robust notification
            val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }.apply {
                setContentTitle(title)
                setContentText(text)
                setSmallIcon(icon)
                setOngoing(true)
                
                // For pre-O versions
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    setPriority(Notification.PRIORITY_MAX) // Changed to MAX
                }
                
                // Add a timestamp to ensure the system treats this as a new notification
                setWhen(System.currentTimeMillis())
                
                // Set more persistent flags
                setCategory(Notification.CATEGORY_SERVICE)
                setVisibility(Notification.VISIBILITY_PUBLIC)
                
                // Create an explicit intent for the main activity
                val pendingIntent = PendingIntent.getActivity(
                    this@AppLockService,
                    0,
                    Intent(this@AppLockService, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setContentIntent(pendingIntent)
                
                // Add auto-cancel = false to prevent easy dismissal
                setAutoCancel(false)
            }.build()
            
            // Update notification manager directly as well
            notificationManager.notify(NOTIFICATION_ID, notification)
            
            // Then call startForeground
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            
            Log.d(TAG, "Service started in foreground successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
            
            // Fallback notification attempt if the first one failed
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val fallbackChannel = NotificationChannel(
                        "FallbackChannel",
                        "Fallback Channel",
                        NotificationManager.IMPORTANCE_HIGH
                    )
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.createNotificationChannel(fallbackChannel)
                    
                    val fallbackNotification = Notification.Builder(this, "FallbackChannel")
                        .setContentTitle("App Lock Running")
                        .setContentText("Fallback notification")
                        .setSmallIcon(android.R.drawable.ic_lock_lock)
                        .setOngoing(true)
                        .setAutoCancel(false)
                        .build()
                    
                    startForeground(NOTIFICATION_ID, fallbackNotification)
                    Log.d(TAG, "Fallback notification created")
                }
            } catch (e2: Exception) {
                Log.e(TAG, "Even fallback notification failed: ${e2.message}", e2)
            }
        }
    }

    private fun isPomodoroModeActive(): Boolean {
        val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
        val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
        return isPomodoroMode && !isPaused
    }

    // Updated shouldBlockAllAppsForPomodoro method with exclusions
    private fun shouldBlockAllAppsForPomodoro(packageName: String): Boolean {
        if (!isPomodoroModeActive()) {
            return false
        }
        
        // List of apps that should NEVER be blocked (system critical apps)
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
            "com.wingsfly", // Your own app
            applicationContext.packageName // Ensure your app is never blocked
        )
        
        // Don't block system apps or essential apps
        if (neverBlockApps.contains(packageName)) {
            Log.d(TAG, "App $packageName is in never-block list for Pomodoro")
            return false
        }
        
        // Check if app is excluded from Pomodoro blocking
        val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
        if (excludedApps.contains(packageName)) {
            Log.d(TAG, "App $packageName is excluded from Pomodoro blocking by user preference")
            return false
        }
        
        // Don't block system apps
        try {
            val packageManager = applicationContext.packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            if ((appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0) {
                Log.d(TAG, "App $packageName is system app, not blocking in Pomodoro mode")
                return false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if app is system app: ${e.message}", e)
            return false
        }
        
        Log.d(TAG, "App $packageName should be blocked in Pomodoro mode")
        return true
    }

    // Updated handlePomodoroCommands method
    private fun handlePomodoroCommands(intent: Intent) {
        val command = intent.getStringExtra("command")
        Log.d(TAG, "Received Pomodoro command: $command")
        
        when (command) {
            "start_pomodoro" -> {
                Log.d(TAG, "Starting Pomodoro blocking mode")
                updateNotificationForPomodoro(true)
            }
            "stop_pomodoro" -> {
                Log.d(TAG, "Stopping Pomodoro blocking mode")
                // Remove any existing lock screen when stopping
                if (isLockViewShowing()) {
                    mainHandler.post {
                        removeLockScreen()
                    }
                }
                updateNotificationForPomodoro(false)
            }
            "pause_pomodoro" -> {
                Log.d(TAG, "Pausing Pomodoro blocking mode")
                // Remove lock screen when paused
                if (isLockViewShowing()) {
                    mainHandler.post {
                        removeLockScreen()
                    }
                }
                updateNotificationForPomodoro(false)
            }
            "resume_pomodoro" -> {
                Log.d(TAG, "Resuming Pomodoro blocking mode")
                updateNotificationForPomodoro(true)
            }
            "refresh_exclusion_list" -> {
                Log.d(TAG, "Refreshing Pomodoro exclusion list")
                refreshPomodoroExclusionList()
            }
        }
    }

    // Updated updateNotificationForPomodoro method with exclusion info
    private fun updateNotificationForPomodoro(isPomodoroActive: Boolean) {
        try {
            val channelId = "AppLockService"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            val title = if (isPomodoroActive) "Pomodoro Focus Mode Active" else "App Lock Active"
            val text = if (isPomodoroActive) {
                if (excludedApps.isNotEmpty()) {
                    "Most apps blocked • ${excludedApps.size} apps excluded"
                } else {
                    "All apps are blocked during focus session"
                }
            } else {
                "Monitoring apps for your security"
            }
            
            val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }.apply {
                setContentTitle(title)
                setContentText(text)
                setSmallIcon(if (isPomodoroActive) android.R.drawable.ic_media_pause else android.R.drawable.ic_lock_lock)
                setOngoing(true)
                
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    setPriority(Notification.PRIORITY_MAX)
                }
                
                setWhen(System.currentTimeMillis())
                setCategory(Notification.CATEGORY_SERVICE)
                setVisibility(Notification.VISIBILITY_PUBLIC)
                
                val pendingIntent = PendingIntent.getActivity(
                    this@AppLockService,
                    0,
                    Intent(this@AppLockService, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setContentIntent(pendingIntent)
                setAutoCancel(false)
            }.build()
            
            notificationManager.notify(NOTIFICATION_ID, notification)
            Log.d(TAG, "Notification updated for Pomodoro mode: $isPomodoroActive (${excludedApps.size} excluded apps)")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification for Pomodoro: ${e.message}", e)
        }
    }

    // Add method to update notification when exclusion settings change
    private fun updateNotificationForExcludedApps() {
        try {
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            val isPomodoroActive = isPomodoroModeActive()
            
            if (isPomodoroActive && excludedApps.isNotEmpty()) {
                Log.d(TAG, "Updating notification to reflect ${excludedApps.size} excluded apps during Pomodoro")
                
                val channelId = "AppLockService"
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                val title = "Pomodoro Focus Mode Active"
                val text = "Most apps blocked • ${excludedApps.size} apps excluded"
                
                val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Notification.Builder(this, channelId)
                } else {
                    Notification.Builder(this)
                }.apply {
                    setContentTitle(title)
                    setContentText(text)
                    setSmallIcon(android.R.drawable.ic_media_pause)
                    setOngoing(true)
                    
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        setPriority(Notification.PRIORITY_MAX)
                    }
                    
                    setWhen(System.currentTimeMillis())
                    setCategory(Notification.CATEGORY_SERVICE)
                    setVisibility(Notification.VISIBILITY_PUBLIC)
                    
                    val pendingIntent = PendingIntent.getActivity(
                        this@AppLockService,
                        0,
                        Intent(this@AppLockService, MainActivity::class.java),
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    setContentIntent(pendingIntent)
                    setAutoCancel(false)
                }.build()
                
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification for excluded apps: ${e.message}", e)
        }
    }

    // Add method to refresh exclusion list when preferences change
    fun refreshPomodoroExclusionList() {
        try {
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            Log.d(TAG, "Refreshed Pomodoro exclusion list: ${excludedApps.joinToString()}")
            
            // Update notification if Pomodoro is active
            if (isPomodoroModeActive()) {
                updateNotificationForExcludedApps()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing Pomodoro exclusion list: ${e.message}", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand called with flags: $flags, startId: $startId")
        
        try {
            // Handle Pomodoro commands
            if (intent != null) {
                handlePomodoroCommands(intent)
            }
            
            // Check if we're being restarted after being killed
            val isRestart = flags == START_FLAG_REDELIVERY || flags == START_FLAG_RETRY

            // If this is a restart or first start, ensure we're in foreground immediately
            if (isRestart || !isServiceRunning) {
                Log.d(TAG, "Initial start or restarting, showing notification immediately")
                startForeground()
            } else {
                Log.d(TAG, "Service already running, updating notification")
                // Still update notification to ensure it's visible
                startForeground()
            }
            
            isServiceRunning = true
            Log.d(TAG, "AppLockService onStartCommand - service running: $isServiceRunning")
            
            // Handle intent extras if any
            if (intent != null) {
                val restart = intent.getBooleanExtra("restart", false)
                if (restart) {
                    Log.d(TAG, "Service restarted by system or manual request")
                }
                
                // Check if this is a notification refresh request
                val refreshNotification = intent.getBooleanExtra("refresh_notification", false)
                if (refreshNotification) {
                    Log.d(TAG, "Notification refresh requested")
                    updateNotification()
                }
            }
            
            // Start our monitoring
            if (!::serviceJob.isInitialized || serviceJob.isCancelled) {
                startAppMonitoring()
            }
            
            // Start continuous monitoring if not already running
            if (continuousMonitoringJob?.isActive != true) {
                startContinuousMonitoring()
            }
            
            // Schedule our own service alarm
            scheduleServiceAlarm(this)
            
            Log.d(TAG, "AppLockService started successfully")
            
            // Save a success marker to help debug restart issues
            try {
                val successFile = File(applicationContext.filesDir, "service_started_success.txt")
                successFile.writeText("Service started at ${System.currentTimeMillis()}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to write success marker", e)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in onStartCommand", e)
            
            // Try to recover by showing notification again
            try {
                startForeground()
            } catch (e2: Exception) {
                Log.e(TAG, "Even recovery notification failed", e2)
            }
        }
        
        // Return sticky to ensure service is restarted if killed
        return START_STICKY
    }

    private fun startAppMonitoring() {
        Log.d("AppLock", "Starting app monitoring")
        serviceJob = GlobalScope.launch {
            try {
                while (true) {
                    checkCurrentApp()
                    delay(FAST_CHECK_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e("AppLock", "Error in monitoring loop: ${e.message}", e)
                // Restart monitoring after a brief delay
                delay(1000)
                startAppMonitoring()
            }
        }
    }
    
    private fun startContinuousMonitoring() {
        Log.d("AppLock", "Starting continuous monitoring")
        continuousMonitoringJob = GlobalScope.launch {
            try {
                while (true) {
                    // Check if any blocked app is trying to run
                    checkForBlockedApps()
                    delay(SLOW_CHECK_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e("AppLock", "Error in continuous monitoring: ${e.message}", e)
                // Restart continuous monitoring after a brief delay
                delay(2000)
                startContinuousMonitoring()
            }
        }
    }
    
    private fun checkForBlockedApps() {
        try {
            val currentApp = getCurrentForegroundApp()
            if (currentApp.isNotEmpty() && isAppLocked(currentApp)) {
                val currentTime = System.currentTimeMillis()
                val lastBlockTime = blockedAppsTracker[currentApp] ?: 0
                
                // If the app was blocked recently (within 1 second), force close it again
                if (currentTime - lastBlockTime < 1000) {
                    Log.d("AppLock", "Blocked app $currentApp detected again, forcing close")
                    mainHandler.post {
                        forceCloseApp(currentApp)
                    }
                } else if (currentApp != currentLockedApp) {
                    // New blocked app detected
                    Log.d("AppLock", "New blocked app detected: $currentApp")
                    blockedAppsTracker[currentApp] = currentTime
                    mainHandler.post {
                        showLockScreen(currentApp)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error in checkForBlockedApps: ${e.message}", e)
        }
    }

    private fun checkCurrentApp() {
        try {
            val time = System.currentTimeMillis()
            val startTime = time - 1000
            val usageEvents = usageStatsManager.queryEvents(startTime, time)
            val event = UsageEvents.Event()
            var currentApp = ""
            var lastEventTime = 0L

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && 
                    event.timeStamp > lastEventTime) {
                    currentApp = event.packageName
                    lastEventTime = event.timeStamp
                }
            }

            if (currentApp.isNotEmpty() && currentApp != lastApp) {
                Log.d("AppLock", "App switch detected: $currentApp")
                
                // Check if the app should be locked based on manual lock and schedules
                if (isAppLocked(currentApp)) {
                    Log.d("AppLock", "App $currentApp is locked, showing lock screen")
                    blockedAppsTracker[currentApp] = time
                    // Show lock screen on main thread
                    mainHandler.post {
                        showLockScreen(currentApp)
                    }
                } 
                // If we're switching away from a locked app
                else if (isLockViewShowing() && !isAppLocked(currentApp)) {
                    mainHandler.post {
                        removeLockScreen()
                    }
                }
                
                lastApp = currentApp
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking current app: ${e.message}", e)
        }
    }

    private fun getCurrentForegroundApp(): String {
        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 2000 // Check last 2 seconds for better accuracy
            
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()
            var currentApp = ""
            var lastEventTime = 0L

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && 
                    event.timeStamp > lastEventTime) {
                    currentApp = event.packageName
                    lastEventTime = event.timeStamp
                }
            }
            
            return currentApp
        } catch (e: Exception) {
            Log.e("AppLock", "Error getting current foreground app", e)
            return ""
        }
    }

    private fun getTodayDateString(): String {
    val calendar = Calendar.getInstance()
    return "${calendar.get(Calendar.YEAR)}-${calendar.get(Calendar.MONTH) + 1}-${calendar.get(Calendar.DAY_OF_MONTH)}"
}

    // Updated isAppLocked method in AppLockService to properly handle usage limits
private fun isAppLocked(packageName: String): Boolean {
    // PRIORITY 1: Check usage limit first (most important)
    if (isAppUsageLimitReached(packageName)) {
        Log.d(TAG, "$packageName is blocked due to usage limit reached")
        return true
    }
    
    // PRIORITY 2: Check if Pomodoro mode is active and should block all apps (with exclusions)
    if (shouldBlockAllAppsForPomodoro(packageName)) {
        Log.d(TAG, "$packageName is blocked due to Pomodoro mode")
        return true
    }
    
    // PRIORITY 3: Continue with existing logic for individually locked apps
    val lockedApps = sharedPreferences.getStringSet("locked_apps", setOf()) ?: setOf()
    Log.d(TAG, "Checking if $packageName is locked. Locked apps: ${lockedApps.joinToString()}")
    
    // First check if app is manually locked
    if (lockedApps.contains(packageName)) {
        Log.d(TAG, "$packageName is manually locked")
        
        // Check if there's a schedule that might unlock it
        if (hasSchedule(packageName)) {
            val shouldLock = shouldLockBySchedule(packageName)
            Log.d(TAG, "$packageName schedule check result: shouldLock=$shouldLock")
            return shouldLock
        }
        
        return true
    }
    
    // App is not manually locked, check if it should be locked by schedule
    if (hasSchedule(packageName)) {
        val shouldLock = shouldLockBySchedule(packageName)
        Log.d(TAG, "$packageName is not manually locked, schedule check: shouldLock=$shouldLock")
        return shouldLock
    }
    
    return false
}

// IMPROVED usage limit checking method
private fun isAppUsageLimitReached(packageName: String): Boolean {
    val prefs = sharedPreferences
    val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
    
    if (limitMinutes <= 0) return false
    
    val todayDate = getTodayDateString()
    val savedDate = prefs.getString("usage_date_$packageName", "")
    
    if (savedDate != todayDate) {
        // New day, reset limit
        prefs.edit()
            .putLong("usage_today_$packageName", 0L)
            .putString("usage_date_$packageName", todayDate)
            .putBoolean("usage_limit_reached_$packageName", false)
            .apply()
        return false
    }
    
    // First check if limit is explicitly marked as reached
    val isLimitReached = prefs.getBoolean("usage_limit_reached_$packageName", false)
    if (isLimitReached) {
        Log.d(TAG, "$packageName usage limit reached flag is set")
        return true
    }
    
    // Also check actual usage vs limit as backup
    val usageToday = prefs.getLong("usage_today_$packageName", 0L)
    if (usageToday >= limitMinutes) {
        Log.d(TAG, "$packageName usage limit exceeded: ${usageToday}min >= ${limitMinutes}min")
        // Mark as reached if not already marked
        prefs.edit().putBoolean("usage_limit_reached_$packageName", true).apply()
        return true
    }
    
    return false
}
    
    private fun hasSchedule(packageName: String): Boolean {
        val schedulesJson = sharedPreferences.getString("schedule_$packageName", null)
        return schedulesJson != null
    }
    
    private fun shouldLockBySchedule(packageName: String): Boolean {
        try {
            val schedulesJson = sharedPreferences.getString("schedule_$packageName", null) ?: return false
            
            val schedulesJsonArray = JSONArray(schedulesJson)
            
            // Get current time
            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            
            Log.d("AppLock", "Checking schedules for $packageName: $schedulesJson")
            Log.d("AppLock", "Current time: $currentHour:$currentMinute")
            
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
    
    private fun isInTimeRange(startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, days: List<Int>): Boolean {
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

    // Updated showLockScreen method to show better messages for excluded apps
    private fun showLockScreen(packageName: String) {
        try {
            Log.d("AppLock", "Showing lock screen for $packageName")
            
            // Check if this is a Pomodoro exclusion case
            val isPomodoroActive = isPomodoroModeActive()
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            val isExcludedFromPomodoro = excludedApps.contains(packageName)
            
            // If we already have a lock view showing, remove it first
            if (isLockViewShowing()) {
                try {
                    windowManager.removeView(lockView)
                    Log.d("AppLock", "Removed existing lock view")
                } catch (e: Exception) {
                    Log.e("AppLock", "Error removing existing lock view: ${e.message}", e)
                }
            }
            
            // Update current locked app
            currentLockedApp = packageName
            
            // Immediately force close the app
            forceCloseApp(packageName)
            
            // Get app name and icon
            val packageManager = applicationContext.packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            val appNameLabel = packageManager.getApplicationLabel(appInfo).toString()
            val appIconDrawable = packageManager.getApplicationIcon(appInfo)
            
            // Create lock screen layout
            val inflater = LayoutInflater.from(this)
            lockView = inflater.inflate(R.layout.lock_screen, FrameLayout(this), false)
            
            // Set app details in the UI
            val appName = lockView!!.findViewById<TextView>(R.id.appName)
            val lockMessage = lockView!!.findViewById<TextView>(R.id.lockMessage)
            val timerText = lockView!!.findViewById<TextView>(R.id.timerText)
            val appIcon = lockView!!.findViewById<ImageView>(R.id.appIcon)
            
            appName.text = appNameLabel
            appIcon.setImageDrawable(appIconDrawable)
            timerText.visibility = View.GONE
            
            // Show different message based on blocking reason
            if (isPomodoroActive && !isExcludedFromPomodoro) {
                lockMessage.text = "Focus Mode Active!\n$appNameLabel is blocked during your Pomodoro session"
            } else if (isPomodoroActive && isExcludedFromPomodoro) {
                // This case shouldn't happen since excluded apps shouldn't be blocked, but just in case
                lockMessage.text = "This app is excluded from Pomodoro blocking but has other restrictions"
            } else {
                lockMessage.text = "This app is blocked and has been closed"
            }
            
            // Add close button click handler
            val closeButton = lockView!!.findViewById<Button>(R.id.closeButton)
            closeButton.text = "OK"
            closeButton.setOnClickListener {
                try {
                    Log.d("AppLock", "Close button clicked, removing lock screen")
                    removeLockScreen()
                    goToHomeScreen()
                } catch (e: Exception) {
                    Log.e("AppLock", "Error removing lock screen on close button click: ${e.message}", e)
                }
            }
            
            Log.d("AppLock", "Lock screen UI prepared for $appNameLabel")
            
            // Create overlay parameters - make it completely blocking
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON, // Keep screen on
                PixelFormat.TRANSLUCENT
            )
            
            // Add the view to the window manager
            try {
                windowManager.addView(lockView, params)
                Log.d("AppLock", "Lock screen overlay added for $packageName")
            } catch (e: Exception) {
                Log.e("AppLock", "Error adding lock screen overlay: ${e.message}", e)
            }
            
            // Continuously force close the app and go to home
            mainHandler.postDelayed({
                forceCloseAppAndGoHome(packageName)
            }, 100)
            
            // Auto-dismiss lock screen after showing the message
            val dismissDelay = if (isPomodoroActive) 3000L else 2000L // 3 seconds for Pomodoro, 2 for regular
            mainHandler.postDelayed({
                try {
                    if (isLockViewShowing()) {
                        removeLockScreen()
                        goToHomeScreen()
                    }
                } catch (e: Exception) {
                    Log.e("AppLock", "Error in auto-dismiss: ${e.message}", e)
                }
            }, dismissDelay)
            
        } catch (e: Exception) {
            Log.e("AppLock", "Error showing lock screen: ${e.message}", e)
        }
    }

    private fun forceCloseApp(packageName: String) {
        try {
            Log.d("AppLock", "Force closing app: $packageName")
            
            // Multiple methods to close the app
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            
            // Method 1: Kill background processes
            activityManager.killBackgroundProcesses(packageName)
            
            // Method 2: Send home intent immediately
            goToHomeScreen()
            
            // Method 3: Try to move task to back if possible
            try {
                val tasks = activityManager.getRunningTasks(100)
                for (task in tasks) {
                    if (task.topActivity?.packageName == packageName) {
                        activityManager.moveTaskToFront(task.id, 0)
                        break
                    }
                }
            } catch (e: Exception) {
                Log.e("AppLock", "Error moving task: ${e.message}", e)
            }
            
        } catch (e: Exception) {
            Log.e("AppLock", "Error force closing app: ${e.message}", e)
        }
    }
    
    private fun forceCloseAppAndGoHome(packageName: String) {
        try {
            // Aggressively close the app
            forceCloseApp(packageName)
            
            // Ensure we go to home screen
            goToHomeScreen()
            
            // Schedule another check
            mainHandler.postDelayed({
                val currentApp = getCurrentForegroundApp()
                if (currentApp == packageName) {
                    Log.d("AppLock", "App $packageName still running, forcing close again")
                    forceCloseAppAndGoHome(packageName)
                }
            }, 200)
            
        } catch (e: Exception) {
            Log.e("AppLock", "Error in forceCloseAppAndGoHome: ${e.message}", e)
        }
    }
    
    private fun goToHomeScreen() {
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN)
            homeIntent.addCategory(Intent.CATEGORY_HOME)
            homeIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            startActivity(homeIntent)
            Log.d("AppLock", "Sent to home screen")
        } catch (e: Exception) {
            Log.e("AppLock", "Error going to home screen: ${e.message}", e)
        }
    }
    
    private fun removeLockScreen() {
        try {
            if (isLockViewShowing()) {
                windowManager.removeView(lockView)
                lockView = null
                currentLockedApp = ""
                Log.d("AppLock", "Lock screen removed")
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error removing lock screen: ${e.message}", e)
        }
    }

    // Add this method to check if lock view is showing
    private fun isLockViewShowing(): Boolean {
        return lockView != null && lockView?.parent != null
    }

    // Inner class ServiceBinder to allow direct access to the service
    inner class ServiceBinder : android.os.Binder() {
        fun asService(): AppLockService = this@AppLockService
    }

    override fun onBind(intent: Intent?): IBinder? {
        return ServiceBinder()
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            serviceJob.cancel()
            continuousMonitoringJob?.cancel()
            
            // Clean up lock view if showing
            if (isLockViewShowing()) {
                removeLockScreen()
            }
            
            Log.d("AppLock", "Service destroyed")
        } catch (e: Exception) {
            Log.e("AppLock", "Error in onDestroy: ${e.message}", e)
        }
    }

    private fun isAppScheduled(packageName: String): Boolean {
        val schedulesJson = sharedPreferences.getString("appSchedules", "[]")
        if (schedulesJson == "[]") return false
        
        try {
            val schedulesJsonArray = JSONArray(schedulesJson)
            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            
            for (i in 0 until schedulesJsonArray.length()) {
                val schedule = schedulesJsonArray.getJSONObject(i)
                if (schedule.getString("packageName") == packageName) {
                    val startHour = schedule.getInt("startHour")
                    val startMinute = schedule.getInt("startMinute")
                    val endHour = schedule.getInt("endHour")
                    val endMinute = schedule.getInt("endMinute")
                    
                    val startTimeMinutes = startHour * 60 + startMinute
                    val endTimeMinutes = endHour * 60 + endMinute
                    val currentTimeMinutes = currentHour * 60 + currentMinute
                    
                    if (startTimeMinutes < endTimeMinutes) {
                        // Normal range (e.g., 9:00 to 17:00)
                        if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
                            return true
                        }
                    } else {
                        // Overnight range (e.g., 22:00 to 8:00)
                        if (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes) {
                            return true
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking app schedule: ${e.message}", e)
        }
        
        return false
    }

    /**
     * Update the notification manually
     * This can be called from other components to ensure the notification is visible
     */
    fun updateNotification() {
        Log.d(TAG, "Manually updating notification")
        try {
            val channelId = "AppLockService"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Check if Pomodoro is active for notification update
            val isPomodoroActive = isPomodoroModeActive()
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            
            val title = if (isPomodoroActive) "Pomodoro Focus Mode Active" else "App Lock Active"
            val text = if (isPomodoroActive) {
                if (excludedApps.isNotEmpty()) {
                    "Most apps blocked • ${excludedApps.size} apps excluded"
                } else {
                    "All apps are blocked during focus session"
                }
            } else {
                "Monitoring apps for your security"
            }
            val icon = if (isPomodoroActive) android.R.drawable.ic_media_pause else android.R.drawable.ic_lock_lock
            
            // Create a refreshed notification
            val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }.apply {
                setContentTitle(title)
                setContentText(text)
                setSmallIcon(icon)
                setOngoing(true)
                
                // For pre-O versions
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    setPriority(Notification.PRIORITY_MAX)
                }
                
                // Add current timestamp to ensure the system treats this as a new notification
                setWhen(System.currentTimeMillis())
                
                // Set more persistent flags
                setCategory(Notification.CATEGORY_SERVICE)
                setVisibility(Notification.VISIBILITY_PUBLIC)
                
                // Create an explicit intent for the main activity
                val pendingIntent = PendingIntent.getActivity(
                    this@AppLockService,
                    0,
                    Intent(this@AppLockService, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setContentIntent(pendingIntent)
                
                // Add auto-cancel = false to prevent easy dismissal
                setAutoCancel(false)
            }.build()
            
            // Update notification directly
            notificationManager.notify(NOTIFICATION_ID, notification)
            
            Log.d(TAG, "Notification manually updated successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification manually: ${e.message}", e)
        }
    }
    
    /**
     * Check if app is currently blocked and take immediate action
     */
    fun checkAndBlockApp(packageName: String) {
        if (isAppLocked(packageName)) {
            Log.d(TAG, "Manual block check - app $packageName is locked")
            mainHandler.post {
                showLockScreen(packageName)
            }
        }
    }
}