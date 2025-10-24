package com.wingsfly

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device booted - starting services and scheduling reminders")
            
            // Start AppLockService
            try {
                val serviceIntent = Intent(context, AppLockService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
                Log.d(TAG, "AppLockService started after boot")
            } catch (e: Exception) {
                Log.e(TAG, "Error starting AppLockService: ${e.message}", e)
            }
            
            // ✅ NEW: Schedule date reminders after boot
            try {
                DateReminderScheduler.scheduleDailyReminders(context)
                Log.d(TAG, "Date reminders scheduled after boot")
            } catch (e: Exception) {
                Log.e(TAG, "Error scheduling date reminders: ${e.message}", e)
            }
        }
    }
}