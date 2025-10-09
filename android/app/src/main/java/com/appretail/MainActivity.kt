package com.wingsfly

import android.Manifest
import android.app.AppOpsManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.widget.Toast
import android.app.ActivityManager
import android.content.ComponentName
import android.content.ServiceConnection
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.*
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

    init {
        Log.e("MainActivity", "===========================================")
        Log.e("MainActivity", "MAINACTIVITY CONSTRUCTOR - UPDATED VERSION")
        Log.e("MainActivity", "===========================================")
    }
    
    private val TAG = "MainActivity"
    private val USAGE_ACCESS_REQUEST_CODE = 1001
    private val OVERLAY_PERMISSION_REQUEST_CODE = 1002
    private val REQUEST_CODE_DEVICE_CREDENTIALS = 9002
    
    private var appLockService: AppLockService? = null
    private var serviceBound = false
    
    // Store pending intent data
    private var pendingIntentData: Intent? = null
    private var hasProcessedIntent = false
    
    // Flag to track if we're waiting for password authentication
    private var waitingForPasswordAuth = false
    private var authenticationAttempted = false
    private var needsAuthentication = false
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            Log.d(TAG, "Service connected")
            val binder = service as AppLockService.ServiceBinder
            appLockService = binder.asService()
            serviceBound = true
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            Log.d(TAG, "Service disconnected")
            appLockService = null
            serviceBound = false
        }
    }

    override fun getMainComponentName(): String = "AppRetail"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onCreate")
        Log.d(TAG, "========================================")
        Log.d(TAG, "Intent: $intent")
        Log.d(TAG, "Intent action: ${intent?.action}")
        Log.d(TAG, "from_detox_end: ${intent?.getBooleanExtra("from_detox_end", false)}")
        Log.d(TAG, "========================================")
        
        // Check if coming from detox end
        if (intent?.getBooleanExtra("from_detox_end", false) == true) {
            Log.d(TAG, "🔐 Coming from detox end - will show password in onResume")
            // Just mark that we need authentication, don't launch yet
            needsAuthentication = true
            waitingForPasswordAuth = false
            authenticationAttempted = false
        } else {
            Log.d(TAG, "Normal flow - no authentication needed")
            needsAuthentication = false
            
            // Normal flow
            ensureServiceIsRunning()
            
            // Store the intent for later processing
            if (shouldProcessIntent(intent)) {
                Log.d(TAG, "Storing intent for later processing")
                pendingIntentData = intent
                hasProcessedIntent = false
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onNewIntent")
        Log.d(TAG, "from_detox_end: ${intent?.getBooleanExtra("from_detox_end", false)}")
        Log.d(TAG, "========================================")
        
        // Check if coming from detox end
        if (intent?.getBooleanExtra("from_detox_end", false) == true && !authenticationAttempted) {
            Log.d(TAG, "🔐 Coming from detox end - will show password in onResume")
            needsAuthentication = true
            waitingForPasswordAuth = false
            authenticationAttempted = false
        } else {
            // Store the intent for later processing
            if (shouldProcessIntent(intent)) {
                Log.d(TAG, "Storing new intent for processing")
                pendingIntentData = intent
                hasProcessedIntent = false
            }
        }
    }
    
    private fun handleDetoxEndWithPassword() {
        try {
            // Prevent multiple authentication attempts
            if (authenticationAttempted) {
                Log.d(TAG, "⚠️ Authentication already attempted, skipping")
                return
            }
            
            authenticationAttempted = true
            
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // Check if device has a secure lock screen
                if (keyguardManager.isKeyguardSecure) {
                    Log.d(TAG, "📱 Device has secure lock - showing password screen")
                    
                    // Mark that we're waiting for password
                    waitingForPasswordAuth = true
                    
                    // Create intent to show device credentials (PASSWORD ONLY)
                    val authIntent = keyguardManager.createConfirmDeviceCredentialIntent(
                        "Authentication Required",
                        "Enter your device password to access the app"
                    )
                    
                    if (authIntent != null) {
                        try {
                            startActivityForResult(authIntent, REQUEST_CODE_DEVICE_CREDENTIALS)
                            Log.d(TAG, "✅ Password screen launched")
                        } catch (e: Exception) {
                            Log.e(TAG, "Error launching password screen: ${e.message}", e)
                            handleAuthenticationFailure()
                        }
                    } else {
                        Log.w(TAG, "⚠️ Could not create password screen intent")
                        handleAuthenticationFailure()
                    }
                } else {
                    Log.w(TAG, "⚠️ Device has no secure lock - continuing normally")
                    continueAfterPasswordAuth()
                }
            } else {
                Log.w(TAG, "⚠️ Android version < Lollipop - continuing normally")
                continueAfterPasswordAuth()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error showing password screen: ${e.message}", e)
            handleAuthenticationFailure()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            REQUEST_CODE_DEVICE_CREDENTIALS -> {
                Log.d(TAG, "========================================")
                Log.d(TAG, "🔐 PASSWORD AUTHENTICATION RESULT")
                Log.d(TAG, "Result code: $resultCode")
                Log.d(TAG, "RESULT_OK = ${RESULT_OK}")
                Log.d(TAG, "RESULT_CANCELED = ${RESULT_CANCELED}")
                Log.d(TAG, "========================================")
                
                // Clear flags immediately
                waitingForPasswordAuth = false
                needsAuthentication = false
                
                // Immediately finish the authentication activity to close it
                try {
                    finishActivity(REQUEST_CODE_DEVICE_CREDENTIALS)
                    Log.d(TAG, "🔓 Authentication activity finish requested")
                } catch (e: Exception) {
                    Log.e(TAG, "Error finishing auth activity: ${e.message}", e)
                }
                
                when (resultCode) {
                    RESULT_OK -> {
                        // Password correct - continue to app
                        Log.d(TAG, "✅ Authentication successful")
                        
                        // Dismiss any lingering authentication screens
                        Handler(Looper.getMainLooper()).postDelayed({
                            dismissAuthenticationScreen()
                            Toast.makeText(this, "Authentication successful", Toast.LENGTH_SHORT).show()
                        }, 100)
                        
                        continueAfterPasswordAuth()
                    }
                    
                    RESULT_CANCELED -> {
                        // User cancelled - continue normally but log it
                        Log.d(TAG, "⚠️ Authentication cancelled by user")
                        
                        // Dismiss authentication screen
                        Handler(Looper.getMainLooper()).postDelayed({
                            dismissAuthenticationScreen()
                            Toast.makeText(this, "Authentication cancelled", Toast.LENGTH_SHORT).show()
                        }, 100)
                        
                        // Reset flags
                        authenticationAttempted = false
                        continueAfterPasswordAuth()
                    }
                    
                    else -> {
                        // Authentication failed - continue normally but log it
                        Log.d(TAG, "⚠️ Authentication failed (code: $resultCode)")
                        
                        // Dismiss authentication screen
                        Handler(Looper.getMainLooper()).postDelayed({
                            dismissAuthenticationScreen()
                            Toast.makeText(this, "Authentication failed", Toast.LENGTH_SHORT).show()
                        }, 100)
                        
                        // Reset flags
                        authenticationAttempted = false
                        continueAfterPasswordAuth()
                    }
                }
            }
            
            USAGE_ACCESS_REQUEST_CODE -> {
                if (hasUsageAccessPermission()) {
                    Log.d(TAG, "Usage access permission granted")
                    checkAndRequestPermissions()
                } else {
                    Toast.makeText(this, "Usage Access permission is required", Toast.LENGTH_LONG).show()
                    GlobalScope.launch {
                        delay(2000)
                        runOnUiThread {
                            checkAndRequestPermissions()
                        }
                    }
                }
            }
            
            OVERLAY_PERMISSION_REQUEST_CODE -> {
                if (hasOverlayPermission()) {
                    Log.d(TAG, "Overlay permission granted")
                    ensureServiceIsRunning()
                } else {
                    Toast.makeText(this, "Overlay permission is required", Toast.LENGTH_LONG).show()
                    GlobalScope.launch {
                        delay(2000)
                        runOnUiThread {
                            checkAndRequestPermissions()
                        }
                    }
                }
            }
        }
    }
    
    private fun dismissAuthenticationScreen() {
        try {
            Log.d(TAG, "🔓 Attempting to dismiss authentication screen")
            
            // Method 1: Bring our activity to front
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            activityManager.moveTaskToFront(taskId, 0)
            
            // Method 2: Request focus
            window.decorView.post {
                window.decorView.requestFocus()
                window.decorView.invalidate()
            }
            
            // Method 3: For Android O and above, dismiss keyguard
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                keyguardManager.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                    override fun onDismissSucceeded() {
                        Log.d(TAG, "✅ Keyguard dismissed successfully")
                        // Ensure our activity is visible
                        runOnUiThread {
                            window.decorView.visibility = android.view.View.VISIBLE
                            window.decorView.bringToFront()
                            window.decorView.requestFocus()
                        }
                    }
                    
                    override fun onDismissError() {
                        Log.e(TAG, "❌ Keyguard dismiss error")
                    }
                    
                    override fun onDismissCancelled() {
                        Log.d(TAG, "⚠️ Keyguard dismiss cancelled")
                    }
                })
            }
            
            // Method 4: Clear any overlay flags
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_VISIBLE
                    window.decorView.visibility = android.view.View.VISIBLE
                    window.decorView.bringToFront()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in delayed dismiss: ${e.message}", e)
                }
            }, 200)
            
            Log.d(TAG, "✅ Authentication screen dismiss attempted")
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing authentication screen: ${e.message}", e)
        }
    }
    
    private fun continueAfterPasswordAuth() {
        Log.d(TAG, "========================================")
        Log.d(TAG, "✅ CONTINUING AFTER PASSWORD AUTH")
        Log.d(TAG, "========================================")
        
        // Clear all authentication flags
        needsAuthentication = false
        waitingForPasswordAuth = false
        
        // Clear the detox end flag from intent
        intent?.removeExtra("from_detox_end")
        
        // Ensure we're visible and focused
        runOnUiThread {
            window.decorView.visibility = android.view.View.VISIBLE
            window.decorView.requestFocus()
            window.decorView.bringToFront()
        }
        
        // Continue with normal flow
        ensureServiceIsRunning()
        
        // Process any pending intents
        if (shouldProcessIntent(intent)) {
            pendingIntentData = intent
            hasProcessedIntent = false
        }
        
        // Process pending intents with a delay to ensure React Native is ready
        Handler(Looper.getMainLooper()).postDelayed({
            processPendingIntent()
        }, 1000)
        
        Log.d(TAG, "✅ Ready for normal app usage")
    }
    
    private fun handleAuthenticationFailure() {
        // Just continue normally
        Log.d(TAG, "⚠️ Authentication failure - continuing to app")
        waitingForPasswordAuth = false
        authenticationAttempted = false
        needsAuthentication = false
        continueAfterPasswordAuth()
    }
    
    override fun onResume() {
        super.onResume()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "MainActivity onResume")
        Log.d(TAG, "Needs authentication: $needsAuthentication")
        Log.d(TAG, "Waiting for password: $waitingForPasswordAuth")
        Log.d(TAG, "Authentication attempted: $authenticationAttempted")
        Log.d(TAG, "========================================")
        
        // Handle authentication if needed and not already attempted
        if (needsAuthentication && !authenticationAttempted && !waitingForPasswordAuth) {
            Log.d(TAG, "🔐 Launching authentication from onResume")
            handleDetoxEndWithPassword()
            return // Exit early, don't do normal resume flow yet
        }
        
        // Don't do anything if waiting for password authentication
        if (waitingForPasswordAuth) {
            Log.d(TAG, "⏸️ Waiting for password - skipping normal resume flow")
            return
        }
        
        // If we just finished authentication, make sure we're visible
        if (!needsAuthentication && !waitingForPasswordAuth) {
            Log.d(TAG, "✅ Ensuring activity is visible and focused")
            window.decorView.post {
                window.decorView.visibility = android.view.View.VISIBLE
                window.decorView.requestFocus()
                window.decorView.bringToFront()
            }
        }
        
        // Normal resume flow
        Log.d(TAG, "▶️ Normal resume flow")
        ensureServiceIsRunning()
        
        if (!serviceBound) {
            bindToService()
        }
        
        // Check current intent
        if (shouldProcessIntent(intent) && !hasProcessedIntent) {
            Log.d(TAG, "Found unprocessed intent on resume")
            pendingIntentData = intent
        }
        
        // Process pending intent
        processPendingIntent()
        
        Log.d(TAG, "========================================")
    }
    
    override fun onPause() {
        super.onPause()
        Log.d(TAG, "MainActivity onPause")
    }
    
    override fun onStop() {
        super.onStop()
        Log.d(TAG, "MainActivity onStop")
    }
    
    private fun shouldProcessIntent(intent: Intent?): Boolean {
        return intent != null && (
            intent.action == "OPEN_POMO_TRACKER" || 
            intent.action == "OPEN_EDIT_PLAN_TIMER_TRACKER" ||
            intent.action == "OPEN_EDIT_PLAN" ||
            intent.hasExtra("planId")
        )
    }
    
    private fun processPendingIntent() {
        if (pendingIntentData == null || hasProcessedIntent) {
            Log.d(TAG, "No pending intent to process")
            return
        }
        
        val intentData = pendingIntentData
        val action = intentData?.action
        
        Log.d(TAG, "Processing pending intent with action: $action")
        
        // Wait for React Native to be ready
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                val reactContext = reactInstanceManager?.currentReactContext
                if (reactContext != null) {
                    Log.d(TAG, "React Native is ready, processing intent")
                    
                    when (action) {
                        "OPEN_POMO_TRACKER" -> handlePomoTrackerIntent(intentData)
                        "OPEN_EDIT_PLAN_TIMER_TRACKER" -> handleEditPlanTimerTrackerIntent(intentData)
                        "OPEN_EDIT_PLAN" -> handleEditPlanIntent(intentData)
                        else -> {
                            if (intentData?.hasExtra("planId") == true) {
                                handlePomoTrackerIntent(intentData)
                            }
                        }
                    }
                    
                    hasProcessedIntent = true
                    pendingIntentData = null
                } else {
                    Log.d(TAG, "React Native not ready, retrying...")
                    Handler(Looper.getMainLooper()).postDelayed({
                        processPendingIntent()
                    }, 2000)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing pending intent", e)
            }
        }, 1500)
    }
    
    private fun handlePomoTrackerIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""

            if (planId == null || taskTitle == null) {
                Log.e(TAG, "Missing required data")
                return
            }

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_POMO_TRACKER", params)

            Log.d(TAG, "POMO event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending POMO event", e)
        }
    }
    
    private fun handleEditPlanTimerTrackerIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val evaluationType = intent.getStringExtra("evaluationType") ?: "timerTracker"
            val fromReschedule = intent.getBooleanExtra("fromReschedule", false)

            if (planId == null) {
                Log.e(TAG, "Missing planId")
                return
            }

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)
            params.putString("evaluationType", evaluationType)
            params.putBoolean("fromReschedule", fromReschedule)
            params.putString("screen", "EditPlanTimerTrackerScreen")

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_EDIT_SCREEN", params)

            Log.d(TAG, "Edit timer tracker event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending edit timer tracker event", e)
        }
    }
    
    private fun handleEditPlanIntent(intent: Intent?) {
        if (intent == null) return
        
        try {
            val planId = intent.getStringExtra("planId")
            val taskTitle = intent.getStringExtra("taskTitle")
            val taskDescription = intent.getStringExtra("taskDescription") ?: ""
            val startTime = intent.getStringExtra("startTime") ?: ""
            val category = intent.getStringExtra("category") ?: ""
            val evaluationType = intent.getStringExtra("evaluationType") ?: "yesNo"
            val fromReschedule = intent.getBooleanExtra("fromReschedule", false)

            if (planId == null) {
                Log.e(TAG, "Missing planId")
                return
            }

            val params: WritableMap = Arguments.createMap()
            params.putString("planId", planId)
            params.putString("taskTitle", taskTitle)
            params.putString("taskDescription", taskDescription)
            params.putString("startTime", startTime)
            params.putString("category", category)
            params.putString("evaluationType", evaluationType)
            params.putBoolean("fromReschedule", fromReschedule)
            params.putString("screen", "EditPlanScreen")

            reactInstanceManager
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("OPEN_EDIT_SCREEN", params)

            Log.d(TAG, "Edit plan event emitted")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending edit plan event", e)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        try {
            if (serviceBound) {
                unbindService(serviceConnection)
                serviceBound = false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unbinding service: ${e.message}", e)
        }
    }
    
    private fun checkAndRequestPermissions() {
        if (!hasUsageAccessPermission()) {
            requestUsageAccessPermission()
            return
        }
        
        if (!hasOverlayPermission()) {
            requestOverlayPermission()
            return
        }
        
        Log.d(TAG, "All permissions granted")
    }
    
    private fun hasUsageAccessPermission(): Boolean {
        try {
            val appOpsManager = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOpsManager.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
            return mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            Log.e(TAG, "Error checking usage access permission: ${e.message}", e)
            return false
        }
    }
    
    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }
    
    private fun requestUsageAccessPermission() {
        try {
            Toast.makeText(this, "Please grant Usage Access permission", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting usage access permission: ${e.message}", e)
        }
    }
    
    private fun requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Toast.makeText(this, "Please grant Overlay permission", Toast.LENGTH_LONG).show()
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                intent.data = Uri.parse("package:$packageName")
                startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
        }
    }
    
    private fun ensureServiceIsRunning() {
        try {
            if (!hasAllPermissions()) {
                Log.d(TAG, "Not all permissions granted")
                return
            }
            
            if (!isServiceRunning()) {
                Log.d(TAG, "Service not running, starting it")
                startAppLockService()
            } else {
                Log.d(TAG, "Service is already running")
                if (!serviceBound) {
                    bindToService()
                }
                refreshServiceNotification()
            }
            
            AppLockService.scheduleServiceAlarm(this)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error ensuring service is running: ${e.message}", e)
        }
    }
    
    private fun hasAllPermissions(): Boolean {
        return hasUsageAccessPermission() && hasOverlayPermission()
    }
    
    private fun isServiceRunning(): Boolean {
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            
            for (serviceInfo in runningServices) {
                if (AppLockService::class.java.name == serviceInfo.service.className) {
                    return true
                }
            }
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if service is running: ${e.message}", e)
            return false
        }
    }
    
    private fun startAppLockService() {
        try {
            val serviceIntent = Intent(this, AppLockService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            
            Log.d(TAG, "AppLockService start requested")
            
            GlobalScope.launch {
                delay(1000)
                runOnUiThread {
                    bindToService()
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting AppLockService: ${e.message}", e)
        }
    }
    
    private fun bindToService() {
        try {
            if (!serviceBound) {
                val serviceIntent = Intent(this, AppLockService::class.java)
                bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)
                Log.d(TAG, "Attempting to bind to service")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error binding to service: ${e.message}", e)
        }
    }
    
    private fun refreshServiceNotification() {
        try {
            val serviceIntent = Intent(this, AppLockService::class.java)
            serviceIntent.putExtra("refresh_notification", true)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            
            Log.d(TAG, "Service notification refresh requested")
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing service notification: ${e.message}", e)
        }
    }
    
    fun checkAndBlockApp(packageName: String) {
        appLockService?.checkAndBlockApp(packageName)
    }
    
    fun ensureServiceVisibility() {
        ensureServiceIsRunning()
        refreshServiceNotification()
    }
}