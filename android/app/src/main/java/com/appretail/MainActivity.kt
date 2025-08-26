package com.wingsfly

import android.Manifest
import android.app.AppOpsManager
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
import kotlinx.coroutines.*
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    
    private val TAG = "MainActivity"
    private val USAGE_ACCESS_REQUEST_CODE = 1001
    private val OVERLAY_PERMISSION_REQUEST_CODE = 1002
    
    private var appLockService: AppLockService? = null
    private var serviceBound = false
    
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

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "AppRetail"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "MainActivity onCreate")
        
        // Check and request permissions
        checkAndRequestPermissions()
        
        // Ensure service is running
        ensureServiceIsRunning()
    }
    
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "MainActivity onResume")
        
        // Always check service status when returning to the app
        ensureServiceIsRunning()
        
        // Bind to service if not already bound
        if (!serviceBound) {
            bindToService()
        }
    }
    
    override fun onPause() {
        super.onPause()
        // Don't unbind service - keep it connected for better communication
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
        // Check Usage Access Permission
        if (!hasUsageAccessPermission()) {
            requestUsageAccessPermission()
            return
        }
        
        // Check Overlay Permission
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
            Toast.makeText(this, "Please grant Usage Access permission for App Lock to work", Toast.LENGTH_LONG).show()
        /*   val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            startActivityForResult(intent, USAGE_ACCESS_REQUEST_CODE) */
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting usage access permission: ${e.message}", e)
            Toast.makeText(this, "Please grant Usage Access permission manually", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Toast.makeText(this, "Please grant Overlay permission for App Lock to work", Toast.LENGTH_LONG).show()
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                intent.data = Uri.parse("package:$packageName")
                startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting overlay permission: ${e.message}", e)
            Toast.makeText(this, "Please grant Overlay permission manually", Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            USAGE_ACCESS_REQUEST_CODE -> {
                if (hasUsageAccessPermission()) {
                    Log.d(TAG, "Usage access permission granted")
                    // Check next permission
                    checkAndRequestPermissions()
                } else {
                    Toast.makeText(this, "Usage Access permission is required", Toast.LENGTH_LONG).show()
                    // Try again after delay
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
                    // All permissions granted, start service
                    ensureServiceIsRunning()
                } else {
                    Toast.makeText(this, "Overlay permission is required", Toast.LENGTH_LONG).show()
                    // Try again after delay
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
    
    private fun ensureServiceIsRunning() {
        try {
            if (!hasAllPermissions()) {
                Log.d(TAG, "Not all permissions granted, cannot start service")
                return
            }
            
            if (!isServiceRunning()) {
                Log.d(TAG, "Service not running, starting it")
                startAppLockService()
            } else {
                Log.d(TAG, "Service is already running")
                // Service is running, but make sure it's properly bound
                if (!serviceBound) {
                    bindToService()
                }
                
                // Refresh service notification to ensure it's visible
                refreshServiceNotification()
            }
            
            // Schedule service alarm as backup
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
                    Log.d(TAG, "AppLockService is running")
                    return true
                }
            }
            
            Log.d(TAG, "AppLockService is NOT running")
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
            
            // Bind to the service after starting
            GlobalScope.launch {
                delay(1000) // Wait a bit for service to start
                runOnUiThread {
                    bindToService()
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting AppLockService: ${e.message}", e)
            Toast.makeText(this, "Error starting App Lock Service", Toast.LENGTH_SHORT).show()
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
    
    /**
     * Call this method when you want to manually check and block an app
     * This can be useful for testing or immediate blocking
     */
    fun checkAndBlockApp(packageName: String) {
        appLockService?.checkAndBlockApp(packageName)
    }
    
    /**
     * Call this method to ensure the service is visible and active
     * Useful to call when the app comes to foreground
     */
    fun ensureServiceVisibility() {
        ensureServiceIsRunning()
        refreshServiceNotification()
    }
}