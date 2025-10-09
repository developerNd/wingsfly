import {supabase} from '../../../supabase';

export const planYourDayService = {
  // Create a new Plan Your Day entry
  async createPlanYourDay(planData) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .insert([
          {
            // Basic plan information
            title: planData.title,
            description: planData.description,
            category: planData.category,
            plan_type: planData.planType, // 'hours' or 'tasks'
            evaluation_type: planData.evaluationType, // 'yesNo', 'timer', 'checklist', 'timerTracker'

            // Plan-specific data
            target_hours: planData.targetHours || null,
            target_tasks: planData.targetTasks || null,

            // Visual and display properties
            time: planData.time,
            time_color: planData.timeColor || '#E4EBF3',
            tags: planData.tags || [],
            priority: planData.priority,

            // Timer-specific data (for timer evaluation type)
            timer_duration: planData.timerDuration,
            pomodoro_settings: planData.pomodoroSettings,

            // Checklist-specific data (for checklist evaluation type)
            checklist_items: planData.checklistItems,

            // Scheduling settings
            start_date: planData.startDate,
            end_date: planData.endDate,
            is_end_date_enabled: planData.isEndDateEnabled || false,
            start_time: planData.startTime || null,

            // Block time and duration settings
            block_time_data: planData.blockTimeData,
            duration_data: planData.durationData,

            // Reminder settings
            reminder_enabled: planData.reminderEnabled || false,
            reminder_data: planData.reminderData,

            // Additional features
            add_to_google_calendar: planData.addToGoogleCalendar || false,
            is_pending_task: planData.isPendingTask || false,

            // Pomodoro settings (for timer evaluation type)
            focus_duration: planData.focusDuration || null,
            short_break_duration: planData.shortBreakDuration || null,
            long_break_duration: planData.longBreakDuration || null,
            auto_start_short_breaks: planData.autoStartShortBreaks || false,
            auto_start_focus_sessions: planData.autoStartFocusSessions || false,
            focus_sessions_per_round: planData.focusSessionsPerRound || null,

            // Goal linking
            linked_goal_id: planData.linkedGoalId,
            linked_goal_title: planData.linkedGoalTitle,
            linked_goal_type: planData.linkedGoalType,

            // Notes
            note: planData.note,

            // Progress tracking (removed completion fields as requested)
            actual_hours: 0,
            actual_tasks: 0,

            // User ID
            user_id: planData.userId,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating Plan Your Day:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createPlanYourDay:', error);
      throw error;
    }
  },

  // Get all Plan Your Day entries for a user
  async getPlanYourDayEntries(userId) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching Plan Your Day entries:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlanYourDayEntries:', error);
      throw error;
    }
  },

  // Get Plan Your Day entries for a specific date
  async getPlanYourDayForDate(userId, date) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .select('*')
        .eq('user_id', userId)
        .eq('start_date', date)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching Plan Your Day for date:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlanYourDayForDate:', error);
      throw error;
    }
  },

  // Get single Plan Your Day entry by ID
  async getPlanYourDayById(planId) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        console.error('Error fetching Plan Your Day by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlanYourDayById:', error);
      throw error;
    }
  },

  // NEW: Plan Your Day Yes/No completion using task_completions table
  async upsertPlanYesNoCompletion(planId, userId, completionDate, isCompleted) {
    try {
      const {data, error} = await supabase
        .from('task_completions')
        .upsert({
          task_id: planId,
          user_id: userId,
          completion_date: completionDate,
          evaluation_type: 'yesNo',
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Error upserting Plan Your Day yes/no completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in upsertPlanYesNoCompletion:', error);
      throw error;
    }
  },

  // NEW: Plan Your Day Timer completion using task_completions table
  async upsertPlanTimerCompletion(planId, userId, completionDate, timerValue, isCompleted) {
    try {
      const {data, error} = await supabase
        .from('task_completions')
        .upsert({
          task_id: planId,
          user_id: userId,
          completion_date: completionDate,
          evaluation_type: 'timer',
          timer_value: timerValue,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Error upserting Plan Your Day timer completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in upsertPlanTimerCompletion:', error);
      throw error;
    }
  },

  // NEW: Plan Your Day Timer Tracker completion using task_completions table
  async upsertPlanTimerTrackerCompletion(planId, userId, completionDate, timerValue, isCompleted) {
    try {
      const {data, error} = await supabase
        .from('task_completions')
        .upsert({
          task_id: planId,
          user_id: userId,
          completion_date: completionDate,
          evaluation_type: 'timerTracker',
          timer_value: timerValue,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Error upserting Plan Your Day timer tracker completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in upsertPlanTimerTrackerCompletion:', error);
      throw error;
    }
  },

  // NEW: Plan Your Day Checklist completion using task_completions table
  async upsertPlanChecklistCompletion(planId, userId, completionDate, checklistItems, completedCount, isCompleted) {
    try {
      const {data, error} = await supabase
        .from('task_completions')
        .upsert({
          task_id: planId,
          user_id: userId,
          completion_date: completionDate,
          evaluation_type: 'checklist',
          checklist_items: checklistItems,
          completed_items_count: completedCount,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Error upserting Plan Your Day checklist completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in upsertPlanChecklistCompletion:', error);
      throw error;
    }
  },

  // NEW: Get Plan Your Day completions for a specific date
  async getPlanCompletionsForDate(userId, completionDate) {
    try {
      // Get all plan IDs first
      const {data: plans, error: plansError} = await supabase
        .from('plan_your_day')
        .select('id')
        .eq('user_id', userId);

      if (plansError) {
        console.error('Error fetching plan IDs:', plansError);
        throw plansError;
      }

      if (!plans || plans.length === 0) {
        return [];
      }

      const planIds = plans.map(plan => plan.id);

      // Get completions for these plan IDs
      const {data, error} = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('completion_date', completionDate)
        .in('task_id', planIds);

      if (error) {
        console.error('Error fetching Plan Your Day completions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPlanCompletionsForDate:', error);
      throw error;
    }
  },

  // UPDATED: Legacy completion method - now uses task_completions table
  async updatePlanYourDayCompletion(planId, completionData) {
    try {
      // Use task_completions table instead of plan_your_day table
      const completionDate = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      
      const {data, error} = await supabase
        .from('task_completions')
        .upsert({
          task_id: planId,
          user_id: completionData.userId, // Need to pass userId in completionData
          completion_date: completionDate,
          evaluation_type: 'yesNo', // Default for simple completion
          is_completed: completionData.isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Error updating Plan Your Day completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updatePlanYourDayCompletion:', error);
      throw error;
    }
  },

  // Update Plan Your Day progress (for timer tracker)
  async updatePlanYourDayProgress(planId, progressData) {
    try {
      const updateData = {
        actual_hours: progressData.actualHours || 0,
        actual_tasks: progressData.actualTasks || 0,
        updated_at: new Date().toISOString(),
      };

      // Check if plan is completed based on targets
      if (progressData.targetHours && progressData.actualHours >= progressData.targetHours) {
        updateData.is_completed = true;
        updateData.completion_date = new Date().toISOString();
      } else if (progressData.targetTasks && progressData.actualTasks >= progressData.targetTasks) {
        updateData.is_completed = true;
        updateData.completion_date = new Date().toISOString();
      }

      const {data, error} = await supabase
        .from('plan_your_day')
        .update(updateData)
        .eq('id', planId)
        .select();

      if (error) {
        console.error('Error updating Plan Your Day progress:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updatePlanYourDayProgress:', error);
      throw error;
    }
  },

  // Update Plan Your Day entry
  async updatePlanYourDay(planId, planData) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .update({
          ...planData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select();

      if (error) {
        console.error('Error updating Plan Your Day:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updatePlanYourDay:', error);
      throw error;
    }
  },

  // Delete Plan Your Day entry
  async deletePlanYourDay(planId) {
    try {
      // Delete associated completions first
      const {error: completionsError} = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', planId);

      if (completionsError) {
        console.error('Error deleting Plan Your Day completions:', completionsError);
        throw completionsError;
      }

      // Then delete the plan
      const {error} = await supabase
        .from('plan_your_day')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting Plan Your Day:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePlanYourDay:', error);
      throw error;
    }
  },

  // Get Plan Your Day statistics
  async getPlanYourDayStatistics(userId) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching Plan Your Day statistics:', error);
        throw error;
      }

      const totalPlans = data.length;
      const completedPlans = data.filter(plan => plan.is_completed).length;
      const pendingPlans = totalPlans - completedPlans;
      const completionRate = totalPlans > 0 ? ((completedPlans / totalPlans) * 100).toFixed(1) : 0;

      const plansByType = data.reduce((acc, plan) => {
        acc[plan.plan_type] = (acc[plan.plan_type] || 0) + 1;
        return acc;
      }, {});

      const plansByEvaluationType = data.reduce((acc, plan) => {
        acc[plan.evaluation_type] = (acc[plan.evaluation_type] || 0) + 1;
        return acc;
      }, {});

      const totalTargetHours = data.reduce((sum, plan) => sum + (plan.target_hours || 0), 0);
      const totalActualHours = data.reduce((sum, plan) => sum + (plan.actual_hours || 0), 0);
      const totalTargetTasks = data.reduce((sum, plan) => sum + (plan.target_tasks || 0), 0);
      const totalActualTasks = data.reduce((sum, plan) => sum + (plan.actual_tasks || 0), 0);

      return {
        totalPlans,
        completedPlans,
        pendingPlans,
        completionRate,
        plansByType,
        plansByEvaluationType,
        hoursStats: {
          totalTargetHours,
          totalActualHours,
          averageTargetHours: totalPlans > 0 ? (totalTargetHours / totalPlans).toFixed(1) : 0,
          averageActualHours: totalPlans > 0 ? (totalActualHours / totalPlans).toFixed(1) : 0,
        },
        tasksStats: {
          totalTargetTasks,
          totalActualTasks,
          averageTargetTasks: totalPlans > 0 ? (totalTargetTasks / totalPlans).toFixed(1) : 0,
          averageActualTasks: totalPlans > 0 ? (totalActualTasks / totalPlans).toFixed(1) : 0,
        },
      };
    } catch (error) {
      console.error('Error in getPlanYourDayStatistics:', error);
      throw error;
    }
  },

  // Reset Plan Your Day completion (for new day)
  async resetPlanYourDayCompletion(planId) {
    try {
      const {data, error} = await supabase
        .from('plan_your_day')
        .update({
          is_completed: false,
          completion_date: null,
          actual_hours: 0,
          actual_tasks: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select();

      if (error) {
        console.error('Error resetting Plan Your Day completion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in resetPlanYourDayCompletion:', error);
      throw error;
    }
  },
};