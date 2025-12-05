package com.wingsfly

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat

class BlockTimeVibrationService : Service() {

    companion object {
        private const val TAG = "BlockTimeVibrationService"
        private const val NOTIFICATION_ID = 9997
        private const val CHANNEL_ID = "block_time_vibration_service"
        
        // ✅ Single 5-second vibration (same as Night Mode)
        private const val VIBRATION_DURATION = 5000L // 5 seconds
        private const val PAUSE_DURATION = 5000L // 5 seconds pause between vibrations
        private const val TOTAL_VIBRATIONS = 3 // Only 3 vibrations, then STOP
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())
    private var currentVibration = 0
    private var isRunning = false
    
    // Task info for notification
    private var taskTitle: String = "Block Time Task"
    private var startTime: String = ""

    override fun onCreate() {
        super.onCreate()
        Log.e(TAG, "🔔 BlockTimeVibrationService created")
        
        createNotificationChannel()
        
        // ✅ Acquire wake lock for vibration sequence only (30 seconds is enough)
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "WingsFly::BlockTimeVibrationWakeLock"
        )
        wakeLock?.acquire(30000L) // 30 seconds
        
        Log.e(TAG, "🔒 Wake lock acquired for 30 seconds")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.e(TAG, "🚀 BlockTimeVibrationService started")
        
        taskTitle = intent?.getStringExtra("task_title") ?: "Block Time Task"
        startTime = intent?.getStringExtra("start_time") ?: ""
        
        Log.e(TAG, "Task: $taskTitle")
        Log.e(TAG, "Start time: $startTime")
        
        // Start foreground with notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        if (!isRunning) {
            isRunning = true
            startVibrationSequence()
        }
        
        return START_NOT_STICKY // Don't restart if killed
    }

    /**
     * ✅ Start the 3-vibration sequence - runs ONCE and stops
     */
    private fun startVibrationSequence() {
        Log.e(TAG, "")
        Log.e(TAG, "📳📳📳 Starting 3-vibration sequence...")
        Log.e(TAG, "   Pattern: 5s vibrate → 5s wait → 5s vibrate → 5s wait → 5s vibrate → STOP")
        Log.e(TAG, "")
        
        currentVibration = 0
        triggerNextVibration()
    }

    /**
     * ✅ Trigger vibrations one by one: 3 times total, then stop service
     */
    private fun triggerNextVibration() {
        if (currentVibration >= TOTAL_VIBRATIONS) {
            // ✅ All 3 vibrations completed - STOP SERVICE
            Log.e(TAG, "")
            Log.e(TAG, "✅✅✅ All 3 vibrations completed! ✅✅✅")
            Log.e(TAG, "   Service stopping now...")
            Log.e(TAG, "")
            stopSelfAndCleanup()
            return
        }

        currentVibration++
        Log.e(TAG, "📳 Vibration ${currentVibration}/3 - Starting now...")
        
        triggerSingleVibration()
        
        // ✅ Schedule next vibration
        if (currentVibration < TOTAL_VIBRATIONS) {
            // Wait 5s (vibration) + 5s (pause) = 10s before next vibration
            val delay = VIBRATION_DURATION + PAUSE_DURATION
            Log.e(TAG, "   ⏳ Waiting ${delay / 1000}s before next vibration...")
            
            handler.postDelayed({
                triggerNextVibration()
            }, delay)
        } else {
            // Last vibration - just wait for it to finish (5s) then stop
            Log.e(TAG, "   ⏳ This is the last vibration, stopping in 5s...")
            
            handler.postDelayed({
                triggerNextVibration() // This will trigger the stop
            }, VIBRATION_DURATION)
        }
    }

    /**
     * ✅ Trigger a single 5-second vibration
     */
    private fun triggerSingleVibration() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            
            if (vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Create a 5-second continuous vibration at maximum amplitude
                    val effect = VibrationEffect.createOneShot(
                        VIBRATION_DURATION,
                        VibrationEffect.DEFAULT_AMPLITUDE
                    )
                    vibrator.vibrate(effect)
                    Log.e(TAG, "   ✅ Vibrating for 5 seconds at max amplitude")
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(VIBRATION_DURATION)
                    Log.e(TAG, "   ✅ Vibrating for 5 seconds (Legacy API)")
                }
            } else {
                Log.w(TAG, "   ⚠️ Device does not have vibrator")
            }
        } catch (e: Exception) {
            Log.e(TAG, "   ❌ Failed to trigger vibration: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Block Time Vibration",
                NotificationManager.IMPORTANCE_LOW // Low importance - no sound/popup
            ).apply {
                description = "Block Time vibration service"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏰ Block Time - $taskTitle")
            .setContentText("Wake-up vibration active")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun stopSelfAndCleanup() {
        Log.e(TAG, "🧹 Cleaning up and stopping service...")
        
        isRunning = false
        handler.removeCallbacksAndMessages(null)
        
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
            Log.e(TAG, "🔓 Wake lock released")
        }
        
        stopForeground(true)
        stopSelf()
        
        Log.e(TAG, "✅ Service stopped successfully")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.e(TAG, "💀 BlockTimeVibrationService destroyed")
        
        handler.removeCallbacksAndMessages(null)
        
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock: ${e.message}")
        }
        
        isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? = null
}