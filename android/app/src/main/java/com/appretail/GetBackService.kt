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

/**
 * Digital Detox Method: Service monitors apps and relaunches overlay
 * More reliable than kiosk mode
 */
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
    private var lastCheck = 0L
    
    // Digital Detox monitoring - checks every 200ms
    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (isServiceRunning) {
                checkTimeAndRelaunch()
                blockUnauthorizedApps()
                handler.postDelayed(this, 200)
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🔒 Get Back Service created (Digital Detox method)")
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        isServiceRunning = true
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "🔒 Get Back Service started")
        
        getBackDurationMinutes = intent?.getIntExtra("duration_minutes", 5) ?: 5
        getBackStartTime = System.currentTimeMillis()
        
        // Start as foreground but hide notification
        createMinimalNotificationChannel()
        startForeground(NOTIFICATION_ID, createMinimalNotification())
        
        // Hide notification after starting foreground
        handler.postDelayed({
            try {
                val nm = getSystemService(NotificationManager::class.java)
                nm?.cancel(NOTIFICATION_ID)
            } catch (e: Exception) { }
        }, 100)
        
        // Start monitoring
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
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_SECRET
                enableVibration(false)
                enableLights(false)
                setSound(null, null)
            }
            
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
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
                .setVisibility(Notification.VISIBILITY_SECRET)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Get Back")
                .setPriority(Notification.PRIORITY_MIN)
                .build()
        }
    }
    
    /**
     * Digital Detox Method: Check if time is up, then check foreground app
     */
    private fun checkTimeAndRelaunch() {
        try {
            // Check if session time completed
            val elapsed = (System.currentTimeMillis() - getBackStartTime) / 1000
            if (elapsed >= getBackDurationMinutes * 60) {
                Log.d(TAG, "✅ Get Back session completed")
                stopGetBack()
                return
            }
            
            // Throttle checks
            val now = System.currentTimeMillis()
            if (now - lastCheck < 150) return
            lastCheck = now
            
            // Check if lock activity is in foreground
            if (!isLockActivityForeground()) {
                Log.d(TAG, "⚠️ Lock not in foreground, relaunching")
                relaunchLockActivity()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in monitoring", e)
        }
    }
    
    /**
     * Digital Detox Method: Block any unauthorized app from staying in foreground
     */
    private fun blockUnauthorizedApps() {
        try {
            val currentPackage = getCurrentForegroundPackage()
            
            if (currentPackage.isNotEmpty() && currentPackage != packageName) {
                Log.d(TAG, "🚫 Blocking unauthorized app: $currentPackage")
                relaunchLockActivity()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error blocking apps", e)
        }
    }
    
    /**
     * Get current foreground package using UsageStats
     */
    private fun getCurrentForegroundPackage(): String {
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
            
            return foregroundPackage
        } catch (e: Exception) {
            return ""
        }
    }
    
    /**
     * Check if our lock activity is in foreground
     */
    private fun isLockActivityForeground(): Boolean {
        try {
            val currentPackage = getCurrentForegroundPackage()
            return currentPackage == packageName
        } catch (e: Exception) {
            return false
        }
    }
    
    /**
     * Digital Detox Method: Relaunch lock activity to bring it back
     */
    private fun relaunchLockActivity() {
        try {
            val remainingSeconds = (getBackDurationMinutes * 60) - 
                ((System.currentTimeMillis() - getBackStartTime) / 1000)
            val remainingMinutes = (remainingSeconds / 60).toInt().coerceAtLeast(1)
            
            val intent = Intent(this, GetBackLockActivity::class.java)
            intent.putExtra("duration_minutes", remainingMinutes)
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or 
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            )
            
            startActivity(intent)
            Log.d(TAG, "✅ Lock activity relaunched")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error relaunching activity", e)
        }
    }
    
    /**
     * Stop the Get Back session
     */
    private fun stopGetBack() {
        isServiceRunning = false
        handler.removeCallbacks(monitorRunnable)
        
        // Notify activity to stop
        val stopIntent = Intent("com.wingsfly.STOP_GET_BACK")
        sendBroadcast(stopIntent)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        
        stopSelf()
        Log.d(TAG, "✅ Get Back service stopped")
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        if (isServiceRunning) {
            Log.d(TAG, "⚠️ Task removed, restarting service")
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
        Log.d(TAG, "🔒 Get Back Service destroyed")
    }
}