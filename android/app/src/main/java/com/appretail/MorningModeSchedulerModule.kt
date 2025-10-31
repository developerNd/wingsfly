package com.wingsfly

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.core.app.NotificationCompat

class MorningModeSchedulerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "MorningModeScheduler"
        const val ALARM_REQUEST_CODE = 9002
        const val ACTION_MORNING_MODE_ALARM = "com.wingsfly.MORNING_MODE_ALARM"
        private const val PREFS_NAME = "MorningModePrefs"
        private const val KEY_WAKEUP_HOUR = "wakeup_hour"
        private const val KEY_WAKEUP_MINUTE = "wakeup_minute"
        private const val KEY_TRIGGER_HOUR = "trigger_hour"
        private const val KEY_TRIGGER_MINUTE = "trigger_minute"
        private const val KEY_ALARM_SCHEDULED = "alarm_scheduled"
    }

    override fun getName() = "MorningModeSchedulerModule"

    /**
     * ✅ Check if device is Xiaomi
     */
    @ReactMethod
    fun isXiaomi(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            val isXiaomi = manufacturer.contains("xiaomi") || 
                          manufacturer.contains("redmi") ||
                          manufacturer.contains("poco")
            
            Log.d(TAG, "Device manufacturer: ${Build.MANUFACTURER}, isXiaomi: $isXiaomi")
            promise.resolve(isXiaomi)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking manufacturer: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * ✅ Check if battery optimizations are ignored
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = context.packageName
                val isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName)
                
                Log.d(TAG, "Battery optimization ignored: $isIgnoring")
                promise.resolve(isIgnoring)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking battery optimization: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * ✅ Request to ignore battery optimizations
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                
                try {
                    context.startActivity(intent)
                    promise.resolve(true)
                } catch (e: Exception) {
                    // Fallback to app settings
                    openAppSettings(promise)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting battery optimization: ${e.message}", e)
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * ✅ Open Xiaomi autostart settings
     */
    @ReactMethod
    fun openAutostartSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            
            // Try Xiaomi autostart settings
            val xiaomiIntents = listOf(
                Intent().apply {
                    component = ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                },
                Intent().apply {
                    component = ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.powercenter.PowerSettings"
                    )
                },
                Intent().apply {
                    action = "miui.intent.action.OP_AUTO_START"
                    addCategory(Intent.CATEGORY_DEFAULT)
                }
            )
            
            var opened = false
            for (intent in xiaomiIntents) {
                try {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    opened = true
                    Log.d(TAG, "✅ Opened Xiaomi autostart settings")
                    break
                } catch (e: Exception) {
                    Log.d(TAG, "Failed intent: ${e.message}")
                }
            }
            
            if (!opened) {
                Log.w(TAG, "Could not open autostart settings, opening app settings")
                openAppSettings(promise)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening autostart settings: ${e.message}", e)
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * ✅ Open app settings
     */
    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening app settings: ${e.message}", e)
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * ✅ Get device info for debugging
     */
    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val info = Arguments.createMap().apply {
                putString("manufacturer", Build.MANUFACTURER)
                putString("brand", Build.BRAND)
                putString("model", Build.MODEL)
                putString("device", Build.DEVICE)
                putInt("sdkInt", Build.VERSION.SDK_INT)
                putString("release", Build.VERSION.RELEASE)
            }
            promise.resolve(info)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * Schedule alarm for Morning Mode trigger (at wake-up time)
     * ✅ ENHANCED: Better logging and Xiaomi handling
     */
    @ReactMethod
    fun scheduleMorningModeAlarm(
        triggerTimeMillis: Double,
        wakeUpHour: Int,
        wakeUpMinute: Int,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // ✅ GET DEVICE INFO
            val androidVersion = Build.VERSION.SDK_INT
            val androidRelease = Build.VERSION.RELEASE
            val deviceManufacturer = Build.MANUFACTURER
            val deviceModel = Build.MODEL
            val deviceBrand = Build.BRAND
            val isXiaomi = deviceManufacturer.lowercase().let {
                it.contains("xiaomi") || it.contains("redmi") || it.contains("poco")
            }

            // Calculate trigger hour and minute
            val calendar = Calendar.getInstance().apply {
                timeInMillis = triggerTimeMillis.toLong()
            }
            val triggerHour = calendar.get(Calendar.HOUR_OF_DAY)
            val triggerMinute = calendar.get(Calendar.MINUTE)

            // Save all details to SharedPreferences for boot recovery
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putInt(KEY_WAKEUP_HOUR, wakeUpHour)
                putInt(KEY_WAKEUP_MINUTE, wakeUpMinute)
                putInt(KEY_TRIGGER_HOUR, triggerHour)
                putInt(KEY_TRIGGER_MINUTE, triggerMinute)
                putBoolean(KEY_ALARM_SCHEDULED, true)
                apply()
            }

            // Create intent for the alarm receiver
            val intent = Intent(context, MorningModeAlarmReceiver::class.java).apply {
                action = ACTION_MORNING_MODE_ALARM
                putExtra("wake_up_hour", wakeUpHour)
                putExtra("wake_up_minute", wakeUpMinute)
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
            Log.d(TAG, "✅ Morning Mode alarm scheduled (works when app is killed)!")
            Log.d(TAG, "")
            Log.d(TAG, "📱 DEVICE INFORMATION:")
            Log.d(TAG, "   Manufacturer: $deviceManufacturer")
            Log.d(TAG, "   Brand: $deviceBrand")
            Log.d(TAG, "   Model: $deviceModel")
            Log.d(TAG, "   Android Version: $androidRelease (API $androidVersion)")
            if (isXiaomi) {
                Log.w(TAG, "   ⚠️ XIAOMI DEVICE DETECTED - May need autostart permission!")
            }
            Log.d(TAG, "")
            Log.d(TAG, "⏰ SCHEDULE DETAILS:")
            Log.d(TAG, "   Trigger time: $triggerDate")
            Log.d(TAG, "   Time until trigger: $timeUntil minutes")
            Log.d(TAG, "   Wake-up time: ${wakeUpHour}:${String.format("%02d", wakeUpMinute)}")
            Log.d(TAG, "   Trigger time: ${triggerHour}:${String.format("%02d", triggerMinute)}")
            Log.d(TAG, "   Current time: ${Date(now)}")
            Log.d(TAG, "========================================")
            
            // Return device info to React Native for UI warnings
            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putBoolean("isXiaomi", isXiaomi)
                putString("manufacturer", deviceManufacturer)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error scheduling alarm: ${e.message}", e)
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    /**
     * Cancel Morning Mode alarm
     */
    @ReactMethod
    fun cancelMorningModeAlarm(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, MorningModeAlarmReceiver::class.java).apply {
                action = ACTION_MORNING_MODE_ALARM
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

            Log.d(TAG, "✅ Morning Mode alarm cancelled")
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
            
            Log.d(TAG, "Alarm scheduled status: $isScheduled")
            promise.resolve(isScheduled)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking alarm: ${e.message}", e)
            promise.resolve(false)
        }
    }
}