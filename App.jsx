import React, {useEffect, useState, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AppState, DeviceEventEmitter, Alert} from 'react-native';
import { supabase } from './supabase';
import {AuthProvider, useAuth} from './Src/contexts/AuthContext';
import {SessionProvider, useSession} from './Src/contexts/SessionContext';
import {MusicProvider, useMusic} from './Src/contexts/MusicContext';
import {NotesProvider} from './Src/contexts/NotesContext';
import AuthNavigator from './Src/Navigation/AuthNavigator';
import NotificationService from './Src/services/notifications/NotificationService';
import AlarmSchedulerService from './Src/services/notifications/AlarmSchedulerService';
import NativeAlarmService from './Src/services/notifications/NativeAlarmService';
import EnhancedTTSService from './Src/services/notifications/EnhancedTTSService';
import AlarmTTSEventHandler from './Src/services/notifications/AlarmTTSEventHandler';
import MonthReminderNotificationService from './Src/services/notifications/MonthReminderNotificationService';
import WaterReminderNotificationService from './Src/services/notifications/WaterReminderNotificationService';
import DailyTaskReminderModal from './Src/Components/DailyTaskReminderModal';
import MonthReminderModal from './Src/Components/MonthReminderModal';
import {dailyReminderService} from './Src/services/challenges/DailyReminderService';
import {useSessionTracking} from './Src/hooks/useSessionTracking';
import {challengeService} from './Src/services/api/challengeService';
import SleepTrackerModal from './Src/Components/SleepTrackerModal';
import {sleepTrackerService} from './Src/services/api/SleepTrackerService';
import NightModeScheduler from './Src/services/NightModeScheduler';
import usageLimitVideoService from './Src/services/usageLimitVideoService';

// Music Manager Component
const MusicManager = () => {
  const {stopPlanMusic, forceStopPlanMusic, isPlanMusicActive} = useMusic();

  useEffect(() => {
    console.log('🎵 MusicManager: Initialized');

    const handleAppStateChange = async nextAppState => {
      console.log('🎵 MusicManager: App state changed to:', nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isPlanMusicActive) {
          console.log('🎵 MusicManager: App backgrounded - stopping music');
          try {
            await forceStopPlanMusic();
            console.log(
              '🎵 MusicManager: Music stopped successfully on background',
            );
          } catch (error) {
            console.error(
              '🎵 MusicManager: Error stopping music on background:',
              error,
            );
          }
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      console.log('🎵 MusicManager: Cleanup - stopping music');
      subscription?.remove();

      if (isPlanMusicActive) {
        forceStopPlanMusic().catch(error => {
          console.error('🎵 MusicManager: Error during cleanup:', error);
        });
      }
    };
  }, [isPlanMusicActive, forceStopPlanMusic]);

  return null;
};

// Month Reminder Notification Manager - Independent from SessionContext
const MonthReminderNotificationManager = () => {
  const {user} = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkAndShowMonthNotification = async () => {
      if (hasChecked.current) {
        console.log('[MONTH NOTIF MANAGER] Already checked this session');
        return;
      }

      if (!user || !user.id) {
        console.log('[MONTH NOTIF MANAGER] No valid user');
        return;
      }

      try {
        console.log(
          '[MONTH NOTIF MANAGER] Checking if should show notification',
        );

        // Check only the notification service (independent of SessionContext)
        const shouldShowNotif =
          await MonthReminderNotificationService.shouldShowToday();

        console.log(
          '[MONTH NOTIF MANAGER] Should show notification:',
          shouldShowNotif,
        );

        if (shouldShowNotif) {
          // Extract user name from user object
          const userName =
            user.user_metadata?.username ||
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.email;

          console.log(
            '[MONTH NOTIF MANAGER] Showing month reminder notification for:',
            userName,
          );

          // Show the notification
          const shown = await MonthReminderNotificationService.showNotification(
            userName,
          );

          if (shown) {
            console.log(
              '[MONTH NOTIF MANAGER] Notification shown and marked successfully',
            );
          }
        } else {
          console.log('[MONTH NOTIF MANAGER] Notification already shown today');
        }

        hasChecked.current = true;
      } catch (error) {
        console.error(
          '[MONTH NOTIF MANAGER] Error showing notification:',
          error,
        );
      }
    };

    // Delay to ensure app is fully loaded
    const timer = setTimeout(checkAndShowMonthNotification, 3000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Reset check flag when app comes from background
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        console.log(
          '[MONTH NOTIF MANAGER] App became active - resetting check flag',
        );
        hasChecked.current = false;
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  return null;
};

/**
 * Water Reminder Manager - Manages hourly water drinking reminders
 */
const WaterReminderManager = () => {
  const {user} = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    const initializeWaterReminder = async () => {
      if (hasInitialized.current) {
        console.log('[WATER REMINDER MANAGER] Already initialized');
        return;
      }

      if (!user || !user.id) {
        console.log('[WATER REMINDER MANAGER] No valid user');
        return;
      }

      try {
        console.log(
          '[WATER REMINDER MANAGER] Initializing water reminder service',
        );

        // Initialize the service
        await WaterReminderNotificationService.initialize();

        // Extract user name
        const userName =
          user.user_metadata?.username ||
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.email;

        // Check if reminders are enabled
        // Check if reminders are enabled
        const isEnabled = await WaterReminderNotificationService.isEnabled();

        if (!isEnabled) {
          // First time - auto-enable
          console.log(
            '[WATER REMINDER MANAGER] First time - enabling water reminders',
          );
          await WaterReminderNotificationService.scheduleHourlyReminders(
            userName,
          );
        } else {
          // Already enabled - just reschedule with current user name
          console.log(
            '[WATER REMINDER MANAGER] Rescheduling with user name:',
            userName,
          );
          await WaterReminderNotificationService.scheduleHourlyReminders(
            userName,
          );
        }

        hasInitialized.current = true;
      } catch (error) {
        console.error('[WATER REMINDER MANAGER] Error initializing:', error);
      }
    };

    // Delay to ensure app is fully loaded
    const timer = setTimeout(initializeWaterReminder, 4000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Reset initialization flag when app comes from background
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        console.log('[WATER REMINDER MANAGER] App became active');
        // Don't reset the flag - we want to initialize only once
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  return null;
};

const UsageLimitVideoSyncManager = () => {
  const {user} = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    const syncVideoFromSupabase = async () => {
      if (hasInitialized.current) {
        console.log('[USAGE VIDEO SYNC] Already synced');
        return;
      }

      if (!user?.id) {
        console.log('[USAGE VIDEO SYNC] No user, waiting...');
        return;
      }

      try {
        console.log('[USAGE VIDEO SYNC] 🎬 Starting sync...');

        // Use autoSyncVideo with realtime enabled
        const result = await usageLimitVideoService.autoSyncVideo(true);

        if (result.success && result.hasVideo) {
          console.log('[USAGE VIDEO SYNC] ✅ Video ready:', result.videoName);
          console.log('[USAGE VIDEO SYNC] 📍 URL:', result.videoUrl);
          hasInitialized.current = true;
        } else {
          console.log('[USAGE VIDEO SYNC] ⚠️ No video:', result.error);
        }
      } catch (error) {
        console.error('[USAGE VIDEO SYNC] ❌ Error:', error);
      }
    };

    const timer = setTimeout(syncVideoFromSupabase, 5000);
    return () => {
      clearTimeout(timer);
      // Cleanup realtime subscription
      usageLimitVideoService.unsubscribeFromUpdates();
    };
  }, [user?.id]);

  return null;
};

// Daily Modal Manager (keeping existing modal)
const DailyModalManager = () => {
  const {user} = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [lastCheckedUserId, setLastCheckedUserId] = useState(null);
  const [totalCompletedHours, setTotalCompletedHours] = useState(0);

  useEffect(() => {
    const context = 'DailyModalManager-initial';

    if (!user || !user.id) {
      console.log(`[DAILY MODAL] ${context}: No valid user`);
      setModalVisible(false);
      setModalData(null);
      setLastCheckedUserId(null);
      setTotalCompletedHours(0);
      return;
    }

    const userId = user.id;

    if (lastCheckedUserId === userId) {
      console.log(`[DAILY MODAL] ${context}: Already checked for user`);
      return;
    }

    const checkAndShowDailyModal = async () => {
      try {
        console.log(`[DAILY MODAL] ${context}: Checking for user`);
        setLastCheckedUserId(userId);

        const modalInfo = await dailyReminderService.checkDailyModal(userId);

        if (modalInfo) {
          console.log(
            `[DAILY MODAL] ${context}: Showing modal for challenge:`,
            modalInfo.challenge.name,
          );

          const challengeId = modalInfo.challenge.id;
          const totalHours = await challengeService.getTotalHoursCompleted(
            challengeId,
            userId,
          );

          console.log(`[DAILY MODAL] Total completed hours: ${totalHours}`);

          setTotalCompletedHours(totalHours);
          setModalData(modalInfo);
          setModalVisible(true);
          await dailyReminderService.markModalShownToday();
        } else {
          console.log(`[DAILY MODAL] ${context}: No modal to show`);
        }
      } catch (error) {
        console.error(`[DAILY MODAL] ${context}: Error:`, error);
      }
    };

    const timer = setTimeout(checkAndShowDailyModal, 1000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      const context = 'DailyModalManager-appstate';

      if (nextAppState === 'active') {
        if (!user || !user.id) {
          console.log(`[DAILY MODAL] ${context}: No valid user`);
          return;
        }

        const userId = user.id;

        const checkModalOnFocus = async () => {
          try {
            const shouldShow =
              await dailyReminderService.shouldShowDailyModal();
            if (shouldShow && !modalVisible) {
              const modalInfo = await dailyReminderService.checkDailyModal(
                userId,
              );
              if (modalInfo) {
                const challengeId = modalInfo.challenge.id;
                const totalHours =
                  await challengeService.getTotalHoursCompleted(
                    challengeId,
                    userId,
                  );

                console.log(
                  `[DAILY MODAL] ${context}: Total hours: ${totalHours}`,
                );

                setTotalCompletedHours(totalHours);
                setModalData(modalInfo);
                setModalVisible(true);
                await dailyReminderService.markModalShownToday();
              }
            }
          } catch (error) {
            console.error(`[DAILY MODAL] ${context}: Error:`, error);
          }
        };

        setTimeout(checkModalOnFocus, 500);
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [user?.id, modalVisible]);

  const handleClose = () => {
    console.log('[DAILY MODAL] Modal closed');
    setModalVisible(false);
    setModalData(null);
    setTotalCompletedHours(0);
  };

  return (
    <DailyTaskReminderModal
      visible={modalVisible}
      challenge={modalData?.challenge}
      totalCompletedDays={modalData?.totalCompletedDays}
      totalCompletedHours={totalCompletedHours}
      onClose={handleClose}
    />
  );
};

const SleepTrackerModalManager = () => {
  const {user} = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkAndShowSleepModal = async () => {
      if (hasChecked.current) {
        console.log('[SLEEP TRACKER MODAL] Already checked this session');
        return;
      }

      if (!user || !user.id) {
        console.log('[SLEEP TRACKER MODAL] No valid user');
        return;
      }

      try {
        console.log('[SLEEP TRACKER MODAL] Checking if should show modal');

        // Initialize service
        await sleepTrackerService.initialize();

        // Check if we should show the modal today
        const shouldShow = await sleepTrackerService.shouldShowToday();

        console.log('[SLEEP TRACKER MODAL] Should show:', shouldShow);

        if (shouldShow) {
          console.log('[SLEEP TRACKER MODAL] Showing sleep tracker modal');

          // Small delay to ensure app is fully loaded (after other modals)
          setTimeout(() => {
            setModalVisible(true);
          }, 4000); // 4 seconds delay after app load
        } else {
          console.log('[SLEEP TRACKER MODAL] Modal already shown today');
        }

        hasChecked.current = true;
      } catch (error) {
        console.error('[SLEEP TRACKER MODAL] Error showing modal:', error);
      }
    };

    // Delay to ensure app is fully loaded
    const timer = setTimeout(checkAndShowSleepModal, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Reset check flag when app comes from background
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        console.log(
          '[SLEEP TRACKER MODAL] App became active - resetting check flag',
        );
        hasChecked.current = false;
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  const handleClose = () => {
    console.log('[SLEEP TRACKER MODAL] Modal closed (skipped)');
    setModalVisible(false);
    // Mark as shown even if skipped
    sleepTrackerService.markShownToday();
  };

  const handleSave = async wakeupTime => {
    try {
      console.log('[SLEEP TRACKER MODAL] Saving wakeup time:', wakeupTime);

      // Save the wakeup time to database
      await sleepTrackerService.saveWakeupTime(
        user.id,
        wakeupTime.toISOString(),
      );

      // Mark as shown for today
      await sleepTrackerService.markShownToday();

      console.log('[SLEEP TRACKER MODAL] Wakeup time saved successfully');
      setModalVisible(false);
    } catch (error) {
      console.error('[SLEEP TRACKER MODAL] Error saving wakeup time:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const userName =
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    null;

  return (
    <SleepTrackerModal
      visible={modalVisible}
      onClose={handleClose}
      onSave={handleSave}
      userName={userName}
    />
  );
};

// NEW: Month Reminder Modal Manager (for showing modal if preferred)
const MonthReminderModalManager = () => {
  const {user} = useAuth();
  const {shouldShowMonthReminder, markMonthReminderShown} = useSession();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const checkAndShowModal = async () => {
      if (!user || !user.id) {
        console.log('[MONTH MODAL] No valid user');
        return;
      }

      const shouldShow = shouldShowMonthReminder();
      console.log('[MONTH MODAL] Should show:', shouldShow);

      if (shouldShow) {
        // Small delay for better UX (after daily modal if shown)
        setTimeout(() => {
          setModalVisible(true);
          markMonthReminderShown();
        }, 3000);
      }
    };

    const timer = setTimeout(checkAndShowModal, 1500);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleClose = () => {
    console.log('[MONTH MODAL] Modal closed');
    setModalVisible(false);
  };

  const userName =
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email;

  return (
    <MonthReminderModal
      visible={modalVisible}
      onClose={handleClose}
      userName={userName}
    />
  );
};

// Session Tracking Manager
const SessionTrackingManager = () => {
  const {user} = useAuth();

  const {
    triggerBatchUpload,
    getSessionStats,
    testSessionSystem,
    clearAllSessionData,
    isSessionActive,
  } = useSessionTracking(user);

  useEffect(() => {
    if (user?.id) {
      console.log(
        `[SESSION MANAGER] User logged in: ${user.id}, Session active: ${isSessionActive}`,
      );
    }
  }, [user?.id, isSessionActive]);

  useEffect(() => {
    global.sessionTracking = {
      triggerBatchUpload,
      getSessionStats,
      testSessionSystem,
      clearAllSessionData,
    };
  }, [
    triggerBatchUpload,
    getSessionStats,
    testSessionSystem,
    clearAllSessionData,
  ]);

  return null;
};

// Edit Screen Broadcast Listener
const EditScreenListener = ({navigationRef}) => {
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (navigationRef.current) {
      const unsubscribe = navigationRef.current.addListener('state', () => {
        setIsNavigationReady(true);
      });

      if (navigationRef.current.isReady()) {
        setIsNavigationReady(true);
      }

      return unsubscribe;
    }
  }, [navigationRef]);

  useEffect(() => {
    console.log('[EDIT SCREEN] Listener initialized');

    const editScreenListener = DeviceEventEmitter.addListener(
      'OPEN_EDIT_SCREEN',
      data => {
        console.log('[EDIT SCREEN] RECEIVED OPEN_EDIT_SCREEN EVENT');
        console.log('[EDIT SCREEN] Event data:', JSON.stringify(data, null, 2));

        try {
          const {planId, screen, evaluationType, fromReschedule} = data;

          if (!planId || !screen) {
            console.error('[EDIT SCREEN] Missing required data!');
            return;
          }

          const navData = {
            screen: screen,
            params: {
              planId: planId,
              fromReschedule: fromReschedule || false,
              evaluationType: evaluationType,
            },
          };

          setPendingNavigation(navData);
          setRetryCount(0);
          setIsNavigating(false);
        } catch (error) {
          console.error('[EDIT SCREEN] ERROR HANDLING BROADCAST:', error);
        }
      },
    );

    return () => editScreenListener?.remove();
  }, []);

  useEffect(() => {
    if (!pendingNavigation || isNavigating) {
      return;
    }

    const attemptNavigation = () => {
      if (!navigationRef.current) {
        if (retryCount < 5) {
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }
        return;
      }

      const navReady = navigationRef.current.isReady();
      if (!navReady || !isNavigationReady) {
        if (retryCount < 10) {
          setTimeout(() => setRetryCount(prev => prev + 1), 500);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }
        return;
      }

      try {
        setIsNavigating(true);
        navigationRef.current.navigate(
          pendingNavigation.screen,
          pendingNavigation.params,
        );

        setTimeout(() => {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }, 500);
      } catch (error) {
        console.error('[EDIT SCREEN] NAVIGATION ERROR:', error);
        setIsNavigating(false);

        if (retryCount < 3) {
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
        }
      }
    };

    const timer = setTimeout(attemptNavigation, 500);
    return () => clearTimeout(timer);
  }, [
    pendingNavigation,
    navigationRef,
    retryCount,
    isNavigating,
    isNavigationReady,
  ]);

  return null;
};

// Intention Broadcast Listener
const IntentionBroadcastListener = ({navigationRef}) => {
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (navigationRef.current) {
      const unsubscribe = navigationRef.current.addListener('state', () => {
        setIsNavigationReady(true);
      });

      if (navigationRef.current.isReady()) {
        setIsNavigationReady(true);
      }

      return unsubscribe;
    }
  }, [navigationRef]);

  useEffect(() => {
    console.log('[INTENTION] Broadcast listener initialized');

    const intentionListener = DeviceEventEmitter.addListener(
      'OPEN_POMO_TRACKER',
      data => {
        console.log('[INTENTION] RECEIVED OPEN_POMO_TRACKER EVENT');

        try {
          const {planId, taskTitle, taskDescription, startTime, category} =
            data;

          if (!planId || !taskTitle) {
            console.error('[INTENTION] Missing required data!');
            return;
          }

          const navData = {
            task: {
              id: planId,
              title: taskTitle,
              description: taskDescription || '',
              start_time: startTime || '',
              category: category || 'Work and Career',
            },
            selectedDate: new Date().toDateString(),
          };

          setPendingNavigation(navData);
          setRetryCount(0);
          setIsNavigating(false);
        } catch (error) {
          console.error('[INTENTION] ERROR HANDLING BROADCAST:', error);
        }
      },
    );

    return () => intentionListener?.remove();
  }, []);

  useEffect(() => {
    if (!pendingNavigation || isNavigating) {
      return;
    }

    const attemptNavigation = () => {
      if (!navigationRef.current) {
        if (retryCount < 5) {
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }
        return;
      }

      const navReady = navigationRef.current.isReady();
      if (!navReady || !isNavigationReady) {
        if (retryCount < 10) {
          setTimeout(() => setRetryCount(prev => prev + 1), 500);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }
        return;
      }

      try {
        setIsNavigating(true);
        navigationRef.current.navigate('PomoTrackerScreen', pendingNavigation);

        setTimeout(() => {
          setPendingNavigation(null);
          setRetryCount(0);
          setIsNavigating(false);
        }, 500);
      } catch (error) {
        console.error('[INTENTION] NAVIGATION ERROR:', error);
        setIsNavigating(false);

        if (retryCount < 3) {
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        } else {
          setPendingNavigation(null);
          setRetryCount(0);
        }
      }
    };

    const timer = setTimeout(attemptNavigation, 500);
    return () => clearTimeout(timer);
  }, [
    pendingNavigation,
    navigationRef,
    retryCount,
    isNavigating,
    isNavigationReady,
  ]);

  return null;
};

/**
 * Night Mode Scheduler Manager Component - FINAL WORKING VERSION
 * This properly waits for React Navigation to be fully initialized
 */

const NightModeSchedulerManager = ({navigationRef}) => {
  const {user} = useAuth();
  const [isNavReady, setIsNavReady] = useState(false);
  const pendingNavigation = useRef(null);
  const hasInitialized = useRef(false);

  // Track navigation readiness using proper React Navigation method
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // Use the proper isReady() method from React Navigation
      if (navigationRef?.current?.isReady?.()) {
        if (!isNavReady) {
          console.log(
            '✅ [NightModeSchedulerManager] Navigation is NOW ready (via isReady())',
          );
          setIsNavReady(true);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(checkInterval);
  }, [navigationRef, isNavReady]);

  // Execute pending navigation when ready
  useEffect(() => {
    if (isNavReady && pendingNavigation.current) {
      console.log(
        '🚀 [NightModeSchedulerManager] Executing pending navigation',
      );
      const {screen, params} = pendingNavigation.current;

      setTimeout(() => {
        try {
          navigationRef.current.navigate(screen, params);
          console.log(
            '✅ [NightModeSchedulerManager] Navigation executed successfully',
          );
          pendingNavigation.current = null;
        } catch (error) {
          console.error(
            '❌ [NightModeSchedulerManager] Navigation error:',
            error,
          );
        }
      }, 300);
    }
  }, [isNavReady, navigationRef]);

  // Initialize Night Mode Scheduler
  useEffect(() => {
    const initializeScheduler = async () => {
      if (hasInitialized.current || !user?.id || !isNavReady) {
        return;
      }

      try {
        console.log('🌙 [NightModeSchedulerManager] Initializing scheduler');
        await NightModeScheduler.initialize(user.id, navigationRef);
        hasInitialized.current = true;
        console.log('✅ [NightModeSchedulerManager] Scheduler initialized');
      } catch (error) {
        console.error('❌ [NightModeSchedulerManager] Init error:', error);
      }
    };

    setTimeout(initializeScheduler, 2000);
  }, [user?.id, isNavReady, navigationRef]);

  // Listen for Night Mode triggers
  useEffect(() => {
    const handleTrigger = data => {
      console.log(
        '🌙 [NightModeSchedulerManager] TRIGGER_NIGHT_MODE received:',
        data,
      );

      const bedHour = data.bed_hour || 22;
      const bedMinute = data.bed_minute || 0;
      const appWasKilled = data.app_was_killed || false;

      console.log(
        `🌙 Bed: ${bedHour}:${String(bedMinute).padStart(
          2,
          '0',
        )}, Was killed: ${appWasKilled}`,
      );

      const navParams = {
        autoStart: true,
        fromNightModeScheduler: true,
        fromKilledState: appWasKilled,
        bedHour,
        bedMinute,
      };

      // Check if navigation is TRULY ready using isReady()
      if (navigationRef?.current?.isReady?.()) {
        console.log(
          '🚀 [NightModeSchedulerManager] Nav ready - navigating NOW',
        );

        try {
          navigationRef.current.navigate('YouTubeVideosScreen', navParams);
          console.log('✅ [NightModeSchedulerManager] Navigation SUCCESS');
        } catch (error) {
          console.error(
            '❌ [NightModeSchedulerManager] Navigation FAILED:',
            error.message,
          );
          // Store for retry
          pendingNavigation.current = {
            screen: 'YouTubeVideosScreen',
            params: navParams,
          };
        }
      } else {
        console.warn(
          '⚠️ [NightModeSchedulerManager] Nav NOT ready - storing pending',
        );
        pendingNavigation.current = {
          screen: 'YouTubeVideosScreen',
          params: navParams,
        };
      }
    };

    const subscription = DeviceEventEmitter.addListener(
      'TRIGGER_NIGHT_MODE',
      handleTrigger,
    );

    console.log('✅ [NightModeSchedulerManager] Listener registered');

    return () => {
      subscription.remove();
      console.log('🌙 [NightModeSchedulerManager] Listener removed');
    };
  }, [navigationRef]);

  return null;
};

// Main App Content
const AppContent = () => {
  const {user} = useAuth();
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    const initializeServices = async () => {
      if (servicesInitialized) {
        console.log('Services already initialized, skipping...');
        return;
      }

      try {
        console.log('Initializing services...');

        await NotificationService.initialize();
        console.log('NotificationService initialized');

        await NativeAlarmService.initialize();
        console.log('NativeAlarmService initialized');

        await EnhancedTTSService.initialize();
        console.log('EnhancedTTSService initialized');

        await AlarmSchedulerService.initialize();
        console.log('AlarmSchedulerService initialized');

        // Initialize Month Reminder Notification Service
        await MonthReminderNotificationService.initialize();
        console.log('MonthReminderNotificationService initialized');

        AlarmTTSEventHandler.startListening();
        console.log('AlarmTTSEventHandler started');

        setServicesInitialized(true);
        console.log('All services initialized successfully');
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();

    const updateUserProfile = () => {
      if (!user || !user.id) {
        console.log('No valid user for profile update');
        return;
      }

      const userProfile = {
        username:
          user.user_metadata?.username || user.user_metadata?.display_name,
        display_name:
          user.user_metadata?.display_name || user.user_metadata?.full_name,
        email: user.email,
        user_metadata: user.user_metadata,
      };

      try {
        AlarmSchedulerService.setUserProfile(userProfile);
        EnhancedTTSService.setUserProfile(userProfile);
        console.log(
          'User profile set for TTS:',
          userProfile.username || userProfile.display_name,
        );
      } catch (error) {
        console.error('Error setting user profile:', error);
      }
    };

    if (servicesInitialized && user) {
      updateUserProfile();
    }

    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'background') {
        console.log('App went to background');
      } else if (nextAppState === 'active') {
        console.log('App became active');

        setTimeout(() => {
          NativeAlarmService.loadStoredAlarms();
        }, 100);

        setTimeout(() => {
          EnhancedTTSService.cleanup().catch(console.error);
        }, 500);
      }
    };

    const handleNativeAlarmResult = result => {
      console.log('Native alarm action received:', result);
      const {action, alarmId, taskId, snoozeMinutes} = result;

      switch (action) {
        case 'dismissed':
          console.log(`Alarm ${alarmId} dismissed`);
          EnhancedTTSService.stopAudio();
          break;
        case 'snoozed':
          console.log(`Alarm ${alarmId} snoozed for ${snoozeMinutes} minutes`);
          break;
        case 'stopped':
          console.log(`Alarm ${alarmId} stopped`);
          EnhancedTTSService.stopAudio();
          break;
        case 'opened':
          console.log(`Alarm ${alarmId} opened task ${taskId}`);
          break;
        default:
          console.log('Unknown alarm action:', action);
      }
    };

    const handleNotificationAction = async action => {
      console.log('Notification action received:', action);
      const {type, pressAction, notification} = action;

      if (notification?.data?.isBackup === 'true') {
        console.log('Backup notification action:', pressAction?.id);

        switch (pressAction?.id) {
          case 'open_task':
            console.log('Opening task from backup notification');
            break;
          case 'dismiss':
            await NotificationService.cancelNotification(notification.id);
            break;
          case 'open_alarm':
            console.log('Opening alarm from backup notification');
            break;
        }
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    const alarmResultListener = DeviceEventEmitter.addListener(
      'NativeAlarmResult',
      handleNativeAlarmResult,
    );

    NotificationService.setForegroundEventListener?.(handleNotificationAction);
    NotificationService.setBackgroundEventListener?.(handleNotificationAction);

    return () => {
      appStateSubscription?.remove();
      alarmResultListener?.remove();
      AlarmTTSEventHandler.stopListening();
      EnhancedTTSService.cleanup().catch(console.error);
      console.log('App cleanup completed');
    };
  }, [servicesInitialized, user?.id]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        console.log('[NAVIGATION] NavigationContainer is ready');
      }}>
      <SessionProvider>
        <MusicManager />
        <IntentionBroadcastListener navigationRef={navigationRef} />
        <EditScreenListener navigationRef={navigationRef} />
        <AuthNavigator />
        <DailyModalManager />
        <SleepTrackerModalManager />
        <MonthReminderNotificationManager />
        <WaterReminderManager />
        <UsageLimitVideoSyncManager />
        <SessionTrackingManager />
        <NightModeSchedulerManager navigationRef={navigationRef} />
      </SessionProvider>
    </NavigationContainer>
  );
};

// Export test functions
export const testEnhancedAlarmSystem = async () => {
  try {
    console.log('Testing complete enhanced alarm system...');
    const ttsTest = await EnhancedTTSService.testTTS('Demo User');
    console.log('TTS Test Result:', ttsTest);
    const alarmTest = await AlarmSchedulerService.testTTS('Demo User');
    console.log('Alarm Test Result:', alarmTest);
    const hindiTest = await AlarmSchedulerService.testHindiQuotes();
    console.log('Hindi Test Result:', hindiTest);
    const systemInfo = AlarmSchedulerService.getServiceInfo();
    console.log('System Info:', systemInfo);
    return {ttsTest, alarmTest, hindiTest, systemInfo};
  } catch (error) {
    console.error('Error testing enhanced alarm system:', error);
    return null;
  }
};

export const testDailyModalSystem = async userId => {
  try {
    console.log('Testing daily modal system...');
    if (!userId) {
      console.error('Invalid userId provided to testDailyModalSystem:', userId);
      return null;
    }
    await dailyReminderService.resetModalStatus();
    const status = await dailyReminderService.getModalStatus();
    console.log('Modal Status:', status);
    const modalData = await dailyReminderService.checkDailyModal(userId);
    console.log('Modal Data:', modalData);
    return {status, modalData, hasActiveChallenges: modalData !== null};
  } catch (error) {
    console.error('Error testing daily modal system:', error);
    return null;
  }
};

export const testMonthReminderNotification = async () => {
  try {
    console.log('Testing month reminder notification system...');

    // Reset status for testing
    await MonthReminderNotificationService.resetStatus();

    // Get current status
    const status = await MonthReminderNotificationService.getStatus();
    console.log('Month Reminder Status:', status);

    // Test showing notification
    const shown = await MonthReminderNotificationService.showNotification(
      'TestUser',
    );
    console.log('Notification shown:', shown);

    return {
      status,
      shown,
      message: 'Month reminder notification test completed',
    };
  } catch (error) {
    console.error('Error testing month reminder notification:', error);
    return {error: error.message};
  }
};

export const testSessionTrackingSystem = async () => {
  try {
    console.log('Testing session tracking system...');
    if (global.sessionTracking) {
      const result = await global.sessionTracking.testSessionSystem();
      console.log('Session tracking test result:', result);
      return result;
    } else {
      console.error(
        'Session tracking not available. Make sure the app is running.',
      );
      return {error: 'Session tracking not initialized'};
    }
  } catch (error) {
    console.error('Error testing session tracking system:', error);
    return {error: error.message};
  }
};

export const getSessionStats = async () => {
  try {
    if (global.sessionTracking) {
      const stats = await global.sessionTracking.getSessionStats();
      console.log('Current session stats:', stats);
      return stats;
    } else {
      console.error('Session tracking not available.');
      return null;
    }
  } catch (error) {
    console.error('Error getting session stats:', error);
    return null;
  }
};

export const triggerSessionUpload = async () => {
  try {
    if (global.sessionTracking) {
      const result = await global.sessionTracking.triggerBatchUpload();
      console.log('Manual upload result:', result);
      return result;
    } else {
      console.error('Session tracking not available.');
      return {error: 'Session tracking not initialized'};
    }
  } catch (error) {
    console.error('Error triggering session upload:', error);
    return {error: error.message};
  }
};

export const scheduleEnhancedTaskAlarm = async (
  taskData,
  reminderData,
  userProfile,
) => {
  try {
    if (!taskData || !taskData.id) {
      console.error(
        'Invalid task data provided to scheduleEnhancedTaskAlarm:',
        taskData,
      );
      return null;
    }

    const alarmData = {
      id: `enhanced_${taskData.id}_${Date.now()}`,
      taskId: taskData.id,
      taskTitle: taskData.title,
      taskMessage: `Your task "${taskData.title}" is ready`,
      scheduledTime: new Date(reminderData.scheduledTime),
      type: 'alarm',
      taskData: taskData,
      userProfile: userProfile,
      reminderData: reminderData,
    };

    const alarmId = await AlarmSchedulerService.scheduleAlarm(alarmData);

    if (alarmId) {
      console.log(`Enhanced alarm scheduled: ${alarmId}`);
      console.log('Will play English task message + Hindi motivational quote');
    }

    return alarmId;
  } catch (error) {
    console.error('Error scheduling enhanced task alarm:', error);
    return null;
  }
};

// Make month reminder notification service globally accessible for testing
global.testMonthNotification = async () => {
  return await testMonthReminderNotification();
};

global.getMonthNotificationStatus = async () => {
  return await MonthReminderNotificationService.getStatus();
};

global.resetMonthNotification = async () => {
  await MonthReminderNotificationService.resetStatus();
  console.log('Month notification status reset');
};

export default function App() {
  return (
    <AuthProvider>
      <NotesProvider>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </NotesProvider>
    </AuthProvider>
  );
}
