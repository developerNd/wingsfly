import { NativeModules, Platform } from 'react-native';

const { CustomAlarmModule } = NativeModules;

class CustomAlarmService {
  constructor() {
    this.isAndroid = Platform.OS === 'android';
    this.scheduledAlarms = new Map();
  }

  /**
   * Schedule a custom alarm with tone support
   * @param {Object} alarmData - The alarm data
   * @returns {Promise<Object>} - Result with alarm info
   */
  async scheduleAlarm(alarmData) {
    try {
      if (!this.isAndroid) {
        throw new Error('Custom alarms are only supported on Android');
      }

      if (!CustomAlarmModule) {
        throw new Error('CustomAlarmModule not available');
      }

      // Validate required fields
      this.validateAlarmData(alarmData);

      // Prepare alarm data for native module - ENSURE ALL IDs ARE STRINGS
      const nativeAlarmData = {
        id: String(alarmData.id), // Convert to string here
        time: alarmData.time, // Format: "HH:mm"
        label: alarmData.label || `Alarm ${alarmData.time}`,
        days: alarmData.days || [], // Array of day strings: ['Mon', 'Tue', ...]
        isEnabled: alarmData.is_enabled !== false,
        userId: String(alarmData.userId || alarmData.user_id || 'default'), // Also ensure userId is string
        // NEW: Custom tone data
        toneType: alarmData.toneType || 'default', // 'default' or 'custom'
        customToneUri: alarmData.customToneUri || null, // URI to custom audio file
        customToneName: alarmData.customToneName || null, // Display name for custom tone
      };

      console.log('Scheduling custom alarm with tone:', {
        id: nativeAlarmData.id,
        toneType: nativeAlarmData.toneType,
        customToneUri: nativeAlarmData.customToneUri ? 'PROVIDED' : 'NULL',
        customToneName: nativeAlarmData.customToneName
      });

      const result = await CustomAlarmModule.scheduleCustomAlarm(nativeAlarmData);
      
      // Store locally for tracking using string key
      this.scheduledAlarms.set(String(alarmData.id), {
        ...nativeAlarmData,
        nextTriggerTime: result.nextTriggerTime,
        scheduled: true
      });

      console.log('Custom alarm with tone scheduled successfully:', result);
      return result;

    } catch (error) {
      console.error('Error scheduling custom alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel a custom alarm
   * @param {string} alarmId - The alarm ID to cancel
   * @returns {Promise<boolean>} - Success status
   */
  async cancelAlarm(alarmId) {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return false;
      }

      const stringAlarmId = String(alarmId); // Convert to string
      console.log('Cancelling custom alarm:', stringAlarmId);

      const result = await CustomAlarmModule.cancelCustomAlarm(stringAlarmId);
      
      // Remove from local tracking
      this.scheduledAlarms.delete(stringAlarmId);

      console.log('Custom alarm cancelled:', result);
      return result;

    } catch (error) {
      console.error('Error cancelling custom alarm:', error);
      throw error;
    }
  }

  /**
   * Toggle alarm enabled/disabled state
   * @param {string} alarmId - The alarm ID
   * @param {boolean} enabled - New enabled state
   * @param {Object} alarmData - Full alarm data (needed for rescheduling)
   * @returns {Promise<Object>} - Result
   */
  async toggleAlarmEnabled(alarmId, enabled, alarmData) {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        throw new Error('CustomAlarmModule not available');
      }

      const stringAlarmId = String(alarmId);
      console.log(`Toggling alarm ${stringAlarmId} to ${enabled ? 'enabled' : 'disabled'}`);

      const result = await CustomAlarmModule.updateAlarmEnabled(stringAlarmId, enabled, {
        id: String(alarmData.id), // Convert to string
        time: alarmData.time,
        label: alarmData.label,
        days: alarmData.days || [],
        isEnabled: enabled,
        userId: String(alarmData.userId || alarmData.user_id || 'default'),
        // Include custom tone data
        toneType: alarmData.toneType || 'default',
        customToneUri: alarmData.customToneUri || null,
        customToneName: alarmData.customToneName || null,
      });

      // Update local tracking
      if (this.scheduledAlarms.has(stringAlarmId)) {
        const alarm = this.scheduledAlarms.get(stringAlarmId);
        alarm.isEnabled = enabled;
        alarm.scheduled = enabled;
        this.scheduledAlarms.set(stringAlarmId, alarm);
      }

      return result;

    } catch (error) {
      console.error('Error toggling alarm enabled state:', error);
      throw error;
    }
  }

  /**
   * Snooze an active alarm
   * @param {string} alarmId - The alarm ID
   * @param {number} minutes - Snooze duration in minutes (default 10)
   * @returns {Promise<string>} - Result status
   */
  async snoozeAlarm(alarmId, minutes = 10) {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return 'not_supported';
      }

      const stringAlarmId = String(alarmId);
      console.log(`Snoozing alarm ${stringAlarmId} for ${minutes} minutes`);

      const result = await CustomAlarmModule.snoozeAlarm(stringAlarmId, minutes);
      
      return result;

    } catch (error) {
      console.error('Error snoozing alarm:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled alarms
   * @returns {Promise<Object>} - Scheduled alarms info
   */
  async getAllScheduledAlarms() {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return { message: 'Not supported on this platform' };
      }

      const result = await CustomAlarmModule.getAllScheduledAlarms();
      return result;

    } catch (error) {
      console.error('Error getting scheduled alarms:', error);
      throw error;
    }
  }

  /**
   * Check required permissions for alarms
   * @returns {Promise<Object>} - Permission status
   */
  async checkPermissions() {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return { exactAlarm: true, batteryOptimizationDisabled: true };
      }

      const permissions = await CustomAlarmModule.checkPermissions();
      console.log('Alarm permissions status:', permissions);
      
      return permissions;

    } catch (error) {
      console.error('Error checking alarm permissions:', error);
      return { exactAlarm: false, batteryOptimizationDisabled: false };
    }
  }

  /**
   * Request exact alarm permission (Android 12+)
   * @returns {Promise<string>} - Request status
   */
  async requestExactAlarmPermission() {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return 'not_supported';
      }

      const result = await CustomAlarmModule.requestExactAlarmPermission();
      console.log('Exact alarm permission request:', result);
      
      return result;

    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
      throw error;
    }
  }

  /**
   * Request to disable battery optimization
   * @returns {Promise<string>} - Request status
   */
  async requestBatteryOptimizationDisable() {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return 'not_supported';
      }

      const result = await CustomAlarmModule.requestBatteryOptimizationDisable();
      console.log('Battery optimization disable request:', result);
      
      return result;

    } catch (error) {
      console.error('Error requesting battery optimization disable:', error);
      throw error;
    }
  }

  /**
   * Test custom tone playability
   * @param {string} customToneUri - URI to test
   * @returns {Promise<boolean>} - Whether tone can be played
   */
  async testCustomTone(customToneUri) {
    try {
      if (!this.isAndroid || !CustomAlarmModule) {
        return false;
      }

      const result = await CustomAlarmModule.testCustomTone(customToneUri);
      console.log('Custom tone test result:', result);
      
      return result;

    } catch (error) {
      console.error('Error testing custom tone:', error);
      return false;
    }
  }

  /**
   * Format time from 24h to 12h format
   * @param {string} time24h - Time in HH:mm format
   * @param {boolean} use24h - Whether to use 24h format
   * @returns {string} - Formatted time
   */
  formatAlarmTime(time24h, use24h = false) {
    try {
      if (!time24h || typeof time24h !== 'string') {
        return '12:00';
      }

      const [hours, minutes] = time24h.split(':').map(num => parseInt(num, 10));
      
      if (use24h) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;

    } catch (error) {
      console.error('Error formatting alarm time:', error);
      return time24h || '12:00';
    }
  }

  /**
   * Calculate next alarm time based on current time and days
   * @param {string} time - Time in HH:mm format
   * @param {Array} days - Array of day strings
   * @returns {Date} - Next alarm date
   */
  calculateNextAlarmTime(time, days = []) {
    try {
      const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
      const now = new Date();
      const alarm = new Date();
      
      alarm.setHours(hours, minutes, 0, 0);

      // If no specific days, check if today or tomorrow
      if (!days || days.length === 0) {
        if (alarm.getTime() <= now.getTime()) {
          alarm.setDate(alarm.getDate() + 1);
        }
        return alarm;
      }

      // Map day strings to numbers
      const dayMap = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 
        'Thu': 4, 'Fri': 5, 'Sat': 6
      };

      const targetDays = days.map(day => dayMap[day]).filter(d => d !== undefined);
      
      if (targetDays.length === 0) {
        // Fallback to tomorrow if no valid days
        alarm.setDate(alarm.getDate() + 1);
        return alarm;
      }

      // Find next occurrence
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const alarmTime = hours * 60 + minutes;

      // Check if alarm can trigger today
      if (targetDays.includes(currentDay) && alarmTime > currentTime) {
        return alarm;
      }

      // Find next day
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (targetDays.includes(checkDay)) {
          alarm.setDate(alarm.getDate() + i);
          return alarm;
        }
      }

      // Fallback
      alarm.setDate(alarm.getDate() + 1);
      return alarm;

    } catch (error) {
      console.error('Error calculating next alarm time:', error);
      const fallback = new Date();
      fallback.setMinutes(fallback.getMinutes() + 1);
      return fallback;
    }
  }

  /**
   * Get local scheduled alarms (for tracking)
   * @returns {Map} - Map of scheduled alarms
   */
  getLocalScheduledAlarms() {
    return this.scheduledAlarms;
  }

  /**
   * Validate alarm data before scheduling
   * @param {Object} alarmData - Alarm data to validate
   * @throws {Error} - If validation fails
   */
  validateAlarmData(alarmData) {
    if (!alarmData) {
      throw new Error('Alarm data is required');
    }

    // Allow both string and number IDs, but not null/undefined
    if (alarmData.id === null || alarmData.id === undefined) {
      throw new Error('Alarm ID is required');
    }

    if (!alarmData.time) {
      throw new Error('Alarm time is required');
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (!timeRegex.test(alarmData.time)) {
      throw new Error('Invalid time format. Expected HH:mm');
    }

    // Validate days if provided
    if (alarmData.days && Array.isArray(alarmData.days)) {
      const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const day of alarmData.days) {
        if (!validDays.includes(day)) {
          throw new Error(`Invalid day: ${day}. Expected one of: ${validDays.join(', ')}`);
        }
      }
    }

    // Validate custom tone data
    if (alarmData.toneType === 'custom') {
      if (!alarmData.customToneUri || typeof alarmData.customToneUri !== 'string') {
        throw new Error('Custom tone URI is required when tone type is custom');
      }
    }
  }
}

// Export singleton instance
const customAlarmService = new CustomAlarmService();
export { customAlarmService };