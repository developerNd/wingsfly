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
import org.json.JSONArray

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
    
    @ReactMethod
    fun startGetBackLock(durationInMinutes: Int, promise: Promise) {
        try {
            Log.d(TAG, "Starting Get Back lock for $durationInMinutes minutes")
            
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
            
            // Get random media file from storage
            val mediaFilesJson = reactContext
                .getSharedPreferences("GetBackPrefs", Context.MODE_PRIVATE)
                .getString("media_files", null)
            
            var selectedMediaPath: String? = null
            var selectedMediaType: String? = null
            
            if (mediaFilesJson != null) {
                try {
                    val mediaArray = JSONArray(mediaFilesJson)
                    if (mediaArray.length() > 0) {
                        // Pick random media file
                        val randomIndex = (0 until mediaArray.length()).random()
                        val mediaObject = mediaArray.getJSONObject(randomIndex)
                        selectedMediaPath = mediaObject.getString("filePath")
                        selectedMediaType = mediaObject.getString("type")
                        
                        Log.d(TAG, "Selected random media: type=$selectedMediaType, path=$selectedMediaPath")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing media files", e)
                }
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
            
            // Then start the activity with media information
            val activityIntent = Intent(reactContext, GetBackLockActivity::class.java)
            activityIntent.putExtra("duration_minutes", safeDuration)
            activityIntent.putExtra("media_file_path", selectedMediaPath)
            activityIntent.putExtra("media_type", selectedMediaType)
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
    
    @ReactMethod
    fun saveMediaFiles(mediaFilesJson: String, promise: Promise) {
        try {
            reactContext
                .getSharedPreferences("GetBackPrefs", Context.MODE_PRIVATE)
                .edit()
                .putString("media_files", mediaFilesJson)
                .apply()
            
            Log.d(TAG, "Media files saved to SharedPreferences")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving media files", e)
            promise.reject("SAVE_MEDIA_ERROR", e.message)
        }
    }
}