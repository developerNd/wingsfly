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
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.*

class NightModeAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NightModeAlarmReceiver"
        private val LONG_VIBRATION_PATTERN = longArrayOf(0, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000)
        private const val CHANNEL_ID = "night_mode_alarm_urgent"
        private const val NOTIFICATION_ID = 9999
        
        // ✅ CRITICAL FIX: Hold wake lock for LONGER duration (5 minutes)
        private const val WAKE_LOCK_DURATION = 5 * 60 * 1000L // 5 minutes
        
        // ✅ Store wake lock at class level so it persists
        private var globalWakeLock: PowerManager.WakeLock? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.e(TAG, "")
        Log.e(TAG, "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥")
        Log.e(TAG, "🔥 NIGHT MODE ALARM FIRED! 🔥")
        Log.e(TAG, "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥")
        Log.e(TAG, "")

        Log.e(TAG, "📱 DEVICE INFORMATION:")
        Log.e(TAG, "   Manufacturer: ${Build.MANUFACTURER}")
        Log.e(TAG, "   Brand: ${Build.BRAND}")
        Log.e(TAG, "   Model: ${Build.MODEL}")
        Log.e(TAG, "   Android Version: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        Log.e(TAG, "")

        val action = intent.action
        Log.e(TAG, "⏰ Action: $action")

        when (action) {
            NightModeSchedulerModule.ACTION_NIGHT_MODE_ALARM -> {
                Log.e(TAG, "✅ Correct alarm action received!")
                handleNightModeAlarm(context, intent)
            }
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                Log.e(TAG, "🔄 Device rebooted - handling boot")
                handleBootCompleted(context)
            }
            else -> {
                Log.e(TAG, "⚠️ Unknown action: $action")
            }
        }

        Log.e(TAG, "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥")
        Log.e(TAG, "")
    }

    private fun handleNightModeAlarm(context: Context, intent: Intent) {
    try {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        
        val isScreenOn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            powerManager.isInteractive
        } else {
            @Suppress("DEPRECATION")
            powerManager.isScreenOn
        }
        
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
        val isDeviceLocked = keyguardManager.isKeyguardLocked
        
        Log.e(TAG, "🔒 Device State:")
        Log.e(TAG, "   Screen On: $isScreenOn")
        Log.e(TAG, "   Device Locked: $isDeviceLocked")
        
        // ✅ Acquire wake lock
        globalWakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or 
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "WingsFly::NightModeGlobalWakeLock"
        )
        globalWakeLock?.acquire(WAKE_LOCK_DURATION)

        val bedHour = intent.getIntExtra("bed_hour", 0)
        val bedMinute = intent.getIntExtra("bed_minute", 0)

        // ✅ Create activity intent
        val lockIntent = Intent(context, NightModeLockActivity::class.java).apply {
            putExtra("bed_hour", bedHour)
            putExtra("bed_minute", bedMinute)
            putExtra("from_alarm", true)
            putExtra("app_was_killed", true)
            putExtra("device_was_locked", isDeviceLocked)
            putExtra("isDeviceLocked", isDeviceLocked)
            putExtra("triggeredTime", System.currentTimeMillis())
        }

        // ✅✅✅ CRITICAL: Different approach based on lock state (like CustomAlarm)
        if (isDeviceLocked) {
            Log.e(TAG, "📱 Device is LOCKED - using full-screen notification")
            
            // Create notification channel first
            createNotificationChannel(context)
            
            // Add activity flags for locked state
            lockIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            )
            
            // Use notification with full-screen intent
            createFullScreenNotification(context, lockIntent, bedHour, bedMinute)
            
            // Start vibration service for locked state
            startVibrationService(context, bedHour, bedMinute)
            
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
                createNotificationChannel(context)
                createFullScreenNotification(context, lockIntent, bedHour, bedMinute)
            }
        }

        // Reschedule for tomorrow
        rescheduleForTomorrow(context, bedHour, bedMinute)

    } catch (e: Exception) {
        Log.e(TAG, "❌ Error in alarm receiver: ${e.message}", e)
        
        try {
            if (globalWakeLock?.isHeld == true) {
                globalWakeLock?.release()
            }
        } catch (e: Exception) { }
    }
}

    /**
     * ✅ Create notification channel (Android O+)
     */
    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Night Mode Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Night Mode bedtime alarm"
                enableVibration(true)
                vibrationPattern = LONG_VIBRATION_PATTERN
                enableLights(true)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            
            notificationManager.createNotificationChannel(channel)
            Log.e(TAG, "✅ Notification channel created")
        }
    }

    /**
     * ✅ CRITICAL: Create full-screen notification (EXACTLY like Morning Alarm)
     */
    private fun createFullScreenNotification(
        context: Context, 
        launchIntent: Intent,
        bedHour: Int,
        bedMinute: Int
    ) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // ✅ Full-screen PendingIntent
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                NOTIFICATION_ID,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            // ✅ Build notification
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("🌙 Night Mode - Time to Wind Down")
                .setContentText("Bedtime at $bedHour:${String.format("%02d", bedMinute)}")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true) // ✅ KEY
                .setAutoCancel(true)
                .setOngoing(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setVibrate(LONG_VIBRATION_PATTERN)
                .setDefaults(Notification.DEFAULT_ALL)
                .setContentIntent(fullScreenPendingIntent)
                .build()

            notificationManager.notify(NOTIFICATION_ID, notification)
            Log.e(TAG, "✅ Full-screen notification created with ID: $NOTIFICATION_ID")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create notification: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun startVibrationService(context: Context, bedHour: Int, bedMinute: Int) {
        try {
            val serviceIntent = Intent(context, NightModeVibrationService::class.java).apply {
                putExtra("bed_hour", bedHour)
                putExtra("bed_minute", bedMinute)
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

    /**
     * ✅ Fallback: Start foreground service if activity launch fails
     */
    private fun startLockService(context: Context, bedHour: Int, bedMinute: Int) {
        try {
            val serviceIntent = Intent(context, NightModeLockService::class.java).apply {
                putExtra("bed_hour", bedHour)
                putExtra("bed_minute", bedMinute)
                putExtra("serviceAction", "START_LOCK_SCREEN")
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            
            Log.e(TAG, "✅ Lock service started as fallback")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start lock service: ${e.message}")
        }
    }

    private fun rescheduleForTomorrow(context: Context, bedHour: Int, bedMinute: Int) {
        try {
            val prefs = context.getSharedPreferences("NightModePrefs", Context.MODE_PRIVATE)
            val triggerHour = prefs.getInt("trigger_hour", bedHour - 1)
            val triggerMinute = prefs.getInt("trigger_minute", bedMinute)

            val calendar = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, triggerHour)
                set(Calendar.MINUTE, triggerMinute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            scheduleAlarm(context, calendar.timeInMillis, bedHour, bedMinute, triggerHour, triggerMinute)

            Log.e(TAG, "✅ Rescheduled for tomorrow: ${calendar.time}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error rescheduling: ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun handleBootCompleted(context: Context) {
        try {
            Log.d(TAG, "📱 Device booted - checking for scheduled alarms")
            
            val prefs = context.getSharedPreferences("NightModePrefs", Context.MODE_PRIVATE)
            val isScheduled = prefs.getBoolean("alarm_scheduled", false)
            
            if (isScheduled) {
                val bedHour = prefs.getInt("bed_hour", 0)
                val bedMinute = prefs.getInt("bed_minute", 0)
                val triggerHour = prefs.getInt("trigger_hour", bedHour - 1)
                val triggerMinute = prefs.getInt("trigger_minute", bedMinute)
                
                Log.d(TAG, "Found scheduled alarm: Bed=${bedHour}:${bedMinute}, Trigger=${triggerHour}:${triggerMinute}")
                
                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, triggerHour)
                    set(Calendar.MINUTE, triggerMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    
                    if (timeInMillis <= System.currentTimeMillis()) {
                        add(Calendar.DAY_OF_YEAR, 1)
                    }
                }
                
                scheduleAlarm(context, calendar.timeInMillis, bedHour, bedMinute, triggerHour, triggerMinute)
                
                Log.d(TAG, "✅ Alarm rescheduled after boot for: ${calendar.time}")
            } else {
                Log.d(TAG, "No scheduled alarm found after boot")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error handling boot: ${e.message}", e)
        }
    }

    private fun scheduleAlarm(
        context: Context, 
        triggerTime: Long, 
        bedHour: Int, 
        bedMinute: Int,
        triggerHour: Int,
        triggerMinute: Int
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        
        val intent = Intent(context, NightModeAlarmReceiver::class.java).apply {
            action = NightModeSchedulerModule.ACTION_NIGHT_MODE_ALARM
            putExtra("bed_hour", bedHour)
            putExtra("bed_minute", bedMinute)
            putExtra("trigger_hour", triggerHour)
            putExtra("trigger_minute", triggerMinute)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            NightModeSchedulerModule.ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        )

        val showIntent = Intent(context, NightModeLockActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val showPendingIntent = PendingIntent.getActivity(
            context,
            NightModeSchedulerModule.ALARM_REQUEST_CODE + 1,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        )

        val alarmClockInfo = android.app.AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

        Log.e(TAG, "📅 Alarm scheduled for: ${Date(triggerTime)}")
    }
}