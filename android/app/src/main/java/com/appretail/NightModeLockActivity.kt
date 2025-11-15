package com.wingsfly

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.Window
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.*

class NightModeLockActivity : Activity() {
    
    companion object {
        private const val TAG = "NightModeLockActivity"
        var isLockActive = false
    }
    
    private var bedHour: Int = 0
    private var bedMinute: Int = 0
    private var fromAlarm: Boolean = false
    private var appWasKilled: Boolean = false
    private var wakeLock: PowerManager.WakeLock? = null
    private var timeHandler: Handler? = null
    private var timeUpdateRunnable: Runnable? = null
    
    // PERSISTENT OVERLAY
    private var persistentOverlay: android.view.View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    private var isHandlingScreenEvent = false
    private var isOpeningApp = false
    
    // UI references
    private var overlayTitleTextView: TextView? = null
    private var overlayMessageTextView: TextView? = null
    private var overlayBedTimeTextView: TextView? = null
    private var overlayCurrentTimeTextView: TextView? = null
    private var overlayOpenAppButton: Button? = null
    
    // Screen state receiver
    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (isHandlingScreenEvent) {
                Log.d(TAG, "⏭️ Already handling screen event, skipping")
                return
            }
            
            isHandlingScreenEvent = true
            
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.d(TAG, "📱 Screen turned OFF - User pressed lock button")
                    handleScreenOff()
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.d(TAG, "📱 Screen turned ON")
                    handleScreenOn()
                }
                Intent.ACTION_USER_PRESENT -> {
                    Log.d(TAG, "🔓 User unlocked device")
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isOverlayCreated && persistentOverlay != null) {
                            persistentOverlay?.bringToFront()
                            persistentOverlay?.invalidate()
                        }
                        isHandlingScreenEvent = false
                    }, 200)
                    return
                }
            }
            
            Handler(Looper.getMainLooper()).postDelayed({
                isHandlingScreenEvent = false
            }, 1000)
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "🌙 NIGHT MODE LOCK ACTIVITY CREATED")
        Log.d(TAG, "========================================")
        
        bedHour = intent.getIntExtra("bed_hour", 0)
        bedMinute = intent.getIntExtra("bed_minute", 0)
        fromAlarm = intent.getBooleanExtra("from_alarm", false)
        appWasKilled = intent.getBooleanExtra("app_was_killed", false)
        
        Log.d(TAG, "Bed time: $bedHour:${String.format("%02d", bedMinute)}")
        Log.d(TAG, "From alarm: $fromAlarm")
        Log.d(TAG, "App was killed: $appWasKilled")
        
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.e(TAG, "❌ NO OVERLAY PERMISSION")
                proceedToMainActivity()
                finish()
                return
            }
        }
        
        // ✅ CRITICAL: Setup in correct order (like GetBackLockActivity)
        setupBasicActivity()
        
        // Set basic content view (transparent)
        setContentView(R.layout.activity_night_mode_lock)
        
        // ✅ Create overlay with delay (like GetBackLockActivity)
        Handler(Looper.getMainLooper()).postDelayed({
            createPersistentLockOverlay()
        }, 300)
        
        registerReceivers()
        startTimeUpdates()
        
        isLockActive = true
        
        Log.d(TAG, "✅ Night Mode lock screen active")
        Log.d(TAG, "========================================")
    }
    
    /**
     * ✅ Setup basic activity (EXACTLY like GetBackLockActivity)
     * This method works perfectly to bypass lock screen
     */
    private fun setupBasicActivity() {
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        
        acquireWakeLock()
        
        Log.d(TAG, "✅ Basic activity setup complete - lock screen bypassed")
    }
    
    /**
     * ✅ ENHANCED: Acquire aggressive wake lock
     */
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            
            // ✅ Use FULL_WAKE_LOCK for maximum power
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "NightMode:ActivityLock"
            )
            
            // ✅ Keep for longer duration
            wakeLock?.acquire(60 * 60 * 1000L) // 60 minutes
            Log.d(TAG, "✅ FULL wake lock acquired (60 min)")
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error", e)
        }
    }
    
    /**
     * ✅ Handle screen off - AGGRESSIVELY wake screen back up (like GetBackLockActivity)
     */
    private fun handleScreenOff() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🔒 USER PRESSED LOCK BUTTON")
            Log.d(TAG, "========================================")
            
            // ✅ CRITICAL: Acquire NEW aggressive wake lock to turn screen back ON
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            val screenWakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "NightMode:ScreenOnWake"
            )
            
            // ✅ This will FORCE the screen to turn back on
            screenWakeLock?.acquire(3000L) // 3 seconds to wake screen
            
            Log.d(TAG, "🔆 Aggressive wake lock acquired - FORCING screen back ON")
            
            // ✅ Keep main wake lock active too
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire(60 * 60 * 1000L)
            }
            
            // ✅ Release the aggressive wake lock after delay
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    if (screenWakeLock?.isHeld == true) {
                        screenWakeLock.release()
                        Log.d(TAG, "🔓 Released aggressive screen wake lock")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error releasing screen wake lock", e)
                }
            }, 3000)
            
            Log.d(TAG, "⏸️ Screen will turn back ON automatically")
            Log.d(TAG, "========================================")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error handling screen off", e)
        }
    }
    
    /**
     * ✅ Handle screen on - Simply refresh overlay (like GetBackLockActivity)
     */
    private fun handleScreenOn() {
        try {
            // Simply ensure the existing overlay is visible
            Handler(Looper.getMainLooper()).postDelayed({
                if (isOverlayCreated && persistentOverlay != null) {
                    // Just bring to front, don't recreate
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                    
                    // Update displays
                    updateCurrentTime()
                    
                    Log.d(TAG, "✅ Overlay refreshed on screen on")
                } else {
                    // Only recreate if it's missing
                    Log.w(TAG, "⚠️ Overlay missing on screen on - recreating")
                    createPersistentLockOverlay()
                }
            }, 150)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling screen on", e)
        }
    }
    
    private fun createPersistentLockOverlay() {
        try {
            if (isOverlayCreated && persistentOverlay != null) {
                Log.d(TAG, "⏭️ Overlay already exists, skipping creation")
                return
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(this)) {
                    Log.e(TAG, "❌ Cannot create overlay")
                    return
                }
            }
            
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            
            // Remove existing overlay if present
            if (persistentOverlay != null) {
                try {
                    windowManager?.removeView(persistentOverlay)
                } catch (e: Exception) { 
                    Log.w(TAG, "Error removing old overlay", e)
                }
                persistentOverlay = null
            }
            
            // Inflate the night mode lock screen layout
            val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
            persistentOverlay = inflater.inflate(R.layout.activity_night_mode_lock, null)
            
            // Initialize UI elements
            overlayTitleTextView = persistentOverlay?.findViewById(R.id.nightModeTitleText)
            overlayMessageTextView = persistentOverlay?.findViewById(R.id.nightModeMessageText)
            overlayBedTimeTextView = persistentOverlay?.findViewById(R.id.bedTimeText)
            overlayCurrentTimeTextView = persistentOverlay?.findViewById(R.id.currentTime)
            overlayOpenAppButton = persistentOverlay?.findViewById(R.id.openAppButton)
            
            // Set bed time
            overlayBedTimeTextView?.text = "Bedtime: $bedHour:${String.format("%02d", bedMinute)}"
            
            // Update current time
            updateCurrentTime()
            
            // ✅ Button click handler
            overlayOpenAppButton?.setOnClickListener {
                Log.d(TAG, "========================================")
                Log.d(TAG, "🚀 Open App button clicked")
                Log.d(TAG, "========================================")
                
                if (isOpeningApp) {
                    Log.d(TAG, "⏭️ Already opening app, ignoring")
                    return@setOnClickListener
                }
                
                isOpeningApp = true
                overlayOpenAppButton?.isEnabled = false
                overlayOpenAppButton?.alpha = 0.5f
                
                proceedToMainActivity()
            }
            
            // ✅ Window parameters for persistent overlay
            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_SYSTEM_ERROR
                },
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            )
            
            layoutParams.gravity = Gravity.TOP or Gravity.START
            layoutParams.x = 0
            layoutParams.y = 0
            
            // Add the overlay to WindowManager
            windowManager?.addView(persistentOverlay, layoutParams)
            
            isOverlayCreated = true
            Log.d(TAG, "✅ Persistent overlay created and displayed")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error creating persistent overlay", e)
            isOverlayCreated = false
        }
    }
    
    private fun proceedToMainActivity() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "🚀 Starting MainActivity transition")
        Log.d(TAG, "========================================")
        
        try {
            // Stop vibration service
            try {
                val stopVibrationIntent = Intent(this, NightModeVibrationService::class.java)
                stopService(stopVibrationIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping vibration service: ${e.message}")
            }
            
            // Cancel notification
            cancelNotification()
            
            // Remove overlay
            removePersistentOverlay()
            
            // Small delay
            Handler(Looper.getMainLooper()).postDelayed({
                
                // Stop time updates
                timeHandler?.removeCallbacks(timeUpdateRunnable!!)
                
                // Launch MainActivity
                val mainIntent = Intent(this, MainActivity::class.java).apply {
                    action = "TRIGGER_NIGHT_MODE"
                    
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                    
                    putExtra("trigger_night_mode", true)
                    putExtra("bed_hour", bedHour)
                    putExtra("bed_minute", bedMinute)
                    putExtra("from_alarm", fromAlarm)
                    putExtra("app_was_killed", appWasKilled)
                    putExtra("from_lock_screen", true)
                }
                
                startActivity(mainIntent)
                Log.d(TAG, "✅ MainActivity started")
                
                // Cleanup after delay
                Handler(Looper.getMainLooper()).postDelayed({
                    finishNightModeLock()
                }, 800)
                
            }, 300)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error proceeding to MainActivity: ${e.message}", e)
            finishNightModeLock()
        }
    }
    
    /**
     * ✅ Cancel notification
     */
    private fun cancelNotification() {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(9999) // Same ID as in receiver
            Log.d(TAG, "✅ Notification cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling notification", e)
        }
    }
    
    private fun registerReceivers() {
        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, screenFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenStateReceiver, screenFilter)
        }
        
        Log.d(TAG, "✅ Receivers registered")
    }
    
    private fun startTimeUpdates() {
        timeHandler = Handler(Looper.getMainLooper())
        timeUpdateRunnable = object : Runnable {
            override fun run() {
                updateCurrentTime()
                timeHandler?.postDelayed(this, 1000)
            }
        }
        timeHandler?.post(timeUpdateRunnable!!)
    }
    
    private fun updateCurrentTime() {
        try {
            val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
            overlayCurrentTimeTextView?.text = "Current: ${sdf.format(Date())}"
        } catch (e: Exception) {
            Log.e(TAG, "Error updating time: ${e.message}")
        }
    }
    
    private fun removePersistentOverlay() {
        try {
            if (persistentOverlay != null) {
                windowManager?.removeView(persistentOverlay)
                persistentOverlay = null
                isOverlayCreated = false
                Log.d(TAG, "✅ Persistent overlay removed")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing overlay", e)
            isOverlayCreated = false
        }
    }
    
    /**
     * ✅ Clear window flags before finishing
     */
    private fun clearWindowFlags() {
        try {
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
            Log.d(TAG, "✅ Window flags cleared")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing window flags", e)
        }
    }
    
    private fun finishNightModeLock() {
        Log.d(TAG, "🧹 Cleaning up lock activity...")
        
        isLockActive = false
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        removePersistentOverlay()
        cancelNotification()
        
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) { }
        
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) { }
        
        clearWindowFlags()
        finish()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "✅ LOCK ACTIVITY FINISHED")
        Log.d(TAG, "========================================")
    }
    
    override fun onBackPressed() {
        Log.d(TAG, "🚫 Back button blocked")
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent called")
        
        if (!isOpeningApp && isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
                updateCurrentTime()
            }, 100)
        }
    }
    
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ onResume")
        
        // Only check if overlay exists, don't recreate (like GetBackLockActivity)
        if (!isOpeningApp) {
            if (isOverlayCreated && persistentOverlay != null) {
                Handler(Looper.getMainLooper()).postDelayed({
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                }, 100)
            }
        }
    }
    
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        Log.d(TAG, "🎯 Window focus changed: $hasFocus")
        
        if (hasFocus && !isOpeningApp) {
            // ✅ Every time we get focus, ensure we're visible
            Handler(Looper.getMainLooper()).postDelayed({
                if (isOverlayCreated && persistentOverlay != null) {
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                }
            }, 50)
        }
    }
    
    override fun onPause() {
        super.onPause()
        Log.d(TAG, "⏸️ onPause - isOpeningApp: $isOpeningApp")
    }
    
    override fun onStop() {
        super.onStop()
        Log.d(TAG, "⏹️ onStop - isOpeningApp: $isOpeningApp")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💥 onDestroy called")
        
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) { }
        
        removePersistentOverlay()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) { }
        
        clearWindowFlags()
    }
}