package com.wingsfly

import android.app.ActivityManager
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.Process
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DigitalDetoxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "DigitalDetox"
        const val MODULE_NAME = "DigitalDetoxModule"
        
        // Event emitter instance
        private var eventEmitter: DeviceEventManagerModule.RCTDeviceEventEmitter? = null
        
        // Method to emit events from anywhere in the app
        fun sendEvent(context: ReactApplicationContext, eventName: String, params: WritableMap?) {
            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, params)
                Log.d(TAG, "✅ Event sent: $eventName")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending event: ${e.message}", e)
            }
        }
    }
    
    override fun getName(): String = MODULE_NAME
    
    // ✅ CRITICAL: Implement these methods for NativeEventEmitter support
    @ReactMethod
    fun addListener(eventName: String) {
        Log.d(TAG, "📢 Listener added for: $eventName")
        // Keep track of listener count if needed
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        Log.d(TAG, "📢 Removed $count listeners")
        // Clean up listeners if needed
    }
    
    // Helper method to send events to JavaScript
    private fun sendEventToJS(eventName: String, params: WritableMap? = null) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
            Log.d(TAG, "✅ Event emitted: $eventName")
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting event: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isSilentModeEnabled(promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val ringerMode = audioManager.ringerMode
            
            val isSilent = ringerMode == AudioManager.RINGER_MODE_SILENT || 
                          ringerMode == AudioManager.RINGER_MODE_VIBRATE
            
            Log.d(TAG, "Ringer mode: $ringerMode, Silent/Vibrate: $isSilent")
            promise.resolve(isSilent)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking silent mode: ${e.message}", e)
            promise.reject("CHECK_SILENT_MODE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun openSoundSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_SOUND_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening sound settings: ${e.message}", e)
            promise.reject("OPEN_SOUND_SETTINGS_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun startDetoxLock(durationInMinutes: Int, mediaFilePath: String?, mediaType: String?, promise: Promise) {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🚀 Starting Digital Detox lock for $durationInMinutes minutes")
            Log.d(TAG, "Media: type=$mediaType, path=$mediaFilePath")
            Log.d(TAG, "========================================")
            
            val currentActivity = currentActivity
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Activity is null")
                return
            }
            
            // CRITICAL: Check overlay permission FIRST
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    Log.e(TAG, "❌ Overlay permission NOT granted")
                    promise.reject("NO_OVERLAY_PERMISSION", "Please grant overlay permission first in Settings")
                    
                    try {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            android.net.Uri.parse("package:${reactContext.packageName}")
                        )
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        reactContext.startActivity(intent)
                    } catch (e: Exception) {
                        Log.e(TAG, "Cannot open overlay settings", e)
                    }
                    return
                }
            }
            
            // Check usage stats permission
            val usageStatsGranted = try {
                val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    reactContext.packageName
                )
                mode == AppOpsManager.MODE_ALLOWED
            } catch (e: Exception) {
                false
            }
            
            if (!usageStatsGranted) {
                Log.w(TAG, "⚠️ Usage stats permission not granted - some features may be limited")
            }
            
            // Safety check: Limit maximum duration to 3 hours
            val safeDuration = durationInMinutes.coerceAtMost(180)
            if (safeDuration != durationInMinutes) {
                Log.w(TAG, "Duration limited to 3 hours for safety")
            }
            
            // ✅ CRITICAL FIX: Save to SharedPreferences FIRST, BEFORE starting anything
            val prefs = reactContext.getSharedPreferences("DetoxPrefs", Context.MODE_PRIVATE)
            val endTime = System.currentTimeMillis() + (safeDuration * 60 * 1000L)
            
            // ✅ CRITICAL: Use commit() for SYNCHRONOUS write (not apply() which is async)
            val writeSuccess = prefs.edit().apply {
                putLong("detox_end_time", endTime)
                putBoolean("detox_active", true)
            }.commit() // MUST use commit() not apply() - we need synchronous write!
            
            if (!writeSuccess) {
                Log.e(TAG, "❌ Failed to write preferences!")
                promise.reject("PREFS_WRITE_ERROR", "Failed to save detox state")
                return
            }
            
            Log.d(TAG, "✅ Saved detox state to SharedPreferences:")
            Log.d(TAG, "   - detox_end_time: $endTime")
            Log.d(TAG, "   - detox_active: true")
            Log.d(TAG, "   - duration: $safeDuration minutes")
            Log.d(TAG, "   - Write success: $writeSuccess")
            
            // ✅ VERIFY IMMEDIATELY - retry until we can read it back
            var verified = false
            var attempts = 0
            while (!verified && attempts < 10) {
                val verifyActive = prefs.getBoolean("detox_active", false)
                val verifyEndTime = prefs.getLong("detox_end_time", 0)
                
                if (verifyActive && verifyEndTime == endTime) {
                    verified = true
                    Log.d(TAG, "✅ VERIFICATION SUCCESS on attempt ${attempts + 1}: active=$verifyActive, endTime=$verifyEndTime")
                } else {
                    attempts++
                    Log.w(TAG, "⚠️ Verification attempt $attempts failed, retrying...")
                    Thread.sleep(10) // Wait 10ms and retry
                }
            }
            
            if (!verified) {
                Log.e(TAG, "❌ Could not verify prefs write after 10 attempts!")
                promise.reject("PREFS_VERIFY_ERROR", "Could not verify preferences")
                return
            }
            
            // Set static flags
            DigitalDetoxService.isServiceRunning = true
            DigitalDetoxLockActivity.isLockActive = true
            
            Log.d(TAG, "✅ Set static flags: isServiceRunning=true, isLockActive=true")
            
            // ✅ NOW start the service - prefs are guaranteed to be written
            val serviceIntent = Intent(reactContext, DigitalDetoxService::class.java)
            serviceIntent.putExtra("duration_minutes", safeDuration)
            serviceIntent.putExtra("media_file_path", mediaFilePath)
            serviceIntent.putExtra("media_type", mediaType)
            
            Log.d(TAG, "🚀 Starting DigitalDetoxService...")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }
            
            Log.d(TAG, "✅ Service start command sent")
            
            // Wait 200ms for service to fully start, then start lock activity
            Handler(Looper.getMainLooper()).postDelayed({
                Log.d(TAG, "🚀 Starting lock activity...")
                
                // Start the lock activity
                val activityIntent = Intent(reactContext, DigitalDetoxLockActivity::class.java)
                activityIntent.putExtra("duration_minutes", safeDuration)
                activityIntent.putExtra("media_file_path", mediaFilePath)
                activityIntent.putExtra("media_type", mediaType)
                activityIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                )
                
                reactContext.startActivity(activityIntent)
                
                Log.d(TAG, "========================================")
                Log.d(TAG, "✅ Digital Detox lock started successfully")
                Log.d(TAG, "   Service should be running and monitoring")
                Log.d(TAG, "   Lock screen should be visible")
                Log.d(TAG, "========================================")
                
            }, 200)
            
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "========================================")
            Log.e(TAG, "❌ Error starting Digital Detox lock: ${e.message}", e)
            Log.e(TAG, "========================================")
            promise.reject("START_LOCK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopDetoxLock(promise: Promise) {
        try {
            Log.d(TAG, "Stopping Digital Detox lock")
            
            val intent = Intent("com.wingsfly.STOP_DIGITAL_DETOX")
            reactContext.sendBroadcast(intent)
            
            // Stop the service
            val serviceIntent = Intent(reactContext, DigitalDetoxService::class.java)
            reactContext.stopService(serviceIntent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping Digital Detox lock: ${e.message}", e)
            promise.reject("STOP_LOCK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isDetoxActive(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DetoxPrefs", Context.MODE_PRIVATE)
            
            // ✅ READ ALL VALUES WITH TIMESTAMP
            val detoxActive = prefs.getBoolean("detox_active", false)
            val endTime = prefs.getLong("detox_end_time", 0)
            val currentTime = System.currentTimeMillis()
            
            Log.d(TAG, "========================================")
            Log.d(TAG, "🔍 isDetoxActive CHECK:")
            Log.d(TAG, "   detox_active (prefs): $detoxActive")
            Log.d(TAG, "   endTime: $endTime")
            Log.d(TAG, "   currentTime: $currentTime")
            Log.d(TAG, "   Expired: ${currentTime >= endTime}")
            
            // ✅ CRITICAL FIX: If time has expired, force clear immediately
            if (detoxActive && endTime > 0 && currentTime >= endTime) {
                Log.w(TAG, "⏰ TIME EXPIRED - FORCE CLEARING PREFS")
                
                // Force clear all detox state synchronously
                val cleared = prefs.edit().apply {
                    remove("detox_end_time")
                    remove("detox_active")
                    remove("app_unlocked_until")
                }.commit()
                
                Log.d(TAG, "✅ Cleared expired session (success: $cleared)")
                
                // Clear static flags
                DigitalDetoxService.isServiceRunning = false
                DigitalDetoxLockActivity.isLockActive = false
                DigitalDetoxLockActivity.isAppUnlocked = false
                
                // ✅ EMIT EVENT TO JS
                sendEventToJS("DETOX_COMPLETED", null)
                
                Log.d(TAG, "========================================")
                promise.resolve(false) // NOT ACTIVE
                return
            }
            
            // ✅ Normal check: only active if has time remaining
            val isActive = detoxActive && endTime > 0 && (currentTime < endTime)
            
            Log.d(TAG, "   FINAL RESULT: $isActive")
            Log.d(TAG, "========================================")
            
            promise.resolve(isActive)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error checking detox status: ${e.message}", e)
            promise.reject("CHECK_STATUS_ERROR", e.message)
        }
    }
    
    private fun isServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
        return try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            for (serviceInfo in runningServices) {
                if (serviceClass.name == serviceInfo.service.className) {
                    Log.d(TAG, "✅ Service ${serviceClass.simpleName} IS running")
                    return true
                }
            }
            Log.d(TAG, "❌ Service ${serviceClass.simpleName} NOT running")
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if service is running: ${e.message}", e)
            false
        }
    }
    
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val permissions = WritableNativeMap()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                permissions.putBoolean("overlay", Settings.canDrawOverlays(reactContext))
            } else {
                permissions.putBoolean("overlay", true)
            }
            
            val usageStatsGranted = try {
                val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    reactContext.packageName
                )
                mode == AppOpsManager.MODE_ALLOWED
            } catch (e: Exception) {
                false
            }
            
            permissions.putBoolean("usageStats", usageStatsGranted)
            
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val ringerMode = audioManager.ringerMode
            val isSilent = ringerMode == AudioManager.RINGER_MODE_SILENT || 
                          ringerMode == AudioManager.RINGER_MODE_VIBRATE
            permissions.putBoolean("silentMode", isSilent)
            
            promise.resolve(permissions)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}", e)
            promise.reject("CHECK_PERMISSIONS_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:${reactContext.packageName}")
                    )
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(intent)
                    promise.resolve(false)
                } else {
                    promise.resolve(true)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
            promise.reject("REQUEST_OVERLAY_ERROR", e.message)
        }
    }
}