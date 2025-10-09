import {supabase} from '../../../supabase';

export const timerActivityService = {
  // Track play action
  async trackPlay(taskId, userId, sessionData = {}) {
    try {
      const activityData = {
        task_id: taskId,
        user_id: userId,
        activity_type: 'play',
        timestamp: new Date().toISOString(),
        session_data: {
          current_time: sessionData.currentTime || 0,
          target_time: sessionData.targetTime || 0,
          current_cycle: sessionData.currentCycle || 1,
          session_in_cycle: sessionData.sessionInCycle || 1,
          is_on_break: sessionData.isOnBreak || false,
          current_break_type: sessionData.currentBreakType || null,
          ...sessionData
        }
      };

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .insert([activityData])
        .select();

      if (error) {
        console.error('Error tracking play activity:', error);
        throw error;
      }

      console.log('Play activity tracked:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error in trackPlay:', error);
      throw error;
    }
  },

  // Track pause action
  async trackPause(taskId, userId, sessionData = {}) {
    try {
      const activityData = {
        task_id: taskId,
        user_id: userId,
        activity_type: 'pause',
        timestamp: new Date().toISOString(),
        session_data: {
          current_time: sessionData.currentTime || 0,
          target_time: sessionData.targetTime || 0,
          current_cycle: sessionData.currentCycle || 1,
          session_in_cycle: sessionData.sessionInCycle || 1,
          is_on_break: sessionData.isOnBreak || false,
          current_break_type: sessionData.currentBreakType || null,
          completed_pomodoros: sessionData.completedPomodoros || 0,
          completed_breaks: sessionData.completedBreaks || 0,
          ...sessionData
        }
      };

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .insert([activityData])
        .select();

      if (error) {
        console.error('Error tracking pause activity:', error);
        throw error;
      }

      console.log('Pause activity tracked:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error in trackPause:', error);
      throw error;
    }
  },

  // Track stop action
  async trackStop(taskId, userId, sessionData = {}) {
    try {
      const totalDuration = sessionData.totalCompletedTime || 0;
      const totalSessions = (sessionData.completedPomodoros || 0) + (sessionData.completedBreaks || 0);

      const activityData = {
        task_id: taskId,
        user_id: userId,
        activity_type: 'stop',
        timestamp: new Date().toISOString(),
        total_sessions: totalSessions,
        total_duration: totalDuration,
        session_data: {
          current_time: sessionData.currentTime || 0,
          target_time: sessionData.targetTime || 0,
          current_cycle: sessionData.currentCycle || 1,
          session_in_cycle: sessionData.sessionInCycle || 1,
          is_on_break: sessionData.isOnBreak || false,
          completed_pomodoros: sessionData.completedPomodoros || 0,
          completed_breaks: sessionData.completedBreaks || 0,
          completed_short_breaks: sessionData.completedShortBreaks || 0,
          completed_long_breaks: sessionData.completedLongBreaks || 0,
          was_stopped_by_user: true,
          ...sessionData
        }
      };

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .insert([activityData])
        .select();

      if (error) {
        console.error('Error tracking stop activity:', error);
        throw error;
      }

      console.log('Stop activity tracked:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error in trackStop:', error);
      throw error;
    }
  },

  // Track complete action
  async trackComplete(taskId, userId, sessionData = {}) {
    try {
      const totalDuration = sessionData.totalCompletedTime || 0;
      const totalSessions = (sessionData.completedPomodoros || 0) + (sessionData.completedBreaks || 0);

      const activityData = {
        task_id: taskId,
        user_id: userId,
        activity_type: 'complete',
        timestamp: new Date().toISOString(),
        total_sessions: totalSessions,
        total_duration: totalDuration,
        session_data: {
          current_time: sessionData.currentTime || 0,
          target_time: sessionData.targetTime || 0,
          current_cycle: sessionData.currentCycle || 1,
          session_in_cycle: sessionData.sessionInCycle || 1,
          is_on_break: sessionData.isOnBreak || false,
          completed_pomodoros: sessionData.completedPomodoros || 0,
          completed_breaks: sessionData.completedBreaks || 0,
          completed_short_breaks: sessionData.completedShortBreaks || 0,
          completed_long_breaks: sessionData.completedLongBreaks || 0,
          was_completed_by_user: true,
          completion_type: 'user_completed',
          ...sessionData
        }
      };

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .insert([activityData])
        .select();

      if (error) {
        console.error('Error tracking complete activity:', error);
        throw error;
      }

      console.log('Complete activity tracked:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error in trackComplete:', error);
      throw error;
    }
  },

  // Track session completion (automatic)
  async trackSessionCompletion(taskId, userId, sessionData = {}) {
    try {
      const activityData = {
        task_id: taskId,
        user_id: userId,
        activity_type: 'session_complete',
        timestamp: new Date().toISOString(),
        session_data: {
          session_type: sessionData.sessionType || 'focus',
          session_duration: sessionData.sessionDuration || 0,
          current_cycle: sessionData.currentCycle || 1,
          session_in_cycle: sessionData.sessionInCycle || 1,
          auto_completed: true,
          ...sessionData
        }
      };

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .insert([activityData])
        .select();

      if (error) {
        console.error('Error tracking session completion:', error);
        throw error;
      }

      console.log('Session completion tracked:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error in trackSessionCompletion:', error);
      throw error;
    }
  },

  // Get activity history for a task
  async getTaskActivity(taskId, userId, limit = 50) {
    try {
      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('timestamp', {ascending: false})
        .limit(limit);

      if (error) {
        console.error('Error fetching task activity:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTaskActivity:', error);
      throw error;
    }
  },

  // Get user's total timer activity stats
  async getUserTimerStats(userId, dateFrom = null, dateTo = null) {
    try {
      let query = supabase
        .from('timer_activity_tracking')
        .select('*')
        .eq('user_id', userId);

      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }
      if (dateTo) {
        query = query.lte('timestamp', dateTo);
      }

      const {data, error} = await query.order('timestamp', {ascending: false});

      if (error) {
        console.error('Error fetching user timer stats:', error);
        throw error;
      }

      // Calculate stats
      const totalActivities = data.length;
      const playCount = data.filter(a => a.activity_type === 'play').length;
      const pauseCount = data.filter(a => a.activity_type === 'pause').length;
      const stopCount = data.filter(a => a.activity_type === 'stop').length;
      const completeCount = data.filter(a => a.activity_type === 'complete').length;
      
      const totalDuration = data
        .filter(a => a.total_duration)
        .reduce((sum, a) => sum + (a.total_duration || 0), 0);
      
      const totalSessions = data
        .filter(a => a.total_sessions)
        .reduce((sum, a) => sum + (a.total_sessions || 0), 0);

      return {
        totalActivities,
        playCount,
        pauseCount,
        stopCount,
        completeCount,
        totalDuration,
        totalSessions,
        activityBreakdown: {
          play: playCount,
          pause: pauseCount,
          stop: stopCount,
          complete: completeCount,
          session_complete: data.filter(a => a.activity_type === 'session_complete').length
        }
      };
    } catch (error) {
      console.error('Error in getUserTimerStats:', error);
      throw error;
    }
  },

  // Delete old activity records (cleanup utility)
  async cleanupOldActivities(userId, daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const {data, error} = await supabase
        .from('timer_activity_tracking')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old activities:', error);
        throw error;
      }

      console.log('Old activities cleaned up');
      return true;
    } catch (error) {
      console.error('Error in cleanupOldActivities:', error);
      throw error;
    }
  }
};