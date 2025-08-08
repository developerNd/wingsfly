package com.wingsfly

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.app.ActivityManager
import android.os.Handler
import android.os.Looper
import android.content.ComponentName
import android.app.Service

class ServiceAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AppLock", "ServiceAlarmReceiver: triggered")
        
        // Check if our service is running
        if (!isServiceRunning(context, AppLockService::class.java)) {
            Log.d("AppLock", "ServiceAlarmReceiver: Service not running, restarting it")
            
            // Start the service with restart flag
            val serviceIntent = Intent(context, AppLockService::class.java)
            serviceIntent.putExtra("restart", true)
            
            // Add foreground flag to signal this is a foreground service
            // This helps with Android 12+ restrictions
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                serviceIntent.putExtra("foreground", true)
            }
            
            // Use FLAG_UPDATE_CURRENT to ensure the intent is updated if it exists
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    context.startForegroundService(serviceIntent)
                    Log.d("AppLock", "Service started with startForegroundService")
                } catch (e: Exception) {
                    Log.e("AppLock", "Error starting foreground service: ${e.message}", e)
                    // Fallback to startService
                    try {
                        context.startService(serviceIntent)
                        Log.d("AppLock", "Service started with fallback startService")
                    } catch (e2: Exception) {
                        Log.e("AppLock", "Even fallback startService failed: ${e2.message}", e2)
                    }
                }
            } else {
                context.startService(serviceIntent)
                Log.d("AppLock", "Service started with startService (pre-O)")
            }
            
            // For Android 12+, we need to ensure the notification is shown quickly
            // to avoid background service restrictions
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Handler(Looper.getMainLooper()).postDelayed({
                    // Check again if service is running after a delay
                    if (!isServiceRunning(context, AppLockService::class.java)) {
                        Log.w("AppLock", "Service still not running after delay, trying one more time")
                        try {
                            context.startForegroundService(serviceIntent)
                        } catch (e: Exception) {
                            Log.e("AppLock", "Final attempt to start service failed", e)
                        }
                    } else {
                        Log.d("AppLock", "Service confirmed running after delay")
                    }
                }, 1000) // 1 second delay
            }
            
            Log.d("AppLock", "ServiceAlarmReceiver: Service restart completed")
        } else {
            Log.d("AppLock", "ServiceAlarmReceiver: Service is already running")
            
            // Service is running, but we should update the notification to keep it visible
            try {
                // Create an intent to the service to request a notification refresh
                val refreshIntent = Intent(context, AppLockService::class.java)
                refreshIntent.putExtra("refresh_notification", true)
                context.startService(refreshIntent)
                
                Log.d("AppLock", "ServiceAlarmReceiver: Requested notification refresh")
                
                // For Android 12+ devices where the notification might be getting suppressed
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // We can also try to directly access the service instance and update its notification
                    getRunningServiceInstance(context, AppLockService::class.java)?.let { service ->
                        Handler(Looper.getMainLooper()).post {
                            (service as AppLockService).updateNotification()
                            Log.d("AppLock", "ServiceAlarmReceiver: Directly called updateNotification on service")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("AppLock", "Error refreshing notification: ${e.message}", e)
            }
        }
        
        // Always reschedule the alarm to create a continuous monitoring system
        AppLockService.scheduleServiceAlarm(context)
    }
    
    // Helper method to check if a service is running
    private fun isServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
        try {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
                if (serviceClass.name == service.service.className) {
                    return true
                }
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error checking if service is running: ${e.message}", e)
        }
        return false
    }
    
    // Helper method to get a reference to a running service
    private fun getRunningServiceInstance(context: Context, serviceClass: Class<*>): Service? {
        try {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
                if (serviceClass.name == service.service.className) {
                    // Get the service binder
                    val serviceBinder = peekService(context, Intent(context, serviceClass))
                    if (serviceBinder != null) {
                        // Now we can try to use our custom binder's asService method
                        return try {
                            // This should work with our ServiceBinder implementation
                            val method = serviceBinder.javaClass.getMethod("asService")
                            method.invoke(serviceBinder) as Service
                        } catch (e: Exception) {
                            Log.e("AppLock", "Error accessing service through binder: ${e.message}", e)
                            null
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("AppLock", "Error getting running service: ${e.message}", e)
        }
        return null
    }
} 