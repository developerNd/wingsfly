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
            hours_per_day: challengeData.hoursPerDay,
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

  // ========== TASK MANAGEMENT METHODS ==========

  // Create challenge tasks (batch operation)
  async createChallengeTasks(challengeId, tasks) {
    try {
      if (!tasks || tasks.length === 0) {
        return [];
      }

      // Create a mapping from temporary IDs to database IDs
      const taskIdMapping = {};
      const createdTasks = [];

      // Sort tasks by level (root tasks first, then subtasks)
      const sortedTasks = tasks.sort((a, b) => (a.level || 0) - (b.level || 0));

      // Get challenge details to get user_id
      const challenge = await this.getChallengeById(challengeId);

      // Create tasks level by level to handle parent-child relationships
      for (const task of sortedTasks) {
        const taskData = {
          challenge_id: challengeId,
          parent_task_id: task.parentTaskId ? taskIdMapping[task.parentTaskId] : null,
          user_id: task.userId || challenge.user_id,
          title: task.title,
          // Handle both string and Date object formats
          start_date: typeof task.startDate === 'string' ? task.startDate : task.startDate.toISOString(),
          // For tasks, we only store start_date since they don't have separate end dates in your UI
          end_date: null,
        };

        const {data, error} = await supabase
          .from('challenge_tasks')
          .insert([taskData])
          .select();

        if (error) {
          console.error('Error creating task:', error);
          throw error;
        }

        // Map temporary ID to database ID
        taskIdMapping[task.id] = data[0].id;
        createdTasks.push(data[0]);
      }

      return createdTasks;
    } catch (error) {
      console.error('Error in createChallengeTasks:', error);
      throw error;
    }
  },

  // Get all tasks for a challenge
  async getChallengeTasks(challengeId) {
    try {
      const {data, error} = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', {ascending: true});

      if (error) {
        console.error('Error fetching challenge tasks:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getChallengeTasks:', error);
      throw error;
    }
  },

  // Get tasks organized in a tree structure
  async getChallengeTasksTree(challengeId) {
    try {
      const tasks = await this.getChallengeTasks(challengeId);
      
      // Organize tasks into a tree structure
      const taskMap = {};
      const rootTasks = [];

      // First pass: create task map
      tasks.forEach(task => {
        taskMap[task.id] = {
          ...task,
          children: []
        };
      });

      // Second pass: organize into tree
      tasks.forEach(task => {
        if (task.parent_task_id) {
          // This is a subtask
          if (taskMap[task.parent_task_id]) {
            taskMap[task.parent_task_id].children.push(taskMap[task.id]);
          }
        } else {
          // This is a root task
          rootTasks.push(taskMap[task.id]);
        }
      });

      return rootTasks;
    } catch (error) {
      console.error('Error in getChallengeTasksTree:', error);
      throw error;
    }
  },

  // Update a task
  async updateChallengeTask(taskId, taskData) {
    try {
      const updateData = {};

      if (taskData.title !== undefined) updateData.title = taskData.title;
      if (taskData.startDate !== undefined) {
        updateData.start_date = typeof taskData.startDate === 'string' ? taskData.startDate : taskData.startDate.toISOString();
      }
      if (taskData.endDate !== undefined) {
        updateData.end_date = taskData.endDate ? (typeof taskData.endDate === 'string' ? taskData.endDate : taskData.endDate.toISOString()) : null;
      }
      if (taskData.parentTaskId !== undefined) updateData.parent_task_id = taskData.parentTaskId;

      const {data, error} = await supabase
        .from('challenge_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateChallengeTask:', error);
      throw error;
    }
  },

  // Delete a task and all its subtasks
  async deleteChallengeTask(taskId) {
    try {
      // Get all descendant tasks
      const descendants = await this.getTaskDescendants(taskId);
      const taskIdsToDelete = [taskId, ...descendants.map(t => t.id)];

      // Delete all tasks (cascade will handle subtasks)
      const {error} = await supabase
        .from('challenge_tasks')
        .delete()
        .in('id', taskIdsToDelete);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteChallengeTask:', error);
      throw error;
    }
  },

  // Get all descendants of a task (recursive)
  async getTaskDescendants(taskId) {
    try {
      const descendants = [];
      
      const {data: children, error} = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('parent_task_id', taskId);

      if (error) {
        throw error;
      }

      for (const child of children) {
        descendants.push(child);
        const childDescendants = await this.getTaskDescendants(child.id);
        descendants.push(...childDescendants);
      }

      return descendants;
    } catch (error) {
      console.error('Error in getTaskDescendants:', error);
      throw error;
    }
  },

  // Get task by ID
  async getChallengeTaskById(taskId) {
    try {
      const {data, error} = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getChallengeTaskById:', error);
      throw error;
    }
  },

  // Get tasks for a specific date range
  async getTasksInDateRange(challengeId, startDate, endDate) {
    try {
      const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
      const endDateStr = typeof endDate === 'string' ? endDate : endDate.toISOString();

      const {data, error} = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('challenge_id', challengeId)
        .gte('start_date', startDateStr)
        .lte('start_date', endDateStr) // Since tasks only have start_date
        .order('start_date', {ascending: true});

      if (error) {
        console.error('Error fetching tasks in date range:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTasksInDateRange:', error);
      throw error;
    }
  },

  // Get active tasks for today
  async getTodayActiveTasks(challengeId) {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const {data, error} = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('challenge_id', challengeId)
        .gte('start_date', todayStart.toISOString())
        .lte('start_date', todayEnd.toISOString())
        .order('created_at', {ascending: true});

      if (error) {
        console.error('Error fetching today active tasks:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTodayActiveTasks:', error);
      throw error;
    }
  },

  // ========== EXISTING CHALLENGE METHODS (PRESERVED) ==========

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

  // Get challenges with their tasks
  async getChallengesWithTasks(userId) {
    try {
      const challenges = await this.getChallenges(userId);
      
      for (const challenge of challenges) {
        challenge.tasks = await this.getChallengeTasksTree(challenge.id);
      }

      return challenges;
    } catch (error) {
      console.error('Error in getChallengesWithTasks:', error);
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

  // Get challenge with tasks by ID
  async getChallengeWithTasksById(challengeId) {
    try {
      const challenge = await this.getChallengeById(challengeId);
      challenge.tasks = await this.getChallengeTasksTree(challengeId);
      return challenge;
    } catch (error) {
      console.error('Error in getChallengeWithTasksById:', error);
      throw error;
    }
  },

  // Update challenge
  async updateChallenge(challengeId, challengeData) {
    try {
      const updateData = {};

      if (challengeData.name !== undefined) updateData.name = challengeData.name;
      if (challengeData.why !== undefined) updateData.why = challengeData.why;
      if (challengeData.numberOfDays !== undefined) updateData.number_of_days = challengeData.numberOfDays;
      if (challengeData.hoursPerDay !== undefined) updateData.hours_per_day = challengeData.hoursPerDay;
      if (challengeData.startDate !== undefined) updateData.start_date = challengeData.startDate;
      if (challengeData.endDate !== undefined) updateData.end_date = challengeData.endDate;

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

  // Delete a challenge (will cascade to delete tasks and completions)
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

  // ========== COMPLETION TRACKING METHODS WITH HOURS ==========

  // Mark a specific day as complete for a challenge with hours
  async markDayComplete(challengeId, userId, dayNumber, hoursCompleted = null) {
    try {
      const completionData = {
        challenge_id: challengeId,
        user_id: userId,
        day_number: dayNumber,
        completed_date: new Date().toISOString().split('T')[0],
      };

      // Add hours_completed if provided
      if (hoursCompleted !== null && hoursCompleted !== undefined) {
        completionData.hours_completed = hoursCompleted;
      }

      const {data, error} = await supabase
        .from('challenge_completions')
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

  // Unmark a day as complete
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

  // Get all completed days for a specific challenge (updated to include hours)
  async getCompletedDays(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('day_number, completed_date, created_at, hours_completed')
        .eq('challenge_id', challengeId)
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
        };
      });

      return completedDaysMap;
    } catch (error) {
      console.error('Error in getCompletedDays:', error);
      throw error;
    }
  },

  // Get completed days for multiple challenges (updated to include hours)
  async getCompletedDaysForChallenges(challengeIds, userId) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('challenge_id, day_number, completed_date, created_at, hours_completed')
        .in('challenge_id', challengeIds)
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
        if (!completedDaysByChallenge[completion.challenge_id]) {
          completedDaysByChallenge[completion.challenge_id] = {};
        }
        completedDaysByChallenge[completion.challenge_id][completion.day_number] = {
          completed: true,
          completedDate: completion.completed_date,
          createdAt: completion.created_at,
          hoursCompleted: completion.hours_completed || 0,
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
      const completionPercentage = Math.round((completedDays / totalDays) * 100);

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

  // Get total hours completed for a challenge
  async getTotalHoursCompleted(challengeId, userId) {
    try {
      const {data, error} = await supabase
        .from('challenge_completions')
        .select('hours_completed')
        .eq('challenge_id', challengeId)
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
        totalChallenges > 0 ? (totalDaysCommitted / totalChallenges).toFixed(1) : 0;

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

  // Get challenges for today
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

    if (currentDate < startDate) {
      return 0;
    }

    if (currentDate > endDate) {
      return 100;
    }

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  },

  // Get remaining days for a challenge
  getRemainingDays(challenge) {
    const endDate = new Date(challenge.end_date);
    const currentDate = new Date();

    if (currentDate > endDate) {
      return 0;
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
      return 0;
    }

    const timeDiff = currentDate - startDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDiff + 1);
  },
};