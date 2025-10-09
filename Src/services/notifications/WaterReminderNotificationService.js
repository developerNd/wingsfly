import notifee, {
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  RepeatFrequency,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const STORAGE_KEY = 'waterReminderNotificationEnabled';
const CHANNEL_ID = 'water_reminder';
const NOTIFICATION_ID = 'water_reminder_hourly';

class WaterReminderNotificationService {
  constructor() {
    this.initialized = false;
    this.scheduledNotifications = [];
  }

  /**
   * Initialize the notification service
   */
  initialize = async () => {
    try {
      if (this.initialized) {
        console.log('[WATER REMINDER NOTIF] Already initialized');
        return;
      }

      await this.requestPermissions();

      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      this.initialized = true;
      console.log('[WATER REMINDER NOTIF] Service initialized successfully');

      // Check if reminders were enabled before and reschedule
      // Don't auto-schedule here - let WaterReminderManager handle it with user name
      console.log(
        '[WATER REMINDER NOTIF] Initialization complete - ready for scheduling',
      );
    } catch (error) {
      console.error('[WATER REMINDER NOTIF] Initialization error:', error);
    }
  };

  /**
   * Request notification permissions
   */
  requestPermissions = async () => {
    try {
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        announcement: true,
      });

      if (settings.authorizationStatus >= 1) {
        console.log('[WATER REMINDER NOTIF] Permissions granted');
        return true;
      } else {
        console.log('[WATER REMINDER NOTIF] Permissions denied');
        return false;
      }
    } catch (error) {
      console.error('[WATER REMINDER NOTIF] Permission request error:', error);
      return false;
    }
  };

  /**
   * Create notification channel with custom sound
   */
  createNotificationChannel = async () => {
    try {
      const channelId = await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Water Reminder',
        description: 'Hourly water drinking reminders',
        importance: AndroidImportance.HIGH,
        sound: 'noti', // Reference to res/raw/noti.mp3
        vibration: true,
        badge: true,
        lights: true,
        lightColor: '#4A90E2',
      });

      console.log('[WATER REMINDER NOTIF] Channel created:', channelId);
    } catch (error) {
      console.error('[WATER REMINDER NOTIF] Error creating channel:', error);
    }
  };

  /**
   * Get water reminder messages (rotates through different messages)
   */
  getWaterReminderMessage = () => {
    const messages = [
      'Time to hydrate! 💧 Drink a glass of water.',
      'Stay hydrated! Your body needs water. 🥤',
      'Reminder: Drink water to stay energized! 💪',
      'Hydration check! Have you had water recently? 💦',
      'Your health matters! Take a water break. 🌊',
      'Keep your body happy - drink some water! 😊',
      'Stay fresh and hydrated! Time for water. 🌟',
      'Water break! Your body will thank you. ❤️',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  /**
   * Get personalized greeting
   */
  getGreeting = userName => {
    if (!userName) return '';

    const displayName = this.getDisplayName(userName);
    const hour = new Date().getHours();

    let greeting = '';
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    return `${greeting}, ${displayName}!`;
  };

  /**
   * Extract display name from user data
   */
  getDisplayName = userName => {
    if (!userName) return '';

    // If it's an email, extract the part before @
    if (userName.includes('@')) {
      userName = userName.split('@')[0];
    }

    // Split by common separators and get first part
    const firstName = userName.split(/[._\s-]/)[0];

    // Capitalize first letter
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  /**
   * Schedule hourly reminders from 7 AM to 7 PM
   */
  scheduleHourlyReminders = async (userName = null) => {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Cancel all existing water reminder notifications
      // Cancel all existing water reminder notifications (without disabling)
      for (let hour = 7; hour <= 19; hour++) {
        const notificationId = `${NOTIFICATION_ID}_${hour}`;
        await notifee.cancelNotification(notificationId);
      }
      this.scheduledNotifications = [];

      const scheduledIds = [];

      // Schedule for each hour from 7 AM to 7 PM (7, 8, 9, ..., 19)
      for (let hour = 7; hour <= 19; hour++) {
        const notificationId = `${NOTIFICATION_ID}_${hour}`;

        // Create a date for the trigger time
        const now = new Date();
        const triggerDate = new Date();
        triggerDate.setHours(hour, 0, 0, 0);

        // If the time has passed today, schedule for tomorrow
        if (triggerDate <= now) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }

        const message = this.getWaterReminderMessage();
        const greeting = userName ? this.getGreeting(userName) : '';
        const body = greeting ? `${greeting} ${message}` : message;

        const trigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerDate.getTime(),
          repeatFrequency: RepeatFrequency.DAILY,
        };

        await notifee.createTriggerNotification(
          {
            id: notificationId,
            title: '💧 Water Reminder',
            body: body,
            android: {
              channelId: CHANNEL_ID,
              importance: AndroidImportance.HIGH,
              sound: 'noti',
              pressAction: {
                id: 'default',
              },
              style: {
                type: AndroidStyle.BIGTEXT,
                text: body,
              },
              color: '#4A90E2',
              smallIcon: 'ic_launcher',
            },
            ios: {
              sound: 'noti.wav',
              foregroundPresentationOptions: {
                alert: true,
                badge: true,
                sound: true,
              },
            },
          },
          trigger,
        );

        scheduledIds.push(notificationId);
        console.log(
          `[WATER REMINDER NOTIF] Scheduled for ${hour}:00 - ID: ${notificationId}`,
        );
      }

      this.scheduledNotifications = scheduledIds;
      await this.setEnabled(true);

      console.log(
        '[WATER REMINDER NOTIF] All hourly reminders scheduled successfully',
      );
      return true;
    } catch (error) {
      console.error(
        '[WATER REMINDER NOTIF] Error scheduling reminders:',
        error,
      );
      return false;
    }
  };

  /**
   * Cancel all water reminder notifications
   */
  cancelAllReminders = async () => {
    try {
      // Cancel all trigger notifications for water reminders
      for (let hour = 7; hour <= 19; hour++) {
        const notificationId = `${NOTIFICATION_ID}_${hour}`;
        await notifee.cancelNotification(notificationId);
      }

      this.scheduledNotifications = [];
      await this.setEnabled(false);

      console.log('[WATER REMINDER NOTIF] All reminders cancelled');
      return true;
    } catch (error) {
      console.error(
        '[WATER REMINDER NOTIF] Error cancelling reminders:',
        error,
      );
      return false;
    }
  };

  /**
   * Check if water reminders are enabled
   */
  isEnabled = async () => {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error(
        '[WATER REMINDER NOTIF] Error checking enabled status:',
        error,
      );
      return false;
    }
  };

  /**
   * Set enabled status
   */
  setEnabled = async enabled => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
      console.log('[WATER REMINDER NOTIF] Enabled status set to:', enabled);
    } catch (error) {
      console.error(
        '[WATER REMINDER NOTIF] Error setting enabled status:',
        error,
      );
    }
  };

  /**
   * Toggle water reminders on/off
   */
  toggleReminders = async (userName = null) => {
    try {
      const currentlyEnabled = await this.isEnabled();

      if (currentlyEnabled) {
        await this.cancelAllReminders();
        console.log('[WATER REMINDER NOTIF] Reminders disabled');
        return false;
      } else {
        await this.scheduleHourlyReminders(userName);
        console.log('[WATER REMINDER NOTIF] Reminders enabled');
        return true;
      }
    } catch (error) {
      console.error('[WATER REMINDER NOTIF] Error toggling reminders:', error);
      return false;
    }
  };

  /**
   * Get current status (for debugging)
   */
  getStatus = async () => {
    try {
      const enabled = await this.isEnabled();
      const triggerNotifications = await notifee.getTriggerNotifications();
      const waterNotifications = triggerNotifications.filter(
        n => n.notification.id && n.notification.id.startsWith(NOTIFICATION_ID),
      );

      return {
        enabled,
        scheduledCount: waterNotifications.length,
        scheduledHours: waterNotifications.map(n => {
          const hour = n.notification.id.split('_').pop();
          return `${hour}:00`;
        }),
        nextTrigger:
          waterNotifications.length > 0
            ? new Date(waterNotifications[0].trigger.timestamp).toLocaleString()
            : null,
      };
    } catch (error) {
      console.error('[WATER REMINDER NOTIF] Error getting status:', error);
      return null;
    }
  };

  /**
   * Test notification (shows immediately)
   */
  testNotification = async (userName = null) => {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const message = this.getWaterReminderMessage();
      const greeting = userName ? this.getGreeting(userName) : '';
      const body = greeting ? `${greeting} ${message}` : message;

      await notifee.displayNotification({
        title: '💧 Water Reminder (Test)',
        body: body,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          sound: 'noti',
          pressAction: {
            id: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
          color: '#4A90E2',
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: 'noti.wav',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });

      console.log('[WATER REMINDER NOTIF] Test notification displayed');
      return true;
    } catch (error) {
      console.error(
        '[WATER REMINDER NOTIF] Error showing test notification:',
        error,
      );
      return false;
    }
  };
}

export default new WaterReminderNotificationService();
