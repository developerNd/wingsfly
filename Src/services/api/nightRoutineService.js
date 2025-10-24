import {supabase} from '../../../supabase';

export const nightRoutineService = {
  // Create or update night routine for a user
  async saveNightRoutine(routineData) {
    try {
      const {userId, wakeUpTime, bedTime, sleepDuration} = routineData;

      // Check if user already has a night routine
      const {data: existingRoutine, error: fetchError} = await supabase
        .from('night_routines')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing routine:', fetchError);
        throw fetchError;
      }

      if (existingRoutine) {
        // Update existing routine
        const {data, error} = await supabase
          .from('night_routines')
          .update({
            wake_up_time: wakeUpTime,
            bed_time: bedTime,
            sleep_duration: sleepDuration,
          })
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('Error updating night routine:', error);
          throw error;
        }

        console.log('✅ Night routine updated successfully');
        return data[0];
      } else {
        // Create new routine
        const {data, error} = await supabase
          .from('night_routines')
          .insert([
            {
              user_id: userId,
              wake_up_time: wakeUpTime,
              bed_time: bedTime,
              sleep_duration: sleepDuration,
            },
          ])
          .select();

        if (error) {
          console.error('Error creating night routine:', error);
          throw error;
        }

        console.log('✅ Night routine created successfully');
        return data[0];
      }
    } catch (error) {
      console.error('Error in saveNightRoutine:', error);
      throw error;
    }
  },

  // Get night routine for a user
  async getNightRoutine(userId) {
    try {
      const {data, error} = await supabase
        .from('night_routines')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No routine found
          return null;
        }
        console.error('Error fetching night routine:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getNightRoutine:', error);
      throw error;
    }
  },

  // Delete night routine for a user
  async deleteNightRoutine(userId) {
    try {
      const {error} = await supabase
        .from('night_routines')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting night routine:', error);
        throw error;
      }

      console.log('✅ Night routine deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteNightRoutine:', error);
      throw error;
    }
  },

  // Helper function to format time from Date object to HH:MM:SS format
  formatTimeForDatabase(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = '00';
    return `${hours}:${minutes}:${seconds}`;
  },

  // Helper function to parse time from database (HH:MM:SS) to Date object
  parseTimeFromDatabase(timeString) {
    if (!timeString) return null;

    const today = new Date();
    const [hours, minutes] = timeString.split(':');
    today.setHours(parseInt(hours, 10));
    today.setMinutes(parseInt(minutes, 10));
    today.setSeconds(0);
    today.setMilliseconds(0);

    return today;
  },

  // Calculate sleep duration in minutes
  calculateSleepDuration(wakeUpTime, bedTime) {
    let wakeUpMinutes = wakeUpTime.getHours() * 60 + wakeUpTime.getMinutes();
    let bedTimeMinutes = bedTime.getHours() * 60 + bedTime.getMinutes();

    // If wake up time is earlier than bed time, it means wake up is next day
    if (wakeUpMinutes < bedTimeMinutes) {
      wakeUpMinutes += 24 * 60; // Add 24 hours
    }

    return wakeUpMinutes - bedTimeMinutes;
  },

  // Get sleep statistics
  getSleepQuality(sleepDurationMinutes) {
    if (sleepDurationMinutes < 360) {
      // Less than 6 hours
      return {
        quality: 'poor',
        message: 'Less than recommended 6 hours',
        color: '#FF6B6B',
        icon: 'warning',
      };
    } else if (sleepDurationMinutes >= 360 && sleepDurationMinutes <= 540) {
      // 6-9 hours
      return {
        quality: 'good',
        message: 'Healthy sleep duration',
        color: '#51CF66',
        icon: 'check-circle',
      };
    } else {
      // More than 9 hours
      return {
        quality: 'extended',
        message: 'Extended sleep time',
        color: '#4DABF7',
        icon: 'info',
      };
    }
  },

  // Validate sleep duration
  isValidSleepDuration(sleepDurationMinutes) {
    // Minimum 4 hours (240 minutes)
    return sleepDurationMinutes >= 240;
  },

  // Check if night routine exists for user
  async hasNightRoutine(userId) {
    try {
      const routine = await this.getNightRoutine(userId);
      return routine !== null;
    } catch (error) {
      console.error('Error checking night routine:', error);
      return false;
    }
  },

  // Get formatted night routine for display
  async getFormattedNightRoutine(userId) {
    try {
      const routine = await this.getNightRoutine(userId);

      if (!routine) {
        return null;
      }

      const wakeUpTime = this.parseTimeFromDatabase(routine.wake_up_time);
      const bedTime = this.parseTimeFromDatabase(routine.bed_time);
      const sleepQuality = this.getSleepQuality(routine.sleep_duration);

      const hours = Math.floor(routine.sleep_duration / 60);
      const minutes = routine.sleep_duration % 60;

      return {
        id: routine.id,
        wakeUpTime: wakeUpTime,
        bedTime: bedTime,
        sleepDuration: {
          total: routine.sleep_duration,
          hours: hours,
          minutes: minutes,
          formatted: `${hours}h ${minutes}m`,
        },
        quality: sleepQuality,
        createdAt: routine.created_at,
      };
    } catch (error) {
      console.error('Error in getFormattedNightRoutine:', error);
      throw error;
    }
  },
};
