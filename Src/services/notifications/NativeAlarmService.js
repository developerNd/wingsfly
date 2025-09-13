import { NativeModules, Platform } from 'react-native';

const { AlarmModule } = NativeModules;

class NativeAlarmService {
  constructor() {
    this.isInitialized = false;
    this.isSupported = Platform.OS === 'android';
  }

  // Initialize the service
  initialize = async () => {
    try {
      if (!this.isSupported) {
        console.log('NativeAlarmService: Not supported on this platform');
        return false;
      }

      this.isInitialized = true;
      console.log('NativeAlarmService initialized');
      return true;
    } catch (error) {
      console.error('Error initializing NativeAlarmService:', error);
      return false;
    }
  };

  // UPDATED: Schedule alarm with ElevenLabs support
  scheduleAlarm = async (alarmData) => {
    console.log('NativeAlarmService.scheduleAlarm called with:', {
      useElevenLabs: alarmData.useElevenLabs,
      taskTitle: alarmData.taskTitle,
      userName: alarmData.userName
    });

    try {
      if (!this.isSupported) {
        console.log('Native alarms not supported on this platform');
        return null;
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        id,
        taskId,
        taskTitle,
        taskMessage,
        scheduledTime,
        ttsMessage,
        userName,
        useElevenLabs = false, // CRITICAL: Default to false, will be set to true by AlarmSchedulerService
        taskData,              // CRITICAL: Task data for enhanced TTS
        reminderData          // CRITICAL: Reminder data for enhanced TTS
      } = alarmData;

      if (!AlarmModule) {
        console.error('AlarmModule not available');
        return null;
      }

      console.log('NativeAlarmService scheduling with useElevenLabs:', useElevenLabs);

      // Prepare alarm parameters with ElevenLabs support
      const alarmParams = {
        id,
        taskId,
        taskTitle,
        taskMessage,
        timestamp: scheduledTime.getTime(),
        ttsMessage,
        userName,
        useElevenLabs,    // CRITICAL: Pass ElevenLabs flag
        taskData,         // CRITICAL: Pass task data as string
        reminderData      // CRITICAL: Pass reminder data as string
      };

      console.log('Sending to AlarmModule with useElevenLabs:', useElevenLabs);

      // Call native module
      const result = await AlarmModule.scheduleAlarm(alarmParams);

      if (result) {
        console.log('Native alarm scheduled successfully with ElevenLabs:', useElevenLabs);
        return result;
      } else {
        console.error('Failed to schedule native alarm');
        return null;
      }
    } catch (error) {
      console.error('Error in NativeAlarmService.scheduleAlarm:', error);
      return null;
    }
  };

  // Cancel alarm
  cancelAlarm = async (alarmId) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const result = await AlarmModule.cancelAlarm(alarmId);
      console.log(`Alarm cancelled: ${alarmId}`);
      return result;
    } catch (error) {
      console.error('Error cancelling alarm:', error);
      return false;
    }
  };

  // Cancel all alarms for a task
  cancelTaskAlarms = async (taskId) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      // For now, we'll need to track alarm IDs separately or implement in native module
      // This is a simplified version
      console.log(`Cancelling all alarms for task: ${taskId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling task alarms:', error);
      return false;
    }
  };

  // Snooze alarm
  snoozeAlarm = async (alarmId, minutes = 5) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      console.log(`Snoozing alarm ${alarmId} for ${minutes} minutes`);
      // Implementation would depend on your native module
      return true;
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      return false;
    }
  };

  // Check permission status
  checkPermissionStatus = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const hasPermission = await AlarmModule.checkExactAlarmPermission();
      return hasPermission;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return false;
    }
  };

  // Request alarm permissions
  requestAlarmPermissions = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const result = await AlarmModule.requestExactAlarmPermission();
      console.log('Permission request result:', result);
      return result;
    } catch (error) {
      console.error('Error requesting alarm permissions:', error);
      return false;
    }
  };

  // Check battery optimization
  checkBatteryOptimization = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const isOptimized = await AlarmModule.checkBatteryOptimization();
      return isOptimized;
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return false;
    }
  };

  // Request battery optimization whitelist
  requestBatteryOptimizationWhitelist = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const result = await AlarmModule.requestBatteryOptimizationWhitelist();
      console.log('Battery optimization whitelist result:', result);
      return result;
    } catch (error) {
      console.error('Error requesting battery optimization whitelist:', error);
      return false;
    }
  };

  // Get alarm info
  getAlarmInfo = async (alarmId) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const isScheduled = await AlarmModule.getAlarmInfo(alarmId);
      return isScheduled;
    } catch (error) {
      console.error('Error getting alarm info:', error);
      return false;
    }
  };

  // Get system info
  getSystemInfo = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return 'Not supported on this platform';
      }

      const systemInfo = await AlarmModule.getSystemInfo();
      return systemInfo;
    } catch (error) {
      console.error('Error getting system info:', error);
      return 'Error getting system info';
    }
  };

  // Schedule immediate test alarm - UPDATED with ElevenLabs
  scheduleImmediateTestAlarm = async (testUserName = 'Test User') => {
    console.log('NativeAlarmService scheduling immediate test alarm with ElevenLabs');
    
    try {
      if (!this.isSupported || !AlarmModule) {
        console.log('Test alarm not supported on this platform');
        return false;
      }

      const result = await AlarmModule.scheduleImmediateTestAlarm(testUserName);
      
      if (result) {
        console.log('Immediate test alarm scheduled with ElevenLabs support');
        return result;
      } else {
        console.error('Failed to schedule immediate test alarm');
        return false;
      }
    } catch (error) {
      console.error('Error scheduling immediate test alarm:', error);
      return false;
    }
  };

  // Get alarm stats
  getAlarmStats = () => {
    return {
      total: 0, // Would need to track this
      platform: Platform.OS,
      isSupported: this.isSupported,
      isInitialized: this.isInitialized
    };
  };

  // Check if service is supported
  isSupported = () => {
    return this.isSupported;
  };

  // Get service info
  getServiceInfo = () => {
    return {
      isInitialized: this.isInitialized,
      isSupported: this.isSupported,
      platform: Platform.OS,
      features: this.isSupported 
        ? ['schedule_alarm', 'cancel_alarm', 'permissions', 'battery_optimization', 'elevenlabs_tts']
        : ['not_supported']
    };
  };

  // Load stored alarms - RESTORED METHOD
  loadStoredAlarms = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return [];
      }

      // Implementation would depend on your storage system
      // For now, return empty array
      console.log('Loading stored alarms...');
      return [];
    } catch (error) {
      console.error('Error loading stored alarms:', error);
      return [];
    }
  };

  // Save alarm data - RESTORED METHOD
  saveAlarmData = async (alarmData) => {
    try {
      if (!this.isSupported) {
        return false;
      }

      console.log('Saving alarm data:', alarmData.id);
      // Implementation would depend on your storage system
      return true;
    } catch (error) {
      console.error('Error saving alarm data:', error);
      return false;
    }
  };

  // Remove alarm data - RESTORED METHOD
  removeAlarmData = async (alarmId) => {
    try {
      if (!this.isSupported) {
        return false;
      }

      console.log('Removing alarm data:', alarmId);
      // Implementation would depend on your storage system
      return true;
    } catch (error) {
      console.error('Error removing alarm data:', error);
      return false;
    }
  };

  // Get all scheduled alarms - RESTORED METHOD
  getAllScheduledAlarms = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return [];
      }

      // Implementation would depend on your native module
      console.log('Getting all scheduled alarms...');
      return [];
    } catch (error) {
      console.error('Error getting scheduled alarms:', error);
      return [];
    }
  };

  // Check if alarm exists - RESTORED METHOD
  alarmExists = async (alarmId) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      const exists = await AlarmModule.getAlarmInfo(alarmId);
      return exists;
    } catch (error) {
      console.error('Error checking if alarm exists:', error);
      return false;
    }
  };

  // Update alarm - RESTORED METHOD
  updateAlarm = async (alarmData) => {
    try {
      if (!this.isSupported) {
        return null;
      }

      console.log('Updating alarm:', alarmData.id);
      
      // Cancel existing alarm
      await this.cancelAlarm(alarmData.id);
      
      // Schedule new alarm
      const result = await this.scheduleAlarm(alarmData);
      
      return result;
    } catch (error) {
      console.error('Error updating alarm:', error);
      return null;
    }
  };

  // Get next alarm time - RESTORED METHOD
  getNextAlarmTime = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return null;
      }

      // Implementation would depend on your native module
      console.log('Getting next alarm time...');
      return null;
    } catch (error) {
      console.error('Error getting next alarm time:', error);
      return null;
    }
  };

  // Cancel all alarms - RESTORED METHOD
  cancelAllAlarms = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      console.log('Cancelling all alarms...');
      // Implementation would depend on your native module
      return true;
    } catch (error) {
      console.error('Error cancelling all alarms:', error);
      return false;
    }
  };

  // Test alarm sound - RESTORED METHOD
  testAlarmSound = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      console.log('Testing alarm sound...');
      // Implementation would depend on your native module
      return true;
    } catch (error) {
      console.error('Error testing alarm sound:', error);
      return false;
    }
  };

  // Set alarm volume - RESTORED METHOD
  setAlarmVolume = async (volume) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      console.log('Setting alarm volume:', volume);
      // Implementation would depend on your native module
      return true;
    } catch (error) {
      console.error('Error setting alarm volume:', error);
      return false;
    }
  };

  // Enable/disable alarm sound - RESTORED METHOD
  setAlarmSoundEnabled = async (enabled) => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return false;
      }

      console.log('Setting alarm sound enabled:', enabled);
      // Implementation would depend on your native module
      return true;
    } catch (error) {
      console.error('Error setting alarm sound enabled:', error);
      return false;
    }
  };

  // Get alarm count - RESTORED METHOD
  getAlarmCount = async () => {
    try {
      if (!this.isSupported || !AlarmModule) {
        return 0;
      }

      const alarms = await this.getAllScheduledAlarms();
      return alarms.length;
    } catch (error) {
      console.error('Error getting alarm count:', error);
      return 0;
    }
  };

  // Cleanup method
  cleanup = async () => {
    try {
      // Stop any ongoing operations
      this.isInitialized = false;
      console.log('NativeAlarmService cleanup completed');
    } catch (error) {
      console.error('Error during NativeAlarmService cleanup:', error);
    }
  };
}

export default new NativeAlarmService();