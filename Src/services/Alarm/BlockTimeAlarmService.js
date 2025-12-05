import { NativeModules, Platform, AppState } from 'react-native';
import blockTimeScheduler from './BlockTimeScheduler';

const { BlockTimeSchedulerModule } = NativeModules;

class BlockTimeAlarmService {
  constructor() {
    this.appStateSubscription = null;
    this.isMonitoring = false;
  }

  /**
   * Initialize alarm service
   */
  async initialize(userId) {
    try {
      console.log('🚀 [BlockTimeAlarmService] Initializing...');

      // Initialize scheduler
      await blockTimeScheduler.initialize(userId);

      // Schedule today's alarms
      await blockTimeScheduler.scheduleTodayAlarms();

      // Schedule upcoming alarms (next 7 days)
      await blockTimeScheduler.scheduleUpcomingAlarms(7);

      // Start monitoring app state
      this.startAppStateMonitoring();

      console.log('✅ [BlockTimeAlarmService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Initialization error:', error);
      return false;
    }
  }

  /**
   * Start monitoring app state for rescheduling
   */
  startAppStateMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 [BlockTimeAlarmService] App became active - checking alarms');
        
        // Reschedule today's alarms
        await blockTimeScheduler.scheduleTodayAlarms();
      }
    });

    console.log('👁️ [BlockTimeAlarmService] App state monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopAppStateMonitoring() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isMonitoring = false;
    console.log('🛑 [BlockTimeAlarmService] App state monitoring stopped');
  }

  /**
   * Check permissions
   */
  async checkPermissions() {
    try {
      return await blockTimeScheduler.checkAndRequestPermissions();
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Check permissions error:', error);
      return { exactAlarm: false, overlay: false };
    }
  }

  /**
   * Request exact alarm permission with user prompt
   */
  async requestExactAlarmPermission() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      return await blockTimeScheduler.requestExactAlarmPermission();
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Request permission error:', error);
      return false;
    }
  }

  /**
   * Request overlay permission with user prompt
   */
  async requestOverlayPermission() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      return await blockTimeScheduler.requestOverlayPermission();
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Request permission error:', error);
      return false;
    }
  }

  /**
   * Schedule alarm for a task when it's created/updated
   */
  async scheduleTaskAlarms(task) {
    try {
      // Check if task needs alarms
      if (!task.block_time_enabled || !['timer', 'timerTracker'].includes(task.evaluation_type)) {
        console.log('⏭️ [BlockTimeAlarmService] Task does not need alarms');
        return { success: true, scheduled: 0 };
      }

      console.log('📅 [BlockTimeAlarmService] Scheduling alarms for task:', task.title);

      // Reschedule alarms for this task
      return await blockTimeScheduler.rescheduleTaskAlarms(task.id);
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Schedule task alarms error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel alarms when task is deleted or disabled
   */
  async cancelTaskAlarms(taskId) {
    try {
      console.log('🗑️ [BlockTimeAlarmService] Cancelling alarms for task:', taskId);
      return await blockTimeScheduler.cancelAllAlarmsForTask(taskId);
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Cancel task alarms error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh all alarms (useful after app update or boot)
   */
  async refreshAllAlarms(userId) {
    try {
      console.log('🔄 [BlockTimeAlarmService] Refreshing all alarms...');

      // Re-initialize
      await blockTimeScheduler.initialize(userId);

      // Schedule today + upcoming
      await blockTimeScheduler.scheduleTodayAlarms();
      await blockTimeScheduler.scheduleUpcomingAlarms(7);

      console.log('✅ [BlockTimeAlarmService] All alarms refreshed');
      return true;
    } catch (error) {
      console.error('❌ [BlockTimeAlarmService] Refresh error:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('🧹 [BlockTimeAlarmService] Cleaning up...');
    
    this.stopAppStateMonitoring();
    blockTimeScheduler.cleanup();
  }
}

// Export singleton instance
export default new BlockTimeAlarmService();