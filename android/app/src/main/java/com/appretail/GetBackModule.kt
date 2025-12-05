package com.wingsfly

import android.app.AppOpsManager
import android.app.NotificationManager
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
    
    // ========================================
    // DND (Do Not Disturb) METHODS
    // ========================================
    
    /**
     * Check if app has DND access permission
     */
    @ReactMethod
    fun hasDndPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val hasAccess = notificationManager.isNotificationPolicyAccessGranted
                
                Log.d(TAG, "DND Permission status: $hasAccess")
                promise.resolve(hasAccess)
            } else {
                Log.d(TAG, "DND not supported on Android < 6.0")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking DND permission: ${e.message}", e)
            promise.reject("CHECK_DND_PERMISSION_ERROR", e.message)
        }
    }
    
    /**
     * Request DND access permission (opens Settings)
     */
    @ReactMethod
    fun requestDndPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                if (notificationManager.isNotificationPolicyAccessGranted) {
                    Log.d(TAG, "DND permission already granted")
                    promise.resolve(true)
                    return
                }
                
                Log.d(TAG, "Opening DND permission settings")
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                
                promise.resolve(false)
            } else {
                Log.d(TAG, "DND not supported on Android < 6.0")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting DND permission: ${e.message}", e)
            promise.reject("REQUEST_DND_PERMISSION_ERROR", e.message)
        }
    }
    
    /**
     * Check if DND is currently enabled
     */
    @ReactMethod
    fun isDndEnabled(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                if (!notificationManager.isNotificationPolicyAccessGranted) {
                    Log.w(TAG, "Cannot check DND status - permission not granted")
                    promise.resolve(false)
                    return
                }
                
                val currentFilter = notificationManager.currentInterruptionFilter
                val isDndActive = currentFilter != NotificationManager.INTERRUPTION_FILTER_ALL
                
                Log.d(TAG, "DND status: $isDndActive (filter: $currentFilter)")
                promise.resolve(isDndActive)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking DND status: ${e.message}", e)
            promise.reject("CHECK_DND_STATUS_ERROR", e.message)
        }
    }
    
    /**
     * Enable DND mode
     */
    @ReactMethod
    fun enableDnd(mode: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                if (!notificationManager.isNotificationPolicyAccessGranted) {
                    Log.e(TAG, "Cannot enable DND - permission not granted")
                    promise.reject("NO_DND_PERMISSION", "DND permission not granted")
                    return
                }
                
                val interruptionFilter = when (mode) {
                    "total_silence" -> NotificationManager.INTERRUPTION_FILTER_NONE
                    "alarms_only" -> NotificationManager.INTERRUPTION_FILTER_ALARMS
                    "priority_only" -> NotificationManager.INTERRUPTION_FILTER_PRIORITY
                    else -> NotificationManager.INTERRUPTION_FILTER_ALARMS
                }
                
                Log.d(TAG, "Enabling DND with mode: $mode (filter: $interruptionFilter)")
                notificationManager.setInterruptionFilter(interruptionFilter)
                
                val currentFilter = notificationManager.currentInterruptionFilter
                val success = currentFilter == interruptionFilter
                
                if (success) {
                    Log.d(TAG, "✅ DND enabled successfully")
                } else {
                    Log.w(TAG, "⚠️ DND may not have been set properly")
                }
                
                promise.resolve(success)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling DND: ${e.message}", e)
            promise.reject("ENABLE_DND_ERROR", e.message)
        }
    }
    
    /**
     * Disable DND mode
     */
    @ReactMethod
    fun disableDnd(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                if (!notificationManager.isNotificationPolicyAccessGranted) {
                    Log.e(TAG, "Cannot disable DND - permission not granted")
                    promise.reject("NO_DND_PERMISSION", "DND permission not granted")
                    return
                }
                
                Log.d(TAG, "Disabling DND")
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
                
                val currentFilter = notificationManager.currentInterruptionFilter
                val success = currentFilter == NotificationManager.INTERRUPTION_FILTER_ALL
                
                if (success) {
                    Log.d(TAG, "✅ DND disabled successfully")
                } else {
                    Log.w(TAG, "⚠️ DND may not have been disabled properly")
                }
                
                promise.resolve(success)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling DND: ${e.message}", e)
            promise.reject("DISABLE_DND_ERROR", e.message)
        }
    }
    
    // ========================================
    // SILENT MODE METHODS (Deprecated)
    // ========================================
    
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
    
    // ========================================
    // GET BACK LOCK METHODS
    // ========================================
    
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
            
            // Start the activity with media URLs from Supabase
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
            
            // Check DND permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                permissions.putBoolean("dnd", notificationManager.isNotificationPolicyAccessGranted)
            } else {
                permissions.putBoolean("dnd", false)
            }
            
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