import { AppState, DeviceEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nightRoutineService } from '../services/api/nightRoutineService';

const { NightModeSchedulerModule } = NativeModules;

const STORAGE_KEYS = {
  LAST_CHECK: '@night_mode_last_check',
  TRIGGERED_TODAY: '@night_mode_triggered_today',
  ENABLED: '@night_mode_scheduler_enabled',
};

class NightModeScheduler {
  constructor() {
    this.checkInterval = null;
    this.isInitialized = false;
    this.navigationRef = null;
    this.currentUserId = null;
    this.nightRoutine = null;
    this.appStateSubscription = null;
  }

  /**
   * Initialize the scheduler
   */
  async initialize(userId, navigationRef) {
    try {
      console.log('🌙 [NightModeScheduler] Initializing...');
      
      this.currentUserId = userId;
      this.navigationRef = navigationRef;

      // Check if scheduler is enabled
      const isEnabled = await this.isEnabled();
      if (!isEnabled) {
        console.log('🌙 [NightModeScheduler] Scheduler is disabled');
        return;
      }

      // Load night routine
      await this.loadNightRoutine();

      if (!this.nightRoutine) {
        console.log('🌙 [NightModeScheduler] No night routine found');
        return;
      }

      // Schedule Android alarm (works even when app is killed)
      if (NightModeSchedulerModule) {
        await this.scheduleNativeAlarm();
      }

      // Start periodic checks when app is active (backup mechanism)
      this.startPeriodicCheck();

      // Listen to app state changes
      this.setupAppStateListener();

      // Listen for Night Mode triggers from MainActivity
      this.setupNightModeTriggerListener();

      this.isInitialized = true;
      console.log('✅ [NightModeScheduler] Initialized successfully');
    } catch (error) {
      console.error('❌ [NightModeScheduler] Initialization error:', error);
    }
  }

  /**
   * Setup listener for Night Mode triggers from MainActivity
   * This handles the case when app was killed and relaunched by alarm
   * NOTE: Navigation is handled by NightModeSchedulerManager in App.js
   */
  setupNightModeTriggerListener() {
    DeviceEventEmitter.addListener('TRIGGER_NIGHT_MODE', (data) => {
      console.log('🌙 [NightModeScheduler] Received Night Mode trigger event:', data);
      
      // Just mark as triggered and emit event
      // Navigation is handled by NightModeSchedulerManager
      if (data.from_alarm) {
        console.log('🌙 Alarm triggered - marking as triggered today');
        this.markTriggeredToday();
      }
    });
    
    console.log('✅ [NightModeScheduler] Night Mode trigger listener set up');
  }

  /**
   * Load user's night routine
   */
  async loadNightRoutine() {
    try {
      if (!this.currentUserId) return;

      const routine = await nightRoutineService.getFormattedNightRoutine(
        this.currentUserId
      );

      if (routine && routine.bedTime) {
        this.nightRoutine = routine;
        console.log('🌙 [NightModeScheduler] Night routine loaded:', {
          bedTime: routine.bedTime.toLocaleTimeString(),
          wakeUpTime: routine.wakeUpTime.toLocaleTimeString(),
        });
      }
    } catch (error) {
      console.error('❌ [NightModeScheduler] Error loading routine:', error);
    }
  }

  /**
   * Schedule native Android alarm (WORKS EVEN WHEN APP IS KILLED)
   */
  async scheduleNativeAlarm() {
    try {
      if (!this.nightRoutine || !NightModeSchedulerModule) return;

      const triggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);
      
      console.log('📅 [NightModeScheduler] Scheduling alarm for:', 
        triggerTime.toLocaleString()
      );

      // Schedule alarm via native module
      // This alarm will work even if app is killed
      await NightModeSchedulerModule.scheduleNightModeAlarm(
        triggerTime.getTime(),
        this.nightRoutine.bedTime.getHours(),
        this.nightRoutine.bedTime.getMinutes()
      );

      console.log('✅ [NightModeScheduler] Native alarm scheduled (works when app is killed)');
      console.log('🔔 Alarm will trigger at:', triggerTime.toLocaleTimeString());
      console.log('🛏️ Bedtime is:', this.nightRoutine.bedTime.toLocaleTimeString());
    } catch (error) {
      console.error('❌ [NightModeScheduler] Native alarm error:', error);
    }
  }

  /**
   * Calculate trigger time (1 hour before bedtime)
   */
  calculateTriggerTime(bedTime) {
    const trigger = new Date(bedTime);
    trigger.setHours(trigger.getHours() - 1);
    
    // If trigger time has passed today, schedule for tomorrow
    const now = new Date();
    if (trigger < now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    return trigger;
  }

  /**
   * Start periodic checking (every minute when app is active - BACKUP ONLY)
   * The native alarm is the primary mechanism
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkAndTriggerNightMode();

    // Then check every minute (as backup to native alarm)
    this.checkInterval = setInterval(() => {
      this.checkAndTriggerNightMode();
    }, 60000); // 1 minute

    console.log('✅ [NightModeScheduler] Periodic check started (backup mechanism)');
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ [NightModeScheduler] Periodic check stopped');
    }
  }

  /**
   * Main logic: Check if it's time to trigger Night Mode (BACKUP MECHANISM)
   */
  async checkAndTriggerNightMode() {
    try {
      if (!this.nightRoutine || !this.navigationRef) {
        return;
      }

      // Check if already triggered today
      const hasTriggeredToday = await this.hasTriggeredToday();
      if (hasTriggeredToday) {
        return;
      }

      const now = new Date();
      const triggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);

      // Check if current time matches trigger time (within 5 minute window)
      const timeDiff = Math.abs(now - triggerTime);
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff <= fiveMinutes) {
        console.log('🌙 [NightModeScheduler] Time to trigger Night Mode (backup check)!');
        await this.triggerNightMode();
      }
    } catch (error) {
      console.error('❌ [NightModeScheduler] Check error:', error);
    }
  }

  /**
   * Trigger Night Mode
   */
  async triggerNightMode() {
    try {
      console.log('🌙 [NightModeScheduler] Triggering Night Mode...');

      // Mark as triggered today
      await this.markTriggeredToday();

      // Emit event for App.js to handle
      DeviceEventEmitter.emit('NIGHT_MODE_STARTED', {
        bedTime: this.nightRoutine.bedTime,
        message: `It's time to wind down! Your bedtime is at ${this.nightRoutine.bedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });

      // Navigate to YouTube Night Mode screen
      if (this.navigationRef && this.navigationRef.current) {
        this.navigationRef.current.navigate('YouTubeVideosScreen', {
          autoStart: true,
          fromNightModeScheduler: true,
        });
      }

      console.log('✅ [NightModeScheduler] Night Mode triggered successfully');
    } catch (error) {
      console.error('❌ [NightModeScheduler] Trigger error:', error);
    }
  }

  /**
   * Setup app state listener
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🌙 [NightModeScheduler] App became active');
        
        // Start periodic checks
        this.startPeriodicCheck();
      } else if (nextAppState === 'background') {
        console.log('🌙 [NightModeScheduler] App in background - native alarm will handle');
        
        // Stop periodic checks but DO NOT cancel alarm
        this.stopPeriodicCheck();
      }
    });
  }

  /**
   * Check if Night Mode was already triggered today
   */
  async hasTriggeredToday() {
    try {
      const lastTriggered = await AsyncStorage.getItem(STORAGE_KEYS.TRIGGERED_TODAY);
      if (!lastTriggered) return false;

      const lastDate = new Date(lastTriggered);
      const today = new Date();

      // Check if it's the same day
      return (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
      );
    } catch (error) {
      console.error('Error checking trigger status:', error);
      return false;
    }
  }

  /**
   * Mark Night Mode as triggered today
   */
  async markTriggeredToday() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRIGGERED_TODAY,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error marking triggered:', error);
    }
  }

  /**
   * Check if scheduler is enabled
   */
  async isEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.ENABLED);
      return enabled !== 'false'; // Enabled by default
    } catch (error) {
      return true;
    }
  }

  /**
   * Enable/disable scheduler
   */
  async setEnabled(enabled) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, enabled ? 'true' : 'false');
      
      if (enabled && !this.isInitialized) {
        await this.initialize(this.currentUserId, this.navigationRef);
      } else if (!enabled) {
        // Stop periodic checks
        this.stopPeriodicCheck();
        
        if (this.appStateSubscription) {
          this.appStateSubscription.remove();
          this.appStateSubscription = null;
        }
        
        // ✅ Only cancel alarm when explicitly disabled by user
        if (NightModeSchedulerModule) {
          await NightModeSchedulerModule.cancelNightModeAlarm();
          console.log('🌙 [NightModeScheduler] Native alarm cancelled (user disabled)');
        }
        
        this.isInitialized = false;
      }

      console.log(`🌙 [NightModeScheduler] ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error('Error setting enabled state:', error);
    }
  }

  /**
   * Update night routine (call this when user saves new bedtime)
   */
  async updateNightRoutine(userId) {
    try {
      console.log('🌙 [NightModeScheduler] Updating night routine...');
      
      this.currentUserId = userId;
      await this.loadNightRoutine();

      if (this.nightRoutine && NightModeSchedulerModule) {
        await this.scheduleNativeAlarm();
      }

      // Reset trigger status when routine is updated
      await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);

      console.log('✅ [NightModeScheduler] Night routine updated');
    } catch (error) {
      console.error('❌ [NightModeScheduler] Update error:', error);
    }
  }

  /**
   * Get scheduler status
   */
  async getStatus() {
    const enabled = await this.isEnabled();
    const hasTriggered = await this.hasTriggeredToday();
    
    let nextTriggerTime = null;
    if (this.nightRoutine) {
      nextTriggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);
    }

    // Get native alarm status
    let nativeAlarmScheduled = false;
    if (NightModeSchedulerModule) {
      try {
        nativeAlarmScheduled = await NightModeSchedulerModule.isAlarmScheduled();
      } catch (error) {
        console.error('Error checking native alarm:', error);
      }
    }

    return {
      enabled,
      hasTriggeredToday: hasTriggered,
      hasNightRoutine: !!this.nightRoutine,
      bedTime: this.nightRoutine?.bedTime?.toLocaleTimeString(),
      nextTriggerTime: nextTriggerTime?.toLocaleString(),
      isInitialized: this.isInitialized,
      nativeAlarmScheduled,
      worksWhenKilled: nativeAlarmScheduled, // Native alarm works when app is killed
    };
  }

  /**
   * Cleanup - Called when unmounting or disabling
   * NEVER cancels native alarm - that should only happen in setEnabled(false)
   */
  cleanup() {
    console.log('🌙 [NightModeScheduler] Cleaning up...');
    
    this.stopPeriodicCheck();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // ✅ DO NOT cancel native alarm here
    // Native alarm should persist even when app closes
    // It will only be cancelled when user explicitly disables Night Mode
    
    this.isInitialized = false;
  }

  /**
   * Test the scheduler (for debugging)
   */
  async testTrigger() {
    console.log('🧪 [NightModeScheduler] Testing Night Mode trigger...');
    await this.triggerNightMode();
  }

  /**
   * Reset today's trigger status (for debugging)
   */
  async resetTodayStatus() {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);
    console.log('🔄 [NightModeScheduler] Today status reset');
  }
}

export default new NightModeScheduler();