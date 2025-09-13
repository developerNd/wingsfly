import {supabase} from '../../../supabase';

export const challengeService = {
  // Create a new challenge
  async createChallenge(challengeData) {
    try {
      const {data, error} = await supabase
        .from('challenges')
        .insert([
          {
            user_id: challengeData.userId,
            name: challengeData.name,
            why: challengeData.why,
            number_of_days: challengeData.numberOfDays,
            start_date: challengeData.startDate,
            end_date: challengeData.endDate,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Error creating challenge:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createChallenge:', error);
      throw error;
    }
  },

  // Get all challenges for a user
  async getChallenges(userId) {
    try {
      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getChallenges:', error);
      throw error;
    }
  },

  // Get active challenges for a user
  async getActiveChallenges(userId) {
    try {
      const now = new Date().toISOString();

      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching active challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveChallenges:', error);
      throw error;
    }
  },

  // Get upcoming challenges for a user
  async getUpcomingChallenges(userId) {
    try {
      const now = new Date().toISOString();

      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .gt('start_date', now)
        .order('start_date', {ascending: true});

      if (error) {
        console.error('Error fetching upcoming challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUpcomingChallenges:', error);
      throw error;
    }
  },

  // Get completed challenges for a user
  async getCompletedChallenges(userId) {
    try {
      const now = new Date().toISOString();

      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .lt('end_date', now)
        .order('end_date', {ascending: false});

      if (error) {
        console.error('Error fetching completed challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getCompletedChallenges:', error);
      throw error;
    }
  },

  // Get single challenge by ID
  async getChallengeById(challengeId) {
    try {
      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (error) {
        console.error('Error fetching challenge by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getChallengeById:', error);
      throw error;
    }
  },

  // Update challenge
  async updateChallenge(challengeId, challengeData) {
    try {
      const updateData = {};

      if (challengeData.name !== undefined)
        updateData.name = challengeData.name;
      if (challengeData.why !== undefined) updateData.why = challengeData.why;
      if (challengeData.numberOfDays !== undefined)
        updateData.number_of_days = challengeData.numberOfDays;
      if (challengeData.startDate !== undefined)
        updateData.start_date = challengeData.startDate;
      if (challengeData.endDate !== undefined)
        updateData.end_date = challengeData.endDate;

      const {data, error} = await supabase
        .from('challenges')
        .update(updateData)
        .eq('id', challengeId)
        .select();

      if (error) {
        console.error('Error updating challenge:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateChallenge:', error);
      throw error;
    }
  },

  // Delete a challenge
  async deleteChallenge(challengeId) {
    try {
      const {error} = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        console.error('Error deleting challenge:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteChallenge:', error);
      throw error;
    }
  },

  // ========== COMPLETION TRACKING METHODS ==========

  // Mark a specific day as complete for a challenge
  async markDayComplete(challengeId, userId, dayNumber) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .insert([
          {
            challenge_id: challengeId,
            user_id: userId,
            day_number: dayNumber,
            completed_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
          },
        ])
        .select();

      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505') {
          throw new Error('This day has already been completed');
        }
        console.error('Error marking day complete:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in markDayComplete:', error);
      throw error;
    }
  },

  // Unmark a day as complete (undo completion)
  async unmarkDayComplete(challengeId, userId, dayNumber) {
    try {
      const {error} = await supabase
        .from('challenge_completions')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('day_number', dayNumber);

      if (error) {
        console.error('Error unmarking day complete:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in unmarkDayComplete:', error);
      throw error;
    }
  },

  // Get all completed days for a specific challenge
  async getCompletedDays(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('day_number, completed_date, created_at')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .order('day_number', {ascending: true});

      if (error) {
        console.error('Error fetching completed days:', error);
        throw error;
      }

      // Convert to object format for easier lookup
      const completedDaysMap = {};
      data.forEach(completion => {
        completedDaysMap[completion.day_number] = {
          completed: true,
          completedDate: completion.completed_date,
          createdAt: completion.created_at,
        };
      });

      return completedDaysMap;
    } catch (error) {
      console.error('Error in getCompletedDays:', error);
      throw error;
    }
  },

  // Get completed days for multiple challenges (batch operation)
  async getCompletedDaysForChallenges(challengeIds, userId) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('challenge_id, day_number, completed_date, created_at')
        .in('challenge_id', challengeIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching completed days for challenges:', error);
        throw error;
      }

      // Group by challenge_id
      const completedDaysByChallenge = {};
      challengeIds.forEach(id => {
        completedDaysByChallenge[id] = {};
      });

      data.forEach(completion => {
        if (!completedDaysByChallenge[completion.challenge_id]) {
          completedDaysByChallenge[completion.challenge_id] = {};
        }
        completedDaysByChallenge[completion.challenge_id][
          completion.day_number
        ] = {
          completed: true,
          completedDate: completion.completed_date,
          createdAt: completion.created_at,
        };
      });

      return completedDaysByChallenge;
    } catch (error) {
      console.error('Error in getCompletedDaysForChallenges:', error);
      throw error;
    }
  },

  // Check if a specific day is completed
  async isDayCompleted(challengeId, userId, dayNumber) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, day is not completed
          return false;
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in isDayCompleted:', error);
      return false;
    }
  },

  // Get completion statistics for a challenge
  async getChallengeCompletionStats(challengeId, userId) {
    try {
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) throw new Error('Challenge not found');

      const {count, error} = await supabase
        .from('challenge_completions')
        .select('*', {count: 'exact', head: true})
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting completion stats:', error);
        throw error;
      }

      const completedDays = count || 0;
      const totalDays = challenge.number_of_days;
      const remainingDays = totalDays - completedDays;
      const completionPercentage = Math.round(
        (completedDays / totalDays) * 100,
      );

      return {
        challengeId,
        totalDays,
        completedDays,
        remainingDays,
        completionPercentage,
        isCompleted: completedDays >= totalDays,
      };
    } catch (error) {
      console.error('Error in getChallengeCompletionStats:', error);
      throw error;
    }
  },

  // Get today's completable challenges for a user
  async getTodayCompletableChallenges(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', today)
        .gte('end_date', today);

      if (error) {
        console.error('Error fetching today completable challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTodayCompletableChallenges:', error);
      throw error;
    }
  },

  // ========== STATISTICS AND ANALYTICS ==========

  // Calculate challenge statistics
  async getChallengeStatistics(userId) {
    try {
      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching challenge statistics:', error);
        throw error;
      }

      const now = new Date();
      const totalChallenges = data.length;

      const activeChallenges = data.filter(challenge => {
        const startDate = new Date(challenge.start_date);
        const endDate = new Date(challenge.end_date);
        return startDate <= now && endDate >= now;
      }).length;

      const completedChallenges = data.filter(challenge => {
        const endDate = new Date(challenge.end_date);
        return endDate < now;
      }).length;

      const upcomingChallenges = data.filter(challenge => {
        const startDate = new Date(challenge.start_date);
        return startDate > now;
      }).length;

      const totalDaysCommitted = data.reduce(
        (sum, challenge) => sum + challenge.number_of_days,
        0,
      );

      const averageDuration =
        totalChallenges > 0
          ? (totalDaysCommitted / totalChallenges).toFixed(1)
          : 0;

      return {
        totalChallenges,
        activeChallenges,
        completedChallenges,
        upcomingChallenges,
        totalDaysCommitted,
        averageDuration: parseFloat(averageDuration),
        completionRate:
          totalChallenges > 0
            ? ((completedChallenges / totalChallenges) * 100).toFixed(1)
            : 0,
      };
    } catch (error) {
      console.error('Error in getChallengeStatistics:', error);
      throw error;
    }
  },

  // Get challenges for today (that should be active today)
  async getTodayChallenges(userId) {
    try {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
      ).toISOString();

      const {data, error} = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', todayEnd)
        .gte('end_date', todayStart)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching today challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTodayChallenges:', error);
      throw error;
    }
  },

  // Calculate daily progress for a challenge
  calculateDailyProgress(challenge) {
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    const currentDate = new Date();

    // If challenge hasn't started yet
    if (currentDate < startDate) {
      return 0;
    }

    // If challenge is completed
    if (currentDate > endDate) {
      return 100;
    }

    // Calculate progress based on days passed
    const totalDays =
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed =
      Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  },

  // Get remaining days for a challenge
  getRemainingDays(challenge) {
    const endDate = new Date(challenge.end_date);
    const currentDate = new Date();

    if (currentDate > endDate) {
      return 0; // Challenge completed
    }

    const timeDiff = endDate - currentDate;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDiff);
  },

  // Get days elapsed for a challenge
  getDaysElapsed(challenge) {
    const startDate = new Date(challenge.start_date);
    const currentDate = new Date();

    if (currentDate < startDate) {
      return 0; // Challenge hasn't started
    }

    const timeDiff = currentDate - startDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDiff + 1); // +1 because start day counts as day 1
  },
};
