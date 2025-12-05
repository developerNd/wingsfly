package com.wingsfly

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.wingsfly.InstalledAppsPackage
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.content.Intent
import android.content.Context
import android.os.Build
import android.app.ActivityManager

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(InstalledAppsPackage())
              add(AppUsagePackage())
              add(RunningAppsPackage())
              add(PomodoroPackage())
              add(UserDataPackage())
              add(CustomAlarmModulePackage())
              add(VoiceCommandAlarmModulePackage())
              add(TaskConfirmationAlarmPackage())
              add(IntentionPackage())
              add(DigitalDetoxPackage())
              add(GetBackPackage())
              // Add the AlarmPackage for native alarms
              add(AlarmPackage())
              add(ChallengeLockPackage())
              add(ChallengeSchedulerPackage())
              add(UsageLimitVideoPackage())
              add(DateReminderModulePackage())
              add(YouTubeNightModePackage())
              add(NightModeSchedulerPackage())
              add(MorningRoutineAlarmModulePackage())
              add(FloatingButtonPackage())
              add(FCMPackage())
              add(BlockTimeSchedulerPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // ✅ NEW: Schedule daily date reminders (7 AM and 7 PM)
    try {
        Log.d("DateReminder", "Scheduling daily date reminders")
        DateReminderScheduler.scheduleDailyReminders(this)
        Log.d("DateReminder", "Date reminders scheduled successfully")
    } catch (e: Exception) {
        Log.e("DateReminder", "Error scheduling date reminders: ${e.message}", e)
    }
    
    // Start our app lock service with better error handling
    try {
      Log.d("AppLock", "MainApplication: Starting app lock service")
      
      // Start service immediately
      startAppLockService()
      
      // Schedule a delayed service start to ensure everything is initialized
      Handler(Looper.getMainLooper()).postDelayed({
        try {
          // First check if service is running from initial start
          if (!isServiceRunning(AppLockService::class.java)) {
            Log.d("AppLock", "Service not running after initial delay, restarting")
            startAppLockService()
          } else {
            Log.d("AppLock", "Service already running from first check in MainApplication")
          }
          
          // Add another delayed check to verify service is running
          Handler(Looper.getMainLooper()).postDelayed({
            if (!isServiceRunning(AppLockService::class.java)) {
              Log.e("AppLock", "Service still not running after second delay! Restarting...")
              startAppLockService()
            } else {
              Log.d("AppLock", "Service verified running from MainApplication second delayed check")
            }
          }, 10000) // Check after 10 seconds
          
        } catch (e: Exception) {
          Log.e("AppLock", "Error in delayed service start: ${e.message}", e)
          
          // Try restart as a last resort
          startAppLockService()
        }
      }, 3000) // Wait 3 seconds before starting service
      
    } catch (e: Exception) {
      Log.e("AppLock", "Error starting service from MainApplication: ${e.message}", e)
    }
  }
  
  // Start the app lock service
  private fun startAppLockService() {
    try {
      Log.d("AppLock", "Starting AppLockService from MainApplication")
      val serviceIntent = Intent(this, AppLockService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(serviceIntent)
      } else {
        startService(serviceIntent)
      }
      Log.d("AppLock", "AppLockService started successfully from MainApplication")
    } catch (e: Exception) {
      Log.e("AppLock", "Error starting service from MainApplication: ${e.message}", e)
    }
  }
  
  // Helper method to check if a service is running
  private fun isServiceRunning(serviceClass: Class<*>): Boolean {
    try {
      val manager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
        if (serviceClass.name == service.service.className) {
          return true
        }
      }
    } catch (e: Exception) {
      Log.e("AppLock", "Error checking if service is running: ${e.message}", e)
    }
    return false
  }
}