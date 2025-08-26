import {supabase} from '../../../supabase';

export const plannerService = {
  // Create a new planner task
  async createPlannerTask(taskData) {
    try {
      const {data, error} = await supabase
        .from('planner_tasks')
        .insert([
          {
            task_name: taskData.taskName,
            target_date: taskData.targetDate,
            user_id: taskData.userId, // optional - remove if not using user authentication
          },
        ])
        .select();

      if (error) {
        console.error('Error creating planner task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createPlannerTask:', error);
      throw error;
    }
  },

  // Get all planner tasks for a user
  async getPlannerTasks(userId = null) {
    try {
      let query = supabase
        .from('planner_tasks')
        .select('*')
        .order('target_date', {ascending: true});

      // Only filter by user_id if provided (for user-specific data)
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const {data, error} = await query;

      if (error) {
        console.error('Error fetching planner tasks:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlannerTasks:', error);
      throw error;
    }
  },

  // Update a planner task
  async updatePlannerTask(taskId, taskData) {
    try {
      const {data, error} = await supabase
        .from('planner_tasks')
        .update({
          task_name: taskData.taskName,
          target_date: taskData.targetDate,
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Error updating planner task:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updatePlannerTask:', error);
      throw error;
    }
  },

  // Delete a planner task
  async deletePlannerTask(taskId) {
    try {
      const {error} = await supabase
        .from('planner_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting planner task:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePlannerTask:', error);
      throw error;
    }
  },

  // Get tasks for a specific date
  async getTasksForDate(date, userId = null) {
    try {
      let query = supabase
        .from('planner_tasks')
        .select('*')
        .eq('target_date', date)
        .order('created_at', {ascending: false});

      // Only filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const {data, error} = await query;

      if (error) {
        console.error('Error fetching tasks for date:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTasksForDate:', error);
      throw error;
    }
  },

  // Get tasks within a date range
  async getTasksInDateRange(startDate, endDate, userId = null) {
    try {
      let query = supabase
        .from('planner_tasks')
        .select('*')
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date', {ascending: true});

      // Only filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const {data, error} = await query;

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

  // Get overdue tasks
  async getOverdueTasks(userId = null) {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      let query = supabase
        .from('planner_tasks')
        .select('*')
        .lt('target_date', today)
        .order('target_date', {ascending: false});

      // Only filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const {data, error} = await query;

      if (error) {
        console.error('Error fetching overdue tasks:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getOverdueTasks:', error);
      throw error;
    }
  },

  // Helper function to format date for database (YYYY-MM-DD)
  formatDateForDB(date) {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  },

  // Helper function to calculate due date text
  calculateDueDateText(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Due Today';
    } else if (diffDays === 1) {
      return 'Due Tomorrow';
    } else if (diffDays > 1) {
      return `Due in ${diffDays} days`;
    } else if (diffDays === -1) {
      return 'Due Yesterday';
    } else {
      return `Overdue by ${Math.abs(diffDays)} days`;
    }
  },
};