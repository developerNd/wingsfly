package com.wingsfly

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.AudioAttributes
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
import android.widget.FrameLayout
import android.widget.MediaController
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.widget.VideoView

class UsageLimitVideoLockActivity : Activity() {
    
    companion object {
        private const val TAG = "UsageVideoLock"
        var isLockActive = false
        
        // Static storage for media URLs to survive recreation
        private var storedVideoUrl: String? = null
        private var storedPackageName: String? = null
        private var storedAppName: String? = null
        private var hasStoredData = false
    }
    
    private var packageName: String? = null
    private var appName: String? = null
    private var videoUrl: String? = null
    
    // Video players
    private var videoView: VideoView? = null
    private var webView: WebView? = null
    
    // Persistent overlay
    private var persistentOverlay: View? = null
    private var windowManager: WindowManager? = null
    private var isOverlayCreated = false
    private var isHandlingScreenEvent = false
    
    // UI references
    private var overlayTitleTextView: TextView? = null
    private var overlayProgressBar: ProgressBar? = null
    private var videoContainer: FrameLayout? = null
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    
    private var isDestroying = false
    private var videoDuration = 0
    private var currentPosition = 0
    private var isYouTubeVideo = false
    
    // Relaunch mechanism
    private var relaunchHandler: Handler? = null
    private var relaunchRunnable: Runnable? = null
    
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finishVideoLock()
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
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "Usage Limit Video Lock Activity Created")
        Log.d(TAG, "========================================")
        
        isDestroying = false
        
        // Load from static storage if available (for recreation)
        if (hasStoredData) {
            packageName = storedPackageName
            appName = storedAppName
            videoUrl = storedVideoUrl
            Log.d(TAG, "📦 Loaded from static storage (activity recreated)")
        } else {
            // First creation - get from intent
            packageName = intent.getStringExtra("package_name")
            appName = intent.getStringExtra("app_name")
            videoUrl = intent.getStringExtra("video_url")
            
            // Store for future recreations
            storedPackageName = packageName
            storedAppName = appName
            storedVideoUrl = videoUrl
            hasStoredData = true
            Log.d(TAG, "💾 Saved to static storage (first creation)")
        }
        
        Log.d(TAG, "Package: $packageName")
        Log.d(TAG, "App Name: $appName")
        Log.d(TAG, "Video URL: $videoUrl")
        
        // Determine if it's a YouTube video or direct video URL
        isYouTubeVideo = videoUrl?.contains("youtube.com") == true || videoUrl?.contains("youtu.be") == true
        
        // Validate video source
        if (videoUrl.isNullOrEmpty()) {
            Log.e(TAG, "No video URL provided")
            Toast.makeText(this, "No video configured", Toast.LENGTH_SHORT).show()
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
        startAggressiveMonitoring()
        
        isLockActive = true
        
        Log.d(TAG, "Usage limit video lock active")
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
                wakeLock?.acquire(10 * 60 * 1000L)
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
            persistentOverlay = inflater.inflate(R.layout.activity_usage_video_lock, null)
            
            overlayTitleTextView = persistentOverlay?.findViewById(R.id.usageVideoTitle)
            overlayProgressBar = persistentOverlay?.findViewById(R.id.videoProgress)
            videoContainer = persistentOverlay?.findViewById(R.id.videoContainer)
            
            overlayTitleTextView?.text = "Usage Limit Reached\n$appName"
            
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
        if (videoUrl == null) {
            Log.e(TAG, "Video URL is null")
            return
        }
        
        try {
            if (isYouTubeVideo) {
                setupYouTubePlayer()
            } else {
                setupVideoPlayerFromUrl()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up video player: ${e.message}", e)
        }
    }
    
    private fun setupVideoPlayerFromUrl() {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "🎥 Setting up video from URL: $videoUrl")
            Log.d(TAG, "========================================")
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val videoHeight16x9 = (screenWidth * 9) / 16
            
            videoView = VideoView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    videoHeight16x9
                ).apply {
                    gravity = Gravity.CENTER
                }
                setBackgroundColor(Color.TRANSPARENT)
                visibility = View.VISIBLE
            }
            
            videoContainer?.removeAllViews()
            videoContainer?.addView(videoView)
            videoContainer?.visibility = View.VISIBLE
            
            videoView?.apply {
                val uri = Uri.parse(videoUrl)
                
                setOnPreparedListener { mp ->
                    try {
                        mp.isLooping = false
                        mp.setVolume(1.0f, 1.0f)
                        
                        mp.setAudioAttributes(
                            AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                        )
                        
                        videoDuration = mp.duration
                        overlayProgressBar?.max = videoDuration
                        
                        start()
                        startProgressTracking()
                        
                        Log.d(TAG, "▶️ Video playback started")
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in onPrepared: ${e.message}", e)
                    }
                }
                
                setOnCompletionListener {
                    Log.d(TAG, "✅ Video completed!")
                    finishVideoLock()
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "❌ Video error: what=$what, extra=$extra")
                    Toast.makeText(this@UsageLimitVideoLockActivity, 
                        "Error playing video", Toast.LENGTH_SHORT).show()
                    
                    Handler(Looper.getMainLooper()).postDelayed({
                        finishVideoLock()
                    }, 3000)
                    true
                }
                
                setVideoURI(uri)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in setupVideoPlayerFromUrl: ${e.message}", e)
            Toast.makeText(this, "Error loading video", Toast.LENGTH_SHORT).show()
            
            Handler(Looper.getMainLooper()).postDelayed({
                finishVideoLock()
            }, 3000)
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
            val videoId = extractYouTubeVideoId(videoUrl!!)
            if (videoId == null) {
                Log.e(TAG, "Could not extract video ID")
                Toast.makeText(this, "Invalid YouTube link", Toast.LENGTH_SHORT).show()
                return
            }
            
            Log.d(TAG, "========================================")
            Log.d(TAG, "🎥 Setting up YouTube video: $videoId")
            Log.d(TAG, "========================================")
            
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val videoHeight16x9 = (screenWidth * 9) / 16
            
            webView = WebView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    videoHeight16x9
                )
                setBackgroundColor(Color.TRANSPARENT)
                
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
                            Log.d(TAG, "✅ Video completed!")
                            finishVideoLock()
                        }
                    }
                    
                    @JavascriptInterface
                    fun onVideoDuration(durationSeconds: Int) {
                        runOnUiThread {
                            videoDuration = durationSeconds * 1000
                            overlayProgressBar?.max = videoDuration
                        }
                    }
                    
                    @JavascriptInterface
                    fun onVideoProgress(currentSeconds: Int) {
                        runOnUiThread {
                            currentPosition = currentSeconds * 1000
                            overlayProgressBar?.progress = currentPosition
                        }
                    }
                }, "Android")
                
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        return true
                    }
                }
                
                webChromeClient = object : WebChromeClient() {}
            }
            
            val html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                        * { margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }
                        body { background-color: #000; overflow: hidden; position: fixed; width: 100%; height: 100%; }
                        #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
                        #clickBlocker { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; }
                    </style>
                </head>
                <body>
                    <div id="player"></div>
                    <div id="clickBlocker"></div>
                    <script>
                        document.addEventListener('contextmenu', e => e.preventDefault());
                        document.addEventListener('selectstart', e => e.preventDefault());
                        document.addEventListener('touchstart', e => e.preventDefault());
                        
                        var tag = document.createElement('script');
                        tag.src = "https://www.youtube.com/iframe_api";
                        document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);
                        
                        var player;
                        var progressInterval;
                        var lastTime = 0;
                        
                        function onYouTubeIframeAPIReady() {
                            player = new YT.Player('player', {
                                videoId: '$videoId',
                                playerVars: {
                                    'autoplay': 1, 'controls': 0, 'disablekb': 1, 'fs': 0,
                                    'modestbranding': 1, 'playsinline': 1, 'rel': 0
                                },
                                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
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
                            
                            setInterval(function() {
                                if (player && player.getPlayerState) {
                                    var state = player.getPlayerState();
                                    if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED || state === -1) {
                                        player.playVideo();
                                    }
                                }
                            }, 300);
                            
                            setInterval(function() {
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
                            if (event.data === YT.PlayerState.ENDED) {
                                clearInterval(progressInterval);
                                Android.onVideoEnded();
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                setTimeout(() => player.playVideo(), 100);
                            }
                        }
                    </script>
                </body>
                </html>
            """.trimIndent()
            
            videoContainer?.removeAllViews()
            videoContainer?.addView(webView)
            videoContainer?.visibility = View.VISIBLE
            
            webView?.loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "UTF-8", null)
            
            Log.d(TAG, "✅ YouTube player setup complete")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up YouTube player: ${e.message}", e)
            Toast.makeText(this, "Error loading YouTube video", Toast.LENGTH_SHORT).show()
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
    
    private fun startAggressiveMonitoring() {
        relaunchRunnable?.let {
            relaunchHandler?.removeCallbacks(it)
        }
        
        relaunchHandler = Handler(Looper.getMainLooper())
        relaunchRunnable = object : Runnable {
            override fun run() {
                if (isLockActive && !isDestroying) {
                    bringToFront()
                    relaunchHandler?.postDelayed(this, 2000)
                }
            }
        }
        relaunchHandler?.post(relaunchRunnable!!)
    }
    
    private fun bringToFront() {
        try {
            if (isOverlayCreated && persistentOverlay != null) {
                persistentOverlay?.bringToFront()
                persistentOverlay?.invalidate()
            } else {
                // Recreate overlay if it was removed
                Handler(Looper.getMainLooper()).post {
                    createPersistentLockOverlay()
                }
            }
            
            // Also bring activity to front
            val intent = Intent(this, UsageLimitVideoLockActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            intent.putExtra("package_name", packageName)
            intent.putExtra("app_name", appName)
            intent.putExtra("video_url", videoUrl)
            startActivity(intent)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error bringing to front: ${e.message}")
        }
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "UsageVideo:LockScreen"
            )
            wakeLock?.acquire(60 * 60 * 1000L)
        } catch (e: Exception) {
            Log.e(TAG, "Wake lock error: ${e.message}")
        }
    }
    
    private fun registerReceivers() {
        val stopFilter = IntentFilter("com.wingsfly.STOP_USAGE_VIDEO")
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
            Log.e(TAG, "Error removing overlay: ${e.message}")
            isOverlayCreated = false
        }
    }
    
    private fun finishVideoLock() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "🏁 VIDEO COMPLETED - Finishing Activity")
        Log.d(TAG, "========================================")
        
        isDestroying = true
        isLockActive = false
        hasStoredData = false // Clear static storage
        
        relaunchRunnable?.let {
            relaunchHandler?.removeCallbacks(it)
        }
        
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
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) { }
        
        try {
            unregisterReceiver(stopReceiver)
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) { }
        
        Log.d(TAG, "Video lock cleanup complete")
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
        if (isLockActive && !isDestroying) {
            bringToFront()
        }
    }
    
    override fun onStop() {
        super.onStop()
        
        if (isFinishing || isDestroyed) {
            removePersistentOverlay()
        } else if (isLockActive && !isDestroying) {
            bringToFront()
        }
    }
    
    override fun onDestroy() {
        Log.d(TAG, "💀 onDestroy called")
        
        if (isYouTubeVideo) {
            webView?.destroy()
        }
        
        removePersistentOverlay()
        
        super.onDestroy()
        
        try {
            unregisterReceiver(stopReceiver)
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) { }
        
        Log.d(TAG, "Usage video lock activity destroyed")
    }
    
    override fun finish() {
        Log.d(TAG, "finish() called")
        
        if (!isDestroying) {
            removePersistentOverlay()
        }
        
        super.finish()
    }
}