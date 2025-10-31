package com.wingsfly

import android.app.Activity
import android.app.ActivityManager
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
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
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.VideoView
import android.widget.Button
import android.widget.Toast
import java.io.File
import java.lang.reflect.Method
import java.text.SimpleDateFormat
import android.widget.LinearLayout
import java.util.*

class DigitalDetoxLockActivity : Activity() {
    
    companion object {
        private const val TAG = "DetoxLock"
        var isLockActive = false
        var isAppUnlocked = false
        private const val EMERGENCY_EXIT_THRESHOLD = 5
        private const val EMERGENCY_EXIT_TIMEOUT = 2000L
        
        private const val PREFS_NAME = "DetoxPrefs"
        private const val KEY_DETOX_END_TIME = "detox_end_time"
        private const val KEY_DETOX_ACTIVE = "detox_active"
        private const val KEY_SERVICE_PID = "service_pid"

        private const val KEY_APP_UNLOCKED_UNTIL = "app_unlocked_until"
        private const val UNLOCK_VALIDITY_DURATION = 10000L // 10 seconds
        
        // ✅ NEW: Track if we're in unlock flow
        var isUnlockInProgress = false
        var isHiddenForAppUnlock = false
        var lastUnlockTime = 0L

        private const val BOTTOM_GESTURE_BLOCK_HEIGHT = 200
    }
    
    private var durationMinutes: Int = 0
    private var remainingSeconds: Long = 0
    private var detoxEndTime: Long = 0
    private var countDownTimer: CountDownTimer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var timeHandler: Handler? = null
    private var timeUpdateRunnable: Runnable? = null
    private var relaunchHandler: Handler? = null
    private var relaunchRunnable: Runnable? = null
    private var statusBarBlockViews = mutableListOf<View>()
    
    private var mediaPlayer: MediaPlayer? = null
    private var videoView: VideoView? = null
    private var mediaFilePath: String? = null
    private var mediaType: String? = null
    private var mediaContainer: FrameLayout? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var audioManager: AudioManager? = null

    private var systemUIHandler: Handler? = null
    private var systemUIRunnable: Runnable? = null
    
    private var devicePolicyManager: DevicePolicyManager? = null
    private var isKioskModeActive = false
    
    private var emergencyExitPressCount = 0
    private var lastEmergencyPressTime = 0L

    private var lastBringToFrontTime = 0L
    private val BRING_TO_FRONT_THROTTLE = 5000L
    
    private var isHiddenForAppUnlock = false
    private var isDestroying = false
    
    private lateinit var timerTextView: TextView
    private lateinit var motivationTextView: TextView
    private lateinit var currentTimeTextView: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var progressPercentageTextView: TextView
    private lateinit var rootLayout: ViewGroup
    private lateinit var openAppButton: Button
    private lateinit var prefs: SharedPreferences

    private var bottomBlockOverlay: View? = null
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
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
    
    private val homeKeyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (isLockActive && !isHiddenForAppUnlock) {
                Handler(Looper.getMainLooper()).postDelayed({
                    collapseStatusBar()
                    bringToFront()
                }, 50)
            }
        }
    }
    
   override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    Log.d(TAG, "========================================")
    Log.d(TAG, "Digital Detox Lock Activity Created")
    Log.d(TAG, "isFinishing: $isFinishing")
    Log.d(TAG, "========================================")
    
    // ✅ Initialize flags FIRST
    isDestroying = false
    isHiddenForAppUnlock = false
    isUnlockInProgress = false
    
    // Check persistent unlock state
    val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
    val currentTime = System.currentTimeMillis()
    val isCurrentlyUnlocked = unlockedUntil > currentTime
    
    if (isCurrentlyUnlocked) {
        Log.d(TAG, "⚠️ App is unlocked - not showing lock screen")
        finish()
        return
    }
    
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
        Log.d(TAG, "🆕 New detox: ${durationMinutes}min")
    }
    
    // ✅ Only proceed if we have valid time remaining
    if (remainingSeconds <= 0) {
        Log.d(TAG, "⚠️ No time remaining - finishing immediately")
        finish()
        return
    }
    
    setupKioskMode()
    setupFullScreenLockMode()
    setContentView(R.layout.activity_digital_detox_lock)
    initializeViews()
    initializeMediaFromIntent()
    registerReceivers()
    createMaximumStatusBarBlock()
    disableFloatingWindows()
    startCountdownTimer()
    startTimeUpdates()
    startAggressiveMonitoring()
    
    isLockActive = true
    isAppUnlocked = false
    
    Log.d(TAG, "✅ Lock mode active")
}
    
    private fun initializeViews() {
        timerTextView = findViewById(R.id.timerText)
        motivationTextView = findViewById(R.id.motivationText)
        currentTimeTextView = findViewById(R.id.currentTime)
        progressBar = findViewById(R.id.progressBar)
        progressPercentageTextView = findViewById(R.id.progressPercentage)
        openAppButton = findViewById(R.id.openAppButton)
        
        val contentView = window.decorView.findViewById<ViewGroup>(android.R.id.content)
        rootLayout = contentView.getChildAt(0) as ViewGroup
        
        setupOpenAppButton()
        updateTimerDisplay()
        updateMotivationalMessage()
        updateCurrentTime()
        updateProgress()
        
        progressBar.max = durationMinutes * 60
    }
    
    private fun setupOpenAppButton() {
    openAppButton.setOnClickListener {
        if (!openAppButton.isEnabled) return@setOnClickListener
        
        if (isUnlockInProgress) {
            Log.d(TAG, "⏭️ Unlock already in progress")
            return@setOnClickListener
        }
        
        openAppButton.isEnabled = false
        openAppButton.alpha = 0.5f
        openAppButton.text = "Opening..."
        
        unlockAndOpenApp()
    }
}
    
    private fun unlockAndOpenApp() {
    try {
        Log.d(TAG, "========================================")
        Log.d(TAG, "🔓 UNLOCKING APP - LOCK STAYS IN BACKGROUND")
        Log.d(TAG, "Remaining: ${remainingSeconds}s")
        Log.d(TAG, "========================================")
        
        // ✅ CRITICAL FIX: Store unlock state in SharedPreferences FIRST
        val unlockValidUntil = System.currentTimeMillis() + UNLOCK_VALIDITY_DURATION
        prefs.edit().putLong(KEY_APP_UNLOCKED_UNTIL, unlockValidUntil).commit()
        
        Log.d(TAG, "✅ Stored unlock state until: $unlockValidUntil")
        
        isUnlockInProgress = true
        lastUnlockTime = System.currentTimeMillis()
        isAppUnlocked = true
        isHiddenForAppUnlock = true
        DigitalDetoxLockActivity.isAppUnlocked = true
        
        exitKioskMode()
        hideLockScreen()
        
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                // ✅ FIX: Don't use FLAG_ACTIVITY_CLEAR_TASK - it kills everything
                val mainActivityIntent = Intent(this, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT // Just bring to front
                    )
                    putExtra("detox_unlocked", true)
                    putExtra("remaining_seconds", remainingSeconds)
                }
                
                startActivity(mainActivityIntent)
                
                // ✅ Clear unlock flag after extended delay
                Handler(Looper.getMainLooper()).postDelayed({
                    isUnlockInProgress = false
                    Log.d(TAG, "✅ Unlock flow complete - monitoring enabled")
                }, 3000)
                
                Log.d(TAG, "✅ App unlocked - service monitoring for exit")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error starting MainActivity: ${e.message}")
                isUnlockInProgress = false
                
                // Clear unlock state on error
                prefs.edit().remove(KEY_APP_UNLOCKED_UNTIL).apply()
                
                showLockScreen()
            }
        }, 500)
        
    } catch (e: Exception) {
        Log.e(TAG, "❌ Error unlocking app: ${e.message}")
        isUnlockInProgress = false
        
        // Clear unlock state on error
        prefs.edit().remove(KEY_APP_UNLOCKED_UNTIL).apply()
        
        Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
        showLockScreen()
    }
}

private fun hideLockScreen() {
    try {
        Log.d(TAG, "🙈 Hiding lock screen UI")
        
        // ✅ STEP 1: Remove bottom blocker FIRST
        removeBottomNavigationBlocker()
        
        // ✅ STEP 2: Stop all monitoring
        relaunchHandler?.removeCallbacks(relaunchRunnable!!)
        pauseMediaPlayback()
        
        // ✅ STEP 3: Remove status bar blocks
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        statusBarBlockViews.forEach { view ->
            try { windowManager.removeView(view) } catch (e: Exception) { }
        }
        statusBarBlockViews.clear()
        
        // ✅ STEP 4: Clear window flags
        window.clearFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        )
        
        window.setFlags(
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
        )
        
        // ✅ STEP 5: Hide UI
        window.decorView.visibility = View.INVISIBLE
        
        Log.d(TAG, "✅ Lock screen hidden - bottom blocker removed")
    } catch (e: Exception) {
        Log.e(TAG, "Error hiding lock screen: ${e.message}")
    }
}

// 9. Recreate blocker when showing lock
private fun showLockScreen() {
    try {
        Log.d(TAG, "🔒 SHOWING LOCK SCREEN")
        
        prefs.edit().remove(KEY_APP_UNLOCKED_UNTIL).commit()
        
        isHiddenForAppUnlock = false
        isAppUnlocked = false
        DigitalDetoxLockActivity.isAppUnlocked = false
        isUnlockInProgress = false
        
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        activityManager.appTasks.forEach { task ->
            val className = task.taskInfo.topActivity?.className ?: ""
            if (className.contains("MainActivity")) {
                try {
                    task.finishAndRemoveTask()
                } catch (e: Exception) { }
            }
        }
        
        Handler(Looper.getMainLooper()).postDelayed({
            window.clearFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE)
            
            setupKioskMode()
            setupFullScreenLockMode() // This will recreate blocker
            
            window.decorView.visibility = View.VISIBLE
            window.decorView.alpha = 1.0f
            
            val intent = Intent(this, DigitalDetoxLockActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION 
                )
                putExtra("duration_minutes", (remainingSeconds / 60).toInt())
                mediaFilePath?.let { putExtra("media_file_path", it) }
                mediaType?.let { putExtra("media_type", it) }
            }
            
            startActivity(intent)
            
            Handler(Looper.getMainLooper()).postDelayed({
                createMaximumStatusBarBlock()
                resumeMediaPlayback()
                startAggressiveMonitoring()
                
                openAppButton.isEnabled = true
                openAppButton.alpha = 1.0f
                openAppButton.text = "Open App"
                
                Log.d(TAG, "✅ Lock screen visible with blocker")
            }, 200)
            
        }, 300)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error showing lock screen: ${e.message}")
    }
}

    private fun bringToFrontAggressively() {
        try {
            collapseStatusBar()
            
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            activityManager.appTasks.forEach { task ->
                val taskInfo = task.taskInfo
                val className = taskInfo.topActivity?.className ?: ""
                
                if (className.contains("MainActivity")) {
                    try {
                        task.finishAndRemoveTask()
                    } catch (e: Exception) { }
                }
            }
            
            val intent = Intent(this, DigitalDetoxLockActivity::class.java)
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or 
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_NO_ANIMATION
            )
            intent.putExtra("duration_minutes", (remainingSeconds / 60).toInt())
            intent.putExtra("media_file_path", mediaFilePath)
            intent.putExtra("media_type", mediaType)
            startActivity(intent)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in aggressive bring to front: ${e.message}")
        }
    }
    
    private fun initializeMediaFromIntent() {
        mediaFilePath = intent.getStringExtra("media_file_path")
        mediaType = intent.getStringExtra("media_type")
        
        if (mediaFilePath != null && mediaType != null) {
            Handler(Looper.getMainLooper()).post {
                setupMediaPlayer()
            }
        }
    }
    
    private fun setupMediaPlayer() {
        try {
            if (mediaFilePath == null || mediaType == null) return
            
            val mediaFile = File(mediaFilePath!!)
            if (!mediaFile.exists()) {
                Log.e(TAG, "Media file not found")
                return
            }
            
            when (mediaType) {
                "audio" -> setupAudioPlayer()
                "video" -> setupVideoPlayer()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Media setup error: ${e.message}")
        }
    }
    
    private fun setupAudioPlayer() {
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            requestAudioFocusForMedia()
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(mediaFilePath)
                isLooping = true
                
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                
                setVolume(0.5f, 0.5f)
                setOnPreparedListener { start() }
                setOnErrorListener { mp, what, extra -> true }
                setOnCompletionListener { if (isLockActive) start() }
                prepareAsync()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Audio error: ${e.message}")
        }
    }
    
    private fun setupVideoPlayer() {
        try {
            if (mediaFilePath == null) return
            
            val mediaFile = File(mediaFilePath!!)
            if (!mediaFile.exists()) return
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            requestAudioFocusForMedia()
            
            val lockIcon = findViewById<View>(R.id.lockIcon)
            lockIcon?.visibility = View.GONE
            
            val screenWidth = resources.displayMetrics.widthPixels
            val containerWidth = screenWidth - dpToPx(40)
            val containerHeight = (containerWidth * 9) / 16
            
            mediaContainer = FrameLayout(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    containerHeight
                )
                setBackgroundColor(Color.BLACK)
                visibility = View.VISIBLE
                id = View.generateViewId()
            }
            
            videoView = VideoView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    Gravity.CENTER
                )
                visibility = View.VISIBLE
            }
            
            mediaContainer?.addView(videoView)
            
            val parentLayout = when {
                rootLayout is RelativeLayout || rootLayout is FrameLayout -> rootLayout
                else -> {
                    var suitable: ViewGroup? = null
                    for (i in 0 until rootLayout.childCount) {
                        val child = rootLayout.getChildAt(i)
                        if (child is RelativeLayout || child is FrameLayout) {
                            suitable = child as ViewGroup
                            break
                        }
                    }
                    suitable ?: rootLayout
                }
            }
            
            val timerSection = findViewById<LinearLayout>(R.id.timerSection)
            
            if (parentLayout is RelativeLayout) {
                mediaContainer?.id = View.generateViewId()
                
                val params = RelativeLayout.LayoutParams(
                    RelativeLayout.LayoutParams.MATCH_PARENT,
                    containerHeight
                ).apply {
                    addRule(RelativeLayout.CENTER_HORIZONTAL)
                    
                    val headerSectionId = findViewById<View>(R.id.headerSection)?.id
                    if (headerSectionId != null && headerSectionId != View.NO_ID) {
                        addRule(RelativeLayout.BELOW, headerSectionId)
                        topMargin = dpToPx(32)
                    } else {
                        addRule(RelativeLayout.ALIGN_PARENT_TOP)
                        topMargin = dpToPx(140)
                    }
                    
                    setMargins(dpToPx(20), topMargin, dpToPx(20), 0)
                }
                
                parentLayout.addView(mediaContainer, params)
                
                val timerParams = timerSection.layoutParams as RelativeLayout.LayoutParams
                timerParams.removeRule(RelativeLayout.CENTER_IN_PARENT)
                timerParams.addRule(RelativeLayout.BELOW, mediaContainer!!.id)
                timerParams.addRule(RelativeLayout.CENTER_HORIZONTAL)
                timerParams.topMargin = dpToPx(32)
                timerSection.layoutParams = timerParams
            } else {
                val params = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    containerHeight
                ).apply {
                    gravity = Gravity.CENTER
                    topMargin = dpToPx(-100)
                    setMargins(dpToPx(20), topMargin, dpToPx(20), dpToPx(20))
                }
                parentLayout.addView(mediaContainer, 0, params)
            }
            
            videoView?.apply {
                val videoUri = Uri.fromFile(mediaFile)
                
                setOnPreparedListener { mp ->
                    try {
                        mp.isLooping = true
                        mp.setVolume(0.7f, 0.7f)
                        
                        mp.setAudioAttributes(
                            AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                                .build()
                        )
                        
                        mediaContainer?.visibility = View.VISIBLE
                        visibility = View.VISIBLE
                        start()
                        
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (!isPlaying) {
                                seekTo(0)
                                start()
                            }
                        }, 1000)
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Video prepare error: ${e.message}")
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    mediaContainer?.visibility = View.GONE
                    findViewById<View>(R.id.lockIcon)?.visibility = View.VISIBLE
                    true
                }
                
                setVideoURI(videoUri)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Video error: ${e.message}")
            mediaContainer?.visibility = View.GONE
            findViewById<View>(R.id.lockIcon)?.visibility = View.VISIBLE
        }
    }
    
    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
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
                    .setOnAudioFocusChangeListener { }
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
            Log.e(TAG, "Audio focus error: ${e.message}")
        }
    }
    
    private fun stopMediaPlayback() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            
            videoView?.let {
                if (it.isPlaying) it.stopPlayback()
            }
            videoView = null
            
            mediaContainer?.let {
                (it.parent as? ViewGroup)?.removeView(it)
            }
            mediaContainer = null
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Stop media error: ${e.message}")
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
    
    private fun setupKioskMode() {
        try {
            devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    
                    if (activityManager.lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
                        startLockTask()
                        isKioskModeActive = true
                        Log.d(TAG, "✅ Kiosk mode activated")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Kiosk mode not available: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Kiosk mode error: ${e.message}")
        }
    }
    
    private fun exitKioskMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && isKioskModeActive) {
                stopLockTask()
                isKioskModeActive = false
                Log.d(TAG, "✅ Kiosk mode exited")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exit kiosk error: ${e.message}")
        }
    }
    
    private fun createBottomNavigationBlocker() {
    try {
        if (isFinishing || isDestroying || !isLockActive || isHiddenForAppUnlock) {
            Log.d(TAG, "⏭️ Blocker creation blocked")
            return
        }
        
        if (bottomBlockOverlay != null) {
            Log.d(TAG, "Bottom blocker already exists")
            return
        }
        
        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted")
            return
        }
        
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        if (windowManager == null) {
            Log.e(TAG, "WindowManager not available")
            return
        }
        
        Log.d(TAG, "Creating enhanced bottom gesture blocker (${BOTTOM_GESTURE_BLOCK_HEIGHT}px)")
        
        // Create MULTIPLE overlapping layers for better blocking
        bottomBlockOverlay = FrameLayout(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            isClickable = true
            isFocusable = false
            isEnabled = true
        }
        
        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            BOTTOM_GESTURE_BLOCK_HEIGHT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        )
        
        layoutParams.gravity = Gravity.BOTTOM or Gravity.START
        layoutParams.x = 0
        layoutParams.y = 0
        
        // Aggressive touch interceptor
        var lastBlockTime = 0L
        bottomBlockOverlay?.setOnTouchListener { view, event ->
            if (isLockActive && !isHiddenForAppUnlock && !isDestroying && !isFinishing) {
                when (event.action) {
                    MotionEvent.ACTION_DOWN,
                    MotionEvent.ACTION_MOVE,
                    MotionEvent.ACTION_UP -> {
                        val now = System.currentTimeMillis()
                        if (now - lastBlockTime > 300) {
                            Log.d(TAG, "⛔ Bottom gesture blocked at y=${event.y}")
                            lastBlockTime = now
                        }
                        view.performClick()
                        return@setOnTouchListener true
                    }
                }
            }
            false
        }
        
        windowManager.addView(bottomBlockOverlay, layoutParams)
        Log.d(TAG, "✅ Enhanced bottom gesture blocker created")
        
    } catch (e: Exception) {
        Log.e(TAG, "Error creating bottom blocker: ${e.message}")
        e.printStackTrace()
        bottomBlockOverlay = null
    }
}

private fun removeBottomNavigationBlocker() {
    try {
        Log.d(TAG, "🧹 Attempting to remove bottom blocker")
        
        if (bottomBlockOverlay == null) {
            Log.d(TAG, "No bottom blocker to remove")
            return
        }
        
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        if (windowManager != null) {
            try {
                windowManager.removeView(bottomBlockOverlay)
                Log.d(TAG, "✅ Bottom blocker removed from WindowManager")
            } catch (e: IllegalArgumentException) {
                Log.d(TAG, "Bottom blocker was already removed")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing bottom blocker: ${e.message}")
            }
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error in removeBottomNavigationBlocker: ${e.message}")
    } finally {
        bottomBlockOverlay = null
        Log.d(TAG, "✅ Bottom blocker reference cleared")
    }
}


private fun setupFullScreenLockMode() {
    val window: Window = window
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        keyguardManager.requestDismissKeyguard(this, null)
    }
    
    val flags = WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_FULLSCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
    
    window.addFlags(flags)
    
    // ✅ NEW: Hide navigation bar completely
    window.setFlags(
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
    )
    
    // Initial system UI hiding
    hideSystemUIMaximum()
    
    try {
        window.setType(WindowManager.LayoutParams.TYPE_APPLICATION)
    } catch (e: Exception) { }
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = 0xFF6366F1.toInt()
        
        // ✅ CRITICAL: Set navigation bar color to transparent AND hide it
        window.navigationBarColor = Color.TRANSPARENT
        
        // ✅ NEW: For Android 10+ hide the gesture indicator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        
        window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
            if (isLockActive && !isHiddenForAppUnlock && !isDestroying) {
                Handler(Looper.getMainLooper()).postDelayed({
                    hideSystemUIMaximum()    
                }, 50) // Reduced delay for faster response
                collapseStatusBar()
            }
        }
    }
    
    // ✅ Start continuous system UI hiding with aggressive frequency
    startContinuousSystemUIHiding()
    
    // Create bottom blocker after delay
    Handler(Looper.getMainLooper()).postDelayed({
        if (isLockActive && !isHiddenForAppUnlock && !isDestroying && !isFinishing) {
            Log.d(TAG, "🔒 Creating blocker - lock is active")
            createBottomNavigationBlocker()
        } else {
            Log.d(TAG, "⏭️ Skipping blocker creation - cleanup in progress")
        }
    }, 500)
    
    acquireWakeLock()
}

private fun startContinuousSystemUIHiding() {
    systemUIHandler?.removeCallbacks(systemUIRunnable!!)
    
    systemUIHandler = Handler(Looper.getMainLooper())
    systemUIRunnable = object : Runnable {
        override fun run() {
            if (isLockActive && !isHiddenForAppUnlock && !isDestroying) {
                hideSystemUIMaximum()
                systemUIHandler?.postDelayed(this, 100) // Every 100ms
            }
        }
    }
    systemUIHandler?.post(systemUIRunnable!!)
}

private fun hideSystemUIMaximum() {
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(
                    android.view.WindowInsets.Type.statusBars() or 
                    android.view.WindowInsets.Type.navigationBars() or
                    android.view.WindowInsets.Type.systemBars() or
                    android.view.WindowInsets.Type.systemGestures()
                )
                controller.systemBarsBehavior = 
                    android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LOW_PROFILE
            )
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error hiding system UI: ${e.message}")
    }
}

    private fun createMaximumStatusBarBlock() {
        try {
            if (!Settings.canDrawOverlays(this)) return
            
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val statusBarHeight = getStatusBarHeight()
            
            for (layer in 0..3) {
                val blockView = FrameLayout(this).apply {
                    setBackgroundColor(Color.TRANSPARENT)
                    isClickable = true
                    isFocusable = false
                }
                
                val height = statusBarHeight + (200 * (layer + 1))
                val yOffset = -150 - (layer * 60)
                
                val layoutParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    height,
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
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                    PixelFormat.TRANSLUCENT
                )
                
                layoutParams.gravity = Gravity.TOP or Gravity.START
                layoutParams.x = 0
                layoutParams.y = yOffset
                
                blockView.setOnTouchListener { _, event ->
                    collapseStatusBar()
                    true
                }
                
                try {
                    windowManager.addView(blockView, layoutParams)
                    statusBarBlockViews.add(blockView)
                } catch (e: Exception) { }
            }
            
        } catch (e: Exception) { }
    }
    
    private fun getStatusBarHeight(): Int {
        val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
        return if (resourceId > 0) {
            resources.getDimensionPixelSize(resourceId)
        } else {
            120
        }
    }
    
    private fun collapseStatusBar() {
        try {
            val statusBarService = getSystemService("statusbar")
            val statusBarManager = Class.forName("android.app.StatusBarManager")
            
            val collapse: Method = if (Build.VERSION.SDK_INT <= 16) {
                statusBarManager.getMethod("collapse")
            } else {
                statusBarManager.getMethod("collapsePanels")
            }
            
            collapse.invoke(statusBarService)
        } catch (e: Exception) { }
    }
    
    private fun startAggressiveMonitoring() {
        relaunchHandler?.removeCallbacks(relaunchRunnable!!)
        
        relaunchHandler = Handler(Looper.getMainLooper())
        relaunchRunnable = object : Runnable {
            override fun run() {
                if (!isFinishing && isLockActive && !isHiddenForAppUnlock) {
                    checkAndBringToFront()
                    relaunchHandler?.postDelayed(this, 3000)
                }
            }
        }
        relaunchHandler?.post(relaunchRunnable!!)
        
        val collapseHandler = Handler(Looper.getMainLooper())
        val collapseRunnable = object : Runnable {
            override fun run() {
                if (isLockActive && !isHiddenForAppUnlock) {
                    collapseStatusBar()
                    collapseHandler.postDelayed(this, 2000)
                }
            }
        }
        collapseHandler.post(collapseRunnable)
    }
    
    private fun disableFloatingWindows() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                activityManager.appTasks.forEach { task ->
                    try {
                        task.setExcludeFromRecents(true)
                    } catch (e: Exception) { }
                }
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInMultiWindowMode) {
                val intent = Intent(this, DigitalDetoxLockActivity::class.java)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or 
                               Intent.FLAG_ACTIVITY_CLEAR_TASK or
                               Intent.FLAG_ACTIVITY_NO_ANIMATION)
                intent.putExtra("media_file_path", mediaFilePath)
                intent.putExtra("media_type", mediaType)
                startActivity(intent)
            }
        } catch (e: Exception) { }
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "DigitalDetox:LockScreen"
            )
            wakeLock?.acquire(durationMinutes * 60 * 1000L + 10000L)
        } catch (e: Exception) { }
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
        
        val homeFilter = IntentFilter(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(homeKeyReceiver, homeFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(homeKeyReceiver, homeFilter)
        }
    }
    
    private fun checkAndBringToFront() {
        try {
            val now = System.currentTimeMillis()
            if (now - lastBringToFrontTime < BRING_TO_FRONT_THROTTLE) {
                return
            }
            
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val tasks = activityManager.appTasks
            
            if (tasks.isNotEmpty()) {
                val topActivity = tasks[0].taskInfo.topActivity
                if (topActivity?.className != this::class.java.name) {
                    lastBringToFrontTime = now
                    bringToFront()
                }
            }
        } catch (e: Exception) { }
    }
    
    private fun bringToFront() {
        try {
            collapseStatusBar()
            
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val tasks = activityManager.appTasks
            if (tasks.isNotEmpty()) {
                val topActivity = tasks[0].taskInfo.topActivity
                if (topActivity?.className == this::class.java.name) {
                    return
                }
            }
            
            val intent = Intent(this, DigitalDetoxLockActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            intent.putExtra("duration_minutes", (remainingSeconds / 60).toInt())
            intent.putExtra("media_file_path", mediaFilePath)
            intent.putExtra("media_type", mediaType)
            startActivity(intent)
            
        } catch (e: Exception) { }
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
                prefs.edit().apply {
                    remove(KEY_DETOX_END_TIME)
                    putBoolean(KEY_DETOX_ACTIVE, false)
                }.commit()
                
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
        
        timerTextView.text = timeString
    }
    
    private fun updateCurrentTime() {
        val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
        currentTimeTextView.text = sdf.format(Date())
    }
    
    private fun updateProgress() {
        val totalSeconds = durationMinutes * 60
        val elapsedSeconds = totalSeconds - remainingSeconds.toInt()
        val percentage = ((elapsedSeconds.toFloat() / totalSeconds) * 100).toInt()
        
        progressBar.progress = elapsedSeconds
        progressPercentageTextView.text = "$percentage% Complete"
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
        
        motivationTextView.text = message
    }
    
    private fun handleEmergencyExit() {
        val currentTime = System.currentTimeMillis()
        
        if (currentTime - lastEmergencyPressTime > EMERGENCY_EXIT_TIMEOUT) {
            emergencyExitPressCount = 1
        } else {
            emergencyExitPressCount++
        }
        
        lastEmergencyPressTime = currentTime
        
        if (emergencyExitPressCount >= EMERGENCY_EXIT_THRESHOLD) {
            Log.d(TAG, "🚨 Emergency exit triggered")
            finishDetox()
        } else {
            val remaining = EMERGENCY_EXIT_THRESHOLD - emergencyExitPressCount
            motivationTextView.text = "Emergency Exit: Press ${remaining} more times"
        }
    }
    
    private fun finishDetox() {
    Log.d(TAG, "========================================")
    Log.d(TAG, "🏁 DETOX SESSION ENDING - FULL CLEANUP")
    Log.d(TAG, "========================================")
    
    isDestroying = true
    isLockActive = false
    isAppUnlocked = false
    isHiddenForAppUnlock = false
    isUnlockInProgress = false
    DigitalDetoxLockActivity.isAppUnlocked = false
    
    Log.d(TAG, "✅ Flags set - blocker creation now blocked")
    
    // Stop system UI handler
    systemUIHandler?.removeCallbacks(systemUIRunnable!!)
    
    removeBottomNavigationBlocker()
    countDownTimer?.cancel()
    timeHandler?.removeCallbacks(timeUpdateRunnable!!)
    relaunchHandler?.removeCallbacks(relaunchRunnable!!)
    stopMediaPlayback()
    exitKioskMode()
    
    try {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    } catch (e: Exception) { }
    
    try {
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        statusBarBlockViews.forEach { view ->
            try { windowManager.removeView(view) } catch (e: Exception) { }
        }
        statusBarBlockViews.clear()
    } catch (e: Exception) { }
    
    try {
        stopService(Intent(this, DigitalDetoxService::class.java))
        DigitalDetoxService.isServiceRunning = false
    } catch (e: Exception) { }
    
    prefs.edit().apply {
        remove(KEY_DETOX_END_TIME)
        remove(KEY_SERVICE_PID)
        remove(KEY_APP_UNLOCKED_UNTIL)
        putBoolean(KEY_DETOX_ACTIVE, false)
    }.commit()
    
    try {
        val completionIntent = Intent("com.wingsfly.DETOX_COMPLETED")
        sendBroadcast(completionIntent)
    } catch (e: Exception) { }
    
    Handler(Looper.getMainLooper()).postDelayed({
        removeBottomNavigationBlocker()
        Log.d(TAG, "✅ Final verification complete")
    }, 100)
    
    Log.d(TAG, "========================================")
    Log.d(TAG, "✅ CLEANUP COMPLETE")
    Log.d(TAG, "========================================")
    
    finish()
}
    
    override fun onBackPressed() {
        if (!isHiddenForAppUnlock) {
            // Block
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (!isLockActive || isHiddenForAppUnlock || isDestroying) {
        return super.onKeyDown(keyCode, event)
    }
    
    return when (keyCode) {
        KeyEvent.KEYCODE_HOME,
        KeyEvent.KEYCODE_BACK,
        KeyEvent.KEYCODE_APP_SWITCH,
        KeyEvent.KEYCODE_MENU -> {
            Log.d(TAG, "⛔ Navigation key blocked: $keyCode")
            true
        }
        KeyEvent.KEYCODE_VOLUME_DOWN,
        KeyEvent.KEYCODE_VOLUME_UP -> {
            handleEmergencyExit()
            true
        }
        else -> super.onKeyDown(keyCode, event)
    }
}
    
   override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
    if (!isLockActive || isHiddenForAppUnlock || isDestroying) {
        return super.dispatchTouchEvent(ev)
    }
    
    ev?.let { event ->
        val screenHeight = resources.displayMetrics.heightPixels
        val screenWidth = resources.displayMetrics.widthPixels
        
        // 🔒 Block top 25% (status bar area)
        if (event.y < screenHeight * 0.25f) {
            collapseStatusBar()
            return true
        }
        
        // 🔒 Block bottom 20% (navigation gesture area) - INCREASED
        if (event.y > screenHeight * 0.80f) {
            Log.d(TAG, "⛔ Bottom area touch blocked at y=${event.y}")
            return true
        }
        
        // 🔒 Block edges (prevents edge gestures)
        if (event.x < 50 || event.x > screenWidth - 50) {
            if (event.y > screenHeight * 0.3f) { // Not blocking top corners
                Log.d(TAG, "⛔ Edge gesture blocked")
                return true
            }
        }
    }
    
    return super.dispatchTouchEvent(ev)
}
    
   override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    
    if (!hasFocus && isLockActive && !isHiddenForAppUnlock) {
        collapseStatusBar()
        bringToFront()
    }
    
    if (hasFocus && isLockActive && !isHiddenForAppUnlock) {
        // ✅ Immediately re-hide everything including gesture indicator
        Handler(Looper.getMainLooper()).post {
            hideSystemUIMaximum()
        }
        
        // ✅ Double-check after a short delay
        Handler(Looper.getMainLooper()).postDelayed({
            hideSystemUIMaximum()
        }, 100)
    }
}
    
    override fun onPause() {
        super.onPause()
        if (isHiddenForAppUnlock) {
            pauseMediaPlayback()
        } else {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onResume() {
        super.onResume()
        if (!isHiddenForAppUnlock) {
            resumeMediaPlayback()
        }
    }
    
    override fun onStop() {
    super.onStop()
    
    // ✅ CRITICAL: Check if app is being removed/destroyed
    if (isFinishing || isDestroyed) {
        Log.d(TAG, "📱 App finishing/destroyed - ensuring cleanup")
        removeBottomNavigationBlocker()
        
        // Also remove status bar blocks
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            statusBarBlockViews.forEach { view ->
                try {
                    windowManager?.removeView(view)
                } catch (e: Exception) { }
            }
            statusBarBlockViews.clear()
        } catch (e: Exception) { }
    } else if (isLockActive && !isHiddenForAppUnlock) {
        collapseStatusBar()
        bringToFront()
    }
}
    
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (isLockActive && !isHiddenForAppUnlock) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
   override fun onDestroy() {
    Log.d(TAG, "🔥 onDestroy called")
    
    // Stop system UI handler
    systemUIHandler?.removeCallbacks(systemUIRunnable!!)
    
    removeBottomNavigationBlocker()
    
    if (!isDestroying && isHiddenForAppUnlock) {
        Log.d(TAG, "⚠️ Activity destroyed while hidden - cleanup done")
        super.onDestroy()
        return
    }
    
    super.onDestroy()
    
    try {
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        if (windowManager != null && statusBarBlockViews.isNotEmpty()) {
            statusBarBlockViews.forEach { view ->
                try {
                    windowManager.removeView(view)
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing status bar block in onDestroy: ${e.message}")
                }
            }
            statusBarBlockViews.clear()
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error in onDestroy cleanup: ${e.message}")
    }
    
    try {
        unregisterReceiver(stopReceiver)
        unregisterReceiver(relockReceiver)
        unregisterReceiver(homeKeyReceiver)
        Log.d(TAG, "✅ Receivers unregistered")
    } catch (e: Exception) {
        Log.e(TAG, "Error unregistering receivers: ${e.message}")
    }
    
    Log.d(TAG, "✅ Lock activity destroyed - all overlays removed")
}

override fun finish() {
    Log.d(TAG, "🏁 finish() called")
    
    // Ensure bottom blocker is removed before finishing
    if (!isDestroying) {
        removeBottomNavigationBlocker()
    }
    
    super.finish()
}

    
    override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    
    // ✅ CRITICAL: Check persistent unlock state
    val unlockedUntil = prefs.getLong(KEY_APP_UNLOCKED_UNTIL, 0)
    val isCurrentlyUnlocked = unlockedUntil > System.currentTimeMillis()
    
    if (isCurrentlyUnlocked) {
        Log.d(TAG, "⏭️ App unlocked - ignoring new intent")
        finish()
        return
    }
    
    if (isUnlockInProgress) {
        Log.d(TAG, "⏭️ Unlock in progress - ignoring new intent")
        return
    }
    
    if (!isHiddenForAppUnlock) {
        Log.d(TAG, "onNewIntent - lock visible, processing")
    }
}
}