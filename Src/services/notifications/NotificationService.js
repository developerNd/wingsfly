import notifee, { TriggerType, AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.lastId = 0;
    this.navigationRef = null;
    this.initialize();
  }

  // Set navigation reference
  setNavigationRef = (navigationRef) => {
    this.navigationRef = navigationRef;
    console.log('Navigation ref set in NotificationService:', !!navigationRef);
  };

  // Initialize the service with enhanced alarm channels
  initialize = async () => {
    try {
      await this.requestPermissions();
      
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      } else if (Platform.OS === 'ios') {
        await this.createIOSCategories();
      }
      
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Error initializing NotificationService:', error);
    }
  };

  // Request notification permissions
  requestPermissions = async () => {
    try {
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        announcement: true,
        carPlay: true,
        criticalAlert: true,
        provisional: false,
      });
      
      if (settings.authorizationStatus >= 1) {
        console.log('Notification permissions granted');
        return true;
      } else {
        console.log('Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  // Create enhanced notification channels for Android
  createNotificationChannels = async () => {
    try {
      // Regular notifications channel
      const reminderChannelId = await notifee.createChannel({
        id: 'task_reminders',
        name: 'Task Reminders',
        description: 'Notifications for task reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
      
      // Critical alarm channel with maximum settings
      const alarmChannelId = await notifee.createChannel({
        id: 'task_alarms',
        name: 'Task Alarms',
        description: 'Critical alarm notifications for tasks',
        importance: AndroidImportance.MAX,
        sound: 'alarm',
        vibration: true,
        badge: true,
        lights: true,
        lightColor: '#FF0000',
        bypassDnd: true, // Bypass Do Not Disturb
      });
      
      console.log('Notification channels created:', { reminderChannelId, alarmChannelId });
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  };

  // Create iOS notification categories
  createIOSCategories = async () => {
    try {
      await notifee.setNotificationCategories([
        {
          id: 'task_reminder',
          actions: [
            {
              id: 'confirm_yes',
              title: 'Yes',
            },
            {
              id: 'confirm_no',
              title: 'No',
            },
          ],
        },
        {
          id: 'task_alarm',
          actions: [
            {
              id: 'open_alarm',
              title: 'Open Alarm',
            },
            {
              id: 'alarm_snooze',
              title: 'Snooze 5min',
            },
            {
              id: 'alarm_stop',
              title: 'Stop',
            },
          ],
        },
      ]);
      
      console.log('iOS notification categories created');
    } catch (error) {
      console.error('Error creating iOS categories:', error);
    }
  };

  // Schedule a regular notification
  scheduleNotification = async (notificationData) => {
    const {
      id,
      title,
      message,
      date,
      taskId,
      type = 'notification',
    } = notificationData;

    try {
      const channelId = 'task_reminders';
      
      const notificationId = await notifee.createTriggerNotification(
        {
          id: id.toString(),
          title: title,
          body: `${message} - Please confirm if you're available or not.`,
          data: {
            taskId: taskId.toString(),
            type: type,
          },
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibrate: true,
            pressAction: {
              id: 'default',
            },
            actions: [
              {
                title: 'Yes',
                pressAction: {
                  id: 'confirm_yes',
                },
              },
              {
                title: 'No',
                pressAction: {
                  id: 'confirm_no',
                },
              },
            ],
          },
          ios: {
            sound: 'default',
            categoryId: 'task_reminder',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
        }
      );

      console.log(`Notification scheduled for: ${date} with ID: ${notificationId}`);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  // Schedule critical alarm notification
  scheduleAlarm = async (notificationData) => {
    const {
      id,
      title,
      message,
      date,
      taskId,
    } = notificationData;

    try {
      const notificationId = await notifee.createTriggerNotification(
        {
          id: id.toString(),
          title: `⏰ ${title}`,
          body: `${message} - Tap to open alarm`,
          data: {
            taskId: taskId.toString(),
            taskTitle: title,
            taskMessage: message,
            type: 'alarm',
            isAlarm: 'true',
            notificationId: id.toString(),
          },
          android: {
            channelId: 'task_alarms',
            importance: AndroidImportance.MAX,
            sound: 'alarm',
            vibrate: [500, 500, 500, 500], // Custom vibration pattern
            lights: ['#FF0000', 1000, 500],
            fullScreenIntent: true,
            autoCancel: false,
            ongoing: false,
            category: 'alarm',
            visibility: 1, // VISIBILITY_PRIVATE
            showWhen: true,
            pressAction: {
              id: 'open_alarm',
            },
            actions: [
              {
                title: 'Open',
                pressAction: {
                  id: 'open_alarm',
                },
              },
              {
                title: 'Snooze',
                pressAction: {
                  id: 'alarm_snooze_full',
                },
              },
              {
                title: 'Stop',
                pressAction: {
                  id: 'alarm_stop_full',
                },
              },
            ],
          },
          ios: {
            sound: 'alarm.wav',
            categoryId: 'task_alarm',
            critical: true,
            criticalVolume: 1.0,
            interruptionLevel: 'critical',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
        }
      );

      console.log(`Alarm notification scheduled for: ${date} with ID: ${notificationId}`);
      return id;
    } catch (error) {
      console.error('Error scheduling alarm notification:', error);
      return null;
    }
  };

  // Display immediate critical notification (for fallback)
  displayCriticalNotification = async (notificationData) => {
    const { id, title, message, taskId, alarmId } = notificationData;

    try {
      await notifee.displayNotification({
        id: id.toString(),
        title: `🚨 ${title}`,
        body: `${message} - Tap to open alarm`,
        data: {
          taskId: taskId.toString(),
          taskTitle: title,
          taskMessage: message,
          type: 'alarm',
          isAlarm: 'true',
          alarmId: alarmId,
        },
        android: {
          channelId: 'task_alarms',
          importance: AndroidImportance.MAX,
          sound: 'alarm',
          vibrate: true,
          fullScreenIntent: true,
          autoCancel: false,
          ongoing: false,
          category: 'alarm',
          visibility: 1,
          showWhen: true,
          pressAction: {
            id: 'open_alarm',
          },
          actions: [
            {
              title: 'Open',
              pressAction: {
                id: 'open_alarm',
              },
            },
            {
              title: 'Snooze',
              pressAction: {
                id: 'alarm_snooze_full',
              },
            },
            {
              title: 'Stop',
              pressAction: {
                id: 'alarm_stop_full',
              },
            },
          ],
        },
        ios: {
          sound: 'alarm.wav',
          categoryId: 'task_alarm',
          critical: true,
          criticalVolume: 1.0,
          interruptionLevel: 'critical',
        },
      });

      console.log('Critical notification displayed');
      return id;
    } catch (error) {
      console.error('Error displaying critical notification:', error);
      return null;
    }
  };

  // Cancel a specific notification
  cancelNotification = async (notificationId) => {
    try {
      await notifee.cancelNotification(notificationId.toString());
      console.log(`Notification ${notificationId} cancelled`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  // Cancel all notifications for a task
  cancelTaskNotifications = async (taskId) => {
    try {
      const notifications = await notifee.getTriggerNotifications();
      
      const taskNotifications = notifications.filter(
        notification => notification.notification.data?.taskId === taskId.toString()
      );
      
      for (const notification of taskNotifications) {
        await notifee.cancelNotification(notification.notification.id);
      }
      
      console.log(`Cancelled ${taskNotifications.length} notifications for task: ${taskId}`);
    } catch (error) {
      console.error('Error cancelling task notifications:', error);
    }
  };

  // Cancel all notifications
  cancelAllNotifications = async () => {
    try {
      await notifee.cancelAllNotifications();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  };

  // Get next notification ID
  getNextId = () => {
    this.lastId += 1;
    return this.lastId;
  };

  // Check scheduled notifications
  checkDueNotifications = async () => {
    try {
      const notifications = await notifee.getTriggerNotifications();
      console.log(`${notifications.length} notifications scheduled`);
      return notifications;
    } catch (error) {
      console.error('Error checking notifications:', error);
      return [];
    }
  };

  // Get displayed notifications
  getDisplayedNotifications = async () => {
    try {
      const notifications = await notifee.getDisplayedNotifications();
      console.log(`${notifications.length} notifications currently displayed`);
      return notifications;
    } catch (error) {
      console.error('Error getting displayed notifications:', error);
      return [];
    }
  };
}

export default new NotificationService();