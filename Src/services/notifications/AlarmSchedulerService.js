// Complete AlarmSchedulerService.js - ElevenLabs Integration WITHOUT Time Formatting
import NativeAlarmService from './NativeAlarmService';
import EnhancedTTSService from './EnhancedTTSService';
import notifee, { TriggerType, AndroidImportance } from '@notifee/react-native';
import { Platform, DeviceEventEmitter } from 'react-native';

class AlarmSchedulerService {
  constructor() {
    this.isInitialized = false;
    this.useNativeAlarms = Platform.OS === 'android';
    this.userProfile = null;
    this.ttsService = EnhancedTTSService;
  }

  // Initialize the service with ElevenLabs TTS
  initialize = async () => {
    try {
      console.log('🚀 Initializing AlarmSchedulerService with ElevenLabs...');
      
      await this.initializeAlarmChannels();
      
      // Initialize ElevenLabs TTS service
      await this.ttsService.initialize();
      console.log('✅ ElevenLabs TTS service initialized');
      
      // Setup event listeners for Android communication
      this.setupEventListeners();
      
      if (this.useNativeAlarms) {
        await NativeAlarmService.initialize();
        console.log('✅ AlarmSchedulerService initialized with native alarms and ElevenLabs TTS');
      } else {
        console.log('AlarmSchedulerService: Native alarms not supported on iOS');
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing AlarmSchedulerService:', error);
      this.useNativeAlarms = false;
      return false;
    }
  };

  // Setup DeviceEventEmitter listeners
  setupEventListeners = () => {
    console.log('🎧 Setting up DeviceEventEmitter listeners for ElevenLabs...');
    
    // Listen for TTS trigger from Android AlarmActivity
    DeviceEventEmitter.addListener('alarmTTSTriggered', async (data) => {
      console.log('🎵 Alarm TTS triggered from Android:', data);
      
      try {
        if (data.useElevenLabs) {
          console.log('✅ ElevenLabs enabled - playing enhanced TTS');
          
          // Parse task data if provided
          let taskData = null;
          let reminderData = null;
          
          if (data.taskData) {
            try {
              taskData = JSON.parse(data.taskData);
            } catch (e) {
              console.log('Could not parse taskData, using fallback');
            }
          }
          
          if (data.reminderData) {
            try {
              reminderData = JSON.parse(data.reminderData);
            } catch (e) {
              console.log('Could not parse reminderData');
            }
          }
          
          // If no parsed data, create from basic info
          if (!taskData) {
            taskData = {
              title: data.taskTitle,
              blockTimeData: {
                startTime: this.extractTimeFromMessage(data.ttsMessage)
              }
            };
          }
          
          // Set user profile if provided
          if (data.userName) {
            this.setUserProfile({ username: data.userName });
          }
          
          // Play enhanced TTS with ElevenLabs
          await this.ttsService.playEnhancedAlarmSpeech(taskData, reminderData);
          
        } else {
          console.log('⚠️ ElevenLabs not enabled for this alarm - playing basic TTS');
          // Could play basic TTS here as fallback
        }
      } catch (error) {
        console.error('Error handling TTS trigger:', error);
      }
    });

    // Listen for TTS repeat requests
    DeviceEventEmitter.addListener('alarmTTSRepeat', async (data) => {
      console.log('🔄 TTS repeat requested:', data.alarmId);
      
      try {
        await this.ttsService.playHindiQuote();
      } catch (error) {
        console.error('Error repeating TTS:', error);
      }
    });

    // Listen for TTS stop requests
    DeviceEventEmitter.addListener('alarmTTSStop', (data) => {
      console.log('🛑 TTS stop requested:', data.alarmId);
      this.ttsService.stopAudio();
    });

    // Listen for TTS cleanup requests
    DeviceEventEmitter.addListener('alarmTTSCleanup', async (data) => {
      console.log('🧹 TTS cleanup requested:', data.alarmId);
      await this.ttsService.cleanup();
    });

    // Listen for alarm actions
    DeviceEventEmitter.addListener('alarmActionTriggered', (data) => {
      console.log('⚡ Alarm action triggered:', data.action, 'for alarm:', data.alarmId);
      
      if (data.action === 'stopped' || data.action === 'dismissed') {
        this.ttsService.stopAudio();
      }
    });

    console.log('✅ DeviceEventEmitter listeners setup for ElevenLabs TTS');
  };

  // Helper method to extract time from TTS message
  extractTimeFromMessage = (ttsMessage) => {
    if (!ttsMessage) return '12:00';
    
    // Look for time patterns like "at 2:30" or "at 14:30"
    const timeMatch = ttsMessage.match(/at (\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    
    return '12:00';
  };

  // Set user profile for personalized messages
  setUserProfile = (userProfile) => {
    this.userProfile = userProfile;
    this.ttsService.setUserProfile(userProfile);
    console.log('👤 User profile set for ElevenLabs alarms:', userProfile?.username || userProfile?.display_name);
  };

  // Generate personalized alarm message - REMOVED TIME FORMATTING
  generatePersonalizedMessage = (taskData, reminderData) => {
    const userName = this.userProfile?.username || 
                     this.userProfile?.display_name || 
                     this.userProfile?.user_metadata?.display_name ||
                     'there';

    const taskTitle = taskData.title || 'your task';
    
    // DON'T format time here - use the ttsMessage that's already formatted in ReminderScheduler
    const englishMessage = `Hello ${userName}, your task ${taskTitle} is ready. Are you available?`;
    
    return englishMessage;
  };

  // Initialize notification channels (backup only)
  initializeAlarmChannels = async () => {
    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'backup_alarms',
          name: 'Backup Alarm Notifications',
          description: 'Backup notifications for native alarms',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        console.log('Backup alarm channel created');
      }
    } catch (error) {
      console.error('Error creating backup alarm channels:', error);
    }
  };

  // Schedule alarm with ElevenLabs TTS - USES PRE-FORMATTED MESSAGE
  scheduleAlarm = async (alarmData) => {
    console.log('📅 AlarmSchedulerService.scheduleAlarm called with pre-formatted ttsMessage');

    const {
      id,
      taskId,
      taskTitle,
      taskMessage,
      scheduledTime,
      type = 'alarm',
      taskData,
      userProfile,
      ttsMessage  // This is already formatted by ReminderScheduler
    } = alarmData;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (userProfile) {
        this.setUserProfile(userProfile);
      }

      if (!this.useNativeAlarms) {
        console.log('Native alarms not supported on this platform');
        return null;
      }

      const scheduledDate = new Date(scheduledTime);
      const now = new Date();

      if (scheduledDate <= now) {
        console.log('Alarm time is in the past');
        return null;
      }

      // Use the pre-formatted ttsMessage directly - NO additional formatting
      const personalizedMessage = ttsMessage || `Hello, ${this.userProfile?.username || 'there'}, you have a task reminder. Are you available?`;

      // Extract username for the native alarm
      let userName = 'there';
      if (userProfile) {
        userName = userProfile.username || 
                   userProfile.display_name || 
                   userProfile.user_metadata?.display_name ||
                   userProfile.user_metadata?.username ||
                   (userProfile.email ? userProfile.email.split('@')[0] : 'there');
      }

      console.log('🚀 Scheduling native alarm with pre-formatted message:', personalizedMessage);

      // Schedule native alarm with ElevenLabs enabled
      const alarmId = await NativeAlarmService.scheduleAlarm({
        id: id || `elevenlabs_alarm_${taskId}_${Date.now()}`,
        taskId,
        taskTitle,
        taskMessage,
        ttsMessage: personalizedMessage, // Use the pre-formatted message
        scheduledTime: scheduledDate,
        type,
        userName: userName,
        useElevenLabs: true, // CRITICAL: This enables ElevenLabs
        taskData: taskData ? JSON.stringify(taskData) : null,
        reminderData: alarmData.reminderData ? JSON.stringify(alarmData.reminderData) : null
      });

      if (alarmId) {
        // Schedule backup notification
        await this.scheduleBackupNotification({
          id: `backup_${alarmId}`,
          taskId,
          taskTitle,
          taskMessage,
          scheduledTime: scheduledDate
        });

        console.log('✅ Native alarm with ElevenLabs TTS scheduled successfully:', taskTitle);
        console.log('✅ Using pre-formatted message:', personalizedMessage);
        return alarmId;
      }

      return null;
    } catch (error) {
      console.error('Error scheduling alarm:', error);
      return null;
    }
  };

  // Play ElevenLabs TTS message
  playTTSMessage = async (taskData, reminderData = null) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('Playing ElevenLabs TTS with Hindi quote...');
      
      const success = await this.ttsService.playEnhancedAlarmSpeech(taskData, reminderData);
      
      return success;
    } catch (error) {
      console.error('Error playing ElevenLabs TTS message:', error);
      return false;
    }
  };

  // Test TTS functionality
  testTTS = async (userName = null) => {
    const testTaskData = {
      title: 'Test Task with ElevenLabs Voice',
      blockTimeData: {
        startTime: '14:30'
      }
    };

    const testReminderData = {
      type: 'alarm'
    };

    if (userName) {
      this.setUserProfile({ username: userName });
    }
    
    console.log('Testing ElevenLabs TTS with Hindi motivational quotes...');
    return await this.playTTSMessage(testTaskData, testReminderData);
  };

  // Test only Hindi quotes
  testHindiQuotes = async () => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('Testing Hindi motivational quotes...');
      return await this.ttsService.playHindiQuote();
    } catch (error) {
      console.error('Error testing Hindi quotes:', error);
      return false;
    }
  };

  // Stop TTS
  stopTTS = () => {
    try {
      this.ttsService.stopAudio();
      console.log('ElevenLabs TTS stopped');
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  };

  // Schedule backup notification
  scheduleBackupNotification = async (notificationData) => {
    const { id, taskId, taskTitle, taskMessage, scheduledTime } = notificationData;
    
    try {
      await notifee.createTriggerNotification(
        {
          id: id.toString(),
          title: `Backup: ${taskTitle}`,
          body: `${taskMessage || 'Your scheduled task reminder'}`,
          data: {
            taskId: taskId.toString(),
            type: 'backup_alarm',
            isBackup: 'true',
          },
          android: {
            channelId: 'backup_alarms',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibrate: true,
            autoCancel: true,
          },
          ios: {
            sound: 'default',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: scheduledTime.getTime(),
        }
      );
      
      console.log('Backup notification scheduled');
    } catch (error) {
      console.error('Error scheduling backup notification:', error);
    }
  };

  // Cancel alarm
  cancelAlarm = async (alarmId) => {
    try {
      if (!this.useNativeAlarms) {
        console.log('Native alarms not supported');
        return false;
      }

      const success = await NativeAlarmService.cancelAlarm(alarmId);
      
      if (success) {
        await notifee.cancelNotification(`backup_${alarmId}`);
        console.log(`Alarm cancelled: ${alarmId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error cancelling alarm:', error);
      return false;
    }
  };

  // Cancel all alarms for a specific task
  cancelTaskAlarms = async (taskId) => {
    try {
      if (!this.useNativeAlarms) {
        console.log('Native alarms not supported');
        return false;
      }

      const success = await NativeAlarmService.cancelTaskAlarms(taskId);
      
      if (success) {
        await notifee.cancelNotification(`backup_alarm_${taskId}`);
        console.log(`All alarms cancelled for task: ${taskId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error cancelling task alarms:', error);
      return false;
    }
  };

  // Snooze alarm functionality
  snoozeAlarm = async (alarmId, snoozeMinutes = 5) => {
    try {
      if (!this.useNativeAlarms) {
        console.log('Native alarms not supported');
        return false;
      }

      const success = await NativeAlarmService.snoozeAlarm(alarmId, snoozeMinutes);
      
      if (success) {
        console.log(`Alarm snoozed for ${snoozeMinutes} minutes: ${alarmId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      return false;
    }
  };

  // Schedule immediate test alarm with ElevenLabs
  scheduleTestAlarm = async (testUserName = 'Test User') => {
    console.log('🧪 Scheduling ElevenLabs test alarm...');
    
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 15);
    
    const testTaskData = {
      title: 'ElevenLabs Test Alarm',
      blockTimeData: {
        startTime: testTime.toTimeString().slice(0, 5)
      }
    };

    const testReminderData = {
      type: 'alarm',
      scheduleType: 'always'
    };

    // Set test user profile
    this.setUserProfile({ username: testUserName });

    console.log('Scheduling ElevenLabs test alarm with Hindi quotes...');
    
    return await this.scheduleAlarm({
      id: `test_elevenlabs_${Date.now()}`,
      taskId: 'test',
      taskTitle: 'ElevenLabs Test Alarm',
      taskMessage: 'Testing ElevenLabs TTS with Hindi motivational quotes',
      scheduledTime: testTime,
      type: 'alarm',
      taskData: testTaskData,
      reminderData: testReminderData,
      userProfile: { username: testUserName },
      ttsMessage: `Hello ${testUserName}, your task ElevenLabs Test Alarm is scheduled at ${testTime.toLocaleString()}. Are you available?`
    });
  };

  // Check permissions
  checkPermissions = async () => {
    if (!this.useNativeAlarms) {
      return {native: false, notifications: true};
    }

    try {
      const nativePermission = await NativeAlarmService.checkPermissionStatus();

      return {
        native: nativePermission,
        notifications: true,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {native: false, notifications: true};
    }
  };

  // Get service info
  getServiceInfo = () => {
    return {
      isInitialized: this.isInitialized,
      useNativeAlarms: this.useNativeAlarms,
      platform: Platform.OS,
      supportedFeatures: this.useNativeAlarms 
        ? ['native_alarms', 'snooze', 'backup_notifications', 'elevenlabs_tts', 'hindi_quotes', 'number_based_time']
        : ['backup_notifications_only'],
      ttsProvider: 'ElevenLabs',
      ttsFeatures: ['english_task_messages', 'hindi_motivational_quotes', 'high_quality_voice', 'number_based_time_format'],
      userProfile: this.userProfile ? {
        hasUsername: !!this.userProfile.username,
        hasDisplayName: !!this.userProfile.display_name
      } : null,
      elevenLabsInfo: this.ttsService.getServiceInfo()
    };
  };

  // Cleanup method
  cleanup = async () => {
    try {
      await this.ttsService.cleanup();
      
      // Remove event listeners
      DeviceEventEmitter.removeAllListeners('alarmTTSTriggered');
      DeviceEventEmitter.removeAllListeners('alarmTTSRepeat');
      DeviceEventEmitter.removeAllListeners('alarmTTSStop');
      DeviceEventEmitter.removeAllListeners('alarmTTSCleanup');
      DeviceEventEmitter.removeAllListeners('alarmActionTriggered');
      
      console.log('AlarmSchedulerService cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };
}

export default new AlarmSchedulerService();