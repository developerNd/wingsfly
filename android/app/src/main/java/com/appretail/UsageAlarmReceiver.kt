package com.wingsfly

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class UsageAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("UsageAlarmReceiver", "Usage alarm received")
        
        try {
            // Check if UsageLimitBlockingService is running
            val serviceIntent = Intent(context, UsageLimitBlockingService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            
            // Schedule next alarm
            UsageLimitBlockingService.scheduleUsageAlarm(context)
            
            Log.d("UsageAlarmReceiver", "Usage limit service restarted via alarm")
        } catch (e: Exception) {
            Log.e("UsageAlarmReceiver", "Error in alarm receiver: ${e.message}", e)
        }
    }
}