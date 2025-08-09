import { supabase } from '../../../supabase';

export const taskService = {
  // Create a new task
  async createTask(taskData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            // Basic task information
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            task_type: taskData.taskType,
            evaluation_type: taskData.evaluationType,
            
            // Visual and display properties
            time: taskData.time,
            time_color: taskData.timeColor,
            tags: taskData.tags,
            image: taskData.image,
            has_flag: taskData.hasFlag,
            priority: taskData.priority,
            
            // Task-specific data
            numeric_value: taskData.numericValue || 0,
            numeric_goal: taskData.numericGoal,
            numeric_unit: taskData.numericUnit,
            numeric_condition: taskData.numericCondition,
            
            // Timer-specific data
            timer_duration: taskData.timerDuration,
            timer_condition: taskData.timerCondition,
            
            // Checklist-specific data
            checklist_items: taskData.checklistItems,
            success_condition: taskData.successCondition,
            custom_items_count: taskData.customItemsCount || 1,
            
            // Repetition and frequency settings
            frequency_type: taskData.frequencyType,
            selected_weekdays: taskData.selectedWeekdays,
            selected_month_dates: taskData.selectedMonthDates,
            selected_year_dates: taskData.selectedYearDates,
            period_days: taskData.periodDays || 1,
            period_type: taskData.periodType,
            is_flexible: taskData.isFlexible || false,
            is_month_flexible: taskData.isMonthFlexible || false,
            is_year_flexible: taskData.isYearFlexible || false,
            use_day_of_week: taskData.useDayOfWeek || false,
            is_repeat_flexible: taskData.isRepeatFlexible || false,
            is_repeat_alternate_days: taskData.isRepeatAlternateDays || false,
            
            // Scheduling settings
            start_date: taskData.startDate,
            end_date: taskData.endDate,
            is_end_date_enabled: taskData.isEndDateEnabled || false,
            
            // Block time settings
            block_time_enabled: taskData.blockTimeEnabled || false,
            block_time_data: taskData.blockTimeData,
            
            // Duration settings
            duration_enabled: taskData.durationEnabled || false,
            duration_data: taskData.durationData,
            
            // Reminder settings
            reminder_enabled: taskData.reminderEnabled || false,
            reminder_data: taskData.reminderData,
            
            // Additional features
            add_pomodoro: taskData.addPomodoro || false,
            add_to_google_calendar: taskData.addToGoogleCalendar || false,
            is_pending_task: taskData.isPendingTask || false,
            
            // Goal linking
            linked_goal_id: taskData.linkedGoalId,
            linked_goal_title: taskData.linkedGoalTitle,
            linked_goal_type: taskData.linkedGoalType,
            
            // Notes
            note: taskData.note,
            
            // Progress tracking
            progress: taskData.progress,
            is_completed: false,
            completion_count: 0,
            streak_count: 0,
            
            // User and timestamps
            user_id: taskData.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createTask:', error);
      throw error;
    }
  },

  // Get all tasks for a user
  async getTasks(userId) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTasks:', error);
      throw error;
    }
  },

  // Get tasks by type (Habit, Recurring, Task, Goal)
  async getTasksByType(userId, taskType) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('task_type', taskType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by type:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTasksByType:', error);
      throw error;
    }
  },

  // Get tasks by category
  async getTasksByCategory(userId, category) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by category:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTasksByCategory:', error);
      throw error;
    }
  },

  // Update task completion status
  async updateTaskCompletion(taskId, completionData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_completed: completionData.isCompleted,
          completion_count: completionData.completionCount,
          streak_count: completionData.streakCount,
          last_completed_at: completionData.isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating task completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateTaskCompletion:', error);
      throw error;
    }
  },

  // Update numeric task value
  async updateNumericTaskValue(taskId, value) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          numeric_value: value,
          is_completed: value > 0,
          completion_count: value > 0 ? 1 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating numeric task value:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateNumericTaskValue:', error);
      throw error;
    }
  },

  // Update checklist task items and completion status
  async updateChecklistTask(taskId, checklistItems) {
    try {
      const completedCount = checklistItems.filter(item => item.completed).length;
      const totalCount = checklistItems.length;
      const isCompleted = completedCount === totalCount && totalCount > 0;

      const { data, error } = await supabase
        .from('tasks')
        .update({
          checklist_items: checklistItems,
          is_completed: isCompleted,
          completion_count: isCompleted ? 1 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating checklist task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateChecklistTask:', error);
      throw error;
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTask:', error);
      throw error;
    }
  }
}; 