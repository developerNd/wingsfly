package com.wingsfly

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*

class GetBackModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "GetBack"
        const val MODULE_NAME = "GetBackModule"
    }
    
    override fun getName(): String = MODULE_NAME
    
    /**
     * Check if silent mode (or vibrate mode) is enabled
     */
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
    
    /**
     * Open sound settings for user to enable silent mode
     */
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
    
    /**
     * ✅ UPDATED: Start Get Back lock with URLs from Supabase
     * @param durationInMinutes - Session duration
     * @param confirmationVideoUrl - URL to confirmation video from Supabase
     * @param mediaFileUrl - URL to media file (video/audio) from Supabase (nullable)
     * @param mediaType - Type of media: "video" or "audio" (nullable)
     */
    @ReactMethod
    fun startGetBackLock(
        durationInMinutes: Int, 
        confirmationVideoUrl: String,
        mediaFileUrl: String?,
        mediaType: String?,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🚀 Starting Get Back lock for $durationInMinutes minutes")
            Log.d(TAG, "Confirmation video URL: $confirmationVideoUrl")
            Log.d(TAG, "Media URL: $mediaFileUrl")
            Log.d(TAG, "Media type: $mediaType")
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
                    
                    // Open settings to grant permission
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
            
            // Start the service first
            val serviceIntent = Intent(reactContext, GetBackService::class.java)
            serviceIntent.putExtra("duration_minutes", safeDuration)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }
            
            // ✅ Start the activity with media URLs from Supabase
            val activityIntent = Intent(reactContext, GetBackLockActivity::class.java)
            activityIntent.putExtra("duration_minutes", safeDuration)
            activityIntent.putExtra("confirmation_video_url", confirmationVideoUrl)
            activityIntent.putExtra("media_file_url", mediaFileUrl)
            activityIntent.putExtra("media_type", mediaType)
            activityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or 
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            )
            
            reactContext.startActivity(activityIntent)
            
            Log.d(TAG, "✅ Get Back lock started successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting Get Back lock: ${e.message}", e)
            promise.reject("START_LOCK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopGetBackLock(promise: Promise) {
        try {
            Log.d(TAG, "Stopping Get Back lock")
            
            val intent = Intent("com.wingsfly.STOP_GET_BACK")
            reactContext.sendBroadcast(intent)
            
            // Stop the service
            val serviceIntent = Intent(reactContext, GetBackService::class.java)
            reactContext.stopService(serviceIntent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping Get Back lock: ${e.message}", e)
            promise.reject("STOP_LOCK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isGetBackActive(promise: Promise) {
        try {
            promise.resolve(GetBackService.isServiceRunning)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Get Back status: ${e.message}", e)
            promise.reject("CHECK_STATUS_ERROR", e.message)
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
            
            permissions.putBoolean("usageStats", usageStatsGranted)
            
            // Check silent mode
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
                    promise.resolve(false) // Not granted yet, opened settings
                } else {
                    promise.resolve(true) // Already granted
                }
            } else {
                promise.resolve(true) // Not needed on older Android
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
            promise.reject("REQUEST_OVERLAY_ERROR", e.message)
        }
    }
}