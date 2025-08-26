import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppState, NativeModules } from 'react-native';
import { AuthProvider, useAuth } from './Src/contexts/AuthContext';
import AuthNavigator from './Src/Navigation/AuthNavigator';
import { taskAppBlockingService } from './Src/services/AppBlocking/taskAppBlockingService';

// Create InstalledApps module reference
const InstalledApps = (() => {
  try {
    if (!NativeModules.InstalledApps) {
      console.log('InstalledApps native module not available, using stub');
      return {
        getInstalledApps: () => Promise.resolve([]),
        setAppSchedule: (packageName, schedules) => {
          console.log('Using stub setAppSchedule for', packageName, 'with schedules:', schedules);
          return Promise.resolve(true);
        },
        getAppSchedule: (packageName) => Promise.resolve([]),
        shouldAppBeLocked: (packageName) => Promise.resolve(false),
        setAllSchedulesEnabled: (packageName, enabled) => Promise.resolve(true),
        setAppPomodoroExclusion: (packageName, excluded) => Promise.resolve('Success'),
        getAppPomodoroExclusion: (packageName) => Promise.resolve(false),
        getPomodoroExcludedApps: () => Promise.resolve([]),
        startLockService: () => Promise.resolve(true),
        checkPermissions: () => Promise.resolve({overlay: false, usage: false}),
        openOverlaySettings: () => Promise.resolve(true),
        openUsageSettings: () => Promise.resolve(true)
      };
    }
    return NativeModules.InstalledApps;
  } catch (error) {
    console.error('Error initializing InstalledApps module:', error);
    return {
      getInstalledApps: () => Promise.resolve([]),
      setAppSchedule: () => Promise.resolve(true),
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
  }
})();

// Task Blocking Manager Component
const TaskBlockingManager = () => {
  const { user } = useAuth();

  const manageTaskBlocking = async () => {
    if (!user) return;

    try {
      console.log('Managing task-based blocking for user:', user.id);
      
      // Use the simplified management method
      const activeBlocks = await taskAppBlockingService.manageTaskBlocking(user.id, InstalledApps);
      
      if (activeBlocks.length > 0) {
        console.log(`${activeBlocks.length} task blocks currently active:`, 
          activeBlocks.map(block => `${block.taskTitle} (${block.startTime} - ${block.endTime})`));
      } else {
        console.log('No active task blocks at this time');
      }
      
    } catch (error) {
      console.error('Error managing task blocking:', error);
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user) {
        console.log('App became active, checking task blocking...');
        manageTaskBlocking();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user]);

  // Set up periodic checking and initial application
  useEffect(() => {
    if (!user) return;

    // Apply task blocking immediately when user is available
    manageTaskBlocking();

    // Set up interval to check every minute for task blocking updates
    const intervalId = setInterval(() => {
      manageTaskBlocking();
    }, 60 * 1000); // Check every 60 seconds

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      
      // Clear task-based blocking when component unmounts
      if (user) {
        taskAppBlockingService.clearTaskBasedBlocking(user.id, InstalledApps)
          .catch(error => console.error('Error clearing task blocking on cleanup:', error));
      }
    };
  }, [user]);

  // This component doesn't render anything, it just manages task blocking in the background
  return null;
};

// Main App Component
const AppContent = () => {
  return (
    <>
      <AuthNavigator />
      {/* Task blocking manager runs in background */}
      <TaskBlockingManager />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}