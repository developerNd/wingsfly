import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  AppState,
  NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {taskService} from '../../services/api/taskService';
import {taskCompletionsService} from '../../services/api/taskCompletionsService';
import {useAuth} from '../../contexts/AuthContext';
import TimerDisplay from '../../Components/PomoTimerDisplay';
import SessionControls from '../../Components/SessionControls';
import CompletionScreen from '../../Components/CompletionScreen';
import {getCompletionDateString} from '../../utils/dateUtils';

const {PomodoroModule} = NativeModules;

const PomodoroTimerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const taskData = route.params?.task;
  const taskId = taskData?.id;
  // FIXED: Properly handle selectedDate - same pattern as TaskEvaluationScreen
  const selectedDate = route.params?.selectedDate || new Date().toDateString();

  console.log('PomodoroTimerScreen - Route params:', {
    taskId,
    selectedDate,
    routeSelectedDate: route.params?.selectedDate,
    taskTitle: taskData?.title
  });

  // FIXED: Use date-specific storage keys
  const STORAGE_KEY = `pomodoro_timer_${taskId || 'default'}_${getCompletionDateString(selectedDate)}`;
  const SESSION_STORAGE_KEY = `pomodoro_session_${taskId || 'default'}_${getCompletionDateString(selectedDate)}`;

  // FIXED: Use consistent date formatting - same as TaskEvaluationScreen
  const completionDate = React.useMemo(() => {
    const result = getCompletionDateString(selectedDate);
    console.log('PomodoroTimer completionDate computed:', result, 'from selectedDate:', selectedDate);
    return result;
  }, [selectedDate]);

  // Add refs to prevent multiple simultaneous operations
  const isSavingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const backgroundTimeCalculatedRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const getPomodoroSettings = () => {
    const defaultSettings = {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15,
      focusSessionsPerRound: 4,
      autoStartShortBreaks: true,
      autoStartFocusSessions: false,
    };

    if (!taskData) {
      return defaultSettings;
    }

    const settings = {
      focusTime:
        taskData.focus_duration ||
        taskData.focusDuration ||
        defaultSettings.focusTime,
      shortBreak:
        taskData.short_break_duration ||
        taskData.shortBreakDuration ||
        defaultSettings.shortBreak,
      longBreak:
        taskData.long_break_duration ||
        taskData.longBreakDuration ||
        defaultSettings.longBreak,
      focusSessionsPerRound:
        taskData.focus_sessions_per_round ||
        taskData.focusSessionsPerRound ||
        defaultSettings.focusSessionsPerRound,
      autoStartShortBreaks:
        taskData.auto_start_short_breaks ??
        taskData.autoStartShortBreaks ??
        defaultSettings.autoStartShortBreaks,
      autoStartFocusSessions:
        taskData.auto_start_focus_sessions ??
        taskData.autoStartFocusSessions ??
        defaultSettings.autoStartFocusSessions,
    };

    return settings;
  };

  const getTotalDuration = () => {
    // First priority: get from pomodoro_duration
    if (taskData?.pomodoro_duration) {
      return taskData.pomodoro_duration * 60; // Convert minutes to seconds
    }

    // Fallback to existing logic for backward compatibility
    if (taskData?.duration_data?.totalMinutes) {
      return taskData.duration_data.totalMinutes * 60;
    }

    if (taskData?.durationData?.totalMinutes) {
      return taskData.durationData.totalMinutes * 60;
    }

    if (
      taskData?.block_time_data?.startTime &&
      taskData?.block_time_data?.endTime
    ) {
      const parseTime = timeStr => {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        if (period === 'PM' && hours !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hours === 12) {
          hour24 = 0;
        }

        return hour24 * 60 + (minutes || 0);
      };

      const startMinutes = parseTime(taskData.block_time_data.startTime);
      let endMinutes = parseTime(taskData.block_time_data.endTime);

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      return (endMinutes - startMinutes) * 60;
    }

    if (
      taskData?.blockTimeData?.startTime &&
      taskData?.blockTimeData?.endTime
    ) {
      const parseTime = timeStr => {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        if (period === 'PM' && hours !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hours === 12) {
          hour24 = 0;
        }

        return hour24 * 60 + (minutes || 0);
      };

      const startMinutes = parseTime(taskData.blockTimeData.startTime);
      let endMinutes = parseTime(taskData.blockTimeData.endTime);

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      return (endMinutes - startMinutes) * 60;
    }

    return 120 * 60; // Default 2 hours
  };

  const [sessionStructure, setSessionStructure] = useState(null);

  // FIXED SESSION STRUCTURE CALCULATION
  useEffect(() => {
    const calculateSessionStructure = () => {
      const settings = getPomodoroSettings();
      const totalDurationSeconds = getTotalDuration();
      const totalDurationMinutes = totalDurationSeconds / 60;

      const focusMinutes = settings.focusTime;
      const shortBreakMinutes = settings.shortBreak;
      const longBreakMinutes = settings.longBreak;
      const focusSessionsPerRound = settings.focusSessionsPerRound;

      console.log('Session Calculation Settings:', {
        totalDurationMinutes,
        focusMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        focusSessionsPerRound,
      });

      let sessions = [];
      let remainingMinutes = totalDurationMinutes;
      let focusSessionCount = 0;
      let sessionsInCurrentRound = 0;

      // Build sessions based on focus sessions per round pattern
      while (remainingMinutes > 0 && focusSessionCount < 50) {
        // Safety limit
        // Check if we can fit at least a minimum focus session
        const minimumFocusTime = Math.min(focusMinutes, 5); // At least 5 minutes or the set focus time
        if (remainingMinutes < minimumFocusTime) {
          break; // Can't fit any more meaningful sessions
        }

        // Add focus session
        focusSessionCount++;
        sessionsInCurrentRound++;

        // UPDATED LOGIC: Determine the duration for this focus session
        let focusSessionDuration;

        if (sessionsInCurrentRound < focusSessionsPerRound) {
          // Not the last session in the round - use standard focus time
          focusSessionDuration = Math.min(focusMinutes, remainingMinutes);
        } else {
          // This IS the last session in the round (4th session)
          // Check if we can fit a long break after this session
          const timeAfterLongBreak = remainingMinutes - longBreakMinutes;

          if (timeAfterLongBreak >= minimumFocusTime) {
            // We can fit long break + at least one more focus session
            // So for this 4th session, use all remaining time EXCEPT the long break time
            focusSessionDuration = timeAfterLongBreak;
          } else {
            // We cannot fit another meaningful session after long break
            // So this 4th session uses ALL remaining time (no long break will be added)
            focusSessionDuration = remainingMinutes;
          }
        }

        // Add the focus session
        sessions.push({
          type: 'focus',
          number: focusSessionCount,
          duration: Math.round(focusSessionDuration * 100) / 100,
        });
        remainingMinutes -= focusSessionDuration;
        remainingMinutes = Math.max(0, remainingMinutes); // Ensure non-negative

        console.log(
          `Added focus session ${focusSessionCount} (${focusSessionDuration} min), remaining: ${remainingMinutes} minutes`,
        );

        // Check if we should add a break
        if (remainingMinutes > 0) {
          let breakDuration = 0;
          let breakType = 'short';

          if (sessionsInCurrentRound === focusSessionsPerRound) {
            // End of round - try to add long break
            breakType = 'long';

            // Check if we can fit full long break
            if (remainingMinutes >= longBreakMinutes) {
              breakDuration = longBreakMinutes;
            } else if (remainingMinutes >= shortBreakMinutes) {
              // Can't fit long break, use short break instead
              breakDuration = shortBreakMinutes;
              breakType = 'short';
            } else if (remainingMinutes >= 2) {
              // Use remaining time as short break if at least 2 minutes
              breakDuration = remainingMinutes;
              breakType = 'short';
            }
          } else {
            // Middle of round - try to add short break
            if (remainingMinutes >= shortBreakMinutes) {
              breakDuration = shortBreakMinutes;
            } else if (remainingMinutes >= 2) {
              // Use remaining time as break if at least 2 minutes
              breakDuration = remainingMinutes;
            }
          }

          // Add break if we determined a duration
          if (breakDuration > 0) {
            sessions.push({
              type: 'break',
              subType: breakType,
              duration: breakDuration,
            });
            remainingMinutes -= breakDuration;
            remainingMinutes = Math.max(0, remainingMinutes);

            console.log(
              `Added ${breakType} break (${breakDuration} min), remaining: ${remainingMinutes} minutes`,
            );

            // Reset round counter if it was a long break
            if (breakType === 'long') {
              sessionsInCurrentRound = 0;
            }
          } else {
            // No break added, this was the final session
            break;
          }
        } else {
          // No remaining time, this was the final session
          break;
        }
      }

      // Count totals
      const focusSessions = sessions.filter(s => s.type === 'focus');
      const shortBreaks = sessions.filter(
        s => s.type === 'break' && s.subType === 'short',
      );
      const longBreaks = sessions.filter(
        s => s.type === 'break' && s.subType === 'long',
      );

      console.log('Final Sessions Array:', sessions);
      sessions.forEach((session, index) => {
        const subTypeText = session.subType || '';
        const numberText = session.number || '';
        console.log(
          `Session ${index}: ${session.type} ${numberText} ${subTypeText} - ${session.duration} minutes`,
        );
      });

      const usedMinutes = sessions.reduce(
        (sum, session) => sum + session.duration,
        0,
      );
      const finalRemainingMinutes = Math.max(
        0,
        totalDurationMinutes - usedMinutes,
      );

      const result = {
        sessions: sessions,
        totalFocusSessions: focusSessions.length,
        totalShortBreaks: shortBreaks.length,
        totalLongBreaks: longBreaks.length,
        totalBreaks: shortBreaks.length + longBreaks.length,
        focusMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        focusSessionsPerRound,
        usedMinutes: usedMinutes,
        remainingMinutes: finalRemainingMinutes,
      };

      console.log('Session Structure Result:', {
        totalFocusSessions: result.totalFocusSessions,
        totalShortBreaks: result.totalShortBreaks,
        totalLongBreaks: result.totalLongBreaks,
        usedMinutes: result.usedMinutes,
        remainingMinutes: result.remainingMinutes,
        totalDurationMinutes,
      });

      return result;
    };

    if (taskData) {
      const structure = calculateSessionStructure();
      setSessionStructure(structure);
    }
  }, [taskData]);

  const pomodoroSettings = getPomodoroSettings();

  const [totalTaskDuration, setTotalTaskDuration] = useState(() =>
    getTotalDuration(),
  );
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [currentSessionTarget, setCurrentSessionTarget] = useState(() => {
    const settings = getPomodoroSettings();
    return settings.focusTime * 60;
  });
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [completedBreaks, setCompletedBreaks] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(0);
  const [remainingTaskTime, setRemainingTaskTime] = useState(() =>
    getTotalDuration(),
  );
  const [currentBreakType, setCurrentBreakType] = useState('short');
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPomodoroBlocking, setIsPomodoroBlocking] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const [excludedAppsCount, setExcludedAppsCount] = useState(0);
  const [pomodoroState, setPomodoroState] = useState(null);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  const timerRef = useRef(null);
  const backgroundStartTimeRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // ADDED: Load existing timer completion from database - same pattern as TaskEvaluationScreen
  const loadTimerCompletion = React.useCallback(async () => {
    if (!user || !taskData || !completionDate) {
      console.warn('PomodoroTimer - Missing data:', {user: !!user, taskData: !!taskData, completionDate});
      return null;
    }

    try {
      console.log('PomodoroTimer - Loading completion for:', {
        taskId: taskData.id,
        userId: user.id,
        completionDate,
        selectedDate
      });

      const completion = await taskCompletionsService.getTaskCompletion(
        taskData.id,
        user.id,
        completionDate
      );

      console.log('PomodoroTimer - Found completion:', completion);
      return completion;
    } catch (error) {
      console.error('PomodoroTimer - Error loading completion:', error);
      return null;
    }
  }, [user, taskData, completionDate, selectedDate]);

  // Enhanced save timer state function with debouncing
  const saveTimerState = async (overrideState = {}) => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log('Save already in progress, skipping...');
      return;
    }

    // Debounce saves - don't save more than once per second
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 1000) {
      console.log('Save debounced, too recent');
      return;
    }

    try {
      isSavingRef.current = true;
      lastSaveTimeRef.current = now;

      const currentTime = Date.now();
      const timerState = {
        currentSessionTime:
          overrideState.currentSessionTime ?? currentSessionTime,
        currentSessionTarget:
          overrideState.currentSessionTarget ?? currentSessionTarget,
        isOnBreak: overrideState.isOnBreak ?? isOnBreak,
        completedPomodoros:
          overrideState.completedPomodoros ?? completedPomodoros,
        completedBreaks: overrideState.completedBreaks ?? completedBreaks,
        currentBreakType: overrideState.currentBreakType ?? currentBreakType,
        currentSessionIndex:
          overrideState.currentSessionIndex ?? currentSessionIndex,
        isRunning: overrideState.isRunning ?? isRunning,
        isCompleted: overrideState.isCompleted ?? isCompleted,
        isTransitioning: overrideState.isTransitioning ?? isTransitioning,
        timerStartTime: overrideState.timerStartTime ?? timerStartTime,
        sessionStartTime: overrideState.sessionStartTime ?? sessionStartTime,
        lastUpdateTime: currentTime,
        appCloseTime: currentTime,
        // ADDED: Store completion date for validation
        completionDate: completionDate,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
      console.log('Timer state saved for date:', completionDate, timerState);
    } catch (error) {
      console.error('Error saving timer state:', error);
    } finally {
      isSavingRef.current = false;
    }
  };

  // Enhanced load timer state function with proper locking
  const loadTimerState = async () => {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('Load already in progress, skipping...');
      return false;
    }

    try {
      isLoadingRef.current = true;

      const savedState = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('Loading timer state for date:', completionDate, parsedState);

        // ADDED: Validate that saved state is for the same date
        if (parsedState.completionDate && parsedState.completionDate !== completionDate) {
          console.log('Saved state is for different date, ignoring:', parsedState.completionDate, 'vs', completionDate);
          return false;
        }

        // Only calculate background time once per app session
        let adjustedCurrentTime = parsedState.currentSessionTime;

        if (
          parsedState.isRunning &&
          parsedState.appCloseTime &&
          !parsedState.isTransitioning &&
          !backgroundTimeCalculatedRef.current
        ) {
          const backgroundTimeElapsed = Math.floor(
            (Date.now() - parsedState.appCloseTime) / 1000,
          );

          // Only apply background time if it's reasonable (less than 1 hour)
          if (backgroundTimeElapsed > 0 && backgroundTimeElapsed < 3600) {
            adjustedCurrentTime =
              parsedState.currentSessionTime + backgroundTimeElapsed;
            backgroundTimeCalculatedRef.current = true; // Mark as calculated

            console.log(`Background time elapsed: ${backgroundTimeElapsed}s`);
            console.log(
              `Adjusting session time from ${parsedState.currentSessionTime} to ${adjustedCurrentTime}`,
            );

            // Check if session(s) completed in background
            if (adjustedCurrentTime >= parsedState.currentSessionTarget) {
              await handleBackgroundSessionCompletions(
                parsedState,
                backgroundTimeElapsed,
              );
              return true;
            }
          }
        }

        // Restore state
        setCurrentSessionTime(adjustedCurrentTime);
        setCurrentSessionTarget(parsedState.currentSessionTarget);
        setIsOnBreak(parsedState.isOnBreak);
        setCompletedPomodoros(parsedState.completedPomodoros);
        setCompletedBreaks(parsedState.completedBreaks);
        setCurrentBreakType(parsedState.currentBreakType);
        setCurrentSessionIndex(parsedState.currentSessionIndex);
        setIsRunning(parsedState.isRunning);
        setIsCompleted(parsedState.isCompleted);
        setIsTransitioning(parsedState.isTransitioning);
        setTimerStartTime(parsedState.timerStartTime);
        setSessionStartTime(parsedState.sessionStartTime);
        setLastUpdateTime(Date.now());

        return true;
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    } finally {
      isLoadingRef.current = false;
    }
    return false;
  };

  // Handle multiple session completions that may have occurred in background
  const handleBackgroundSessionCompletions = async (
    savedState,
    backgroundTimeElapsed,
  ) => {
    if (!sessionStructure) return;

    let remainingBackgroundTime = backgroundTimeElapsed;
    let currentIndex = savedState.currentSessionIndex;
    let currentTime = savedState.currentSessionTime;
    let newCompletedPomodoros = savedState.completedPomodoros;
    let newCompletedBreaks = savedState.completedBreaks;

    // Simulate session progressions that occurred in background
    while (
      remainingBackgroundTime > 0 &&
      currentIndex < sessionStructure.sessions.length
    ) {
      const currentSession = sessionStructure.sessions[currentIndex];
      const timeNeededToComplete =
        savedState.currentSessionTarget - currentTime;

      if (remainingBackgroundTime >= timeNeededToComplete) {
        // This session completed in background
        remainingBackgroundTime -= timeNeededToComplete;

        // Update counters
        if (currentSession.type === 'focus') {
          newCompletedPomodoros++;
        } else {
          newCompletedBreaks++;
        }

        // Move to next session
        currentIndex++;
        currentTime = 0;

        // Check if there are more sessions
        if (currentIndex < sessionStructure.sessions.length) {
          const nextSession = sessionStructure.sessions[currentIndex];
          const nextSessionTarget = nextSession.duration * 60;

          // Apply any remaining background time to the next session
          if (remainingBackgroundTime > 0) {
            currentTime = Math.min(remainingBackgroundTime, nextSessionTarget);
            remainingBackgroundTime = Math.max(
              0,
              remainingBackgroundTime - nextSessionTarget,
            );
          }

          // Update current session target for the new session
          savedState.currentSessionTarget = nextSessionTarget;
          savedState.isOnBreak = nextSession.type === 'break';
          savedState.currentBreakType = nextSession.subType || 'short';
        } else {
          // All sessions completed
          setIsCompleted(true);
          await clearTimerState();
          return;
        }
      } else {
        // Session didn't complete, add remaining time
        currentTime += remainingBackgroundTime;
        remainingBackgroundTime = 0;
      }
    }

    // Set the final calculated state
    setCurrentSessionTime(currentTime);
    setCurrentSessionTarget(savedState.currentSessionTarget);
    setIsOnBreak(savedState.isOnBreak);
    setCurrentBreakType(savedState.currentBreakType);
    setCurrentSessionIndex(currentIndex);
    setCompletedPomodoros(newCompletedPomodoros);
    setCompletedBreaks(newCompletedBreaks);
    setIsRunning(savedState.isRunning);
    setIsCompleted(currentIndex >= sessionStructure.sessions.length);
    setIsTransitioning(false);
    setTimerStartTime(savedState.timerStartTime);
    setSessionStartTime(savedState.sessionStartTime);
    setLastUpdateTime(Date.now());

    // Save the updated state
    await saveTimerState({
      currentSessionTime: currentTime,
      currentSessionTarget: savedState.currentSessionTarget,
      isOnBreak: savedState.isOnBreak,
      currentBreakType: savedState.currentBreakType,
      currentSessionIndex: currentIndex,
      completedPomodoros: newCompletedPomodoros,
      completedBreaks: newCompletedBreaks,
      isCompleted: currentIndex >= sessionStructure.sessions.length,
      isTransitioning: false,
    });
  };

  // Clear timer state from AsyncStorage
  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      backgroundTimeCalculatedRef.current = false; // Reset background time flag
      console.log('Timer state cleared for date:', completionDate);
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  // Save session structure to AsyncStorage
  const saveSessionStructure = async structure => {
    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(structure),
      );
    } catch (error) {
      console.error('Error saving session structure:', error);
    }
  };

  // Load session structure from AsyncStorage
  const loadSessionStructure = async () => {
    try {
      const savedStructure = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (savedStructure) {
        return JSON.parse(savedStructure);
      }
    } catch (error) {
      console.error('Error loading session structure:', error);
    }
    return null;
  };

  // Helper function to format time for display
  const formatTimeForDisplay = seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Helper function to convert seconds to minutes with precision
  const secondsToMinutesWithPrecision = seconds => {
    return Math.round((seconds / 60) * 100) / 100; // 2 decimal places
  };

  // UPDATED: Save timer completion to database with date-specific handling
  const saveTimerCompletionToDatabase = async (timerValue, isCompleted) => {
    if (!taskId || !user) {
      console.log('No task ID or user for saving timer completion');
      return;
    }

    try {
      // Enhanced logging with both seconds and minutes for clarity
      console.log(`Saving timer completion for date ${completionDate}:
        - Raw seconds: ${timerValue}
        - Formatted time: ${formatTimeForDisplay(timerValue)}
        - Minutes (with precision): ${secondsToMinutesWithPrecision(timerValue)}
        - Completed: ${isCompleted}
        - Date: ${completionDate}`);

      // Store seconds directly for maximum precision
      const completion = await taskCompletionsService.upsertTimerCompletion(
        taskId,
        user.id,
        completionDate, // FIXED: Use completionDate instead of selectedDate
        timerValue, // Store full seconds - no conversion/precision loss
        isCompleted,
      );

      console.log('Timer completion saved to database for date:', completionDate, completion);
      return completion;
    } catch (error) {
      console.error('Error saving timer completion to database:', error);
      Alert.alert('Error', 'Failed to save task completion. Please try again.');
      throw error;
    }
  };

  // ...existing code above...
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      // App goes to background
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        backgroundStartTimeRef.current = Date.now();
      }
      // App comes to foreground
      else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (
          isRunning &&
          backgroundStartTimeRef.current &&
          !isTransitioning &&
          !isCompleted
        ) {
          const now = Date.now();
          const elapsed = Math.floor(
            (now - backgroundStartTimeRef.current) / 1000,
          );
          if (elapsed > 0 && elapsed < 3600) {
            setCurrentSessionTime(prev => {
              // Don't exceed session target
              return Math.min(prev + elapsed, currentSessionTarget);
            });
          }
          backgroundStartTimeRef.current = null;
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [isRunning, isTransitioning, isCompleted, currentSessionTarget]);

  // UPDATED: Load state when screen focuses with existing completion check
  useFocusEffect(
    React.useCallback(() => {
      const initializeScreen = async () => {
        // Prevent multiple initializations
        if (isLoadingRef.current) {
          return;
        }

        console.log('Screen focused, initializing for date:', completionDate);

        // ADDED: Check for existing completion first - same pattern as TaskEvaluationScreen
        const existingCompletion = await loadTimerCompletion();
        if (existingCompletion) {
          console.log('Found existing timer completion:', existingCompletion);
          
          // If task is already completed for this date, show completion screen
          if (existingCompletion.is_completed) {
            console.log('Task already completed for this date, showing completion screen');
            setIsCompleted(true);
            setIsStateLoaded(true);
            return;
          }

          // If there's existing timer progress, we might want to restore it
          // but we'll let the AsyncStorage state take precedence for active sessions
        }

        // Try to load existing session structure first
        const savedStructure = await loadSessionStructure();
        if (savedStructure) {
          console.log('Loaded existing session structure');
          setSessionStructure(savedStructure);
        }

        // Try to load timer state
        const stateLoaded = await loadTimerState();
        setIsStateLoaded(true);

        if (stateLoaded) {
          console.log('Previous timer state loaded successfully');
        } else {
          console.log('No previous timer state found, starting fresh');
        }
      };

      initializeScreen();

      // Save state when screen loses focus with debouncing
      return () => {
        if (isStateLoaded && !isSavingRef.current) {
          console.log('Screen losing focus, saving state for date:', completionDate);
          // Use setTimeout to avoid blocking navigation
          setTimeout(() => {
            saveTimerState();
          }, 50);
        }
      };
    }, [completionDate, loadTimerCompletion]),
  );

  // UPDATED: Calculate remaining time properly based on session structure
  useEffect(() => {
    if (sessionStructure) {
      saveSessionStructure(sessionStructure);
      setTotalPomodoros(sessionStructure.totalFocusSessions);
      setTotalBreaks(sessionStructure.totalBreaks);

      // Only set initial session if we haven't loaded a previous state and state hasn't been loaded yet
      if (
        currentSessionIndex === 0 &&
        currentSessionTime === 0 &&
        !isStateLoaded
      ) {
        if (sessionStructure.sessions.length > 0) {
          const firstSession = sessionStructure.sessions[0];
          setCurrentSessionTarget(firstSession.duration * 60);
          setIsOnBreak(firstSession.type === 'break');
          setCurrentBreakType(firstSession.subType || 'short');
        }
      }

      // UPDATED: Calculate remaining time based on sessions completed and current session progress
      const completedSessionsTime = sessionStructure.sessions
        .slice(0, currentSessionIndex)
        .reduce((sum, session) => sum + session.duration * 60, 0);

      const currentSessionProgress = currentSessionTime;
      const totalUsedTime = completedSessionsTime + currentSessionProgress;
      const totalPomodoroTime = sessionStructure.usedMinutes * 60; // Total planned time for all sessions
      const absoluteRemainingTime = Math.max(
        0,
        totalTaskDuration - totalUsedTime,
      );

      // If using pomodoro_duration, remaining time should be based on unused pomodoro time
      if (taskData?.pomodoro_duration) {
        const pomodoroRemainingTime = Math.max(
          0,
          totalPomodoroTime - totalUsedTime,
        );
        setRemainingTaskTime(pomodoroRemainingTime);
      } else {
        // For other duration types, use absolute remaining time
        setRemainingTaskTime(absoluteRemainingTime);
      }

      console.log('Remaining Time Calculation:', {
        completedSessionsTime: completedSessionsTime / 60,
        currentSessionProgress: currentSessionProgress / 60,
        totalUsedTime: totalUsedTime / 60,
        totalPomodoroTime: totalPomodoroTime / 60,
        absoluteRemainingTime: absoluteRemainingTime / 60,
        finalRemainingTime:
          (taskData?.pomodoro_duration
            ? Math.max(0, totalPomodoroTime - totalUsedTime)
            : absoluteRemainingTime) / 60,
      });
    }
  }, [
    sessionStructure,
    isStateLoaded,
    currentSessionIndex,
    currentSessionTime,
    totalTaskDuration,
  ]);

  useEffect(() => {
    checkPomodoroStatus();
    loadPomodoroState();
  }, []);

  const loadPomodoroState = async () => {
    try {
      if (PomodoroModule && PomodoroModule.getPomodoroState) {
        const state = await PomodoroModule.getPomodoroState();
        setPomodoroState(state);
        setExcludedAppsCount(state.excludedAppsCount || 0);
      }
    } catch (error) {
      console.error('Error loading Pomodoro state:', error);
    }
  };

  const checkPomodoroStatus = async () => {
    try {
      if (PomodoroModule) {
        const isBlocking = await PomodoroModule.isPomodoroBlocking();
        setIsPomodoroBlocking(isBlocking);
        await loadPomodoroState();
      }
    } catch (error) {
      console.error('Error checking Pomodoro status:', error);
    }
  };

  const startPomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.startPomodoroBlocking();
        setIsPomodoroBlocking(true);
        await loadPomodoroState();
      }
    } catch (error) {
      console.error('Error starting Pomodoro blocking:', error);
    }
  };

  const stopPomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.stopPomodoroBlocking();
        setIsPomodoroBlocking(false);
      }
    } catch (error) {
      console.error('Error stopping Pomodoro blocking:', error);
    }
  };

  const pausePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.pausePomodoroBlocking();
        setIsPomodoroBlocking(false);

        setTimeout(async () => {
          const isBlocking = await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(isBlocking);
        }, 100);
      }
    } catch (error) {
      console.error('Error pausing Pomodoro blocking:', error);
    }
  };

  const resumePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.resumePomodoroBlocking();
        setIsPomodoroBlocking(true);

        setTimeout(async () => {
          const isBlocking = await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(isBlocking);
        }, 100);
      }
    } catch (error) {
      console.error('Error resuming Pomodoro blocking:', error);
      setTimeout(async () => {
        const isBlocking = await PomodoroModule.isPomodoroBlocking();
        setIsPomodoroBlocking(isBlocking);
      }, 100);
    }
  };

  const getCurrentSession = () => {
    if (
      !sessionStructure ||
      currentSessionIndex >= sessionStructure.sessions.length
    ) {
      return null;
    }
    return sessionStructure.sessions[currentSessionIndex];
  };

  // UPDATED: Complete task and navigate home with database integration
  const completeTaskAndNavigateHome = async () => {
    if (!taskId || !taskData || !user) {
      await clearTimerState();
      navigation.goBack();
      return;
    }

    try {
      // Calculate total timer duration completed
      const totalCompletedTime = sessionStructure
        ? sessionStructure.sessions
            .slice(0, currentSessionIndex + 1)
            .reduce((sum, session, index) => {
              if (index < currentSessionIndex) {
                return sum + session.duration * 60; // Convert to seconds
              } else if (index === currentSessionIndex) {
                return sum + currentSessionTime;
              }
              return sum;
            }, 0)
        : currentSessionTime;

      // Save to task_completions table with full precision
      await saveTimerCompletionToDatabase(totalCompletedTime, true);

      // Clear saved state since task is completed
      await clearTimerState();

      // Navigate back with completion info - FIXED: Pass selectedDate consistently
      navigation.navigate('BottomTab', {
        screen: 'Home',
        params: {
          completedTaskId: taskId,
          showAppreciation: true,
          taskData: {
            ...taskData,
            isCompleted: true,
          },
          completedDate: completionDate, // ADDED: Pass completion date
        },
      });
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert(
        'Update Error',
        'Task completed but failed to save. Please check the home screen.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await clearTimerState();
              navigation.navigate('BottomTab', {
                screen: 'Home',
                params: {
                  completedTaskId: taskId,
                  completedDate: completionDate,
                },
              });
            },
          },
        ],
      );
    }
  };

  const startNextSession = async () => {
    if (!sessionStructure) return;

    setIsTransitioning(true);
    setIsRunning(false);

    // Save transitioning state
    await saveTimerState({isTransitioning: true, isRunning: false});

    // Move to next session
    const nextSessionIndex = currentSessionIndex + 1;

    // Check if we've completed all sessions
    if (nextSessionIndex >= sessionStructure.sessions.length) {
      setIsCompleted(true);
      setIsTransitioning(false);
      await stopPomodoroBlocking();

      // Save final timer completion when all sessions are done
      try {
        const totalCompletedTime = sessionStructure.sessions.reduce(
          (sum, session) => sum + session.duration * 60,
          0,
        );

        await saveTimerCompletionToDatabase(totalCompletedTime, true);
      } catch (error) {
        console.error('Error saving final timer completion:', error);
      }

      await clearTimerState(); // Clear state on completion
      return;
    }

    // Update counters based on current session completion
    const currentSession = sessionStructure.sessions[currentSessionIndex];
    const newCompletedPomodoros =
      currentSession.type === 'focus'
        ? completedPomodoros + 1
        : completedPomodoros;
    const newCompletedBreaks =
      currentSession.type === 'break' ? completedBreaks + 1 : completedBreaks;

    // Set up next session
    const nextSession = sessionStructure.sessions[nextSessionIndex];
    const newSessionTarget = nextSession.duration * 60;
    const newIsOnBreak = nextSession.type === 'break';
    const newBreakType = nextSession.subType || 'short';

    // Update state
    setCurrentSessionIndex(nextSessionIndex);
    setCurrentSessionTarget(newSessionTarget);
    setCurrentSessionTime(0);
    setIsOnBreak(newIsOnBreak);
    setCurrentBreakType(newBreakType);
    setCompletedPomodoros(newCompletedPomodoros);
    setCompletedBreaks(newCompletedBreaks);
    setSessionStartTime(Date.now());

    // Handle blocking based on session type
    if (nextSession.type === 'focus') {
      if (pomodoroSettings.autoStartFocusSessions) {
        await startPomodoroBlocking();
      }
    } else {
      await stopPomodoroBlocking();
    }

    // Save updated state
    await saveTimerState({
      currentSessionIndex: nextSessionIndex,
      currentSessionTarget: newSessionTarget,
      currentSessionTime: 0,
      isOnBreak: newIsOnBreak,
      currentBreakType: newBreakType,
      completedPomodoros: newCompletedPomodoros,
      completedBreaks: newCompletedBreaks,
      sessionStartTime: Date.now(),
      isTransitioning: true,
    });

    // Save intermediate progress to database periodically
    try {
      const completedTime = sessionStructure.sessions
        .slice(0, nextSessionIndex)
        .reduce((sum, session) => sum + session.duration * 60, 0);

      if (completedTime > 0) {
        await saveTimerCompletionToDatabase(completedTime, false);
      }
    } catch (error) {
      console.error('Error saving intermediate timer progress:', error);
    }

    setTimeout(async () => {
      if (!isCompleted) {
        setIsTransitioning(false);

        const shouldAutoStart =
          nextSession.type === 'break'
            ? pomodoroSettings.autoStartShortBreaks
            : pomodoroSettings.autoStartFocusSessions;

        if (shouldAutoStart) {
          setIsRunning(true);
          setTimerStartTime(Date.now());
        }

        // Save final transition state
        await saveTimerState({
          isTransitioning: false,
          isRunning: shouldAutoStart,
          timerStartTime: shouldAutoStart ? Date.now() : null,
        });
      }
    }, 2000);
  };

  // Enhanced main timer effect with better state persistence
  useEffect(() => {
    if (isTransitioning || !sessionStructure || !isStateLoaded) {
      return;
    }

    if (isRunning && currentSessionTime < currentSessionTarget) {
      timerRef.current = setTimeout(() => {
        const newTime = currentSessionTime + 1;
        setCurrentSessionTime(newTime);
        setLastUpdateTime(Date.now());

        // Save state every 30 seconds when running (reduced frequency to minimize database calls)
        if (newTime % 30 === 0) {
          saveTimerState({currentSessionTime: newTime});

          // Also save intermediate progress to database every minute
          if (newTime % 60 === 0) {
            const completedTime = sessionStructure
              ? sessionStructure.sessions
                  .slice(0, currentSessionIndex)
                  .reduce((sum, session) => sum + session.duration * 60, 0) +
                newTime
              : newTime;

            saveTimerCompletionToDatabase(completedTime, false).catch(
              console.error,
            );
          }
        }
      }, 1000);
    } else if (
      currentSessionTime >= currentSessionTarget &&
      !isCompleted &&
      !isTransitioning
    ) {
      startNextSession();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    isRunning,
    currentSessionTime,
    currentSessionTarget,
    currentSessionIndex,
    isTransitioning,
    sessionStructure,
    isStateLoaded,
  ]);

  const handleStartPause = async () => {
    if (isTransitioning || !sessionStructure) {
      return;
    }

    if (isCompleted) {
      await completeTaskAndNavigateHome();
      return;
    } else {
      const newRunningState = !isRunning;
      setIsRunning(newRunningState);

      if (newRunningState) {
        setTimerStartTime(Date.now());
        setSessionStartTime(Date.now());

        if (!isOnBreak) {
          await startPomodoroBlocking();
        }
      } else {
        setTimerStartTime(null);

        if (!isOnBreak) {
          await pausePomodoroBlocking();
        }

        // Save current progress when pausing
        try {
          const completedTime = sessionStructure
            ? sessionStructure.sessions
                .slice(0, currentSessionIndex)
                .reduce((sum, session) => sum + session.duration * 60, 0) +
              currentSessionTime
            : currentSessionTime;

          await saveTimerCompletionToDatabase(completedTime, false);
        } catch (error) {
          console.error('Error saving timer progress on pause:', error);
        }
      }

      // Save state immediately when starting/pausing
      await saveTimerState({
        isRunning: newRunningState,
        timerStartTime: newRunningState ? Date.now() : null,
      });

      setTimeout(async () => {
        if (PomodoroModule) {
          const currentBlockingState =
            await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(currentBlockingState);
        }
      }, 200);
    }
  };

  const handleStop = async () => {
    if (!sessionStructure) return;

    // Save current progress before stopping
    try {
      const completedTime = sessionStructure
        ? sessionStructure.sessions
            .slice(0, currentSessionIndex)
            .reduce((sum, session) => sum + session.duration * 60, 0) +
          currentSessionTime
        : currentSessionTime;

      if (completedTime > 0) {
        await saveTimerCompletionToDatabase(completedTime, false);
      }
    } catch (error) {
      console.error('Error saving timer progress on stop:', error);
    }

    setIsRunning(false);
    setIsTransitioning(false);
    setCurrentSessionTime(0);
    setCurrentSessionIndex(0);
    setTimerStartTime(null);
    setSessionStartTime(null);

    // Reset to first session
    if (sessionStructure.sessions.length > 0) {
      const firstSession = sessionStructure.sessions[0];
      setCurrentSessionTarget(firstSession.duration * 60);
      setIsOnBreak(firstSession.type === 'break');
      setCurrentBreakType(firstSession.subType || 'short');
    }

    setCompletedPomodoros(0);
    setCompletedBreaks(0);
    setIsCompleted(false);

    await stopPomodoroBlocking();
    await clearTimerState(); // Clear saved state on manual stop
  };

  const handleClose = async () => {
    if (isPomodoroBlocking) {
      await stopPomodoroBlocking();
    }

    // Save current state and progress before closing
    if (isStateLoaded) {
      await saveTimerState();

      // Also save current progress to database
      try {
        const completedTime = sessionStructure
          ? sessionStructure.sessions
              .slice(0, currentSessionIndex)
              .reduce((sum, session) => sum + session.duration * 60, 0) +
            currentSessionTime
          : currentSessionTime;

        if (completedTime > 0) {
          await saveTimerCompletionToDatabase(completedTime, false);
        }
      } catch (error) {
        console.error('Error saving timer progress on close:', error);
      }
    }

    navigation.navigate('BottomTab');
  };

  const handleCompletionAction = async () => {
    await completeTaskAndNavigateHome();
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getCurrentFocusSession = () => {
    if (!sessionStructure || !sessionStructure.sessions) return 1;

    let focusCount = 0;
    for (
      let i = 0;
      i <= currentSessionIndex && i < sessionStructure.sessions.length;
      i++
    ) {
      if (sessionStructure.sessions[i].type === 'focus') {
        focusCount++;
      }
    }

    // If current session is focus, we're in that session
    const currentSession = getCurrentSession();
    if (currentSession && currentSession.type === 'focus') {
      return focusCount;
    }

    // If current session is break, we've completed the previous focus session
    return focusCount;
  };

  const getCurrentBreakSession = () => {
    if (!sessionStructure || !sessionStructure.sessions) return 1;

    let breakCount = 0;
    for (
      let i = 0;
      i <= currentSessionIndex && i < sessionStructure.sessions.length;
      i++
    ) {
      if (sessionStructure.sessions[i].type === 'break') {
        breakCount++;
      }
    }

    // If current session is break, we're in that session
    const currentSession = getCurrentSession();
    if (currentSession && currentSession.type === 'break') {
      return breakCount;
    }

    // If current session is focus, return completed breaks
    return Math.max(0, breakCount);
  };

  // ADDED: Date formatting helper - same as TaskEvaluationScreen
  const getFormattedDate = () => {
    try {
      const date = new Date(selectedDate);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('PomodoroTimer - Date format error:', error);
      return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Show loading screen while initializing
  if (!sessionStructure || !isStateLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar backgroundColor="white" barStyle="dark-content" />
        <Text style={styles.loadingText}>Initializing timer...</Text>
        <Text style={styles.loadingSubText}>
          Total Duration: {Math.floor(getTotalDuration() / 60)} minutes
        </Text>
        <Text style={styles.loadingDateText}>
          {getFormattedDate()}
        </Text>
        {/* Show background timer indicator if timer is running */}
        {isRunning && (
          <View style={styles.backgroundTimerIndicator}>
            <Icon name="timer" size={WP(6)} color="#4CAF50" />
            <Text style={styles.backgroundTimerText}>
              Timer running in background
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      <View style={styles.mainContent}>
        {!isCompleted ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}>
                <Icon name="close" size={WP(6)} color={colors.Black} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                {taskData && (
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {taskData.title}
                  </Text>
                )}
                {/* ADDED: Date display - same as TaskEvaluationScreen */}
                <View style={styles.dateBackground}>
                  <Text style={styles.headerDate}>
                    {getFormattedDate()}
                  </Text>
                </View>
                {/* Background timer indicator */}
                {timerStartTime && isRunning && (
                  <View
                    style={[
                      styles.blockingIndicator,
                      {backgroundColor: '#E8F5E8'},
                    ]}>
                    <Icon name="schedule" size={WP(4)} color="#4CAF50" />
                    <Text style={[styles.blockingText, {color: '#4CAF50'}]}>
                      Running in background
                    </Text>
                  </View>
                )}
                {isTransitioning && (
                  <View
                    style={[
                      styles.blockingIndicator,
                      {backgroundColor: '#F0F8FF'},
                    ]}>
                    <Icon name="sync" size={WP(4)} color="#2196F3" />
                    <Text style={[styles.blockingText, {color: '#2196F3'}]}>
                      Transitioning...
                    </Text>
                  </View>
                )}
                {!isTransitioning && isPomodoroBlocking && !isOnBreak && (
                  <View style={styles.blockingIndicator}>
                    <Icon name="block" size={WP(4)} color="#FF6B35" />
                    <Text style={styles.blockingText}>
                      Apps Blocked
                      {excludedAppsCount > 0
                        ? ` (${excludedAppsCount} excluded)`
                        : ''}
                    </Text>
                  </View>
                )}
                {!isTransitioning &&
                  isRunning &&
                  !isPomodoroBlocking &&
                  !isOnBreak && (
                    <View
                      style={[
                        styles.blockingIndicator,
                        {backgroundColor: '#FFF8E1'},
                      ]}>
                      <Icon name="pause" size={WP(4)} color="#FFA726" />
                      <Text style={[styles.blockingText, {color: '#FFA726'}]}>
                        Session Paused
                      </Text>
                    </View>
                  )}
                {!isTransitioning && isOnBreak && (
                  <View
                    style={[
                      styles.blockingIndicator,
                      {backgroundColor: '#E8F5E8'},
                    ]}>
                    <Icon name="free-breakfast" size={WP(4)} color="#4CAF50" />
                    <Text style={[styles.blockingText, {color: '#4CAF50'}]}>
                      {currentBreakType === 'long' ? 'Long Break' : 'Break'}{' '}
                      Time
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sessionCounter}>
                <Text style={styles.sessionCounterText}>
                  {isOnBreak
                    ? `B${getCurrentBreakSession()}/${totalBreaks}`
                    : `S${getCurrentFocusSession()}/${totalPomodoros}`}
                </Text>
              </View>
            </View>

            <TimerDisplay
              sessionStructure={sessionStructure}
              currentSessionTime={currentSessionTime}
              currentSessionTarget={currentSessionTarget}
              isOnBreak={isOnBreak}
              currentBreakType={currentBreakType}
              isTransitioning={isTransitioning}
              isRunning={isRunning}
              isPomodoroBlocking={isPomodoroBlocking}
              excludedAppsCount={excludedAppsCount}
              remainingTaskTime={remainingTaskTime}
              totalPomodoros={totalPomodoros}
              totalBreaks={totalBreaks}
              completedPomodoros={completedPomodoros}
              completedBreaks={completedBreaks}
              currentSessionIndex={currentSessionIndex}
              totalTaskDuration={totalTaskDuration}
            />

            <SessionControls
              isRunning={isRunning}
              isTransitioning={isTransitioning}
              isPomodoroBlocking={isPomodoroBlocking}
              isOnBreak={isOnBreak}
              onStartPause={handleStartPause}
              onStop={handleStop}
            />
          </>
        ) : (
          <CompletionScreen
            taskData={taskData}
            totalPomodoros={totalPomodoros}
            totalBreaks={totalBreaks}
            sessionStructure={sessionStructure}
            totalTaskDuration={totalTaskDuration}
            selectedDate={selectedDate}
            completionDate={completionDate}
            onComplete={handleCompletionAction}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(2),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  loadingSubText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(2),
  },
  backgroundTimerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    borderRadius: WP(6),
    gap: WP(2),
    marginTop: HP(2),
  },
  backgroundTimerText: {
    fontSize: FS(1.4),
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(5),
    paddingVertical: HP(2),
    paddingTop: HP(4),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: FS(1.6),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    marginBottom: HP(0.5),
    paddingHorizontal: WP(2),
  },
  blockingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.5),
    borderRadius: WP(4),
    gap: WP(1),
    marginBottom: WP(2),
  },
  blockingText: {
    fontSize: FS(1.4),
    fontFamily: 'Inter-Medium',
    color: '#FF6B35',
  },
  closeButton: {
    padding: WP(2),
    backgroundColor: '#F5F5F5',
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCounter: {
    padding: WP(2),
    backgroundColor: '#F5F5F5',
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCounterText: {
    fontSize: FS(1.6),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
  },
});

export default PomodoroTimerScreen;
