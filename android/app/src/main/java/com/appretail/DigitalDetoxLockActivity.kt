package com.wingsfly

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.VideoView
import java.io.File
import java.text.SimpleDateFormat
import android.app.NotificationManager
import java.util.*

class DigitalDetoxLockActivity : Activity() {
    
    companion object {
        private const val TAG = "DetoxLock"
        var isLockActive = false
        var isAppUnlocked = false
        var isUnlockInProgress = false
        var isHiddenForAppUnlock = false
        var lastUnlockTime = 0L
        
        // ✅ CRITICAL: Static storage for media URLs to survive recreation
        private var storedMediaUrl: String? = null
        private var storedMediaType: String? = null
        private var storedDuration: Int = 0
        private var storedEndTime: Long = 0
        private var hasStoredData = false
        
        private const val PREFS_NAME = "DetoxPrefs"
        private const val KEY_DETOX_END_TIME = "detox_end_time"
        private const val KEY_DETOX_ACTIVE = "detox_active"
        private const val KEY_APP_UNLOCKED_UNTIL = "app_unlocked_until"
    }
    
    private var durationMinutes: Int = 0
    private var remainingSeconds: Long = 0
    private var detoxEndTime: Long = 0
    private var countDownTimer: CountDownTimer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var timeHandler: Handler? = null
    private var timeUpdateRunnable: Runnable? = null
    
    // PERSISTENT OVERLAY
    private var persistentOverlay: View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    private var isHandlingScreenEvent = false
    
    // Media playback
    private var mediaPlayer: MediaPlayer? = null
    private var videoView: VideoView? = null
    private var mediaFileUrl: String? = null
    private var mediaType: String? = null
    private var mediaContainer: FrameLayout? = null
    
    // Audio management
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    
    // UI references
    private var overlayTimerTextView: TextView? = null
    private var overlayMotivationTextView: TextView? = null
    private var overlayCurrentTimeTextView: TextView? = null
    private var overlayProgressBar: ProgressBar? = null
    private var overlayProgressPercentageTextView: TextView? = null
    private var overlayOpenAppButton: Button? = null
    
    private lateinit var prefs: SharedPreferences
    
    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (isHandlingScreenEvent) return
            
            isHandlingScreenEvent = true
            
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> handleScreenOff()
                Intent.ACTION_SCREEN_ON -> handleScreenOn()
                Intent.ACTION_USER_PRESENT -> {
                    // ✅ User unlocked device - bring detox lock back to front
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isLockActive && !isHiddenForAppUnlock) {
                            persistentOverlay?.bringToFront()
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
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Stop broadcast received")
            finishDetox()
        }
    }
    
    private val relockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "📥 Received relock broadcast")
            if (isHiddenForAppUnlock) {
                showLockScreen()
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "🔒 Digital Detox Lock Activity created")
        Log.d(TAG, "========================================")
        
        // ✅ Check if app is currently unlocked
        val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
        val currentTime = System.currentTimeMillis()
        val isCurrentlyUnlocked = unlockedUntil > currentTime
        
        if (isCurrentlyUnlocked) {
            Log.d(TAG, "⚠️ App is unlocked - not showing lock screen")
            finish()
            return
        }
        
        // ✅ CRITICAL FIX: Load from static storage if available (for recreation)
        if (hasStoredData) {
            durationMinutes = storedDuration
            detoxEndTime = storedEndTime
            mediaFileUrl = storedMediaUrl
            mediaType = storedMediaType
            remainingSeconds = (detoxEndTime - System.currentTimeMillis()) / 1000
            Log.d(TAG, "📦 Loaded from static storage (activity recreated)")
        } else {
            // First creation - get from intent or prefs
            val savedEndTime = prefs.getLong(KEY_DETOX_END_TIME, 0)
            val isDetoxActive = prefs.getBoolean(KEY_DETOX_ACTIVE, false)
            
            if (isDetoxActive && savedEndTime > System.currentTimeMillis()) {
                detoxEndTime = savedEndTime
                remainingSeconds = (detoxEndTime - System.currentTimeMillis()) / 1000
                durationMinutes = (remainingSeconds / 60).toInt()
                Log.d(TAG, "📱 Resuming detox: ${remainingSeconds}s remaining")
            } else {
                durationMinutes = intent.getIntExtra("duration_minutes", 5)
                remainingSeconds = durationMinutes * 60L
                detoxEndTime = System.currentTimeMillis() + (remainingSeconds * 1000)
                
                // Save to prefs
                prefs.edit().apply {
                    putLong(KEY_DETOX_END_TIME, detoxEndTime)
                    putBoolean(KEY_DETOX_ACTIVE, true)
                }.commit()
                
                Log.d(TAG, "🆕 New detox: ${durationMinutes}min")
            }
            
            mediaFileUrl = intent.getStringExtra("media_file_path")
            mediaType = intent.getStringExtra("media_type")
            
            // Store for future recreations
            storedDuration = durationMinutes
            storedEndTime = detoxEndTime
            storedMediaUrl = mediaFileUrl
            storedMediaType = mediaType
            hasStoredData = true
            Log.d(TAG, "💾 Saved to static storage (first creation)")
        }
        
        if (remainingSeconds <= 0) {
            Log.d(TAG, "⚠️ No time remaining - finishing immediately")
            finishDetox()
            return
        }
        
        Log.d(TAG, "📥 Media data:")
        Log.d(TAG, "   Duration: $durationMinutes minutes")
        Log.d(TAG, "   Media URL: $mediaFileUrl")
        Log.d(TAG, "   Media Type: $mediaType")
        
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.e(TAG, "❌ NO OVERLAY PERMISSION")
                finish()
                return
            }
        }
        
        setupBasicActivity()
        
        // Create overlay
        Handler(Looper.getMainLooper()).postDelayed({
            createPersistentLockOverlay()
            
            // Initialize media after overlay
            Handler(Looper.getMainLooper()).postDelayed({
                initializeMediaFromIntent()
            }, 500)
        }, 300)
        
        registerReceivers()
        startCountdownTimer()
        startTimeUpdates()
        
        isLockActive = true
        isAppUnlocked = false
        isHiddenForAppUnlock = false
        
        Log.d(TAG, "✅ Lock activity initialized")
        Log.d(TAG, "========================================")
    }
    
    private fun setupBasicActivity() {
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        
        acquireWakeLock()
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "DetoxLock:LockScreen"
            )
            wakeLock?.acquire(60 * 60 * 1000L)
            Log.d(TAG, "✅ FULL wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error", e)
        }
    }
    
    private fun handleScreenOff() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🔒 USER PRESSED LOCK BUTTON")
            Log.d(TAG, "========================================")
            
            // Re-acquire wake lock
            try {
                if (wakeLock?.isHeld == false) {
                    wakeLock?.acquire(60 * 60 * 1000L)
                    Log.d(TAG, "🔆 Wake lock re-acquired")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error re-acquiring wake lock", e)
            }
            
            // ✅ CRITICAL FIX: Force activity to front after screen off
            Handler(Looper.getMainLooper()).postDelayed({
                val intent = Intent(this, DigitalDetoxLockActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                            Intent.FLAG_ACTIVITY_NO_ANIMATION
                }
                startActivity(intent)
                Log.d(TAG, "✅ Activity forced to front after screen off")
            }, 300)
            
            Log.d(TAG, "========================================")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error handling screen off", e)
        }
    }
    
    private fun handleScreenOn() {
        try {
            Log.d(TAG, "📱 Screen turned ON during detox")
            
            // ✅ CRITICAL: Only restore lock if active and not hidden for app unlock
            if (!isLockActive || isHiddenForAppUnlock) {
                Log.d(TAG, "⏭️ Skipping restore - lock not active or app unlocked")
                return
            }
            
            // ✅ First bring activity to front
            val intent = Intent(this, DigitalDetoxLockActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(intent)
            
            // Then ensure overlay is visible
            Handler(Looper.getMainLooper()).postDelayed({
                if (isOverlayCreated && persistentOverlay != null) {
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                    persistentOverlay?.requestLayout()
                    
                    updateTimerDisplay()
                    updateMotivationalMessage()
                    updateCurrentTime()
                    updateProgress()
                    
                    videoView?.let {
                        if (!it.isPlaying) {
                            it.start()
                        }
                    }
                    
                    Log.d(TAG, "✅ Detox lock restored to front")
                } else {
                    Log.w(TAG, "⚠️ Overlay not created - recreating")
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
                Log.d(TAG, "⏭️ Overlay already exists")
                return
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(this)) {
                    Log.e(TAG, "❌ Cannot create overlay")
                    return
                }
            }
            
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            
            if (persistentOverlay != null) {
                try {
                    windowManager?.removeView(persistentOverlay)
                } catch (e: Exception) { }
                persistentOverlay = null
            }
            
            val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
            persistentOverlay = inflater.inflate(R.layout.activity_digital_detox_lock, null)
            
            overlayTimerTextView = persistentOverlay?.findViewById(R.id.timerText)
            overlayMotivationTextView = persistentOverlay?.findViewById(R.id.motivationText)
            overlayCurrentTimeTextView = persistentOverlay?.findViewById(R.id.currentTime)
            overlayProgressBar = persistentOverlay?.findViewById(R.id.progressBar)
            overlayProgressPercentageTextView = persistentOverlay?.findViewById(R.id.progressPercentage)
            overlayOpenAppButton = persistentOverlay?.findViewById(R.id.openAppButton)
            
            overlayProgressBar?.max = (durationMinutes * 60)
            
            updateTimerDisplay()
            updateMotivationalMessage()
            updateCurrentTime()
            updateProgress()
            
            setupOpenAppButton()
            setupMediaInOverlay()
            
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
            
            windowManager?.addView(persistentOverlay, layoutParams)
            
            isOverlayCreated = true
            Log.d(TAG, "✅ Persistent overlay created")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error creating overlay", e)
            isOverlayCreated = false
        }
    }
    
    private fun setupOpenAppButton() {
        overlayOpenAppButton?.setOnClickListener {
            if (overlayOpenAppButton?.isEnabled == false) return@setOnClickListener
            
            if (isUnlockInProgress) {
                Log.d(TAG, "⏭️ Unlock already in progress")
                return@setOnClickListener
            }
            
            overlayOpenAppButton?.isEnabled = false
            overlayOpenAppButton?.alpha = 0.5f
            overlayOpenAppButton?.text = "Opening..."
            
            unlockAndOpenApp()
        }
    }
    
    private fun unlockAndOpenApp() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🔓 UNLOCKING APP - REMOVING OVERLAY TEMPORARILY")
            Log.d(TAG, "========================================")
            
            // ✅ Set unlock flag WITHOUT expiration time
            prefs.edit().apply {
                putLong(KEY_APP_UNLOCKED_UNTIL, Long.MAX_VALUE)
                putBoolean("app_unlock_in_progress", true)
            }.commit()
            
            isUnlockInProgress = true
            lastUnlockTime = System.currentTimeMillis()
            isAppUnlocked = true
            isHiddenForAppUnlock = true
            
            // ✅ CRITICAL FIX: REMOVE overlay completely (not just hide)
            try {
                if (persistentOverlay != null && windowManager != null) {
                    windowManager?.removeView(persistentOverlay)
                    persistentOverlay = null
                    isOverlayCreated = false
                    Log.d(TAG, "✅ Overlay REMOVED completely - MainActivity can show on top")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error removing overlay: ${e.message}")
            }
            
            // Pause media playback while app is open
            pauseMediaPlayback()
            
            // ✅ Move this activity to background IMMEDIATELY
            moveTaskToBack(true)
            
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    // ✅ Check if MainActivity is already running
                    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                    val runningTasks = activityManager.appTasks
                    var mainActivityExists = false
                    
                    for (task in runningTasks) {
                        val topActivity = task.taskInfo.topActivity
                        if (topActivity?.className?.contains("MainActivity") == true) {
                            mainActivityExists = true
                            Log.d(TAG, "✅ MainActivity already exists in background")
                            break
                        }
                    }
                    
                    val mainActivityIntent = Intent(this, MainActivity::class.java).apply {
                        if (mainActivityExists) {
                            // ✅ MainActivity exists - bring it to front
                            addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP
                            )
                            Log.d(TAG, "🔄 Bringing existing MainActivity to front")
                        } else {
                            // ✅ MainActivity doesn't exist - create new
                            addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP
                            )
                            Log.d(TAG, "🆕 Creating new MainActivity")
                        }
                        
                        putExtra("detox_unlocked", true)
                        putExtra("remaining_seconds", remainingSeconds)
                    }
                    
                    startActivity(mainActivityIntent)
                    
                    // Notify service that MainActivity has gained focus
                    Handler(Looper.getMainLooper()).postDelayed({
                        val focusIntent = Intent("com.wingsfly.MAINACTIVITY_FOCUSED")
                        sendBroadcast(focusIntent)
                        
                        isUnlockInProgress = false
                        prefs.edit().putBoolean("app_unlock_in_progress", false).commit()
                        
                        Log.d(TAG, "✅ MainActivity opened - Service now monitoring for background")
                    }, 1000)
                    
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error starting MainActivity: ${e.message}")
                    isUnlockInProgress = false
                    prefs.edit().apply {
                        remove(KEY_APP_UNLOCKED_UNTIL)
                        putBoolean("app_unlock_in_progress", false)
                    }.apply()
                    
                    // Recreate overlay since we removed it
                    if (!isOverlayCreated) {
                        createPersistentLockOverlay()
                    }
                }
            }, 300)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error unlocking app: ${e.message}")
            isUnlockInProgress = false
            prefs.edit().apply {
                remove(KEY_APP_UNLOCKED_UNTIL)
                putBoolean("app_unlock_in_progress", false)
            }.apply()
            
            // Recreate overlay since we removed it
            if (!isOverlayCreated) {
                createPersistentLockOverlay()
            }
        }
    }
    
    private fun restoreOverlayVisibility() {
        try {
            Log.d(TAG, "🔒 RESTORING OVERLAY VISIBILITY - BRINGING LOCK BACK")
            
            persistentOverlay?.visibility = View.VISIBLE
            persistentOverlay?.alpha = 1f
            
            val layoutParams = persistentOverlay?.layoutParams as? WindowManager.LayoutParams
            if (layoutParams != null) {
                // Restore to full screen
                layoutParams.width = WindowManager.LayoutParams.MATCH_PARENT
                layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT
                layoutParams.x = 0
                layoutParams.y = 0
                
                // Restore interactive flags
                layoutParams.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                
                windowManager?.updateViewLayout(persistentOverlay, layoutParams)
                persistentOverlay?.bringToFront()
                persistentOverlay?.invalidate()
                
                Log.d(TAG, "✅ Overlay visibility restored - Lock screen on top")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error restoring overlay visibility: ${e.message}")
        }
    }
    
    private fun showLockScreen() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🔒 SHOWING LOCK SCREEN - BRINGING TO FRONT")
            Log.d(TAG, "========================================")
            
            // Clear unlock flag
            prefs.edit().remove(KEY_APP_UNLOCKED_UNTIL).commit()
            
            isHiddenForAppUnlock = false
            isAppUnlocked = false
            isUnlockInProgress = false
            
            // ✅ CRITICAL FIX: Check if overlay exists, recreate if needed
            if (!isOverlayCreated || persistentOverlay == null) {
                Log.w(TAG, "⚠️ Overlay doesn't exist - recreating for relock")
                Handler(Looper.getMainLooper()).postDelayed({
                    createPersistentLockOverlay()
                    
                    // After creating, restore media and UI
                    Handler(Looper.getMainLooper()).postDelayed({
                        resumeMediaPlayback()
                        overlayOpenAppButton?.isEnabled = true
                        overlayOpenAppButton?.alpha = 1.0f
                        overlayOpenAppButton?.text = "Open App"
                        Log.d(TAG, "✅ Overlay recreated and visible")
                    }, 300)
                }, 100)
            } else {
                // Overlay exists - restore visibility
                restoreOverlayVisibility()
                
                // Update UI immediately
                updateTimerDisplay()
                updateMotivationalMessage()
                updateCurrentTime()
                updateProgress()
                
                Handler(Looper.getMainLooper()).postDelayed({
                    resumeMediaPlayback()
                    overlayOpenAppButton?.isEnabled = true
                    overlayOpenAppButton?.alpha = 1.0f
                    overlayOpenAppButton?.text = "Open App"
                }, 300)
            }
            
            // ✅ Close MainActivity
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    val closeIntent = Intent("com.wingsfly.CLOSE_MAIN_ACTIVITY")
                    sendBroadcast(closeIntent)
                    Log.d(TAG, "📪 Sent close MainActivity broadcast")
                } catch (e: Exception) {
                    Log.e(TAG, "Error sending close broadcast: ${e.message}")
                }
            }, 100)
            
            // ✅ Bring this activity to front
            Handler(Looper.getMainLooper()).postDelayed({
                val intent = Intent(this, DigitalDetoxLockActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                    putExtra("duration_minutes", (remainingSeconds / 60).toInt())
                    putExtra("is_relock", true)
                }
                startActivity(intent)
                
                Log.d(TAG, "✅ Lock activity brought to front")
            }, 200)
            
            Log.d(TAG, "========================================")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error showing lock screen: ${e.message}")
        }
    }
    
    private fun initializeMediaFromIntent() {
        Log.d(TAG, "🎬 Initializing media")
        
        if (mediaFileUrl != null && mediaType != null) {
            Log.d(TAG, "Media URL: $mediaFileUrl")
            Log.d(TAG, "Media Type: $mediaType")
            
            Handler(Looper.getMainLooper()).post {
                setupMediaPlayer()
            }
        } else {
            Log.d(TAG, "⚠️ No media configured")
        }
    }
    
    private fun setupMediaInOverlay() {
        if (mediaFileUrl == null || mediaType == null) {
            Log.d(TAG, "No media to setup in overlay")
            return
        }
        
        try {
            when (mediaType) {
                "audio" -> setupAudioPlayer()
                "video" -> setupVideoPlayerInOverlay()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Media overlay setup error", e)
        }
    }
    
    private fun setupMediaPlayer() {
        if (mediaFileUrl == null || mediaType == null) return
        
        try {
            Log.d(TAG, "🎵 Setting up media: $mediaType")
            
            when (mediaType) {
                "audio" -> setupAudioPlayer()
                "video" -> setupVideoPlayerInOverlay()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Media setup error: ${e.message}", e)
        }
    }
    
    private fun setupAudioPlayer() {
        try {
            val isUrl = mediaFileUrl!!.startsWith("http://") || mediaFileUrl!!.startsWith("https://")
            
            Log.d(TAG, "🎵 Setting up audio: $mediaFileUrl (isUrl: $isUrl)")
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            requestAudioFocusForMedia()
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(mediaFileUrl)
                isLooping = true
                
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                
                setVolume(0.7f, 0.7f)
                
                setOnPreparedListener { 
                    Log.d(TAG, "✅ Audio prepared")
                    start()
                    Log.d(TAG, "▶️ Audio playing")
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "❌ Audio error - what: $what, extra: $extra")
                    true
                }
                
                setOnCompletionListener { 
                    if (isLockActive) start()
                }
                
                prepareAsync()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Audio error: ${e.message}", e)
        }
    }
    
    private fun setupVideoPlayerInOverlay() {
        try {
            val isUrl = mediaFileUrl!!.startsWith("http://") || mediaFileUrl!!.startsWith("https://")
            
            Log.d(TAG, "========================================")
            Log.d(TAG, "🎥 Setting up video player (isUrl: $isUrl)")
            Log.d(TAG, "   URL: $mediaFileUrl")
            Log.d(TAG, "========================================")
            
            if (!isUrl) {
                val mediaFile = File(mediaFileUrl!!)
                if (!mediaFile.exists()) {
                    Log.e(TAG, "❌ Video file not found: $mediaFileUrl")
                    return
                }
                Log.d(TAG, "✅ Local video file exists: ${mediaFile.length()} bytes")
            }
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            requestAudioFocusForMedia()
            
            // Hide lock icon
            persistentOverlay?.findViewById<View>(R.id.lockIcon)?.visibility = View.GONE
            
            // Create VideoView
            videoView = VideoView(this).apply {
                val screenWidth = resources.displayMetrics.widthPixels
                val videoHeight = (screenWidth * 9) / 16
                
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    videoHeight
                ).apply {
                    gravity = Gravity.CENTER
                }
                
                visibility = View.VISIBLE
                
                Log.d(TAG, "📐 Video dimensions: ${screenWidth}x${videoHeight}")
                
                val videoUri = if (isUrl) {
                    Log.d(TAG, "📡 Using URL: $mediaFileUrl")
                    Uri.parse(mediaFileUrl)
                } else {
                    Log.d(TAG, "📁 Using file: $mediaFileUrl")
                    Uri.fromFile(File(mediaFileUrl!!))
                }
                
                setOnPreparedListener { mp ->
                    try {
                        Log.d(TAG, "✅ Video prepared - Duration: ${mp.duration}ms")
                        
                        mp.isLooping = true
                        mp.setVolume(0.8f, 0.8f)
                        
                        mp.setAudioAttributes(
                            AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                                .build()
                        )
                        
                        start()
                        Log.d(TAG, "▶️ Video playback STARTED")
                        
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (isPlaying) {
                                Log.d(TAG, "✅ Video IS playing")
                            } else {
                                Log.w(TAG, "⚠️ Video NOT playing - retrying")
                                seekTo(0)
                                start()
                            }
                        }, 1000)
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Video prepare error: ${e.message}", e)
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "❌ VIDEO ERROR - what: $what, extra: $extra")
                    true
                }
                
                setOnInfoListener { mp, what, extra ->
                    when (what) {
                        MediaPlayer.MEDIA_INFO_BUFFERING_START -> Log.d(TAG, "📊 Buffering started")
                        MediaPlayer.MEDIA_INFO_BUFFERING_END -> Log.d(TAG, "📊 Buffering ended")
                        MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START -> Log.d(TAG, "📊 Rendering started")
                    }
                    false
                }
                
                setOnCompletionListener {
                    if (isLockActive) {
                        Log.d(TAG, "🔁 Video completed - restarting")
                        seekTo(0)
                        start()
                    }
                }
                
                Log.d(TAG, "📥 Setting video URI...")
                setVideoURI(videoUri)
            }
            
            // ✅ Find the video placeholder in the overlay layout
            val videoPlaceholder = persistentOverlay?.findViewById<FrameLayout>(R.id.videoPlaceholder)
            if (videoPlaceholder != null) {
                Log.d(TAG, "✅ Found videoPlaceholder in overlay layout")
                videoPlaceholder.removeAllViews()
                videoPlaceholder.addView(videoView)
                videoPlaceholder.visibility = View.VISIBLE
                
                Log.d(TAG, "✅ VideoView added to placeholder")
            } else {
                Log.e(TAG, "❌ videoPlaceholder NOT found in overlay layout!")
            }
            
            Log.d(TAG, "✅ Video setup complete")
            Log.d(TAG, "========================================")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ CRITICAL VIDEO ERROR: ${e.message}", e)
            e.printStackTrace()
        }
    }
    
    private fun requestAudioFocusForMedia() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    .setAcceptsDelayedFocusGain(true)
                    .build()
                
                audioManager?.requestAudioFocus(audioFocusRequest!!)
            } else {
                @Suppress("DEPRECATION")
                audioManager?.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Audio focus error: ${e.message}", e)
        }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_DIGITAL_DETOX")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopReceiver, stopFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopReceiver, stopFilter)
        }
        
        val relockFilter = IntentFilter("com.wingsfly.RELOCK_DETOX")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(relockReceiver, relockFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(relockReceiver, relockFilter)
        }
        
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
    }
    
    private fun startCountdownTimer() {
        countDownTimer?.cancel()
        
        countDownTimer = object : CountDownTimer(remainingSeconds * 1000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                remainingSeconds = millisUntilFinished / 1000
                updateTimerDisplay()
                updateProgress()
                
                if (remainingSeconds % 60 == 0L) {
                    updateMotivationalMessage()
                }
            }
            
            override fun onFinish() {
                Log.d(TAG, "⏰ Timer completed")
                finishDetox()
            }
        }
        
        countDownTimer?.start()
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
    
    private fun updateTimerDisplay() {
        val hours = remainingSeconds / 3600
        val minutes = (remainingSeconds % 3600) / 60
        val seconds = remainingSeconds % 60
        
        val timeString = if (hours > 0) {
            String.format(Locale.getDefault(), "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
        }
        
        overlayTimerTextView?.text = timeString
    }
    
    private fun updateCurrentTime() {
        val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
        overlayCurrentTimeTextView?.text = sdf.format(Date())
    }
    
    private fun updateProgress() {
        val totalSeconds = durationMinutes * 60
        val elapsedSeconds = totalSeconds - remainingSeconds.toInt()
        val percentage = ((elapsedSeconds.toFloat() / totalSeconds) * 100).toInt()
        
        overlayProgressBar?.progress = elapsedSeconds
        overlayProgressPercentageTextView?.text = "$percentage% Complete"
    }
    
    private fun updateMotivationalMessage() {
        val percentage = ((((durationMinutes * 60) - remainingSeconds).toFloat() / (durationMinutes * 60)) * 100).toInt()
        
        val message = when {
            percentage < 25 -> "You've got this! Stay focused."
            percentage < 50 -> "Great progress! Keep going."
            percentage < 75 -> "You're halfway there! Stay strong."
            percentage < 95 -> "Almost done! Just a bit longer."
            else -> "Final moments! You did amazing!"
        }
        
        overlayMotivationTextView?.text = message
    }
    
    private fun removePersistentOverlay() {
        try {
            if (persistentOverlay != null) {
                windowManager?.removeView(persistentOverlay)
                persistentOverlay = null
                isOverlayCreated = false
            }
        } catch (e: Exception) {
            isOverlayCreated = false
        }
    }
    
    private fun stopMediaPlayback() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
                mediaPlayer = null
            }
            
            videoView?.let {
                if (it.isPlaying) it.stopPlayback()
                videoView = null
            }
            
            mediaContainer?.let {
                (it.parent as? android.view.ViewGroup)?.removeView(it)
                mediaContainer = null
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping media", e)
        }
    }
    
    private fun pauseMediaPlayback() {
        try {
            mediaPlayer?.let { if (it.isPlaying) it.pause() }
            videoView?.let { if (it.isPlaying) it.pause() }
        } catch (e: Exception) { }
    }
    
    private fun resumeMediaPlayback() {
        try {
            mediaPlayer?.let { if (!it.isPlaying) it.start() }
            videoView?.let { if (!it.isPlaying) it.start() }
        } catch (e: Exception) { }
    }
    
    private fun finishDetox() {
        Log.d(TAG, "🏁 Finishing Digital Detox session")
        
        isLockActive = false
        isAppUnlocked = false
        isHiddenForAppUnlock = false
        hasStoredData = false
        
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        
        stopMediaPlayback()
        removePersistentOverlay()
        
        wakeLock?.release()
        
        try { unregisterReceiver(stopReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(relockReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(screenStateReceiver) } catch (e: Exception) { }
        
        prefs.edit().apply {
            remove(KEY_DETOX_END_TIME)
            remove(KEY_APP_UNLOCKED_UNTIL)
            putBoolean(KEY_DETOX_ACTIVE, false)
        }.commit()

        // ✅ DISABLE DND when detox session ends
try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (notificationManager?.isNotificationPolicyAccessGranted == true) {
            notificationManager.setInterruptionFilter(android.app.NotificationManager.INTERRUPTION_FILTER_ALL)
            Log.d(TAG, "✅ DND disabled - session completed")
        }
    }
} catch (e: Exception) {
    Log.e(TAG, "Error disabling DND: ${e.message}", e)
}
        
        stopService(Intent(this, DigitalDetoxService::class.java))
        
        finish()
    }
    
    override fun onBackPressed() {
        // Blocked
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent")
        
        // ✅ Check if this is a relock
        val isRelock = intent?.getBooleanExtra("is_relock", false) ?: false
        
        if (isRelock) {
            Log.d(TAG, "🔄 Handling relock intent")
            
            // Ensure overlay is visible
            Handler(Looper.getMainLooper()).postDelayed({
                if (persistentOverlay != null) {
                    persistentOverlay?.visibility = View.VISIBLE
                    persistentOverlay?.alpha = 1f
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                    persistentOverlay?.requestLayout()
                    
                    updateTimerDisplay()
                    updateMotivationalMessage()
                    updateCurrentTime()
                    updateProgress()
                    
                    Log.d(TAG, "✅ Overlay restored after relock")
                }
            }, 100)
            return
        }
        
        val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
        val isCurrentlyUnlocked = unlockedUntil == Long.MAX_VALUE || unlockedUntil > System.currentTimeMillis()
        
        if (isCurrentlyUnlocked && isAppUnlocked) {
            Log.d(TAG, "⚠️ App is unlocked - overlay stays hidden")
            return
        }
        
        if (isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
                updateTimerDisplay()
            }, 100)
        }
    }
    
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ onResume")
        
        val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
        val isCurrentlyUnlocked = unlockedUntil == Long.MAX_VALUE || unlockedUntil > System.currentTimeMillis()
        
        if (isCurrentlyUnlocked && isAppUnlocked) {
            Log.d(TAG, "⚠️ App is unlocked - overlay stays hidden")
            return
        }
        
        // ✅ Ensure overlay is visible on resume
        if (isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                // Make sure overlay is visible
                persistentOverlay?.visibility = View.VISIBLE
                persistentOverlay?.alpha = 1f
                persistentOverlay?.bringToFront()
                persistentOverlay?.invalidate()
                persistentOverlay?.requestLayout()
                
                // Update UI
                updateTimerDisplay()
                updateMotivationalMessage()
                updateCurrentTime()
                updateProgress()
                
                Log.d(TAG, "✅ Overlay visibility ensured on resume")
            }, 100)
        } else if (!isOverlayCreated) {
            // Overlay doesn't exist - recreate it
            Log.w(TAG, "⚠️ Overlay not created on resume - recreating")
            Handler(Looper.getMainLooper()).postDelayed({
                createPersistentLockOverlay()
            }, 100)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 onDestroy")
        
        stopMediaPlayback()
        
        try { unregisterReceiver(stopReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(relockReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(screenStateReceiver) } catch (e: Exception) { }
        
        removePersistentOverlay()
        
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        wakeLock?.release()
    }
}