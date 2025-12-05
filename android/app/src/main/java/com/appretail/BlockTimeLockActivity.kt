package com.wingsfly

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
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
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.*

class BlockTimeLockActivity : Activity() {
    
    companion object {
        private const val TAG = "BlockTimeLockActivity"
        var isLockActive = false
    }
    
    private var taskId: String = ""
    private var taskTitle: String = ""
    private var taskDescription: String = ""
    private var evaluationType: String = "timer"
    private var startTime: String = ""
    private var category: String = ""
    private var source: String = "tasks"
    private var taskDataJson: String = "{}"
    private var fromAlarm: Boolean = false
    private var appWasKilled: Boolean = false
    private var wakeLock: PowerManager.WakeLock? = null
    
    // PERSISTENT OVERLAY
    private var persistentOverlay: android.view.View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    private var isOpeningApp = false
    private var isFinishing = false // ✅ NEW: Track finishing state
    
    // UI references
    private var overlayTitleTextView: TextView? = null
    private var overlayMessageTextView: TextView? = null
    private var overlayStartTimeTextView: TextView? = null
    private var overlayTypeTextView: TextView? = null
    private var overlayOpenAppButton: Button? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "⏰ BLOCK TIME LOCK ACTIVITY CREATED")
        Log.d(TAG, "========================================")
        
        // Extract data from intent
        taskId = intent.getStringExtra("task_id") ?: ""
        taskTitle = intent.getStringExtra("task_title") ?: "Block Time Task"
        taskDescription = intent.getStringExtra("task_description") ?: ""
        evaluationType = intent.getStringExtra("evaluation_type") ?: "timer"
        startTime = intent.getStringExtra("start_time") ?: ""
        category = intent.getStringExtra("category") ?: ""
        source = intent.getStringExtra("source") ?: "tasks"
        taskDataJson = intent.getStringExtra("task_data") ?: "{}"
        fromAlarm = intent.getBooleanExtra("from_alarm", false)
        appWasKilled = intent.getBooleanExtra("app_was_killed", false)
        
        Log.d(TAG, "Task: $taskTitle")
        Log.d(TAG, "Type: $evaluationType")
        Log.d(TAG, "Start: $startTime")
        Log.d(TAG, "From alarm: $fromAlarm")
        
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.e(TAG, "❌ NO OVERLAY PERMISSION")
                proceedToMainActivity()
                finish()
                return
            }
        }
        
        // Setup activity
        setupBasicActivity()
        
        // Set basic content view (transparent)
        setContentView(R.layout.activity_block_time_lock)
        
        // Create overlay with delay
        Handler(Looper.getMainLooper()).postDelayed({
            createPersistentLockOverlay()
        }, 300)
        
        isLockActive = true
        
        Log.d(TAG, "✅ Block Time lock screen active")
        Log.d(TAG, "========================================")
    }
    
    /**
     * Setup basic activity (like Night Mode)
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
     * Acquire aggressive wake lock
     */
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "BlockTime:ActivityLock"
            )
            
            wakeLock?.acquire(60 * 60 * 1000L) // 60 minutes
            Log.d(TAG, "✅ FULL wake lock acquired (60 min)")
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error", e)
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
            
            // Inflate the block time lock screen layout
            val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
            persistentOverlay = inflater.inflate(R.layout.activity_block_time_lock, null)
            
            // Initialize UI elements
            overlayTitleTextView = persistentOverlay?.findViewById(R.id.blockTimeTitleText)
            overlayMessageTextView = persistentOverlay?.findViewById(R.id.blockTimeMessageText)
            overlayStartTimeTextView = persistentOverlay?.findViewById(R.id.startTimeText)
            overlayTypeTextView = persistentOverlay?.findViewById(R.id.typeText)
            overlayOpenAppButton = persistentOverlay?.findViewById(R.id.openAppButton)
            
            // Set task info
            overlayTitleTextView?.text = taskTitle
            overlayMessageTextView?.text = if (taskDescription.isNotEmpty()) {
                taskDescription
            } else {
                "Time to start your task"
            }
            overlayStartTimeTextView?.text = "Start Time: $startTime"
            
            // Set type badge
            val typeLabel = when (evaluationType) {
                "timer" -> "⏱️ Timer"
                "timerTracker" -> "⏱️ Timer Tracker"
                else -> "⏰ Task"
            }
            overlayTypeTextView?.text = typeLabel
            
            // ✅ CRITICAL FIX: Button click handler
            overlayOpenAppButton?.setOnClickListener {
                Log.d(TAG, "========================================")
                Log.d(TAG, "🚀 START TASK BUTTON CLICKED")
                Log.d(TAG, "========================================")
                
                if (isOpeningApp || isFinishing) {
                    Log.d(TAG, "⏭️ Already opening/finishing, ignoring")
                    return@setOnClickListener
                }
                
                isOpeningApp = true
                isFinishing = true
                
                // ✅ Visual feedback - button disabled
                overlayOpenAppButton?.isEnabled = false
                overlayOpenAppButton?.alpha = 0.5f
                overlayOpenAppButton?.text = "Opening..."
                
                Log.d(TAG, "🗑️ Closing lock screen and opening app...")
                
                // ✅ IMMEDIATE transition
                proceedToMainActivityImmediate()
            }
            
            // Window parameters for persistent overlay
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
    
    /**
     * ✅ FIXED: IMMEDIATE app opening with proper cleanup sequence
     */
    private fun proceedToMainActivityImmediate() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "🚀 IMMEDIATE MainActivity transition")
        Log.d(TAG, "========================================")
        
        try {
            // ✅ Step 1: Mark as finishing FIRST
            isLockActive = false
            
            // ✅ Step 2: Cancel notification
            cancelNotification()
            
            // ✅ Step 3: Remove overlay IMMEDIATELY
            Log.d(TAG, "🗑️ Removing overlay...")
            removePersistentOverlay()
            
            // ✅ Step 4: Release wake lock BEFORE launching
            releaseWakeLock()
            
            // ✅ Step 5: Clear window flags
            clearWindowFlags()
            
            // ✅ Step 6: Launch MainActivity
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                action = "TRIGGER_BLOCK_TIME"
                
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
                )
                
                // Pass all task data
                putExtra("trigger_block_time", true)
                putExtra("task_id", taskId)
                putExtra("task_title", taskTitle)
                putExtra("task_description", taskDescription)
                putExtra("evaluation_type", evaluationType)
                putExtra("start_time", startTime)
                putExtra("category", category)
                putExtra("source", source)
                putExtra("task_data", taskDataJson)
                putExtra("from_alarm", fromAlarm)
                putExtra("app_was_killed", appWasKilled)
                putExtra("from_lock_screen", true)
            }
            
            startActivity(mainIntent)
            Log.d(TAG, "✅ MainActivity started")
            
            // ✅ Step 7: Finish this activity IMMEDIATELY using finishAndRemoveTask()
            finishAndRemoveTask()
            Log.d(TAG, "✅ Lock activity finished and removed from recents")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error proceeding to MainActivity: ${e.message}", e)
            // Fallback: still try to cleanup
            cleanupAndFinish()
        }
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "✅ LOCK ACTIVITY CLEANUP COMPLETE")
        Log.d(TAG, "========================================")
    }
    
    /**
     * ✅ DEPRECATED: Old method with delays (kept for backward compatibility)
     */
    private fun proceedToMainActivity() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "🚀 Starting MainActivity transition (legacy)")
        Log.d(TAG, "========================================")
        
        try {
            // Cancel notification
            cancelNotification()
            
            // Remove overlay
            removePersistentOverlay()
            
            // Small delay
            Handler(Looper.getMainLooper()).postDelayed({
                
                // Launch MainActivity with TRIGGER_BLOCK_TIME action
                val mainIntent = Intent(this, MainActivity::class.java).apply {
                    action = "TRIGGER_BLOCK_TIME"
                    
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                    
                    // Pass all task data
                    putExtra("trigger_block_time", true)
                    putExtra("task_id", taskId)
                    putExtra("task_title", taskTitle)
                    putExtra("task_description", taskDescription)
                    putExtra("evaluation_type", evaluationType)
                    putExtra("start_time", startTime)
                    putExtra("category", category)
                    putExtra("source", source)
                    putExtra("task_data", taskDataJson)
                    putExtra("from_alarm", fromAlarm)
                    putExtra("app_was_killed", appWasKilled)
                    putExtra("from_lock_screen", true)
                }
                
                startActivity(mainIntent)
                Log.d(TAG, "✅ MainActivity started with TRIGGER_BLOCK_TIME")
                
                // Cleanup after delay
                Handler(Looper.getMainLooper()).postDelayed({
                    cleanupAndFinish()
                }, 800)
                
            }, 300)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error proceeding to MainActivity: ${e.message}", e)
            cleanupAndFinish()
        }
    }
    
    /**
     * Cancel notification
     */
    private fun cancelNotification() {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val notificationId = 8000 + taskId.hashCode()
            notificationManager?.cancel(notificationId)
            Log.d(TAG, "✅ Notification cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling notification", e)
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
            persistentOverlay = null
            isOverlayCreated = false
        }
    }
    
    /**
     * ✅ NEW: Separate method for releasing wake lock
     */
    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                wakeLock = null
                Log.d(TAG, "✅ Wake lock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
            wakeLock = null
        }
    }
    
    /**
     * Clear window flags before finishing
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
    
    /**
     * ✅ NEW: Unified cleanup and finish method
     */
    private fun cleanupAndFinish() {
        Log.d(TAG, "🧹 Cleaning up lock activity...")
        
        if (isFinishing) {
            Log.d(TAG, "⏭️ Already finishing, skipping")
            return
        }
        
        isFinishing = true
        isLockActive = false
        
        removePersistentOverlay()
        cancelNotification()
        releaseWakeLock()
        clearWindowFlags()
        
        finishAndRemoveTask()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "✅ LOCK ACTIVITY FINISHED")
        Log.d(TAG, "========================================")
    }
    
    /**
     * ✅ DEPRECATED: Old cleanup method (replaced by cleanupAndFinish)
     */
    private fun finishBlockTimeLock() {
        cleanupAndFinish()
    }
    
    override fun onBackPressed() {
        Log.d(TAG, "🚫 Back button blocked")
        // ✅ Don't call super - completely block back button
    }
    
    override fun onPause() {
        super.onPause()
        Log.d(TAG, "⏸️ onPause called")
        
        // ✅ If we're finishing, ensure complete cleanup
        if (isFinishing || isOpeningApp) {
            Log.d(TAG, "🗑️ Finishing state detected in onPause")
            Handler(Looper.getMainLooper()).postDelayed({
                if (!isDestroyed) {
                    finishAndRemoveTask()
                }
            }, 100)
        }
    }
    
    override fun onStop() {
        super.onStop()
        Log.d(TAG, "⏹️ onStop called")
        
        // ✅ If we're finishing, ensure complete cleanup
        if (isFinishing || isOpeningApp) {
            Log.d(TAG, "🗑️ Finishing state detected in onStop")
            if (!isDestroyed) {
                finishAndRemoveTask()
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent called")
        
        // ✅ Only bring to front if NOT finishing
        if (!isOpeningApp && !isFinishing && isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
            }, 100)
        }
    }
    
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ onResume")
        
        // ✅ If finishing or opening app, don't bring overlay to front
        if (isFinishing || isOpeningApp) {
            Log.d(TAG, "🗑️ Finishing state - destroying activity")
            finishAndRemoveTask()
        } else {
            // Normal operation - bring overlay to front
            if (isOverlayCreated && persistentOverlay != null) {
                Handler(Looper.getMainLooper()).postDelayed({
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                }, 100)
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💥 onDestroy called")
        
        removePersistentOverlay()
        releaseWakeLock()
        clearWindowFlags()
        isLockActive = false
        isFinishing = false
        isOpeningApp = false
    }
}