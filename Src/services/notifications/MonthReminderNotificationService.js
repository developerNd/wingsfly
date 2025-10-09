import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'monthReminderNotificationLastShown';
const CHANNEL_ID = 'month_reminder';

class MonthReminderNotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the notification service
   */
  initialize = async () => {
    try {
      if (this.initialized) {
        console.log('[MONTH REMINDER NOTIF] Already initialized');
        return;
      }

      await this.requestPermissions();
      
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }
      
      this.initialized = true;
      console.log('[MONTH REMINDER NOTIF] Service initialized successfully');
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Initialization error:', error);
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
        console.log('[MONTH REMINDER NOTIF] Permissions granted');
        return true;
      } else {
        console.log('[MONTH REMINDER NOTIF] Permissions denied');
        return false;
      }
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Permission request error:', error);
      return false;
    }
  };

  /**
   * Create notification channel with custom sound
   */
  createNotificationChannel = async () => {
    try {
      // Note: The custom sound file should be placed in:
      // android/app/src/main/res/raw/noti.mp3 (or your custom sound file)
      const channelId = await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Month Reminder',
        description: 'Monthly motivational reminders',
        importance: AndroidImportance.HIGH,
        sound: 'noti', // Reference to res/raw/noti.mp3
        vibration: true,
        badge: true,
        lights: true,
        lightColor: '#FF6B6B',
      });
      
      console.log('[MONTH REMINDER NOTIF] Channel created:', channelId);
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error creating channel:', error);
    }
  };

  /**
   * Get motivational quote
   */
  getMotivationalQuote = () => {
    const quotes = [
      "Every day is a new opportunity to move closer to your goals.",
      "The secret of getting ahead is getting started.",
      "Don't watch the clock; do what it does. Keep going.",
      "Small daily improvements are the key to staggering long-term results.",
      "Your future is created by what you do today, not tomorrow.",
      "Success is the sum of small efforts repeated day in and day out.",
      "The only way to do great work is to love what you do.",
      "Believe you can and you're halfway there."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  /**
   * Get days remaining in current month
   */
  getDaysRemaining = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate() + 1;
  };

  /**
   * Get current month name
   */
  getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  /**
   * Extract display name from user data
   */
  getDisplayName = (userName) => {
    if (!userName) return 'there';
    
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
   * Check if notification should be shown today
   */
  shouldShowToday = async () => {
    try {
      const lastShownDate = await AsyncStorage.getItem(STORAGE_KEY);
      const today = new Date().toDateString();
      
      const shouldShow = lastShownDate !== today;
      
      console.log('[MONTH REMINDER NOTIF] Should show check:', {
        lastShownDate,
        today,
        shouldShow
      });
      
      return shouldShow;
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error checking last shown date:', error);
      return false;
    }
  };

  /**
   * Mark notification as shown for today
   */
  markShownToday = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEY, today);
      console.log('[MONTH REMINDER NOTIF] Marked as shown for:', today);
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error marking as shown:', error);
    }
  };

  /**
   * Show month reminder notification
   */
  showNotification = async (userName = null) => {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const shouldShow = await this.shouldShowToday();
      if (!shouldShow) {
        console.log('[MONTH REMINDER NOTIF] Already shown today, skipping');
        return false;
      }

      const daysRemaining = this.getDaysRemaining();
      const currentMonth = this.getCurrentMonth();
      const displayName = this.getDisplayName(userName);
      const quote = this.getMotivationalQuote();

      const title = `${currentMonth} - ${daysRemaining} Days Remaining`;
      const greeting = displayName ? `Hi ${displayName}! ` : '';
      const body = `${greeting}${quote}`;

      await notifee.displayNotification({
        title: title,
        body: body,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          sound: 'noti', // Custom sound
          vibrate: true,
          pressAction: {
            id: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
          color: '#FF6B6B',
          smallIcon: 'ic_launcher', // Default Android launcher icon
        },
        ios: {
          sound: 'noti.wav', // For iOS, place sound in ios/YourApp/Resources/noti.wav
          critical: false,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });

      await this.markShownToday();
      
      console.log('[MONTH REMINDER NOTIF] Notification displayed successfully', {
        daysRemaining,
        currentMonth,
        displayName
      });

      return true;
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error showing notification:', error);
      return false;
    }
  };

  /**
   * Reset notification status (for testing)
   */
  resetStatus = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[MONTH REMINDER NOTIF] Status reset successfully');
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error resetting status:', error);
    }
  };

  /**
   * Get current status (for debugging)
   */
  getStatus = async () => {
    try {
      const lastShownDate = await AsyncStorage.getItem(STORAGE_KEY);
      const today = new Date().toDateString();
      const shouldShow = lastShownDate !== today;
      
      return {
        lastShownDate,
        today,
        shouldShow,
        daysRemaining: this.getDaysRemaining(),
        currentMonth: this.getCurrentMonth()
      };
    } catch (error) {
      console.error('[MONTH REMINDER NOTIF] Error getting status:', error);
      return null;
    }
  };
}

export default new MonthReminderNotificationService();