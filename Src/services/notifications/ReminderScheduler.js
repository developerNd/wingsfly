import NotificationService from './NotificationService';
import AlarmSchedulerService from './AlarmSchedulerService'; 
import {Platform} from 'react-native';

class ReminderScheduler {
  constructor() {
    this.isNativeSupported = Platform.OS === 'android';
  }

  // Helper function to convert numbers to words (kept for other uses if needed)
  numberToWord = num => {
    const numbers = {
      0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
      6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
      11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
      16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
      20: 'twenty', 21: 'twenty one', 22: 'twenty two', 23: 'twenty three',
      24: 'twenty four', 25: 'twenty five', 26: 'twenty six', 27: 'twenty seven',
      28: 'twenty eight', 29: 'twenty nine', 30: 'thirty', 31: 'thirty one',
      32: 'thirty two', 33: 'thirty three', 34: 'thirty four', 35: 'thirty five',
      36: 'thirty six', 37: 'thirty seven', 38: 'thirty eight', 39: 'thirty nine',
      40: 'forty', 41: 'forty one', 42: 'forty two', 43: 'forty three',
      44: 'forty four', 45: 'forty five', 46: 'forty six', 47: 'forty seven',
      48: 'forty eight', 49: 'forty nine', 50: 'fifty', 51: 'fifty one',
      52: 'fifty two', 53: 'fifty three', 54: 'fifty four', 55: 'fifty five',
      56: 'fifty six', 57: 'fifty seven', 58: 'fifty eight', 59: 'fifty nine'
    };
    return numbers[num] || num.toString();
  };

  // MAIN TIME FORMATTING - ONLY PLACE WHERE TIME IS FORMATTED - KEEP NUMBERS FOR CLEAR SPEECH
  formatTimeForSpeech = (timeString) => {
    try {
      if (!timeString) {
        console.log('No time string provided');
        return 'your scheduled time';
      }

      console.log('=== TIME FORMATTING DEBUG ===');
      console.log('Input timeString:', timeString);

      // Clean the input
      let timeOnly = timeString.trim();
      
      // Handle AM/PM format - if already formatted, return as-is
      if (timeString.includes('AM') || timeString.includes('PM')) {
        console.log('Time already has AM/PM, using as-is:', timeString);
        return timeString;
      }
      
      const timeParts = timeOnly.split(':');
      if (timeParts.length < 2) {
        console.error('Invalid time format:', timeString);
        return timeString;
      }
      
      let hours = parseInt(timeParts[0], 10);
      let minutes = parseInt(timeParts[1], 10);
      
      console.log('Parsed hours:', hours, 'minutes:', minutes);
      
      // Validate numbers
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('Invalid time format - NaN:', timeString);
        return timeString;
      }
      
      // Convert 24-hour to 12-hour format for natural speech
      let displayHour = hours;
      let period = '';
      
      if (hours === 0) {
        displayHour = 12;
        period = 'AM';
      } else if (hours === 12) {
        displayHour = 12;
        period = 'PM';
      } else if (hours > 12) {
        displayHour = hours - 12;
        period = 'PM';
      } else {
        displayHour = hours;
        period = 'AM';
      }
      
      // Format using NUMBERS for clarity (not words)
      let speechTime;
      if (minutes === 0) {
        speechTime = `${displayHour} o'clock ${period}`;
      } else {
        speechTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      
      console.log('Final speech time:', speechTime);
      console.log('=== END TIME DEBUG ===');
      
      return speechTime;
      
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString || 'your scheduled time';
    }
  };

  // Calculate reminder date/time based on reminder settings
  calculateReminderDateTime = (taskData, reminderData) => {
    const {startDate} = taskData;
    const {scheduleType, daysBefore, hoursBefore, time} = reminderData;

    const taskStartDate = new Date(startDate);
    let reminderTime = time || '09:00';

    if (reminderTime.includes('AM') || reminderTime.includes('PM')) {
      reminderTime = this.convertTo24Hour(reminderTime);
    }

    const [hours, minutes] = reminderTime.split(':').map(Number);
    const reminderDate = new Date(taskStartDate);
    reminderDate.setHours(hours, minutes, 0, 0);

    switch (scheduleType) {
      case 'always':
        return reminderDate;
      case 'days_before':
        const daysBeforeNum = parseInt(daysBefore) || 0;
        const hoursBeforeNum = parseInt(hoursBefore) || 0;
        reminderDate.setDate(reminderDate.getDate() - daysBeforeNum);
        reminderDate.setHours(reminderDate.getHours() - hoursBeforeNum);
        return reminderDate;
      case 'specific_days':
        return reminderDate;
      default:
        return reminderDate;
    }
  };

  // Convert 12-hour format to 24-hour format
  convertTo24Hour = timeStr => {
    if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
      return timeStr;
    }

    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    return `${String(hour24).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
  };

  // Generate personalized TTS message - MAIN FUNCTION - ONLY PLACE TIME IS FORMATTED
  generatePersonalizedTTSMessage = (taskData, userProfile) => {
    try {
      console.log('=== GENERATING TTS MESSAGE ===');
      console.log('taskData.blockTimeData:', taskData.blockTimeData);
      console.log('taskData.time:', taskData.time);
      console.log('taskData.startDate:', taskData.startDate);
      
      // Get username with proper fallback
      let userName = 'there';
      if (userProfile) {
        userName = userProfile.username ||
          userProfile.display_name ||
          userProfile.user_metadata?.display_name ||
          userProfile.user_metadata?.username ||
          (userProfile.email ? userProfile.email.split('@')[0] : 'there');
      }

      // Get task time for speech - THIS IS THE KEY PART WHERE TIME IS FORMATTED
      let timeForSpeech = 'your scheduled time';
      let timeSource = 'none';

      if (taskData.blockTimeData && taskData.blockTimeData.startTime) {
        timeSource = 'blockTimeData.startTime';
        console.log('Using blockTimeData.startTime:', taskData.blockTimeData.startTime);
        timeForSpeech = this.formatTimeForSpeech(taskData.blockTimeData.startTime);
      } else if (taskData.time) {
        timeSource = 'taskData.time';
        console.log('Using taskData.time:', taskData.time);
        timeForSpeech = this.formatTimeForSpeech(taskData.time);
      } else if (taskData.startDate) {
        timeSource = 'startDate';
        const date = new Date(taskData.startDate);
        const timeString = date.toTimeString().slice(0, 5);
        console.log('Using startDate, extracted time:', timeString);
        timeForSpeech = this.formatTimeForSpeech(timeString);
      }

      console.log('Time source used:', timeSource);
      console.log('Formatted time for speech:', timeForSpeech);

      // Create the message
      const message = `Hello ${userName}, your task ${taskData.title || 'reminder'} is scheduled at ${timeForSpeech}.`;

      console.log('Generated TTS message:', message);
      console.log('=== END TTS MESSAGE ===');
      return message;
    } catch (error) {
      console.error('Error generating TTS message:', error);
      return `Hello, your task reminder is ready. Are you available?`;
    }
  };

  // Schedule reminders for a task
  scheduleTaskReminders = async (taskData, savedTask) => {
    const userProfile = taskData.userProfile;
    if (!taskData.reminderEnabled || !taskData.reminderData) {
      console.log('No reminders to schedule');
      return [];
    }

    const reminderData = taskData.reminderData;

    if (reminderData.type === 'dont_remind' || !reminderData.enabled) {
      console.log('Reminders disabled for this task');
      return [];
    }

    try {
      const scheduledReminders = [];
      const reminderDateTime = this.calculateReminderDateTime(taskData, reminderData);

      const now = new Date();
      if (reminderDateTime <= now) {
        console.log('Reminder time is in the past, skipping reminder');
        return [];
      }

      // Generate personalized TTS message HERE - only once, with proper time formatting
      const ttsMessage = this.generatePersonalizedTTSMessage(taskData, userProfile);
      console.log('Final TTS message to be used:', ttsMessage);

      if (reminderData.type === 'alarm') {
        const alarmId = await this.scheduleNativeAlarm({
          taskId: savedTask.id,
          taskTitle: taskData.title,
          taskData,
          reminderData,
          scheduledTime: reminderDateTime,
          userProfile: userProfile,
          ttsMessage: ttsMessage, // Pass the pre-formatted message
        });

        if (alarmId) {
          scheduledReminders.push({
            id: alarmId,
            taskId: savedTask.id,
            scheduledFor: reminderDateTime,
            type: 'alarm',
            service: 'ElevenLabs',
            isNative: true,
          });
        }
      } else {
        const notificationId = await this.scheduleNotification({
          taskId: savedTask.id,
          taskTitle: taskData.title,
          taskData,
          reminderData,
          scheduledTime: reminderDateTime,
        });

        if (notificationId) {
          scheduledReminders.push({
            id: notificationId,
            taskId: savedTask.id,
            scheduledFor: reminderDateTime,
            type: 'notification',
            service: 'NotificationService',
            isNative: false,
          });
        }
      }

      if (this.isRecurringTask(taskData)) {
        const recurringReminders = await this.scheduleRecurringReminders(
          taskData,
          savedTask,
          reminderData,
        );
        scheduledReminders.push(...recurringReminders);
      }

      console.log(`Scheduled ${scheduledReminders.length} reminders for task: ${taskData.title}`);
      return scheduledReminders;
    } catch (error) {
      console.error('Error scheduling task reminders:', error);
      return [];
    }
  };

  // Schedule native alarm using AlarmSchedulerService
  scheduleNativeAlarm = async ({
    taskId,
    taskTitle,
    taskData,
    reminderData,
    scheduledTime,
    userProfile,
    ttsMessage, // Pre-formatted message from generatePersonalizedTTSMessage
  }) => {
    console.log('Scheduling native alarm with pre-formatted TTS message:', ttsMessage);

    try {
      if (!this.isNativeSupported) {
        console.log('Native alarms not supported on this platform');
        return null;
      }

      if (!AlarmSchedulerService.isInitialized) {
        await AlarmSchedulerService.initialize();
      }

      if (userProfile) {
        AlarmSchedulerService.setUserProfile(userProfile);
      }

      let userName = 'there';
      if (userProfile) {
        userName = userProfile.username ||
          userProfile.display_name ||
          userProfile.user_metadata?.display_name ||
          userProfile.user_metadata?.username ||
          (userProfile.email ? userProfile.email.split('@')[0] : 'there');
      }

      // Use the pre-formatted TTS message directly - NO additional time formatting
      const alarmId = await AlarmSchedulerService.scheduleAlarm({
        id: `elevenlabs_alarm_${taskId}_${Date.now()}`,
        taskId: taskId,
        taskTitle: taskTitle,
        taskMessage: this.getReminderMessage(taskData, reminderData),
        scheduledTime: scheduledTime,
        type: 'alarm',
        userProfile: userProfile,
        taskData: taskData,
        reminderData: reminderData,
        ttsMessage: ttsMessage, // Pass the already-formatted message
      });

      if (alarmId) {
        console.log('ElevenLabs alarm scheduled successfully with correct time');
        return alarmId;
      } else {
        console.error('Failed to schedule ElevenLabs alarm');
        return null;
      }
    } catch (error) {
      console.error('Error scheduling ElevenLabs alarm:', error);
      return null;
    }
  };

  // Schedule notification (unchanged)
  scheduleNotification = async ({taskId, taskTitle, taskData, reminderData, scheduledTime}) => {
    try {
      const notificationData = {
        id: NotificationService.getNextId(),
        taskId: taskId,
        title: this.getReminderTitle(reminderData.type, taskTitle),
        message: this.getReminderMessage(taskData, reminderData),
        date: scheduledTime,
        type: reminderData.type,
      };

      const notificationId = await NotificationService.scheduleNotification(notificationData);

      if (notificationId) {
        console.log(`Notification scheduled: ${taskTitle} at ${scheduledTime.toLocaleString()}`);
        return notificationId;
      } else {
        console.error('Failed to schedule notification');
        return null;
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  // Check if task is recurring
  isRecurringTask = taskData => {
    return (
      taskData.frequencyType &&
      taskData.frequencyType !== 'Once' &&
      taskData.isEndDateEnabled &&
      taskData.endDate
    );
  };

  // Schedule reminders for recurring tasks with pre-formatted messages
  scheduleRecurringReminders = async (taskData, savedTask, reminderData) => {
    const scheduledReminders = [];

    if (!taskData.isEndDateEnabled || !taskData.endDate) {
      return scheduledReminders;
    }

    try {
      const recurringDates = this.calculateRecurringDates(
        new Date(taskData.startDate),
        new Date(taskData.endDate),
        taskData.frequencyType,
        taskData,
      );

      const limitedDates = recurringDates.slice(0, 30);

      for (const date of limitedDates) {
        const reminderDateTime = this.calculateReminderDateTime(
          {...taskData, startDate: date},
          reminderData,
        );

        const now = new Date();
        if (reminderDateTime <= now) continue;

        let reminderId = null;

        if (reminderData.type === 'alarm') {
          // Generate TTS message for this specific date with proper time formatting
          const ttsMessage = this.generatePersonalizedTTSMessage(
            {...taskData, startDate: date},
            taskData.userProfile,
          );

          reminderId = await this.scheduleNativeAlarm({
            taskId: savedTask.id,
            taskTitle: taskData.title,
            taskData: {...taskData, startDate: date},
            reminderData,
            scheduledTime: reminderDateTime,
            userProfile: taskData.userProfile,
            ttsMessage: ttsMessage,
          });
        } else {
          reminderId = await this.scheduleNotification({
            taskId: savedTask.id,
            taskTitle: taskData.title,
            taskData: {...taskData, startDate: date},
            reminderData,
            scheduledTime: reminderDateTime,
          });
        }

        if (reminderId) {
          scheduledReminders.push({
            id: reminderId,
            taskId: savedTask.id,
            scheduledFor: reminderDateTime,
            type: reminderData.type,
            service: reminderData.type === 'alarm' ? 'ElevenLabs' : 'NotificationService',
            recurringDate: date,
            isNative: reminderData.type === 'alarm' && this.isNativeSupported,
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling recurring reminders:', error);
    }

    return scheduledReminders;
  };

  // Calculate recurring dates (unchanged)
  calculateRecurringDates = (startDate, endDate, frequencyType, taskData) => {
    const dates = [];
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    const maxDates = 50;
    let count = 0;

    while (currentDate <= finalDate && count < maxDates) {
      dates.push(new Date(currentDate));
      count++;

      switch (frequencyType) {
        case 'Daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'Weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'Monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'Yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        case 'Custom':
          if (taskData.selectedWeekdays && taskData.selectedWeekdays.length > 0) {
            currentDate.setDate(currentDate.getDate() + 1);
            while (
              !taskData.selectedWeekdays.includes(currentDate.getDay()) &&
              currentDate <= finalDate
            ) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            currentDate.setDate(currentDate.getDate() + 1);
          }
          break;
        case 'Repeat':
          const everyDays = parseInt(taskData.everyDays) || 1;
          currentDate.setDate(currentDate.getDate() + everyDays);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return dates;
  };

  // Get reminder title based on type
  getReminderTitle = (type, taskTitle = '') => {
    switch (type) {
      case 'alarm':
        return taskTitle;
      case 'notification':
        return `Task Reminder: ${taskTitle}`;
      default:
        return `Task: ${taskTitle}`;
    }
  };

  // Get reminder message
  getReminderMessage = (taskData, reminderData) => {
    const scheduleInfo = this.getScheduleInfo(taskData);

    switch (reminderData.scheduleType) {
      case 'always':
        return `Time to start! ${scheduleInfo}`;
      case 'days_before':
        const days = reminderData.daysBefore || 0;
        const hours = reminderData.hoursBefore || 0;
        let timeInfo = '';
        if (days > 0) timeInfo += `in ${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0)
          timeInfo += `${timeInfo ? ' ' : ''}${hours} hour${hours > 1 ? 's' : ''}`;
        return `Coming up ${timeInfo}. ${scheduleInfo}`;
      case 'specific_days':
        return `Scheduled for today! ${scheduleInfo}`;
      default:
        return `Don't forget! ${scheduleInfo}`;
    }
  };

  // Get schedule information
  getScheduleInfo = taskData => {
    if (taskData.blockTimeData && taskData.blockTimeData.startTime) {
      return `Scheduled for ${taskData.blockTimeData.startTime}${
        taskData.blockTimeData.endTime ? ` - ${taskData.blockTimeData.endTime}` : ''
      }`;
    }

    if (taskData.durationData) {
      return `Duration: ${
        taskData.durationData.formattedDuration ||
        `${taskData.durationData.hours}h ${taskData.durationData.minutes}m`
      }`;
    }

    return 'Check your schedule for details.';
  };

  // Cancel task reminders using AlarmSchedulerService
  cancelTaskReminders = async taskId => {
    try {
      let cancelledCount = 0;

      if (this.isNativeSupported) {
        try {
          const success = await AlarmSchedulerService.cancelTaskAlarms(taskId);
          if (success) cancelledCount++;
          console.log(`Cancelled ElevenLabs alarms for task: ${taskId}`);
        } catch (error) {
          console.error('Error cancelling ElevenLabs alarms:', error);
        }
      }

      try {
        await NotificationService.cancelTaskNotifications(taskId);
        console.log(`Cancelled notifications for task: ${taskId}`);
      } catch (error) {
        console.error('Error cancelling notifications:', error);
      }

      console.log(`Total reminders cancelled for task ${taskId}: ${cancelledCount}`);
      return cancelledCount;
    } catch (error) {
      console.error('Error cancelling task reminders:', error);
      return 0;
    }
  };

  // Test reminder functionality
  testReminder = async (type = 'alarm', testUserName = 'Test') => {
    console.log('Testing ElevenLabs reminder with correct time formatting...');

    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 15);

    const testTask = {
      id: 'test_reminder_' + Date.now(),
      title: `ElevenLabs Test ${type.toUpperCase()}`,
      reminderEnabled: true,
      reminderData: {
        type: type,
        enabled: true,
        scheduleType: 'always',
        time: testTime.toTimeString().slice(0, 5),
      },
      startDate: testTime,
      blockTimeData: {
        startTime: testTime.toTimeString().slice(0, 5), // This will be formatted correctly
        endTime: new Date(testTime.getTime() + 3600000).toTimeString().slice(0, 5),
      },
      userProfile: {
        username: testUserName,
        display_name: testUserName,
      },
    };

    console.log(`Testing ElevenLabs ${type} reminder - should trigger in 15 seconds with correct time`);
    return await this.scheduleTaskReminders(testTask, {id: testTask.id});
  };

  // Other methods remain unchanged...
  updateTaskReminders = async (taskData, savedTask) => {
    try {
      console.log(`Updating reminders for task: ${savedTask.id}`);
      await this.cancelTaskReminders(savedTask.id);
      const newReminders = await this.scheduleTaskReminders(taskData, savedTask);
      console.log(`Updated ${newReminders.length} reminders for task: ${savedTask.id}`);
      return newReminders;
    } catch (error) {
      console.error('Error updating task reminders:', error);
      return [];
    }
  };

  getReminderStats = async () => {
    try {
      const stats = {
        elevenLabsAlarms: 0,
        notifications: 0,
        total: 0,
        platform: Platform.OS,
        nativeSupported: this.isNativeSupported,
      };

      if (this.isNativeSupported) {
        try {
          const serviceInfo = AlarmSchedulerService.getServiceInfo();
          stats.elevenLabsAlarms = serviceInfo.isInitialized ? 1 : 0;
        } catch (error) {
          console.error('Error getting ElevenLabs alarm stats:', error);
        }
      }

      stats.total = stats.elevenLabsAlarms + stats.notifications;
      return stats;
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return {
        elevenLabsAlarms: 0,
        notifications: 0,
        total: 0,
        platform: Platform.OS,
        nativeSupported: this.isNativeSupported,
      };
    }
  };

  isNativeAlarmsSupported = () => {
    return this.isNativeSupported;
  };

  checkPermissions = async () => {
    if (!this.isNativeSupported) {
      return {native: false, notifications: true};
    }

    try {
      const permissions = await AlarmSchedulerService.checkPermissions();
      return {
        native: permissions.native,
        notifications: permissions.notifications,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {native: false, notifications: true};
    }
  };
}

export default new ReminderScheduler();