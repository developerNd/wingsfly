package com.wingsfly

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.*

class ChallengeNativeScheduler(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "ChallengeScheduler"
    }
    
    override fun getName(): String {
        return "ChallengeNativeScheduler"
    }
    
    /**
     * Schedule both time slots for a challenge
     */
    @ReactMethod
    fun scheduleChallenge(challengeData: ReadableMap, promise: Promise) {
        try {
            val challengeId = challengeData.getString("id") ?: run {
                promise.reject("INVALID_DATA", "Challenge ID is required")
                return
            }
            
            val challengeName = challengeData.getString("name") ?: "Challenge"
            val videoPath = challengeData.getString("video_path") ?: run {
                promise.reject("INVALID_DATA", "Video path is required")
                return
            }
            val category = challengeData.getString("category") ?: "General"
            
            // Get time slots
            val timeSlot1 = challengeData.getMap("time_slot_1")
            val timeSlot2 = challengeData.getMap("time_slot_2")
            
            if (timeSlot1 == null || timeSlot2 == null) {
                promise.reject("INVALID_DATA", "Both time slots are required")
                return
            }
            
            val slot1Time = timeSlot1.getString("startTime") ?: run {
                promise.reject("INVALID_DATA", "Time slot 1 start time is required")
                return
            }
            
            val slot1EndTime = timeSlot1.getString("endTime") ?: run {
                promise.reject("INVALID_DATA", "Time slot 1 end time is required")
                return
            }
            
            val slot2Time = timeSlot2.getString("startTime") ?: run {
                promise.reject("INVALID_DATA", "Time slot 2 start time is required")
                return
            }
            
            val slot2EndTime = timeSlot2.getString("endTime") ?: run {
                promise.reject("INVALID_DATA", "Time slot 2 end time is required")
                return
            }
            
            Log.d(TAG, "========================================")
            Log.d(TAG, "Scheduling challenge: $challengeName")
            Log.d(TAG, "Slot 1: $slot1Time - $slot1EndTime")
            Log.d(TAG, "Slot 2: $slot2Time - $slot2EndTime")
            Log.d(TAG, "========================================")
            
            // Schedule both slots
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            scheduleSlot(alarmManager, challengeId, challengeName, videoPath, category, slot1Time, slot1EndTime, 1)
            scheduleSlot(alarmManager, challengeId, challengeName, videoPath, category, slot2Time, slot2EndTime, 2)
            
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling challenge: ${e.message}", e)
            promise.reject("SCHEDULE_ERROR", "Failed to schedule challenge: ${e.message}")
        }
    }
    
    /**
     * Schedule a single time slot with end time
     */
    private fun scheduleSlot(
        alarmManager: AlarmManager,
        challengeId: String,
        challengeName: String,
        videoPath: String,
        category: String,
        startTimeString: String,
        endTimeString: String,
        slotNumber: Int
    ) {
        try {
            // Parse start time (format: "10:30 AM" or "2:45 PM")
            val calendar = parseTimeToCalendar(startTimeString)
            
            // If time has passed today, schedule for tomorrow
            if (calendar.timeInMillis <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_MONTH, 1)
            }
            
            // Create intent for ChallengeAlarmReceiver
            val intent = Intent(reactApplicationContext, ChallengeAlarmReceiver::class.java).apply {
                action = "com.wingsfly.CHALLENGE_TRIGGER_$challengeId"
                putExtra("challenge_id", challengeId)
                putExtra("challenge_name", challengeName)
                putExtra("video_path", videoPath)
                putExtra("category", category)
                putExtra("slot_number", slotNumber)
                putExtra("end_time", endTimeString) // Pass end time to receiver
            }
            
            // Create unique request code
            val requestCode = (challengeId + "_slot$slotNumber").hashCode()
            
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Schedule exact alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
            
            Log.d(TAG, "✅ Scheduled slot $slotNumber at ${calendar.time}, ends at $endTimeString")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling slot $slotNumber: ${e.message}", e)
        }
    }
    
    /**
     * Cancel all alarms for a challenge
     */
    @ReactMethod
    fun cancelChallenge(challengeId: String, promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            // Cancel both slots
            for (slotNumber in 1..2) {
                val intent = Intent(reactApplicationContext, ChallengeAlarmReceiver::class.java).apply {
                    action = "com.wingsfly.CHALLENGE_TRIGGER_$challengeId"
                }
                
                val requestCode = (challengeId + "_slot$slotNumber").hashCode()
                
                val pendingIntent = PendingIntent.getBroadcast(
                    reactApplicationContext,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
            
            Log.d(TAG, "✅ Cancelled challenge: $challengeId")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling challenge: ${e.message}", e)
            promise.reject("CANCEL_ERROR", "Failed to cancel challenge: ${e.message}")
        }
    }
    
    /**
     * Parse time string to Calendar
     * Format: "10:30 AM" or "2:45 PM"
     */
    private fun parseTimeToCalendar(timeString: String): Calendar {
        val parts = timeString.trim().split(" ")
        val timeParts = parts[0].split(":")
        val period = parts[1].uppercase()
        
        var hours = timeParts[0].toInt()
        val minutes = timeParts[1].toInt()
        
        // Convert to 24-hour format
        if (period == "PM" && hours != 12) {
            hours += 12
        } else if (period == "AM" && hours == 12) {
            hours = 0
        }
        
        return Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hours)
            set(Calendar.MINUTE, minutes)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
    }
}