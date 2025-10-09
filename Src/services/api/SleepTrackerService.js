import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../../supabase';

const STORAGE_KEYS = {
  LAST_SHOWN_DATE: '@sleep_tracker_last_shown',
  PENDING_SLEEP_DATA: '@sleep_tracker_pending_data',
};

class SleepTrackerService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    console.log('[SLEEP TRACKER SERVICE] Initializing...');
    this.initialized = true;
  }

  // Convert time to IST and return ISO string
  getISTTime(date = new Date()) {
    // IST is UTC+5:30, so add 5.5 hours (19800000 milliseconds)
    const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return istTime.toISOString();
  }

  // Format time for display in IST
  formatTimeForDisplay(istTimeString) {
    try {
      const date = new Date(istTimeString);
      // Since we're storing IST time, subtract the offset for proper display
      const actualIST = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
      return actualIST.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return istTimeString;
    }
  }

  // Check if we should show the popup today
  async shouldShowToday() {
    try {
      const lastShownDate = await AsyncStorage.getItem(
        STORAGE_KEYS.LAST_SHOWN_DATE,
      );
      const today = new Date().toDateString();

      if (!lastShownDate) {
        console.log('[SLEEP TRACKER] No previous record, should show');
        return true;
      }

      const shouldShow = lastShownDate !== today;
      console.log(
        '[SLEEP TRACKER] Last shown:',
        lastShownDate,
        'Today:',
        today,
        'Should show:',
        shouldShow,
      );

      return shouldShow;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error checking if should show:', error);
      return true;
    }
  }

  // Mark popup as shown for today
  async markShownToday() {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SHOWN_DATE, today);
      console.log('[SLEEP TRACKER] Marked as shown for:', today);
      return true;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error marking as shown:', error);
      return false;
    }
  }

  // Save wakeup time to database with IST format
  async saveWakeupTime(userId, wakeupTime) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!wakeupTime) {
        throw new Error('Wakeup time is required');
      }

      // Convert the wakeup time to IST format
      const wakeupDate = new Date(wakeupTime);
      const wakeupTimeIST = this.getISTTime(wakeupDate);
      const createdAtIST = this.getISTTime(new Date());

      console.log('[SLEEP TRACKER] Saving wakeup time:', {
        userId,
        wakeupTimeOriginal: wakeupTime,
        wakeupTimeIST: wakeupTimeIST,
        wakeupTimeDisplay: this.formatTimeForDisplay(wakeupTimeIST),
      });

      const {data, error} = await supabase
        .from('sleep_tracker')
        .insert([
          {
            user_id: userId,
            wakeup_time: wakeupTimeIST,
            created_at: createdAtIST,
          },
        ])
        .select();

      if (error) {
        console.error('[SLEEP TRACKER] Error saving to database:', error);
        throw error;
      }

      console.log('[SLEEP TRACKER] Successfully saved:', {
        ...data[0],
        wakeup_time_display: this.formatTimeForDisplay(data[0].wakeup_time),
      });
      return data[0];
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in saveWakeupTime:', error);
      throw error;
    }
  }

  // Save sleep time (for future use) with IST format
  async saveSleepTime(userId, sleepTime) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!sleepTime) {
        throw new Error('Sleep time is required');
      }

      const sleepDate = new Date(sleepTime);
      const sleepTimeIST = this.getISTTime(sleepDate);
      const createdAtIST = this.getISTTime(new Date());

      console.log('[SLEEP TRACKER] Saving sleep time:', {
        userId,
        sleepTimeIST: sleepTimeIST,
        sleepTimeDisplay: this.formatTimeForDisplay(sleepTimeIST),
      });

      const {data, error} = await supabase
        .from('sleep_tracker')
        .insert([
          {
            user_id: userId,
            sleep_time: sleepTimeIST,
            created_at: createdAtIST,
          },
        ])
        .select();

      if (error) {
        console.error('[SLEEP TRACKER] Error saving sleep time:', error);
        throw error;
      }

      console.log('[SLEEP TRACKER] Successfully saved sleep time:', data);
      return data[0];
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in saveSleepTime:', error);
      throw error;
    }
  }

  // Update existing record with sleep time and calculate total hours
  async updateSleepData(recordId, userId, sleepTime, wakeupTime) {
    try {
      if (!recordId || !userId) {
        throw new Error('Record ID and User ID are required');
      }

      let updateData = {};

      if (sleepTime) {
        const sleepDate = new Date(sleepTime);
        updateData.sleep_time = this.getISTTime(sleepDate);
      }

      if (wakeupTime) {
        const wakeupDate = new Date(wakeupTime);
        updateData.wakeup_time = this.getISTTime(wakeupDate);
      }

      // Calculate total sleep hours if both times are provided
      if (updateData.sleep_time && updateData.wakeup_time) {
        const sleepDate = new Date(updateData.sleep_time);
        const wakeupDate = new Date(updateData.wakeup_time);
        const diffMs = wakeupDate - sleepDate;
        const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        updateData.total_sleep_hours = totalHours;
      }

      console.log('[SLEEP TRACKER] Updating record:', {recordId, updateData});

      const {data, error} = await supabase
        .from('sleep_tracker')
        .update(updateData)
        .eq('id', recordId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('[SLEEP TRACKER] Error updating record:', error);
        throw error;
      }

      console.log('[SLEEP TRACKER] Successfully updated:', data);
      return data[0];
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in updateSleepData:', error);
      throw error;
    }
  }

  // Get today's sleep record (IST-aware)
  async getTodayRecord(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get IST time for today
      const istNow = new Date(this.getISTTime());

      // Start of day in IST
      const startOfDayIST = new Date(
        istNow.getFullYear(),
        istNow.getMonth(),
        istNow.getDate(),
      );
      const startOfDayISOString = new Date(
        startOfDayIST.getTime() + 5.5 * 60 * 60 * 1000,
      ).toISOString();

      // End of day in IST
      const endOfDayIST = new Date(
        istNow.getFullYear(),
        istNow.getMonth(),
        istNow.getDate() + 1,
      );
      const endOfDayISOString = new Date(
        endOfDayIST.getTime() + 5.5 * 60 * 60 * 1000,
      ).toISOString();

      console.log("[SLEEP TRACKER] Getting today's record for user:", userId);
      console.log('[SLEEP TRACKER] Date range (IST):', {
        start: this.formatTimeForDisplay(startOfDayISOString),
        end: this.formatTimeForDisplay(endOfDayISOString),
      });

      const {data, error} = await supabase
        .from('sleep_tracker')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfDayISOString)
        .lt('created_at', endOfDayISOString)
        .order('created_at', {ascending: false})
        .limit(1);

      if (error) {
        console.error("[SLEEP TRACKER] Error getting today's record:", error);
        throw error;
      }

      console.log("[SLEEP TRACKER] Today's record:", data);
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in getTodayRecord:', error);
      throw error;
    }
  }

  // Get sleep history
  async getSleepHistory(userId, limit = 30) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('[SLEEP TRACKER] Getting sleep history for user:', userId);

      const {data, error} = await supabase
        .from('sleep_tracker')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false})
        .limit(limit);

      if (error) {
        console.error('[SLEEP TRACKER] Error getting history:', error);
        throw error;
      }

      // Add formatted display times
      const historyWithFormatting =
        data?.map(record => ({
          ...record,
          wakeup_time_display: record.wakeup_time
            ? this.formatTimeForDisplay(record.wakeup_time)
            : null,
          sleep_time_display: record.sleep_time
            ? this.formatTimeForDisplay(record.sleep_time)
            : null,
          created_at_display: this.formatTimeForDisplay(record.created_at),
        })) || [];

      console.log(
        '[SLEEP TRACKER] Retrieved',
        historyWithFormatting.length,
        'records',
      );
      return historyWithFormatting;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in getSleepHistory:', error);
      throw error;
    }
  }

  // Get sleep statistics
  async getSleepStats(userId, days = 7) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const istNow = new Date(this.getISTTime());
      const startDate = new Date(istNow.getTime() - days * 24 * 60 * 60 * 1000);

      console.log('[SLEEP TRACKER] Getting stats for last', days, 'days');

      const {data, error} = await supabase
        .from('sleep_tracker')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', {ascending: false});

      if (error) {
        console.error('[SLEEP TRACKER] Error getting stats:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalRecords: 0,
          averageSleepHours: 0,
          totalSleepHours: 0,
          recordsWithBothTimes: 0,
        };
      }

      const recordsWithSleepHours = data.filter(
        record => record.total_sleep_hours,
      );
      const totalSleepHours = recordsWithSleepHours.reduce(
        (sum, record) => sum + parseFloat(record.total_sleep_hours || 0),
        0,
      );
      const averageSleepHours =
        recordsWithSleepHours.length > 0
          ? (totalSleepHours / recordsWithSleepHours.length).toFixed(2)
          : 0;

      const stats = {
        totalRecords: data.length,
        averageSleepHours: parseFloat(averageSleepHours),
        totalSleepHours: parseFloat(totalSleepHours.toFixed(2)),
        recordsWithBothTimes: recordsWithSleepHours.length,
      };

      console.log('[SLEEP TRACKER] Stats:', stats);
      return stats;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in getSleepStats:', error);
      throw error;
    }
  }

  // Delete a sleep record
  async deleteSleepRecord(recordId, userId) {
    try {
      if (!recordId || !userId) {
        throw new Error('Record ID and User ID are required');
      }

      console.log('[SLEEP TRACKER] Deleting record:', recordId);

      const {error} = await supabase
        .from('sleep_tracker')
        .delete()
        .eq('id', recordId)
        .eq('user_id', userId);

      if (error) {
        console.error('[SLEEP TRACKER] Error deleting record:', error);
        throw error;
      }

      console.log('[SLEEP TRACKER] Successfully deleted record');
      return true;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error in deleteSleepRecord:', error);
      throw error;
    }
  }

  // Reset status (for testing)
  async resetStatus() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SHOWN_DATE);
      console.log('[SLEEP TRACKER] Status reset successfully');
      return true;
    } catch (error) {
      console.error('[SLEEP TRACKER] Error resetting status:', error);
      return false;
    }
  }

  // Get current status (for debugging)
  async getStatus() {
    try {
      const lastShownDate = await AsyncStorage.getItem(
        STORAGE_KEYS.LAST_SHOWN_DATE,
      );
      return {
        lastShownDate,
        today: new Date().toDateString(),
        shouldShow: await this.shouldShowToday(),
        currentTimeIST: this.formatTimeForDisplay(this.getISTTime()),
      };
    } catch (error) {
      console.error('[SLEEP TRACKER] Error getting status:', error);
      return null;
    }
  }
}

export const sleepTrackerService = new SleepTrackerService();
export default sleepTrackerService;
