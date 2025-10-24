package com.wingsfly

import android.app.Activity
import android.app.ActivityManager
import android.app.KeyguardManager
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
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.VideoView
import android.widget.Button
import android.widget.Toast
import java.io.File
import java.lang.reflect.Method
import java.text.SimpleDateFormat
import java.util.*

class ChallengeLockActivity : Activity() {
    
    companion object {
        private const val TAG = "ChallengeLock"
        var isLockActive = false
        
        private const val PREFS_NAME = "ChallengePrefs"
        private const val KEY_CHALLENGE_ID = "challenge_id"
        private const val KEY_VIDEO_PATH = "video_path"
        private const val KEY_YOUTUBE_LINK = "youtube_link"
        private const val KEY_CHALLENGE_ACTIVE = "challenge_active"
        
        private const val BOTTOM_GESTURE_BLOCK_HEIGHT = 200
    }
    
    private var challengeId: String? = null
    private var videoPath: String? = null
    private var youtubeLink: String? = null
    private var dayNumber: Int = 1
    private var hoursPerDay: Double = 1.0
    
    // Video players
    private var videoView: VideoView? = null
    private var webView: WebView? = null
    
    private var videoContainer: FrameLayout? = null
    private var progressBar: ProgressBar? = null
    private var titleTextView: TextView? = null
    private var completionButton: Button? = null
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    
    private var statusBarBlockViews = mutableListOf<View>()
    private var bottomBlockOverlay: View? = null
    private var relaunchHandler: Handler? = null
    private var relaunchRunnable: Runnable? = null
    private var systemUIHandler: Handler? = null
    private var systemUIRunnable: Runnable? = null
    
    private var isDestroying = false
    private var videoDuration = 0
    private var currentPosition = 0
    private var isYouTubeVideo = false
    private var isVideoCompleted = false
    
    private lateinit var prefs: SharedPreferences
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finishChallenge()
        }
    }
    
    private val homeKeyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (isLockActive) {
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
        Log.d(TAG, "Challenge Lock Activity Created")
        Log.d(TAG, "========================================")
        
        isDestroying = false
        
        // Get challenge data from intent
        challengeId = intent.getStringExtra("challenge_id")
        videoPath = intent.getStringExtra("video_path")
        youtubeLink = intent.getStringExtra("youtube_link")
        val challengeName = intent.getStringExtra("challenge_name")
        dayNumber = intent.getIntExtra("day_number", 1) 
        hoursPerDay = intent.getDoubleExtra("hours_per_day", 1.0)
        
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
        
        setupKioskMode()
        setupFullScreenLockMode()
        setContentView(R.layout.activity_challenge_lock)
        initializeViews(challengeName)
        
        // Setup appropriate video player
        if (isYouTubeVideo) {
            setupYouTubePlayer()
        } else {
            setupVideoPlayer()
        }
        
        registerReceivers()
        createMaximumStatusBarBlock()
        startAggressiveMonitoring()
        
        isLockActive = true
        
        // Save challenge state
        prefs.edit().apply {
            putString(KEY_CHALLENGE_ID, challengeId)
            putString(KEY_VIDEO_PATH, videoPath)
            putString(KEY_YOUTUBE_LINK, youtubeLink)
            putBoolean(KEY_CHALLENGE_ACTIVE, true)
        }.commit()
        
        Log.d(TAG, "Challenge lock mode active")
    }
    
    private fun initializeViews(challengeName: String?) {
        titleTextView = findViewById(R.id.challengeTitle)
        progressBar = findViewById(R.id.videoProgress)
        completionButton = findViewById(R.id.completionButton)
        videoContainer = findViewById(R.id.videoContainer)
        
        titleTextView?.text = challengeName ?: "Video Challenge"
        completionButton?.visibility = View.GONE
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
            
            // Get container dimensions
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val videoHeight16x9 = (screenWidth * 9) / 16
            
            // Set container to 16:9
            val containerParams = videoContainer?.layoutParams as FrameLayout.LayoutParams
            containerParams.width = screenWidth
            containerParams.height = videoHeight16x9
            containerParams.gravity = Gravity.CENTER
            videoContainer?.layoutParams = containerParams
            
            videoContainer?.removeAllViews()
            videoContainer?.visibility = View.VISIBLE
            
            // Create WebView
            webView = WebView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                setBackgroundColor(Color.BLACK)
                
                // Make WebView completely non-interactive
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
                
                // Block all touch events on WebView
                setOnTouchListener { _, _ -> true }
                
                // Disable context menu (long press)
                setOnLongClickListener { true }
                
                // Add JavaScript interface
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
                            progressBar?.max = videoDuration
                            Log.d(TAG, "Video duration: ${durationSeconds}s")
                        }
                    }
                    
                    @JavascriptInterface
                    fun onVideoProgress(currentSeconds: Int) {
                        runOnUiThread {
                            currentPosition = currentSeconds * 1000
                            progressBar?.progress = currentPosition
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
            
            // HTML with YouTube IFrame API - FULLY LOCKED MODE
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
            
            videoContainer?.addView(webView)
            webView?.loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "UTF-8", null)
            
            Log.d(TAG, "YouTube player setup complete")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up YouTube player: ${e.message}", e)
            Toast.makeText(this, "Error loading YouTube video", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun setupVideoPlayer() {
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
            
            // Get container
            videoContainer = findViewById(R.id.videoContainer)
            if (videoContainer == null) {
                Log.e(TAG, "Video container not found in layout")
                return
            }
            
            // Calculate 16:9 dimensions
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val videoHeight16x9 = (screenWidth * 9) / 16
            
            // Set container to 16:9
            val containerParams = videoContainer?.layoutParams as FrameLayout.LayoutParams
            containerParams.width = screenWidth
            containerParams.height = videoHeight16x9
            containerParams.gravity = Gravity.CENTER
            videoContainer?.layoutParams = containerParams
            
            videoContainer?.removeAllViews()
            videoContainer?.visibility = View.VISIBLE
            
            // Create VideoView
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
            
            videoContainer?.addView(videoView)
            
            videoView?.apply {
                val videoUri = Uri.fromFile(videoFile)
                
                setOnPreparedListener { mp ->
                    try {
                        mp.isLooping = false
                        mp.setVolume(1.0f, 1.0f)
                        
                        videoDuration = mp.duration
                        progressBar?.max = videoDuration
                        
                        videoContainer?.visibility = View.VISIBLE
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
            Log.e(TAG, "Error in setupVideoPlayer: ${e.message}", e)
            Toast.makeText(this, "Error setting up video: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun startProgressTracking() {
        val progressHandler = Handler(Looper.getMainLooper())
        val progressRunnable = object : Runnable {
            override fun run() {
                if (!isDestroying && videoView?.isPlaying == true) {
                    currentPosition = videoView?.currentPosition ?: 0
                    progressBar?.progress = currentPosition
                    progressHandler.postDelayed(this, 500)
                }
            }
        }
        progressHandler.post(progressRunnable)
    }
    
    private fun setupKioskMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    
                    if (activityManager.lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
                        startLockTask()
                        Log.d(TAG, "Kiosk mode activated")
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                stopLockTask()
                Log.d(TAG, "Kiosk mode exited")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exit kiosk error: ${e.message}")
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
        
        hideSystemUIMaximum()
        startContinuousSystemUIHiding()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.statusBarColor = Color.BLACK
            window.navigationBarColor = Color.BLACK
            
            window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
                if (isLockActive && !isDestroying) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        hideSystemUIMaximum()
                    }, 100)
                    collapseStatusBar()
                }
            }
        }
        
        Handler(Looper.getMainLooper()).postDelayed({
            if (isLockActive && !isDestroying) {
                createBottomNavigationBlocker()
            }
        }, 500)
        
        acquireWakeLock()
    }
    
    private fun startContinuousSystemUIHiding() {
        systemUIRunnable?.let { 
            systemUIHandler?.removeCallbacks(it)
        }
        
        systemUIHandler = Handler(Looper.getMainLooper())
        systemUIRunnable = object : Runnable {
            override fun run() {
                if (isLockActive && !isDestroying) {
                    hideSystemUIMaximum()
                    systemUIHandler?.postDelayed(this, 300)
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
                        android.view.WindowInsets.Type.systemBars()
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
    
    private fun createBottomNavigationBlocker() {
        try {
            if (isDestroying || !isLockActive || bottomBlockOverlay != null) return
            if (!Settings.canDrawOverlays(this)) return
            
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return
            
            bottomBlockOverlay = FrameLayout(this).apply {
                setBackgroundColor(Color.TRANSPARENT)
                isClickable = true
                isFocusable = false
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
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT
            )
            
            layoutParams.gravity = Gravity.BOTTOM
            
            bottomBlockOverlay?.setOnTouchListener { view, event ->
                if (isLockActive && !isDestroying) {
                    view.performClick()
                    return@setOnTouchListener true
                }
                false
            }
            
            windowManager.addView(bottomBlockOverlay, layoutParams)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error creating bottom blocker: ${e.message}")
        }
    }
    
    private fun removeBottomNavigationBlocker() {
        try {
            bottomBlockOverlay?.let {
                val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
                windowManager?.removeView(it)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing bottom blocker: ${e.message}")
        } finally {
            bottomBlockOverlay = null
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
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                    PixelFormat.TRANSLUCENT
                )
                
                layoutParams.gravity = Gravity.TOP or Gravity.START
                layoutParams.x = 0
                layoutParams.y = yOffset
                
                blockView.setOnTouchListener { _, _ ->
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
        relaunchRunnable?.let {
            relaunchHandler?.removeCallbacks(it)
        }
        
        relaunchHandler = Handler(Looper.getMainLooper())
        relaunchRunnable = object : Runnable {
            override fun run() {
                if (isLockActive && !isDestroying) {
                    checkAndBringToFront()
                    relaunchHandler?.postDelayed(this, 2000)
                }
            }
        }
        relaunchHandler?.post(relaunchRunnable!!)
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
            
            val intent = Intent(this, ChallengeLockActivity::class.java)
            intent.addFlags(
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or 
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            intent.putExtra("challenge_id", challengeId)
            intent.putExtra("video_path", videoPath)
            intent.putExtra("youtube_link", youtubeLink)
            intent.putExtra("challenge_name", titleTextView?.text.toString())
            startActivity(intent)
            
        } catch (e: Exception) { }
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
        } catch (e: Exception) { }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_CHALLENGE")
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
    }
    
    private fun finishChallenge() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "CHALLENGE COMPLETED - Finishing Activity")
        Log.d(TAG, "========================================")
        
        isDestroying = true
        isLockActive = false
        
        systemUIRunnable?.let {
            systemUIHandler?.removeCallbacks(it)
        }
        relaunchRunnable?.let {
            relaunchHandler?.removeCallbacks(it)
        }
        
        removeBottomNavigationBlocker()
        exitKioskMode()
        
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
        
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            statusBarBlockViews.forEach { view ->
                try { windowManager.removeView(view) } catch (e: Exception) { }
            }
            statusBarBlockViews.clear()
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
            completionIntent.putExtra("completed", true)  // Video completed = true
            completionIntent.putExtra("video_completed", true)  // Also explicitly mark video as completed
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
    
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (!isLockActive || isDestroying) {
            return super.onKeyDown(keyCode, event)
        }
        
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_APP_SWITCH,
            KeyEvent.KEYCODE_MENU -> true
            else -> super.onKeyDown(keyCode, event)
        }
    }
    
    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        if (!isLockActive || isDestroying) {
            return super.dispatchTouchEvent(ev)
        }
        
        ev?.let { event ->
            val screenHeight = resources.displayMetrics.heightPixels
            
            if (event.y < screenHeight * 0.15f) {
                collapseStatusBar()
                return true
            }
            
            if (event.y > screenHeight * 0.80f) {
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
        
        if (hasFocus && isLockActive) {
            hideSystemUIMaximum()
        }
    }
    
    override fun onPause() {
        super.onPause()
        if (isYouTubeVideo) {
            webView?.onPause()
        }
        if (isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onResume() {
        super.onResume()
        if (isYouTubeVideo) {
            webView?.onResume()
        }
    }
    
    override fun onStop() {
        super.onStop()
        
        if (isFinishing || isDestroyed) {
            removeBottomNavigationBlocker()
            
            try {
                val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
                statusBarBlockViews.forEach { view ->
                    try {
                        windowManager?.removeView(view)
                    } catch (e: Exception) { }
                }
                statusBarBlockViews.clear()
            } catch (e: Exception) { }
        } else if (isLockActive) {
            collapseStatusBar()
            bringToFront()
        }
    }
    
    override fun onDestroy() {
        Log.d(TAG, "onDestroy called")
        
        systemUIRunnable?.let {
            systemUIHandler?.removeCallbacks(it)
        }
        
        if (isYouTubeVideo) {
            webView?.destroy()
        }
        
        removeBottomNavigationBlocker()
        
        super.onDestroy()
        
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            if (windowManager != null && statusBarBlockViews.isNotEmpty()) {
                statusBarBlockViews.forEach { view ->
                    try {
                        windowManager.removeView(view)
                    } catch (e: Exception) { }
                }
                statusBarBlockViews.clear()
            }
        } catch (e: Exception) { }
        
        try {
            unregisterReceiver(stopReceiver)
            unregisterReceiver(homeKeyReceiver)
        } catch (e: Exception) { }
        
        Log.d(TAG, "Challenge lock activity destroyed")
    }
    
    override fun finish() {
        Log.d(TAG, "finish() called")
        
        if (!isDestroying) {
            removeBottomNavigationBlocker()
        }
        
        super.finish()
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "onNewIntent - challenge lock still active")
    }
}