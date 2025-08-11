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

  // Helper function to check numeric completion based on condition
  checkNumericCompletion(value, target, condition) {
    const normalizedCondition = condition?.toLowerCase() || 'any value';
    
    switch (normalizedCondition) {
      case 'any value':
      case 'any':
        return value > 0;
      case 'less than':
      case 'lessthan':
        return value < target;
      case 'exactly':
      case 'exact':
        return value === target;
      case 'at least':
      case 'atleast':
        return value >= target;
      default:
        return value > 0; // Default to any value
    }
  },

  // Update numeric task value with completion logic
  async updateNumericTaskValue(taskId, value, isCompleted = null) {
    try {
      // If isCompleted is not provided, calculate it based on the task's condition
      let finalIsCompleted = isCompleted;
      
      if (finalIsCompleted === null) {
        // Fetch the task to get its condition if not provided
        const { data: taskData, error: fetchError } = await supabase
          .from('tasks')
          .select('numeric_goal, numeric_condition')
          .eq('id', taskId)
          .single();
          
        if (fetchError) {
          console.error('Error fetching task for completion check:', fetchError);
          finalIsCompleted = value > 0; // Default fallback
        } else {
          finalIsCompleted = this.checkNumericCompletion(value, taskData.numeric_goal, taskData.numeric_condition);
        }
      }

      const updateData = {
        numeric_value: value,
        is_completed: finalIsCompleted,
        updated_at: new Date().toISOString()
      };

      // Update completion count and streak if completed
      if (finalIsCompleted) {
        // Get current completion data
        const { data: currentTask, error: getCurrentError } = await supabase
          .from('tasks')
          .select('completion_count, streak_count')
          .eq('id', taskId)
          .single();

        if (!getCurrentError) {
          updateData.completion_count = (currentTask.completion_count || 0) + 1;
          updateData.streak_count = (currentTask.streak_count || 0) + 1;
          updateData.last_completed_at = new Date().toISOString();
        }
      } else {
        updateData.completion_count = 0;
        updateData.last_completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
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

      const updateData = {
        checklist_items: checklistItems,
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      };

      // Update completion count and streak if completed
      if (isCompleted) {
        // Get current completion data
        const { data: currentTask, error: getCurrentError } = await supabase
          .from('tasks')
          .select('completion_count, streak_count')
          .eq('id', taskId)
          .single();

        if (!getCurrentError) {
          updateData.completion_count = (currentTask.completion_count || 0) + 1;
          updateData.streak_count = (currentTask.streak_count || 0) + 1;
          updateData.last_completed_at = new Date().toISOString();
        }
      } else {
        updateData.completion_count = 0;
        updateData.last_completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
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

  // Update timer task completion
  async updateTimerTaskCompletion(taskId, timerData) {
    try {
      const { duration, condition, isCompleted } = timerData;
      
      const updateData = {
        timer_duration: duration,
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      };

      // Update completion count and streak if completed
      if (isCompleted) {
        // Get current completion data
        const { data: currentTask, error: getCurrentError } = await supabase
          .from('tasks')
          .select('completion_count, streak_count')
          .eq('id', taskId)
          .single();

        if (!getCurrentError) {
          updateData.completion_count = (currentTask.completion_count || 0) + 1;
          updateData.streak_count = (currentTask.streak_count || 0) + 1;
          updateData.last_completed_at = new Date().toISOString();
        }
      } else {
        updateData.completion_count = 0;
        updateData.last_completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating timer task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateTimerTaskCompletion:', error);
      throw error;
    }
  },

  // Get single task by ID
  async getTaskById(taskId) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTaskById:', error);
      throw error;
    }
  },

  // Update task
  async updateTask(taskId, taskData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...taskData,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateTask:', error);
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
  },

  // Get tasks for a specific date
  async getTasksForDate(userId, date) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks for date:', error);
        throw error;
      }

      // Filter tasks based on date logic (this would need to be implemented based on your date filtering logic)
      // For now, returning all tasks - you can add date filtering logic here
      return data;
    } catch (error) {
      console.error('Error in getTasksForDate:', error);
      throw error;
    }
  },

  // Get task statistics
  async getTaskStatistics(userId) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching task statistics:', error);
        throw error;
      }

      const totalTasks = data.length;
      const completedTasks = data.filter(task => task.is_completed).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

      const tasksByType = data.reduce((acc, task) => {
        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
        return acc;
      }, {});

      const tasksByCategory = data.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {});

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        tasksByType,
        tasksByCategory,
        totalStreakCount: data.reduce((sum, task) => sum + (task.streak_count || 0), 0),
        averageStreakCount: totalTasks > 0 ? (data.reduce((sum, task) => sum + (task.streak_count || 0), 0) / totalTasks).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error in getTaskStatistics:', error);
      throw error;
    }
  },

  // Reset task completion (for new day/period)
  async resetTaskCompletion(taskId) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_completed: false,
          numeric_value: 0,
          last_completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error resetting task completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in resetTaskCompletion:', error);
      throw error;
    }
  }
};