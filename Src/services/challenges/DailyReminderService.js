import AsyncStorage from '@react-native-async-storage/async-storage';
import { challengeService } from '../api/challengeService';

const DAILY_MODAL_KEY = 'lastDailyModalShown';

export const dailyReminderService = {
  // Check if we should show the modal today
  async shouldShowDailyModal() {
    try {
      const lastShown = await AsyncStorage.getItem(DAILY_MODAL_KEY);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Show if never shown before or last shown was on a different day
      return !lastShown || lastShown !== today;
    } catch (error) {
      console.error('Error checking daily modal status:', error);
      return true; // Default to showing on error
    }
  },

  // Mark modal as shown for today
  async markModalShownToday() {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(DAILY_MODAL_KEY, today);
      console.log('Daily modal marked as shown for:', today);
    } catch (error) {
      console.error('Error marking daily modal as shown:', error);
    }
  },

  // Get the first created active challenge
  async getFirstActiveChallenge(userId) {
    try {
      if (!userId) {
        console.log('No user ID provided for daily challenge check');
        return null;
      }

      // Get today's active challenges
      const activeChallenges = await challengeService.getTodayChallenges(userId);
      
      if (!activeChallenges || activeChallenges.length === 0) {
        console.log('No active challenges found for today');
        return null;
      }

      // Sort by created_at to get the first (oldest) challenge
      const sortedChallenges = activeChallenges.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      const firstChallenge = sortedChallenges[0];
      console.log('First active challenge found:', firstChallenge.name);
      
      return firstChallenge;
    } catch (error) {
      console.error('Error getting first active challenge:', error);
      return null;
    }
  },

  // Calculate challenge data for modal display
  async getChallengeModalData(challenge, userId) {
    try {
      if (!challenge || !userId) return null;

      // Get completed days for this challenge
      const completedDays = await challengeService.getCompletedDays(challenge.id, userId);
      
      // Calculate total completed days
      const completedDayKeys = Object.keys(completedDays).filter(
        day => completedDays[day]?.completed
      );
      const totalCompletedDays = completedDayKeys.length;
      
      // Calculate remaining days based on completion (not dates)
      const remainingDays = Math.max(0, challenge.number_of_days - totalCompletedDays);
      
      // Calculate current day number (for reference, but not displayed)
      const startDate = new Date(challenge.start_date);
      const today = new Date();
      const timeDiff = today - startDate;
      const currentDay = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      
      console.log('Modal calculation debug:', {
        challengeId: challenge.id,
        challengeName: challenge.name,
        totalDays: challenge.number_of_days,
        completedDayKeys: completedDayKeys,
        totalCompletedDays: totalCompletedDays,
        remainingDays: remainingDays,
        completedDaysData: completedDays
      });
      
      return {
        challenge,
        currentDay: Math.max(1, Math.min(currentDay, challenge.number_of_days)),
        remainingDays,
        totalCompletedDays,
      };
    } catch (error) {
      console.error('Error calculating challenge modal data:', error);
      return null;
    }
  },

  // Main function to check and prepare daily modal data
  async checkDailyModal(userId) {
    try {
      console.log('Checking daily modal for user:', userId);
      
      // Check if we should show modal today
      const shouldShow = await this.shouldShowDailyModal();
      if (!shouldShow) {
        console.log('Daily modal already shown today, skipping');
        return null;
      }

      // Get first active challenge
      const firstChallenge = await this.getFirstActiveChallenge(userId);
      if (!firstChallenge) {
        console.log('No active challenges found, skipping daily modal');
        return null;
      }

      // Get challenge modal data
      const modalData = await this.getChallengeModalData(firstChallenge, userId);
      if (!modalData) {
        console.log('Could not prepare modal data, skipping');
        return null;
      }

      console.log('Daily modal data prepared:', {
        challengeName: modalData.challenge.name,
        totalCompletedDays: modalData.totalCompletedDays,
        remainingDays: modalData.remainingDays,
        totalDays: modalData.challenge.number_of_days,
      });

      return modalData;
    } catch (error) {
      console.error('Error in checkDailyModal:', error);
      return null;
    }
  },

  // Complete today's challenge from modal
  async completeToday(challengeId, userId, currentDay) {
    try {
      await challengeService.markDayComplete(challengeId, userId, currentDay);
      console.log(`Day ${currentDay} marked complete for challenge ${challengeId}`);
      return true;
    } catch (error) {
      console.error('Error completing today from modal:', error);
      throw error;
    }
  },

  // Reset modal status (for testing purposes)
  async resetModalStatus() {
    try {
      await AsyncStorage.removeItem(DAILY_MODAL_KEY);
      console.log('Daily modal status reset');
    } catch (error) {
      console.error('Error resetting modal status:', error);
    }
  },

  // Get modal status for debugging
  async getModalStatus() {
    try {
      const lastShown = await AsyncStorage.getItem(DAILY_MODAL_KEY);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        lastShown,
        today,
        shouldShow: !lastShown || lastShown !== today,
      };
    } catch (error) {
      console.error('Error getting modal status:', error);
      return null;
    }
  },
};