package com.wingsfly

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.*

class BlockTimeAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BlockTimeAlarmReceiver"
        private val LONG_VIBRATION_PATTERN = longArrayOf(0, 1000, 500, 1000, 500, 1000)
        private const val CHANNEL_ID = "block_time_alarm_channel"
        private const val NOTIFICATION_ID_BASE = 8000
        
        private const val WAKE_LOCK_DURATION = 5 * 60 * 1000L // 5 minutes
        private var globalWakeLock: PowerManager.WakeLock? = null
        
        // ✅ Pre-create notification channel on app startup to avoid delay
        fun initializeNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                    val channel = NotificationChannel(
                        CHANNEL_ID,
                        "Block Time Alarm",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Block Time task alarms"
                        enableVibration(true)
                        vibrationPattern = LONG_VIBRATION_PATTERN
                        enableLights(true)
                        setShowBadge(true)
                        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                        setBypassDnd(true)
                    }
                    
                    notificationManager.createNotificationChannel(channel)
                    Log.d(TAG, "✅ Notification channel pre-created")
                }
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmTime = System.currentTimeMillis()
        Log.e(TAG, "========================================")
        Log.e(TAG, "🔥 ALARM FIRED at $alarmTime")
        Log.e(TAG, "========================================")

        val action = intent.action
        Log.e(TAG, "⏰ Action: $action")

        when (action) {
            BlockTimeSchedulerModule.ACTION_BLOCK_TIME_ALARM -> {
                // ✅ Use goAsync() to keep receiver alive while launching activity
                val pendingResult = goAsync()
                
                Thread {
                    try {
                        handleBlockTimeAlarmOptimized(context, intent, alarmTime)
                    } finally {
                        pendingResult.finish()
                    }
                }.start()
            }
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                handleBootCompleted(context)
            }
            else -> {
                Log.e(TAG, "⚠️ Unknown action: $action")
            }
        }
    }

    private fun handleBlockTimeAlarmOptimized(context: Context, intent: Intent, alarmTime: Long) {
        val startTime = System.currentTimeMillis()
        Log.e(TAG, "⏱️ Handler started at: $startTime")
        Log.e(TAG, "⏱️ Delay from alarm: ${startTime - alarmTime}ms")
        
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            
            // ✅ STEP 1: Acquire wake lock IMMEDIATELY (1-2ms)
            globalWakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "WingsFly::BlockTimeGlobalWakeLock"
            )
            globalWakeLock?.acquire(WAKE_LOCK_DURATION)
            Log.e(TAG, "⏱️ Wake lock acquired in: ${System.currentTimeMillis() - startTime}ms")

            // ✅ STEP 2: Quick device state check (parallel, non-blocking)
            val isScreenOn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                powerManager.isInteractive
            } else {
                @Suppress("DEPRECATION")
                powerManager.isScreenOn
            }
            
            val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
            val isDeviceLocked = keyguardManager.isKeyguardLocked
            
            Log.e(TAG, "⏱️ Device state checked in: ${System.currentTimeMillis() - startTime}ms")
            Log.e(TAG, "🔒 Device State:")
            Log.e(TAG, "   Screen On: $isScreenOn")
            Log.e(TAG, "   Device Locked: $isDeviceLocked")

            // ✅ STEP 3: Extract data (fast)
            val taskId = intent.getStringExtra("task_id") ?: ""
            val taskTitle = intent.getStringExtra("task_title") ?: "Block Time Task"
            val taskDescription = intent.getStringExtra("task_description") ?: ""
            val evaluationType = intent.getStringExtra("evaluation_type") ?: "timer"
            val startTimeStr = intent.getStringExtra("start_time") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val source = intent.getStringExtra("source") ?: "tasks"
            val taskDataJson = intent.getStringExtra("task_data") ?: "{}"

            Log.e(TAG, "📋 Task: $taskTitle ($taskId)")

            // ✅ STEP 4: Create activity intent (fast)
            val lockIntent = Intent(context, BlockTimeLockActivity::class.java).apply {
                putExtra("task_id", taskId)
                putExtra("task_title", taskTitle)
                putExtra("task_description", taskDescription)
                putExtra("evaluation_type", evaluationType)
                putExtra("start_time", startTimeStr)
                putExtra("category", category)
                putExtra("source", source)
                putExtra("task_data", taskDataJson)
                putExtra("from_alarm", true)
                putExtra("app_was_killed", true)
                putExtra("isDeviceLocked", isDeviceLocked)
                putExtra("triggeredTime", alarmTime)
            }

            Log.e(TAG, "⏱️ Intent prepared in: ${System.currentTimeMillis() - startTime}ms")

            // ✅✅✅ CRITICAL: Different approach based on lock state (like Night Mode)
            if (isDeviceLocked) {
                Log.e(TAG, "📱 Device is LOCKED - using full-screen notification")
                
                // Create notification channel first
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                        createNotificationChannel(context)
                    }
                }
                
                // Add activity flags for locked state
                lockIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_USER_ACTION
                )
                
                // Use notification with full-screen intent
                createFullScreenNotificationOptimized(context, lockIntent, taskTitle, startTimeStr, taskId)
                
                // ✅ NEW: Start vibration service for locked state (like Night Mode)
                startVibrationService(context, taskTitle, startTimeStr)
                
            } else {
                Log.e(TAG, "📱 Device is UNLOCKED - launching activity directly")
                
                // Add activity flags for unlocked state (includes EXCLUDE_FROM_RECENTS like CustomAlarm)
                lockIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_USER_ACTION or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS  // ✅ Important for Xiaomi!
                )
                
                // Launch activity directly - NO notification dependency
                try {
                    context.startActivity(lockIntent)
                    Log.e(TAG, "✅ Activity launched directly (unlocked state)")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Direct launch failed: ${e.message}")
                    
                    // Fallback: Use notification
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                            createNotificationChannel(context)
                        }
                    }
                    createFullScreenNotificationOptimized(context, lockIntent, taskTitle, startTimeStr, taskId)
                }
            }

            val totalTime = System.currentTimeMillis() - alarmTime
            Log.e(TAG, "========================================")
            Log.e(TAG, "⏱️ TOTAL ALARM HANDLING TIME: ${totalTime}ms")
            Log.e(TAG, "========================================")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error: ${e.message}", e)
            
            try {
                if (globalWakeLock?.isHeld == true) {
                    globalWakeLock?.release()
                }
            } catch (e: Exception) { }
        }
    }

    /**
     * ✅ NEW: Start vibration service (exactly like Night Mode)
     */
    private fun startVibrationService(context: Context, taskTitle: String, startTime: String) {
        try {
            val serviceIntent = Intent(context, BlockTimeVibrationService::class.java).apply {
                putExtra("task_title", taskTitle)
                putExtra("start_time", startTime)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
                Log.e(TAG, "✅ Foreground vibration service started (Android O+)")
            } else {
                context.startService(serviceIntent)
                Log.e(TAG, "✅ Vibration service started")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start vibration service: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Block Time Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Block Time task alarms"
                enableVibration(true)
                vibrationPattern = LONG_VIBRATION_PATTERN
                enableLights(true)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createFullScreenNotificationOptimized(
        context: Context, 
        launchIntent: Intent,
        taskTitle: String,
        startTime: String,
        taskId: String
    ) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val notificationId = NOTIFICATION_ID_BASE + taskId.hashCode()

            // ✅ Create PendingIntent with high priority flags
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                notificationId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            // ✅ Build notification (optimized)
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⏰ $taskTitle")
                .setContentText("Starts at $startTime - Tap to begin")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true) // ✅ Critical
                .setAutoCancel(true)
                .setOngoing(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setVibrate(LONG_VIBRATION_PATTERN)
                .setDefaults(Notification.DEFAULT_ALL)
                .setContentIntent(fullScreenPendingIntent)
                .setTimeoutAfter(30000) // ✅ Auto-dismiss after 30 seconds
                .build()

            notificationManager.notify(notificationId, notification)
            Log.e(TAG, "✅ Full-screen notification posted")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Notification failed: ${e.message}")
        }
    }

    private fun handleBootCompleted(context: Context) {
        try {
            Log.d(TAG, "📱 Device rebooted - sending reschedule broadcast")
            
            val rescheduleIntent = Intent("com.wingsfly.RESCHEDULE_BLOCK_TIME_ALARMS")
            context.sendBroadcast(rescheduleIntent)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Boot handler error: ${e.message}", e)
        }
    }
}