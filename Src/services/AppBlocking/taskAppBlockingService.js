import { taskService } from '../api/taskService';
import { NativeModules } from 'react-native';

// Get the PomodoroModule for actual blocking enforcement
const { PomodoroModule } = NativeModules;

export const taskAppBlockingService = {
  
  // Check if an app should be blocked during task time (block ALL apps except essential ones)
  shouldBlockApp(packageName) {
    // Essential apps that should never be blocked
    const ESSENTIAL_APPS = [
      'com.android.phone', 
      'com.android.dialer', 
      'com.android.mms', 
      'com.google.android.contacts', 
      'com.android.emergency', 
      'com.android.settings', 
      'com.android.systemui', 
      'android', 
      'com.wingsfly', 
      'com.applock', 
      'com.digitalwellbeing', 
    ];
    
    // Don't block essential system apps
    if (ESSENTIAL_APPS.includes(packageName)) {
      return false;
    }
    
    // Don't block system apps (package names starting with android.)
    if (packageName.startsWith('android.') || packageName.startsWith('com.android.')) {
      return false;
    }
    
    // Block everything else during task time
    return true;
  },
  
  // Get all tasks with active block times for today
  async getActiveTaskBlockTimes(userId) {
    try {
      const tasks = await taskService.getTasks(userId);
      const today = new Date();
      const todayStr = today.toDateString();
      
      // Filter tasks that have block time enabled and are scheduled for today
      const activeTaskBlocks = tasks.filter(task => {
        if (!task.block_time_enabled || !task.block_time_data) {
          return false;
        }
        
        // Check if task is scheduled for today
        const startDate = new Date(task.start_date);
        const endDate = task.end_date ? new Date(task.end_date) : null;
        
        // Basic date check - task should be active today
        if (startDate.toDateString() > todayStr) {
          return false; // Task hasn't started yet
        }
        
        if (endDate && endDate.toDateString() < todayStr) {
          return false; // Task has ended
        }
        
        return true;
      });
      
      return activeTaskBlocks.map(task => ({
        taskId: task.id,
        taskTitle: task.title,
        blockTimeData: task.block_time_data,
        startTime: task.block_time_data.startTime,
        endTime: task.block_time_data.endTime,
        isActive: this.isTimeInRange(task.block_time_data.startTime, task.block_time_data.endTime)
      }));
      
    } catch (error) {
      console.error('Error getting active task block times:', error);
      return [];
    }
  },
  
  // Check if current time is within a time range
  isTimeInRange(startTime, endTime) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    // Parse start and end times
    const parseTime = (timeStr) => {
      if (!timeStr || typeof timeStr !== 'string') {
        console.error('Invalid time string:', timeStr);
        return 0;
      }
      
      const parts = timeStr.trim().split(' ');
      if (parts.length !== 2) {
        console.error('Time string should have format "HH:MM AM/PM":', timeStr);
        return 0;
      }
      
      const [time, period] = parts;
      const timeParts = time.split(':');
      
      if (timeParts.length !== 2) {
        console.error('Time part should have format "HH:MM":', time);
        return 0;
      }
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10) || 0;
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('Invalid hours or minutes:', { hours, minutes });
        return 0;
      }
      
      let hour24 = hours;
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hour24 += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      return hour24 * 60 + minutes;
    };
    
    const startMinutes = parseTime(startTime);
    let endMinutes = parseTime(endTime);
    
    // Handle overnight time ranges
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
      
      // For overnight ranges, check if current time is after start OR before end
      return currentTime >= startMinutes || currentTime <= (endMinutes - 24 * 60);
    }
    
    // Normal time range
    return currentTime >= startMinutes && currentTime <= endMinutes;
  },

  // Start task-based blocking using native blocking system
  async startTaskBlocking() {
    try {
      console.log('🔒 Starting task-based blocking...');
      
      if (PomodoroModule && PomodoroModule.startTaskBlocking) {
        // Use dedicated task blocking method if available
        await PomodoroModule.startTaskBlocking();
        console.log('✅ Task blocking started via native module');
      } else if (PomodoroModule && PomodoroModule.startPomodoroBlocking) {
        // Fallback to Pomodoro blocking method
        await PomodoroModule.startPomodoroBlocking();
        console.log('✅ Task blocking started via Pomodoro module');
      } else {
        console.warn('⚠️ No native blocking module available');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error starting task blocking:', error);
      return false;
    }
  },

  // Stop task-based blocking
  async stopTaskBlocking() {
    try {
      console.log('🛑 Stopping task-based blocking...');
      
      if (PomodoroModule && PomodoroModule.stopTaskBlocking) {
        // Use dedicated task blocking method if available
        await PomodoroModule.stopTaskBlocking();
        console.log('✅ Task blocking stopped via native module');
      } else if (PomodoroModule && PomodoroModule.stopPomodoroBlocking) {
        // Fallback to Pomodoro blocking method
        await PomodoroModule.stopPomodoroBlocking();
        console.log('✅ Task blocking stopped via Pomodoro module');
      } else {
        console.warn('⚠️ No native blocking module available');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error stopping task blocking:', error);
      return false;
    }
  },

  // Check if task blocking is currently active
  async isTaskBlockingActive() {
    try {
      if (PomodoroModule && PomodoroModule.isTaskBlocking) {
        return await PomodoroModule.isTaskBlocking();
      } else if (PomodoroModule && PomodoroModule.isPomodoroBlocking) {
        return await PomodoroModule.isPomodoroBlocking();
      }
      return false;
    } catch (error) {
      console.error('Error checking task blocking status:', error);
      return false;
    }
  },
  
  // Apply task-based blocking - using native blocking system like Pomodoro
  async applyTaskBasedBlocking(userId, InstalledApps) {
    try {
      console.log('🔒 Applying task-based blocking...');
      const activeTaskBlocks = await this.getActiveTaskBlockTimes(userId);
      
      if (activeTaskBlocks.length === 0) {
        console.log('No tasks with block times found');
        return;
      }
      
      // Check if we have active blocks
      const hasActiveBlocks = activeTaskBlocks.some(block => block.isActive);
      
      if (!hasActiveBlocks) {
        console.log('No currently active task blocks');
        return;
      }

      // Start the native blocking system
      const blockingStarted = await this.startTaskBlocking();
      
      if (!blockingStarted) {
        console.warn('Failed to start native blocking system, falling back to schedule-based blocking');
        // Fallback to schedule-based blocking
        await this.applyScheduleBasedBlocking(userId, InstalledApps, activeTaskBlocks);
        return;
      }

      // Log active blocks
      for (const taskBlock of activeTaskBlocks) {
        if (taskBlock.isActive) {
          console.log(`🚫 Task blocking active for: ${taskBlock.taskTitle} (${taskBlock.startTime} - ${taskBlock.endTime})`);
        }
      }
      
    } catch (error) {
      console.error('Error applying task-based blocking:', error);
    }
  },

  // Fallback method: Apply schedule-based blocking (your original approach)
  async applyScheduleBasedBlocking(userId, InstalledApps, activeTaskBlocks) {
    try {
      // Get all installed apps
      const installedApps = await InstalledApps.getInstalledApps();
      
      // For each active task block time, block all apps
      for (const taskBlock of activeTaskBlocks) {
        if (taskBlock.isActive) {
          console.log(`🚫 Applying schedule-based blocking for task: ${taskBlock.taskTitle} (${taskBlock.startTime} - ${taskBlock.endTime})`);
          
          // Block ALL apps (except essential ones) during this task time
          let blockedCount = 0;
          for (const app of installedApps) {
            if (this.shouldBlockApp(app.packageName)) {
              try {
                // Use the exact same format as your existing Schedule component
                const taskSchedules = [{
                  id: `task_${taskBlock.taskId}`,
                  type: 'lock', // Use your ScheduleType.LOCK
                  startTime: taskBlock.startTime,
                  endTime: taskBlock.endTime,
                  days: [new Date().getDay()], // Current day
                  enabled: true,
                  isTaskBased: true
                }];
                
                // Apply directly - don't try to merge with existing schedules
                await InstalledApps.setAppSchedule(app.packageName, taskSchedules);
                blockedCount++;
                
                console.log(`✅ Applied task blocking to ${app.name || app.packageName}`);
                
              } catch (error) {
                console.error(`❌ Error applying task blocking to ${app.name || app.packageName}:`, error);
              }
            }
          }
          console.log(`Blocked ${blockedCount} apps for task "${taskBlock.taskTitle}"`);
        }
      }
    } catch (error) {
      console.error('Error in schedule-based blocking:', error);
    }
  },
  
  // Clear task-based blocking
  async clearTaskBasedBlocking(userId, InstalledApps) {
    try {
      console.log('🧹 Clearing task-based blocking...');
      
      // First, stop the native blocking system
      await this.stopTaskBlocking();
      
      // Then clear any schedule-based blocks as backup
      const installedApps = await InstalledApps.getInstalledApps();
      
      let clearedCount = 0;
      for (const app of installedApps) {
        if (this.shouldBlockApp(app.packageName)) {
          try {
            // Simply clear all schedules for apps during task blocking cleanup
            await InstalledApps.setAppSchedule(app.packageName, []);
            clearedCount++;
            console.log(`✅ Cleared task-based blocking for ${app.name || app.packageName}`);
            
          } catch (error) {
            console.warn(`Warning: Could not clear task blocking for ${app.name || app.packageName}:`, error.message);
          }
        }
      }
      
      console.log(`Cleared task-based blocking for ${clearedCount} apps`);
      
    } catch (error) {
      console.error('Error clearing task-based blocking:', error);
    }
  },
  
  // Get currently active task blocks
  async getCurrentlyActiveTaskBlocks(userId) {
    try {
      const activeTaskBlocks = await this.getActiveTaskBlockTimes(userId);
      return activeTaskBlocks.filter(block => block.isActive);
    } catch (error) {
      console.error('Error getting currently active task blocks:', error);
      return [];
    }
  },

  // Main method to manage task blocking - call this periodically
  async manageTaskBlocking(userId, InstalledApps) {
    try {
      const currentlyActiveBlocks = await this.getCurrentlyActiveTaskBlocks(userId);
      
      if (currentlyActiveBlocks.length > 0) {
        // There are active task blocks - apply blocking
        console.log(`📱 ${currentlyActiveBlocks.length} task blocks currently active:`, 
          currentlyActiveBlocks.map(block => `${block.taskTitle} (${block.startTime} - ${block.endTime})`));
        
        await this.applyTaskBasedBlocking(userId, InstalledApps);
      } else {
        // No active task blocks - clear any existing task blocking
        console.log('🟢 No active task blocks, clearing any existing blocking');
        await this.clearTaskBasedBlocking(userId, InstalledApps);
      }
      
      return currentlyActiveBlocks;
    } catch (error) {
      console.error('Error managing task blocking:', error);
      return [];
    }
  }
};