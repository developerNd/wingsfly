import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppState, DeviceEventEmitter } from 'react-native';
import { AuthProvider, useAuth } from './Src/contexts/AuthContext';
import AuthNavigator from './Src/Navigation/AuthNavigator';
import NotificationService from './Src/services/notifications/NotificationService';
import AlarmSchedulerService from './Src/services/notifications/AlarmSchedulerService';
import NativeAlarmService from './Src/services/notifications/NativeAlarmService';
import EnhancedTTSService from './Src/services/notifications/EnhancedTTSService';
import AlarmTTSEventHandler from './Src/services/notifications/AlarmTTSEventHandler';
import { taskBlockingBackgroundService } from './Src/services/AppBlocking/TaskBlockingBackgroundService';

// Task Blocking Service Manager - Lightweight version
const TaskBlockingServiceManager = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[DEBUG] TaskBlockingServiceManager useEffect triggered with user:', user?.id);
    
    if (!user) {
      console.log('[DEBUG] No user available, skipping initialization');
      return;
    }

    // Initialize the background service when user is available
    const initializeTaskBlocking = async () => {
      try {
        console.log('[DEBUG] Initializing Task Blocking Background Service for user:', user.id);
        
        const initialized = await taskBlockingBackgroundService.initialize(user.id);
        
        if (initialized) {
          console.log('[DEBUG] Task Blocking Background Service initialized successfully');
          
          // Log the service status after initialization
          const status = taskBlockingBackgroundService.getStatus();
          console.log('[DEBUG] Service status after initialization:', status);
        } else {
          console.warn('[DEBUG] Task Blocking Background Service failed to initialize');
        }
      } catch (error) {
        console.error('[DEBUG] Error initializing Task Blocking Background Service:', error);
      }
    };

    initializeTaskBlocking();

    // Cleanup when user changes or component unmounts
    return () => {
      console.log('[DEBUG] TaskBlockingServiceManager cleanup triggered');
      taskBlockingBackgroundService.cleanup().catch(error => 
        console.error('[DEBUG] Error during task blocking service cleanup:', error)
      );
    };
  }, [user?.id]); // Changed dependency to user?.id to be more specific

  return null; // This component doesn't render anything
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize services - Enhanced with ElevenLabs TTS
    const initializeServices = async () => {
      try {
        console.log('Initializing enhanced services with ElevenLabs TTS...');
        
        // Initialize notification service (for backup notifications only)
        await NotificationService.initialize();
        console.log('NotificationService initialized');
        
        // Initialize native alarm service (primary alarm system)
        await NativeAlarmService.initialize();
        console.log('NativeAlarmService initialized');
        
        // NEW: Initialize ElevenLabs TTS service
        await EnhancedTTSService.initialize();
        console.log('EnhancedTTSService (ElevenLabs) initialized');
        
        // Initialize alarm scheduler service (manages native alarms with ElevenLabs)
        await AlarmSchedulerService.initialize();
        console.log('AlarmSchedulerService with ElevenLabs initialized');
        
        // NEW: Start listening for alarm TTS events from Android
        AlarmTTSEventHandler.startListening();
        console.log('AlarmTTSEventHandler started listening');
        
        // Set user profile for personalized messages if user is available
        if (user) {
          const userProfile = {
            username: user.user_metadata?.username || user.user_metadata?.display_name,
            display_name: user.user_metadata?.display_name || user.user_metadata?.full_name,
            email: user.email,
            user_metadata: user.user_metadata
          };
          
          AlarmSchedulerService.setUserProfile(userProfile);
          EnhancedTTSService.setUserProfile(userProfile);
          console.log('User profile set for personalized ElevenLabs TTS:', userProfile.username || userProfile.display_name);
        }
        
        console.log('All services initialized successfully - Native alarms with ElevenLabs TTS enabled');
        
        // Log service information
        const serviceInfo = AlarmSchedulerService.getServiceInfo();
        console.log('Enhanced Alarm System Info:', serviceInfo);
        
      } catch (error) {
        console.error('Error initializing enhanced services:', error);
      }
    };
    
    initializeServices();

    // Handle app state changes - Enhanced for alarms, TTS, and task blocking
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background') {
        console.log('App went to background - TTS may continue playing');
      } else if (nextAppState === 'active') {
        console.log('App became active');
        
        // Cleanup expired alarms when app becomes active
        setTimeout(() => {
          NativeAlarmService.loadStoredAlarms();
        }, 100);
        
        // Check if any TTS cleanup is needed
        setTimeout(() => {
          EnhancedTTSService.cleanup().catch(console.error);
        }, 500);
      }
    };

    // Enhanced native alarm event handler
    const handleNativeAlarmResult = (result) => {
      console.log('Native alarm action received:', result);
      
      // Handle alarm actions from native module
      const { action, alarmId, taskId, snoozeMinutes } = result;
      
      switch (action) {
        case 'dismissed':
          console.log(`Alarm ${alarmId} dismissed`);
          // Stop any playing TTS
          EnhancedTTSService.stopAudio();
          break;
        case 'snoozed':
          console.log(`Alarm ${alarmId} snoozed for ${snoozeMinutes} minutes`);
          // TTS confirmation will be handled by the alarm activity
          break;
        case 'stopped':
          console.log(`Alarm ${alarmId} stopped`);
          // Stop any playing TTS
          EnhancedTTSService.stopAudio();
          break;
        case 'opened':
          console.log(`Alarm ${alarmId} opened task ${taskId}`);
          // You can navigate to task details here if needed
          break;
        default:
          console.log('Unknown alarm action:', action);
      }
    };

    // Enhanced notification action handler
    const handleNotificationAction = async (action) => {
      console.log('Notification action received:', action);
      
      const { type, pressAction, notification } = action;
      
      if (notification?.data?.isBackup === 'true') {
        console.log('Backup notification action:', pressAction?.id);
        
        switch (pressAction?.id) {
          case 'open_task':
            // Navigate to task if needed
            console.log('Opening task from backup notification');
            break;
          case 'dismiss':
            // Dismiss notification
            await NotificationService.cancelNotification(notification.id);
            break;
          case 'open_alarm':
            // This could trigger a fallback alarm screen if needed
            console.log('Opening alarm from backup notification');
            break;
        }
      }
    };

    // NEW: Handle TTS events from Android alarm activity
    const handleAlarmTTSEvents = () => {
      // These are handled by AlarmTTSEventHandler, but we can add additional logic here
      console.log('TTS event handlers are active');
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    const alarmResultListener = DeviceEventEmitter.addListener('NativeAlarmResult', handleNativeAlarmResult);
    
    // Listen for notification actions
    NotificationService.setForegroundEventListener?.(handleNotificationAction);
    NotificationService.setBackgroundEventListener?.(handleNotificationAction);

    // Initialize TTS event handling
    handleAlarmTTSEvents();

    // Cleanup function
    return () => {
      appStateSubscription?.remove();
      alarmResultListener?.remove();
      
      // NEW: Stop TTS event handler
      AlarmTTSEventHandler.stopListening();
      
      // Cleanup TTS service
      EnhancedTTSService.cleanup().catch(console.error);
      
      console.log('App cleanup completed - including ElevenLabs TTS');
    };
  }, [user]); // Include user dependency for profile setup

  // NEW: Test functions for ElevenLabs integration (can be called from debug menu or settings)
  const testElevenLabsIntegration = async () => {
    try {
      console.log('Testing ElevenLabs integration...');
      
      // Test TTS service directly
      const ttsSuccess = await EnhancedTTSService.testTTS(
        user?.user_metadata?.username || user?.user_metadata?.display_name || 'Test User'
      );
      
      if (ttsSuccess) {
        console.log('ElevenLabs TTS test successful - should hear English + Hindi');
      }
      
      // Test alarm scheduler
      const alarmSuccess = await AlarmSchedulerService.testTTS(
        user?.user_metadata?.username || 'Test User'
      );
      
      if (alarmSuccess) {
        console.log('Alarm scheduler TTS test successful');
      }
      
      // Test event handler
      await AlarmTTSEventHandler.testEventHandler();
      
      return { ttsSuccess, alarmSuccess };
    } catch (error) {
      console.error('Error testing ElevenLabs integration:', error);
      return { ttsSuccess: false, alarmSuccess: false };
    }
  };

  // NEW: Test only Hindi quotes
  const testHindiQuotes = async () => {
    try {
      console.log('Testing Hindi motivational quotes...');
      const success = await AlarmSchedulerService.testHindiQuotes();
      
      if (success) {
        console.log('Hindi quotes test successful - should hear Hindi motivation');
      }
      
      return success;
    } catch (error) {
      console.error('Error testing Hindi quotes:', error);
      return false;
    }
  };

  return (
    <>
      <AuthNavigator />
      {/* Task blocking service manager runs in background - no UI impact */}
      <TaskBlockingServiceManager />
      {/* 
        Note: You can add a debug/settings screen that calls:
        - testElevenLabsIntegration() to test full system
        - testHindiQuotes() to test Hindi quotes only
        - AlarmSchedulerService.getServiceInfo() to see system status
      */}
    </>
  );
};

// NEW: Global functions for testing (can be called from anywhere in the app)
export const testEnhancedAlarmSystem = async () => {
  try {
    console.log('Testing complete enhanced alarm system...');
    
    // Test ElevenLabs TTS
    const ttsTest = await EnhancedTTSService.testTTS('Demo User');
    console.log('TTS Test Result:', ttsTest);
    
    // Test alarm scheduling with ElevenLabs
    const alarmTest = await AlarmSchedulerService.testTTS('Demo User');
    console.log('Alarm Test Result:', alarmTest);
    
    // Test Hindi quotes only
    const hindiTest = await AlarmSchedulerService.testHindiQuotes();
    console.log('Hindi Test Result:', hindiTest);
    
    // Get system info
    const systemInfo = AlarmSchedulerService.getServiceInfo();
    console.log('System Info:', systemInfo);
    
    return {
      ttsTest,
      alarmTest, 
      hindiTest,
      systemInfo
    };
  } catch (error) {
    console.error('Error testing enhanced alarm system:', error);
    return null;
  }
};

// NEW: Schedule an enhanced alarm with ElevenLabs (can be called from task creation)
export const scheduleEnhancedTaskAlarm = async (taskData, reminderData, userProfile) => {
  try {
    const alarmData = {
      id: `enhanced_${taskData.id}_${Date.now()}`,
      taskId: taskData.id,
      taskTitle: taskData.title,
      taskMessage: `Your task "${taskData.title}" is ready`,
      scheduledTime: new Date(reminderData.scheduledTime),
      type: 'alarm',
      taskData: taskData,
      userProfile: userProfile,
      reminderData: reminderData
    };

    const alarmId = await AlarmSchedulerService.scheduleAlarm(alarmData);
    
    if (alarmId) {
      console.log(`Enhanced alarm scheduled: ${alarmId}`);
      console.log('Will play English task message + Hindi motivational quote');
    }
    
    return alarmId;
  } catch (error) {
    console.error('Error scheduling enhanced task alarm:', error);
    return null;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}