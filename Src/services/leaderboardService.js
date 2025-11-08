import {supabase} from '../../supabase';

export const leaderboardService = {
  /**
   * Calculate expected completions UP TO TODAY
   * Based on Home screen's shouldTaskAppearOnDate logic
   */
  calculateExpectedDays(task, startDate, currentDate) {
    const start = new Date(startDate);
    const today = new Date(currentDate);
    
    // Normalize to midnight
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // If task hasn't started yet, return 0
    if (start > today) return 0;

    // If task has end_date and it's in the past, use end_date
    const effectiveEndDate = task.end_date 
      ? new Date(Math.min(new Date(task.end_date), today)) 
      : today;
    
    effectiveEndDate.setHours(0, 0, 0, 0);
    
    // If end date is before start, return 0
    if (effectiveEndDate < start) return 0;

    const daysDiff = Math.ceil((effectiveEndDate - start) / (1000 * 60 * 60 * 24)) + 1;

    if (daysDiff <= 0) return 0;

    // Handle different frequency types
    switch (task.frequency_type) {
      case 'Daily':
      case 'Every Day':
        // Every day from start to today
        return daysDiff;
      
      case 'Weekly':
      case 'Specific days of the week': {
        // If no weekdays selected, default to weekly (every 7 days)
        if (!task.selected_weekdays || task.selected_weekdays.length === 0) {
          return Math.ceil(daysDiff / 7);
        }
        
        // Count how many of the selected weekdays have occurred
        let count = 0;
        let currentDay = new Date(start);
        
        while (currentDay <= effectiveEndDate) {
          const dayOfWeek = currentDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Convert Sunday from 0 to 7 to match database format (1=Monday, 7=Sunday)
          const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
          
          if (task.selected_weekdays.includes(dayNumber)) {
            count++;
          }
          currentDay.setDate(currentDay.getDate() + 1);
        }
        
        return count;
      }
      
      case 'Monthly':
      case 'Specific days of the month': {
        if (!task.selected_month_dates || task.selected_month_dates.length === 0) {
          return Math.ceil(daysDiff / 30);
        }
        
        // Count how many of the selected dates have occurred
        let count = 0;
        let currentDay = new Date(start);
        
        while (currentDay <= effectiveEndDate) {
          const dateOfMonth = currentDay.getDate();
          if (task.selected_month_dates.includes(dateOfMonth)) {
            count++;
          }
          currentDay.setDate(currentDay.getDate() + 1);
        }
        
        return count;
      }
      
      case 'Yearly':
      case 'Specific days of the year': {
        if (!task.selected_year_dates || task.selected_year_dates.length === 0) {
          return Math.ceil(daysDiff / 365);
        }
        
        // Count how many of the selected year dates have occurred
        let count = 0;
        let currentDay = new Date(start);
        
        while (currentDay <= effectiveEndDate) {
          const month = currentDay.getMonth() + 1; // 1-12
          const day = currentDay.getDate();
          
          // Check if current date matches any selected year date
          const matchesYearDate = task.selected_year_dates.some(yearDate => {
            // Handle different year date formats
            if (typeof yearDate === 'string') {
              // Handle "Month Day" format (e.g., "January 1")
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              
              const monthDayMatch = yearDate.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
              if (monthDayMatch) {
                const [, monthName, dayStr] = monthDayMatch;
                const yearDateMonth = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase()) + 1;
                const yearDateDay = parseInt(dayStr);
                return yearDateMonth === month && yearDateDay === day;
              }
              
              // Handle "MM/DD" format
              if (yearDate.match(/^\d{1,2}[\/\-]\d{1,2}$/)) {
                const parts = yearDate.split(/[\/\-]/);
                const yearDateMonth = parseInt(parts[0]);
                const yearDateDay = parseInt(parts[1]);
                return yearDateMonth === month && yearDateDay === day;
              }
            }
            
            // Handle object format: {month: 8, day: 20}
            if (typeof yearDate === 'object' && yearDate !== null && !(yearDate instanceof Date)) {
              return yearDate.month === month && yearDate.day === day;
            }
            
            return false;
          });
          
          if (matchesYearDate) {
            count++;
          }
          
          currentDay.setDate(currentDay.getDate() + 1);
        }
        
        return count;
      }
      
      case 'Repeat':
      case 'repeat': {
        // Handle flexible repeat - can complete on any day
        if (task.is_repeat_flexible) {
          return daysDiff;
        }
        
        // Handle "Every X Days" pattern
        if (task.every_days && task.every_days > 0) {
          // Task appears every X days starting from start date
          return Math.floor(daysDiff / task.every_days) + 1;
        }
        
        // Handle Activity/Rest Days pattern
        if ((task.activity_days && task.activity_days > 0) || (task.rest_days && task.rest_days >= 0)) {
          const activityDays = task.activity_days || 1;
          const restDays = task.rest_days || 0;
          const cycleLength = activityDays + restDays;
          
          if (cycleLength === 0) return daysDiff;
          
          // Calculate complete cycles
          const completeCycles = Math.floor(daysDiff / cycleLength);
          const remainingDays = daysDiff % cycleLength;
          
          // Count activity days in complete cycles
          let count = completeCycles * activityDays;
          
          // Add activity days from remaining days
          count += Math.min(remainingDays, activityDays);
          
          return count;
        }
        
        // Handle alternate days pattern (legacy)
        if (task.is_repeat_alternate_days) {
          return Math.ceil(daysDiff / 2);
        }
        
        // Default to daily if no pattern specified
        return daysDiff;
      }
      
      case 'Period':
      case 'Some days per period': {
        if (!task.period_days || task.period_days <= 0) {
          return daysDiff;
        }
        
        const periodDays = task.period_days;
        const periodType = (task.period_type || 'Week').toLowerCase();
        
        // If flexible, task can be completed on any day
        if (task.is_flexible) {
          return daysDiff;
        }
        
        let count = 0;
        let currentDay = new Date(start);
        
        if (periodType === 'week') {
          // Count periods (weeks) and multiply by period_days
          while (currentDay <= effectiveEndDate) {
            const weekStart = new Date(currentDay);
            weekStart.setDate(currentDay.getDate() - currentDay.getDay()); // Start of week (Sunday)
            weekStart.setHours(0, 0, 0, 0);
            
            const daysSinceWeekStart = Math.floor((currentDay - weekStart) / (1000 * 60 * 60 * 24));
            
            if (daysSinceWeekStart < periodDays) {
              count++;
            }
            
            currentDay.setDate(currentDay.getDate() + 1);
          }
        } else if (periodType === 'month') {
          // Count days within period_days of each month
          while (currentDay <= effectiveEndDate) {
            const dayOfMonth = currentDay.getDate();
            if (dayOfMonth <= periodDays) {
              count++;
            }
            currentDay.setDate(currentDay.getDate() + 1);
          }
        } else if (periodType === 'year') {
          // Count days within period_days of each year
          while (currentDay <= effectiveEndDate) {
            const yearStart = new Date(currentDay.getFullYear(), 0, 1);
            const dayOfYear = Math.floor((currentDay - yearStart) / (1000 * 60 * 60 * 24)) + 1;
            if (dayOfYear <= periodDays) {
              count++;
            }
            currentDay.setDate(currentDay.getDate() + 1);
          }
        }
        
        return count;
      }
      
      default:
        // One-time task or unknown frequency - treat as daily
        return daysDiff;
    }
  },

  /**
   * Get completion percentage for Habits
   * ✅ HABITS: Respect frequency settings (Daily, Weekly, Monthly, etc.)
   */
  async getHabitCompletionPercentage(userId) {
    try {
      const {data: habits, error: habitsError} = await supabase
        .from('tasks')
        .select('id, created_at, start_date, end_date, frequency_type, selected_weekdays, selected_month_dates, selected_year_dates, every_days, period_days, period_type, activity_days, rest_days, is_flexible, is_repeat_flexible, is_repeat_alternate_days')
        .eq('user_id', userId)
        .eq('task_type', 'Habit');

      if (habitsError) throw habitsError;
      
      if (!habits || habits.length === 0) return null;

      const now = new Date();
      let totalExpected = 0;
      let totalCompletedDays = 0;

      const habitIds = habits.map(h => h.id);

      // Get ALL completions
      const {data: completions, error: completionsError} = await supabase
        .from('task_completions')
        .select('task_id, is_completed, completion_date')
        .in('task_id', habitIds)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (completionsError) throw completionsError;

      // Count number of completed DAYS per habit
      const completionMap = {};
      (completions || []).forEach(c => {
        if (!completionMap[c.task_id]) {
          completionMap[c.task_id] = new Set();
        }
        // Store unique dates
        completionMap[c.task_id].add(c.completion_date);
      });

      habits.forEach(habit => {
        const startDate = habit.start_date || habit.created_at;
        
        // ✅ Use frequency-based calculation for Habits
        const expected = this.calculateExpectedDays(habit, startDate, now);
        const completedDaysSet = completionMap[habit.id] || new Set();
        const completedDays = completedDaysSet.size;

        console.log(`  📊 Habit ${habit.id}: ${completedDays}/${expected} days (frequency: ${habit.frequency_type || 'Daily'})`);

        totalExpected += expected;
        totalCompletedDays += Math.min(completedDays, expected);
      });

      console.log(`  ✅ Habit Total: ${totalCompletedDays}/${totalExpected} days`);

      return totalExpected > 0 ? (totalCompletedDays / totalExpected) * 100 : 0;
    } catch (error) {
      console.error('❌ Error calculating habit completion:', error);
      return null;
    }
  },

  /**
   * Get completion percentage for Recurring tasks
   * ✅ RECURRING: ALWAYS count as Daily (from start_date to today)
   */
  async getRecurringCompletionPercentage(userId) {
    try {
      const {data: recurring, error: recurringError} = await supabase
        .from('tasks')
        .select('id, created_at, start_date, end_date')
        .eq('user_id', userId)
        .eq('task_type', 'Recurring');

      if (recurringError) throw recurringError;
      
      if (!recurring || recurring.length === 0) return null;

      const now = new Date();
      let totalExpected = 0;
      let totalCompletedDays = 0;

      const recurringIds = recurring.map(r => r.id);

      // Get ALL completions
      const {data: completions, error: completionsError} = await supabase
        .from('task_completions')
        .select('task_id, is_completed, completion_date')
        .in('task_id', recurringIds)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (completionsError) throw completionsError;

      // Count number of completed DAYS per task
      const completionMap = {};
      (completions || []).forEach(c => {
        if (!completionMap[c.task_id]) {
          completionMap[c.task_id] = new Set();
        }
        // Store unique dates
        completionMap[c.task_id].add(c.completion_date);
      });

      recurring.forEach(task => {
        const startDate = task.start_date || task.created_at;
        
        // ✅ RECURRING = ALWAYS DAILY (ignore frequency_type)
        const start = new Date(startDate);
        const today = new Date(now);
        
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // If task hasn't started yet, skip
        if (start > today) {
          console.log(`  ⏭️ Recurring ${task.id}: Not started yet`);
          return;
        }

        // If task has end_date and it's in the past, use end_date
        const effectiveEndDate = task.end_date 
          ? new Date(Math.min(new Date(task.end_date), today)) 
          : today;
        
        effectiveEndDate.setHours(0, 0, 0, 0);
        
        // If end date is before start, skip
        if (effectiveEndDate < start) {
          console.log(`  ⏭️ Recurring ${task.id}: End date before start`);
          return;
        }

        // Calculate days from start to today (inclusive)
        const daysDiff = Math.ceil((effectiveEndDate - start) / (1000 * 60 * 60 * 24)) + 1;
        const expected = Math.max(0, daysDiff);
        
        const completedDaysSet = completionMap[task.id] || new Set();
        const completedDays = completedDaysSet.size;

        console.log(`  📊 Recurring ${task.id}: ${completedDays}/${expected} days (${startDate.split('T')[0]} to today)`);

        totalExpected += expected;
        totalCompletedDays += Math.min(completedDays, expected);
      });

      console.log(`  ✅ Recurring Total: ${totalCompletedDays}/${totalExpected} days`);

      return totalExpected > 0 ? (totalCompletedDays / totalExpected) * 100 : 0;
    } catch (error) {
      console.error('❌ Error calculating recurring completion:', error);
      return null;
    }
  },

  /**
   * Get completion percentage for regular Tasks
   * ✅ FIXED: Tasks only appear once (on created date), so we count completions vs total tasks
   */
  async getTaskCompletionPercentage(userId) {
    try {
      const {data: tasks, error: tasksError} = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('task_type', 'Task');

      if (tasksError) throw tasksError;
      
      if (!tasks || tasks.length === 0) return null;

      const totalTasks = tasks.length;
      const taskIds = tasks.map(t => t.id);

      // Get ALL completions
      const {data: completions, error: completionsError} = await supabase
        .from('task_completions')
        .select('task_id, is_completed')
        .in('task_id', taskIds)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (completionsError) throw completionsError;

      // Count unique completed tasks
      const completedTaskIds = new Set();
      (completions || []).forEach(c => {
        completedTaskIds.add(c.task_id);
      });

      const totalCompleted = completedTaskIds.size;

      console.log(`  📊 Task Total: ${totalCompleted}/${totalTasks} tasks`);

      return totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
    } catch (error) {
      console.error('❌ Error calculating task completion:', error);
      return null;
    }
  },

  /**
   * Get completion percentage for Plan Your Day
   * Plan Your Day shows ONLY on start_date (one day only per plan)
   */
  async getPlanYourDayCompletionPercentage(userId) {
    try {
      const {data: plans, error: plansError} = await supabase
        .from('plan_your_day')
        .select('id, created_at, start_date')
        .eq('user_id', userId);

      if (plansError) throw plansError;
      
      if (!plans || plans.length === 0) return null;

      // Each plan appears ONLY on its start_date
      // So expected = number of plans
      const totalExpected = plans.length;

      const planIds = plans.map(p => p.id);

      const {data: completions, error: completionsError} = await supabase
        .from('task_completions')
        .select('task_id, is_completed')
        .in('task_id', planIds)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (completionsError) throw completionsError;

      // For Plan Your Day: Count unique tasks that have been completed
      const completedPlanIds = new Set();
      (completions || []).forEach(c => {
        completedPlanIds.add(c.task_id);
      });

      const totalCompleted = completedPlanIds.size;

      console.log(`  📊 Plan Your Day: ${totalCompleted}/${totalExpected} plans`);

      return totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0;
    } catch (error) {
      console.error('❌ Error calculating plan your day completion:', error);
      return null;
    }
  },

  /**
   * Get completion percentage for Lock Challenges
   */
  async getLockChallengeCompletionPercentage(userId) {
    try {
      const {data: challenges, error: challengesError} = await supabase
        .from('lock_challenges')
        .select('id, duration_days, created_at, start_date')
        .eq('user_id', userId);

      if (challengesError) throw challengesError;
      
      if (!challenges || challenges.length === 0) return null;

      const now = new Date();
      const challengeIds = challenges.map(c => c.id);

      const {data: completions, error: completionsError} = await supabase
        .from('lock_challenge_completions')
        .select('lock_challenge_id, day_number')
        .in('lock_challenge_id', challengeIds)
        .eq('user_id', userId);

      if (completionsError) throw completionsError;

      // Count number of completed DAYS per challenge
      const completionMap = {};
      (completions || []).forEach(c => {
        if (!completionMap[c.lock_challenge_id]) {
          completionMap[c.lock_challenge_id] = new Set();
        }
        completionMap[c.lock_challenge_id].add(c.day_number);
      });

      let totalExpected = 0;
      let totalCompletedDays = 0;

      challenges.forEach(challenge => {
        const startDate = new Date(challenge.start_date || challenge.created_at);
        startDate.setHours(0, 0, 0, 0);
        const daysPassed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        
        // Expected days is minimum of: days passed OR total duration
        const expected = Math.min(Math.max(0, daysPassed), challenge.duration_days || 0);
        const completedDaysSet = completionMap[challenge.id] || new Set();
        const completedDays = completedDaysSet.size;

        console.log(`  📊 Lock Challenge ${challenge.id}: ${completedDays}/${expected} days`);

        totalExpected += expected;
        totalCompletedDays += Math.min(completedDays, expected);
      });

      console.log(`  ✅ Lock Challenge Total: ${totalCompletedDays}/${totalExpected} days`);

      return totalExpected > 0 ? (totalCompletedDays / totalExpected) * 100 : 0;
    } catch (error) {
      console.error('❌ Error calculating lock challenge completion:', error);
      return null;
    }
  },

  /**
   * Get task counts showing expected days (not just task IDs)
   * ✅ FIXED: Tasks now use simple count (not expected days)
   */
  async getUserTaskCounts(userId) {
    try {
      const now = new Date();
      
      // Get all task types with their configurations
      const [habitsData, recurringData, tasksData, plansData, challengesData] = await Promise.all([
        supabase.from('tasks').select('id, created_at, start_date, end_date, frequency_type, selected_weekdays, selected_month_dates, selected_year_dates, every_days, period_days, period_type, activity_days, rest_days, is_flexible, is_repeat_flexible, is_repeat_alternate_days').eq('user_id', userId).eq('task_type', 'Habit'),
        supabase.from('tasks').select('id, created_at, start_date, end_date').eq('user_id', userId).eq('task_type', 'Recurring'),
        supabase.from('tasks').select('id', {count: 'exact'}).eq('user_id', userId).eq('task_type', 'Task'),
        supabase.from('plan_your_day').select('id, created_at, start_date').eq('user_id', userId),
        supabase.from('lock_challenges').select('id, duration_days, created_at, start_date').eq('user_id', userId),
      ]);

      // Calculate total expected days for Habits
      let habitDays = 0;
      (habitsData.data || []).forEach(habit => {
        const startDate = habit.start_date || habit.created_at;
        habitDays += this.calculateExpectedDays(habit, startDate, now);
      });

      // Calculate total expected days for Recurring (always daily)
      let recurringDays = 0;
      (recurringData.data || []).forEach(task => {
        const startDate = task.start_date || task.created_at;
        const start = new Date(startDate);
        const today = new Date(now);
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        if (start <= today) {
          const effectiveEndDate = task.end_date 
            ? new Date(Math.min(new Date(task.end_date), today)) 
            : today;
          effectiveEndDate.setHours(0, 0, 0, 0);
          
          if (effectiveEndDate >= start) {
            const daysDiff = Math.ceil((effectiveEndDate - start) / (1000 * 60 * 60 * 24)) + 1;
            recurringDays += Math.max(0, daysDiff);
          }
        }
      });

      // ✅ FIXED: Tasks now use simple count (not expected days calculation)
      // Tasks only appear on created date, so count = number of tasks
      const taskDays = tasksData.count || 0;

      // Plan Your Day - count total plans
      const planDays = (plansData.data || []).length;

      // Lock Challenges - calculate expected days
      let challengeDays = 0;
      (challengesData.data || []).forEach(challenge => {
        const startDate = new Date(challenge.start_date || challenge.created_at);
        startDate.setHours(0, 0, 0, 0);
        const daysPassed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        const expected = Math.min(Math.max(0, daysPassed), challenge.duration_days || 0);
        challengeDays += expected;
      });

      return {
        habit: habitDays,
        recurring: recurringDays,
        task: taskDays,
        planYourDay: planDays,
        lockChallenge: challengeDays,
      };
    } catch (error) {
      console.error('❌ Error getting user task counts:', error);
      return {
        habit: 0,
        recurring: 0,
        task: 0,
        planYourDay: 0,
        lockChallenge: 0,
      };
    }
  },

  /**
   * Get detailed breakdown for a specific user
   * Only average task types that exist (not null)
   */
  async getUserTaskBreakdown(userId) {
    try {
      console.log(`\n🎯 ========== USER: ${userId} ==========`);
      
      const [habit, recurring, task, planYourDay, lockChallenge] = await Promise.all([
        this.getHabitCompletionPercentage(userId),
        this.getRecurringCompletionPercentage(userId),
        this.getTaskCompletionPercentage(userId),
        this.getPlanYourDayCompletionPercentage(userId),
        this.getLockChallengeCompletionPercentage(userId),
      ]);

      const counts = await this.getUserTaskCounts(userId);

      // Only include task types that exist (not null)
      const percentages = [];
      if (habit !== null) percentages.push(habit);
      if (recurring !== null) percentages.push(recurring);
      if (task !== null) percentages.push(task);
      if (planYourDay !== null) percentages.push(planYourDay);
      if (lockChallenge !== null) percentages.push(lockChallenge);

      // Calculate overall average only from existing task types
      const overall = percentages.length > 0
        ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
        : 0;

      console.log(`  📊 FINAL: Habit=${habit?.toFixed(1)}%, Recurring=${recurring?.toFixed(1)}%, Task=${task?.toFixed(1)}%, Plan=${planYourDay?.toFixed(1)}%, Lock=${lockChallenge?.toFixed(1)}%`);
      console.log(`  🏆 OVERALL: ${overall.toFixed(1)}%\n`);

      return {
        habit: habit !== null ? Math.round(habit * 100) / 100 : 0,
        recurring: recurring !== null ? Math.round(recurring * 100) / 100 : 0,
        task: task !== null ? Math.round(task * 100) / 100 : 0,
        planYourDay: planYourDay !== null ? Math.round(planYourDay * 100) / 100 : 0,
        lockChallenge: lockChallenge !== null ? Math.round(lockChallenge * 100) / 100 : 0,
        overall: Math.round(overall * 100) / 100,
        counts,
        activeTaskTypes: percentages.length,
      };
    } catch (error) {
      console.error('❌ Error getting user task breakdown:', error);
      throw error;
    }
  },

  /**
   * Get global leaderboard with all task types combined
   */
  async getGlobalLeaderboard() {
    try {
      console.log('=== FETCHING COMPREHENSIVE LEADERBOARD ===');

      const {data: allProfiles, error: profilesError} = await supabase
        .from('profiles')
        .select('id, username, email, phone, gender');

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!allProfiles || allProfiles.length === 0) {
        console.log('⚠️ No users found');
        return [];
      }

      console.log(`✅ Found ${allProfiles.length} users`);

      const userStatsPromises = allProfiles.map(async profile => {
        try {
          const breakdown = await this.getUserTaskBreakdown(profile.id);
          
          return {
            userId: profile.id,
            username: profile.username || profile.email?.split('@')[0] || 'User',
            email: profile.email,
            phone: profile.phone,
            gender: profile.gender,
            ...breakdown,
          };
        } catch (error) {
          console.error(`❌ Error calculating stats for user ${profile.id}:`, error);
          return {
            userId: profile.id,
            username: profile.username || profile.email?.split('@')[0] || 'User',
            email: profile.email,
            phone: profile.phone,
            gender: profile.gender,
            habit: 0,
            recurring: 0,
            task: 0,
            planYourDay: 0,
            lockChallenge: 0,
            overall: 0,
            counts: {habit: 0, recurring: 0, task: 0, planYourDay: 0, lockChallenge: 0},
            activeTaskTypes: 0,
          };
        }
      });

      const userStats = await Promise.all(userStatsPromises);

      const leaderboard = userStats
        .map(stat => ({
          userId: stat.userId,
          name: stat.username,
          email: stat.email,
          phone: stat.phone,
          gender: stat.gender,
          points: Math.round(stat.overall),
          averagePercentage: stat.overall,
          breakdown: {
            habit: stat.habit,
            recurring: stat.recurring,
            task: stat.task,
            planYourDay: stat.planYourDay,
            lockChallenge: stat.lockChallenge,
          },
          counts: stat.counts,
          totalTasks: Object.values(stat.counts).reduce((a, b) => a + b, 0),
          activeTaskTypes: stat.activeTaskTypes,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          return b.totalTasks - a.totalTasks;
        })
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      console.log(`=== LEADERBOARD GENERATED: ${leaderboard.length} users ===`);
      console.log(`✅ Users with progress (>0%): ${leaderboard.filter(u => u.points > 0).length}`);
      console.log(`📊 Users without progress (0%): ${leaderboard.filter(u => u.points === 0).length}`);
      
      leaderboard.slice(0, 3).forEach(user => {
        console.log(`  #${user.rank}: ${user.name} - ${user.points}% (${user.totalTasks} total items, ${user.activeTaskTypes} active types)`);
      });

      return leaderboard;
    } catch (error) {
      console.error('❌ Error in getGlobalLeaderboard:', error);
      throw error;
    }
  },

  /**
   * Get leaderboard statistics for a specific user
   */
  async getUserLeaderboardStats(userId) {
    try {
      console.log(`=== FETCHING STATS FOR USER: ${userId} ===`);

      const breakdown = await this.getUserTaskBreakdown(userId);
      const leaderboard = await this.getGlobalLeaderboard();
      const userRank = leaderboard.find(u => u.userId === userId);

      console.log(`✅ User stats: ${breakdown.overall.toFixed(2)}% overall (${breakdown.activeTaskTypes} active task types)`);

      return {
        userId: userId,
        averagePercentage: breakdown.overall,
        rank: userRank ? userRank.rank : null,
        totalUsers: leaderboard.length,
        breakdown: {
          habit: breakdown.habit,
          recurring: breakdown.recurring,
          task: breakdown.task,
          planYourDay: breakdown.planYourDay,
          lockChallenge: breakdown.lockChallenge,
        },
        counts: breakdown.counts,
        activeTaskTypes: breakdown.activeTaskTypes,
      };
    } catch (error) {
      console.error('❌ Error in getUserLeaderboardStats:', error);
      throw error;
    }
  },

  /**
   * Get leaderboard with current user highlighted
   */
  async getLeaderboardWithCurrentUser(currentUserId, limit = 10) {
    try {
      const fullLeaderboard = await this.getGlobalLeaderboard();

      if (fullLeaderboard.length === 0) {
        return {
          topUsers: [],
          currentUser: null,
          totalUsers: 0,
        };
      }

      const topUsers = fullLeaderboard.slice(0, limit);
      const currentUser = fullLeaderboard.find(user => user.userId === currentUserId);

      const leaderboardData = topUsers.map(user => ({
        ...user,
        isCurrentUser: user.userId === currentUserId,
      }));

      const currentUserInTop = topUsers.some(user => user.userId === currentUserId);

      return {
        topUsers: leaderboardData,
        currentUser: currentUserInTop
          ? null
          : currentUser
          ? {...currentUser, isCurrentUser: true}
          : null,
        totalUsers: fullLeaderboard.length,
      };
    } catch (error) {
      console.error('❌ Error in getLeaderboardWithCurrentUser:', error);
      throw error;
    }
  },
};