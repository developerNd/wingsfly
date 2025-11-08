import {NativeModules, Platform} from 'react-native';
import morningRoutineStorageService from './morningRoutineStorageService';

const {MorningRoutineAlarmModule} = NativeModules;

class MorningRoutineAlarmManager {
  // Schedule morning routine alarm
  async scheduleMorningRoutine(userId) {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Morning routine alarms only supported on Android');
        return {success: false, error: 'Platform not supported'};
      }

      if (!MorningRoutineAlarmModule) {
        console.error('MorningRoutineAlarmModule not available');
        return {success: false, error: 'Native module not available'};
      }

      // Get morning routine data
      const routine = await morningRoutineStorageService.getMorningRoutine(userId);
      
      if (!routine) {
        console.error('No morning routine found for user:', userId);
        return {success: false, error: 'No morning routine found'};
      }

      if (!routine.isEnabled) {
        console.log('Morning routine is disabled');
        return {success: false, error: 'Routine is disabled'};
      }

      // Parse wake-up time
      const wakeUpDate = new Date(routine.wakeUpTime);
      const hours = wakeUpDate.getHours().toString().padStart(2, '0');
      const minutes = wakeUpDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      console.log('Scheduling morning routine at:', timeString);
      
      const alarmData = {
        userId: userId,
        name: routine.name,
        time: timeString,
        commands: routine.commands,
        isEnabled: routine.isEnabled,
      };

      const result = await MorningRoutineAlarmModule.scheduleMorningRoutineAlarm(alarmData);
      
      console.log('✅ Morning routine alarm scheduled successfully');
      return {success: true, data: result};
      
    } catch (error) {
      console.error('Error scheduling morning routine:', error);
      return {success: false, error: error.message};
    }
  }

  // Cancel morning routine alarm
  async cancelMorningRoutine(userId) {
    try {
      if (Platform.OS !== 'android') {
        return {success: false, error: 'Platform not supported'};
      }

      if (!MorningRoutineAlarmModule) {
        return {success: false, error: 'Native module not available'};
      }

      console.log('Cancelling morning routine for user:', userId);
      
      await MorningRoutineAlarmModule.cancelMorningRoutineAlarm(userId);
      
      console.log('✅ Morning routine alarm cancelled');
      return {success: true};
      
    } catch (error) {
      console.error('Error cancelling morning routine:', error);
      return {success: false, error: error.message};
    }
  }

  // Update and reschedule
  async updateAndRescheduleMorningRoutine(userId) {
    try {
      // Cancel existing alarm
      await this.cancelMorningRoutine(userId);
      
      // Reschedule with new data
      const result = await this.scheduleMorningRoutine(userId);
      
      return result;
      
    } catch (error) {
      console.error('Error updating morning routine:', error);
      return {success: false, error: error.message};
    }
  }

  // Toggle morning routine on/off
  async toggleMorningRoutine(userId, isEnabled) {
    try {
      // Update storage
      await morningRoutineStorageService.toggleEnabled(userId, isEnabled);
      
      if (isEnabled) {
        // Schedule alarm
        return await this.scheduleMorningRoutine(userId);
      } else {
        // Cancel alarm
        return await this.cancelMorningRoutine(userId);
      }
      
    } catch (error) {
      console.error('Error toggling morning routine:', error);
      return {success: false, error: error.message};
    }
  }

  // Format time for display
  formatTime(timeString) {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  }
}

export default new MorningRoutineAlarmManager();