package com.wingsfly

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.util.Log

class GetBackService : Service() {
    
    companion object {
        private const val TAG = "GetBackService"
        private const val NOTIFICATION_ID = 9998
        private const val CHANNEL_ID = "get_back_channel"
        
        var isServiceRunning = false
        var getBackDurationMinutes = 0
        var getBackStartTime = 0L
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var activityManager: ActivityManager
    private var lastForegroundCheck = 0L
    
    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (isServiceRunning) {
                checkAndRelaunchActivity()
                blockAllApps()
                handler.postDelayed(this, 300) // Aggressive check every 300ms
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Get Back Service created")
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        isServiceRunning = true
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Get Back Service started")
        
        getBackDurationMinutes = intent?.getIntExtra("duration_minutes", 5) ?: 5
        getBackStartTime = System.currentTimeMillis()
        
        // Start foreground without persistent notification
        createMinimalNotificationChannel()
        startForeground(NOTIFICATION_ID, createMinimalNotification())
        
        // Immediately cancel the notification after starting foreground
        handler.postDelayed({
            try {
                val notificationManager = getSystemService(NotificationManager::class.java)
                notificationManager?.cancel(NOTIFICATION_ID)
            } catch (e: Exception) {
                Log.e(TAG, "Error canceling notification", e)
            }
        }, 100)
        
        handler.post(monitorRunnable)
        
        return START_STICKY
    }
    
    private fun createMinimalNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Get Back",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Get Back Active"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_SECRET
                enableVibration(false)
                enableLights(false)
                setSound(null, null)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createMinimalNotification(): Notification {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Get Back")
                .setContentText("Active")
                .setPriority(Notification.PRIORITY_MIN)
                .setOngoing(false)
                .setAutoCancel(true)
                .setVisibility(Notification.VISIBILITY_SECRET)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Get Back")
                .setContentText("Active")
                .setPriority(Notification.PRIORITY_MIN)
                .setOngoing(false)
                .setAutoCancel(true)
                .build()
        }
    }
    
    private fun blockAllApps() {
        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 500
            
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()
            var foregroundPackage = ""

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    foregroundPackage = event.packageName
                }
            }
            
            if (foregroundPackage.isNotEmpty() && foregroundPackage != packageName) {
                Log.d(TAG, "Blocking app: $foregroundPackage")
                relaunchGetBackActivity()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in app blocking", e)
        }
    }
    
    private fun checkAndRelaunchActivity() {
        try {
            // Check if time is up
            val elapsed = (System.currentTimeMillis() - getBackStartTime) / 1000
            if (elapsed >= getBackDurationMinutes * 60) {
                Log.d(TAG, "Get Back time completed, stopping service")
                stopGetBack()
                return
            }
            
            // Throttle checks
            val now = System.currentTimeMillis()
            if (now - lastForegroundCheck < 200) {
                return
            }
            lastForegroundCheck = now
            
            // Check if our lock activity is in foreground
            if (!isLockActivityInForeground()) {
                Log.d(TAG, "Lock activity not in foreground, relaunching")
                relaunchGetBackActivity()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in monitoring: ${e.message}", e)
        }
    }
    
    private fun isLockActivityInForeground(): Boolean {
        try {
            val tasks = activityManager.appTasks
            if (tasks.isNotEmpty()) {
                val topActivity = tasks[0].taskInfo.topActivity
                if (topActivity?.className == GetBackLockActivity::class.java.name) {
                    return true
                }
            }
            
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 1000
            
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()
            var currentPackage = ""

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    currentPackage = event.packageName
                }
            }
            
            return currentPackage == packageName
        } catch (e: Exception) {
            Log.e(TAG, "Error checking foreground activity", e)
            return false
        }
    }
    
    private fun relaunchGetBackActivity() {
        try {
            val remainingSeconds = (getBackDurationMinutes * 60) - ((System.currentTimeMillis() - getBackStartTime) / 1000)
            val remainingMinutes = (remainingSeconds / 60).toInt().coerceAtLeast(1)
            
            val intent = Intent(this, GetBackLockActivity::class.java)
            intent.putExtra("duration_minutes", remainingMinutes)
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or 
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_NO_ANIMATION or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            )
            
            startActivity(intent)
            Log.d(TAG, "Relaunched Get Back activity")
        } catch (e: Exception) {
            Log.e(TAG, "Error relaunching activity", e)
        }
    }
    
    private fun stopGetBack() {
        isServiceRunning = false
        handler.removeCallbacks(monitorRunnable)
        
        val stopIntent = Intent("com.wingsfly.STOP_GET_BACK")
        sendBroadcast(stopIntent)
        
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
        if (isServiceRunning) {
            Log.d(TAG, "Task removed but Get Back is active, restarting service")
            val restartIntent = Intent(applicationContext, GetBackService::class.java)
            restartIntent.putExtra("duration_minutes", getBackDurationMinutes)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(restartIntent)
            } else {
                startService(restartIntent)
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(monitorRunnable)
        Log.d(TAG, "Get Back Service destroyed")
    }
}