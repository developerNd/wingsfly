package com.wingsfly

import android.app.Activity
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
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.VideoView
import java.text.SimpleDateFormat
import java.util.*

class GetBackLockActivity : Activity() {
    
    companion object {
        private const val TAG = "GetBackLockActivity"
        var isLockActive = false
        
        // ✅ CRITICAL: Static storage for media URLs to survive recreation
        private var storedConfirmationUrl: String? = null
        private var storedMediaUrl: String? = null
        private var storedMediaType: String? = null
        private var storedDuration: Int = 0
        private var hasStoredData = false
    }
    
    private var durationMinutes: Int = 0
    private var remainingSeconds: Long = 0
    private var countDownTimer: CountDownTimer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var timeHandler: Handler? = null
    private var timeUpdateRunnable: Runnable? = null
    
    // PERSISTENT OVERLAY
    private var persistentOverlay: View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    private var isHandlingScreenEvent = false
    
    // Media playback with URLs
    private var mediaPlayer: MediaPlayer? = null
    private var videoView: VideoView? = null
    private var confirmationVideoUrl: String? = null
    private var mediaFileUrl: String? = null
    private var mediaType: String? = null
    private var mediaContainer: FrameLayout? = null
    
    // Audio management
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var originalRingerMode: Int = AudioManager.RINGER_MODE_NORMAL
    
    // UI references
    private var overlayTimerTextView: TextView? = null
    private var overlayMotivationTextView: TextView? = null
    private var overlayCurrentTimeTextView: TextView? = null
    private var overlayProgressBar: ProgressBar? = null
    private var overlayProgressPercentageTextView: TextView? = null
    
    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (isHandlingScreenEvent) return
            
            isHandlingScreenEvent = true
            
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> handleScreenOff()
                Intent.ACTION_SCREEN_ON -> handleScreenOn()
                Intent.ACTION_USER_PRESENT -> {
                    Handler(Looper.getMainLooper()).postDelayed({
                        persistentOverlay?.bringToFront()
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
            finishGetBack()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "🔒 Get Back Lock Activity created")
        Log.d(TAG, "========================================")
        
        // ✅ CRITICAL FIX: Load from static storage if available (for recreation)
        if (hasStoredData) {
            durationMinutes = storedDuration
            confirmationVideoUrl = storedConfirmationUrl
            mediaFileUrl = storedMediaUrl
            mediaType = storedMediaType
            Log.d(TAG, "📦 Loaded from static storage (activity recreated)")
        } else {
            // First creation - get from intent
            durationMinutes = intent.getIntExtra("duration_minutes", 5)
            confirmationVideoUrl = intent.getStringExtra("confirmation_video_url")
            mediaFileUrl = intent.getStringExtra("media_file_url")
            mediaType = intent.getStringExtra("media_type")
            
            // Store for future recreations
            storedDuration = durationMinutes
            storedConfirmationUrl = confirmationVideoUrl
            storedMediaUrl = mediaFileUrl
            storedMediaType = mediaType
            hasStoredData = true
            Log.d(TAG, "💾 Saved to static storage (first creation)")
        }
        
        remainingSeconds = durationMinutes * 60L
        
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
        setupAudioSuppression()
        startCountdownTimer()
        startTimeUpdates()
        
        isLockActive = true
        
        Log.d(TAG, "✅ Lock activity initialized")
        Log.d(TAG, "========================================")
    }
    
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
    }
    
    private fun handleScreenOff() {
        try {
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire(durationMinutes * 60 * 1000L + 10000L)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling screen off", e)
        }
    }
    
    private fun handleScreenOn() {
        try {
            Handler(Looper.getMainLooper()).postDelayed({
                if (isOverlayCreated && persistentOverlay != null) {
                    persistentOverlay?.bringToFront()
                    persistentOverlay?.invalidate()
                    updateTimerDisplay()
                    updateMotivationalMessage()
                    updateCurrentTime()
                    updateProgress()
                } else {
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
            persistentOverlay = inflater.inflate(R.layout.activity_get_back_lock, null)
            
            overlayTimerTextView = persistentOverlay?.findViewById(R.id.timerText)
            overlayMotivationTextView = persistentOverlay?.findViewById(R.id.motivationText)
            overlayCurrentTimeTextView = persistentOverlay?.findViewById(R.id.currentTime)
            overlayProgressBar = persistentOverlay?.findViewById(R.id.progressBar)
            overlayProgressPercentageTextView = persistentOverlay?.findViewById(R.id.progressPercentage)
            
            overlayProgressBar?.max = (durationMinutes * 60)
            
            updateTimerDisplay()
            updateMotivationalMessage()
            updateCurrentTime()
            updateProgress()
            
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
            Log.d(TAG, "🎵 Setting up audio: $mediaFileUrl")
            
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
    
    private fun setupVideoPlayerInOverlay() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🎥 Setting up video player")
            Log.d(TAG, "   URL: $mediaFileUrl")
            Log.d(TAG, "========================================")
            
            if (mediaFileUrl == null) {
                Log.e(TAG, "❌ Media URL is null")
                return
            }
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            requestAudioFocusForMedia()
            
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
                Log.d(TAG, "📡 Setting video URI: $mediaFileUrl")
                
                setVideoURI(Uri.parse(mediaFileUrl))
                
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
            }
            
            // ✅ CRITICAL: Find the video container in the layout
            val videoContainerInLayout = persistentOverlay?.findViewById<FrameLayout>(R.id.videoContainer)
            if (videoContainerInLayout != null) {
                Log.d(TAG, "✅ Found videoContainer in layout")
                videoContainerInLayout.removeAllViews()
                videoContainerInLayout.addView(videoView)
                videoContainerInLayout.visibility = View.VISIBLE
                
                // Hide lock icon
                persistentOverlay?.findViewById<View>(R.id.lockIcon)?.visibility = View.GONE
                
                Log.d(TAG, "✅ VideoView added to container")
            } else {
                Log.e(TAG, "❌ videoContainer NOT found in layout!")
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
    
    private fun setupAudioSuppression() {
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            originalRingerMode = audioManager?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL
            audioManager?.ringerMode = AudioManager.RINGER_MODE_SILENT
        } catch (e: Exception) {
            Log.e(TAG, "Audio suppression error", e)
        }
    }
    
    private fun restoreAudio() {
        try {
            audioManager?.ringerMode = originalRingerMode
        } catch (e: Exception) { }
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "GetBack:Lock"
            )
            wakeLock?.acquire(durationMinutes * 60 * 1000L + 10000L)
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error", e)
        }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_GET_BACK")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopReceiver, stopFilter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopReceiver, stopFilter)
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
            percentage < 25 -> "Getting back on track! Stay focused."
            percentage < 50 -> "Making progress! Keep it up."
            percentage < 75 -> "You're halfway there! Strong work."
            percentage < 95 -> "Almost complete! Final push."
            else -> "You did it! Session ending soon."
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
    
    private fun finishGetBack() {
        Log.d(TAG, "🏁 Finishing Get Back session")
        
        isLockActive = false
        hasStoredData = false // Clear static storage
        
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        
        stopMediaPlayback()
        restoreAudio()
        removePersistentOverlay()
        
        wakeLock?.release()
        
        try { unregisterReceiver(stopReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(screenStateReceiver) } catch (e: Exception) { }
        
        stopService(Intent(this, GetBackService::class.java))
        
        finish()
    }
    
    override fun onBackPressed() {
        // Blocked
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent")
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
        if (isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
                persistentOverlay?.invalidate()
            }, 100)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 onDestroy")
        
        stopMediaPlayback()
        
        try { unregisterReceiver(stopReceiver) } catch (e: Exception) { }
        try { unregisterReceiver(screenStateReceiver) } catch (e: Exception) { }
        
        restoreAudio()
        removePersistentOverlay()
        
        countDownTimer?.cancel()
        timeHandler?.removeCallbacks(timeUpdateRunnable!!)
        wakeLock?.release()
    }
}