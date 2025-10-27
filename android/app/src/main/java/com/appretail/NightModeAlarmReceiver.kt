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

class NightModeAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NightModeAlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.e(TAG, "")
        Log.e(TAG, "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥")
        Log.e(TAG, "🔥 ALARM FIRED! 🔥")
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
        var wakeLock: PowerManager.WakeLock? = null
        
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "WingsFly::NightModeWakeLock"
            )
            wakeLock.acquire(60000)

            Log.e(TAG, "🌙 Night Mode alarm triggered! (App may be killed)")
            Log.e(TAG, "🔒 Wake lock acquired")

            val bedHour = intent.getIntExtra("bed_hour", 0)
            val bedMinute = intent.getIntExtra("bed_minute", 0)

            Log.e(TAG, "Bed time: $bedHour:${String.format("%02d", bedMinute)}")

            // Create intent for MainActivity
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = "TRIGGER_NIGHT_MODE"
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION or
                    Intent.FLAG_FROM_BACKGROUND or
                    Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("trigger_night_mode", true)
                putExtra("bed_hour", bedHour)
                putExtra("bed_minute", bedMinute)
                putExtra("from_alarm", true)
                putExtra("app_was_killed", true)
            }

            // ✅ XIAOMI FIX: Create full-screen notification FIRST
            createFullScreenNotification(context, launchIntent, bedHour, bedMinute)

            // Also try direct activity launch (works on non-Xiaomi)
            Log.e(TAG, "🚀 Starting MainActivity...")
            try {
                context.startActivity(launchIntent)
                Log.e(TAG, "✅ MainActivity launch requested")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to start activity: ${e.message}")
            }

            // Reschedule for tomorrow
            Log.e(TAG, "📅 Rescheduling for tomorrow...")
            rescheduleForTomorrow(context, bedHour, bedMinute)

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in alarm receiver: ${e.message}", e)
            e.printStackTrace()
        } finally {
            wakeLock?.release()
            Log.e(TAG, "🔓 Wake lock released")
        }
    }

    private fun createFullScreenNotification(
        context: Context, 
        launchIntent: Intent,
        bedHour: Int,
        bedMinute: Int
    ) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create notification channel
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    "night_mode_alarm_urgent",
                    "Night Mode Alarm",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Night Mode bedtime alarm"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Create pending intent with full-screen capability
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

            // Build notification with full-screen intent
            val notification = NotificationCompat.Builder(context, "night_mode_alarm_urgent")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Night Mode - Time to Wind Down")
                .setContentText("Bedtime at $bedHour:${String.format("%02d", bedMinute)}")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true) // ✅ CRITICAL for Xiaomi
                .setAutoCancel(true)
                .setOngoing(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()

            notificationManager.notify(9999, notification)
            Log.e(TAG, "✅ Full-screen notification created (Xiaomi fix)")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create notification: ${e.message}")
            e.printStackTrace()
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

        val showIntent = Intent(context, MainActivity::class.java).apply {
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