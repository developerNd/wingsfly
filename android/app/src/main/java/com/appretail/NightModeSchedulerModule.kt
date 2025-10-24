package com.wingsfly

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class NightModeSchedulerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NightModeScheduler"
        const val ALARM_REQUEST_CODE = 9001
        const val ACTION_NIGHT_MODE_ALARM = "com.wingsfly.NIGHT_MODE_ALARM"
        private const val PREFS_NAME = "NightModePrefs"
        private const val KEY_BED_HOUR = "bed_hour"
        private const val KEY_BED_MINUTE = "bed_minute"
        private const val KEY_TRIGGER_HOUR = "trigger_hour"
        private const val KEY_TRIGGER_MINUTE = "trigger_minute"
        private const val KEY_ALARM_SCHEDULED = "alarm_scheduled"
    }

    override fun getName() = "NightModeSchedulerModule"

    /**
     * Schedule alarm for Night Mode trigger (1 hour before bedtime)
     */
    @ReactMethod
    fun scheduleNightModeAlarm(
        triggerTimeMillis: Double,
        bedHour: Int,
        bedMinute: Int,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // Calculate trigger hour and minute (1 hour before bed)
            val calendar = Calendar.getInstance().apply {
                timeInMillis = triggerTimeMillis.toLong()
            }
            val triggerHour = calendar.get(Calendar.HOUR_OF_DAY)
            val triggerMinute = calendar.get(Calendar.MINUTE)

            // Save all details to SharedPreferences for boot recovery
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putInt(KEY_BED_HOUR, bedHour)
                putInt(KEY_BED_MINUTE, bedMinute)
                putInt(KEY_TRIGGER_HOUR, triggerHour)
                putInt(KEY_TRIGGER_MINUTE, triggerMinute)
                putBoolean(KEY_ALARM_SCHEDULED, true)
                apply()
            }

            // Create intent for the alarm receiver
            val intent = Intent(context, NightModeAlarmReceiver::class.java).apply {
                action = ACTION_NIGHT_MODE_ALARM
                putExtra("bed_hour", bedHour)
                putExtra("bed_minute", bedMinute)
                putExtra("trigger_hour", triggerHour)
                putExtra("trigger_minute", triggerMinute)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            // Cancel any existing alarm
            alarmManager.cancel(pendingIntent)

            // Calculate proper trigger time
            val now = System.currentTimeMillis()
            var triggerTime = triggerTimeMillis.toLong()
            
            // If trigger time has already passed today, schedule for tomorrow
            if (triggerTime <= now) {
                Log.w(TAG, "⚠️ Trigger time already passed, scheduling for tomorrow")
                val nextDay = Calendar.getInstance().apply {
                    timeInMillis = triggerTime
                    add(Calendar.DAY_OF_YEAR, 1)
                }
                triggerTime = nextDay.timeInMillis
            }

            // Use setAlarmClock for MAXIMUM reliability (works even when app is killed)
            val showIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val showPendingIntent = PendingIntent.getActivity(
                context,
                ALARM_REQUEST_CODE + 1,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

            val triggerDate = Date(triggerTime)
            val timeUntil = (triggerTime - now) / 1000 / 60 // minutes
            
            Log.d(TAG, "========================================")
            Log.d(TAG, "✅ Night Mode alarm scheduled (works when app is killed)!")
            Log.d(TAG, "Trigger time: $triggerDate")
            Log.d(TAG, "Time until trigger: $timeUntil minutes")
            Log.d(TAG, "Bed time: ${bedHour}:${String.format("%02d", bedMinute)}")
            Log.d(TAG, "Trigger time: ${triggerHour}:${String.format("%02d", triggerMinute)}")
            Log.d(TAG, "========================================")
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error scheduling alarm: ${e.message}", e)
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    /**
     * Cancel Night Mode alarm
     */
    @ReactMethod
    fun cancelNightModeAlarm(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, NightModeAlarmReceiver::class.java).apply {
                action = ACTION_NIGHT_MODE_ALARM
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or 
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()

            // Clear saved preferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()

            Log.d(TAG, "✅ Night Mode alarm cancelled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error cancelling alarm: ${e.message}", e)
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    /**
     * Check if alarm is scheduled
     */
    @ReactMethod
    fun isAlarmScheduled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isScheduled = prefs.getBoolean(KEY_ALARM_SCHEDULED, false)
            promise.resolve(isScheduled)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error checking alarm: ${e.message}", e)
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    /**
     * Get scheduled alarm details
     */
    @ReactMethod
    fun getScheduledAlarmDetails(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            val result = Arguments.createMap().apply {
                putBoolean("isScheduled", prefs.getBoolean(KEY_ALARM_SCHEDULED, false))
                putInt("bedHour", prefs.getInt(KEY_BED_HOUR, 0))
                putInt("bedMinute", prefs.getInt(KEY_BED_MINUTE, 0))
                putInt("triggerHour", prefs.getInt(KEY_TRIGGER_HOUR, 0))
                putInt("triggerMinute", prefs.getInt(KEY_TRIGGER_MINUTE, 0))
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * Send event to React Native
     */
    fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event: ${e.message}", e)
        }
    }
}

/**
 * Broadcast Receiver for Night Mode alarm
 * THIS RUNS EVEN WHEN APP IS KILLED
 */
class NightModeAlarmReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "NightModeAlarmReceiver"
        private const val PREFS_NAME = "NightModePrefs"
        private const val KEY_BED_HOUR = "bed_hour"
        private const val KEY_BED_MINUTE = "bed_minute"
        private const val KEY_TRIGGER_HOUR = "trigger_hour"
        private const val KEY_TRIGGER_MINUTE = "trigger_minute"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        val action = intent.action
        Log.d(TAG, "========================================")
        Log.d(TAG, "🌙 Receiver triggered with action: $action")
        Log.d(TAG, "App state: POTENTIALLY KILLED - Alarm will launch app")
        Log.d(TAG, "========================================")

        when (action) {
            NightModeSchedulerModule.ACTION_NIGHT_MODE_ALARM -> {
                handleNightModeAlarm(context, intent)
            }
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                handleBootCompleted(context)
            }
        }
    }

    private fun handleNightModeAlarm(context: Context, intent: Intent) {
        try {
            // Acquire wake lock to ensure alarm works even in doze mode
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "WingsFly::NightModeWakeLock"
            ).apply {
                acquire(60000) // 1 minute
            }

            Log.d(TAG, "🌙 Night Mode alarm triggered! (App may be killed)")

            val bedHour = intent.getIntExtra("bed_hour", 0)
            val bedMinute = intent.getIntExtra("bed_minute", 0)

            Log.d(TAG, "Bed time: $bedHour:${String.format("%02d", bedMinute)}")

            // ✅ CRITICAL: Launch MainActivity with Night Mode flag
            // This will start the app if it's killed
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = "TRIGGER_NIGHT_MODE"
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("trigger_night_mode", true)
                putExtra("bed_hour", bedHour)
                putExtra("bed_minute", bedMinute)
                putExtra("from_alarm", true)
                putExtra("app_was_killed", true) // Indicate app might have been killed
            }

            context.startActivity(launchIntent)

            Log.d(TAG, "✅ MainActivity launched for Night Mode (from killed state)")

            // ✅ Reschedule for tomorrow
            rescheduleForTomorrow(context, bedHour, bedMinute)

            // Release wake lock
            wakeLock.release()

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in alarm receiver: ${e.message}", e)
        }
    }

    private fun handleBootCompleted(context: Context) {
        try {
            Log.d(TAG, "📱 Device booted - checking for scheduled alarms")
            
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isScheduled = prefs.getBoolean("alarm_scheduled", false)
            
            if (isScheduled) {
                val bedHour = prefs.getInt(KEY_BED_HOUR, 0)
                val bedMinute = prefs.getInt(KEY_BED_MINUTE, 0)
                val triggerHour = prefs.getInt(KEY_TRIGGER_HOUR, bedHour - 1)
                val triggerMinute = prefs.getInt(KEY_TRIGGER_MINUTE, bedMinute)
                
                Log.d(TAG, "Found scheduled alarm: Bed=${bedHour}:${bedMinute}, Trigger=${triggerHour}:${triggerMinute}")
                
                // Calculate next trigger time
                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, triggerHour)
                    set(Calendar.MINUTE, triggerMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    
                    // If time has passed today, schedule for tomorrow
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

    private fun rescheduleForTomorrow(context: Context, bedHour: Int, bedMinute: Int) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val triggerHour = prefs.getInt(KEY_TRIGGER_HOUR, bedHour - 1)
            val triggerMinute = prefs.getInt(KEY_TRIGGER_MINUTE, bedMinute)

            val calendar = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, triggerHour)
                set(Calendar.MINUTE, triggerMinute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            scheduleAlarm(context, calendar.timeInMillis, bedHour, bedMinute, triggerHour, triggerMinute)

            Log.d(TAG, "✅ Rescheduled for tomorrow: ${calendar.time}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error rescheduling: ${e.message}", e)
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
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
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

        // Use setAlarmClock for maximum reliability (works even when app is killed)
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

        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

        Log.d(TAG, "Alarm scheduled for: ${Date(triggerTime)}")
    }
}