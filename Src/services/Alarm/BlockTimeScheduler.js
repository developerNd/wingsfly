import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import blockTimeService from '../api/blockTimeService';
import {supabase} from '../../supabaseClient';

const {BlockTimeSchedulerModule} = NativeModules;

class BlockTimeScheduler {
  constructor() {
    this.eventEmitter = null;
    this.listeners = [];
    this.isInitialized = false;
    this.userId = null;

    if (Platform.OS === 'android' && BlockTimeSchedulerModule) {
      this.eventEmitter = new NativeEventEmitter(BlockTimeSchedulerModule);
    }
  }

  /**
   * Initialize scheduler with user ID
   */
  async initialize(userId) {
    try {
      console.log('📅 [BlockTimeScheduler] Initializing with userId:', userId);

      this.userId = userId;
      this.isInitialized = true;

      // Check and request permissions
      await this.checkAndRequestPermissions();

      console.log('✅ [BlockTimeScheduler] Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Initialization error:', error);
      return false;
    }
  }

  /**
   * Check and request necessary permissions
   */
  async checkAndRequestPermissions() {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return {exactAlarm: true, overlay: true};
      }

      console.log('🔐 [BlockTimeScheduler] Checking permissions...');

      // Check exact alarm permission (Android 12+)
      const exactAlarmResult =
        await BlockTimeSchedulerModule.checkExactAlarmPermission();
      console.log('📋 Exact alarm permission:', exactAlarmResult);

      // Check overlay permission
      const overlayGranted =
        await BlockTimeSchedulerModule.checkOverlayPermission();
      console.log('📋 Overlay permission:', overlayGranted);

      const permissions = {
        exactAlarm: exactAlarmResult.granted,
        overlay: overlayGranted,
      };

      // Request missing permissions
      if (exactAlarmResult.required && !exactAlarmResult.granted) {
        console.log('⚠️ Exact alarm permission not granted - will request');
        // Don't auto-request here, let app handle it with user prompt
      }

      if (!overlayGranted) {
        console.log('⚠️ Overlay permission not granted - will request');
        // Don't auto-request here, let app handle it with user prompt
      }

      return permissions;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Permission check error:', error);
      return {exactAlarm: false, overlay: false};
    }
  }

  /**
   * Request exact alarm permission
   */
  async requestExactAlarmPermission() {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return true;
      }

      console.log(
        '📱 [BlockTimeScheduler] Requesting exact alarm permission...',
      );
      await BlockTimeSchedulerModule.requestExactAlarmPermission();
      return true;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Request permission error:', error);
      return false;
    }
  }

  /**
   * Request overlay permission
   */
  async requestOverlayPermission() {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return true;
      }

      console.log('📱 [BlockTimeScheduler] Requesting overlay permission...');
      await BlockTimeSchedulerModule.requestOverlayPermission();
      return true;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Request permission error:', error);
      return false;
    }
  }

  /**
   * Schedule alarms for today's block time tasks
   */
  async scheduleTodayAlarms() {
    try {
      if (!this.isInitialized || !this.userId) {
        console.warn('⚠️ [BlockTimeScheduler] Not initialized');
        return {success: false, scheduled: 0};
      }

      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        console.log('⏭️ [BlockTimeScheduler] Skipping - not Android');
        return {success: true, scheduled: 0};
      }

      console.log('========================================');
      console.log("📅 [BlockTimeScheduler] Scheduling today's alarms");
      console.log('========================================');

      // Get today's date
      const today = new Date();
      const todayString = today.toDateString();
      const dateString = this.formatDateForDB(today);

      console.log('📆 Today:', todayString);
      console.log('📆 Date string:', dateString);

      // Fetch tasks needing alarms
      const tasks = await blockTimeService.getTasksNeedingAlarmScheduling(
        this.userId,
      );

      console.log(`📋 Found ${tasks.length} tasks requiring alarms`);

      let scheduledCount = 0;
      const results = [];

      for (const task of tasks) {
        try {
          const result = await this.scheduleAlarmForTask(task, dateString);
          results.push(result);

          if (result.success) {
            scheduledCount++;
          }
        } catch (error) {
          console.error(
            `❌ Error scheduling alarm for task ${task.id}:`,
            error,
          );
          results.push({success: false, taskId: task.id, error: error.message});
        }
      }

      console.log('========================================');
      console.log(`✅ Scheduled ${scheduledCount}/${tasks.length} alarms`);
      console.log('========================================');

      return {
        success: true,
        scheduled: scheduledCount,
        total: tasks.length,
        results,
      };
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Schedule today error:', error);
      return {success: false, scheduled: 0, error: error.message};
    }
  }

  /**
   * Schedule alarms for upcoming days (next 7 days)
   */
  async scheduleUpcomingAlarms(daysAhead = 7) {
    try {
      if (!this.isInitialized || !this.userId) {
        console.warn('⚠️ [BlockTimeScheduler] Not initialized');
        return {success: false, scheduled: 0};
      }

      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        console.log('⏭️ [BlockTimeScheduler] Skipping - not Android');
        return {success: true, scheduled: 0};
      }

      console.log('========================================');
      console.log(
        `📅 [BlockTimeScheduler] Scheduling alarms for next ${daysAhead} days`,
      );
      console.log('========================================');

      const upcomingAlarms = await blockTimeService.getUpcomingAlarms(
        this.userId,
        daysAhead,
      );

      console.log(`📋 Found ${upcomingAlarms.length} total alarms to schedule`);

      let scheduledCount = 0;
      const results = [];

      for (const alarm of upcomingAlarms) {
        try {
          const dateString = this.formatDateForDB(new Date(alarm.date));
          const result = await this.scheduleAlarmForTask(
            alarm.task,
            dateString,
          );
          results.push(result);

          if (result.success) {
            scheduledCount++;
          }
        } catch (error) {
          console.error(`❌ Error scheduling alarm:`, error);
          results.push({success: false, error: error.message});
        }
      }

      console.log('========================================');
      console.log(
        `✅ Scheduled ${scheduledCount}/${upcomingAlarms.length} alarms`,
      );
      console.log('========================================');

      return {
        success: true,
        scheduled: scheduledCount,
        total: upcomingAlarms.length,
        results,
      };
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Schedule upcoming error:', error);
      return {success: false, scheduled: 0, error: error.message};
    }
  }

  /**
   * Schedule alarm for a specific task
   */
  async scheduleAlarmForTask(task, dateString) {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return {success: false, reason: 'Not Android'};
      }

      console.log('⏰ Scheduling alarm for task:', task.title);
      console.log('   Date:', dateString);

      // ✅ FIX: Try multiple ways to get start time
      let startTime = null;

      // Method 1: Check root level first (for PlanYourDay tasks)
      if (task.start_time) {
        startTime = task.start_time;
        console.log('   ✅ Found start_time at root level:', startTime);
      }

      // Method 2: Parse from block_time_data if not found
      if (!startTime && task.block_time_data) {
        try {
          // Handle both string and object formats
          const blockData =
            typeof task.block_time_data === 'string'
              ? JSON.parse(task.block_time_data)
              : task.block_time_data;

          startTime = blockData.start_time;
          console.log('   ✅ Found start_time in block_time_data:', startTime);
        } catch (parseError) {
          console.error('   ❌ Failed to parse block_time_data:', parseError);
        }
      }

      // Method 3: Fallback to blockTimeService (if available)
      if (!startTime && blockTimeService.getBlockTimeStartTime) {
        startTime = blockTimeService.getBlockTimeStartTime(
          task.block_time_data,
        );
        if (startTime) {
          console.log(
            '   ✅ Found start_time via blockTimeService:',
            startTime,
          );
        }
      }

      if (!startTime) {
        console.warn('⚠️ No start time found for task:', task.id);
        console.log('   Task data:', JSON.stringify(task, null, 2));
        return {success: false, reason: 'No start time'};
      }

      console.log('   Start time:', startTime);

      // ✅ CRITICAL FIX: Prepare task data with ALL properties including Pomodoro settings
      const taskDataJson = JSON.stringify({
        id: task.id,
        title: task.title,
        description: task.description || '',
        category: task.category || '',
        evaluation_type: task.evaluation_type,
        block_time_data: task.block_time_data,
        frequency_type: task.frequency_type,
        selected_weekdays: task.selected_weekdays,
        selected_month_dates: task.selected_month_dates,
        selected_year_dates: task.selected_year_dates,
        start_date: task.start_date,
        every_days: task.every_days,
        activity_days: task.activity_days,
        rest_days: task.rest_days,
        source: task.source || 'tasks',
        // ✅ ADD: Pomodoro settings (critical for alarm restoration)
        focus_duration: task.focus_duration,
        short_break_duration: task.short_break_duration,
        long_break_duration: task.long_break_duration,
        focus_sessions_per_round: task.focus_sessions_per_round,
        auto_start_short_breaks: task.auto_start_short_breaks,
        auto_start_focus_sessions: task.auto_start_focus_sessions,
        pomodoro_duration: task.pomodoro_duration,
        // ✅ ADD: Duration data
        duration_data: task.duration_data,
      });

      console.log('📦 Task Data JSON with Pomodoro settings:');
      console.log('   Length:', taskDataJson.length);
      console.log('   Pomodoro included:', {
        focus_duration: task.focus_duration,
        short_break_duration: task.short_break_duration,
        long_break_duration: task.long_break_duration,
        focus_sessions_per_round: task.focus_sessions_per_round,
      });

      // Schedule alarm via native module
      const result = await BlockTimeSchedulerModule.scheduleBlockTimeAlarm(
        task.id.toString(),
        task.title,
        task.description || '',
        task.evaluation_type,
        startTime,
        task.category || '',
        task.source || 'tasks',
        taskDataJson,
        dateString,
      );

      if (result.success) {
        console.log('✅ Alarm scheduled:', {
          taskId: task.id,
          requestCode: result.requestCode,
          triggerTime: new Date(result.triggerTime).toLocaleString(),
        });

        // Optional: Mark alarm as scheduled in database
        // await blockTimeService.markAlarmScheduled(task.id, task.source, result.triggerTime);
      }

      return {success: true, result};
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Schedule alarm error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Cancel alarm for a specific task and date
   */
  async cancelAlarm(taskId, dateString) {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return {success: false};
      }

      console.log('🗑️ [BlockTimeScheduler] Cancelling alarm:', {
        taskId,
        dateString,
      });

      const result = await BlockTimeSchedulerModule.cancelBlockTimeAlarm(
        taskId.toString(),
        dateString,
      );

      if (result.success) {
        console.log('✅ Alarm cancelled:', result.requestCode);
      }

      return result;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Cancel alarm error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Cancel all alarms for a specific task
   */
  async cancelAllAlarmsForTask(taskId) {
    try {
      if (Platform.OS !== 'android' || !BlockTimeSchedulerModule) {
        return {success: false};
      }

      console.log(
        '🗑️ [BlockTimeScheduler] Cancelling all alarms for task:',
        taskId,
      );

      const result = await BlockTimeSchedulerModule.cancelAllAlarmsForTask(
        taskId.toString(),
      );

      if (result.success) {
        console.log(`✅ Cancelled ${result.cancelledCount} alarms`);
      }

      return result;
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Cancel all alarms error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Reschedule alarms when task is updated
   */
  async rescheduleTaskAlarms(taskId) {
    try {
      if (!this.isInitialized || !this.userId) {
        console.warn('⚠️ [BlockTimeScheduler] Not initialized');
        return {success: false};
      }

      console.log(
        '🔄 [BlockTimeScheduler] Rescheduling alarms for task:',
        taskId,
      );

      // Cancel existing alarms
      await this.cancelAllAlarmsForTask(taskId);

      // Fetch updated task
      const source = 'tasks'; // Determine source if needed
      const {data: task, error} = await supabase
        .from(source)
        .select('*')
        .eq('id', taskId)
        .eq('user_id', this.userId)
        .single();

      if (error || !task) {
        console.error('❌ Failed to fetch task:', error);
        return {success: false, error: 'Task not found'};
      }

      // Check if task should have alarms
      if (
        !task.block_time_enabled ||
        !['timer', 'timerTracker'].includes(task.evaluation_type)
      ) {
        console.log('⏭️ Task does not need alarms');
        return {success: true, scheduled: 0};
      }

      // Schedule alarms for next 7 days
      let scheduledCount = 0;
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateString = this.formatDateForDB(date);

        // Check if task should run on this date
        const tasks = await blockTimeService.getBlockTimeTasksForDate(
          this.userId,
          date,
        );
        const taskExists = tasks.some(t => t.id === taskId);

        if (taskExists) {
          const result = await this.scheduleAlarmForTask(task, dateString);
          if (result.success) {
            scheduledCount++;
          }
        }
      }

      console.log(`✅ Rescheduled ${scheduledCount} alarms for task`);

      return {success: true, scheduled: scheduledCount};
    } catch (error) {
      console.error('❌ [BlockTimeScheduler] Reschedule error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Format date for database (YYYY-MM-DD)
   */
  formatDateForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('🧹 [BlockTimeScheduler] Cleaning up...');

    this.listeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });

    this.listeners = [];
    this.isInitialized = false;
    this.userId = null;
  }
}

// Export singleton instance
export default new BlockTimeScheduler();
