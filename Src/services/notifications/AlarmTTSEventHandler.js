// AlarmTTSEventHandler.js - Connect Android alarms with ElevenLabs TTS
import { DeviceEventEmitter } from 'react-native';
import EnhancedTTSService from './EnhancedTTSService';

class AlarmTTSEventHandler {
  constructor() {
    this.isListening = false;
    this.eventSubscriptions = [];
  }

  // Start listening for alarm TTS events from Android
  startListening = () => {
    if (this.isListening) {
      return;
    }

    console.log('Starting AlarmTTSEventHandler...');

    // Listen for alarm TTS triggers from AlarmActivity
    const alarmTTSSubscription = DeviceEventEmitter.addListener(
      'alarmTTSTriggered',
      this.handleAlarmTTSTriggered
    );

    // Listen for TTS repeat requests
    const repeatSubscription = DeviceEventEmitter.addListener(
      'alarmTTSRepeat',
      this.handleAlarmTTSRepeat
    );

    // Listen for TTS stop requests
    const stopSubscription = DeviceEventEmitter.addListener(
      'alarmTTSStop',
      this.handleAlarmTTSStop
    );

    // Listen for TTS cleanup requests
    const cleanupSubscription = DeviceEventEmitter.addListener(
      'alarmTTSCleanup',
      this.handleAlarmTTSCleanup
    );

    // Listen for alarm actions (snoozed, stopped, dismissed)
    const actionSubscription = DeviceEventEmitter.addListener(
      'alarmActionTriggered',
      this.handleAlarmAction
    );

    this.eventSubscriptions = [
      alarmTTSSubscription,
      repeatSubscription,
      stopSubscription,
      cleanupSubscription,
      actionSubscription
    ];

    this.isListening = true;
    console.log('AlarmTTSEventHandler started successfully');
  };

  // Stop listening for events
  stopListening = () => {
    if (!this.isListening) {
      return;
    }

    this.eventSubscriptions.forEach(subscription => {
      subscription.remove();
    });

    this.eventSubscriptions = [];
    this.isListening = false;
    
    console.log('AlarmTTSEventHandler stopped');
  };

  // Handle alarm TTS triggered from Android
  handleAlarmTTSTriggered = async (eventData) => {
    try {
      console.log('🎵 Alarm TTS triggered from Android:', eventData);
      
      const {
        alarmId,
        taskTitle,
        taskMessage,
        ttsMessage,
        userName,
        useElevenLabs,
        taskData,
        reminderData
      } = eventData;

      if (!useElevenLabs) {
        console.log('ElevenLabs not enabled for this alarm');
        return;
      }

      // Parse task data and reminder data if available
      let parsedTaskData = null;
      let parsedReminderData = null;

      try {
        if (taskData) {
          parsedTaskData = JSON.parse(taskData);
        }
        if (reminderData) {
          parsedReminderData = JSON.parse(reminderData);
        }
      } catch (parseError) {
        console.warn('Error parsing task/reminder data:', parseError);
      }

      // Create task data object for TTS service
      const taskDataForTTS = parsedTaskData || {
        title: taskTitle,
        blockTimeData: {
          startTime: new Date().toTimeString().slice(0, 5) // Current time as fallback
        }
      };

      // Set user profile if available
      if (userName) {
        EnhancedTTSService.setUserProfile({ username: userName });
      }

      console.log('Playing enhanced alarm speech with ElevenLabs...');
      console.log('Task:', taskDataForTTS.title);
      console.log('User:', userName);

      // Play enhanced alarm speech (English task + Hindi quote)
      const success = await EnhancedTTSService.playEnhancedAlarmSpeech(
        taskDataForTTS,
        parsedReminderData
      );

      if (success) {
        console.log('✅ ElevenLabs alarm speech played successfully');
      } else {
        console.error('❌ ElevenLabs alarm speech failed');
      }

    } catch (error) {
      console.error('Error handling alarm TTS triggered:', error);
    }
  };

  // Handle TTS repeat request
  handleAlarmTTSRepeat = async (eventData) => {
    try {
      console.log('🔄 Alarm TTS repeat requested:', eventData);
      
      // For repeat, we can use the last played message or generate a new one
      // Since we don't have the original data, we'll create a simple repeat
      const hindiQuote = EnhancedTTSService.getRandomHindiQuote();
      
      console.log('Repeating Hindi motivational quote...');
      const success = await EnhancedTTSService.playHindiQuote();
      
      if (success) {
        console.log('✅ Hindi quote repeated successfully');
      } else {
        console.error('❌ Hindi quote repeat failed');
      }

    } catch (error) {
      console.error('Error handling TTS repeat:', error);
    }
  };

  // Handle TTS stop request
  handleAlarmTTSStop = (eventData) => {
    try {
      console.log('⏹️ Alarm TTS stop requested:', eventData);
      
      EnhancedTTSService.stopAudio();
      console.log('TTS stopped successfully');

    } catch (error) {
      console.error('Error handling TTS stop:', error);
    }
  };

  // Handle TTS cleanup request
  handleAlarmTTSCleanup = async (eventData) => {
    try {
      console.log('🧹 Alarm TTS cleanup requested:', eventData);
      
      await EnhancedTTSService.cleanup();
      console.log('TTS cleanup completed');

    } catch (error) {
      console.error('Error handling TTS cleanup:', error);
    }
  };

  // Handle alarm actions (snoozed, stopped, dismissed)
  handleAlarmAction = (eventData) => {
    try {
      console.log('⚡ Alarm action triggered:', eventData);
      
      const { action, alarmId, taskId } = eventData;
      
      // Stop any playing TTS when alarm is actioned
      EnhancedTTSService.stopAudio();
      
      // You can add additional logic here based on the action
      switch (action) {
        case 'snoozed':
          console.log(`Alarm ${alarmId} was snoozed`);
          // Could play a confirmation message
          this.playSnoozeConfirmation();
          break;
        case 'stopped':
          console.log(`Alarm ${alarmId} was stopped`);
          break;
        case 'dismissed':
          console.log(`Alarm ${alarmId} was dismissed`);
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('Error handling alarm action:', error);
    }
  };

  // Play snooze confirmation message
  playSnoozeConfirmation = async () => {
    try {
      // Get user profile for personalized confirmation
      const userProfile = EnhancedTTSService.userProfile;
      const userName = userProfile?.username || userProfile?.display_name || 'there';
      
      const confirmationMessage = `Okay ${userName}, I'll remind you again in 5 minutes.`;
      
      // Generate and play confirmation using ElevenLabs
      const audioFilePath = await EnhancedTTSService.generateSpeech(
        confirmationMessage, 
        `snooze_confirm_${Date.now()}.mp3`
      );
      
      await EnhancedTTSService.playAudioFile(audioFilePath);
      
      // Clean up file after delay
      setTimeout(() => {
        require('rn-fetch-blob').fs.unlink(audioFilePath).catch(console.error);
      }, 3000);
      
      console.log('Snooze confirmation played');
    } catch (error) {
      console.error('Error playing snooze confirmation:', error);
    }
  };

  // Test the event handler
  testEventHandler = async () => {
    try {
      console.log('Testing AlarmTTSEventHandler...');
      
      // Simulate an alarm TTS trigger event
      const testEventData = {
        alarmId: 'test_alarm_123',
        taskTitle: 'Test Task with ElevenLabs',
        taskMessage: 'This is a test alarm message',
        ttsMessage: 'Hello Test User, your task is ready',
        userName: 'Test User',
        useElevenLabs: true,
        taskData: JSON.stringify({
          title: 'Test Task with ElevenLabs',
          blockTimeData: {
            startTime: '14:30'
          }
        }),
        reminderData: JSON.stringify({
          type: 'alarm'
        })
      };
      
      await this.handleAlarmTTSTriggered(testEventData);
      console.log('Event handler test completed');
      
    } catch (error) {
      console.error('Error testing event handler:', error);
    }
  };

  // Get event handler status
  getStatus = () => {
    return {
      isListening: this.isListening,
      subscriptionsCount: this.eventSubscriptions.length,
      ttsServiceInfo: EnhancedTTSService.getServiceInfo()
    };
  };
}

export default new AlarmTTSEventHandler();