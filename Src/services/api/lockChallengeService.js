import {supabase} from '../../../supabase';

export const lockChallengeService = {
  // Create a new lock challenge with duration and hours per day
  async createLockChallenge(challengeData) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .insert([
          {
            name: challengeData.name,
            category: challengeData.category,
            local_video_path: challengeData.localVideoPath || null,
            video_file_name: challengeData.videoFileName || null,
            youtube_link: challengeData.youtubeLink || null,
            time_slot_1: challengeData.timeSlot1,
            time_slot_2: challengeData.timeSlot2,
            duration_days: challengeData.durationDays || null,
            hours_per_day: challengeData.hoursPerDay || null,
            start_date: challengeData.startDate || null,
            end_date: challengeData.endDate || null,
            status: challengeData.status || 'pending',
            user_id: challengeData.userId,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating lock challenge:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createLockChallenge:', error);
      throw error;
    }
  },

  // Get all lock challenges for a user
  async getLockChallenges(userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching lock challenges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLockChallenges:', error);
      throw error;
    }
  },

  // Get lock challenges by category
  async getLockChallengesByCategory(userId, category) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching lock challenges by category:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLockChallengesByCategory:', error);
      throw error;
    }
  },

  // Get lock challenges by status
  async getLockChallengesByStatus(userId, status) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching lock challenges by status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLockChallengesByStatus:', error);
      throw error;
    }
  },

  // Get single lock challenge by ID
  async getLockChallengeById(challengeId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (error) {
        console.error('Error fetching lock challenge by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLockChallengeById:', error);
      throw error;
    }
  },

  // Update lock challenge status
  async updateLockChallengeStatus(challengeId, status) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .update({
          status: status,
        })
        .eq('id', challengeId)
        .select();

      if (error) {
        console.error('Error updating lock challenge status:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateLockChallengeStatus:', error);
      throw error;
    }
  },

  // Update lock challenge with all fields
  async updateLockChallenge(challengeId, updateData) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .update({
          name: updateData.name,
          category: updateData.category,
          local_video_path: updateData.localVideoPath,
          video_file_name: updateData.videoFileName,
          youtube_link: updateData.youtubeLink,
          time_slot_1: updateData.timeSlot1,
          time_slot_2: updateData.timeSlot2,
          duration_days: updateData.durationDays,
          hours_per_day: updateData.hoursPerDay,
          start_date: updateData.startDate,
          end_date: updateData.endDate,
          status: updateData.status,
        })
        .eq('id', challengeId)
        .select();

      if (error) {
        console.error('Error updating lock challenge:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateLockChallenge:', error);
      throw error;
    }
  },

  // Delete a lock challenge
  async deleteLockChallenge(challengeId) {
    try {
      const {error} = await supabase
        .from('lock_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        console.error('Error deleting lock challenge:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteLockChallenge:', error);
      throw error;
    }
  },

  // ========== COMPLETION TRACKING METHODS ==========

  // Mark a specific day as complete for a lock challenge with hours and video completion
  async markDayComplete(
    challengeId,
    userId,
    dayNumber,
    hoursCompleted = null,
    videoCompleted = false,
  ) {
    try {
      const completionData = {
        lock_challenge_id: challengeId,
        user_id: userId,
        day_number: dayNumber,
        completed_date: new Date().toISOString().split('T')[0],
        video_completed: videoCompleted,
      };

      // Add hours_completed if provided
      if (hoursCompleted !== null && hoursCompleted !== undefined) {
        completionData.hours_completed = hoursCompleted;
      }

      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .insert([completionData])
        .select();

      if (error) {
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

  // Update completion (for updating hours or video status)
  async updateDayCompletion(challengeId, userId, dayNumber, updateData) {
    try {
      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .update({
          hours_completed: updateData.hoursCompleted,
          video_completed: updateData.videoCompleted,
        })
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .select();

      if (error) {
        console.error('Error updating day completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateDayCompletion:', error);
      throw error;
    }
  },

  // Unmark a day as complete
  async unmarkDayComplete(challengeId, userId, dayNumber) {
    try {
      const {error} = await supabase
        .from('lock_challenge_completions')
        .delete()
        .eq('lock_challenge_id', challengeId)
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

  // Get all completed days for a specific lock challenge
  async getCompletedDays(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .select(
          'day_number, completed_date, created_at, hours_completed, video_completed',
        )
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId)
        .order('day_number', {ascending: true});

      if (error) {
        console.error('Error fetching completed days:', error);
        throw error;
      }

      const completedDaysMap = {};
      data.forEach(completion => {
        completedDaysMap[completion.day_number] = {
          completed: true,
          completedDate: completion.completed_date,
          createdAt: completion.created_at,
          hoursCompleted: completion.hours_completed || 0,
          videoCompleted: completion.video_completed || false,
        };
      });

      return completedDaysMap;
    } catch (error) {
      console.error('Error in getCompletedDays:', error);
      throw error;
    }
  },

  // Get completed days for multiple lock challenges
  async getCompletedDaysForChallenges(challengeIds, userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .select(
          'lock_challenge_id, day_number, completed_date, created_at, hours_completed, video_completed',
        )
        .in('lock_challenge_id', challengeIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching completed days for challenges:', error);
        throw error;
      }

      const completedDaysByChallenge = {};
      challengeIds.forEach(id => {
        completedDaysByChallenge[id] = {};
      });

      data.forEach(completion => {
        if (!completedDaysByChallenge[completion.lock_challenge_id]) {
          completedDaysByChallenge[completion.lock_challenge_id] = {};
        }
        completedDaysByChallenge[completion.lock_challenge_id][
          completion.day_number
        ] = {
          completed: true,
          completedDate: completion.completed_date,
          createdAt: completion.created_at,
          hoursCompleted: completion.hours_completed || 0,
          videoCompleted: completion.video_completed || false,
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
        .from('lock_challenge_completions')
        .select('id, video_completed')
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {completed: false, videoCompleted: false};
        }
        throw error;
      }

      return {completed: true, videoCompleted: data.video_completed};
    } catch (error) {
      console.error('Error in isDayCompleted:', error);
      return {completed: false, videoCompleted: false};
    }
  },

  // Get completion statistics for a lock challenge
  async getLockChallengeCompletionStats(challengeId, userId) {
    try {
      const challenge = await this.getLockChallengeById(challengeId);
      if (!challenge) throw new Error('Lock challenge not found');

      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .select('*')
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting completion stats:', error);
        throw error;
      }

      const completedDays = data.length;
      const totalDays = challenge.duration_days;
      const remainingDays = totalDays - completedDays;
      const completionPercentage = Math.round(
        (completedDays / totalDays) * 100,
      );

      // Count video completions
      const videoCompletedDays = data.filter(c => c.video_completed).length;
      const videoCompletionPercentage = Math.round(
        (videoCompletedDays / totalDays) * 100,
      );

      // Calculate total hours
      const totalHours = data.reduce(
        (sum, c) => sum + (c.hours_completed || 0),
        0,
      );

      return {
        challengeId,
        totalDays,
        completedDays,
        remainingDays,
        completionPercentage,
        videoCompletedDays,
        videoCompletionPercentage,
        totalHoursCompleted: totalHours,
        isCompleted: completedDays >= totalDays,
      };
    } catch (error) {
      console.error('Error in getLockChallengeCompletionStats:', error);
      throw error;
    }
  },

  // Get total hours completed for a lock challenge
  async getTotalHoursCompleted(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .select('hours_completed')
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching total hours:', error);
        throw error;
      }

      const totalHours = data.reduce((sum, completion) => {
        return sum + (completion.hours_completed || 0);
      }, 0);

      return totalHours;
    } catch (error) {
      console.error('Error in getTotalHoursCompleted:', error);
      throw error;
    }
  },

  // Get today's completable lock challenges for a user
  async getTodayCompletableChallenges(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const {data, error} = await supabase
        .from('lock_challenges')
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

  // Get video completion rate for a challenge
  async getVideoCompletionRate(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenge_completions')
        .select('video_completed')
        .eq('lock_challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching video completion rate:', error);
        throw error;
      }

      const totalCompletions = data.length;
      if (totalCompletions === 0) return 0;

      const videoCompletions = data.filter(c => c.video_completed).length;
      return Math.round((videoCompletions / totalCompletions) * 100);
    } catch (error) {
      console.error('Error in getVideoCompletionRate:', error);
      throw error;
    }
  },

  // ========== STATISTICS AND ANALYTICS ==========

  // Get lock challenge statistics including duration insights
  async getLockChallengeStatistics(userId) {
    try {
      const {data, error} = await supabase
        .from('lock_challenges')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching lock challenge statistics:', error);
        throw error;
      }

      const totalChallenges = data.length;
      const pendingChallenges = data.filter(c => c.status === 'pending').length;
      const inProgressChallenges = data.filter(
        c => c.status === 'in_progress',
      ).length;
      const completedChallenges = data.filter(
        c => c.status === 'completed',
      ).length;
      const missedChallenges = data.filter(c => c.status === 'missed').length;

      const challengesByCategory = data.reduce((acc, challenge) => {
        acc[challenge.category] = (acc[challenge.category] || 0) + 1;
        return acc;
      }, {});

      const videoUploadedCount = data.filter(c => c.local_video_path).length;
      const youtubeLinkedCount = data.filter(c => c.youtube_link).length;

      const avgDurationDays =
        data.filter(c => c.duration_days).length > 0
          ? (
              data.reduce((sum, c) => sum + (c.duration_days || 0), 0) /
              data.filter(c => c.duration_days).length
            ).toFixed(1)
          : 0;

      const avgHoursPerDay =
        data.filter(c => c.hours_per_day).length > 0
          ? (
              data.reduce((sum, c) => sum + (c.hours_per_day || 0), 0) /
              data.filter(c => c.hours_per_day).length
            ).toFixed(2)
          : 0;

      return {
        totalChallenges,
        pendingChallenges,
        inProgressChallenges,
        completedChallenges,
        missedChallenges,
        completionRate:
          totalChallenges > 0
            ? ((completedChallenges / totalChallenges) * 100).toFixed(1)
            : 0,
        challengesByCategory,
        videoUploadedCount,
        youtubeLinkedCount,
        avgDurationDays,
        avgHoursPerDay,
      };
    } catch (error) {
      console.error('Error in getLockChallengeStatistics:', error);
      throw error;
    }
  },

  // Validate YouTube URL
  isValidYouTubeUrl(url) {
    if (!url) return false;

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  },

  // Extract YouTube video ID
  extractYouTubeVideoId(url) {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  },
};
