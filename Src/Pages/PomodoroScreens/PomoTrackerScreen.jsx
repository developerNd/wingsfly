import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  AppState,
  NativeModules,
  BackHandler,
} from 'react-native';
import {WP, HP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';
import {useAuth} from '../../contexts/AuthContext';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {taskCompletionsService} from '../../services/api/taskCompletionsService';
import {timerActivityService} from '../../services/api/timerActivityService';
import {getCompletionDateString} from '../../utils/dateUtils';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StopTimerModal from '../../Components/StopTimerModal';
import breakVoiceService from '../../services/breakVoiceService';

import PlayButtonSvg from '../../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';
import TabBarBackgroundSvg from '../../assets/Images/Pomodoro-screen/bottom-bg-section.svg';

// Tab Icons - Normal State
import Tab1NormalSvg from '../../assets/Images/Pomodoro-screen/home-bttn-normal.svg';
import Tab2NormalSvg from '../../assets/Images/Pomodoro-screen/chart-bttn-normal.svg';
import Tab3NormalSvg from '../../assets/Images/Pomodoro-screen/clock-bttn-normal.svg';
import Tab4NormalSvg from '../../assets/Images/Pomodoro-screen/setting-bttn-normal.svg';
import Tab5NormalSvg from '../../assets/Images/Pomodoro-screen/play-bttn-normal.svg';
// Tab Icons - Pressed State
import Tab1PressedSvg from '../../assets/Images/Pomodoro-screen/home-bttn-pressed.svg';
import Tab2PressedSvg from '../../assets/Images/Pomodoro-screen/chart-bttn-press.svg';
import Tab3PressedSvg from '../../assets/Images/Pomodoro-screen/clock-bttn-press.svg';
import Tab4PressedSvg from '../../assets/Images/Pomodoro-screen/setting-bttn-press.svg';
import Tab5PressedSvg from '../../assets/Images/Pomodoro-screen/play-bttn-press.svg';

const {PomodoroModule, YouTubeNightModeModule} = NativeModules;

const PomoTrackerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Get task data from navigation params
  const taskData = route.params?.task;
  const taskId = taskData?.id;
  const selectedDate = route.params?.selectedDate || new Date().toDateString();
  const isTimerTracker = true; // Always true for this screen

  // NEW: Check if coming from BlockTimeScheduler
  const fromBlockTimeAlarm = route.params?.fromBlockTimeAlarm || false;

  // NEW: Lock state for BlockTimeScheduler flow
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false);

  // Core timer state
  const [activeTab, setActiveTab] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [completedBreaks, setCompletedBreaks] = useState(0);
  const [completedShortBreaks, setCompletedShortBreaks] = useState(0);
  const [completedLongBreaks, setCompletedLongBreaks] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(0);
  const [totalShortBreaks, setTotalShortBreaks] = useState(0);
  const [totalLongBreaks, setTotalLongBreaks] = useState(0);
  const [showVoiceTestButton, setShowVoiceTestButton] = useState(false);

  // Timer Tracker cycle tracking
  const [currentCycle, setCurrentCycle] = useState(1);
  const [totalCycles, setTotalCycles] = useState(0);
  const [sessionInCycle, setSessionInCycle] = useState(1);

  // Session management
  const [sessionStructure, setSessionStructure] = useState(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakType, setCurrentBreakType] = useState('short');

  // UI and blocking state
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPomodoroBlocking, setIsPomodoroBlocking] = useState(false);
  const [excludedAppsCount, setExcludedAppsCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [isCompletePressed, setIsCompletePressed] = useState(false);
  const [isStopPressed, setIsStopPressed] = useState(false);
  const [isPlayPausePressed, setIsPlayPausePressed] = useState(false);

  // Animation state and progress tracking
  const [animationProgress, setAnimationProgress] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  // Refs for stable timer management
  const timerRef = useRef(null);
  const backgroundTimeRef = useRef(null);
  const lastSaveRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const initializationRef = useRef(false);
  const isLoadingStateRef = useRef(false);
  const blockingTimeoutRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const sessionCompletionRef = useRef(false);
  const continuousSaveRef = useRef(null);

  // Animation refs for controlling Lottie animations
  const timerAnimationRef = useRef(null);
  const flowerAnimationRef = useRef(null);
  const animationProgressRef = useRef(0);

  // ADD this helper function
  const isPlanYourDayTask = useCallback(() => {
    // Use the isPlan flag passed from navigation
    const isPlan = route.params?.isPlan === true;

    console.log('🔍 Checking if Plan Your Day task:', {
      title: taskData?.title,
      type: taskData?.type,
      isPlanFlag: route.params?.isPlan,
      isPlan,
    });

    return isPlan;
  }, [taskData, route.params]);

  const completionDate = React.useMemo(() => {
    return getCompletionDateString(selectedDate);
  }, [selectedDate]);

  // Timer Tracker default settings
  const getTimerTrackerSettings = useCallback(() => {
    return {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15,
      focusSessionsPerRound: 4,
      autoStartShortBreaks: true,
      autoStartFocusSessions: false,
    };
  }, []);

  // NEW: Enable lock for BlockTimeScheduler flow
  useEffect(() => {
    let mounted = true;

    const enableLock = async () => {
      if (fromBlockTimeAlarm && YouTubeNightModeModule) {
        try {
          console.log('🔒 [BlockTime] Enabling Kiosk Lock...');
          await YouTubeNightModeModule.enableKioskLock();
          if (mounted) {
            setIsLocked(true);
            isLockedRef.current = true;
            console.log('✅ [BlockTime] Lock enabled successfully');
          }
        } catch (error) {
          console.error('❌ [BlockTime] Error enabling lock:', error);
          Alert.alert(
            'Lock Error',
            'Could not enable lock mode. Please check permissions.',
            [{text: 'OK'}],
          );
        }
      }
    };

    enableLock();

    return () => {
      mounted = false;
      // Cleanup lock on unmount
      if (isLockedRef.current && YouTubeNightModeModule) {
        console.log('🔓 [BlockTime] Disabling lock on unmount...');
        YouTubeNightModeModule.disableKioskLock()
          .then(() => console.log('✅ [BlockTime] Lock disabled'))
          .catch(err =>
            console.error('❌ [BlockTime] Error disabling lock:', err),
          );
      }
    };
  }, [fromBlockTimeAlarm]);

  // NEW: Block hardware back button ONLY when locked (BlockTime flow)
  useEffect(() => {
    if (!isLocked || !fromBlockTimeAlarm) return; // Only block if locked AND from BlockTime

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🚫 [BlockTime] Back button blocked - screen is locked');
        return true; // Block back button
      },
    );

    return () => backHandler.remove();
  }, [isLocked, fromBlockTimeAlarm]); // Added fromBlockTimeAlarm dependency

  // Get play/pause button icon based on state
  const getPlayPauseButtonIcon = () => {
    if (isTransitioning || isStopping) {
      return 'hourglass-empty';
    }
    return isRunning ? 'pause' : 'play-arrow';
  };

  // Get button color based on state
  const getButtonColor = () => {
    if (isTransitioning || isStopping) {
      return '#CCCCCC';
    }
    return colors.White;
  };

  const updateAnimationProgress = useCallback(() => {
    if (targetTime <= 0) {
      setAnimationProgress(0);
      animationProgressRef.current = 0;
      return;
    }

    const timerProgress = Math.min(Math.max(currentTime / targetTime, 0), 1);
    const animationProgress = timerProgress * 0.83;

    setAnimationProgress(animationProgress);
    animationProgressRef.current = animationProgress;

    console.log('Animation progress updated:', {
      currentTime,
      targetTime,
      progress: Math.round(timerProgress * 100) + '%',
      animationFrame: Math.round(animationProgress * 100) + '%',
    });
  }, [currentTime, targetTime]);

  const resetAnimationsForNewSession = useCallback(() => {
    setAnimationProgress(0);
    animationProgressRef.current = 0;
    setSessionStartTime(Date.now());
    console.log('Animations reset for new session');
  }, []);

  // Calculate Timer Tracker unlimited session structure
  const calculateTimerTrackerStructure = useCallback(() => {
    const settings = getTimerTrackerSettings();
    const focusMinutes = settings.focusTime;
    const shortBreakMinutes = settings.shortBreak;
    const longBreakMinutes = settings.longBreak;
    const focusSessionsPerRound = settings.focusSessionsPerRound;

    let sessions = [];
    let sessionId = 1;

    for (let i = 1; i <= focusSessionsPerRound; i++) {
      sessions.push({
        type: 'focus',
        number: i,
        duration: focusMinutes,
        id: `focus_${sessionId}`,
        cyclePosition: i,
      });
      sessionId++;

      if (i < focusSessionsPerRound) {
        sessions.push({
          type: 'break',
          subType: 'short',
          duration: shortBreakMinutes,
          number: i,
          id: `break_${sessionId}_short`,
          cyclePosition: i,
        });
      } else {
        sessions.push({
          type: 'break',
          subType: 'long',
          duration: longBreakMinutes,
          number: 1,
          id: `break_${sessionId}_long`,
          cyclePosition: i,
        });
      }
      sessionId++;
    }

    const focusSessions = sessions.filter(s => s.type === 'focus');
    const shortBreaks = sessions.filter(
      s => s.type === 'break' && s.subType === 'short',
    );
    const longBreaks = sessions.filter(
      s => s.type === 'break' && s.subType === 'long',
    );

    console.log('Timer Tracker structure calculated:', {
      totalSessions: sessions.length,
      focusSessions: focusSessions.length,
      shortBreaks: shortBreaks.length,
      longBreaks: longBreaks.length,
    });

    return {
      sessions: sessions,
      totalFocusSessions: focusSessionsPerRound,
      totalShortBreaks: focusSessionsPerRound - 1,
      totalLongBreaks: 1,
      totalBreaks: focusSessionsPerRound,
      focusMinutes: focusMinutes,
      shortBreakMinutes: shortBreakMinutes,
      longBreakMinutes: longBreakMinutes,
      focusSessionsPerRound: focusSessionsPerRound,
      usedMinutes: sessions.reduce((sum, session) => sum + session.duration, 0),
      isUnlimited: true,
    };
  }, [getTimerTrackerSettings]);

  // Load existing timer completion
  const loadTimerCompletion = useCallback(async () => {
    if (!user || !taskData || !completionDate) {
      return null;
    }
    try {
      const completion = await taskCompletionsService.getTaskCompletion(
        taskData.id,
        user.id,
        completionDate,
      );
      console.log('Loaded completion data:', completion);
      return completion;
    } catch (error) {
      console.error('Error loading completion:', error);
      return null;
    }
  }, [user, taskData, completionDate]);

  // Enhanced save function
  const saveTimerCompletion = useCallback(
    async (
      totalCompletedSeconds,
      isSessionCompleted = false,
      sessionType = null,
      forceImmediate = false,
      updatedCounters = null,
    ) => {
      if (!taskId || !user) {
        console.log('Missing taskId or user for saving completion');
        return;
      }

      // Check if sessionStructure exists - if not, we can still save basic data
      if (!sessionStructure) {
        console.log('No session structure available, skipping detailed save');
        return;
      }

      const now = Date.now();
      const saveInterval = forceImmediate ? 0 : isRunning ? 1000 : 5000;
      if (
        !isSessionCompleted &&
        !forceImmediate &&
        now - lastSaveRef.current < saveInterval
      )
        return;
      lastSaveRef.current = now;

      try {
        const currentCompletedPomodoros =
          updatedCounters?.completedPomodoros ?? completedPomodoros;
        const currentCompletedBreaks =
          updatedCounters?.completedBreaks ?? completedBreaks;
        const currentCompletedShortBreaks =
          updatedCounters?.completedShortBreaks ?? completedShortBreaks;
        const currentCompletedLongBreaks =
          updatedCounters?.completedLongBreaks ?? completedLongBreaks;

        const actualSessionIndex =
          (currentCycle - 1) * sessionStructure.sessions.length +
          currentSessionIndex;
        const currentSession = sessionStructure.sessions[currentSessionIndex];

        const sessionCompletions = {};

        for (let cycle = 1; cycle < currentCycle; cycle++) {
          sessionStructure.sessions.forEach((session, index) => {
            const sessionKey = `cycle_${cycle}_session_${index}`;
            sessionCompletions[sessionKey] = {
              type: session.type,
              subType: session.subType,
              duration: session.duration,
              completed: true,
              completedAt: now,
              cycle: cycle,
              sessionInCycle: index,
            };
          });
        }

        for (let i = 0; i < currentSessionIndex; i++) {
          const session = sessionStructure.sessions[i];
          const sessionKey = `cycle_${currentCycle}_session_${i}`;
          sessionCompletions[sessionKey] = {
            type: session.type,
            subType: session.subType,
            duration: session.duration,
            completed: true,
            completedAt: now,
            cycle: currentCycle,
            sessionInCycle: i,
          };
        }

        if (isSessionCompleted && currentSession) {
          const sessionKey = `cycle_${currentCycle}_session_${currentSessionIndex}`;
          sessionCompletions[sessionKey] = {
            type: currentSession.type,
            subType: currentSession.subType,
            duration: currentSession.duration,
            completed: true,
            completedAt: now,
            cycle: currentCycle,
            sessionInCycle: currentSessionIndex,
          };
        }

        const timerValueData = {
          totalSeconds: totalCompletedSeconds,
          completedPomodoros: currentCompletedPomodoros,
          completedBreaks: currentCompletedBreaks,
          completedShortBreaks: currentCompletedShortBreaks,
          completedLongBreaks: currentCompletedLongBreaks,
          totalPomodoros: totalPomodoros,
          totalBreaks: totalBreaks,
          totalShortBreaks: totalShortBreaks,
          totalLongBreaks: totalLongBreaks,
          currentSessionIndex: currentSessionIndex,
          currentTime: currentTime,
          targetTime: targetTime,
          isOnBreak: isOnBreak,
          currentBreakType: currentBreakType,
          sessionStructure: sessionStructure,
          sessionCompletions: sessionCompletions,
          completionDate: completionDate,
          lastUpdateTime: now,
          lastSessionType: sessionType,
          isSessionCompleted: isSessionCompleted,
          actualCompletedTime: totalCompletedSeconds,
          completedFocusSessions: currentCompletedPomodoros,
          isFullyCompleted: false, // Timer Tracker never fully completes automatically
          currentSessionType: currentSession?.type || 'focus',
          currentSessionSubType: currentSession?.subType || null,
          animationProgress: animationProgressRef.current,
          sessionStartTime: sessionStartTime,
          isTimerTracker: isTimerTracker,
          currentCycle: currentCycle,
          totalCycles: totalCycles,
          sessionInCycle: sessionInCycle,
        };

        console.log('Saving timer completion:', {
          isTimerTracker,
          currentCycle,
          sessionInCycle,
          isSessionCompleted,
          sessionType,
          currentSessionIndex,
          completedPomodoros: currentCompletedPomodoros,
          completedBreaks: currentCompletedBreaks,
          forceImmediate,
        });

        await taskCompletionsService.upsertTimerCompletion(
          taskId,
          user.id,
          completionDate,
          timerValueData,
          false, // Timer Tracker never marks as completed automatically
        );

        console.log('Timer completion saved successfully');
      } catch (error) {
        console.error('Error saving timer completion:', error);
      }
    },
    [
      taskId,
      user,
      completionDate,
      completedPomodoros,
      completedBreaks,
      completedShortBreaks,
      completedLongBreaks,
      totalPomodoros,
      totalBreaks,
      totalShortBreaks,
      totalLongBreaks,
      currentSessionIndex,
      currentTime,
      targetTime,
      isOnBreak,
      currentBreakType,
      sessionStructure,
      isRunning,
      sessionStartTime,
      isTimerTracker,
      currentCycle,
      totalCycles,
      sessionInCycle,
    ],
  );

  // Calculate total completed time
  const getTotalCompletedTime = useCallback(() => {
    // Handle case where sessionStructure is null or undefined
    if (!sessionStructure || !sessionStructure.sessions) {
      console.log(
        'No session structure available, returning current time only:',
        currentTime,
      );
      return currentTime;
    }

    try {
      const completedCyclesTime =
        (currentCycle - 1) * sessionStructure.usedMinutes * 60;
      const currentCycleCompletedTime = sessionStructure.sessions
        .slice(0, currentSessionIndex)
        .reduce((sum, session) => sum + Math.floor(session.duration * 60), 0);

      const completedSessionsTime =
        completedCyclesTime + currentCycleCompletedTime;
      const currentSessionTime = currentTime;
      const totalTime = completedSessionsTime + currentSessionTime;

      console.log('Total time calculation:', {
        currentCycle,
        completedSessionsTime,
        currentSessionTime,
        totalTime,
        currentSessionIndex,
      });

      return totalTime;
    } catch (error) {
      console.error('Error calculating total completed time:', error);
      // Fallback to current time if calculation fails
      return currentTime;
    }
  }, [sessionStructure, currentSessionIndex, currentTime, currentCycle]);

  // Reset all timer state to initial values
  const resetTimerState = useCallback(() => {
    console.log('Resetting all timer state');

    // Clear all timers and intervals
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (continuousSaveRef.current) {
      clearInterval(continuousSaveRef.current);
      continuousSaveRef.current = null;
    }
    if (blockingTimeoutRef.current) {
      clearTimeout(blockingTimeoutRef.current);
      blockingTimeoutRef.current = null;
    }

    // Reset timer states
    setIsRunning(false);
    setCurrentTime(0);
    setCurrentSessionIndex(0);
    setCurrentCycle(1);
    setSessionInCycle(1);
    setCompletedPomodoros(0);
    setCompletedBreaks(0);
    setCompletedShortBreaks(0);
    setCompletedLongBreaks(0);
    setIsOnBreak(false);
    setCurrentBreakType('short');
    setIsTransitioning(false);
    setIsStopping(false);

    // Reset animation states
    setAnimationProgress(0);
    animationProgressRef.current = 0;

    // Reset refs
    backgroundTimeRef.current = null;
    sessionCompletionRef.current = false;
    lastTickRef.current = Date.now();
    initializationRef.current = false;

    console.log('Timer state reset completed');
  }, []);

  // NEW: Function to clear stopped state when user restarts
  const clearStoppedState = useCallback(async () => {
    if (!taskId || !user || !completionDate) {
      console.log('Cannot clear stopped state - missing required data');
      return;
    }

    try {
      console.log('Clearing stopped state from previous session');

      // Check if there's existing completion data with stopped state
      const existingCompletion = await taskCompletionsService.getTaskCompletion(
        taskId,
        user.id,
        completionDate,
      );

      if (
        existingCompletion?.timer_value &&
        (existingCompletion.timer_value.wasStopped ||
          existingCompletion.timer_value.wasReset)
      ) {
        console.log('Found stopped state, deleting completion data');

        // Delete the stopped state completion to allow fresh start
        await taskCompletionsService.deleteTaskCompletion(
          taskId,
          user.id,
          completionDate,
        );

        console.log('Previous stopped state cleared successfully');
        return true; // Indicate that state was cleared
      } else {
        console.log('No stopped state found to clear');
        return false; // No stopped state to clear
      }
    } catch (error) {
      console.error('Error clearing stopped state:', error);
      return false;
    }
  }, [taskId, user, completionDate]);

  // ADD this useEffect
  useEffect(() => {
    breakVoiceService.initialize();

    return () => {
      breakVoiceService.cleanup();
    };
  }, []);

  // Initialize session structure
  useEffect(() => {
    const initializeSessionStructure = async () => {
      if (!taskData) {
        console.log('No task data available for session structure');
        return;
      }

      const structure = calculateTimerTrackerStructure();
      console.log('Session structure created:', structure);
      setSessionStructure(structure);

      setTotalPomodoros(structure.totalFocusSessions);
      setTotalBreaks(structure.totalBreaks);
      setTotalShortBreaks(structure.totalShortBreaks);
      setTotalLongBreaks(structure.totalLongBreaks);
      setCurrentCycle(1);
      setSessionInCycle(1);
      setTotalCycles(1);

      const existingCompletion = await loadTimerCompletion();

      // SIMPLIFIED: Only clear explicitly stopped states, preserve paused sessions
      if (
        existingCompletion?.timer_value &&
        (existingCompletion.timer_value.wasStopped ||
          existingCompletion.timer_value.wasReset)
      ) {
        console.log('Found stopped state, clearing and starting fresh');

        // Clear the stopped state
        try {
          await taskCompletionsService.deleteTaskCompletion(
            taskData.id,
            user.id,
            completionDate,
          );
          console.log('Stopped state cleared successfully');
        } catch (error) {
          console.error('Error clearing stopped state:', error);
        }

        // Initialize fresh session
        const firstSession = structure.sessions[0];
        const sessionDuration = Math.floor(firstSession.duration * 60);
        console.log(
          'Initializing FRESH session after clearing stopped state:',
          firstSession,
          'duration:',
          sessionDuration,
        );

        setTargetTime(sessionDuration);
        setIsOnBreak(firstSession.type === 'break');
        setCurrentBreakType(firstSession.subType || 'short');
        setCurrentSessionIndex(0);
        setCurrentTime(0);
        setAnimationProgress(0);
        setSessionStartTime(Date.now());
        animationProgressRef.current = 0;
        setSessionInCycle(1);
        setCompletedPomodoros(0);
        setCompletedBreaks(0);
        setCompletedShortBreaks(0);
        setCompletedLongBreaks(0);

        initializationRef.current = true;
        return;
      }

      if (existingCompletion?.timer_value && !existingCompletion.is_completed) {
        const timerData = existingCompletion.timer_value;
        console.log('RESTORING STATE from database:', timerData);

        if (timerData.currentSessionIndex !== undefined) {
          setCurrentSessionIndex(timerData.currentSessionIndex);
        }
        if (timerData.currentTime !== undefined) {
          setCurrentTime(timerData.currentTime);
        }
        if (timerData.targetTime !== undefined) {
          setTargetTime(timerData.targetTime);
        }
        if (timerData.completedPomodoros !== undefined) {
          setCompletedPomodoros(timerData.completedPomodoros);
        }
        if (timerData.completedBreaks !== undefined) {
          setCompletedBreaks(timerData.completedBreaks);
        }
        if (timerData.completedShortBreaks !== undefined) {
          setCompletedShortBreaks(timerData.completedShortBreaks);
        }
        if (timerData.completedLongBreaks !== undefined) {
          setCompletedLongBreaks(timerData.completedLongBreaks);
        }
        if (timerData.isOnBreak !== undefined) {
          setIsOnBreak(timerData.isOnBreak);
        }
        if (timerData.currentBreakType !== undefined) {
          setCurrentBreakType(timerData.currentBreakType);
        }
        if (timerData.currentCycle !== undefined) {
          setCurrentCycle(timerData.currentCycle);
        }
        if (timerData.totalCycles !== undefined) {
          setTotalCycles(timerData.totalCycles);
        }
        if (timerData.sessionInCycle !== undefined) {
          setSessionInCycle(timerData.sessionInCycle);
        }
        if (timerData.animationProgress !== undefined) {
          setAnimationProgress(timerData.animationProgress);
          animationProgressRef.current = timerData.animationProgress;
        }
        if (timerData.sessionStartTime !== undefined) {
          setSessionStartTime(timerData.sessionStartTime);
        }

        initializationRef.current = true;
      } else {
        if (structure.sessions && structure.sessions.length > 0) {
          const firstSession = structure.sessions[0];
          const sessionDuration = Math.floor(firstSession.duration * 60);
          console.log(
            'Initializing NEW session:',
            firstSession,
            'duration:',
            sessionDuration,
          );

          setTargetTime(sessionDuration);
          setIsOnBreak(firstSession.type === 'break');
          setCurrentBreakType(firstSession.subType || 'short');
          setCurrentSessionIndex(0);
          setCurrentTime(0);
          setAnimationProgress(0);
          setSessionStartTime(Date.now());
          animationProgressRef.current = 0;
          setSessionInCycle(1);

          initializationRef.current = true;
        }
      }
    };

    initializeSessionStructure();
  }, [
    taskData,
    calculateTimerTrackerStructure,
    loadTimerCompletion,
    user,
    completionDate,
  ]);

  // Update animations when currentTime or targetTime changes
  useEffect(() => {
    updateAnimationProgress();
  }, [currentTime, targetTime, updateAnimationProgress]);

  // CORE TIMER with better completion handling
  useEffect(() => {
    let intervalId = null;

    if (isRunning && !isTransitioning && targetTime > 0 && !isStopping) {
      console.log(
        'Starting timer - currentTime:',
        currentTime,
        'targetTime:',
        targetTime,
      );
      lastTickRef.current = Date.now();

      intervalId = setInterval(() => {
        const now = Date.now();
        const timeSinceLastTick = now - lastTickRef.current;

        if (timeSinceLastTick >= 900) {
          lastTickRef.current = now;

          setCurrentTime(prevTime => {
            const newTime = prevTime + 1;
            console.log(
              'Timer tick:',
              prevTime,
              '->',
              newTime,
              'target:',
              targetTime,
            );

            if (newTime >= targetTime && !sessionCompletionRef.current) {
              console.log('Session completed in timer tick');
              sessionCompletionRef.current = true;

              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }

              setTimeout(() => {
                handleSessionCompletion();
              }, 50);

              return targetTime;
            }

            return newTime;
          });
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, isTransitioning, targetTime, isStopping]);

  // Continuous save every second when running
  useEffect(() => {
    if (continuousSaveRef.current) {
      clearInterval(continuousSaveRef.current);
      continuousSaveRef.current = null;
    }

    if (isRunning && currentTime >= 0 && !isStopping) {
      continuousSaveRef.current = setInterval(() => {
        const totalTime = getTotalCompletedTime();
        saveTimerCompletion(totalTime, false, null, false);
      }, 1000);
    }

    return () => {
      if (continuousSaveRef.current) {
        clearInterval(continuousSaveRef.current);
        continuousSaveRef.current = null;
      }
    };
  }, [
    isRunning,
    currentTime,
    getTotalCompletedTime,
    saveTimerCompletion,
    isStopping,
  ]);

  // ADD this function
  const handleVoiceTest = useCallback(async breakType => {
    console.log(`Testing ${breakType} break voice command`);
    try {
      await breakVoiceService.testBreakVoice(breakType);
      Alert.alert('Success', `${breakType} break voice test completed!`);
    } catch (error) {
      console.error('Voice test error:', error);
      Alert.alert('Error', 'Failed to test voice command');
    }
  }, []);

  // Enhanced session completion handling
  const handleSessionCompletion = useCallback(async () => {
    if (!sessionStructure || isTransitioning || !sessionCompletionRef.current) {
      console.log('Cannot complete session - conditions not met');
      return;
    }

    console.log('Handling session completion for Timer Tracker');
    setAnimationProgress(1.0);
    animationProgressRef.current = 1.0;

    setIsRunning(false);
    setIsTransitioning(true);

    const currentSession = sessionStructure.sessions[currentSessionIndex];
    const nextSessionIndex = currentSessionIndex + 1;
    const pomodoroSettings = getTimerTrackerSettings();

    const completedCyclesTime =
      (currentCycle - 1) * sessionStructure.usedMinutes * 60;
    const currentCycleCompletedTime = sessionStructure.sessions
      .slice(0, currentSessionIndex)
      .reduce((sum, session) => sum + Math.floor(session.duration * 60), 0);
    const completedSessionsTime =
      completedCyclesTime + currentCycleCompletedTime;

    const currentSessionFullTime = Math.floor(currentSession.duration * 60);
    const totalTimeWithCurrentSession =
      completedSessionsTime + currentSessionFullTime;

    let newCompletedPomodoros = completedPomodoros;
    let newCompletedBreaks = completedBreaks;
    let newCompletedShortBreaks = completedShortBreaks;
    let newCompletedLongBreaks = completedLongBreaks;

    if (currentSession.type === 'focus') {
      newCompletedPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(newCompletedPomodoros);
    } else if (currentSession.type === 'break') {
      newCompletedBreaks = completedBreaks + 1;
      setCompletedBreaks(newCompletedBreaks);

      if (currentSession.subType === 'long') {
        newCompletedLongBreaks = completedLongBreaks + 1;
        setCompletedLongBreaks(newCompletedLongBreaks);
      } else {
        newCompletedShortBreaks = completedShortBreaks + 1;
        setCompletedShortBreaks(newCompletedShortBreaks);
      }
    }

    // Check for cycle completion
    if (nextSessionIndex >= sessionStructure.sessions.length) {
      console.log('Timer Tracker cycle completed! Starting new cycle...');

      const newCurrentCycle = currentCycle + 1;
      const newTotalCycles = Math.max(totalCycles, newCurrentCycle);
      setCurrentCycle(newCurrentCycle);
      setTotalCycles(newTotalCycles);

      setCurrentSessionIndex(0);
      setSessionInCycle(1);

      const firstSessionNewCycle = sessionStructure.sessions[0];
      setCurrentTime(0);
      setTargetTime(Math.floor(firstSessionNewCycle.duration * 60));
      setIsOnBreak(firstSessionNewCycle.type === 'break');
      setCurrentBreakType(firstSessionNewCycle.subType || 'short');

      resetAnimationsForNewSession();

      await saveTimerCompletion(
        totalTimeWithCurrentSession,
        true,
        currentSession.type,
        true,
        {
          completedPomodoros: newCompletedPomodoros,
          completedBreaks: newCompletedBreaks,
          completedShortBreaks: newCompletedShortBreaks,
          completedLongBreaks: newCompletedLongBreaks,
        },
      );

      sessionCompletionRef.current = false;

      setTimeout(() => {
        setIsTransitioning(false);

        // ADD THIS - uses firstSessionNewCycle variable
        if (isPlanYourDayTask() && firstSessionNewCycle.type === 'break') {
          const breakType = firstSessionNewCycle.subType || 'short';
          console.log(
            `Starting ${breakType} break in new cycle - playing voice`,
          );

          breakVoiceService
            .playBreakVoice(breakType)
            .then(() => console.log('Break voice played'))
            .catch(error => console.error('Break voice failed:', error));
        }

        const shouldAutoStart =
          firstSessionNewCycle.type === 'break'
            ? pomodoroSettings.autoStartShortBreaks
            : pomodoroSettings.autoStartFocusSessions;

        if (shouldAutoStart) {
          console.log('Auto-starting new cycle first session');
          setIsRunning(true);
        }
      }, 2000);

      return;
    }

    // Setup next session within cycle
    const nextSession = sessionStructure.sessions[nextSessionIndex];
    console.log('Setting up next session:', nextSession);

    setCurrentSessionIndex(nextSessionIndex);
    setCurrentTime(0);
    setTargetTime(Math.floor(nextSession.duration * 60));
    setIsOnBreak(nextSession.type === 'break');
    setCurrentBreakType(nextSession.subType || 'short');
    setSessionInCycle(nextSessionIndex + 1);

    resetAnimationsForNewSession();

    await saveTimerCompletion(
      totalTimeWithCurrentSession,
      true,
      currentSession.type,
      true,
      {
        completedPomodoros: newCompletedPomodoros,
        completedBreaks: newCompletedBreaks,
        completedShortBreaks: newCompletedShortBreaks,
        completedLongBreaks: newCompletedLongBreaks,
      },
    );

    sessionCompletionRef.current = false;

    setTimeout(() => {
      setIsTransitioning(false);

      // ADD THIS - uses nextSession variable
      if (isPlanYourDayTask() && nextSession.type === 'break') {
        const breakType = nextSession.subType || 'short';
        console.log(`Starting ${breakType} break - playing voice`);

        breakVoiceService
          .playBreakVoice(breakType)
          .then(() => console.log('Break voice played'))
          .catch(error => console.error('Break voice failed:', error));
      }

      const shouldAutoStart =
        nextSession.type === 'break'
          ? pomodoroSettings.autoStartShortBreaks
          : pomodoroSettings.autoStartFocusSessions;

      if (shouldAutoStart) {
        console.log('Auto-starting next session');
        setIsRunning(true);
      }
    }, 2000);
  }, [
    sessionStructure,
    currentSessionIndex,
    isTransitioning,
    completedPomodoros,
    completedBreaks,
    completedShortBreaks,
    completedLongBreaks,
    getTimerTrackerSettings,
    saveTimerCompletion,
    sessionStartTime,
    resetAnimationsForNewSession,
    currentCycle,
    totalCycles,
    isPlanYourDayTask,
  ]);

  // Pomodoro blocking management
  const managePomodoroBlocking = useCallback(async shouldBlock => {
    if (!PomodoroModule) return;

    try {
      if (shouldBlock) {
        await PomodoroModule.startPomodoroBlocking();
        setIsPomodoroBlocking(true);
        console.log('Pomodoro blocking started');
      } else {
        await PomodoroModule.stopPomodoroBlocking();
        setIsPomodoroBlocking(false);
        console.log('Pomodoro blocking stopped');
      }
    } catch (error) {
      console.error('Error managing Pomodoro blocking:', error);
    }
  }, []);

  // Blocking status check
  const checkPomodoroStatus = useCallback(async () => {
    if (!PomodoroModule) return;

    try {
      const isBlocking = await PomodoroModule.isPomodoroBlocking();
      setIsPomodoroBlocking(isBlocking);
      const state = await PomodoroModule.getPomodoroState();
      setExcludedAppsCount(state?.excludedAppsCount || 0);
    } catch (error) {
      console.error('Error checking Pomodoro status:', error);
    }
  }, []);

  // Blocking control - UPDATED to handle both flows
  useEffect(() => {
    if (!isLoaded || targetTime === 0) return;

    if (blockingTimeoutRef.current) {
      clearTimeout(blockingTimeoutRef.current);
      blockingTimeoutRef.current = null;
    }

    blockingTimeoutRef.current = setTimeout(() => {
      if (fromBlockTimeAlarm) {
        // BlockTime flow: Kiosk lock is active, skip Pomodoro blocking
        console.log(
          '🔒 [BlockTime] Kiosk lock active - skipping Pomodoro blocking',
        );
        return;
      }

      // Normal flow: Use Pomodoro blocking
      const shouldBlock =
        isRunning && !isOnBreak && !isTransitioning && !isStopping;
      managePomodoroBlocking(shouldBlock);
    }, 500);

    return () => {
      if (blockingTimeoutRef.current) {
        clearTimeout(blockingTimeoutRef.current);
        blockingTimeoutRef.current = null;
      }
    };
  }, [
    isRunning,
    isOnBreak,
    isTransitioning,
    isLoaded,
    targetTime,
    managePomodoroBlocking,
    isStopping,
    fromBlockTimeAlarm, // NEW: Added this dependency
  ]);

  // Background time handling
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      const now = Date.now();

      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        if (isRunning && !isStopping) {
          backgroundTimeRef.current = now;
          console.log(
            'App went to background at:',
            new Date(now).toISOString(),
          );
        }
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (isRunning && backgroundTimeRef.current && !isStopping) {
          const elapsed = Math.floor((now - backgroundTimeRef.current) / 1000);
          console.log(
            'App returned from background. Elapsed seconds:',
            elapsed,
          );

          if (elapsed > 0 && elapsed < 3600) {
            setCurrentTime(prevTime => {
              const newTime = Math.min(prevTime + elapsed, targetTime);
              console.log(
                'Background sync - timer from',
                prevTime,
                'to',
                newTime,
                'target:',
                targetTime,
              );

              if (
                newTime >= targetTime &&
                targetTime > 0 &&
                !sessionCompletionRef.current
              ) {
                console.log('Session completed while in background');
                sessionCompletionRef.current = true;
                setTimeout(() => {
                  handleSessionCompletion();
                }, 100);
              }

              return newTime;
            });
          }
          backgroundTimeRef.current = null;
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [isRunning, targetTime, handleSessionCompletion, isStopping]);

  // Load state on focus
  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        console.log('Screen focused, checking if already loaded...');

        if (isLoadingStateRef.current || isLoaded) {
          console.log('Already loading or loaded, skipping');
          return;
        }

        isLoadingStateRef.current = true;
        backgroundTimeRef.current = null;
        sessionCompletionRef.current = false;

        if (!taskData) {
          console.error('No task data available');
          Alert.alert(
            'Error',
            'No task data available. Please go back and select a task.',
          );
          isLoadingStateRef.current = false;
          return;
        }

        // SIMPLIFIED: Only clear explicitly stopped states on focus
        try {
          const wasCleared = await clearStoppedState();
          if (wasCleared) {
            console.log('Stopped state was cleared on screen focus');
          }
        } catch (error) {
          console.error('Error clearing stopped state on focus:', error);
        }

        setIsLoaded(true);
        isLoadingStateRef.current = false;
      };

      initializeScreen();
      checkPomodoroStatus();
    }, [
      completionDate,
      loadTimerCompletion,
      checkPomodoroStatus,
      taskData,
      isLoaded,
      clearStoppedState,
    ]),
  );

  // Update your handlePlayPause function to include activity tracking
  const handlePlayPause = useCallback(async () => {
    console.log('Play/Pause clicked, current state:', {
      isRunning,
      targetTime,
      isLoaded,
      sessionStructure: !!sessionStructure,
      taskData: !!taskData,
      isStopping,
    });

    if (isStopping) {
      Alert.alert(
        'Please Wait',
        'Timer is currently stopping. Please wait a moment.',
      );
      return;
    }

    if (!taskData) {
      Alert.alert(
        'Error',
        'No task data available. Please go back and select a task.',
      );
      return;
    }

    if (!sessionStructure) {
      Alert.alert(
        'Error',
        'Session structure not initialized. Please wait a moment and try again.',
      );
      return;
    }

    if (targetTime === 0) {
      console.error('Timer not initialized properly');
      Alert.alert('Error', 'Timer not initialized. Please restart the screen.');
      return;
    }

    if (!isLoaded) {
      Alert.alert(
        'Please Wait',
        'Timer is still loading. Please wait a moment.',
      );
      return;
    }

    // Check if we're restarting from a stopped state
    const completion = await loadTimerCompletion();
    const wasStoppedPreviously =
      completion?.timer_value &&
      (completion.timer_value.wasStopped || completion.timer_value.wasReset);

    if (wasStoppedPreviously && !isRunning) {
      console.log('Restarting from stopped state - clearing previous data');
      await clearStoppedState();
    }

    // Prepare session data for tracking
    const sessionData = {
      currentTime,
      targetTime,
      currentCycle,
      sessionInCycle,
      isOnBreak,
      currentBreakType,
      completedPomodoros,
      completedBreaks,
      completedShortBreaks,
      completedLongBreaks,
      totalCompletedTime: getTotalCompletedTime(),
    };

    if (isRunning) {
      // Pause the timer
      setIsRunning(false);
      console.log('Timer paused');

      // TRACK PAUSE ACTIVITY
      try {
        await timerActivityService.trackPause(taskId, user.id, sessionData);
      } catch (error) {
        console.error('Failed to track pause activity:', error);
      }

      const totalTime = getTotalCompletedTime();
      saveTimerCompletion(totalTime, false, null, true);
    } else {
      // Start the timer
      setIsRunning(true);
      console.log('Timer started');

      // TRACK PLAY ACTIVITY
      try {
        await timerActivityService.trackPlay(taskId, user.id, sessionData);
      } catch (error) {
        console.error('Failed to track play activity:', error);
      }
    }
  }, [
    isRunning,
    targetTime,
    isLoaded,
    sessionStructure,
    taskData,
    isStopping,
    getTotalCompletedTime,
    saveTimerCompletion,
    loadTimerCompletion,
    clearStoppedState,
    // Add the new dependencies
    taskId,
    user,
    currentTime,
    currentCycle,
    sessionInCycle,
    isOnBreak,
    currentBreakType,
    completedPomodoros,
    completedBreaks,
    completedShortBreaks,
    completedLongBreaks,
  ]);

  // Handle stop - Enhanced stop functionality with custom modal
  const handleStop = useCallback(async () => {
    console.log('Stop button clicked - showing confirmation modal');

    // Prevent multiple stop operations
    if (isStopping) {
      console.log('Already stopping, ignoring duplicate stop request');
      return;
    }

    // Show custom modal instead of Alert
    setShowStopModal(true);
  }, [isStopping]);

  // Handle modal cancel
  const handleStopCancel = useCallback(() => {
    console.log('Stop cancelled by user');
    setShowStopModal(false);
  }, []);

  // Handle modal confirm
  const handleStopConfirm = useCallback(async () => {
    console.log('Stop confirmed by user');
    setShowStopModal(false);
    await performStopReset();
  }, []);

  // Update your performStopReset function to include stop tracking AND disable lock
  const performStopReset = useCallback(async () => {
    console.log('=== STOP BUTTON CLICKED - PERFORMING STOP AND RESET ===');

    try {
      // Set stopping state to prevent other operations
      setIsStopping(true);
      setIsRunning(false);

      // Stop Pomodoro blocking immediately
      if (PomodoroModule && isPomodoroBlocking) {
        try {
          await PomodoroModule.stopPomodoroBlocking();
          setIsPomodoroBlocking(false);
          console.log('Pomodoro blocking stopped');
        } catch (error) {
          console.error('Error stopping blocking on stop:', error);
        }
      }

      // NEW: Disable lock if it was enabled
      if (isLockedRef.current && YouTubeNightModeModule) {
        try {
          console.log('🔓 [BlockTime] Disabling lock on stop...');
          await YouTubeNightModeModule.disableKioskLock();
          setIsLocked(false);
          isLockedRef.current = false;
          console.log('✅ [BlockTime] Lock disabled on stop');
        } catch (error) {
          console.error('❌ [BlockTime] Error disabling lock on stop:', error);
        }
      }

      // Get current progress before clearing
      const totalTime = getTotalCompletedTime();
      const hasAnyProgress =
        totalTime > 0 || completedPomodoros > 0 || completedBreaks > 0;

      // TRACK STOP ACTIVITY
      try {
        const stopSessionData = {
          currentTime,
          targetTime,
          currentCycle,
          sessionInCycle,
          isOnBreak,
          currentBreakType,
          completedPomodoros,
          completedBreaks,
          completedShortBreaks,
          completedLongBreaks,
          totalCompletedTime: totalTime,
        };

        await timerActivityService.trackStop(taskId, user.id, stopSessionData);
      } catch (error) {
        console.error('Failed to track stop activity:', error);
      }

      // Rest of your existing stop logic...
      console.log('=== STOP DATA PREPARATION ===', {
        totalTime,
        hasAnyProgress,
        completedPomodoros,
        completedBreaks,
        taskId: !!taskId,
        user: !!user,
        completionDate,
      });

      // ALWAYS save stopped state when Stop button is clicked (even with no progress)
      if (taskId && user && completionDate) {
        const stoppedStateData = {
          totalSeconds: totalTime,
          completedPomodoros: completedPomodoros,
          completedBreaks: completedBreaks,
          completedShortBreaks: completedShortBreaks,
          completedLongBreaks: completedLongBreaks,
          currentTime: 0, // Reset to 0 since stopped
          targetTime: targetTime,
          isOnBreak: isOnBreak,
          currentBreakType: currentBreakType,
          completionDate: completionDate,
          lastUpdateTime: Date.now(),
          lastSessionType: 'stopped_by_user',
          isSessionCompleted: false,
          actualCompletedTime: totalTime,
          isFullyCompleted: false,
          animationProgress: 0,
          sessionStartTime: sessionStartTime,
          isTimerTracker: true,
          currentCycle: currentCycle,
          totalCycles: totalCycles,
          sessionInCycle: sessionInCycle,
          currentSessionIndex: currentSessionIndex,
          // CRITICAL FLAGS for TaskCard detection
          wasStopped: true,
          wasReset: true,
          stoppedAt: Date.now(),
          hasProgressData: hasAnyProgress, // Track if there was actual progress
        };

        console.log('=== ABOUT TO SAVE STOPPED STATE ===');
        console.log(
          'Stopped state data being saved:',
          JSON.stringify(stoppedStateData, null, 2),
        );

        try {
          await taskCompletionsService.upsertTimerCompletion(
            taskId,
            user.id,
            completionDate,
            stoppedStateData,
            false, // Don't mark task as completed
          );
          console.log('=== STOPPED STATE SAVED SUCCESSFULLY ===');

          // Verify it was saved by loading it back
          setTimeout(async () => {
            try {
              const savedCompletion =
                await taskCompletionsService.getTaskCompletion(
                  taskId,
                  user.id,
                  completionDate,
                );
              console.log('=== VERIFICATION: SAVED DATA ===');
              console.log(
                'Saved completion data:',
                JSON.stringify(savedCompletion?.timer_value, null, 2),
              );
              console.log(
                'wasStopped flag in saved data:',
                savedCompletion?.timer_value?.wasStopped,
              );
              console.log(
                'wasReset flag in saved data:',
                savedCompletion?.timer_value?.wasReset,
              );
            } catch (error) {
              console.error('Error verifying saved data:', error);
            }
          }, 1000);
        } catch (error) {
          console.error('=== ERROR SAVING STOPPED STATE ===', error);
        }
      } else {
        console.log('=== MISSING REQUIRED DATA FOR SAVING ===', {
          taskId: !!taskId,
          user: !!user,
          completionDate: !!completionDate,
        });
      }

      // Reset all timer states
      resetTimerState();

      console.log('=== STOP AND RESET COMPLETED ===');

      // Navigate back after a short delay
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('BottomTab', {screen: 'Home'});
        }
      }, 500);
    } catch (error) {
      console.error('=== ERROR DURING STOP AND RESET ===', error);
      setIsStopping(false);

      Alert.alert('Error', 'Failed to stop timer properly. Please try again.');
    }
  }, [
    navigation,
    isPomodoroBlocking,
    resetTimerState,
    getTotalCompletedTime,
    completedPomodoros,
    completedBreaks,
    completedShortBreaks,
    completedLongBreaks,
    targetTime,
    isOnBreak,
    currentBreakType,
    completionDate,
    sessionStartTime,
    currentCycle,
    totalCycles,
    sessionInCycle,
    currentSessionIndex,
    taskId,
    user,
    // Add new dependencies
    currentTime,
  ]);

  const handleComplete = useCallback(async () => {
    console.log('Completing Timer Tracker session');

    if (isStopping) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (continuousSaveRef.current) {
      clearInterval(continuousSaveRef.current);
      continuousSaveRef.current = null;
    }

    // Stop blocking
    if (PomodoroModule) {
      try {
        await PomodoroModule.stopPomodoroBlocking();
        setIsPomodoroBlocking(false);
      } catch (error) {
        console.error('Error stopping blocking on complete:', error);
      }
    }

    // NEW: Disable lock if it was enabled
    if (isLockedRef.current && YouTubeNightModeModule) {
      try {
        console.log('🔓 [BlockTime] Disabling lock on complete...');
        await YouTubeNightModeModule.disableKioskLock();
        setIsLocked(false);
        isLockedRef.current = false;
        console.log('✅ [BlockTime] Lock disabled on complete');
      } catch (error) {
        console.error(
          '❌ [BlockTime] Error disabling lock on complete:',
          error,
        );
      }
    }

    const totalTime = getTotalCompletedTime();

    // Calculate total sessions completed across all cycles
    const totalSessionsCompleted =
      (currentCycle - 1) * sessionStructure.sessions.length +
      currentSessionIndex;

    console.log('Timer Tracker completion stats:', {
      totalTime,
      totalSessionsCompleted,
      completedPomodoros,
      completedBreaks,
      completedShortBreaks,
      completedLongBreaks,
      currentCycle,
      totalCycles,
      sessionInCycle,
    });

    // TRACK COMPLETE ACTIVITY
    try {
      const completeSessionData = {
        currentTime,
        targetTime,
        currentCycle,
        sessionInCycle,
        isOnBreak,
        currentBreakType,
        completedPomodoros,
        completedBreaks,
        completedShortBreaks,
        completedLongBreaks,
        totalCompletedTime: totalTime,
      };

      await timerActivityService.trackComplete(
        taskId,
        user.id,
        completeSessionData,
      );
    } catch (error) {
      console.error('Failed to track complete activity:', error);
    }

    // Create completion data for Timer Tracker
    const completionSaveData = {
      totalSeconds: totalTime,
      completedPomodoros: completedPomodoros,
      completedBreaks: completedBreaks,
      completedShortBreaks: completedShortBreaks,
      completedLongBreaks: completedLongBreaks,
      totalPomodoros: completedPomodoros, // For Timer Tracker, total = completed
      totalBreaks: completedBreaks, // For Timer Tracker, total = completed
      totalShortBreaks: completedShortBreaks,
      totalLongBreaks: completedLongBreaks,
      currentSessionIndex: totalSessionsCompleted,
      currentTime: currentTime,
      targetTime: targetTime,
      isOnBreak: isOnBreak,
      currentBreakType: currentBreakType,
      sessionStructure: sessionStructure,
      completionDate: completionDate,
      lastUpdateTime: Date.now(),
      lastSessionType: 'completed_by_user',
      isSessionCompleted: true,
      actualCompletedTime: totalTime,
      isFullyCompleted: true, // Mark as fully completed when ended
      animationProgress: animationProgressRef.current,
      sessionStartTime: sessionStartTime,
      // Timer Tracker specific completion data
      isTimerTracker: true,
      currentCycle: currentCycle,
      totalCycles: totalCycles,
      sessionInCycle: sessionInCycle,
      completedByUser: true,
    };

    // Save final completion to database
    try {
      await taskCompletionsService.upsertTimerCompletion(
        taskId,
        user.id,
        completionDate,
        completionSaveData,
        true, // Mark task as completed
      );
      console.log('Timer Tracker final completion saved successfully');
    } catch (error) {
      console.error('Error saving Timer Tracker final completion:', error);
    }

    // Reset states
    setIsRunning(false);
    backgroundTimeRef.current = null;
    sessionCompletionRef.current = false;

    // Navigate to Achievement screen with Timer Tracker data
    setTimeout(() => {
      navigation.replace('AchievementScreen', {
        taskData,
        sessionStructure,
        totalPomodoros: completedPomodoros, // Use actual completed count
        completedPomodoros: completedPomodoros,
        totalBreaks: completedBreaks, // Use actual completed count
        completedBreaks: completedBreaks,
        totalShortBreaks: completedShortBreaks,
        totalLongBreaks: completedLongBreaks,
        completedShortBreaks: completedShortBreaks,
        completedLongBreaks: completedLongBreaks,
        selectedDate,
        totalCompletedTime: totalTime,
        completionDate,
        timerData: completionSaveData,
        // Timer Tracker specific achievement data
        isTimerTracker: true,
        currentCycle: currentCycle,
        totalCycles: totalCycles,
        totalSessions: totalSessionsCompleted,
        completedByUser: true,
      });
    }, 500);
  }, [
    currentTime,
    getTotalCompletedTime,
    taskId,
    user,
    completionDate,
    completedPomodoros,
    completedBreaks,
    completedShortBreaks,
    completedLongBreaks,
    currentCycle,
    totalCycles,
    sessionInCycle,
    currentSessionIndex,
    sessionStructure,
    targetTime,
    isOnBreak,
    currentBreakType,
    sessionStartTime,
    taskData,
    selectedDate,
    navigation,
    isStopping,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (blockingTimeoutRef.current) {
        clearTimeout(blockingTimeoutRef.current);
      }
      if (continuousSaveRef.current) {
        clearInterval(continuousSaveRef.current);
      }
      if (PomodoroModule && isPomodoroBlocking) {
        PomodoroModule.stopPomodoroBlocking().catch(console.error);
      }
      // NEW: Cleanup lock on unmount
      if (isLockedRef.current && YouTubeNightModeModule) {
        YouTubeNightModeModule.disableKioskLock().catch(console.error);
      }
    };
  }, [isPomodoroBlocking]);

  // Format time display
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Get display time
  const getDisplayTime = () => {
    if (targetTime > 0) {
      const remaining = Math.max(0, targetTime - currentTime);
      return formatTime(remaining);
    }
    const settings = getTimerTrackerSettings();
    return `${settings.focusTime.toString().padStart(2, '0')}:00`;
  };

  // Format total completed time for display
  const formatTotalTime = () => {
    const totalSeconds = getTotalCompletedTime();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Handle tab press
  const handleTabPress = tabIndex => {
    if (isStopping) return;

    setActiveTab(tabIndex);
    switch (tabIndex) {
      case 0:
        navigation.navigate('BottomTab', {screen: 'Home'});
        break;
      case 1:
      case 2:
      case 3:
        // Other navigation
        break;
      case 4:
        // Current screen
        break;
    }
  };

  const TabIcon = ({index, NormalComponent, PressedComponent}) => {
    const IconComponent =
      activeTab === index ? PressedComponent : NormalComponent;
    return (
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress(index)}
        activeOpacity={0.7}
        disabled={isStopping}>
        <IconComponent
          width={WP(12)}
          height={WP(12)}
          style={[styles.tabIcon, isStopping && styles.disabledIcon]}
          preserveAspectRatio="xMidYMid meet"
        />
      </TouchableOpacity>
    );
  };

  // Get current session info for display
  const getCurrentSessionInfo = () => {
    if (
      !sessionStructure ||
      currentSessionIndex >= sessionStructure.sessions.length
    ) {
      return {type: 'focus', display: 'Focus Session'};
    }

    const session = sessionStructure.sessions[currentSessionIndex];
    if (session.type === 'focus') {
      return {
        type: 'focus',
        display: `Cycle ${currentCycle} - Focus ${sessionInCycle}`,
        session: session,
      };
    } else {
      return {
        type: 'break',
        display: `Cycle ${currentCycle} - ${
          session.subType === 'long' ? 'Long' : 'Short'
        } Break`,
        session: session,
      };
    }
  };

  // Loading screen
  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#000000" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Timer Tracker...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Stopping screen
  if (isStopping) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#000000" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Stopping and Resetting Timer...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentSessionInfo = getCurrentSessionInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

      {/* Stop Timer Confirmation Modal */}
      <StopTimerModal
        visible={showStopModal}
        onCancel={handleStopCancel}
        onConfirm={handleStopConfirm}
      />

      <View style={styles.content}>
        {/* Timer Section */}
        <View style={styles.timerSection}>
          <Image
            source={require('../../assets/Images/Pomodoro-screen/green-glow.png')}
            style={styles.greenGlowAbove}
            resizeMode="contain"
          />

          <View style={styles.timerContainer}>
            <LottieView
              ref={timerAnimationRef}
              source={require('../../assets/animations/pomodoro-clock1.json')}
              style={styles.timerLottie}
              autoPlay={false}
              loop={false}
              progress={animationProgress}
              resizeMode="contain"
              onAnimationFinish={() => {}}
              hardwareAccelerationAndroid={true}
            />
            <TouchableOpacity
              style={styles.timerOverlay}
              onPress={() => {
                const currentTime = Date.now();
                if (
                  !this.lastTapTime ||
                  currentTime - this.lastTapTime > 1000
                ) {
                  this.tapCount = 1;
                } else {
                  this.tapCount = (this.tapCount || 0) + 1;
                  if (this.tapCount === 3) {
                    setShowVoiceTestButton(prev => !prev);
                    this.tapCount = 0;
                  }
                }
                this.lastTapTime = currentTime;
              }}
              activeOpacity={1}>
              <Text style={[styles.timerText, {color: colors.White}]}>
                {getDisplayTime()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Time Section - With Background and 20/80 Split */}
        <View style={styles.totalTimeSection}>
          <View style={styles.totalTimeContainer}>
            <View style={styles.sessionCountSection}>
              <Text style={styles.sessionCountText}>
                {completedPomodoros + completedBreaks}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalTimeContentSection}>
              <Text style={styles.totalTimeText}>{formatTotalTime()}</Text>
            </View>
          </View>
        </View>

        {/* Voice Test Button - Only visible for Plan Your Day */}
        {showVoiceTestButton && isPlanYourDayTask() && (
          <View style={styles.voiceTestContainer}>
            <Text style={styles.voiceTestTitle}>Voice Test</Text>
            <View style={styles.voiceTestButtons}>
              <TouchableOpacity
                style={styles.voiceTestButton}
                onPress={() => handleVoiceTest('short')}
                activeOpacity={0.7}>
                <Text style={styles.voiceTestButtonText}>Short Break</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voiceTestButton}
                onPress={() => handleVoiceTest('long')}
                activeOpacity={0.7}>
                <Text style={styles.voiceTestButtonText}>Long Break</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.voiceTestHint}>Triple-tap timer to hide</Text>
          </View>
        )}

        {/* Action Controls - Three Button Layout */}
        <View style={styles.controlsContainer}>
          {/* Play/Pause Button */}
          <View style={styles.button}>
            <PlayButtonSvg
              width={WP(23)}
              height={HP(11)}
              style={[
                styles.buttonBackground,
                (isTransitioning || isStopping) && styles.disabledButton,
              ]}
              preserveAspectRatio="none"
            />
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={handlePlayPause}
              onPressIn={() => setIsPlayPausePressed(true)}
              onPressOut={() => setIsPlayPausePressed(false)}
              activeOpacity={isTransitioning || isStopping ? 1 : 0.8}
              disabled={isTransitioning || isStopping}>
              <Icon
                name={getPlayPauseButtonIcon()}
                size={FS(4.5)}
                color={getButtonColor()}
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Complete Button in Center - Green on Press */}
          <View style={styles.completeButtonContainer}>
            <PlayButtonSvg
              width={WP(30)}
              height={HP(14)}
              style={[
                styles.buttonBackground,
                isStopping && styles.disabledButton,
              ]}
              preserveAspectRatio="none"
            />
            <TouchableOpacity
              style={styles.completeButtonTouchable}
              onPress={handleComplete}
              onPressIn={() => setIsCompletePressed(true)}
              onPressOut={() => setIsCompletePressed(false)}
              activeOpacity={isStopping ? 1 : 0.8}
              disabled={isStopping}>
              <Text
                style={[
                  styles.completeButtonText,
                  isStopping && styles.disabledText,
                ]}>
                Complete
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stop Button - Red on Press */}
          <View style={styles.button}>
            <PlayButtonSvg
              width={WP(23)}
              height={HP(11)}
              style={[
                styles.buttonBackground,
                (isTransitioning || isStopping) && styles.disabledButton,
              ]}
              preserveAspectRatio="none"
            />
            {isStopPressed && <View style={styles.stopButtonPressOverlay} />}
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={handleStop}
              onPressIn={() => setIsStopPressed(true)}
              onPressOut={() => setIsStopPressed(false)}
              activeOpacity={isTransitioning || isStopping ? 1 : 0.8}
              disabled={isTransitioning || isStopping}>
              <Text
                style={[
                  styles.stopButtonText,
                  (isTransitioning || isStopping) && styles.disabledText,
                ]}>
                Stop
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Flower Area */}
        <View style={styles.flowerArea}>
          <LottieView
            ref={flowerAnimationRef}
            source={require('../../assets/animations/flower-video-30sec-v1.json')}
            style={styles.flowerAnimation}
            autoPlay={false}
            loop={false}
            progress={animationProgress}
            resizeMode="cover"
            onAnimationFinish={() => {}}
            hardwareAccelerationAndroid={true}
          />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBarContainer}>
        <TabBarBackgroundSvg
          width={WP(100)}
          height={HP(12)}
          style={styles.tabBarBackground}
          preserveAspectRatio="none"
        />
        <View style={styles.tabBarOverlay}>
          <TabIcon
            index={0}
            NormalComponent={Tab1NormalSvg}
            PressedComponent={Tab1PressedSvg}
          />
          <TabIcon
            index={1}
            NormalComponent={Tab2NormalSvg}
            PressedComponent={Tab2PressedSvg}
          />
          <TabIcon
            index={2}
            NormalComponent={Tab3NormalSvg}
            PressedComponent={Tab3PressedSvg}
          />
          <TabIcon
            index={3}
            NormalComponent={Tab4NormalSvg}
            PressedComponent={Tab4PressedSvg}
          />
          <TabIcon
            index={4}
            NormalComponent={Tab5NormalSvg}
            PressedComponent={Tab5PressedSvg}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(2),
    fontFamily: 'Inter-Medium',
    color: colors.White,
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3),
  },
  timerSection: {
    alignItems: 'center',
    marginTop: HP(-3),
    marginBottom: HP(-2),
  },
  greenGlowAbove: {
    width: WP(125),
    height: WP(110),
    position: 'absolute',
    top: HP(-6.5),
    zIndex: 0,
    opacity: 0.8,
  },
  timerContainer: {
    position: 'relative',
    width: WP(95),
    height: HP(40),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerLottie: {
    position: 'absolute',
    width: WP(95),
    height: HP(40),
    top: 0,
    left: 0,
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timerText: {
    fontSize: FS(5),
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  totalTimeSection: {
    alignItems: 'center',
    marginVertical: HP(1.5),
  },
  totalTimeContainer: {
    backgroundColor: colors.White,
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.2),
    borderRadius: WP(4),
    minWidth: WP(50),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sessionCountSection: {
    flex: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCountText: {
    fontSize: FS(2.2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.Black,
    textAlign: 'center',
  },
  divider: {
    width: 1.5,
    height: HP(3),
    backgroundColor: '#CCCCCC',
    marginHorizontal: WP(2),
  },
  totalTimeContentSection: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: WP(2),
  },
  totalTimeText: {
    fontSize: FS(2.2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.Black,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(3),
    paddingHorizontal: WP(5),
    position: 'relative',
  },
  button: {
    position: 'relative',
    width: WP(23),
    height: HP(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonContainer: {
    position: 'relative',
    width: WP(30),
    height: HP(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonPressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#28A745', // Green overlay on press
    borderRadius: WP(18),
    opacity: 0.8,
    zIndex: 2,
    width: WP(30),
    height: HP(14),
  },
  stopButtonPressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DC3545', // Red overlay on press
    borderRadius: WP(14),
    opacity: 0.8,
    zIndex: 2,
    width: WP(22),
    height: HP(11),
  },
  buttonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  completeButtonTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  buttonIcon: {
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  completeButtonText: {
    fontSize: FS(2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  stopButtonText: {
    fontSize: FS(2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  disabledText: {
    color: '#CCCCCC',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  flowerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: HP(2),
    marginBottom: HP(13),
  },
  flowerAnimation: {
    width: WP(90),
    height: WP(85),
    zIndex: 2,
  },
  tabBarContainer: {
    position: 'relative',
    width: WP(100),
    height: HP(12),
    alignSelf: 'center',
    marginTop: HP(2),
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tabBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: WP(-1),
    paddingTop: HP(1),
    zIndex: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    // Additional styling if needed
  },
  // ADD these styles at the end, before the closing });
  voiceTestContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: WP(4),
    padding: WP(4),
    marginVertical: HP(1),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceTestTitle: {
    fontSize: FS(1.8),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    marginBottom: HP(1),
  },
  voiceTestButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: WP(3),
  },
  voiceTestButton: {
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(5),
    paddingVertical: HP(1.2),
    borderRadius: WP(3),
    minWidth: WP(30),
  },
  voiceTestButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'Poppins-Medium',
    color: colors.White,
    textAlign: 'center',
  },
  voiceTestHint: {
    fontSize: FS(1.2),
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: HP(0.5),
    textAlign: 'center',
  },
});

export default PomoTrackerScreen;
