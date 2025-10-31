package com.wingsfly

import android.app.Activity
import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.View
import android.view.Window
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class YouTubeNightModeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "YouTubeNightMode"
        var isLockActive = false
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private val systemUIHandler = Handler(Looper.getMainLooper())
    private var systemUIRunnable: Runnable? = null
    private var screenUnlockReceiver: BroadcastReceiver? = null

    override fun getName(): String = "YouTubeNightModeModule"

    @ReactMethod
    fun enableKioskLock(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Activity not available")
                    return@runOnUiThread
                }

                Log.d(TAG, "========================================")
                Log.d(TAG, "Enabling YouTube Night Mode Lock")
                Log.d(TAG, "========================================")

                isLockActive = true

                // Register screen unlock receiver
                registerScreenUnlockReceiver(activity)

                // Setup kiosk mode (app pinning)
                setupKioskMode(activity)

                // Setup full-screen lock mode
                setupFullScreenLockMode(activity)

                // Start continuous system UI hiding
                startContinuousSystemUIHiding(activity)

                // Acquire wake lock
                acquireWakeLock(activity)

                Log.d(TAG, "✅ Night Mode Lock enabled successfully")
                promise.resolve(true)

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error enabling lock: ${e.message}", e)
                promise.reject("ENABLE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun disableKioskLock(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Activity not available")
                    return@runOnUiThread
                }

                Log.d(TAG, "========================================")
                Log.d(TAG, "Disabling YouTube Night Mode Lock")
                Log.d(TAG, "========================================")

                isLockActive = false

                // Unregister screen unlock receiver
                unregisterScreenUnlockReceiver()

                // Stop continuous system UI hiding
                stopContinuousSystemUIHiding()

                // Exit kiosk mode
                exitKioskMode(activity)

                // Release wake lock
                releaseWakeLock()

                // Show system UI
                showSystemUI(activity)

                Log.d(TAG, "✅ Night Mode Lock disabled successfully")
                promise.resolve(true)

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error disabling lock: ${e.message}", e)
                promise.reject("DISABLE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun isLocked(promise: Promise) {
        try {
            promise.resolve(isLockActive)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun blockSystemUI(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Activity not available")
                    return@runOnUiThread
                }

                hideSystemUIMaximum(activity)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("BLOCK_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun showSystemUI(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Activity not available")
                    return@runOnUiThread
                }

                showSystemUI(activity)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SHOW_ERROR", e.message, e)
            }
        }
    }

    // ==================== SCREEN UNLOCK RECEIVER ====================

    private fun registerScreenUnlockReceiver(activity: Activity) {
        try {
            // Unregister if already exists
            unregisterScreenUnlockReceiver()

            screenUnlockReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    when (intent?.action) {
                        Intent.ACTION_USER_PRESENT -> {
                            // Screen unlocked by user
                            Log.d(TAG, "🔓 Screen unlocked - Reapplying kiosk lock")
                            if (isLockActive) {
                                Handler(Looper.getMainLooper()).postDelayed({
                                    currentActivity?.let { act ->
                                        setupKioskMode(act)
                                        hideSystemUIMaximum(act)
                                    }
                                }, 200) // Small delay to ensure UI is ready
                            }
                        }
                        Intent.ACTION_SCREEN_ON -> {
                            // Screen turned on
                            Log.d(TAG, "💡 Screen turned on")
                            if (isLockActive) {
                                Handler(Looper.getMainLooper()).postDelayed({
                                    currentActivity?.let { act ->
                                        hideSystemUIMaximum(act)
                                    }
                                }, 100)
                            }
                        }
                        Intent.ACTION_SCREEN_OFF -> {
                            Log.d(TAG, "🌙 Screen turned off")
                        }
                    }
                }
            }

            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_USER_PRESENT) // User unlocked the device
                addAction(Intent.ACTION_SCREEN_ON)     // Screen turned on
                addAction(Intent.ACTION_SCREEN_OFF)    // Screen turned off
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(screenUnlockReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                activity.registerReceiver(screenUnlockReceiver, filter)
            }

            Log.d(TAG, "✅ Screen unlock receiver registered")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error registering screen unlock receiver: ${e.message}")
        }
    }

    private fun unregisterScreenUnlockReceiver() {
        try {
            screenUnlockReceiver?.let {
                currentActivity?.unregisterReceiver(it)
                Log.d(TAG, "✅ Screen unlock receiver unregistered")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error unregistering receiver: ${e.message}")
        } finally {
            screenUnlockReceiver = null
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private fun setupKioskMode(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    val activityManager = activity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    val lockTaskMode = activityManager.lockTaskModeState
                    
                    when (lockTaskMode) {
                        ActivityManager.LOCK_TASK_MODE_NONE -> {
                            activity.startLockTask()
                            Log.d(TAG, "✅ Kiosk mode (app pinning) activated - Blocks status bar & navigation")
                        }
                        ActivityManager.LOCK_TASK_MODE_LOCKED -> {
                            Log.d(TAG, "ℹ️ Already in LOCKED task mode")
                        }
                        ActivityManager.LOCK_TASK_MODE_PINNED -> {
                            Log.d(TAG, "ℹ️ Already in PINNED task mode")
                        }
                        else -> {
                            Log.d(TAG, "ℹ️ Lock task mode state: $lockTaskMode")
                        }
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "⚠️ Kiosk mode requires device owner or user must pin app manually: ${e.message}")
                } catch (e: IllegalStateException) {
                    Log.w(TAG, "⚠️ Cannot start lock task in current state: ${e.message}")
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Kiosk mode not available: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Kiosk mode error: ${e.message}")
        }
    }

    private fun exitKioskMode(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val activityManager = activity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                if (activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE) {
                    activity.stopLockTask()
                    Log.d(TAG, "✅ Kiosk mode exited")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Exit kiosk error: ${e.message}")
        }
    }

    private fun setupFullScreenLockMode(activity: Activity) {
        val window: Window = activity.window

        // Set window flags for immersive experience
        val flags = WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL

        window.addFlags(flags)

        // Initial system UI hide
        hideSystemUIMaximum(activity)

        // Setup system bars appearance
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.statusBarColor = Color.WHITE
            window.navigationBarColor = Color.WHITE

            // Re-hide system UI if it appears
            window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
                if (isLockActive && (visibility and View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        hideSystemUIMaximum(activity)
                    }, 100)
                }
            }
        }
    }

    private fun hideSystemUIMaximum(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11+ (API 30+)
                activity.window.setDecorFitsSystemWindows(false)
                activity.window.insetsController?.let { controller ->
                    controller.hide(
                        android.view.WindowInsets.Type.statusBars() or 
                        android.view.WindowInsets.Type.navigationBars() or
                        android.view.WindowInsets.Type.systemBars()
                    )
                    controller.systemBarsBehavior = 
                        android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                // Android 10 and below
                @Suppress("DEPRECATION")
                activity.window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LOW_PROFILE
                )
            }
            Log.d(TAG, "System UI hidden")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error hiding system UI: ${e.message}")
        }
    }

    private fun showSystemUI(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                activity.window.setDecorFitsSystemWindows(true)
                activity.window.insetsController?.show(
                    android.view.WindowInsets.Type.statusBars() or 
                    android.view.WindowInsets.Type.navigationBars() or
                    android.view.WindowInsets.Type.systemBars()
                )
            } else {
                @Suppress("DEPRECATION")
                activity.window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
            }
            Log.d(TAG, "System UI shown")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error showing system UI: ${e.message}")
        }
    }

    private fun startContinuousSystemUIHiding(activity: Activity) {
        // Cancel any existing runnable
        systemUIRunnable?.let { 
            systemUIHandler.removeCallbacks(it)
        }

        // Create new runnable that continuously hides system UI
        systemUIRunnable = object : Runnable {
            override fun run() {
                if (isLockActive) {
                    hideSystemUIMaximum(activity)
                    systemUIHandler.postDelayed(this, 500) // Check every 500ms
                }
            }
        }
        systemUIHandler.post(systemUIRunnable!!)
        Log.d(TAG, "Started continuous system UI hiding")
    }

    private fun stopContinuousSystemUIHiding() {
        systemUIRunnable?.let {
            systemUIHandler.removeCallbacks(it)
            Log.d(TAG, "Stopped continuous system UI hiding")
        }
        systemUIRunnable = null
    }

    private fun acquireWakeLock(activity: Activity) {
        try {
            val powerManager = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "YouTubeNightMode:LockScreen"
            )
            wakeLock?.acquire(60 * 60 * 1000L) // 1 hour max
            Log.d(TAG, "✅ Wake lock acquired (screen will stay on)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error acquiring wake lock: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "✅ Wake lock released")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error releasing wake lock: ${e.message}")
        } finally {
            wakeLock = null
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        
        try {
            val activity = currentActivity
            if (activity != null && isLockActive) {
                unregisterScreenUnlockReceiver()
                stopContinuousSystemUIHiding()
                releaseWakeLock()
                exitKioskMode(activity)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in cleanup: ${e.message}")
        }
    }
}