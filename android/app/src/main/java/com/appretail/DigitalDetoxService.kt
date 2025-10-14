package com.wingsfly

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.util.Log

class DigitalDetoxService : Service() {
    
    companion object {
        private const val TAG = "DetoxService"
        private const val NOTIFICATION_ID = 9999
        private const val CHANNEL_ID = "digital_detox_channel"
        
        var isServiceRunning = false
        var detoxDurationMinutes: Int = 0
        var detoxStartTime: Long = 0L
        var mediaFilePath: String? = null
        var mediaType: String? = null
        
        private const val PREFS_NAME = "DetoxPrefs"
        private const val KEY_DETOX_END_TIME = "detox_end_time"
        private const val KEY_DETOX_ACTIVE = "detox_active"
        private const val KEY_SERVICE_PID = "service_pid"
        private const val IMMEDIATE_RELOCK_ACTION = "com.wingsfly.IMMEDIATE_RELOCK"

        private const val KEY_RELOCK_IN_PROGRESS = "relock_in_progress_until"

// Add to class variables
private var isMonitoringPaused = false
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var activityManager: ActivityManager
    private lateinit var prefs: SharedPreferences
    private var lastForegroundCheck = 0L
    private var lastForegroundPackage = ""
    private var consecutiveMainActivityChecks = 0
    private var isMonitoring = false
    private var wasMainActivityVisible = false
    
    // ✅ NEW: Grace period - don't monitor immediately after unlock
    private var lastUnlockTime = 0L
    private val UNLOCK_GRACE_PERIOD = 3000L // 3 seconds grace after unlock
    
    // ✅ FIX: Debounce relock trigger
    private var lastRelockTime = 0L
    private val RELOCK_DEBOUNCE = 3000L
    
    // ✅ NEW: Track if MainActivity has properly gained focus
    private var hasMainActivityGainedFocus = false
    
    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (isMonitoring) {
                checkDetoxStatus()
                handler.postDelayed(this, 1000) // Check every 1 second
            }
        }
    }

    private val immediateRelockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "📥 IMMEDIATE RELOCK BROADCAST")
            
            val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
            val detoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
            
            if (detoxActive && detoxEndTime > System.currentTimeMillis()) {
                Log.d(TAG, "✅ Detox still active - executing relock")
                handler.post { relockDetoxActivityImmediately(detoxEndTime) }
            } else {
                Log.d(TAG, "⚠️ Detox not active - ignoring relock")
            }
        }
    }
    
    // ✅ NEW: Receiver to track when MainActivity gains focus
    private val mainActivityFocusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "📱 MainActivity gained focus - starting monitoring")
            hasMainActivityGainedFocus = true
            lastUnlockTime = System.currentTimeMillis()
        }
    }
    
   override fun onCreate() {
    super.onCreate()
    val myPid = android.os.Process.myPid()
    Log.d(TAG, "========================================")
    Log.d(TAG, "🆕 onCreate - PID: $myPid")
    Log.d(TAG, "========================================")
    
    usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    prefs.edit().putInt(KEY_SERVICE_PID, myPid).apply()
    
    val savedEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
    val savedActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
    Log.d(TAG, "📋 Prefs: active=$savedActive, endTime=$savedEndTime")
    
    // Register all receivers
    val filter = IntentFilter(IMMEDIATE_RELOCK_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(immediateRelockReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
        registerReceiver(immediateRelockReceiver, filter)
    }
    
    val focusFilter = IntentFilter("com.wingsfly.MAINACTIVITY_FOCUSED")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(mainActivityFocusReceiver, focusFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
        registerReceiver(mainActivityFocusReceiver, focusFilter)
    }
    
    // ✅ NEW: Register pause/resume receivers
    val pauseFilter = IntentFilter("com.wingsfly.PAUSE_MONITORING")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(pauseMonitoringReceiver, pauseFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
        registerReceiver(pauseMonitoringReceiver, pauseFilter)
    }
    
    val resumeFilter = IntentFilter("com.wingsfly.RESUME_MONITORING")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(resumeMonitoringReceiver, resumeFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
        registerReceiver(resumeMonitoringReceiver, resumeFilter)
    }
}
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "⚡ onStartCommand - PID: ${android.os.Process.myPid()}")
    
    val savedEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
    val isDetoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
    
    if (isDetoxActive && savedEndTime > System.currentTimeMillis()) {
        Log.d(TAG, "📱 Resuming detox")
        isServiceRunning = true
        detoxStartTime = savedEndTime - (intent?.getIntExtra("duration_minutes", 5) ?: 5) * 60 * 1000L
        detoxDurationMinutes = ((savedEndTime - detoxStartTime) / 60000).toInt()
    } else {
        Log.d(TAG, "🆕 New detox")
        detoxDurationMinutes = intent?.getIntExtra("duration_minutes", 5) ?: 5
        detoxStartTime = System.currentTimeMillis()
        isServiceRunning = true
    }
    
    mediaFilePath = intent?.getStringExtra("media_file_path") ?: mediaFilePath
    mediaType = intent?.getStringExtra("media_type") ?: mediaType
    
    createPersistentNotificationChannel()
    startForeground(NOTIFICATION_ID, createPersistentNotification())
    
    // ✅ CRITICAL FIX: Start monitoring immediately
    startMonitoring()
    
    return START_STICKY
}

private val pauseMonitoringReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "⏸️ PAUSE monitoring during relock")
        isMonitoringPaused = true
        stopMonitoring()
    }
}

private val resumeMonitoringReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "▶️ RESUME monitoring after relock")
        isMonitoringPaused = false
        handler.postDelayed({
            startMonitoring()
        }, 1000)
    }
}
    
    private fun startMonitoring() {
        if (!isMonitoring) {
            isMonitoring = true
            handler.removeCallbacks(monitorRunnable)
            handler.post(monitorRunnable)
            Log.d(TAG, "✅ Monitoring ON")
        }
    }
    
    private fun stopMonitoring() {
        isMonitoring = false
        handler.removeCallbacks(monitorRunnable)
        Log.d(TAG, "⏹️ Monitoring OFF")
    }
    
    private fun relockDetoxActivityImmediately(detoxEndTime: Long) {
        val now = System.currentTimeMillis()
        if (now - lastRelockTime < RELOCK_DEBOUNCE) {
            Log.d(TAG, "⏭️ Relock debounced - too soon")
            return
        }
        lastRelockTime = now
        
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "⚡ EXECUTING RELOCK")
            Log.d(TAG, "========================================")
            
            // Clear all unlock flags
            DigitalDetoxLockActivity.isAppUnlocked = false
            wasMainActivityVisible = false
            consecutiveMainActivityChecks = 0
            lastForegroundPackage = ""
            hasMainActivityGainedFocus = false
            
            val remainingMillis = detoxEndTime - System.currentTimeMillis()
            val remainingMinutes = (remainingMillis / 60000).toInt().coerceAtLeast(1)
            
            Log.d(TAG, "Remaining: ${remainingMillis}ms (${remainingMinutes}min)")
            
            // Close MainActivity
            val closeIntent = Intent("com.wingsfly.CLOSE_MAIN_ACTIVITY")
            sendBroadcast(closeIntent)
            
            // Wait then show lock
            handler.postDelayed({
                val intent = Intent(this, DigitalDetoxLockActivity::class.java)
                intent.putExtra("duration_minutes", remainingMinutes)
                mediaFilePath?.let { intent.putExtra("media_file_path", it) }
                mediaType?.let { intent.putExtra("media_type", it) }
                
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                
                startActivity(intent)
                
                // Send relock broadcast
                handler.postDelayed({
                    val relockIntent = Intent("com.wingsfly.RELOCK_DETOX")
                    sendBroadcast(relockIntent)
                }, 300)
                
                Log.d(TAG, "✅ Relock complete")
                Log.d(TAG, "========================================")
            }, 300)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Relock error: ${e.message}")
        }
    }
    
    private fun createPersistentNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Digital Detox",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(null, null)
            }
            
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
    
    private fun createPersistentNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        
        return builder
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("Detox Active")
            .setContentText("Monitoring")
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }
    
  private fun checkDetoxStatus() {
    try {
        // ✅ FIX: Check if relock is in progress
        val relockInProgressUntil = prefs.getLong(KEY_RELOCK_IN_PROGRESS, 0)
        val isRelockInProgress = relockInProgressUntil > System.currentTimeMillis()
        
        if (isRelockInProgress) {
            Log.d(TAG, "🔄 Relock in progress - skipping check (${relockInProgressUntil - System.currentTimeMillis()}ms remaining)")
            return
        }
        
        if (isMonitoringPaused) {
            Log.d(TAG, "⏸️ Monitoring paused")
            return
        }
        
        val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
        val isDetoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
        
        val currentTime = System.currentTimeMillis()
        val timeRemaining = detoxEndTime - currentTime
        
        if (detoxEndTime > 0 && currentTime >= detoxEndTime) {
            Log.d(TAG, "⏰ Timer expired! Stopping detox service")
            Log.d(TAG, "   End time was: $detoxEndTime")
            Log.d(TAG, "   Current time: $currentTime")
            Log.d(TAG, "   Expired by: ${-timeRemaining}ms")
            stopDetox()
            return
        }
        
        if (!isDetoxActive || detoxEndTime == 0L) {
            Log.d(TAG, "⚠️ Detox not active - stopping service")
            stopDetox()
            return
        }
        
        if (!hasMainActivityGainedFocus) {
            return
        }
        
        val timeSinceUnlock = System.currentTimeMillis() - lastUnlockTime
        if (timeSinceUnlock < UNLOCK_GRACE_PERIOD) {
            Log.d(TAG, "⏳ Grace period: ${timeSinceUnlock}ms")
            return
        }
        
        val now = System.currentTimeMillis()
        if (now - lastForegroundCheck < 800) return
        lastForegroundCheck = now
        
        checkIfUserInApp(detoxEndTime)
    } catch (e: Exception) {
        Log.e(TAG, "❌ Check error: ${e.message}")
    }
}


    private fun checkIfUserInApp(detoxEndTime: Long) {
        try {
            val runningTasks = activityManager.appTasks
            if (runningTasks.isEmpty()) return
            
            val topActivity = runningTasks[0].taskInfo.topActivity
            val currentPackage = topActivity?.packageName ?: ""
            val currentClass = topActivity?.className ?: ""
            
            // If lock screen is visible, reset tracking
            if (currentPackage == packageName && currentClass.contains("DigitalDetoxLockActivity")) {
                wasMainActivityVisible = false
                consecutiveMainActivityChecks = 0
                lastForegroundPackage = ""
                hasMainActivityGainedFocus = false
                return
            }
            
            // MainActivity is visible
            if (currentPackage == packageName && currentClass.contains("MainActivity")) {
                wasMainActivityVisible = true
                consecutiveMainActivityChecks++
                lastForegroundPackage = currentPackage
                
                // ✅ FIX: Need at least 3 checks (3 seconds) to confirm user is in app
                if (consecutiveMainActivityChecks < 3) {
                    Log.d(TAG, "⏳ MainActivity visible but confirming (check $consecutiveMainActivityChecks/3)")
                    return
                }
                return
            }
            
            // ✅ User left to another app
            if (currentPackage.isNotEmpty() && 
                currentPackage != packageName &&
                currentPackage != "com.android.systemui" &&
                wasMainActivityVisible &&
                consecutiveMainActivityChecks >= 3) {
                
                Log.d(TAG, "========================================")
                Log.d(TAG, "🚨 USER LEFT MAINACTIVITY TO: $currentPackage")
                Log.d(TAG, "   Was in app for: $consecutiveMainActivityChecks seconds")
                Log.d(TAG, "========================================")
                
                wasMainActivityVisible = false
                consecutiveMainActivityChecks = 0
                lastForegroundPackage = ""
                hasMainActivityGainedFocus = false
                
                relockDetoxActivityImmediately(detoxEndTime)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Check error: ${e.message}")
        }
    }
    
    private fun stopDetox() {
    Log.d(TAG, "🛑 STOP")
    
    stopMonitoring()
    
    isServiceRunning = false
    detoxDurationMinutes = 0
    detoxStartTime = 0L
    mediaFilePath = null
    mediaType = null
    lastForegroundPackage = ""
    consecutiveMainActivityChecks = 0
    wasMainActivityVisible = false
    hasMainActivityGainedFocus = false
    
    DigitalDetoxLockActivity.isAppUnlocked = false
    DigitalDetoxLockActivity.isLockActive = false
    
    // ✅ FIX: Use commit() for synchronous write
    val writeSuccess = prefs.edit().apply {
        remove(KEY_DETOX_END_TIME)
        remove(KEY_SERVICE_PID)
        putBoolean(KEY_DETOX_ACTIVE, false)
    }.commit() // Changed from apply() to commit()
    
    Log.d(TAG, "✅ Cleared detox prefs in service (write success: $writeSuccess)")
    
    sendBroadcast(Intent("com.wingsfly.STOP_DIGITAL_DETOX"))
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
    }
    
    stopSelf()
}
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "⚠️ TASK REMOVED - will restart")
        scheduleRestart()
    }
    
   override fun onDestroy() {
    Log.d(TAG, "⚠️ onDestroy - PID: ${android.os.Process.myPid()}")
    
    try {
        unregisterReceiver(immediateRelockReceiver)
        unregisterReceiver(mainActivityFocusReceiver)
        unregisterReceiver(pauseMonitoringReceiver)
        unregisterReceiver(resumeMonitoringReceiver)
    } catch (e: Exception) { }
    
    stopMonitoring()
    
    val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
    val isDetoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
    
    if (isDetoxActive && detoxEndTime > System.currentTimeMillis()) {
        Log.d(TAG, "🔄 Scheduling restart")
        scheduleRestart()
    }
    
    super.onDestroy()
}
    
    private fun scheduleRestart() {
        try {
            val detoxEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
            if (detoxEndTime <= System.currentTimeMillis()) return
            
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val restartIntent = Intent(applicationContext, ServiceRestartReceiver::class.java)
            
            val pendingIntent = PendingIntent.getBroadcast(
                applicationContext,
                0,
                restartIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + 1000,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + 1000,
                    pendingIntent
                )
            }
            
            Log.d(TAG, "✅ Restart scheduled")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Schedule error: ${e.message}")
        }
    }
}

class ServiceRestartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("RestartReceiver", "🔄 Restarting service")
        
        val prefs = context.getSharedPreferences("DetoxPrefs", Context.MODE_PRIVATE)
        val detoxEndTime = prefs.getLong("detox_end_time", 0)
        val isDetoxActive = prefs.getBoolean("detox_active", false)
        
        if (isDetoxActive && detoxEndTime > System.currentTimeMillis()) {
            val serviceIntent = Intent(context, DigitalDetoxService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            
            Handler(Looper.getMainLooper()).postDelayed({
                val remainingMinutes = ((detoxEndTime - System.currentTimeMillis()) / 60000).toInt().coerceAtLeast(1)
                val activityIntent = Intent(context, DigitalDetoxLockActivity::class.java)
                activityIntent.putExtra("duration_minutes", remainingMinutes)
                activityIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                context.startActivity(activityIntent)
            }, 500)
        }
    }
}