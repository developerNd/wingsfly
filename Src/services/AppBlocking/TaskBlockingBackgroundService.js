import { taskService } from '../api/taskService';
import { taskAppBlockingService } from './taskAppBlockingService';
import { DeviceEventEmitter, AppState, NativeModules } from 'react-native';

/**
 * Diagnostic version to identify the issue
 */
class TaskBlockingBackgroundService {
  constructor() {
    this.isRunning = false;
    this.isInitialized = false;
    this.userId = null;
    this.installedAppsModule = null;
    this.checkInterval = null;
    this.activeTaskBlocks = [];
    this.lastCheckTime = null;
    
    // Bind methods to preserve context
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.performTaskBlockingCheck = this.performTaskBlockingCheck.bind(this);
  }

  /**
   * Initialize InstalledApps module internally
   */
  initializeInstalledAppsModule() {
    console.log('[DEBUG] Initializing InstalledApps module...');
    try {
      if (!NativeModules.InstalledApps) {
        console.log('[DEBUG] InstalledApps native module not available, using stub');
        const stubModule = {
          getInstalledApps: () => {
            console.log('[DEBUG] Stub getInstalledApps called');
            return Promise.resolve([]);
          },
          setAppSchedule: (packageName, schedules) => {
            console.log('[DEBUG] Stub setAppSchedule called for:', packageName);
            return Promise.resolve(true);
          },
          getAppSchedule: () => Promise.resolve([]),
          shouldAppBeLocked: () => Promise.resolve(false),
          setAllSchedulesEnabled: () => Promise.resolve(true),
          setAppPomodoroExclusion: () => Promise.resolve('Success'),
          getAppPomodoroExclusion: () => Promise.resolve(false),
          getPomodoroExcludedApps: () => Promise.resolve([]),
          startLockService: () => Promise.resolve(true),
          checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
          openOverlaySettings: () => Promise.resolve(true),
          openUsageSettings: () => Promise.resolve(true)
        };
        console.log('[DEBUG] Stub module created successfully');
        return stubModule;
      }
      console.log('[DEBUG] Using real NativeModules.InstalledApps');
      return NativeModules.InstalledApps;
    } catch (error) {
      console.error('[DEBUG] Error initializing InstalledApps module:', error);
      return null;
    }
  }

  /**
   * Initialize the service with user ID only
   */
  async initialize(userId) {
    try {
      console.log('[DEBUG] TaskBlockingBackgroundService.initialize called with userId:', userId);
      
      if (this.isInitialized && this.userId === userId) {
        console.log('[DEBUG] Already initialized for this user');
        return true;
      }

      if (!userId) {
        console.warn('[DEBUG] Cannot initialize without userId');
        return false;
      }

      console.log('[DEBUG] Setting userId:', userId);
      this.userId = userId;
      
      console.log('[DEBUG] Calling initializeInstalledAppsModule...');
      this.installedAppsModule = this.initializeInstalledAppsModule();
      
      console.log('[DEBUG] InstalledApps module result:', {
        exists: !!this.installedAppsModule,
        type: typeof this.installedAppsModule,
        hasGetInstalledApps: !!(this.installedAppsModule && this.installedAppsModule.getInstalledApps)
      });

      // Set up event listeners
      this.setupEventListeners();

      // Check if we need to start the service immediately
      await this.checkAndStartIfNeeded();

      this.isInitialized = true;
      console.log('[DEBUG] TaskBlockingBackgroundService initialized successfully');
      return true;
    } catch (error) {
      console.error('[DEBUG] Error initializing TaskBlockingBackgroundService:', error);
      console.error('[DEBUG] Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Set up event listeners for app state
   */
  setupEventListeners() {
    console.log('[DEBUG] Setting up event listeners');
    try {
      // Listen for app state changes
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      console.log('[DEBUG] App state listener added');
    } catch (error) {
      console.error('[DEBUG] Error setting up event listeners:', error);
    }
  }

  /**
   * Handle app state changes
   */
  async handleAppStateChange(nextAppState) {
    console.log('[DEBUG] App state changed to:', nextAppState);
    
    if (nextAppState === 'active') {
      await this.checkAndStartIfNeeded();
    }
  }

  /**
   * Check if there are tasks that need blocking and start service if needed
   */
  async checkAndStartIfNeeded() {
    try {
      console.log('[DEBUG] checkAndStartIfNeeded called');
      console.log('[DEBUG] Current state:', {
        userId: this.userId,
        hasInstalledAppsModule: !!this.installedAppsModule,
        isRunning: this.isRunning
      });

      if (!this.userId) {
        console.log('[DEBUG] No user ID available, skipping check');
        return;
      }

      // Get tasks with block time enabled
      const tasksWithBlockTime = await this.getTasksWithBlockTime();
      
      if (tasksWithBlockTime.length === 0) {
        console.log('[DEBUG] No tasks with block time found');
        if (this.isRunning) {
          await this.stop();
        }
        return;
      }

      // Check if any of these tasks are currently active
      const currentlyActiveBlocks = await this.getCurrentlyActiveBlocks(tasksWithBlockTime);
      console.log('[DEBUG] Currently active blocks:', currentlyActiveBlocks.length);
      
      if (currentlyActiveBlocks.length > 0) {
        if (!this.isRunning) {
          console.log('[DEBUG] Starting service for active blocks');
          await this.start();
        } else {
          console.log('[DEBUG] Service already running, updating blocking');
          await this.performTaskBlockingCheck();
        }
      } else {
        console.log('[DEBUG] No active blocks, starting minimal monitoring');
        if (!this.isRunning) {
          await this.startMinimalMonitoring();
        }
      }

    } catch (error) {
      console.error('[DEBUG] Error in checkAndStartIfNeeded:', error);
    }
  }

  /**
   * Get tasks that have block time enabled
   */
  async getTasksWithBlockTime() {
    try {
      console.log('[DEBUG] Getting tasks for userId:', this.userId);
      const allTasks = await taskService.getTasks(this.userId);
      
      const tasksWithBlockTime = allTasks.filter(task => 
        task.block_time_enabled && task.block_time_data
      );
      
      console.log('[DEBUG] Found tasks with block time:', tasksWithBlockTime.length);
      return tasksWithBlockTime;
      
    } catch (error) {
      console.error('[DEBUG] Error getting tasks with block time:', error);
      return [];
    }
  }

  /**
   * Get currently active blocks from tasks
   */
  async getCurrentlyActiveBlocks(tasksWithBlockTime) {
    const activeBlocks = [];
    const now = new Date();
    const todayStr = now.toDateString();

    for (const task of tasksWithBlockTime) {
      // Check if task is active today
      const startDate = new Date(task.start_date);
      const endDate = task.end_date ? new Date(task.end_date) : null;

      // Basic date check
      if (startDate.toDateString() > todayStr) continue;
      if (endDate && endDate.toDateString() < todayStr) continue;

      // Check if current time is within block time range
      const isCurrentlyActive = taskAppBlockingService.isTimeInRange(
        task.block_time_data.startTime,
        task.block_time_data.endTime
      );

      if (isCurrentlyActive) {
        activeBlocks.push({
          taskId: task.id,
          taskTitle: task.title,
          blockTimeData: task.block_time_data,
          startTime: task.block_time_data.startTime,
          endTime: task.block_time_data.endTime,
          isActive: true
        });
      }
    }

    console.log('[DEBUG] Active blocks found:', activeBlocks.length);
    return activeBlocks;
  }

  /**
   * Start the full blocking service
   */
  async start() {
    if (this.isRunning) {
      console.log('[DEBUG] Service already running');
      return;
    }

    try {
      console.log('[DEBUG] Starting TaskBlockingBackgroundService...');
      
      this.isRunning = true;
      
      // Perform immediate check
      await this.performTaskBlockingCheck();
      
      // Set up interval for regular checks
      this.checkInterval = setInterval(this.performTaskBlockingCheck, 2 * 60 * 1000);
      
      console.log('[DEBUG] TaskBlockingBackgroundService started successfully');
      
    } catch (error) {
      console.error('[DEBUG] Error starting service:', error);
      this.isRunning = false;
    }
  }

  /**
   * Start minimal monitoring
   */
  async startMinimalMonitoring() {
    if (this.isRunning) return;

    console.log('[DEBUG] Starting minimal monitoring...');
    this.isRunning = true;
    
    this.checkInterval = setInterval(async () => {
      try {
        const tasksWithBlockTime = await this.getTasksWithBlockTime();
        const activeBlocks = await this.getCurrentlyActiveBlocks(tasksWithBlockTime);
        
        if (activeBlocks.length > 0) {
          console.log('[DEBUG] Active blocks detected, switching to full monitoring');
          clearInterval(this.checkInterval);
          this.isRunning = false;
          await this.start();
        }
      } catch (error) {
        console.error('[DEBUG] Error in minimal monitoring:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Perform the actual task blocking check and application
   */
  async performTaskBlockingCheck() {
    try {
      console.log('[DEBUG] performTaskBlockingCheck called');
      
      // Double check our state at the beginning of this critical method
      console.log('[DEBUG] Method entry state:', {
        hasUserId: !!this.userId,
        userId: this.userId,
        hasInstalledAppsModule: !!this.installedAppsModule,
        installedAppsModuleType: typeof this.installedAppsModule,
        isInitialized: this.isInitialized
      });

      if (!this.userId) {
        console.warn('[DEBUG] Missing userId for task blocking check');
        console.warn('[DEBUG] This indicates the service lost its userId somehow');
        return;
      }

      if (!this.installedAppsModule) {
        console.warn('[DEBUG] Missing installedAppsModule, reinitializing...');
        this.installedAppsModule = this.initializeInstalledAppsModule();
        
        if (!this.installedAppsModule) {
          console.error('[DEBUG] Failed to reinitialize installedAppsModule');
          return;
        }
        console.log('[DEBUG] InstalledAppsModule reinitialized successfully');
      }

      console.log('[DEBUG] About to call taskAppBlockingService.manageTaskBlocking with:');
      console.log('[DEBUG] - userId:', this.userId);
      console.log('[DEBUG] - installedAppsModule type:', typeof this.installedAppsModule);
      
      // Use the existing taskAppBlockingService logic
      const activeBlocks = await taskAppBlockingService.manageTaskBlocking(
        this.userId, 
        this.installedAppsModule
      );

      console.log('[DEBUG] manageTaskBlocking returned:', activeBlocks ? activeBlocks.length : 'null', 'blocks');

      // Update our internal state
      this.activeTaskBlocks = activeBlocks || [];
      this.lastCheckTime = new Date();

      console.log('[DEBUG] Task blocking check completed successfully');

    } catch (error) {
      console.error('[DEBUG] Error performing task blocking check:', error);
      console.error('[DEBUG] Error details:', {
        hasUserId: !!this.userId,
        hasInstalledAppsModule: !!this.installedAppsModule,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Stop the blocking service
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      console.log('[DEBUG] Stopping service...');
      
      this.isRunning = false;
      
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      if (this.userId && this.installedAppsModule) {
        await taskAppBlockingService.clearTaskBasedBlocking(this.userId, this.installedAppsModule);
      }

      this.activeTaskBlocks = [];
      this.lastCheckTime = null;

      console.log('[DEBUG] Service stopped successfully');
      
    } catch (error) {
      console.error('[DEBUG] Error stopping service:', error);
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      userId: this.userId,
      hasInstalledAppsModule: !!this.installedAppsModule,
      activeTaskBlocks: this.activeTaskBlocks,
      lastCheckTime: this.lastCheckTime
    };
  }

  /**
   * Clean up when service is being destroyed
   */
  async cleanup() {
    console.log('[DEBUG] Cleaning up service...');
    
    await this.stop();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    this.userId = null;
    this.installedAppsModule = null;
    this.isInitialized = false;
    
    console.log('[DEBUG] Cleanup completed');
  }
}

// Create and export a singleton instance
export const taskBlockingBackgroundService = new TaskBlockingBackgroundService();