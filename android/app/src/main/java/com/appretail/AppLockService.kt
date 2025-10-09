package com.wingsfly

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
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
import java.util.Calendar
import org.json.JSONArray
import java.util.concurrent.ConcurrentHashMap
import com.wingsfly.notification.UnifiedNotificationManager
import kotlin.random.Random

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
    
    // Unified notification manager
    private lateinit var notificationManager: UnifiedNotificationManager
    
    // Track blocked apps more aggressively
    private val blockedAppsTracker = ConcurrentHashMap<String, Long>()
    private var continuousMonitoringJob: Job? = null
    
    private val TAG = "AppLock"
    
    // More aggressive monitoring intervals
    private val FAST_CHECK_INTERVAL = 50L
    private val SLOW_CHECK_INTERVAL = 200L

    companion object {
        private const val SERVICE_ALARM_REQUEST_CODE = 1234
        private const val SERVICE_CHECK_INTERVAL = 60 * 1000L
        
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
            
            // Initialize unified notification manager
            notificationManager = UnifiedNotificationManager.getInstance(this)
            
            startForeground()
            startAppMonitoring()
            startContinuousMonitoring()
            
            scheduleServiceAlarm(this)
            
            Log.d("AppLock", "Service initialized successfully")
        } catch (e: Exception) {
            Log.e("AppLock", "Error in onCreate: ${e.message}", e)
        }
    }

    private fun startForeground() {
        try {
            Log.d(TAG, "Starting foreground service")
            
            // Get notification from unified manager
            val notification = notificationManager.showForegroundNotification(this)
            
            // Start foreground
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(1000, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(1000, notification)
            }
            
            Log.d(TAG, "Foreground service started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }
    }

    private fun isPomodoroModeActive(): Boolean {
        val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
        val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
        return isPomodoroMode && !isPaused
    }

    private fun shouldBlockAllAppsForPomodoro(packageName: String): Boolean {
        if (!isPomodoroModeActive()) {
            return false
        }
        
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
            applicationContext.packageName
        )
        
        if (neverBlockApps.contains(packageName)) {
            Log.d(TAG, "App $packageName is in never-block list for Pomodoro")
            return false
        }
        
        val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
        if (excludedApps.contains(packageName)) {
            Log.d(TAG, "App $packageName is excluded from Pomodoro blocking")
            return false
        }
        
        try {
            val packageManager = applicationContext.packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            if ((appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0) {
                Log.d(TAG, "App $packageName is system app, not blocking")
                return false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if app is system app: ${e.message}", e)
            return false
        }
        
        Log.d(TAG, "App $packageName should be blocked in Pomodoro mode")
        return true
    }

    private fun handlePomodoroCommands(intent: Intent) {
        val command = intent.getStringExtra("command")
        Log.d(TAG, "Received Pomodoro command: $command")
        
        when (command) {
            "start_pomodoro" -> {
                Log.d(TAG, "Starting Pomodoro blocking mode")
                // Notify unified manager - it will update immediately (bypass rate limit)
                notificationManager.onPomodoroStateChanged()
            }
            "stop_pomodoro" -> {
                Log.d(TAG, "Stopping Pomodoro blocking mode")
                if (isLockViewShowing()) {
                    mainHandler.post { removeLockScreen() }
                }
                // Notify unified manager
                notificationManager.onPomodoroStateChanged()
            }
            "pause_pomodoro" -> {
                Log.d(TAG, "Pausing Pomodoro blocking mode")
                if (isLockViewShowing()) {
                    mainHandler.post { removeLockScreen() }
                }
                notificationManager.onPomodoroStateChanged()
            }
            "resume_pomodoro" -> {
                Log.d(TAG, "Resuming Pomodoro blocking mode")
                notificationManager.onPomodoroStateChanged()
            }
            "refresh_exclusion_list" -> {
                Log.d(TAG, "Refreshing Pomodoro exclusion list")
                refreshPomodoroExclusionList()
            }
        }
    }

    fun refreshPomodoroExclusionList() {
        try {
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            Log.d(TAG, "Refreshed Pomodoro exclusion list: ${excludedApps.joinToString()}")
            
            if (isPomodoroModeActive()) {
                notificationManager.onPomodoroStateChanged()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing Pomodoro exclusion list: ${e.message}", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand called with flags: $flags, startId: $startId")
        
        try {
            if (intent != null) {
                handlePomodoroCommands(intent)
                
                // Handle notification refresh request (respects rate limiting)
                val refreshNotification = intent.getBooleanExtra("refresh_notification", false)
                if (refreshNotification) {
                    Log.d(TAG, "Notification refresh requested")
                    notificationManager.updateNotification(bypassRateLimit = false)
                }
            }
            
            val isRestart = flags == START_FLAG_REDELIVERY || flags == START_FLAG_RETRY

            if (isRestart || !isServiceRunning) {
                Log.d(TAG, "Initial start or restarting")
                startForeground()
                isServiceRunning = true
            }
            
            if (!::serviceJob.isInitialized || serviceJob.isCancelled) {
                startAppMonitoring()
            }
            
            if (continuousMonitoringJob?.isActive != true) {
                startContinuousMonitoring()
            }
            
            scheduleServiceAlarm(this)
            
            Log.d(TAG, "AppLockService started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onStartCommand", e)
            
            try {
                if (!isServiceRunning) {
                    startForeground()
                    isServiceRunning = true
                }
            } catch (e2: Exception) {
                Log.e(TAG, "Recovery notification failed", e2)
            }
        }
        
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
                    checkForBlockedApps()
                    delay(SLOW_CHECK_INTERVAL)
                }
            } catch (e: Exception) {
                Log.e("AppLock", "Error in continuous monitoring: ${e.message}", e)
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
                
                if (currentTime - lastBlockTime < 1000) {
                    Log.d("AppLock", "Blocked app $currentApp detected again, forcing close")
                    mainHandler.post { forceCloseApp(currentApp) }
                } else if (currentApp != currentLockedApp) {
                    Log.d("AppLock", "New blocked app detected: $currentApp")
                    blockedAppsTracker[currentApp] = currentTime
                    mainHandler.post { showLockScreen(currentApp) }
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
                
                if (isAppLocked(currentApp)) {
                    Log.d("AppLock", "App $currentApp is locked, showing lock screen")
                    blockedAppsTracker[currentApp] = time
                    mainHandler.post { showLockScreen(currentApp) }
                } 
                else if (isLockViewShowing() && !isAppLocked(currentApp)) {
                    mainHandler.post { removeLockScreen() }
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
            val startTime = endTime - 2000
            
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
        
        if (lockedApps.contains(packageName)) {
            Log.d(TAG, "$packageName is manually locked")
            
            if (hasSchedule(packageName)) {
                val shouldLock = shouldLockBySchedule(packageName)
                Log.d(TAG, "$packageName schedule check result: shouldLock=$shouldLock")
                return shouldLock
            }
            
            return true
        }
        
        if (hasSchedule(packageName)) {
            val shouldLock = shouldLockBySchedule(packageName)
            Log.d(TAG, "$packageName is not manually locked, schedule check: shouldLock=$shouldLock")
            return shouldLock
        }
        
        return false
    }

    private fun isAppUsageLimitReached(packageName: String): Boolean {
        val prefs = sharedPreferences
        val limitMinutes = prefs.getLong("usage_limit_$packageName", 0L)
        
        if (limitMinutes <= 0) return false
        
        val todayDate = getTodayDateString()
        val savedDate = prefs.getString("usage_date_$packageName", "")
        
        if (savedDate != todayDate) {
            prefs.edit()
                .putLong("usage_today_$packageName", 0L)
                .putString("usage_date_$packageName", todayDate)
                .putBoolean("usage_limit_reached_$packageName", false)
                .apply()
            return false
        }
        
        val isLimitReached = prefs.getBoolean("usage_limit_reached_$packageName", false)
        if (isLimitReached) {
            Log.d(TAG, "$packageName usage limit reached flag is set")
            return true
        }
        
        val usageToday = prefs.getLong("usage_today_$packageName", 0L)
        if (usageToday >= limitMinutes) {
            Log.d(TAG, "$packageName usage limit exceeded: ${usageToday}min >= ${limitMinutes}min")
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
            
            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            
            Log.d("AppLock", "Checking schedules for $packageName")
            Log.d("AppLock", "Current time: $currentHour:$currentMinute")
            
            var hasUnlockSchedule = false
            
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                if (!scheduleJson.getBoolean("enabled")) continue
                val scheduleType = scheduleJson.getString("type")
                if (scheduleType == "unlock") {
                    hasUnlockSchedule = true
                    break
                }
            }
            
            if (hasUnlockSchedule) {
                Log.d("AppLock", "$packageName has UNLOCK schedules")
                var isInUnlockRange = false
                
                for (i in 0 until schedulesJsonArray.length()) {
                    val scheduleJson = schedulesJsonArray.getJSONObject(i)
                    if (!scheduleJson.getBoolean("enabled") || scheduleJson.getString("type") != "unlock") continue
                    
                    val timeRangesJson = scheduleJson.getJSONArray("timeRanges")
                    
                    for (j in 0 until timeRangesJson.length()) {
                        val timeRangeJson = timeRangesJson.getJSONObject(j)
                        val startHour = timeRangeJson.getInt("startHour")
                        val startMinute = timeRangeJson.getInt("startMinute")
                        val endHour = timeRangeJson.getInt("endHour")
                        val endMinute = timeRangeJson.getInt("endMinute")
                        val days = timeRangeJson.getJSONArray("days")
                        
                        val daysList = mutableListOf<Int>()
                        for (k in 0 until days.length()) {
                            daysList.add(days.getInt(k))
                        }
                        
                        val inRange = isInTimeRange(startHour, startMinute, endHour, endMinute, daysList)
                        
                        if (inRange) {
                            Log.d("AppLock", "$packageName is in UNLOCK time range")
                            isInUnlockRange = true
                            break
                        }
                    }
                    
                    if (isInUnlockRange) break
                }
                
                val shouldLock = !isInUnlockRange
                Log.d("AppLock", "UNLOCK decision: shouldLock=$shouldLock")
                return shouldLock
            }
            
            Log.d("AppLock", "$packageName has no UNLOCK schedules - checking LOCK schedules")
            var isInLockRange = false
            
            for (i in 0 until schedulesJsonArray.length()) {
                val scheduleJson = schedulesJsonArray.getJSONObject(i)
                if (!scheduleJson.getBoolean("enabled")) continue
                val scheduleType = scheduleJson.getString("type")
                
                if (scheduleType == "lock") {
                    val timeRangesJson = scheduleJson.getJSONArray("timeRanges")
                    
                    for (j in 0 until timeRangesJson.length()) {
                        val timeRangeJson = timeRangesJson.getJSONObject(j)
                        val startHour = timeRangeJson.getInt("startHour")
                        val startMinute = timeRangeJson.getInt("startMinute")
                        val endHour = timeRangeJson.getInt("endHour")
                        val endMinute = timeRangeJson.getInt("endMinute")
                        val days = timeRangeJson.getJSONArray("days")
                        
                        val daysList = mutableListOf<Int>()
                        for (k in 0 until days.length()) {
                            daysList.add(days.getInt(k))
                        }
                        
                        val inRange = isInTimeRange(startHour, startMinute, endHour, endMinute, daysList)
                        
                        if (inRange) {
                            Log.d("AppLock", "$packageName is in LOCK time range")
                            isInLockRange = true
                            break
                        }
                    }
                    
                    if (isInLockRange) break
                }
            }
            
            Log.d("AppLock", "LOCK decision: shouldLock=$isInLockRange")
            return isInLockRange
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking schedule: ${e.message}", e)
            return false
        }
    }
    
    private fun isInTimeRange(startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, days: List<Int>): Boolean {
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentMinute = calendar.get(Calendar.MINUTE)
        val currentDay = calendar.get(Calendar.DAY_OF_WEEK) - 1
        
        if (days.isEmpty() || (days.size == 7 && days.containsAll(listOf(0, 1, 2, 3, 4, 5, 6)))) {
            // Everyday
        } else if (!days.contains(currentDay)) {
            return false
        }
        
        val currentTimeMinutes = currentHour * 60 + currentMinute
        val startTimeMinutes = startHour * 60 + startMinute
        val endTimeMinutes = endHour * 60 + endMinute
        
        return if (startTimeMinutes > endTimeMinutes) {
            currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes
        } else {
            currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes
        }
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

    private fun showLockScreen(packageName: String) {
        try {
            Log.d("AppLock", "Showing lock screen for $packageName")
            
            val isPomodoroActive = isPomodoroModeActive()
            val excludedApps = sharedPreferences.getStringSet("pomodoro_excluded_apps", setOf()) ?: setOf()
            val isExcludedFromPomodoro = excludedApps.contains(packageName)
            
            if (isLockViewShowing()) {
                try {
                    windowManager.removeView(lockView)
                    Log.d("AppLock", "Removed existing lock view")
                } catch (e: Exception) {
                    Log.e("AppLock", "Error removing existing lock view: ${e.message}", e)
                }
            }
            
            currentLockedApp = packageName
            forceCloseApp(packageName)
            
            val packageManager = applicationContext.packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            val appNameLabel = packageManager.getApplicationLabel(appInfo).toString()
            val appIconDrawable = packageManager.getApplicationIcon(appInfo)
            
            val inflater = LayoutInflater.from(this)
            lockView = inflater.inflate(R.layout.lock_screen, FrameLayout(this), false)
            
            val appName = lockView!!.findViewById<TextView>(R.id.appName)
            val lockMessage = lockView!!.findViewById<TextView>(R.id.lockMessage)
            val timerText = lockView!!.findViewById<TextView>(R.id.timerText)
            val appIcon = lockView!!.findViewById<ImageView>(R.id.appIcon)
            
            appName.text = appNameLabel
            appIcon.setImageDrawable(appIconDrawable)
            timerText.visibility = View.GONE
            
            val motivationalQuote = getMotivationalQuote()
            if (isPomodoroActive && !isExcludedFromPomodoro) {
                lockMessage.text = "Pomodoro Focus Mode Active!\n$motivationalQuote\n\n$appNameLabel is blocked during your focus session"
            } else if (isPomodoroActive && isExcludedFromPomodoro) {
                lockMessage.text = "$motivationalQuote\n\nThis app has other restrictions active"
            } else {
                lockMessage.text = "$motivationalQuote\n\n$appNameLabel is currently blocked"
            }
            
            val closeButton = lockView!!.findViewById<Button>(R.id.closeButton)
            closeButton.text = "OK"
            closeButton.setOnClickListener {
                try {
                    Log.d("AppLock", "Close button clicked")
                    removeLockScreen()
                    goToHomeScreen()
                } catch (e: Exception) {
                    Log.e("AppLock", "Error removing lock screen: ${e.message}", e)
                }
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
                        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            )
            
            try {
                windowManager.addView(lockView, params)
                Log.d("AppLock", "Lock screen overlay added")
            } catch (e: Exception) {
                Log.e("AppLock", "Error adding lock screen: ${e.message}", e)
            }
            
            mainHandler.postDelayed({
                forceCloseAppAndGoHome(packageName)
            }, 100)
            
            val dismissDelay = if (isPomodoroActive) 3000L else 2000L
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
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            activityManager.killBackgroundProcesses(packageName)
            goToHomeScreen()
        } catch (e: Exception) {
            Log.e("AppLock", "Error force closing app: ${e.message}", e)
        }
    }
    
    private fun forceCloseAppAndGoHome(packageName: String) {
        try {
            forceCloseApp(packageName)
            goToHomeScreen()
            
            mainHandler.postDelayed({
                val currentApp = getCurrentForegroundApp()
                if (currentApp == packageName) {
                    Log.d("AppLock", "App still running, forcing close again")
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
        } catch (e: Exception) {
            Log.e("AppLock", "Error going to home: ${e.message}", e)
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

    private fun isLockViewShowing(): Boolean {
        return lockView != null && lockView?.parent != null
    }

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
            
            if (isLockViewShowing()) {
                removeLockScreen()
            }
            
            Log.d("AppLock", "Service destroyed")
        } catch (e: Exception) {
            Log.e("AppLock", "Error in onDestroy: ${e.message}", e)
        }
    }

    fun updateNotification() {
        Log.d(TAG, "Manual notification update requested")
        notificationManager.updateNotification(bypassRateLimit = false)
    }
    
    fun checkAndBlockApp(packageName: String) {
        if (isAppLocked(packageName)) {
            Log.d(TAG, "Manual block check - app $packageName is locked")
            mainHandler.post {
                showLockScreen(packageName)
            }
        }
    }
}