import { AppState, DeviceEventEmitter, NativeModules, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nightRoutineService } from '../services/api/nightRoutineService';

const { MorningModeSchedulerModule } = NativeModules;

const STORAGE_KEYS = {
  LAST_CHECK: '@morning_mode_last_check',
  TRIGGERED_TODAY: '@morning_mode_triggered_today',
  ENABLED: '@morning_mode_scheduler_enabled',
  XIAOMI_WARNING_SHOWN: '@morning_xiaomi_setup_warning_shown',
};

class MorningModeScheduler {
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
      console.log('☀️ [MorningModeScheduler] Initializing...');
      
      this.currentUserId = userId;
      this.navigationRef = navigationRef;

      // ✅ Check if device is Xiaomi
      await this.checkXiaomiDevice();

      // Check if scheduler is enabled
      const isEnabled = await this.isEnabled();
      if (!isEnabled) {
        console.log('☀️ [MorningModeScheduler] Scheduler is disabled');
        return;
      }

      // Load night routine (to get wake-up time)
      await this.loadNightRoutine();

      if (!this.nightRoutine || !this.nightRoutine.wakeUpTime) {
        console.log('☀️ [MorningModeScheduler] No wake-up time found');
        return;
      }

      // ✅ Check Xiaomi setup requirements BEFORE scheduling
      if (this.isXiaomiDevice) {
        const setupComplete = await this.checkXiaomiSetup();
        if (!setupComplete) {
          console.warn('⚠️ [MorningModeScheduler] Xiaomi setup incomplete');
          // Still continue but user will be warned
        }
      }

      // Schedule Android alarm (works even when app is killed)
      if (MorningModeSchedulerModule) {
        await this.scheduleNativeAlarm();
      }

      // Start periodic checks when app is active (backup mechanism)
      this.startPeriodicCheck();

      // Listen to app state changes
      this.setupAppStateListener();

      // Listen for Morning Mode triggers from MainActivity
      this.setupMorningModeTriggerListener();

      this.isInitialized = true;
      console.log('✅ [MorningModeScheduler] Initialized successfully');
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Initialization error:', error);
    }
  }

  /**
   * ✅ NEW: Check if device is Xiaomi
   */
  async checkXiaomiDevice() {
    try {
      if (!MorningModeSchedulerModule) {
        this.isXiaomiDevice = false;
        return;
      }

      this.isXiaomiDevice = await MorningModeSchedulerModule.isXiaomi();
      
      if (this.isXiaomiDevice) {
        console.warn('⚠️ [MorningModeScheduler] Xiaomi device detected');
        const deviceInfo = await MorningModeSchedulerModule.getDeviceInfo();
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
      const isIgnoringBattery = await MorningModeSchedulerModule.isIgnoringBatteryOptimizations();

      if (!isIgnoringBattery) {
        console.warn('⚠️ [MorningModeScheduler] Battery optimization not disabled on Xiaomi');
        
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
        'To ensure Morning Mode works reliably on your Xiaomi device, please:\n\n' +
        '1. Enable Autostart permission\n' +
        '2. Disable Battery Optimization\n' +
        '3. Set app to "No restrictions"\n\n' +
        'Without these settings, morning alarms may not work when the app is closed.',
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
                await MorningModeSchedulerModule.openAutostartSettings();
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
                          await MorningModeSchedulerModule.requestIgnoreBatteryOptimization();
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
   * Setup listener for Morning Mode triggers from MainActivity
   */
  setupMorningModeTriggerListener() {
    DeviceEventEmitter.addListener('TRIGGER_MORNING_MODE', (data) => {
      console.log('☀️ [MorningModeScheduler] Received Morning Mode trigger event:', data);
      
      if (data.from_alarm) {
        console.log('☀️ Alarm triggered - marking as triggered today');
        this.markTriggeredToday();
      }
    });
    
    console.log('✅ [MorningModeScheduler] Morning Mode trigger listener set up');
  }

  /**
   * Load user's night routine (to get wake-up time)
   */
  async loadNightRoutine() {
    try {
      if (!this.currentUserId) return;

      const routine = await nightRoutineService.getFormattedNightRoutine(
        this.currentUserId
      );

      if (routine && routine.wakeUpTime) {
        this.nightRoutine = routine;
        console.log('☀️ [MorningModeScheduler] Wake-up time loaded:', {
          wakeUpTime: routine.wakeUpTime.toLocaleTimeString(),
        });
      }
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Error loading routine:', error);
    }
  }

  /**
   * Schedule native Android alarm
   * ✅ ENHANCED: Returns device info for Xiaomi warning
   */
  async scheduleNativeAlarm() {
    try {
      if (!this.nightRoutine || !MorningModeSchedulerModule) return;

      const triggerTime = this.calculateTriggerTime(this.nightRoutine.wakeUpTime);
      
      console.log('📅 [MorningModeScheduler] Scheduling alarm for:', 
        triggerTime.toLocaleString()
      );

      // Schedule alarm and get device info
      const result = await MorningModeSchedulerModule.scheduleMorningModeAlarm(
        triggerTime.getTime(),
        this.nightRoutine.wakeUpTime.getHours(),
        this.nightRoutine.wakeUpTime.getMinutes()
      );

      console.log('✅ [MorningModeScheduler] Native alarm scheduled (works when app is killed)');
      console.log('🔔 Alarm will trigger at:', triggerTime.toLocaleTimeString());
      console.log('⏰ Wake-up time is:', this.nightRoutine.wakeUpTime.toLocaleTimeString());

      // ✅ Show warning if Xiaomi device detected in native module
      if (result && result.isXiaomi) {
        console.warn('⚠️ [MorningModeScheduler] Xiaomi device - checking setup');
        const setupComplete = await this.checkXiaomiSetup();
        if (!setupComplete) {
          console.warn('⚠️ Setup may be incomplete');
        }
      }

      return result;
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Native alarm error:', error);
    }
  }

  /**
   * Calculate trigger time (exactly at wake-up time)
   */
  calculateTriggerTime(wakeUpTime) {
    const trigger = new Date(wakeUpTime);
    
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

    this.checkAndTriggerMorningMode();

    this.checkInterval = setInterval(() => {
      this.checkAndTriggerMorningMode();
    }, 60000);

    console.log('✅ [MorningModeScheduler] Periodic check started (backup mechanism)');
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ [MorningModeScheduler] Periodic check stopped');
    }
  }

  /**
   * Check if it's time to trigger Morning Mode
   */
  async checkAndTriggerMorningMode() {
    try {
      if (!this.nightRoutine || !this.navigationRef) {
        return;
      }

      const hasTriggeredToday = await this.hasTriggeredToday();
      if (hasTriggeredToday) {
        return;
      }

      const now = new Date();
      const triggerTime = this.calculateTriggerTime(this.nightRoutine.wakeUpTime);

      const timeDiff = Math.abs(now - triggerTime);
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff <= fiveMinutes) {
        console.log('☀️ [MorningModeScheduler] Time to trigger Morning Mode (backup check)!');
        await this.triggerMorningMode();
      }
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Check error:', error);
    }
  }

  /**
   * Trigger Morning Mode
   */
  async triggerMorningMode() {
    try {
      console.log('☀️ [MorningModeScheduler] Triggering Morning Mode...');

      await this.markTriggeredToday();

      DeviceEventEmitter.emit('MORNING_MODE_STARTED', {
        wakeUpTime: this.nightRoutine.wakeUpTime,
        message: `Good morning! It's time to start your day at ${this.nightRoutine.wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });

      if (this.navigationRef && this.navigationRef.current) {
        this.navigationRef.current.navigate('MorningVideosScreen', {
          autoStart: true,
          fromMorningModeScheduler: true,
        });
      }

      console.log('✅ [MorningModeScheduler] Morning Mode triggered successfully');
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Trigger error:', error);
    }
  }

  /**
   * Setup app state listener
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('☀️ [MorningModeScheduler] App became active');
        this.startPeriodicCheck();
      } else if (nextAppState === 'background') {
        console.log('☀️ [MorningModeScheduler] App in background - native alarm will handle');
        this.stopPeriodicCheck();
      }
    });
  }

  /**
   * Check if Morning Mode was already triggered today
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
   * Mark Morning Mode as triggered today
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
        
        if (MorningModeSchedulerModule) {
          await MorningModeSchedulerModule.cancelMorningModeAlarm();
          console.log('☀️ [MorningModeScheduler] Native alarm cancelled (user disabled)');
        }
        
        this.isInitialized = false;
      }

      console.log(`☀️ [MorningModeScheduler] ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error('Error setting enabled state:', error);
    }
  }

  /**
   * Update night routine (when wake-up time changes)
   */
  async updateNightRoutine(userId) {
    try {
      console.log('☀️ [MorningModeScheduler] Updating wake-up time...');
      
      this.currentUserId = userId;
      await this.loadNightRoutine();

      if (this.nightRoutine && MorningModeSchedulerModule) {
        await this.scheduleNativeAlarm();
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);

      console.log('✅ [MorningModeScheduler] Wake-up time updated');
    } catch (error) {
      console.error('❌ [MorningModeScheduler] Update error:', error);
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
      nextTriggerTime = this.calculateTriggerTime(this.nightRoutine.wakeUpTime);
    }

    let nativeAlarmScheduled = false;
    if (MorningModeSchedulerModule) {
      try {
        nativeAlarmScheduled = await MorningModeSchedulerModule.isAlarmScheduled();
      } catch (error) {
        console.error('Error checking native alarm:', error);
      }
    }

    // ✅ Check Xiaomi setup
    let xiaomiSetupComplete = true;
    if (this.isXiaomiDevice && MorningModeSchedulerModule) {
      try {
        xiaomiSetupComplete = await MorningModeSchedulerModule.isIgnoringBatteryOptimizations();
      } catch (error) {
        console.error('Error checking Xiaomi setup:', error);
      }
    }

    return {
      enabled,
      hasTriggeredToday: hasTriggered,
      hasWakeUpTime: !!this.nightRoutine,
      wakeUpTime: this.nightRoutine?.wakeUpTime?.toLocaleTimeString(),
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
    console.log('☀️ [MorningModeScheduler] Cleaning up...');
    
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
    console.log('🧪 [MorningModeScheduler] Testing Morning Mode trigger...');
    await this.triggerMorningMode();
  }

  /**
   * Reset today's trigger status
   */
  async resetTodayStatus() {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIGGERED_TODAY);
    console.log('🔄 [MorningModeScheduler] Today status reset');
  }

  /**
   * ✅ NEW: Reset Xiaomi warning
   */
  async resetXiaomiWarning() {
    await AsyncStorage.removeItem(STORAGE_KEYS.XIAOMI_WARNING_SHOWN);
    console.log('🔄 [MorningModeScheduler] Xiaomi warning reset');
  }
}

export default new MorningModeScheduler();