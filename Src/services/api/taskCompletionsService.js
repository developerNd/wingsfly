import {supabase} from '../../../supabase';

export const taskCompletionsService = {
  // Create or update a task completion for a specific date
  async upsertTaskCompletion(taskId, userId, completionDate, completionData) {
    try {
      const dateString =
        completionDate instanceof Date
          ? completionDate.toISOString().split('T')[0]
          : completionDate;

      // Determine if it's a plan or task
      const isplan = taskId.toString().startsWith('plan_');
      const actualId = isplan ? taskId.replace('plan_', '') : taskId;

      console.log(`Upserting completion for: ${actualId}`);

      const baseData = {
        task_id: actualId,
        user_id: userId,
        completion_date: dateString,
        updated_at: new Date().toISOString(),
      };

      const upsertData = {...baseData, ...completionData};

      const {data, error} = await supabase
        .from('task_completions')
        .upsert([upsertData], {
          onConflict: 'task_id,completion_date,user_id',
          returning: 'representation',
        })
        .select();

      if (error) {
        console.error('Error upserting task completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in upsertTaskCompletion:', error);
      throw error;
    }
  },

  // Get task completion for a specific date
  async getTaskCompletion(taskId, userId, completionDate) {
    try {
      const dateString =
        completionDate instanceof Date
          ? completionDate.toISOString().split('T')[0]
          : completionDate;

      const isplan = taskId.toString().startsWith('plan_');
      const actualId = isplan ? taskId.replace('plan_', '') : taskId;

      const {data, error} = await supabase
        .from('task_completions')
        .select('*')
        .eq('task_id', actualId)
        .eq('user_id', userId)
        .eq('completion_date', dateString)
        .maybeSingle();

      if (error) {
        console.error('Error fetching task completion:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTaskCompletion:', error);
      throw error;
    }
  },

  // Get all task completions for a specific date
  async getTaskCompletionsForDate(userId, completionDate) {
    try {
      const dateString =
        completionDate instanceof Date
          ? completionDate.toISOString().split('T')[0]
          : completionDate;

      const {data, error} = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('completion_date', dateString);

      if (error) {
        console.error('Error fetching task completions for date:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTaskCompletionsForDate:', error);
      throw error;
    }
  },

  // Get task completions for a date range
  async getTaskCompletionsForDateRange(userId, startDate, endDate) {
    try {
      const startDateString =
        startDate instanceof Date
          ? startDate.toISOString().split('T')[0]
          : startDate;
      const endDateString =
        endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;

      const {data, error} = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completion_date', startDateString)
        .lte('completion_date', endDateString)
        .order('completion_date', {ascending: true});

      if (error) {
        console.error('Error fetching task completions for date range:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTaskCompletionsForDateRange:', error);
      throw error;
    }
  },

  // Delete task completion for a specific date
  async deleteTaskCompletion(taskId, userId, completionDate) {
    try {
      const dateString =
        completionDate instanceof Date
          ? completionDate.toISOString().split('T')[0]
          : completionDate;

      const isplan = taskId.toString().startsWith('plan_');
      const actualId = isplan ? taskId.replace('plan_', '') : taskId;

      const {error} = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', actualId)
        .eq('user_id', userId)
        .eq('completion_date', dateString);

      if (error) {
        console.error('Error deleting task completion:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTaskCompletion:', error);
      throw error;
    }
  },

  // Yes/No task completion
  async upsertYesNoCompletion(taskId, userId, completionDate, isCompleted) {
    return this.upsertTaskCompletion(taskId, userId, completionDate, {
      is_completed: isCompleted,
      timer_value: null,
      checklist_items: null,
      checklist_completed_count: null,
      numeric_value: null,
      numeric_unit: null,
    });
  },

  // Timer task completion
  async upsertTimerCompletion(
    taskId,
    userId,
    completionDate,
    timerValue,
    isCompleted,
  ) {
    return this.upsertTaskCompletion(taskId, userId, completionDate, {
      is_completed: isCompleted,
      timer_value: timerValue,
      checklist_items: null,
      checklist_completed_count: null,
      numeric_value: null,
      numeric_unit: null,
    });
  },

  // Checklist task completion
  async upsertChecklistCompletion(
    taskId,
    userId,
    completionDate,
    checklistItems,
    completedCount,
    isCompleted,
  ) {
    return this.upsertTaskCompletion(taskId, userId, completionDate, {
      is_completed: isCompleted,
      checklist_items: checklistItems,
      checklist_completed_count: completedCount,
      timer_value: null,
      numeric_value: null,
      numeric_unit: null,
    });
  },

  // Numeric task completion
  async upsertNumericCompletion(
    taskId,
    userId,
    completionDate,
    numericValue,
    numericUnit,
    isCompleted,
  ) {
    return this.upsertTaskCompletion(taskId, userId, completionDate, {
      is_completed: isCompleted,
      numeric_value: numericValue,
      numeric_unit: numericUnit,
      timer_value: null,
      checklist_items: null,
      checklist_completed_count: null,
    });
  },

  // In taskCompletionsService.js
  async getAllTaskCompletions(taskId, userId) {
    try {
      const isplan = taskId.toString().startsWith('plan_');
      const actualId = isplan ? taskId.replace('plan_', '') : taskId;

      const {data, error} = await supabase
        .from('task_completions')
        .select('*')
        .eq('task_id', actualId)
        .eq('user_id', userId)
        .order('completion_date', {ascending: false});

      if (error) {
        console.error('Error fetching all task completions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllTaskCompletions:', error);
      throw error;
    }
  },

  // Get task completion statistics
  async getTaskCompletionStats(
    userId,
    taskId,
    startDate = null,
    endDate = null,
  ) {
    try {
      const isplan = taskId.toString().startsWith('plan_');
      const actualId = isplan ? taskId.replace('plan_', '') : taskId;

      let query = supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', actualId);

      if (startDate) {
        const startDateString =
          startDate instanceof Date
            ? startDate.toISOString().split('T')[0]
            : startDate;
        query = query.gte('completion_date', startDateString);
      }

      if (endDate) {
        const endDateString =
          endDate instanceof Date
            ? endDate.toISOString().split('T')[0]
            : endDate;
        query = query.lte('completion_date', endDateString);
      }

      const {data, error} = await query.order('completion_date', {
        ascending: true,
      });

      if (error) {
        console.error('Error fetching task completion stats:', error);
        throw error;
      }

      const completions = data || [];
      const totalDays = completions.length;
      const completedDays = completions.filter(
        completion => completion.is_completed === true,
      ).length;

      // Calculate current streak
      let currentStreak = 0;
      const sortedCompletions = completions.sort(
        (a, b) => new Date(b.completion_date) - new Date(a.completion_date),
      );

      for (const completion of sortedCompletions) {
        if (completion.is_completed === true) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;

      for (const completion of completions) {
        if (completion.is_completed === true) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      return {
        totalDays,
        completedDays,
        completionRate:
          totalDays > 0 ? ((completedDays / totalDays) * 100).toFixed(1) : 0,
        currentStreak,
        longestStreak,
        lastCompletedDate:
          completions.find(c => c.is_completed)?.completion_date || null,
      };
    } catch (error) {
      console.error('Error in getTaskCompletionStats:', error);
      throw error;
    }
  },
};
