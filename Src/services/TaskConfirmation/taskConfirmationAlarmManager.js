import {NativeModules, Platform, DeviceEventEmitter} from 'react-native';

const {TaskConfirmationAlarmModule} = NativeModules;

class TaskConfirmationAlarmManager {
  constructor() {
    this.confirmationListeners = [];
  }

  /**
   * Schedule a confirmation alarm for a task
   * Triggers 5 minutes before the task start time
   */
  
  async scheduleConfirmationAlarm(taskData) {
  try {
    if (Platform.OS !== 'android') {
      console.warn('Task confirmation alarms only supported on Android');
      return {success: false, error: 'Platform not supported'};
    }

    if (!TaskConfirmationAlarmModule) {
      console.error('TaskConfirmationAlarmModule not available');
      return {success: false, error: 'Native module not available'};
    }

    // Validate required fields
    if (!taskData.id || !taskData.title || !taskData.start_date || !taskData.start_time) {
      return {success: false, error: 'Missing required task data'};
    }

    console.log('Scheduling confirmation alarm for task:', taskData.title);
    console.log('Start date:', taskData.start_date, 'Start time:', taskData.start_time);
    console.log('Evaluation type:', taskData.evaluation_type); // NEW LOG

    const result = await TaskConfirmationAlarmModule.scheduleTaskConfirmationAlarm({
      id: taskData.id,
      title: taskData.title,
      description: taskData.description || '',
      start_date: taskData.start_date,
      start_time: taskData.start_time,
      category: taskData.category || '',
      evaluationType: taskData.evaluationType || 'yesNo',
    });

    console.log('Confirmation alarm scheduled successfully:', result);
    return {success: true, data: result};

  } catch (error) {
    console.error('Error scheduling confirmation alarm:', error);
    return {success: false, error: error.message};
  }
}

  /**
   * Cancel a task confirmation alarm
   */
  async cancelConfirmationAlarm(planId) {
    try {
      if (Platform.OS !== 'android') {
        return {success: false, error: 'Platform not supported'};
      }

      if (!TaskConfirmationAlarmModule) {
        return {success: false, error: 'Native module not available'};
      }

      console.log('Cancelling confirmation alarm:', planId);

      await TaskConfirmationAlarmModule.cancelTaskConfirmationAlarm(planId);

      console.log('Confirmation alarm cancelled successfully');
      return {success: true};

    } catch (error) {
      console.error('Error cancelling confirmation alarm:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Update a task confirmation alarm
   * Cancels the old alarm and schedules a new one
   */
  async updateConfirmationAlarm(oldPlanId, newTaskData) {
  try {
    if (Platform.OS !== 'android') {
      return {success: false, error: 'Platform not supported'};
    }

    if (!TaskConfirmationAlarmModule) {
      return {success: false, error: 'Native module not available'};
    }

    console.log('Updating confirmation alarm:', oldPlanId);

    await TaskConfirmationAlarmModule.updateTaskConfirmationAlarm(oldPlanId, {
      id: newTaskData.id,
      title: newTaskData.title,
      description: newTaskData.description || '',
      start_date: newTaskData.start_date,
      start_time: newTaskData.start_time,
      category: newTaskData.category || '',
      evaluationType: taskData.evaluationType || 'yesNo',
    });

    console.log('Confirmation alarm updated successfully');
    return {success: true};

  } catch (error) {
    console.error('Error updating confirmation alarm:', error);
    return {success: false, error: error.message};
  }
}

  /**
   * Register a listener for confirmation responses
   * Uses DeviceEventEmitter to avoid NativeEventEmitter warning
   */
  addConfirmationListener(callback) {
    if (Platform.OS !== 'android') {
      console.log('Event listening not available on this platform');
      return null;
    }

    const listener = DeviceEventEmitter.addListener(
      'TASK_CONFIRMATION_RESPONSE',
      callback
    );

    if (listener) {
      this.confirmationListeners.push(listener);
    }

    return listener;
  }

  /**
   * Remove a confirmation listener
   */
  removeConfirmationListener(listener) {
    if (listener && listener.remove) {
      listener.remove();
      this.confirmationListeners = this.confirmationListeners.filter(
        l => l !== listener
      );
    }
  }

  /**
   * Remove all confirmation listeners
   */
  removeAllConfirmationListeners() {
    this.confirmationListeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.confirmationListeners = [];
  }

  /**
   * Check if a task needs a confirmation alarm
   * Returns true if task has a start_time and it's in the future
   */
  shouldScheduleConfirmationAlarm(taskData) {
    if (!taskData.start_time || !taskData.start_date) {
      return false;
    }

    try {
      // Parse task start date and time
      const [year, month, day] = taskData.start_date.split('-').map(Number);
      const [hour, minute] = taskData.start_time.split(':').map(Number);

      const taskDateTime = new Date(year, month - 1, day, hour, minute);
      const now = new Date();

      // Only schedule if task is in the future and at least 6 minutes away
      const minutesUntilTask = (taskDateTime - now) / (1000 * 60);
      return minutesUntilTask > 6;

    } catch (error) {
      console.error('Error checking if confirmation alarm needed:', error);
      return false;
    }
  }

  /**
   * Format time for display (24h to 12h format)
   */
  formatTime(time24h) {
    try {
      const [hour, minute] = time24h.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return time24h;
    }
  }

  /**
   * Calculate confirmation time (5 minutes before task start)
   */
  getConfirmationTime(startDate, startTime) {
    try {
      const [year, month, day] = startDate.split('-').map(Number);
      const [hour, minute] = startTime.split(':').map(Number);

      const taskDateTime = new Date(year, month - 1, day, hour, minute);
      const confirmationTime = new Date(taskDateTime.getTime() - 5 * 60 * 1000);

      return confirmationTime;
    } catch (error) {
      console.error('Error calculating confirmation time:', error);
      return null;
    }
  }
}

export default new TaskConfirmationAlarmManager();