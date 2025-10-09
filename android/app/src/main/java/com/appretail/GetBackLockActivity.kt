package com.wingsfly

import android.app.Activity
import android.app.ActivityManager
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import android.os.Vibrator
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.VideoView
import java.io.File
import java.lang.reflect.Method
import java.text.SimpleDateFormat
import java.util.*

class GetBackLockActivity : Activity() {
    
    companion object {
        private const val TAG = "GetBackLockActivity"
        var isLockActive = false
        private const val EMERGENCY_EXIT_THRESHOLD = 5
        private const val EMERGENCY_EXIT_TIMEOUT = 2000L
    }
    
    private var durationMinutes: Int = 0
    private var remainingSeconds: Long = 0
    private var countDownTimer: CountDownTimer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var timeHandler: Handler? = null
    private var timeUpdateRunnable: Runnable? = null
    private var relaunchHandler: Handler? = null
    private var relaunchRunnable: Runnable? = null
    private var statusBarBlockViews = mutableListOf<View>()
    private var audioSuppressionHandler: Handler? = null
    private var audioSuppressionRunnable: Runnable? = null
    
    // Media playback properties
    private var mediaPlayer: MediaPlayer? = null
    private var videoView: VideoView? = null
    private var mediaFilePath: String? = null
    private var mediaType: String? = null
    private var mediaContainer: FrameLayout? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    
    // Audio management
    private var audioManager: AudioManager? = null
    private var vibrator: Vibrator? = null
    private var telecomManager: TelecomManager? = null
    private var originalRingerMode: Int = AudioManager.RINGER_MODE_NORMAL
    private var originalRingtoneVolume: Int = 0
    private var originalNotificationVolume: Int = 0
    private var originalSystemVolume: Int = 0
    private var originalAlarmVolume: Int = 0
    private var originalMusicVolume: Int = 0
    
    // Device Policy for Kiosk mode
    private var devicePolicyManager: DevicePolicyManager? = null
    private var isKioskModeActive = false
    
    private var emergencyExitPressCount = 0
    private var lastEmergencyPressTime = 0L
    
    private lateinit var timerTextView: TextView
    private lateinit var motivationTextView: TextView
    private lateinit var currentTimeTextView: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var progressPercentageTextView: TextView
    private lateinit var rootLayout: ViewGroup
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Stop broadcast received")
            finishGetBack()
        }
    }
    
    private val homeKeyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Home key detected")
            Handler(Looper.getMainLooper()).postDelayed({
                collapseStatusBar()
                bringToFront()
            }, 50)
        }
    }
    
    private val phoneStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                    Log.d(TAG, "☎️ Phone state: $state")
                    
                    for (instant in 0..5) {
                        forceCompleteAudioSuppression()
                        killAllVibrations()
                        nuclearVibrationKill()
                    }
                    
                    for (i in 0..50) {
                        Handler(Looper.getMainLooper()).postDelayed({
                            forceCompleteAudioSuppression()
                            killAllVibrations()
                            nuclearVibrationKill()
                            collapseStatusBar()
                            if (isLockActive) bringToFront()
                        }, (i * 20).toLong())
                    }
                }
                "android.intent.action.NEW_OUTGOING_CALL" -> {
                    Log.d(TAG, "☎️ Outgoing call")
                    for (instant in 0..5) {
                        forceCompleteAudioSuppression()
                        killAllVibrations()
                        nuclearVibrationKill()
                    }
                    collapseStatusBar()
                    bringToFront()
                }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "🔒 Get Back Lock Activity created")
        
        durationMinutes = intent.getIntExtra("duration_minutes", 5)
        remainingSeconds = durationMinutes * 60L
        
        disableTextToSpeech()
        
        setupKioskMode()
        setupFullScreenLockMode()
        setContentView(R.layout.activity_get_back_lock)
        initializeViews()
        
        initializeMediaFromIntent()
        
        registerReceivers()
        createMaximumStatusBarBlock()
        disableFloatingWindows()
        setupAggressiveAudioSuppression()
        startCountdownTimer()
        startTimeUpdates()
        startAggressiveMonitoring()
        startContinuousAudioSuppression()
        
        isLockActive = true
        
        Log.d(TAG, "✅ Get Back lock mode active")
    }
    
    private fun disableTextToSpeech() {
        try {
            val ttsIntent = Intent(TextToSpeech.Engine.ACTION_CHECK_TTS_DATA)
            ttsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            Log.d(TAG, "✅ TTS disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling TTS", e)
        }
    }
    
    private fun initializeViews() {
        timerTextView = findViewById(R.id.timerText)
        motivationTextView = findViewById(R.id.motivationText)
        currentTimeTextView = findViewById(R.id.currentTime)
        progressBar = findViewById(R.id.progressBar)
        progressPercentageTextView = findViewById(R.id.progressPercentage)
        
        val contentView = window.decorView.findViewById<ViewGroup>(android.R.id.content)
        rootLayout = contentView.getChildAt(0) as ViewGroup
        
        Log.d(TAG, "Root layout type: ${rootLayout.javaClass.simpleName}")
        
        updateTimerDisplay()
        updateMotivationalMessage()
        updateCurrentTime()
        updateProgress()
        
        progressBar.max = (durationMinutes * 60)
    }
    
    private fun initializeMediaFromIntent() {
        mediaFilePath = intent.getStringExtra("media_file_path")
        mediaType = intent.getStringExtra("media_type")
        
        Log.d(TAG, "📱 Media initialized: type=$mediaType, path=$mediaFilePath")
        
        if (mediaFilePath != null && mediaType != null) {
            Handler(Looper.getMainLooper()).post {
                setupMediaPlayer()
            }
        } else {
            Log.d(TAG, "No media configured for this Get Back session")
        }
    }
    
    private fun setupMediaPlayer() {
        try {
            if (mediaFilePath == null || mediaType == null) {
                Log.d(TAG, "No media configured")
                return
            }
            
            val mediaFile = File(mediaFilePath!!)
            if (!mediaFile.exists()) {
                Log.e(TAG, "❌ Media file does not exist: $mediaFilePath")
                return
            }
            
            Log.d(TAG, "📁 Media file exists, size: ${mediaFile.length()} bytes")
            
            when (mediaType) {
                "audio" -> setupAudioPlayer()
                "video" -> setupVideoPlayer()
                else -> Log.w(TAG, "Unknown media type: $mediaType")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error setting up media player", e)
        }
    }
    
    private fun setupAudioPlayer() {
        try {
            Log.d(TAG, "🎵 Setting up audio player...")
            
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
                
                setOnPreparedListener {
                    Log.d(TAG, "✅ Audio prepared, starting playback")
                    start()
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "❌ MediaPlayer error: what=$what, extra=$extra")
                    true
                }
                
                setOnCompletionListener {
                    Log.d(TAG, "Audio completed (looping)")
                    if (isLockActive) {
                        start()
                    }
                }
                
                prepareAsync()
            }
            
            Log.d(TAG, "✅ Audio player setup complete")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error setting up audio player", e)
        }
    }
    
    private fun setupVideoPlayer() {
        try {
            Log.d(TAG, "🎥 Setting up video player...")
            
            if (mediaFilePath == null) {
                Log.e(TAG, "❌ Media file path is null")
                return
            }
            
            val mediaFile = File(mediaFilePath!!)
            if (!mediaFile.exists()) {
                Log.e(TAG, "❌ Media file does not exist: $mediaFilePath")
                return
            }
            
            Log.d(TAG, "📁 Media file exists, size: ${mediaFile.length()} bytes")
            
            requestAudioFocusForMedia()
            
            val lockIcon = findViewById<View>(R.id.lockIcon)
            lockIcon?.visibility = View.GONE
            Log.d(TAG, "🎥 Lock icon hidden for video display")
            
            val screenWidth = resources.displayMetrics.widthPixels
            val containerWidth = screenWidth - dpToPx(40)
            val containerHeight = (containerWidth * 9) / 16
            
            Log.d(TAG, "🎥 Video container: width=$containerWidth, height=$containerHeight (16:9)")
            
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
                        Log.d(TAG, "🎥 Video positioned below header section")
                    } else {
                        addRule(RelativeLayout.ALIGN_PARENT_TOP)
                        topMargin = dpToPx(140)
                        Log.d(TAG, "🎥 Video positioned from top (fallback)")
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
                
                Log.d(TAG, "🎥 Timer section repositioned below video")
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
            
            Log.d(TAG, "🎥 Video container added below header section")
            
            videoView?.apply {
                val videoUri = Uri.fromFile(mediaFile)
                Log.d(TAG, "🎥 Setting video URI: $videoUri")
                
                setOnPreparedListener { mp ->
                    try {
                        Log.d(TAG, "✅ Video prepared")
                        
                        val videoWidth = mp.videoWidth
                        val videoHeight = mp.videoHeight
                        Log.d(TAG, "🎥 Video dimensions: ${videoWidth}x${videoHeight}")
                        
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
                        Log.d(TAG, "✅ Video playback started")
                        
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (isPlaying) {
                                Log.d(TAG, "✅ Video confirmed playing - position: ${currentPosition}ms, duration: ${duration}ms")
                            } else {
                                Log.e(TAG, "❌ Video not playing after start!")
                                seekTo(0)
                                start()
                            }
                        }, 1000)
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Error in onPrepared", e)
                        e.printStackTrace()
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "❌ VideoView error: what=$what, extra=$extra")
                    mediaContainer?.visibility = View.GONE
                    findViewById<View>(R.id.lockIcon)?.visibility = View.VISIBLE
                    true
                }
                
                setOnCompletionListener {
                    Log.d(TAG, "Video completed (should loop automatically)")
                }
                
                setVideoURI(videoUri)
                Log.d(TAG, "🎥 Video URI set, preparing...")
            }
            
            Log.d(TAG, "✅ Video player setup complete with 16:9 aspect ratio")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Fatal error setting up video player", e)
            e.printStackTrace()
            
            mediaContainer?.visibility = View.GONE
            mediaContainer = null
            videoView = null
            findViewById<View>(R.id.lockIcon)?.visibility = View.VISIBLE
        }
    }
    
    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
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
                    .setOnAudioFocusChangeListener { focusChange ->
                        Log.d(TAG, "Audio focus changed: $focusChange")
                        when (focusChange) {
                            AudioManager.AUDIOFOCUS_LOSS -> resumeMediaPlayback()
                            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> resumeMediaPlayback()
                            AudioManager.AUDIOFOCUS_GAIN -> resumeMediaPlayback()
                        }
                    }
                    .build()
                
                val result = audioManager?.requestAudioFocus(audioFocusRequest!!)
                Log.d(TAG, "✅ Audio focus request result: $result")
            } else {
                @Suppress("DEPRECATION")
                val result = audioManager?.requestAudioFocus(
                    { focusChange ->
                        when (focusChange) {
                            AudioManager.AUDIOFOCUS_LOSS,
                            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> resumeMediaPlayback()
                            AudioManager.AUDIOFOCUS_GAIN -> resumeMediaPlayback()
                        }
                    },
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                )
                Log.d(TAG, "✅ Audio focus request result: $result")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting audio focus", e)
        }
    }
    
    private fun stopMediaPlayback() {
        try {
            Log.d(TAG, "🛑 Stopping media playback...")
            
            mediaPlayer?.let {
                try {
                    if (it.isPlaying) it.stop()
                    it.release()
                    Log.d(TAG, "✅ Audio player stopped and released")
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping audio", e)
                }
                mediaPlayer = null
            }
            
            videoView?.let {
                try {
                    if (it.isPlaying) it.stopPlayback()
                    Log.d(TAG, "✅ Video player stopped")
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping video", e)
                }
                videoView = null
            }
            
            mediaContainer?.let {
                try {
                    val parent = it.parent as? ViewGroup
                    parent?.removeView(it)
                    Log.d(TAG, "✅ Media container removed")
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing container", e)
                }
                mediaContainer = null
            }
            
            findViewById<View>(R.id.lockIcon)?.visibility = View.VISIBLE
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus(null)
            }
            
            Log.d(TAG, "✅ Media playback fully stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping media playback", e)
        }
    }
    
    private fun pauseMediaPlayback() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                    Log.d(TAG, "⏸️ Audio paused")
                }
            }
            
            videoView?.let {
                if (it.isPlaying) {
                    it.pause()
                    Log.d(TAG, "⏸️ Video paused")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error pausing media", e)
        }
    }
    
    private fun resumeMediaPlayback() {
        try {
            mediaPlayer?.let {
                if (!it.isPlaying) {
                    it.start()
                    Log.d(TAG, "▶️ Audio resumed")
                }
            }
            
            videoView?.let {
                if (!it.isPlaying) {
                    it.start()
                    Log.d(TAG, "▶️ Video resumed")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resuming media", e)
        }
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
                        Log.d(TAG, "✅ KIOSK MODE ACTIVATED")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Lock Task Mode not available: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Kiosk mode setup error", e)
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
            Log.e(TAG, "Exit kiosk mode error", e)
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
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        
        window.addFlags(flags)
        
        try {
            window.setType(WindowManager.LayoutParams.TYPE_APPLICATION)
            Log.d(TAG, "✅ Window type set to TYPE_APPLICATION")
        } catch (e: Exception) {
            Log.w(TAG, "Window type error: ${e.message}")
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.statusBarColor = 0xFFFF6B6B.toInt()
            window.navigationBarColor = 0xFFFF6B6B.toInt()
            
            val uiFlags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                         View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                         View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                         View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                         View.SYSTEM_UI_FLAG_FULLSCREEN or
                         View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                         View.SYSTEM_UI_FLAG_LOW_PROFILE
                         
            window.decorView.systemUiVisibility = uiFlags
            
            window.decorView.setOnSystemUiVisibilityChangeListener { 
                if (isLockActive) {
                    window.decorView.systemUiVisibility = uiFlags
                    collapseStatusBar()
                }
            }
        }
        
        acquireWakeLock()
    }
    
    private fun setupAggressiveAudioSuppression() {
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            }
            
            originalRingerMode = audioManager?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL
            originalRingtoneVolume = audioManager?.getStreamVolume(AudioManager.STREAM_RING) ?: 0
            originalNotificationVolume = audioManager?.getStreamVolume(AudioManager.STREAM_NOTIFICATION) ?: 0
            originalSystemVolume = audioManager?.getStreamVolume(AudioManager.STREAM_SYSTEM) ?: 0
            originalAlarmVolume = audioManager?.getStreamVolume(AudioManager.STREAM_ALARM) ?: 0
            originalMusicVolume = audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0
            
            forceCompleteAudioSuppression()
            killAllVibrations()
            nuclearVibrationKill()
            
            Log.d(TAG, "✅ Aggressive audio suppression initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Audio setup error", e)
        }
    }
    
    private fun nuclearVibrationKill() {
        try {
            for (i in 0..20) {
                vibrator?.cancel()
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? android.os.VibratorManager
                    vibratorManager?.cancel()
                    
                    vibratorManager?.vibratorIds?.forEach { id ->
                        vibratorManager.getVibrator(id)?.cancel()
                    }
                } catch (e: Exception) { }
            }
            
            try {
                val cr = contentResolver
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.System.canWrite(this)) {
                    Settings.System.putInt(cr, Settings.System.VIBRATE_WHEN_RINGING, 0)
                    Settings.System.putInt(cr, Settings.System.HAPTIC_FEEDBACK_ENABLED, 0)
                }
            } catch (e: Exception) { }
            
            try {
                audioManager?.ringerMode = AudioManager.RINGER_MODE_SILENT
            } catch (e: Exception) { }
            
        } catch (e: Exception) {
            Log.e(TAG, "Nuclear vibration error", e)
        }
    }
    
    private fun killAllVibrations() {
        try {
            for (attempt in 0..10) {
                vibrator?.cancel()
            }
            
            @Suppress("DEPRECATION")
            audioManager?.setVibrateSetting(AudioManager.VIBRATE_TYPE_RINGER, AudioManager.VIBRATE_SETTING_OFF)
            @Suppress("DEPRECATION")
            audioManager?.setVibrateSetting(AudioManager.VIBRATE_TYPE_NOTIFICATION, AudioManager.VIBRATE_SETTING_OFF)
            
            try {
                audioManager?.ringerMode = AudioManager.RINGER_MODE_SILENT
                if (audioManager?.ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
                    audioManager?.ringerMode = AudioManager.RINGER_MODE_SILENT
                }
            } catch (e: Exception) { }
            
        } catch (e: Exception) {
            Log.e(TAG, "Kill vibrations error", e)
        }
    }
    
    private fun forceCompleteAudioSuppression() {
        try {
            audioManager?.mode = AudioManager.MODE_NORMAL
            audioManager?.ringerMode = AudioManager.RINGER_MODE_SILENT
            
            val streams = arrayOf(
                AudioManager.STREAM_RING,
                AudioManager.STREAM_NOTIFICATION,
                AudioManager.STREAM_SYSTEM,
                AudioManager.STREAM_ALARM,
                AudioManager.STREAM_DTMF,
                AudioManager.STREAM_VOICE_CALL,
                AudioManager.STREAM_ACCESSIBILITY
            )
            
            streams.forEach { stream ->
                try {
                    if (stream == AudioManager.STREAM_MUSIC && (mediaPlayer != null || videoView != null)) {
                        return@forEach
                    }
                    audioManager?.setStreamVolume(stream, 0, AudioManager.FLAG_REMOVE_SOUND_AND_VIBRATE)
                    audioManager?.adjustStreamVolume(stream, AudioManager.ADJUST_MUTE, AudioManager.FLAG_REMOVE_SOUND_AND_VIBRATE)
                } catch (e: Exception) { }
            }
            
            killAllVibrations()
            
            try {
                audioManager?.isSpeakerphoneOn = false
                audioManager?.isBluetoothScoOn = false
            } catch (e: Exception) { }
            
            try {
                audioManager?.isMicrophoneMute = true
            } catch (e: Exception) { }
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    telecomManager?.endCall()
                }
            } catch (e: Exception) { }
            
        } catch (e: Exception) {
            Log.e(TAG, "Audio suppression error", e)
        }
    }
    
    private fun startContinuousAudioSuppression() {
        audioSuppressionHandler = Handler(Looper.getMainLooper())
        audioSuppressionRunnable = object : Runnable {
            override fun run() {
                if (isLockActive) {
                    forceCompleteAudioSuppression()
                    killAllVibrations()
                    nuclearVibrationKill()
                    audioSuppressionHandler?.postDelayed(this, 15)
                }
            }
        }
        audioSuppressionHandler?.post(audioSuppressionRunnable!!)
    }
    
    private fun restoreAudio() {
        try {
            audioSuppressionHandler?.removeCallbacks(audioSuppressionRunnable!!)
            audioManager?.mode = AudioManager.MODE_NORMAL
            
            val streams = arrayOf(
                AudioManager.STREAM_RING,
                AudioManager.STREAM_NOTIFICATION,
                AudioManager.STREAM_SYSTEM,
                AudioManager.STREAM_ALARM,
                AudioManager.STREAM_MUSIC,
                AudioManager.STREAM_VOICE_CALL
            )
            
            streams.forEach { stream ->
                try {
                    audioManager?.adjustStreamVolume(stream, AudioManager.ADJUST_UNMUTE, 0)
                } catch (e: Exception) { }
            }
            
            audioManager?.ringerMode = originalRingerMode
            audioManager?.setStreamVolume(AudioManager.STREAM_RING, originalRingtoneVolume, 0)
            audioManager?.setStreamVolume(AudioManager.STREAM_NOTIFICATION, originalNotificationVolume, 0)
            audioManager?.setStreamVolume(AudioManager.STREAM_SYSTEM, originalSystemVolume, 0)
            audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, originalAlarmVolume, 0)
            audioManager?.setStreamVolume(AudioManager.STREAM_MUSIC, originalMusicVolume, 0)
            
            audioManager?.isSpeakerphoneOn = false
            audioManager?.isMicrophoneMute = false
            
            Log.d(TAG, "✅ Audio restored")
        } catch (e: Exception) {
            Log.e(TAG, "Audio restore error", e)
        }
    }
    
    private fun createMaximumStatusBarBlock() {
        try {
            if (!Settings.canDrawOverlays(this)) {
                Log.w(TAG, "⚠️ Overlay permission missing")
                return
            }
            
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
                } catch (e: Exception) {
                    Log.e(TAG, "Layer $layer failed: ${e.message}")
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Status bar block error", e)
        }
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
        relaunchHandler = Handler(Looper.getMainLooper())
        relaunchRunnable = object : Runnable {
            override fun run() {
                if (!isFinishing && isLockActive) {
                    checkAndBringToFront()
                    relaunchHandler?.postDelayed(this, 100)
                }
            }
        }
        relaunchHandler?.post(relaunchRunnable!!)
        
        val collapseHandler = Handler(Looper.getMainLooper())
        val collapseRunnable = object : Runnable {
            override fun run() {
                if (isLockActive) {
                    collapseStatusBar()
                    collapseHandler.postDelayed(this, 200)
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
                val intent = Intent(this, GetBackLockActivity::class.java)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or 
                               Intent.FLAG_ACTIVITY_CLEAR_TASK or
                               Intent.FLAG_ACTIVITY_NO_ANIMATION)
                intent.putExtra("duration_minutes", (remainingSeconds / 60).toInt())
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
                "GetBack:LockScreen"
            )
            wakeLock?.acquire(durationMinutes * 60 * 1000L + 10000L)
        } catch (e: Exception) {
            Log.e(TAG, "WakeLock error", e)
        }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_GET_BACK")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopReceiver, stopFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopReceiver, stopFilter)
        }
        
        val homeFilter = IntentFilter(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(homeKeyReceiver, homeFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(homeKeyReceiver, homeFilter)
        }
        
        val phoneFilter = IntentFilter().apply {
            addAction(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
            addAction("android.intent.action.NEW_OUTGOING_CALL")
            priority = IntentFilter.SYSTEM_HIGH_PRIORITY
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(phoneStateReceiver, phoneFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(phoneStateReceiver, phoneFilter)
        }
    }
    
    private fun checkAndBringToFront() {
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val tasks = activityManager.appTasks
            
            if (tasks.isNotEmpty()) {
                val topActivity = tasks[0].taskInfo.topActivity
                if (topActivity?.className != this::class.java.name) {
                    bringToFront()
                }
            }
        } catch (e: Exception) { }
    }
    
    private fun bringToFront() {
        try {
            collapseStatusBar()
            
            val intent = Intent(this, GetBackLockActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or 
                           Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                           Intent.FLAG_ACTIVITY_SINGLE_TOP or
                           Intent.FLAG_ACTIVITY_NO_ANIMATION)
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
                finishGetBack()
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
            percentage < 25 -> "Getting back on track! Stay focused."
            percentage < 50 -> "Making progress! Keep it up."
            percentage < 75 -> "You're halfway there! Strong work."
            percentage < 95 -> "Almost complete! Final push."
            else -> "You did it! Session ending soon."
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
            Log.d(TAG, "Emergency exit triggered")
            finishGetBack()
        } else {
            val remaining = EMERGENCY_EXIT_THRESHOLD - emergencyExitPressCount
            motivationTextView.text = "Emergency Exit: Press ${remaining} more times"
        }
    }
    
    private fun finishGetBack() {
        isLockActive = false
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        relaunchHandler?.removeCallbacks(relaunchRunnable!!)
        audioSuppressionHandler?.removeCallbacks(audioSuppressionRunnable!!)
        
        stopMediaPlayback()
        exitKioskMode()
        restoreAudio()
        
        wakeLock?.release()
        
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            statusBarBlockViews.forEach { view ->
                try {
                    windowManager.removeView(view)
                } catch (e: Exception) { }
            }
            statusBarBlockViews.clear()
        } catch (e: Exception) { }
        
        stopService(Intent(this, GetBackService::class.java))
        finish()
    }
    
    override fun onBackPressed() {
        Log.d(TAG, "⛔ Back blocked")
    }
    
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_APP_SWITCH,
            KeyEvent.KEYCODE_MENU -> true
            KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_VOLUME_UP -> {
                handleEmergencyExit()
                true
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }
    
    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        ev?.let {
            val screenHeight = resources.displayMetrics.heightPixels
            
            if (it.y < screenHeight * 0.25f) {
                collapseStatusBar()
                return true
            }
        }
        return super.dispatchTouchEvent(ev)
    }
    
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus && isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && hasFocus && isLockActive) {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                         View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                         View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                         View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                         View.SYSTEM_UI_FLAG_FULLSCREEN or
                         View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
    }
    
    override fun onPause() {
        super.onPause()
        pauseMediaPlayback()
        if (isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onResume() {
        super.onResume()
        resumeMediaPlayback()
    }
    
    override fun onStop() {
        super.onStop()
        if (isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        
        stopMediaPlayback()
        
        try {
            unregisterReceiver(stopReceiver)
            unregisterReceiver(homeKeyReceiver)
            unregisterReceiver(phoneStateReceiver)
        } catch (e: Exception) { }
        
        exitKioskMode()
        restoreAudio()
        
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        relaunchHandler?.removeCallbacks(relaunchRunnable!!)
        audioSuppressionHandler?.removeCallbacks(audioSuppressionRunnable!!)
        
        wakeLock?.release()
        
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            statusBarBlockViews.forEach { view ->
                try {
                    windowManager.removeView(view)
                } catch (e: Exception) { }
            }
        } catch (e: Exception) { }
    }
}