package com.wingsfly

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.content.Intent
import android.util.Log
import android.content.Context
import android.app.ActivityManager
import android.os.Build
import android.content.SharedPreferences

class PomodoroModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val TAG = "PomodoroModule"
    private val sharedPreferences: SharedPreferences = reactContext.getSharedPreferences("AppLock", Context.MODE_PRIVATE)
    
    override fun getName(): String {
        return "PomodoroModule"
    }
    
    @ReactMethod
    fun startPomodoroBlocking(promise: Promise) {
        try {
            Log.d(TAG, "Starting Pomodoro blocking mode")
            
            // Enable Pomodoro mode and ensure it's not paused
            sharedPreferences.edit()
                .putBoolean("pomodoro_mode", true)
                .putBoolean("pomodoro_paused", false) // Explicitly set to false
                .apply()
            
            // Send command to service to start Pomodoro mode
            val serviceIntent = Intent(reactApplicationContext, AppLockService::class.java)
            serviceIntent.putExtra("command", "start_pomodoro")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            
            Log.d(TAG, "Pomodoro blocking mode started successfully")
            promise.resolve("Pomodoro blocking started")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting Pomodoro blocking: ${e.message}", e)
            promise.reject("ERROR", "Failed to start Pomodoro blocking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopPomodoroBlocking(promise: Promise) {
        try {
            Log.d(TAG, "Stopping Pomodoro blocking mode")
            
            // Disable Pomodoro mode and clear paused state
            sharedPreferences.edit()
                .putBoolean("pomodoro_mode", false)
                .putBoolean("pomodoro_paused", false) // Clear paused state
                .apply()
            
            // Send command to service to stop Pomodoro mode
            val serviceIntent = Intent(reactApplicationContext, AppLockService::class.java)
            serviceIntent.putExtra("command", "stop_pomodoro")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            
            Log.d(TAG, "Pomodoro blocking mode stopped successfully")
            promise.resolve("Pomodoro blocking stopped")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping Pomodoro blocking: ${e.message}", e)
            promise.reject("ERROR", "Failed to stop Pomodoro blocking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun isPomodoroBlocking(promise: Promise) {
        try {
            val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
            val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
            
            // Return true only if Pomodoro mode is active AND not paused
            val isActivelyBlocking = isPomodoroMode && !isPaused
            
            Log.d(TAG, "isPomodoroBlocking check: mode=$isPomodoroMode, paused=$isPaused, activelyBlocking=$isActivelyBlocking")
            promise.resolve(isActivelyBlocking)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Pomodoro status: ${e.message}", e)
            promise.reject("ERROR", "Failed to check Pomodoro status: ${e.message}")
        }
    }
    
    @ReactMethod
    fun pausePomodoroBlocking(promise: Promise) {
        try {
            Log.d(TAG, "Pausing Pomodoro blocking mode")
            
            // Only pause if Pomodoro mode is currently active
            val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
            if (!isPomodoroMode) {
                Log.w(TAG, "Cannot pause - Pomodoro mode is not active")
                promise.reject("ERROR", "Pomodoro mode is not active")
                return
            }
            
            // Set paused state in SharedPreferences
            sharedPreferences.edit()
                .putBoolean("pomodoro_paused", true)
                .apply()
            
            // Send command to service to pause Pomodoro mode
            val serviceIntent = Intent(reactApplicationContext, AppLockService::class.java)
            serviceIntent.putExtra("command", "pause_pomodoro")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            
            Log.d(TAG, "Pomodoro blocking mode paused successfully")
            promise.resolve("Pomodoro blocking paused")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error pausing Pomodoro blocking: ${e.message}", e)
            promise.reject("ERROR", "Failed to pause Pomodoro blocking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun resumePomodoroBlocking(promise: Promise) {
        try {
            Log.d(TAG, "Resuming Pomodoro blocking mode")
            
            // Only resume if Pomodoro mode is active and currently paused
            val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
            val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
            
            if (!isPomodoroMode) {
                Log.w(TAG, "Cannot resume - Pomodoro mode is not active")
                promise.reject("ERROR", "Pomodoro mode is not active")
                return
            }
            
            if (!isPaused) {
                Log.w(TAG, "Cannot resume - Pomodoro mode is not paused")
                promise.resolve("Pomodoro blocking is already active")
                return
            }
            
            // Remove paused state from SharedPreferences
            sharedPreferences.edit()
                .putBoolean("pomodoro_paused", false)
                .apply()
            
            // Send command to service to resume Pomodoro mode
            val serviceIntent = Intent(reactApplicationContext, AppLockService::class.java)
            serviceIntent.putExtra("command", "resume_pomodoro")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            
            Log.d(TAG, "Pomodoro blocking mode resumed successfully")
            promise.resolve("Pomodoro blocking resumed")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error resuming Pomodoro blocking: ${e.message}", e)
            promise.reject("ERROR", "Failed to resume Pomodoro blocking: ${e.message}")
        }
    }
    
    // Add method to get detailed Pomodoro state for debugging
    @ReactMethod
    fun getPomodoroState(promise: Promise) {
        try {
            val isPomodoroMode = sharedPreferences.getBoolean("pomodoro_mode", false)
            val isPaused = sharedPreferences.getBoolean("pomodoro_paused", false)
            
            val stateMap = mutableMapOf<String, Any>()
            stateMap["pomodoroMode"] = isPomodoroMode
            stateMap["paused"] = isPaused
            stateMap["activelyBlocking"] = isPomodoroMode && !isPaused
            
            promise.resolve(stateMap)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting Pomodoro state: ${e.message}", e)
            promise.reject("ERROR", "Failed to get Pomodoro state: ${e.message}")
        }
    }
    
    private fun isServiceRunning(): Boolean {
        try {
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            for (serviceInfo in runningServices) {
                if (AppLockService::class.java.name == serviceInfo.service.className) {
                    return true
                }
            }
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if service is running: ${e.message}", e)
            return false
        }
    }
}