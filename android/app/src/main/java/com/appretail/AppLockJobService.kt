package com.wingsfly

import android.app.ActivityManager
import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AppLockJobService : JobService() {
    
    override fun onStartJob(params: JobParameters?): Boolean {
        Log.d("AppLock", "AppLockJobService: onStartJob called")
        
        // Check if the service is running and restart if needed
        if (!isServiceRunning(AppLockService::class.java)) {
            Log.d("AppLock", "AppLockJobService: Service not running, restarting it")
            
            // Start the service
            val serviceIntent = Intent(applicationContext, AppLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(serviceIntent)
            } else {
                applicationContext.startService(serviceIntent)
            }
        } else {
            Log.d("AppLock", "AppLockJobService: Service is already running")
        }
        
        // Return false as we don't need to do any async work
        return false
    }
    
    override fun onStopJob(params: JobParameters?): Boolean {
        // Return true to indicate we want to be rescheduled
        return true
    }
    
    // Helper method to check if a service is running
    private fun isServiceRunning(serviceClass: Class<*>): Boolean {
        try {
            val manager = applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
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
} 