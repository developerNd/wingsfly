package com.wingsfly

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * ✅ Fallback service if activity launch fails
 * Similar to MorningRoutineWakeUpAlarmService
 */
class NightModeLockService : Service() {
    
    companion object {
        private const val TAG = "NightModeLockService"
        private const val CHANNEL_ID = "night_mode_lock_channel"
        private const val NOTIFICATION_ID = 5002
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Night Mode Lock service created")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        
        if (intent != null) {
            val action = intent.getStringExtra("serviceAction")
            
            when (action) {
                "START_LOCK_SCREEN" -> {
                    handleLockScreen(intent)
                }
                "STOP_LOCK_SCREEN" -> {
                    stopLockService()
                }
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun handleLockScreen(intent: Intent) {
        val bedHour = intent.getIntExtra("bed_hour", 0)
        val bedMinute = intent.getIntExtra("bed_minute", 0)
        
        Log.d(TAG, "Handling lock screen for bed time: $bedHour:${String.format("%02d", bedMinute)}")
        
        // Create foreground notification
        val notification = createLockNotification(bedHour, bedMinute)
        startForeground(NOTIFICATION_ID, notification)
        
        // Launch activity
        launchLockActivity(bedHour, bedMinute)
        
        // Auto-stop after 2 hours
        android.os.Handler().postDelayed({
            Log.d(TAG, "Auto-stopping service after 2 hours")
            stopLockService()
        }, 2 * 60 * 60 * 1000)
    }
    
    private fun launchLockActivity(bedHour: Int, bedMinute: Int) {
        try {
            val activityIntent = Intent(this, NightModeLockActivity::class.java)
            activityIntent.putExtra("bed_hour", bedHour)
            activityIntent.putExtra("bed_minute", bedMinute)
            activityIntent.putExtra("from_alarm", true)
            activityIntent.putExtra("app_was_killed", true)
            activityIntent.putExtra("launchedFrom", "SERVICE")
            
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            )
            
            startActivity(activityIntent)
            Log.d(TAG, "Activity launched from service")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch activity", e)
        }
    }
    
    private fun createLockNotification(bedHour: Int, bedMinute: Int): Notification {
        val notificationIntent = Intent(this, NightModeLockActivity::class.java)
        notificationIntent.putExtra("bed_hour", bedHour)
        notificationIntent.putExtra("bed_minute", bedMinute)
        
        notificationIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        )
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            NOTIFICATION_ID,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        )
        
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }
        
        builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
               .setContentTitle("🌙 Night Mode Active")
               .setContentText("Bedtime: $bedHour:${String.format("%02d", bedMinute)}")
               .setContentIntent(pendingIntent)
               .setPriority(Notification.PRIORITY_HIGH)
               .setCategory(Notification.CATEGORY_ALARM)
               .setOngoing(true)
               .setAutoCancel(false)
        
        return builder.build()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Night Mode Lock",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.description = "Night Mode lock screen service"
            channel.setSound(null, null)
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }
    
    private fun stopLockService() {
        Log.d(TAG, "Stopping lock service")
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.cancel(NOTIFICATION_ID)
        
        stopForeground(true)
        stopSelf()
    }
    
    override fun onDestroy() {
        Log.d(TAG, "Service destroyed")
        super.onDestroy()
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}