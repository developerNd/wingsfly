package com.wingsfly

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.widget.VideoView
import java.io.File

class ChallengeLockActivity : Activity() {
    
    companion object {
        private const val TAG = "ChallengeLock"
        var isLockActive = false
        
        private const val PREFS_NAME = "ChallengePrefs"
        private const val KEY_CHALLENGE_ID = "challenge_id"
        private const val KEY_VIDEO_PATH = "video_path"
        private const val KEY_YOUTUBE_LINK = "youtube_link"
        private const val KEY_CHALLENGE_ACTIVE = "challenge_active"
        
        // Static storage for recreation
        private var storedChallengeId: String? = null
        private var storedVideoPath: String? = null
        private var storedYoutubeLink: String? = null
        private var storedChallengeName: String? = null
        private var storedDayNumber: Int = 1
        private var storedHoursPerDay: Double = 1.0
        private var hasStoredData = false
    }
    
    private var challengeId: String? = null
    private var videoPath: String? = null
    private var youtubeLink: String? = null
    private var challengeName: String? = null
    private var dayNumber: Int = 1
    private var hoursPerDay: Double = 1.0
    
    private var videoView: VideoView? = null
    private var webView: WebView? = null
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    
    private var videoDuration = 0
    private var currentPosition = 0
    private var isYouTubeVideo = false
    private var isDestroying = false
    private var isHandlingScreenEvent = false
    
    private lateinit var prefs: SharedPreferences
    
    // PERSISTENT OVERLAY
    private var persistentOverlay: View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    
    // Overlay UI references
    private var overlayTitleTextView: TextView? = null
    private var overlayProgressBar: ProgressBar? = null
    private var overlayCompletionButton: Button? = null
    private var overlayVideoContainer: FrameLayout? = null
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finishChallenge()
        }
    }
    
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
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "🔒 Challenge Lock Activity Created")
        Log.d(TAG, "========================================")
        
        isDestroying = false
        
        // Load from static storage if available (for recreation)
        if (hasStoredData) {
            challengeId = storedChallengeId
            videoPath = storedVideoPath
            youtubeLink = storedYoutubeLink
            challengeName = storedChallengeName
            dayNumber = storedDayNumber
            hoursPerDay = storedHoursPerDay
            Log.d(TAG, "📦 Loaded from static storage (activity recreated)")
        } else {
            // First creation - get from intent
            challengeId = intent.getStringExtra("challenge_id")
            videoPath = intent.getStringExtra("video_path")
            youtubeLink = intent.getStringExtra("youtube_link")
            challengeName = intent.getStringExtra("challenge_name")
            dayNumber = intent.getIntExtra("day_number", 1)
            hoursPerDay = intent.getDoubleExtra("hours_per_day", 1.0)
            
            // Store for future recreations
            storedChallengeId = challengeId
            storedVideoPath = videoPath
            storedYoutubeLink = youtubeLink
            storedChallengeName = challengeName
            storedDayNumber = dayNumber
            storedHoursPerDay = hoursPerDay
            hasStoredData = true
            Log.d(TAG, "💾 Saved to static storage (first creation)")
        }
        
        Log.d(TAG, "Challenge ID: $challengeId")
        Log.d(TAG, "Video Path: $videoPath")
        Log.d(TAG, "YouTube Link: $youtubeLink")
        Log.d(TAG, "Challenge Name: $challengeName")
        Log.d(TAG, "Day Number: $dayNumber")
        Log.d(TAG, "Hours Per Day: $hoursPerDay")
        
        // Determine video type
        isYouTubeVideo = !youtubeLink.isNullOrEmpty()
        
        // Validate video source
        if (isYouTubeVideo) {
            Log.d(TAG, "YouTube video mode")
        } else if (videoPath != null && File(videoPath!!).exists()) {
            Log.d(TAG, "Local video mode")
        } else {
            Log.e(TAG, "No valid video source found")
            Toast.makeText(this, "No video source available", Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.e(TAG, "❌ NO OVERLAY PERMISSION")
                Toast.makeText(this, "Overlay permission required", Toast.LENGTH_SHORT).show()
                finish()
                return
            }
        }
        
        setupBasicActivity()
        
        // Create overlay
        Handler(Looper.getMainLooper()).postDelayed({
            createPersistentLockOverlay()
            
            // Initialize video after overlay
            Handler(Looper.getMainLooper()).postDelayed({
                setupVideoPlayer()
            }, 500)
        }, 300)
        
        registerReceivers()
        
        isLockActive = true
        
        // Save challenge state
        prefs.edit().apply {
            putString(KEY_CHALLENGE_ID, challengeId)
            putString(KEY_VIDEO_PATH, videoPath)
            putString(KEY_YOUTUBE_LINK, youtubeLink)
            putBoolean(KEY_CHALLENGE_ACTIVE, true)
        }.commit()
        
        Log.d(TAG, "✅ Challenge lock mode active")
    }
    
    private fun setupBasicActivity() {
    window.addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or      // ADD
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS         // ADD
    )
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
    }
    
    acquireWakeLock()
}
    
    private fun handleScreenOff() {
    try {
        // Acquire wake lock
        if (wakeLock?.isHeld == false) {
            wakeLock?.acquire(60 * 60 * 1000L)
        }
        
        // ADD THIS: Force activity to front after screen off
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this, ChallengeLockActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(intent)
        }, 300)
        
    } catch (e: Exception) {
        Log.e(TAG, "Error handling screen off", e)
    }
}
    
   private fun handleScreenOn() {
    try {
        // ADD THIS: First bring activity to front
        val intent = Intent(this, ChallengeLockActivity::class.java).apply {
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
                persistentOverlay?.requestLayout()  // ADD THIS
                
                // ADD THIS: Resume video if YouTube
                if (isYouTubeVideo) {
                    webView?.evaluateJavascript("if(player) player.playVideo();", null)
                }
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
            persistentOverlay = inflater.inflate(R.layout.activity_challenge_lock, null)
            
            overlayTitleTextView = persistentOverlay?.findViewById(R.id.challengeTitle)
            overlayProgressBar = persistentOverlay?.findViewById(R.id.videoProgress)
            overlayCompletionButton = persistentOverlay?.findViewById(R.id.completionButton)
            overlayVideoContainer = persistentOverlay?.findViewById(R.id.videoContainer)
            
            overlayTitleTextView?.text = challengeName ?: "Video Challenge"
            overlayCompletionButton?.visibility = View.GONE
            
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
    
    private fun setupVideoPlayer() {
        if (isYouTubeVideo) {
            setupYouTubePlayer()
        } else {
            setupLocalVideoPlayer()
        }
    }
    
    private fun extractYouTubeVideoId(url: String): String? {
        try {
            val patterns = listOf(
                "(?<=watch\\?v=|/videos/|embed\\/|youtu.be\\/|\\/v\\/|\\/e\\/|watch\\?v%3D|watch\\?feature=player_embedded&v=|%2Fvideos%2F|embed%2F|youtu.be%2F|%2Fv%2F)[^#\\&\\?\\n]*",
                "(?<=shorts/)[^#\\&\\?\\n]*"
            )
            
            for (pattern in patterns) {
                val regex = Regex(pattern)
                val match = regex.find(url)
                if (match != null) {
                    return match.value
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting video ID: ${e.message}")
        }
        return null
    }
    
    private fun setupYouTubePlayer() {
        try {
            if (youtubeLink == null) {
                Log.e(TAG, "YouTube link is null")
                return
            }
            
            val videoId = extractYouTubeVideoId(youtubeLink!!)
            if (videoId == null) {
                Log.e(TAG, "Could not extract video ID from: $youtubeLink")
                Toast.makeText(this, "Invalid YouTube link", Toast.LENGTH_SHORT).show()
                return
            }
            
            Log.d(TAG, "Setting up YouTube video: $videoId")
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
           val screenWidth = resources.displayMetrics.widthPixels
val videoHeight16x9 = (screenWidth * 9) / 16

val containerParams = android.widget.LinearLayout.LayoutParams(screenWidth, videoHeight16x9).apply {
    gravity = Gravity.CENTER_HORIZONTAL
    topMargin = 24
}
overlayVideoContainer?.layoutParams = containerParams
            
            overlayVideoContainer?.removeAllViews()
            overlayVideoContainer?.visibility = View.VISIBLE
            
            webView = WebView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                setBackgroundColor(Color.BLACK)
                
                isClickable = false
                isFocusable = false
                isFocusableInTouchMode = false
                isLongClickable = false
                
                settings.apply {
                    javaScriptEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    domStorageEnabled = true
                    databaseEnabled = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    setSupportZoom(false)
                    builtInZoomControls = false
                    displayZoomControls = false
                    allowFileAccess = false
                    allowContentAccess = false
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        safeBrowsingEnabled = false
                    }
                    
                    cacheMode = WebSettings.LOAD_NO_CACHE
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
                
                setOnTouchListener { _, _ -> true }
                setOnLongClickListener { true }
                
                addJavascriptInterface(object : Any() {
                    @JavascriptInterface
                    fun onVideoEnded() {
                        runOnUiThread {
                            Log.d(TAG, "Video completed!")
                            finishChallenge()
                        }
                    }
                    
                    @JavascriptInterface
                    fun onVideoDuration(durationSeconds: Int) {
                        runOnUiThread {
                            videoDuration = durationSeconds * 1000
                            overlayProgressBar?.max = videoDuration
                            Log.d(TAG, "Video duration: ${durationSeconds}s")
                        }
                    }
                    
                    @JavascriptInterface
                    fun onVideoProgress(currentSeconds: Int) {
                        runOnUiThread {
                            currentPosition = currentSeconds * 1000
                            overlayProgressBar?.progress = currentPosition
                        }
                    }
                    
                    @JavascriptInterface
                    fun log(message: String) {
                        Log.d(TAG, "JS: $message")
                    }
                }, "Android")
                
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        Log.d(TAG, "YouTube player loaded")
                    }
                    
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        return true
                    }
                }
                
                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(message: String?, lineNumber: Int, sourceID: String?) {
                        Log.d(TAG, "JS Console: $message")
                    }
                }
            }
            
            val html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                        * { 
                            margin: 0; 
                            padding: 0; 
                            -webkit-user-select: none;
                            -webkit-touch-callout: none;
                            user-select: none;
                        }
                        body { 
                            background-color: #000;
                            overflow: hidden;
                            position: fixed;
                            width: 100%;
                            height: 100%;
                        }
                        #player {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                        }
                        #clickBlocker {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            z-index: 9999;
                            background: transparent;
                        }
                    </style>
                </head>
                <body>
                    <div id="player"></div>
                    <div id="clickBlocker"></div>
                    <script>
                        document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);
                        document.addEventListener('selectstart', function(e) { e.preventDefault(); }, false);
                        document.addEventListener('touchstart', function(e) { e.preventDefault(); }, false);
                        document.addEventListener('touchmove', function(e) { e.preventDefault(); }, false);
                        document.addEventListener('touchend', function(e) { e.preventDefault(); }, false);
                        
                        var tag = document.createElement('script');
                        tag.src = "https://www.youtube.com/iframe_api";
                        var firstScriptTag = document.getElementsByTagName('script')[0];
                        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                        
                        var player;
                        var progressInterval;
                        var lastTime = 0;
                        var forcePlayInterval;
                        var seekCheckInterval;
                        
                        function onYouTubeIframeAPIReady() {
                            player = new YT.Player('player', {
                                videoId: '$videoId',
                                playerVars: {
                                    'autoplay': 1,
                                    'controls': 0,
                                    'disablekb': 1,
                                    'fs': 0,
                                    'modestbranding': 1,
                                    'playsinline': 1,
                                    'rel': 0,
                                    'showinfo': 0,
                                    'iv_load_policy': 3,
                                    'cc_load_policy': 0,
                                    'enablejsapi': 1,
                                    'origin': window.location.origin
                                },
                                events: {
                                    'onReady': onPlayerReady,
                                    'onStateChange': onPlayerStateChange
                                }
                            });
                        }
                        
                        function onPlayerReady(event) {
                            event.target.playVideo();
                            event.target.setVolume(100);
                            
                            progressInterval = setInterval(function() {
                                if (player && player.getCurrentTime) {
                                    var current = Math.floor(player.getCurrentTime());
                                    Android.onVideoProgress(current);
                                }
                            }, 1000);
                            
                            forcePlayInterval = setInterval(function() {
                                if (player && player.getPlayerState) {
                                    var state = player.getPlayerState();
                                    
                                    if (state === YT.PlayerState.PAUSED || 
                                        state === YT.PlayerState.CUED ||
                                        state === -1) {
                                        player.playVideo();
                                    }
                                }
                            }, 300);
                            
                            seekCheckInterval = setInterval(function() {
                                if (player && player.getCurrentTime && player.getPlayerState) {
                                    var state = player.getPlayerState();
                                    
                                    if (state === YT.PlayerState.PLAYING) {
                                        var current = player.getCurrentTime();
                                        
                                        if (Math.abs(current - lastTime) > 1.5) {
                                            player.seekTo(lastTime, true);
                                            player.playVideo();
                                        } else {
                                            lastTime = current;
                                        }
                                    }
                                }
                            }, 200);
                        }
                        
                        function onPlayerStateChange(event) {
                            var state = event.data;
                            
                            if (state === YT.PlayerState.ENDED) {
                                clearInterval(progressInterval);
                                clearInterval(forcePlayInterval);
                                clearInterval(seekCheckInterval);
                                Android.onVideoEnded();
                            }
                            else if (state === YT.PlayerState.PAUSED) {
                                setTimeout(function() {
                                    player.playVideo();
                                }, 100);
                            }
                        }
                        
                        window.addEventListener('blur', function() {
                            if (player && player.getPlayerState() !== YT.PlayerState.ENDED) {
                                player.playVideo();
                            }
                        });
                        
                        window.addEventListener('focus', function() {
                            if (player && player.getPlayerState() !== YT.PlayerState.ENDED) {
                                player.playVideo();
                            }
                        });
                    </script>
                </body>
                </html>
            """.trimIndent()
            
            overlayVideoContainer?.addView(webView)
            webView?.loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "UTF-8", null)
            
            Log.d(TAG, "YouTube player setup complete")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up YouTube player: ${e.message}", e)
            Toast.makeText(this, "Error loading YouTube video", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun setupLocalVideoPlayer() {
        try {
            if (videoPath == null) {
                Log.e(TAG, "Video path is null")
                return
            }
            
            val videoFile = File(videoPath!!)
            if (!videoFile.exists()) {
                Log.e(TAG, "Video file not found at path: $videoPath")
                Toast.makeText(this, "Video file not found", Toast.LENGTH_SHORT).show()
                return
            }
            
            Log.d(TAG, "Setting up local video from: $videoPath")
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            val screenWidth = resources.displayMetrics.widthPixels
val videoHeight16x9 = (screenWidth * 9) / 16

val containerParams = android.widget.LinearLayout.LayoutParams(screenWidth, videoHeight16x9).apply {
    gravity = Gravity.CENTER_HORIZONTAL
    topMargin = 24
}
overlayVideoContainer?.layoutParams = containerParams
            
            overlayVideoContainer?.removeAllViews()
            overlayVideoContainer?.visibility = View.VISIBLE
            
            videoView = VideoView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ).apply {
                    gravity = Gravity.CENTER
                }
                setBackgroundColor(Color.TRANSPARENT)
                visibility = View.VISIBLE
            }
            
            overlayVideoContainer?.addView(videoView)
            
            videoView?.apply {
                val videoUri = Uri.fromFile(videoFile)
                
                setOnPreparedListener { mp ->
                    try {
                        mp.isLooping = false
                        mp.setVolume(1.0f, 1.0f)
                        
                        videoDuration = mp.duration
                        overlayProgressBar?.max = videoDuration
                        
                        overlayVideoContainer?.visibility = View.VISIBLE
                        visibility = View.VISIBLE
                        
                        start()
                        startProgressTracking()
                        
                        Log.d(TAG, "Video playback started")
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in onPrepared: ${e.message}", e)
                    }
                }
                
                setOnCompletionListener {
                    Log.d(TAG, "Video completed!")
                    finishChallenge()
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "Video error: what=$what, extra=$extra")
                    Toast.makeText(
                        this@ChallengeLockActivity,
                        "Error playing video",
                        Toast.LENGTH_SHORT
                    ).show()
                    false
                }
                
                setVideoURI(videoUri)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in setupLocalVideoPlayer: ${e.message}", e)
            Toast.makeText(this, "Error setting up video: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun startProgressTracking() {
        val progressHandler = Handler(Looper.getMainLooper())
        val progressRunnable = object : Runnable {
            override fun run() {
                if (!isDestroying && videoView?.isPlaying == true) {
                    currentPosition = videoView?.currentPosition ?: 0
                    overlayProgressBar?.progress = currentPosition
                    progressHandler.postDelayed(this, 500)
                }
            }
        }
        progressHandler.post(progressRunnable)
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "Challenge:LockScreen"
            )
            wakeLock?.acquire(60 * 60 * 1000L)
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error", e)
        }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_CHALLENGE")
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
    
    private fun finishChallenge() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "CHALLENGE COMPLETED - Finishing Activity")
        Log.d(TAG, "========================================")
        
        isDestroying = true
        isLockActive = false
        hasStoredData = false // Clear static storage
        
        removePersistentOverlay()
        
        try {
            if (isYouTubeVideo) {
                webView?.destroy()
            } else {
                videoView?.stopPlayback()
            }
        } catch (e: Exception) { 
            Log.e(TAG, "Error stopping video: ${e.message}")
        }
        
        try {
            audioManager?.ringerMode = AudioManager.RINGER_MODE_NORMAL
        } catch (e: Exception) { }
        
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) { }
        
        prefs.edit().apply {
            remove(KEY_CHALLENGE_ID)
            remove(KEY_VIDEO_PATH)
            remove(KEY_YOUTUBE_LINK)
            putBoolean(KEY_CHALLENGE_ACTIVE, false)
        }.commit()
        
        try {
            val completionIntent = Intent("com.wingsfly.CHALLENGE_COMPLETED")
            completionIntent.putExtra("challenge_id", challengeId)
            completionIntent.putExtra("completed", true)
            completionIntent.putExtra("video_completed", true)
            completionIntent.putExtra("day_number", dayNumber)
            completionIntent.putExtra("hours_completed", hoursPerDay)
            
            val userPrefs = getSharedPreferences("UserPrefs", Context.MODE_PRIVATE)
            val userId = userPrefs.getString("user_id", "")
            if (!userId.isNullOrEmpty()) {
                completionIntent.putExtra("user_id", userId)
            }
            
            Log.d(TAG, "Sending completion broadcast:")
            Log.d(TAG, "   Challenge ID: $challengeId")
            Log.d(TAG, "   Day Number: $dayNumber")
            Log.d(TAG, "   Hours Completed: $hoursPerDay")
            Log.d(TAG, "   User ID: $userId")
            
            sendBroadcast(completionIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending completion broadcast: ${e.message}")
        }
        
        Log.d(TAG, "Challenge cleanup complete")
        finish()
    }
    
    override fun onBackPressed() {
        // Block back button
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent")
        if (isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
            }, 100)
        }
    }
    
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ onResume")
        if (isYouTubeVideo) {
            webView?.onResume()
        }
        if (isOverlayCreated && persistentOverlay != null) {
            Handler(Looper.getMainLooper()).postDelayed({
                persistentOverlay?.bringToFront()
                persistentOverlay?.invalidate()
            }, 100)
        }
    }
    
    override fun onPause() {
        super.onPause()
        if (isYouTubeVideo) {
            webView?.onPause()
        }
    }
    
    override fun onStop() {
        super.onStop()
        
        if (!isFinishing && !isDestroyed && isLockActive) {
            // Activity moved to background but still active
            Log.d(TAG, "Activity stopped but still locked")
        }
    }
    
    override fun onDestroy() {
        Log.d(TAG, "💀 onDestroy called")
        
        if (isYouTubeVideo) {
            webView?.destroy()
        }
        
        removePersistentOverlay()
        
        try {
            unregisterReceiver(stopReceiver)
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) { }
        
        wakeLock?.release()
        
        super.onDestroy()
        
        Log.d(TAG, "Challenge lock activity destroyed")
    }
}