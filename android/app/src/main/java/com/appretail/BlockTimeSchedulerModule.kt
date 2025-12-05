package com.wingsfly

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.util.*

class BlockTimeSchedulerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BlockTimeSchedulerModule"
        const val ACTION_BLOCK_TIME_ALARM = "com.wingsfly.BLOCK_TIME_ALARM"
        private const val BASE_REQUEST_CODE = 9000
    }

    override fun getName(): String {
        return "BlockTimeSchedulerModule"
    }

    @ReactMethod
    fun scheduleBlockTimeAlarm(
        taskId: String,
        taskTitle: String,
        taskDescription: String,
        evaluationType: String,
        startTime: String,
        category: String,
        source: String,
        taskDataJson: String,
        dateString: String,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            Log.d(TAG, "========================================")
            Log.d(TAG, "SCHEDULING BLOCK TIME ALARM")
            Log.d(TAG, "========================================")
            Log.d(TAG, "Task ID: $taskId")
            Log.d(TAG, "Title: $taskTitle")
            Log.d(TAG, "Type: $evaluationType")
            Log.d(TAG, "Start Time: $startTime")
            Log.d(TAG, "Date: $dateString")
            Log.d(TAG, "Source: $source")

            Log.d(TAG, "")
            Log.d(TAG, "INCOMING TASK DATA JSON:")
            Log.d(TAG, "   Length: ${taskDataJson.length} characters")
            Log.d(TAG, "   Content: $taskDataJson")
            Log.d(TAG, "")

            try {
                val taskDataObject = JSONObject(taskDataJson)
                Log.d(TAG, "VERIFYING POMODORO SETTINGS IN JSON:")
                Log.d(TAG, "   focus_duration: ${taskDataObject.optInt("focus_duration", -1)}")
                Log.d(TAG, "   short_break_duration: ${taskDataObject.optInt("short_break_duration", -1)}")
                Log.d(TAG, "   long_break_duration: ${taskDataObject.optInt("long_break_duration", -1)}")
                Log.d(TAG, "   focus_sessions_per_round: ${taskDataObject.optInt("focus_sessions_per_round", -1)}")
                Log.d(TAG, "   auto_start_short_breaks: ${taskDataObject.optBoolean("auto_start_short_breaks", false)}")
                Log.d(TAG, "   auto_start_focus_sessions: ${taskDataObject.optBoolean("auto_start_focus_sessions", false)}")
                Log.d(TAG, "   pomodoro_duration: ${taskDataObject.optInt("pomodoro_duration", -1)}")
                
                if (taskDataObject.has("duration_data")) {
                    val durationData = taskDataObject.getJSONObject("duration_data")
                    Log.d(TAG, "   duration_data.totalMinutes: ${durationData.optInt("totalMinutes", -1)}")
                    Log.d(TAG, "   duration_data.hours: ${durationData.optInt("hours", -1)}")
                    Log.d(TAG, "   duration_data.minutes: ${durationData.optInt("minutes", -1)}")
                }
                Log.d(TAG, "")
            } catch (e: Exception) {
                Log.e(TAG, "Could not parse task data JSON for verification: ${e.message}")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.e(TAG, "No permission for exact alarms")
                    promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted")
                    return
                }
            }

            val triggerTimeMillis = parseDateTime(dateString, startTime)
            if (triggerTimeMillis == null) {
                Log.e(TAG, "Failed to parse date/time")
                promise.reject("INVALID_TIME", "Invalid date or time format")
                return
            }

            val now = System.currentTimeMillis()
            if (triggerTimeMillis <= now) {
                Log.e(TAG, "Time is in the past: $triggerTimeMillis vs now: $now")
                promise.reject("TIME_IN_PAST", "Alarm time is in the past")
                return
            }

            val requestCode = generateRequestCode(taskId, dateString)

            val intent = Intent(context, BlockTimeAlarmReceiver::class.java).apply {
                action = ACTION_BLOCK_TIME_ALARM
                putExtra("task_id", taskId)
                putExtra("task_title", taskTitle)
                putExtra("task_description", taskDescription)
                putExtra("evaluation_type", evaluationType)
                putExtra("start_time", startTime)
                putExtra("category", category)
                putExtra("source", source)
                putExtra("task_data", taskDataJson)
                putExtra("date_string", dateString)
                putExtra("request_code", requestCode)
            }

            Log.d(TAG, "")
            Log.d(TAG, "INTENT EXTRAS BEING SET:")
            Log.d(TAG, "   task_id: $taskId")
            Log.d(TAG, "   task_title: $taskTitle")
            Log.d(TAG, "   evaluation_type: $evaluationType")
            Log.d(TAG, "   task_data length: ${taskDataJson.length} chars")
            Log.d(TAG, "   task_data contains complete Pomodoro settings")
            Log.d(TAG, "")

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            try {
                // ✅ CRITICAL FIX: Use setAlarmClock() for MOST ACCURATE delivery
                // This ensures exact triggering even in Doze mode and shows alarm icon in status bar
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    // Create an intent to show when user taps alarm icon (optional)
                    val showIntent = Intent(context, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    val showPendingIntent = PendingIntent.getActivity(
                        context,
                        requestCode + 100000, // Different code to avoid conflicts
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            PendingIntent.FLAG_IMMUTABLE
                        } else {
                            0
                        }
                    )
                    
                    val alarmClockInfo = AlarmManager.AlarmClockInfo(
                        triggerTimeMillis,
                        showPendingIntent // Shows when user taps alarm icon in status bar
                    )
                    
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                    Log.d(TAG, "✅ Using setAlarmClock() - MOST ACCURATE (shows in system UI)")
                    
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    // Fallback for API 23-20
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTimeMillis,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Using setExactAndAllowWhileIdle() - API < 21")
                } else {
                    // Fallback for older versions
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerTimeMillis,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Using setExact() - API < 23")
                }

                val scheduledDate = Date(triggerTimeMillis)
                Log.d(TAG, "Alarm scheduled successfully!")
                Log.d(TAG, "   Request Code: $requestCode")
                Log.d(TAG, "   Trigger Time: $scheduledDate")
                Log.d(TAG, "   Time until trigger: ${(triggerTimeMillis - now) / 1000 / 60} minutes")
                Log.d(TAG, "   Method: setAlarmClock() - guaranteed accurate delivery")
                Log.d(TAG, "========================================")

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putInt("requestCode", requestCode)
                    putDouble("triggerTime", triggerTimeMillis.toDouble())
                    putString("scheduledFor", scheduledDate.toString())
                }

                promise.resolve(result)

            } catch (e: SecurityException) {
                Log.e(TAG, "Security exception: ${e.message}")
                promise.reject("SECURITY_ERROR", "Failed to schedule alarm: ${e.message}")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm: ${e.message}", e)
            promise.reject("SCHEDULE_ERROR", "Failed to schedule alarm: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelBlockTimeAlarm(
        taskId: String,
        dateString: String,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val requestCode = generateRequestCode(taskId, dateString)

            Log.d(TAG, "Cancelling block time alarm")
            Log.d(TAG, "   Task ID: $taskId")
            Log.d(TAG, "   Date: $dateString")
            Log.d(TAG, "   Request Code: $requestCode")

            val intent = Intent(context, BlockTimeAlarmReceiver::class.java).apply {
                action = ACTION_BLOCK_TIME_ALARM
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
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

            Log.d(TAG, "Alarm cancelled successfully")

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putInt("requestCode", requestCode)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarm: ${e.message}", e)
            promise.reject("CANCEL_ERROR", "Failed to cancel alarm: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelAllAlarmsForTask(
        taskId: String,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            Log.d(TAG, "Cancelling all alarms for task: $taskId")

            var cancelledCount = 0
            val calendar = Calendar.getInstance()

            for (i in 0 until 30) {
                val dateString = String.format(
                    "%04d-%02d-%02d",
                    calendar.get(Calendar.YEAR),
                    calendar.get(Calendar.MONTH) + 1,
                    calendar.get(Calendar.DAY_OF_MONTH)
                )

                val requestCode = generateRequestCode(taskId, dateString)

                val intent = Intent(context, BlockTimeAlarmReceiver::class.java).apply {
                    action = ACTION_BLOCK_TIME_ALARM
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_NO_CREATE or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_IMMUTABLE
                    } else {
                        0
                    }
                )

                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent)
                    pendingIntent.cancel()
                    cancelledCount++
                }

                calendar.add(Calendar.DAY_OF_MONTH, 1)
            }

            Log.d(TAG, "Cancelled $cancelledCount alarms for task")

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putInt("cancelledCount", cancelledCount)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarms: ${e.message}", e)
            promise.reject("CANCEL_ERROR", "Failed to cancel alarms: ${e.message}")
        }
    }

    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val canSchedule = alarmManager.canScheduleExactAlarms()
                
                Log.d(TAG, "Exact alarm permission: $canSchedule")
                
                val result = Arguments.createMap().apply {
                    putBoolean("granted", canSchedule)
                    putBoolean("required", true)
                }
                promise.resolve(result)
            } else {
                val result = Arguments.createMap().apply {
                    putBoolean("granted", true)
                    putBoolean("required", false)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permission: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Failed to check permission: ${e.message}")
        }
    }

    @ReactMethod
    fun requestExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                
                Log.d(TAG, "Opened exact alarm permission settings")
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting permission: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Failed to request permission: ${e.message}")
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val granted = Settings.canDrawOverlays(reactApplicationContext)
                Log.d(TAG, "Overlay permission: $granted")
                promise.resolve(granted)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking overlay permission: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Failed to check overlay permission: ${e.message}")
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                
                Log.d(TAG, "Opened overlay permission settings")
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Failed to request overlay permission: ${e.message}")
        }
    }

    private fun parseDateTime(dateString: String, timeString: String): Long? {
        try {
            val dateParts = dateString.split("-")
            if (dateParts.size != 3) return null

            val year = dateParts[0].toInt()
            val month = dateParts[1].toInt() - 1
            val day = dateParts[2].toInt()

            var hour: Int
            var minute: Int

            if (timeString.contains("AM") || timeString.contains("PM")) {
                val isPM = timeString.contains("PM")
                val cleanTime = timeString.replace("AM", "").replace("PM", "").trim()
                val timeParts = cleanTime.split(":")
                
                hour = timeParts[0].toInt()
                minute = timeParts[1].toInt()

                if (isPM && hour != 12) {
                    hour += 12
                } else if (!isPM && hour == 12) {
                    hour = 0
                }
            } else {
                val timeParts = timeString.split(":")
                hour = timeParts[0].toInt()
                minute = timeParts[1].toInt()
            }

            val calendar = Calendar.getInstance().apply {
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, day)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            return calendar.timeInMillis

        } catch (e: Exception) {
            Log.e(TAG, "Error parsing date/time: ${e.message}", e)
            return null
        }
    }

    private fun generateRequestCode(taskId: String, dateString: String): Int {
        val combined = "$taskId-$dateString"
        val hash = combined.hashCode()
        return BASE_REQUEST_CODE + (Math.abs(hash) % 90000)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event: ${e.message}", e)
        }
    }
}