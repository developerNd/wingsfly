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

class MorningModeAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "MorningModeAlarmReceiver"
        private val LONG_VIBRATION_PATTERN = longArrayOf(0, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000)
        
        // ✅ Wake lock durations
        private const val INITIAL_WAKE_LOCK_DURATION = 120000L // 2 minutes for initial app launch
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.e(TAG, "")
        Log.e(TAG, "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥")
        Log.e(TAG, "🔥 MORNING ALARM FIRED! 🔥")
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
            MorningModeSchedulerModule.ACTION_MORNING_MODE_ALARM -> {
                Log.e(TAG, "✅ Correct alarm action received!")
                handleMorningModeAlarm(context, intent)
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

    private fun handleMorningModeAlarm(context: Context, intent: Intent) {
        var wakeLock: PowerManager.WakeLock? = null
        
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            
            // Check device state
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
            Log.e(TAG, "")
            
            // ✅ Acquire FULL wake lock to turn on screen and keep it on
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "WingsFly::MorningModeWakeLock"
            )
            wakeLock.acquire(INITIAL_WAKE_LOCK_DURATION)

            Log.e(TAG, "☀️ Morning Mode alarm triggered!")
            Log.e(TAG, "🔒 Wake lock acquired: FULL_WAKE_LOCK for ${INITIAL_WAKE_LOCK_DURATION / 1000}s")
            Log.e(TAG, "   ✅ This keeps the screen ON for 2 minutes")
            Log.e(TAG, "   ✅ App will stay visible as long as:")
            Log.e(TAG, "      - Wake lock is active (2 minutes)")
            Log.e(TAG, "      - User is interacting with it")
            Log.e(TAG, "      - User doesn't manually minimize")
            Log.e(TAG, "")

            val wakeUpHour = intent.getIntExtra("wake_up_hour", 0)
            val wakeUpMinute = intent.getIntExtra("wake_up_minute", 0)

            Log.e(TAG, "Wake-up time: $wakeUpHour:${String.format("%02d", wakeUpMinute)}")

            // ✅ STRATEGY: Start vibration service if device is locked
            // Service runs independently and vibrates until device is unlocked
            if (isDeviceLocked || !isScreenOn) {
                Log.e(TAG, "")
                Log.e(TAG, "📳📳📳 DEVICE IS LOCKED 📳📳📳")
                Log.e(TAG, "Starting vibration service...")
                Log.e(TAG, "Service will vibrate every 8s until you unlock!")
                Log.e(TAG, "")
                startVibrationService(context, wakeUpHour, wakeUpMinute)
                
                // Small delay to ensure service starts
                Thread.sleep(800)
            } else {
                Log.e(TAG, "✅ Device already unlocked - no vibration service needed")
            }

            // Create launch intent for MainActivity
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = "TRIGGER_MORNING_MODE"
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION or
                    Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("trigger_morning_mode", true)
                putExtra("wake_up_hour", wakeUpHour)
                putExtra("wake_up_minute", wakeUpMinute)
                putExtra("from_alarm", true)
                putExtra("app_was_killed", true)
            }

            // Create full-screen notification
            createFullScreenNotification(context, launchIntent, wakeUpHour, wakeUpMinute)

            // Launch MainActivity
            Log.e(TAG, "🚀 Launching MainActivity above lock screen...")
            try {
                context.startActivity(launchIntent)
                Log.e(TAG, "✅ MainActivity launched!")
                Log.e(TAG, "   App will stay on screen for ~2 minutes or until you interact")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to start activity: ${e.message}")
                e.printStackTrace()
            }

            // Reschedule for tomorrow
            Log.e(TAG, "")
            Log.e(TAG, "📅 Rescheduling for tomorrow...")
            rescheduleForTomorrow(context, wakeUpHour, wakeUpMinute)
            Log.e(TAG, "")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in alarm receiver: ${e.message}", e)
            e.printStackTrace()
        } finally {
            // ✅ Release wake lock after delay to ensure smooth handoff
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    if (wakeLock?.isHeld == true) {
                        wakeLock.release()
                        Log.e(TAG, "🔓 Alarm wake lock released (after 3s delay)")
                        Log.e(TAG, "   Note: Vibration service has its own wake lock")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error releasing wake lock: ${e.message}")
                }
            }, 3000) // 3 second delay
        }
    }

    private fun startVibrationService(context: Context, wakeUpHour: Int, wakeUpMinute: Int) {
        try {
            // Use the existing NightModeVibrationService for both Night and Morning modes
            val serviceIntent = Intent(context, NightModeVibrationService::class.java).apply {
                putExtra("wake_up_hour", wakeUpHour)
                putExtra("wake_up_minute", wakeUpMinute)
                putExtra("is_morning_mode", true) // Flag to distinguish morning mode
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

    private fun createFullScreenNotification(
        context: Context, 
        launchIntent: Intent,
        wakeUpHour: Int,
        wakeUpMinute: Int
    ) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    "morning_mode_alarm_urgent",
                    "Morning Mode Alarm",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Morning Mode wake-up alarm"
                    enableVibration(true)
                    vibrationPattern = LONG_VIBRATION_PATTERN
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setBypassDnd(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            val notification = NotificationCompat.Builder(context, "morning_mode_alarm_urgent")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("☀️ Morning Mode - Good Morning!")
                .setContentText("Wake-up time: $wakeUpHour:${String.format("%02d", wakeUpMinute)}")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setOngoing(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setVibrate(LONG_VIBRATION_PATTERN)
                .setDefaults(Notification.DEFAULT_ALL)
                .build()

            notificationManager.notify(9999, notification)
            Log.e(TAG, "✅ Full-screen notification created")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create notification: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun rescheduleForTomorrow(context: Context, wakeUpHour: Int, wakeUpMinute: Int) {
        try {
            val prefs = context.getSharedPreferences("MorningModePrefs", Context.MODE_PRIVATE)
            val triggerHour = prefs.getInt("trigger_hour", wakeUpHour)
            val triggerMinute = prefs.getInt("trigger_minute", wakeUpMinute)

            val calendar = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, triggerHour)
                set(Calendar.MINUTE, triggerMinute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            scheduleAlarm(context, calendar.timeInMillis, wakeUpHour, wakeUpMinute, triggerHour, triggerMinute)

            Log.e(TAG, "✅ Rescheduled for tomorrow: ${calendar.time}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error rescheduling: ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun handleBootCompleted(context: Context) {
        try {
            Log.d(TAG, "📱 Device booted - checking for scheduled alarms")
            
            val prefs = context.getSharedPreferences("MorningModePrefs", Context.MODE_PRIVATE)
            val isScheduled = prefs.getBoolean("alarm_scheduled", false)
            
            if (isScheduled) {
                val wakeUpHour = prefs.getInt("wake_up_hour", 0)
                val wakeUpMinute = prefs.getInt("wake_up_minute", 0)
                val triggerHour = prefs.getInt("trigger_hour", wakeUpHour)
                val triggerMinute = prefs.getInt("trigger_minute", wakeUpMinute)
                
                Log.d(TAG, "Found scheduled alarm: WakeUp=${wakeUpHour}:${wakeUpMinute}, Trigger=${triggerHour}:${triggerMinute}")
                
                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, triggerHour)
                    set(Calendar.MINUTE, triggerMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    
                    if (timeInMillis <= System.currentTimeMillis()) {
                        add(Calendar.DAY_OF_YEAR, 1)
                    }
                }
                
                scheduleAlarm(context, calendar.timeInMillis, wakeUpHour, wakeUpMinute, triggerHour, triggerMinute)
                
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
        wakeUpHour: Int, 
        wakeUpMinute: Int,
        triggerHour: Int,
        triggerMinute: Int
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        
        val intent = Intent(context, MorningModeAlarmReceiver::class.java).apply {
            action = MorningModeSchedulerModule.ACTION_MORNING_MODE_ALARM
            putExtra("wake_up_hour", wakeUpHour)
            putExtra("wake_up_minute", wakeUpMinute)
            putExtra("trigger_hour", triggerHour)
            putExtra("trigger_minute", triggerMinute)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            MorningModeSchedulerModule.ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        )

        val showIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val showPendingIntent = PendingIntent.getActivity(
            context,
            MorningModeSchedulerModule.ALARM_REQUEST_CODE + 1,
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