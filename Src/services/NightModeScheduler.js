import { AppState, DeviceEventEmitter, NativeModules, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nightRoutineService } from '../services/api/nightRoutineService';

const { NightModeSchedulerModule } = NativeModules;

const STORAGE_KEYS = {
  LAST_CHECK: '@night_mode_last_check',
  TRIGGERED_TODAY: '@night_mode_triggered_today',
  ENABLED: '@night_mode_scheduler_enabled',
  XIAOMI_WARNING_SHOWN: '@xiaomi_setup_warning_shown',
};

class NightModeScheduler {
  constructor() {
    this.checkInterval = null;
    this.isInitialized = false;
    this.navigationRef = null;
    this.currentUserId = null;
    this.nightRoutine = null;
    this.appStateSubscription = null;
    this.isXiaomiDevice = false;
  }

  /**
   * Initialize the scheduler
   * ✅ ENHANCED: Added Xiaomi device detection and setup check
   */
  async initialize(userId, navigationRef) {
    try {
      console.log('🌙 [NightModeScheduler] Initializing...');
      
      this.currentUserId = userId;
      this.navigationRef = navigationRef;

      // ✅ Check if device is Xiaomi
      await this.checkXiaomiDevice();

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

      // ✅ Check Xiaomi setup requirements BEFORE scheduling
      if (this.isXiaomiDevice) {
        const setupComplete = await this.checkXiaomiSetup();
        if (!setupComplete) {
          console.warn('⚠️ [NightModeScheduler] Xiaomi setup incomplete');
          // Still continue but user will be warned
        }
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
   * ✅ NEW: Check if device is Xiaomi
   */
  async checkXiaomiDevice() {
    try {
      if (!NightModeSchedulerModule) {
        this.isXiaomiDevice = false;
        return;
      }

      this.isXiaomiDevice = await NightModeSchedulerModule.isXiaomi();
      
      if (this.isXiaomiDevice) {
        console.warn('⚠️ [NightModeScheduler] Xiaomi device detected');
        const deviceInfo = await NightModeSchedulerModule.getDeviceInfo();
        console.log('📱 Device Info:', deviceInfo);
      }
    } catch (error) {
      console.error('Error checking Xiaomi device:', error);
      this.isXiaomiDevice = false;
    }
  }

  /**
   * ✅ NEW: Check Xiaomi setup requirements
   */
  async checkXiaomiSetup() {
    try {
      if (!this.isXiaomiDevice) return true;

      // Check if warning has been shown before
      const warningShown = await AsyncStorage.getItem(STORAGE_KEYS.XIAOMI_WARNING_SHOWN);
      
      // Check battery optimization
      const isIgnoringBattery = await NightModeSchedulerModule.isIgnoringBatteryOptimizations();

      if (!isIgnoringBattery) {
        console.warn('⚠️ [NightModeScheduler] Battery optimization not disabled on Xiaomi');
        
        // Only show warning once unless user explicitly wants to see it again
        if (!warningShown) {
          await this.showXiaomiSetupWarning();
          await AsyncStorage.setItem(STORAGE_KEYS.XIAOMI_WARNING_SHOWN, 'true');
        }
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking Xiaomi setup:', error);
      return false;
    }
  }

  /**
   * ✅ NEW: Show Xiaomi setup warning
   */
  async showXiaomiSetupWarning() {
    return new Promise((resolve) => {
      Alert.alert(
        '⚠️ Xiaomi Device Setup Required',
        'To ensure Night Mode works reliably on your Xiaomi device, please:\n\n' +
        '1. Enable Autostart permission\n' +
        '2. Disable Battery Optimization\n' +
        '3. Set app to "No restrictions"\n\n' +
        'Without these settings, alarms may not work when the app is closed.',
        [
          {
            text: 'Setup Later',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Autostart Settings',
            onPress: async () => {
              try {
                await NightModeSchedulerModule.openAutostartSettings();
              } catch (error) {
                console.error('Error opening autostart:', error);
              }
              
              // Show second alert for battery optimization
              setTimeout(() => {
                Alert.alert(
                  'Battery Optimization',
                  'Next, please disable battery optimization for this app.',
                  [
                    {
                      text: 'Skip',
                      style: 'cancel',
                      onPress: () => resolve(false),
                    },
                    {
                      text: 'Open Settings',
                      onPress: async () => {
                        try {
                          await NightModeSchedulerModule.requestIgnoreBatteryOptimization();
                          resolve(true);
                        } catch (error) {
                          console.error('Error opening battery settings:', error);
                          resolve(false);
                        }
                      },
                    },
                  ]
                );
              }, 500);
            },
          },
        ]
      );
    });
  }

  /**
   * ✅ NEW: Manual Xiaomi setup trigger (for settings screen)
   */
  async showXiaomiSetupGuide() {
    if (!this.isXiaomiDevice) {
      Alert.alert('Not a Xiaomi Device', 'This device does not require special setup.');
      return;
    }

    await this.showXiaomiSetupWarning();
  }

  /**
   * Setup listener for Night Mode triggers from MainActivity
   */
  setupNightModeTriggerListener() {
    DeviceEventEmitter.addListener('TRIGGER_NIGHT_MODE', (data) => {
      console.log('🌙 [NightModeScheduler] Received Night Mode trigger event:', data);
      
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
   * Schedule native Android alarm
   * ✅ ENHANCED: Returns device info for Xiaomi warning
   */
  async scheduleNativeAlarm() {
    try {
      if (!this.nightRoutine || !NightModeSchedulerModule) return;

      const triggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);
      
      console.log('📅 [NightModeScheduler] Scheduling alarm for:', 
        triggerTime.toLocaleString()
      );

      // Schedule alarm and get device info
      const result = await NightModeSchedulerModule.scheduleNightModeAlarm(
        triggerTime.getTime(),
        this.nightRoutine.bedTime.getHours(),
        this.nightRoutine.bedTime.getMinutes()
      );

      console.log('✅ [NightModeScheduler] Native alarm scheduled (works when app is killed)');
      console.log('🔔 Alarm will trigger at:', triggerTime.toLocaleTimeString());
      console.log('🛏️ Bedtime is:', this.nightRoutine.bedTime.toLocaleTimeString());

      // ✅ Show warning if Xiaomi device detected in native module
      if (result && result.isXiaomi) {
        console.warn('⚠️ [NightModeScheduler] Xiaomi device - checking setup');
        const setupComplete = await this.checkXiaomiSetup();
        if (!setupComplete) {
          console.warn('⚠️ Setup may be incomplete');
        }
      }

      return result;
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
    
    const now = new Date();
    if (trigger < now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    return trigger;
  }

  /**
   * Start periodic checking
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkAndTriggerNightMode();

    this.checkInterval = setInterval(() => {
      this.checkAndTriggerNightMode();
    }, 60000);

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
   * Check if it's time to trigger Night Mode
   */
  async checkAndTriggerNightMode() {
    try {
      if (!this.nightRoutine || !this.navigationRef) {
        return;
      }

      const hasTriggeredToday = await this.hasTriggeredToday();
      if (hasTriggeredToday) {
        return;
      }

      const now = new Date();
      const triggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);

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

      await this.markTriggeredToday();

      DeviceEventEmitter.emit('NIGHT_MODE_STARTED', {
        bedTime: this.nightRoutine.bedTime,
        message: `It's time to wind down! Your bedtime is at ${this.nightRoutine.bedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });

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
        this.startPeriodicCheck();
      } else if (nextAppState === 'background') {
        console.log('🌙 [NightModeScheduler] App in background - native alarm will handle');
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
      return enabled !== 'false';
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
        this.stopPeriodicCheck();
        
        if (this.appStateSubscription) {
          this.appStateSubscription.remove();
          this.appStateSubscription = null;
        }
        
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
   * Update night routine
   */
  async updateNightRoutine(userId) {
    try {
      console.log('🌙 [NightModeScheduler] Updating night routine...');
      
      this.currentUserId = userId;
      await this.loadNightRoutine();

      if (this.nightRoutine && NightModeSchedulerModule) {
        await this.scheduleNativeAlarm();
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);

      console.log('✅ [NightModeScheduler] Night routine updated');
    } catch (error) {
      console.error('❌ [NightModeScheduler] Update error:', error);
    }
  }

  /**
   * Get scheduler status
   * ✅ ENHANCED: Added Xiaomi info
   */
  async getStatus() {
    const enabled = await this.isEnabled();
    const hasTriggered = await this.hasTriggeredToday();
    
    let nextTriggerTime = null;
    if (this.nightRoutine) {
      nextTriggerTime = this.calculateTriggerTime(this.nightRoutine.bedTime);
    }

    let nativeAlarmScheduled = false;
    if (NightModeSchedulerModule) {
      try {
        nativeAlarmScheduled = await NightModeSchedulerModule.isAlarmScheduled();
      } catch (error) {
        console.error('Error checking native alarm:', error);
      }
    }

    // ✅ Check Xiaomi setup
    let xiaomiSetupComplete = true;
    if (this.isXiaomiDevice && NightModeSchedulerModule) {
      try {
        xiaomiSetupComplete = await NightModeSchedulerModule.isIgnoringBatteryOptimizations();
      } catch (error) {
        console.error('Error checking Xiaomi setup:', error);
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
      worksWhenKilled: nativeAlarmScheduled,
      isXiaomiDevice: this.isXiaomiDevice,
      xiaomiSetupComplete,
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('🌙 [NightModeScheduler] Cleaning up...');
    
    this.stopPeriodicCheck();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.isInitialized = false;
  }

  /**
   * Test the scheduler
   */
  async testTrigger() {
    console.log('🧪 [NightModeScheduler] Testing Night Mode trigger...');
    await this.triggerNightMode();
  }

  /**
   * Reset today's trigger status
   */
  async resetTodayStatus() {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);
    console.log('🔄 [NightModeScheduler] Today status reset');
  }

  /**
   * ✅ NEW: Reset Xiaomi warning
   */
  async resetXiaomiWarning() {
    await AsyncStorage.removeItem(STORAGE_KEYS.XIAOMI_WARNING_SHOWN);
    console.log('🔄 [NightModeScheduler] Xiaomi warning reset');
  }
}

export default new NightModeScheduler();