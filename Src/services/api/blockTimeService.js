import {supabase} from '../../../supabase';

export const blockTimeService = {
  /**
   * Get all tasks with block time enabled for a specific date
   * Supports both tasks and plan_your_day tables
   */
  async getBlockTimeTasksForDate(userId, date) {
    try {
      console.log('📅 [BlockTime] Fetching tasks for date:', date);

      const results = {
        tasks: [],
        plans: [],
        all: []
      };

      // 1. Fetch from TASKS table
      const {data: tasksData, error: tasksError} = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('block_time_enabled', true)
        .in('evaluation_type', ['timer', 'timerTracker']);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      // 2. Fetch from PLAN_YOUR_DAY table
      const {data: plansData, error: plansError} = await supabase
        .from('plan_your_day')
        .select('*')
        .eq('user_id', userId)
        .in('evaluation_type', ['timer', 'timerTracker']);

      if (plansError) {
        console.error('Error fetching plans:', plansError);
        throw plansError;
      }

      // 3. Filter tasks for the specific date based on frequency
      const filteredTasks = this.filterTasksForDate(tasksData || [], date);
      const filteredPlans = this.filterPlansForDate(plansData || [], date);

      results.tasks = filteredTasks;
      results.plans = filteredPlans;
      results.all = [
        ...filteredTasks.map(t => ({...t, source: 'tasks'})),
        ...filteredPlans.map(p => ({...p, source: 'plan_your_day'}))
      ];

      console.log('✅ [BlockTime] Found tasks:', {
        tasksCount: filteredTasks.length,
        plansCount: filteredPlans.length,
        total: results.all.length
      });

      return results;
    } catch (error) {
      console.error('❌ [BlockTime] Error fetching tasks:', error);
      throw error;
    }
  },

  /**
   * Filter tasks based on their frequency settings for a specific date
   */
  filterTasksForDate(tasks, targetDateString) {
    const targetDate = new Date(targetDateString);
    targetDate.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      // Check if task has valid block time data
      if (!task.block_time_data || !task.block_time_data.start_time) {
        return false;
      }

      const startDate = new Date(task.start_date);
      startDate.setHours(0, 0, 0, 0);

      // Check if target date is after start date
      if (targetDate < startDate) {
        return false;
      }

      // Check end date if enabled
      if (task.is_end_date_enabled && task.end_date) {
        const endDate = new Date(task.end_date);
        endDate.setHours(0, 0, 0, 0);
        if (targetDate > endDate) {
          return false;
        }
      }

      // Check frequency type
      const frequencyType = task.frequency_type || 'Once';

      switch (frequencyType) {
        case 'Once':
          return this.isSameDate(targetDate, startDate);

        case 'Daily':
          return true; // Every day from start date

        case 'Weekdays':
          return this.matchesWeekdays(targetDate, task.selected_weekdays);

        case 'Monthly':
          return this.matchesMonthDates(targetDate, task.selected_month_dates);

        case 'Yearly':
          return this.matchesYearDates(targetDate, task.selected_year_dates);

        case 'Repeat':
          return this.matchesRepeatPattern(targetDate, startDate, task);

        default:
          return false;
      }
    });
  },

  /**
   * Filter plans for a specific date (plans are usually for specific dates)
   */
  filterPlansForDate(plans, targetDateString) {
    const targetDate = new Date(targetDateString);
    targetDate.setHours(0, 0, 0, 0);

    return plans.filter(plan => {
      // Check if plan has valid block time data
      if (!plan.block_time_data || !plan.block_time_data.start_time) {
        return false;
      }

      const planDate = new Date(plan.start_date);
      planDate.setHours(0, 0, 0, 0);

      return this.isSameDate(targetDate, planDate);
    });
  },

  /**
   * Check if two dates are the same day
   */
  isSameDate(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  },

  /**
   * Check if date matches selected weekdays
   */
  matchesWeekdays(date, selectedWeekdays) {
    if (!selectedWeekdays || selectedWeekdays.length === 0) {
      return false;
    }

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return selectedWeekdays.includes(dayOfWeek);
  },

  /**
   * Check if date matches selected month dates
   */
  matchesMonthDates(date, selectedMonthDates) {
    if (!selectedMonthDates || selectedMonthDates.length === 0) {
      return false;
    }

    const dayOfMonth = date.getDate();
    return selectedMonthDates.includes(dayOfMonth);
  },

  /**
   * Check if date matches selected year dates
   */
  matchesYearDates(date, selectedYearDates) {
    if (!selectedYearDates || selectedYearDates.length === 0) {
      return false;
    }

    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
    return selectedYearDates.some(yearDate => {
      const [month, day] = yearDate.split('-');
      return monthDay === `${month}-${day}`;
    });
  },

  /**
   * Check if date matches repeat pattern (every X days, activity/rest days)
   */
  matchesRepeatPattern(targetDate, startDate, task) {
    const daysDiff = Math.floor(
      (targetDate - startDate) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 0) {
      return false;
    }

    // Simple repeat every X days
    if (task.every_days) {
      return daysDiff % task.every_days === 0;
    }

    // Alternate days pattern (activity/rest)
    if (task.is_repeat_alternate_days && task.activity_days && task.rest_days) {
      const cycleLength = task.activity_days + task.rest_days;
      const positionInCycle = daysDiff % cycleLength;
      return positionInCycle < task.activity_days;
    }

    return false;
  },

  /**
   * Extract start time from block_time_data
   */
  getBlockTimeStartTime(blockTimeData) {
    if (!blockTimeData || !blockTimeData.start_time) {
      return null;
    }

    try {
      // Parse start_time (format: "HH:MM" or "HH:MM AM/PM")
      const timeString = blockTimeData.start_time;
      const timeParts = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);

      if (!timeParts) {
        return null;
      }

      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const meridiem = timeParts[3];

      // Convert to 24-hour format if needed
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
      }

      return {hours, minutes};
    } catch (error) {
      console.error('Error parsing block time:', error);
      return null;
    }
  },

  /**
   * Get tasks that should trigger alarm today
   */
  async getTasksNeedingAlarmScheduling(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.getBlockTimeTasksForDate(userId, today);

      // Filter to only tasks with valid block time
      const tasksWithBlockTime = result.all.filter(task => {
        const startTime = this.getBlockTimeStartTime(task.block_time_data);
        return startTime !== null;
      });

      console.log(
        '⏰ [BlockTime] Tasks needing alarm scheduling:',
        tasksWithBlockTime.length
      );

      return tasksWithBlockTime;
    } catch (error) {
      console.error('Error getting tasks for alarm scheduling:', error);
      throw error;
    }
  },

  /**
   * Mark task as alarm scheduled (optional - for tracking)
   */
  async markAlarmScheduled(taskId, source, scheduledTime) {
    try {
      const table = source === 'tasks' ? 'tasks' : 'plan_your_day';

      const {error} = await supabase
        .from(table)
        .update({
          last_alarm_scheduled: scheduledTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error marking alarm scheduled:', error);
      }
    } catch (error) {
      console.error('Error in markAlarmScheduled:', error);
    }
  },

  /**
   * Get upcoming alarms for next 7 days (useful for pre-scheduling)
   */
  async getUpcomingAlarms(userId, daysAhead = 7) {
    try {
      const upcomingAlarms = [];
      const today = new Date();

      for (let i = 0; i < daysAhead; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateString = targetDate.toISOString().split('T')[0];

        const result = await this.getBlockTimeTasksForDate(userId, dateString);
        const tasksWithAlarms = result.all
          .filter(task => {
            const startTime = this.getBlockTimeStartTime(task.block_time_data);
            return startTime !== null;
          })
          .map(task => ({
            ...task,
            scheduledDate: dateString,
            startTime: this.getBlockTimeStartTime(task.block_time_data)
          }));

        upcomingAlarms.push(...tasksWithAlarms);
      }

      console.log(
        `📅 [BlockTime] Found ${upcomingAlarms.length} upcoming alarms for next ${daysAhead} days`
      );

      return upcomingAlarms;
    } catch (error) {
      console.error('Error getting upcoming alarms:', error);
      throw error;
    }
  }
};

export default blockTimeService;