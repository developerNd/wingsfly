// services/MorningRoutine/morningRoutineAlarmManager.js
import {NativeModules} from 'react-native';
import {morningRoutineService} from '../api/morningRoutineService';
import {nightRoutineService} from '../api/nightRoutineService';

const {MorningRoutineAlarmModule} = NativeModules;

class MorningRoutineAlarmManager {
  /**
   * Schedule morning routine alarm based on wake-up time from night routine
   * Fetches commands from database
   */
  async scheduleMorningRoutine(userId) {
    try {
      console.log('=== SCHEDULING MORNING ROUTINE ===');
      console.log('User ID:', userId);

      if (!userId) {
        throw new Error('User ID is required');
      }

      // 1. Get wake-up time from night routine
      const nightRoutine = await nightRoutineService.getFormattedNightRoutine(userId);

      if (!nightRoutine || !nightRoutine.wakeUpTime) {
        console.log('⚠️ No wake-up time found in night routine');
        throw new Error('Please set your wake-up time in Night Routine first');
      }

      const wakeUpTime = nightRoutine.wakeUpTime;
      console.log('✅ Wake-up time:', this.formatTime(wakeUpTime));

      // 2. Fetch voice commands from database
      const commands = await morningRoutineService.getFormattedCommandsForNative();

      if (!commands || commands.length === 0) {
        console.log('⚠️ No voice commands found in database');
        throw new Error('No voice commands configured. Please contact admin.');
      }

      console.log(`✅ Fetched ${commands.length} voice commands from database`);

      // 3. Format time for native module (HH:mm format)
      const timeString = this.formatTimeForNative(wakeUpTime);
      console.log('📅 Formatted time for alarm:', timeString);

      // 4. Prepare routine data for native module
      const routineData = {
        userId: userId,
        name: 'Morning Routine',
        time: timeString,
        commands: commands,
        isEnabled: true,
      };

      console.log('📤 Sending routine data to native module:', {
        userId: routineData.userId,
        name: routineData.name,
        time: routineData.time,
        commandCount: routineData.commands.length,
        isEnabled: routineData.isEnabled,
      });

      // 5. Schedule alarm via native module
      if (!MorningRoutineAlarmModule) {
        throw new Error('Morning Routine Alarm Module not available');
      }

      const result = await MorningRoutineAlarmModule.scheduleMorningRoutineAlarm(
        routineData,
      );

      console.log('✅ Morning routine alarm scheduled successfully');
      console.log('Next trigger time:', result.nextTriggerTimeFormatted);
      console.log('=== SCHEDULING COMPLETE ===');

      return {
        success: true,
        nextTriggerTime: result.nextTriggerTime,
        nextTriggerTimeFormatted: result.nextTriggerTimeFormatted,
        commandCount: commands.length,
      };
    } catch (error) {
      console.error('❌ Error scheduling morning routine:', error);
      throw error;
    }
  }

  /**
   * Cancel morning routine alarm
   */
  async cancelMorningRoutine(userId) {
    try {
      console.log('🚫 Cancelling morning routine alarm for user:', userId);

      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!MorningRoutineAlarmModule) {
        throw new Error('Morning Routine Alarm Module not available');
      }

      await MorningRoutineAlarmModule.cancelMorningRoutineAlarm(userId);

      console.log('✅ Morning routine alarm cancelled successfully');

      return {
        success: true,
        message: 'Morning routine alarm cancelled',
      };
    } catch (error) {
      console.error('❌ Error cancelling morning routine:', error);
      throw error;
    }
  }

  /**
   * Update morning routine (cancel and reschedule)
   */
  async updateMorningRoutine(userId) {
    try {
      console.log('🔄 Updating morning routine for user:', userId);

      // Cancel existing alarm
      await this.cancelMorningRoutine(userId);

      // Schedule new alarm
      const result = await this.scheduleMorningRoutine(userId);

      console.log('✅ Morning routine updated successfully');

      return result;
    } catch (error) {
      console.error('❌ Error updating morning routine:', error);
      throw error;
    }
  }

  /**
   * Check if morning routine is scheduled
   */
  async isRoutineScheduled(userId) {
    try {
      // Check if commands exist in database
      const isEnabled = await morningRoutineService.isRoutineEnabled();

      // Check if wake-up time is set
      const nightRoutine = await nightRoutineService.getFormattedNightRoutine(userId);
      const hasWakeUpTime = nightRoutine && nightRoutine.wakeUpTime;

      const isScheduled = isEnabled && hasWakeUpTime;

      console.log('🔍 Routine scheduled:', isScheduled);
      return isScheduled;
    } catch (error) {
      console.error('❌ Error checking routine status:', error);
      return false;
    }
  }

  /**
   * Get morning routine status
   */
  async getRoutineStatus(userId) {
    try {
      const summary = await morningRoutineService.getRoutineSummary();
      const nightRoutine = await nightRoutineService.getFormattedNightRoutine(userId);
      const isScheduled = await this.isRoutineScheduled(userId);

      return {
        isScheduled: isScheduled,
        commandCount: summary.commandCount,
        totalDuration: summary.totalDuration,
        wakeUpTime: nightRoutine?.wakeUpTime || null,
        wakeUpTimeFormatted: nightRoutine?.wakeUpTime
          ? this.formatTime(nightRoutine.wakeUpTime)
          : null,
      };
    } catch (error) {
      console.error('❌ Error getting routine status:', error);
      return {
        isScheduled: false,
        commandCount: 0,
        totalDuration: 0,
        wakeUpTime: null,
        wakeUpTimeFormatted: null,
      };
    }
  }

  // Helper methods
  formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  formatTimeForNative(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export default new MorningRoutineAlarmManager();