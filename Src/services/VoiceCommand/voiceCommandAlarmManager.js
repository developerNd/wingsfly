import {NativeModules, Platform} from 'react-native';
import voiceCommandStorageService from './voiceCommandStorageService';

const {VoiceCommandAlarmModule} = NativeModules;

class VoiceCommandAlarmManager {
  // Schedule alarm with native module
  async scheduleAlarm(alarm) {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Voice command alarms only supported on Android');
        return {success: false, error: 'Platform not supported'};
      }

      if (!VoiceCommandAlarmModule) {
        console.error('VoiceCommandAlarmModule not available');
        return {success: false, error: 'Native module not available'};
      }

      console.log('Scheduling voice command alarm:', alarm.name);
      
      const result = await VoiceCommandAlarmModule.scheduleVoiceCommandAlarm(alarm);
      
      console.log('Alarm scheduled successfully:', result);
      return {success: true, data: result};
      
    } catch (error) {
      console.error('Error scheduling alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Cancel alarm
  async cancelAlarm(alarmId) {
    try {
      if (Platform.OS !== 'android') {
        return {success: false, error: 'Platform not supported'};
      }

      if (!VoiceCommandAlarmModule) {
        return {success: false, error: 'Native module not available'};
      }

      console.log('Cancelling voice command alarm:', alarmId);
      
      await VoiceCommandAlarmModule.cancelVoiceCommandAlarm(alarmId);
      
      console.log('Alarm cancelled successfully');
      return {success: true};
      
    } catch (error) {
      console.error('Error cancelling alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Update alarm enabled state
  async updateAlarmEnabled(alarmId, isEnabled, alarmData) {
    try {
      if (Platform.OS !== 'android') {
        return {success: false, error: 'Platform not supported'};
      }

      if (!VoiceCommandAlarmModule) {
        return {success: false, error: 'Native module not available'};
      }

      console.log(`${isEnabled ? 'Enabling' : 'Disabling'} alarm:`, alarmId);
      
      await VoiceCommandAlarmModule.updateAlarmEnabled(alarmId, isEnabled, alarmData);
      
      console.log('Alarm enabled state updated');
      return {success: true};
      
    } catch (error) {
      console.error('Error updating alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Create and schedule new alarm
  async createAndScheduleAlarm(alarmData) {
    try {
      // Save to storage
      const savedAlarm = await voiceCommandStorageService.createAlarm(alarmData);
      
      // Schedule with native module if enabled
      if (savedAlarm.is_enabled) {
        const scheduleResult = await this.scheduleAlarm(savedAlarm);
        
        if (!scheduleResult.success) {
          console.error('Failed to schedule alarm:', scheduleResult.error);
          // Still return the saved alarm even if scheduling failed
        }
      }
      
      return {success: true, data: savedAlarm};
      
    } catch (error) {
      console.error('Error creating and scheduling alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Update and reschedule alarm
  async updateAndRescheduleAlarm(alarmId, updates) {
    try {
      // Update in storage
      const updatedAlarm = await voiceCommandStorageService.updateAlarm(alarmId, updates);
      
      // Cancel existing alarm
      await this.cancelAlarm(alarmId);
      
      // Reschedule if enabled
      if (updatedAlarm.is_enabled) {
        const scheduleResult = await this.scheduleAlarm(updatedAlarm);
        
        if (!scheduleResult.success) {
          console.error('Failed to reschedule alarm:', scheduleResult.error);
        }
      }
      
      return {success: true, data: updatedAlarm};
      
    } catch (error) {
      console.error('Error updating and rescheduling alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Delete and cancel alarm
  async deleteAndCancelAlarm(alarmId) {
    try {
      // Cancel native alarm
      await this.cancelAlarm(alarmId);
      
      // Delete from storage
      await voiceCommandStorageService.deleteAlarm(alarmId);
      
      return {success: true};
      
    } catch (error) {
      console.error('Error deleting alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Toggle alarm on/off
  async toggleAlarm(alarmId, isEnabled) {
    try {
      // Get alarm data
      const alarm = await voiceCommandStorageService.getAlarmById(alarmId);
      
      if (!alarm) {
        throw new Error('Alarm not found');
      }
      
      // Update storage
      const updatedAlarm = await voiceCommandStorageService.toggleAlarm(alarmId, isEnabled);
      
      // Update native alarm
      if (isEnabled) {
        await this.scheduleAlarm(updatedAlarm);
      } else {
        await this.cancelAlarm(alarmId);
      }
      
      return {success: true, data: updatedAlarm};
      
    } catch (error) {
      console.error('Error toggling alarm:', error);
      return {success: false, error: error.message};
    }
  }

  // Format time for display
  formatAlarmTime(time) {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const minute = minutes;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      
      return `${displayHour}:${minute} ${ampm}`;
    } catch (error) {
      return time;
    }
  }

  // Format days for display
  formatDaysForDisplay(days) {
    if (!days || days.length === 0) return 'One time';
    if (days.length === 7) return 'Every day';
    
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weekends = ['Sat', 'Sun'];
    
    const isWeekdays = days.length === 5 && weekdays.every(day => days.includes(day));
    const isWeekends = days.length === 2 && weekends.every(day => days.includes(day));
    
    if (isWeekdays) return 'Weekdays';
    if (isWeekends) return 'Weekends';
    
    if (days.length <= 3) {
      return days.join(', ');
    }
    
    return `${days.length} days`;
  }
}

export default new VoiceCommandAlarmManager();