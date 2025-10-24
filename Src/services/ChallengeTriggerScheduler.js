import {NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {ChallengeLockModule} = NativeModules;

const CHALLENGES_STORAGE_KEY = '@challenges_list';

/**
 * Challenge Trigger Scheduler
 * Uses native AlarmManager for reliable scheduling
 * No background polling needed - AlarmManager handles everything
 */
class ChallengeTriggerScheduler {
  
  constructor() {
    // No interval needed - AlarmManager handles triggering
  }

  /**
   * Start monitoring - just a compatibility method
   * Actual scheduling is done via native AlarmManager
   */
  async startMonitoring() {
    console.log('✅ Challenge monitoring active via native AlarmManager');
    console.log('⚡ No background polling needed - AlarmManager is battery efficient');
    
    // Optional: Clean up old challenges
    await this.cleanupOldChallenges();
  }

  /**
   * Stop monitoring - just a compatibility method
   */
  stopMonitoring() {
    console.log('ℹ️ Native AlarmManager continues to work in background');
  }

  /**
   * Convert time string (12-hour) to minutes since midnight
   */
  convertTimeToMinutes(timeString) {
    try {
      const [time, period] = timeString.trim().split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      return hour24 * 60 + minutes;
    } catch (error) {
      console.error('Error converting time:', error);
      return 0;
    }
  }

  /**
   * Update challenge status in storage
   */
  async updateChallengeStatus(challengeId, status, currentSlot = null) {
    try {
      const challengesJson = await AsyncStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (!challengesJson) return;

      const challenges = JSON.parse(challengesJson);
      const updatedChallenges = challenges.map(c => {
        if (c.id === challengeId) {
          const updated = {
            ...c,
            status: status,
            started_at: new Date().toISOString(),
          };
          if (currentSlot) {
            updated.current_slot = currentSlot;
          }
          return updated;
        }
        return c;
      });

      await AsyncStorage.setItem(
        CHALLENGES_STORAGE_KEY,
        JSON.stringify(updatedChallenges)
      );

      console.log(`✅ Challenge ${challengeId} status updated to: ${status}`);
    } catch (error) {
      console.error('Error updating challenge status:', error);
    }
  }

  /**
   * Manually trigger a challenge (for testing or immediate start)
   */
  async manualTrigger(challengeId, slotNumber = 1) {
    try {
      const challengesJson = await AsyncStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (!challengesJson) {
        throw new Error('No challenges found');
      }

      const challenges = JSON.parse(challengesJson);
      const challenge = challenges.find(c => c.id === challengeId);

      if (!challenge) {
        throw new Error('Challenge not found');
      }

      const endTime = slotNumber === 1 
        ? challenge.time_slot_1.endTime 
        : challenge.time_slot_2.endTime;

      console.log('========================================');
      console.log('🎬 MANUALLY TRIGGERING CHALLENGE');
      console.log('Challenge:', challenge.name);
      console.log('Slot:', slotNumber);
      console.log('End Time:', endTime);
      console.log('========================================');

      // Update challenge status
      await this.updateChallengeStatus(challenge.id, 'in_progress', slotNumber);

      // Start ChallengeLockActivity
      if (Platform.OS === 'android' && ChallengeLockModule) {
        await ChallengeLockModule.startChallengeLock({
          challengeId: challenge.id,
          videoPath: challenge.video_path,
          challengeName: challenge.name,
          category: challenge.category,
          slotNumber: slotNumber,
          endTime: endTime,
        });

        console.log('✅ Challenge lock screen started');
      }
      
    } catch (error) {
      console.error('Error manually triggering challenge:', error);
      throw error;
    }
  }

  /**
   * Clean up completed or missed challenges
   */
  async cleanupOldChallenges() {
    try {
      const challengesJson = await AsyncStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (!challengesJson) return;

      const challenges = JSON.parse(challengesJson);
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      let hasChanges = false;
      const updatedChallenges = challenges.map(challenge => {
        if (challenge.status === 'pending') {
          // Check if both time slots have passed
          const slot2EndTime = challenge.time_slot_2.endTime;
          const slot2EndMinutes = this.convertTimeToMinutes(slot2EndTime);
          
          // If current time is more than 1 hour past slot 2 end time, mark as missed
          if (currentMinutes > slot2EndMinutes + 60) {
            hasChanges = true;
            return {
              ...challenge,
              status: 'missed',
              completed_at: new Date().toISOString(),
            };
          }
        }
        return challenge;
      });

      if (hasChanges) {
        await AsyncStorage.setItem(
          CHALLENGES_STORAGE_KEY,
          JSON.stringify(updatedChallenges)
        );
        console.log('✅ Old challenges cleaned up');
      }
    } catch (error) {
      console.error('Error cleaning up challenges:', error);
    }
  }

  /**
   * Get upcoming challenges for today
   */
  async getUpcomingChallenges() {
    try {
      const challengesJson = await AsyncStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (!challengesJson) return [];

      const challenges = JSON.parse(challengesJson);
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      return challenges.filter(challenge => {
        if (challenge.status !== 'pending') return false;

        // Check if either time slot is still upcoming
        const slot1Minutes = this.convertTimeToMinutes(challenge.time_slot_1.startTime);
        const slot2Minutes = this.convertTimeToMinutes(challenge.time_slot_2.startTime);

        return slot1Minutes > currentMinutes || slot2Minutes > currentMinutes;
      });
    } catch (error) {
      console.error('Error getting upcoming challenges:', error);
      return [];
    }
  }

  /**
   * Get challenge statistics
   */
  async getChallengeStats() {
    try {
      const challengesJson = await AsyncStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (!challengesJson) {
        return {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          missed: 0
        };
      }

      const challenges = JSON.parse(challengesJson);
      
      return {
        total: challenges.length,
        pending: challenges.filter(c => c.status === 'pending').length,
        inProgress: challenges.filter(c => c.status === 'in_progress').length,
        completed: challenges.filter(c => c.status === 'completed').length,
        missed: challenges.filter(c => c.status === 'missed').length
      };
    } catch (error) {
      console.error('Error getting challenge stats:', error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        missed: 0
      };
    }
  }
}

export const challengeTriggerScheduler = new ChallengeTriggerScheduler();
export default challengeTriggerScheduler;