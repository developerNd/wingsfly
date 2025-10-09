package com.wingsfly

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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
        var detoxDurationMinutes = 0
        var detoxStartTime = 0L
        
        // Store media information
        var mediaFilePath: String? = null
        var mediaType: String? = null
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
        Log.d(TAG, "Service created")
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        isServiceRunning = true
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        
        detoxDurationMinutes = intent?.getIntExtra("duration_minutes", 5) ?: 5
        detoxStartTime = System.currentTimeMillis()
        
        // Store media information from intent
        mediaFilePath = intent?.getStringExtra("media_file_path")
        mediaType = intent?.getStringExtra("media_type")
        
        Log.d(TAG, "Media path: $mediaFilePath, Media type: $mediaType")
        
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
                "Digital Detox",
                NotificationManager.IMPORTANCE_MIN // Minimal importance
            ).apply {
                description = "Digital Detox Active"
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
                .setContentTitle("Digital Detox")
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
                .setContentTitle("Digital Detox")
                .setContentText("Active")
                .setPriority(Notification.PRIORITY_MIN)
                .setOngoing(false)
                .setAutoCancel(true)
                .build()
        }
    }
    
    private fun blockAllApps() {
        try {
            // Get foreground app
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
            
            // If any app other than our lock activity is in foreground, block it
            // INCLUDING phone/dialer apps during call
            if (foregroundPackage.isNotEmpty() && foregroundPackage != packageName) {
                Log.d(TAG, "Blocking app: $foregroundPackage")
                relaunchDetoxActivity()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in app blocking", e)
        }
    }
    
    private fun isSystemApp(packageName: String): Boolean {
        // During detox, block ALL apps including phone/dialer
        // No exceptions - complete lock mode
        return false
    }
    
    private fun checkAndRelaunchActivity() {
        try {
            // Check if time is up
            val elapsed = (System.currentTimeMillis() - detoxStartTime) / 1000
            if (elapsed >= detoxDurationMinutes * 60) {
                Log.d(TAG, "Detox time completed, stopping service")
                stopDetox()
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
                relaunchDetoxActivity()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in monitoring: ${e.message}", e)
        }
    }
    
    private fun isLockActivityInForeground(): Boolean {
        try {
            // Check using ActivityManager
            val tasks = activityManager.appTasks
            if (tasks.isNotEmpty()) {
                val topActivity = tasks[0].taskInfo.topActivity
                if (topActivity?.className == DigitalDetoxLockActivity::class.java.name) {
                    return true
                }
            }
            
            // Check using UsageStats
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
    
    private fun relaunchDetoxActivity() {
        try {
            val remainingSeconds = (detoxDurationMinutes * 60) - ((System.currentTimeMillis() - detoxStartTime) / 1000)
            val remainingMinutes = (remainingSeconds / 60).toInt().coerceAtLeast(1)
            
            val intent = Intent(this, DigitalDetoxLockActivity::class.java)
            intent.putExtra("duration_minutes", remainingMinutes)
            
            // Pass media information to the lock activity
            mediaFilePath?.let { intent.putExtra("media_file_path", it) }
            mediaType?.let { intent.putExtra("media_type", it) }
            
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or 
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_NO_ANIMATION or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            )
            
            startActivity(intent)
            Log.d(TAG, "Relaunched detox activity with media info")
        } catch (e: Exception) {
            Log.e(TAG, "Error relaunching activity", e)
        }
    }
    
    private fun stopDetox() {
        isServiceRunning = false
        handler.removeCallbacks(monitorRunnable)
        
        // Clear media information
        mediaFilePath = null
        mediaType = null
        
        // Send stop broadcast to activity
        val stopIntent = Intent("com.wingsfly.STOP_DIGITAL_DETOX")
        sendBroadcast(stopIntent)
        
        // Stop foreground and remove notification
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
            Log.d(TAG, "Task removed but detox is active, restarting service")
            val restartIntent = Intent(applicationContext, DigitalDetoxService::class.java)
            restartIntent.putExtra("duration_minutes", detoxDurationMinutes)
            
            // Preserve media information when restarting
            mediaFilePath?.let { restartIntent.putExtra("media_file_path", it) }
            mediaType?.let { restartIntent.putExtra("media_type", it) }
            
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
        Log.d(TAG, "Service destroyed")
    }
}