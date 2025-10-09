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
import {getCompletionDateString} from '../../utils/dateUtils';
import LottieView from 'lottie-react-native';
import SessionControls from '../../Components/SessionControls';

import TotalTaskBackgroundSvg from '../../assets/Images/Pomodoro-screen/grey-bttn.svg';
import CompletedTaskBackgroundSvg from '../../assets/Images/Pomodoro-screen/grey-bttn.svg';
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

const {PomodoroModule} = NativeModules;

const PomoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Get task data from navigation params
  const taskData = route.params?.task;
  const taskId = taskData?.id;
  const selectedDate = route.params?.selectedDate || new Date().toDateString();

  // Core timer state
  const [activeTab, setActiveTab] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [completedBreaks, setCompletedBreaks] = useState(0);
  // FIXED: Added separate tracking for short and long breaks
  const [completedShortBreaks, setCompletedShortBreaks] = useState(0);
  const [completedLongBreaks, setCompletedLongBreaks] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(0);
  const [totalShortBreaks, setTotalShortBreaks] = useState(0);
  const [totalLongBreaks, setTotalLongBreaks] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

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

  // ADDED: Animation state and progress tracking
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
  // FIXED: Added continuous save interval
  const continuousSaveRef = useRef(null);

  // ADDED: Animation refs for controlling Lottie animations
  const timerAnimationRef = useRef(null);
  const flowerAnimationRef = useRef(null);
  const animationProgressRef = useRef(0);

  const completionDate = React.useMemo(() => {
    return getCompletionDateString(selectedDate);
  }, [selectedDate]);

  // Get Pomodoro settings from task data
  const getPomodoroSettings = useCallback(() => {
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

    return {
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
  }, [taskData]);

  // Get total duration from task
  const getTotalDuration = useCallback(() => {
    if (taskData?.pomodoro_duration) {
      return taskData.pomodoro_duration * 60;
    }
    if (taskData?.duration_data?.totalMinutes) {
      return taskData.duration_data.totalMinutes * 60;
    }
    if (taskData?.durationData?.totalMinutes) {
      return taskData.durationData.totalMinutes * 60;
    }
    return 120 * 60; // Default 2 hours
  }, [taskData]);

  const updateAnimationProgress = useCallback(() => {
    if (targetTime <= 0) {
      setAnimationProgress(0);
      animationProgressRef.current = 0;
      return;
    }

    const timerProgress = Math.min(Math.max(currentTime / targetTime, 0), 1);

    // Map timer progress (0-100%) to animation progress (0-83%)
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

    // Don't manually reset refs - React will handle it via props
    console.log('Animations reset for new session');
  }, []);

  // Calculate session structure
  const calculateSessionStructure = useCallback(() => {
    const settings = getPomodoroSettings();
    const totalDurationSeconds = getTotalDuration();
    const totalDurationMinutes = totalDurationSeconds / 60;

    const focusMinutes = settings.focusTime;
    const shortBreakMinutes = settings.shortBreak;
    const longBreakMinutes = settings.longBreak;
    const focusSessionsPerRound = settings.focusSessionsPerRound;

    let sessions = [];
    let remainingMinutes = totalDurationMinutes;
    let focusSessionCount = 0;
    let sessionsInCurrentRound = 0;
    let shortBreakCount = 0;
    let longBreakCount = 0;
    let breakCount = 0;

    while (remainingMinutes > 0 && focusSessionCount < 50) {
      const minimumFocusTime = Math.min(focusMinutes, 5);
      if (remainingMinutes < minimumFocusTime) {
        break;
      }

      focusSessionCount++;
      sessionsInCurrentRound++;

      let focusSessionDuration;
      if (sessionsInCurrentRound < focusSessionsPerRound) {
        focusSessionDuration = Math.min(focusMinutes, remainingMinutes);
      } else {
        const timeAfterLongBreak = remainingMinutes - longBreakMinutes;
        if (timeAfterLongBreak >= minimumFocusTime) {
          focusSessionDuration = timeAfterLongBreak;
        } else {
          focusSessionDuration = remainingMinutes;
        }
      }

      sessions.push({
        type: 'focus',
        number: focusSessionCount,
        duration: Math.round(focusSessionDuration * 100) / 100,
        id: `focus_${focusSessionCount}`,
      });
      remainingMinutes -= focusSessionDuration;
      remainingMinutes = Math.max(0, remainingMinutes);

      if (remainingMinutes > 0) {
        let breakDuration = 0;
        let breakType = 'short';

        if (sessionsInCurrentRound === focusSessionsPerRound) {
          breakType = 'long';
          if (remainingMinutes >= longBreakMinutes) {
            breakDuration = longBreakMinutes;
            longBreakCount++;
          } else if (remainingMinutes >= shortBreakMinutes) {
            breakDuration = shortBreakMinutes;
            breakType = 'short';
            shortBreakCount++;
          } else if (remainingMinutes >= 2) {
            breakDuration = remainingMinutes;
            breakType = 'short';
            shortBreakCount++;
          }
        } else {
          if (remainingMinutes >= shortBreakMinutes) {
            breakDuration = shortBreakMinutes;
            shortBreakCount++;
          } else if (remainingMinutes >= 2) {
            breakDuration = remainingMinutes;
            shortBreakCount++;
          }
        }

        if (breakDuration > 0) {
          breakCount++;
          const breakNumber =
            breakType === 'long' ? longBreakCount : shortBreakCount;
          sessions.push({
            type: 'break',
            subType: breakType,
            duration: breakDuration,
            number: breakNumber,
            id: `break_${breakCount}_${breakType}`,
          });
          remainingMinutes -= breakDuration;
          remainingMinutes = Math.max(0, remainingMinutes);

          if (breakType === 'long') {
            sessionsInCurrentRound = 0;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const focusSessions = sessions.filter(s => s.type === 'focus');
    const shortBreaks = sessions.filter(
      s => s.type === 'break' && s.subType === 'short',
    );
    const longBreaks = sessions.filter(
      s => s.type === 'break' && s.subType === 'long',
    );

    console.log('Session structure calculated:', {
      totalSessions: sessions.length,
      focusSessions: focusSessions.length,
      shortBreaks: shortBreaks.length,
      longBreaks: longBreaks.length,
      totalBreaks: breakCount,
      sessions: sessions.map(s => ({
        type: s.type,
        subType: s.subType,
        duration: s.duration,
      })),
    });

    return {
      sessions: sessions,
      totalFocusSessions: focusSessions.length,
      totalShortBreaks: shortBreaks.length,
      totalLongBreaks: longBreaks.length,
      totalBreaks: breakCount,
      focusMinutes: settings.focusTime,
      shortBreakMinutes: settings.shortBreak,
      longBreakMinutes: settings.longBreak,
      focusSessionsPerRound: settings.focusSessionsPerRound,
      usedMinutes: sessions.reduce((sum, session) => sum + session.duration, 0),
    };
  }, [getPomodoroSettings, getTotalDuration]);

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

  // FIXED: Enhanced save function with proper state tracking
  const saveTimerCompletion = useCallback(
    async (
      totalCompletedSeconds,
      isSessionCompleted = false,
      sessionType = null,
      forceImmediate = false,
      updatedCounters = null,
    ) => {
      if (!taskId || !user || !sessionStructure) return;

      const now = Date.now();

      // Save every second when running, or immediately when forced
      const saveInterval = forceImmediate ? 0 : isRunning ? 1000 : 5000;
      if (
        !isSessionCompleted &&
        !forceImmediate &&
        now - lastSaveRef.current < saveInterval
      )
        return;
      lastSaveRef.current = now;

      try {
        // Use updated counters if provided, otherwise use current state
        const currentCompletedPomodoros =
          updatedCounters?.completedPomodoros ?? completedPomodoros;
        const currentCompletedBreaks =
          updatedCounters?.completedBreaks ?? completedBreaks;
        const currentCompletedShortBreaks =
          updatedCounters?.completedShortBreaks ?? completedShortBreaks;
        const currentCompletedLongBreaks =
          updatedCounters?.completedLongBreaks ?? completedLongBreaks;

        // Calculate completed sessions detail
        const completedSessions = sessionStructure.sessions.slice(
          0,
          currentSessionIndex,
        );
        const currentSession = sessionStructure.sessions[currentSessionIndex];

        // Track individual session completions
        const sessionCompletions = {};
        completedSessions.forEach(session => {
          sessionCompletions[session.id] = {
            type: session.type,
            subType: session.subType,
            duration: session.duration,
            completed: true,
            completedAt: now,
          };
        });

        // If current session is completed, add it
        if (isSessionCompleted && currentSession) {
          sessionCompletions[currentSession.id] = {
            type: currentSession.type,
            subType: currentSession.subType,
            duration: currentSession.duration,
            completed: true,
            completedAt: now,
          };
        }

        // Enhanced timer value data with proper break tracking and animation progress
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
          isFullyCompleted: isCompleted,
          currentSessionType: currentSession?.type || 'focus',
          currentSessionSubType: currentSession?.subType || null,
          // ADDED: Save animation progress
          animationProgress: animationProgressRef.current,
          sessionStartTime: sessionStartTime,
        };

        console.log('Saving timer completion:', {
          isSessionCompleted,
          sessionType,
          currentSessionIndex,
          completedPomodoros: currentCompletedPomodoros,
          completedBreaks: currentCompletedBreaks,
          completedShortBreaks: currentCompletedShortBreaks,
          completedLongBreaks: currentCompletedLongBreaks,
          sessionCompletionsCount: Object.keys(sessionCompletions).length,
          actualCompletedTime: totalCompletedSeconds,
          forceImmediate,
          animationProgress: animationProgressRef.current,
        });

        await taskCompletionsService.upsertTimerCompletion(
          taskId,
          user.id,
          completionDate,
          timerValueData,
          isCompleted,
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
      isCompleted,
      isRunning,
      sessionStartTime,
    ],
  );

  // FIXED: Calculate total completed time properly
  const getTotalCompletedTime = useCallback(() => {
    if (!sessionStructure) return currentTime;

    // Calculate time from fully completed sessions
    const completedSessionsTime = sessionStructure.sessions
      .slice(0, currentSessionIndex)
      .reduce((sum, session) => sum + Math.floor(session.duration * 60), 0);

    // Add current session progress
    const currentSessionTime = currentTime;

    const totalTime = completedSessionsTime + currentSessionTime;
    console.log('Total time calculation:', {
      completedSessionsTime,
      currentSessionTime,
      totalTime,
      currentSessionIndex,
      sessionStructure: sessionStructure.sessions.length,
    });

    return totalTime;
  }, [sessionStructure, currentSessionIndex, currentTime]);

  // FIXED: Initialize session structure and restore state properly
  useEffect(() => {
    const initializeSessionStructure = async () => {
      if (!taskData) {
        console.log('No task data available for session structure');
        return;
      }

      const structure = calculateSessionStructure();
      console.log('Session structure created:', structure);
      setSessionStructure(structure);
      setTotalPomodoros(structure.totalFocusSessions);
      setTotalBreaks(structure.totalBreaks);
      setTotalShortBreaks(structure.totalShortBreaks);
      setTotalLongBreaks(structure.totalLongBreaks);

      // Try to restore state from database first
      const existingCompletion = await loadTimerCompletion();

      if (existingCompletion?.timer_value && !existingCompletion.is_completed) {
        const timerData = existingCompletion.timer_value;
        console.log('RESTORING STATE from database:', timerData);

        // Restore all state from database
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
        // FIXED: Restore break type counts
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
        // ADDED: Restore animation progress
        if (timerData.animationProgress !== undefined) {
          setAnimationProgress(timerData.animationProgress);
          animationProgressRef.current = timerData.animationProgress;
        }
        if (timerData.sessionStartTime !== undefined) {
          setSessionStartTime(timerData.sessionStartTime);
        }

        console.log('State RESTORED from database:', {
          currentSessionIndex: timerData.currentSessionIndex,
          currentTime: timerData.currentTime,
          targetTime: timerData.targetTime,
          completedPomodoros: timerData.completedPomodoros,
          completedBreaks: timerData.completedBreaks,
          completedShortBreaks: timerData.completedShortBreaks,
          completedLongBreaks: timerData.completedLongBreaks,
          isOnBreak: timerData.isOnBreak,
          animationProgress: timerData.animationProgress,
        });

        initializationRef.current = true;
      } else {
        // Initialize first session for new tasks
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
          // ADDED: Initialize animation state for new session
          setAnimationProgress(0);
          setSessionStartTime(Date.now());
          animationProgressRef.current = 0;

          initializationRef.current = true;
        }
      }
    };

    initializeSessionStructure();
  }, [taskData, calculateSessionStructure, loadTimerCompletion]);

  // ADDED: Update animations when currentTime or targetTime changes
  useEffect(() => {
    updateAnimationProgress();
  }, [currentTime, targetTime, updateAnimationProgress]);

  // CORE TIMER with better completion handling
  useEffect(() => {
    let intervalId = null;

    if (isRunning && !isCompleted && !isTransitioning && targetTime > 0) {
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
  }, [isRunning, isCompleted, isTransitioning, targetTime]);

  // FIXED: Continuous save every second when running
  useEffect(() => {
    if (continuousSaveRef.current) {
      clearInterval(continuousSaveRef.current);
      continuousSaveRef.current = null;
    }

    if (isRunning && !isCompleted && currentTime >= 0) {
      continuousSaveRef.current = setInterval(() => {
        const totalTime = getTotalCompletedTime();
        saveTimerCompletion(totalTime, false, null, false); // Not forced, will save every second
      }, 1000); // Save every second
    }

    return () => {
      if (continuousSaveRef.current) {
        clearInterval(continuousSaveRef.current);
        continuousSaveRef.current = null;
      }
    };
  }, [
    isRunning,
    isCompleted,
    currentTime,
    getTotalCompletedTime,
    saveTimerCompletion,
  ]);

  // FIXED: Enhanced session completion handling with proper state updates and completion tracking
  const handleSessionCompletion = useCallback(async () => {
    if (!sessionStructure || isTransitioning || !sessionCompletionRef.current) {
      console.log('Cannot complete session - conditions not met', {
        hasStructure: !!sessionStructure,
        isTransitioning,
        canComplete: sessionCompletionRef.current,
      });
      return;
    }

    console.log('Handling session completion');
    console.log('Session completing - setting animation to 100%');
    setAnimationProgress(1.0);
    animationProgressRef.current = 1.0;

    setIsRunning(false);
    setIsTransitioning(true);

    const currentSession = sessionStructure.sessions[currentSessionIndex];
    const nextSessionIndex = currentSessionIndex + 1;
    const pomodoroSettings = getPomodoroSettings();

    // FIXED: Calculate total time including full current session duration
    const completedSessionsTime = sessionStructure.sessions
      .slice(0, currentSessionIndex)
      .reduce((sum, session) => sum + Math.floor(session.duration * 60), 0);

    // Add the FULL current session duration (not just currentTime)
    const currentSessionFullTime = Math.floor(currentSession.duration * 60);
    const totalTimeWithCurrentSession =
      completedSessionsTime + currentSessionFullTime;

    console.log('Session completion time calculation:', {
      completedSessionsTime,
      currentSessionFullTime,
      totalTimeWithCurrentSession,
      currentSession: currentSession,
    });

    // Update counters FIRST, then use them in save
    let newCompletedPomodoros = completedPomodoros;
    let newCompletedBreaks = completedBreaks;
    let newCompletedShortBreaks = completedShortBreaks;
    let newCompletedLongBreaks = completedLongBreaks;

    if (currentSession.type === 'focus') {
      newCompletedPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(newCompletedPomodoros);
      console.log(
        'Focus session completed. Pomodoros:',
        completedPomodoros,
        '->',
        newCompletedPomodoros,
      );
    } else if (currentSession.type === 'break') {
      newCompletedBreaks = completedBreaks + 1;
      setCompletedBreaks(newCompletedBreaks);

      // FIXED: Update break type counts immediately
      if (currentSession.subType === 'long') {
        newCompletedLongBreaks = completedLongBreaks + 1;
        setCompletedLongBreaks(newCompletedLongBreaks);
        console.log(
          'LONG break session completed. Long breaks:',
          completedLongBreaks,
          '->',
          newCompletedLongBreaks,
        );
      } else {
        newCompletedShortBreaks = completedShortBreaks + 1;
        setCompletedShortBreaks(newCompletedShortBreaks);
        console.log(
          'Short break session completed. Short breaks:',
          completedShortBreaks,
          '->',
          newCompletedShortBreaks,
        );
      }
      console.log(
        'Break session completed. Total breaks:',
        completedBreaks,
        '->',
        newCompletedBreaks,
      );
      console.log('Break type:', currentSession.subType);
    }

    // Check if all sessions completed
    if (nextSessionIndex >= sessionStructure.sessions.length) {
      console.log('All sessions completed!');
      setIsCompleted(true);
      sessionCompletionRef.current = false;

      // Stop blocking
      if (PomodoroModule) {
        try {
          await PomodoroModule.stopPomodoroBlocking();
          setIsPomodoroBlocking(false);
        } catch (error) {
          console.error('Error stopping blocking:', error);
        }
      }

      // FIXED: Save with updated values and mark as completed
      const completionSaveData = {
        totalSeconds: totalTimeWithCurrentSession,
        completedPomodoros: newCompletedPomodoros,
        completedBreaks: newCompletedBreaks,
        completedShortBreaks: newCompletedShortBreaks,
        completedLongBreaks: newCompletedLongBreaks,
        totalPomodoros,
        totalBreaks,
        totalShortBreaks: sessionStructure.totalShortBreaks,
        totalLongBreaks: sessionStructure.totalLongBreaks,
        currentSessionIndex: nextSessionIndex, // Mark as completed
        currentTime: 0,
        targetTime: 0,
        isOnBreak: false,
        currentBreakType: 'short',
        sessionStructure: sessionStructure,
        completionDate: completionDate,
        lastUpdateTime: Date.now(),
        lastSessionType: 'completed',
        isSessionCompleted: true,
        actualCompletedTime: totalTimeWithCurrentSession,
        isFullyCompleted: true,
        // ADDED: Final animation state
        animationProgress: 1, // Mark animations as complete
        sessionStartTime: sessionStartTime,
      };

      // FIXED: Use custom save for final completion to ensure isCompleted flag
      try {
        await taskCompletionsService.upsertTimerCompletion(
          taskId,
          user.id,
          completionDate,
          completionSaveData,
          true, // Mark task as completed
        );
        console.log('Final completion saved successfully');
      } catch (error) {
        console.error('Error saving final completion:', error);
      }

      setTimeout(() => {
        navigation.replace('AchievementScreen', {
          taskData,
          sessionStructure,
          totalPomodoros,
          completedPomodoros: newCompletedPomodoros,
          totalBreaks,
          completedBreaks: newCompletedBreaks,
          totalShortBreaks: sessionStructure.totalShortBreaks,
          totalLongBreaks: sessionStructure.totalLongBreaks,
          completedShortBreaks: newCompletedShortBreaks,
          completedLongBreaks: newCompletedLongBreaks,
          selectedDate,
          totalCompletedTime: totalTimeWithCurrentSession,
          completionDate,
          timerData: completionSaveData,
        });
      }, 1000);
      return;
    }

    // FIXED: Save current completion with updated values before setting up next session
    await saveTimerCompletion(
      totalTimeWithCurrentSession,
      true,
      currentSession.type,
      true,
    );

    // Setup next session
    const nextSession = sessionStructure.sessions[nextSessionIndex];
    console.log('Setting up next session:', nextSession);

    setCurrentSessionIndex(nextSessionIndex);
    setCurrentTime(0);
    setTargetTime(Math.floor(nextSession.duration * 60));
    setIsOnBreak(nextSession.type === 'break');
    setCurrentBreakType(nextSession.subType || 'short');

    // ADDED: Reset animations for new session
    resetAnimationsForNewSession();

    // Reset completion flag for next session
    sessionCompletionRef.current = false;

    // Transition delay then auto-start if configured
    setTimeout(() => {
      setIsTransitioning(false);

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
    getPomodoroSettings,
    saveTimerCompletion,
    totalPomodoros,
    totalBreaks,
    taskData,
    selectedDate,
    completionDate,
    navigation,
    taskId,
    user,
    sessionStartTime,
    resetAnimationsForNewSession,
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

  // Blocking control
  useEffect(() => {
    if (!isLoaded || targetTime === 0) return;

    if (blockingTimeoutRef.current) {
      clearTimeout(blockingTimeoutRef.current);
      blockingTimeoutRef.current = null;
    }

    blockingTimeoutRef.current = setTimeout(() => {
      const shouldBlock =
        isRunning && !isOnBreak && !isCompleted && !isTransitioning;
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
    isCompleted,
    isTransitioning,
    isLoaded,
    targetTime,
    managePomodoroBlocking,
  ]);

  // Background time handling
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      const now = Date.now();

      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        if (isRunning && !isCompleted) {
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
        if (isRunning && !isCompleted && backgroundTimeRef.current) {
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
  }, [isRunning, isCompleted, targetTime, handleSessionCompletion]);

  // Load state on focus with better completion detection
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

        const existingCompletion = await loadTimerCompletion();
        console.log('Existing completion check:', existingCompletion);

        // FIXED: Check for completion more thoroughly
        if (
          existingCompletion?.is_completed ||
          existingCompletion?.timer_value?.isFullyCompleted ||
          existingCompletion?.timer_value?.currentSessionIndex >=
            existingCompletion?.timer_value?.sessionStructure?.sessions?.length
        ) {
          console.log(
            'Task already completed, navigating to achievement screen',
          );

          // Extract data for achievement screen
          const timerData = existingCompletion.timer_value;
          setTimeout(() => {
            navigation.replace('AchievementScreen', {
              taskData,
              sessionStructure: timerData.sessionStructure,
              totalPomodoros: timerData.totalPomodoros || 0,
              completedPomodoros: timerData.completedPomodoros || 0,
              totalBreaks: timerData.totalBreaks || 0,
              completedBreaks: timerData.completedBreaks || 0,
              totalShortBreaks: timerData.totalShortBreaks || 0,
              totalLongBreaks: timerData.totalLongBreaks || 0,
              completedShortBreaks: timerData.completedShortBreaks || 0,
              completedLongBreaks: timerData.completedLongBreaks || 0,
              selectedDate,
              totalCompletedTime:
                timerData.actualCompletedTime || timerData.totalSeconds || 0,
              completionDate,
              timerData: timerData,
            });
          }, 500);

          isLoadingStateRef.current = false;
          return;
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
      navigation,
      selectedDate,
    ]),
  );

  // Handle play/pause
  const handlePlayPause = useCallback(async () => {
    console.log('Play/pause clicked, current state:', {
      isRunning,
      isCompleted,
      targetTime,
      isLoaded,
      sessionStructure: !!sessionStructure,
      taskData: !!taskData,
    });

    if (isCompleted) {
      const totalTime = getTotalCompletedTime();
      navigation.replace('AchievementScreen', {
        taskData,
        sessionStructure,
        totalPomodoros,
        completedPomodoros: totalPomodoros,
        totalBreaks,
        completedBreaks: totalBreaks,
        totalShortBreaks,
        totalLongBreaks,
        completedShortBreaks,
        completedLongBreaks,
        selectedDate,
        totalCompletedTime: totalTime,
        completionDate,
      });
      return;
    }

    // Enhanced validation
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

    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
    console.log('Timer state changed to:', newRunningState);

    if (!newRunningState) {
      const totalTime = getTotalCompletedTime();
      saveTimerCompletion(totalTime, false, null, true);
    }
  }, [
    isRunning,
    isCompleted,
    targetTime,
    isLoaded,
    sessionStructure,
    taskData,
    getTotalCompletedTime,
    saveTimerCompletion,
    totalPomodoros,
    totalBreaks,
    totalShortBreaks,
    totalLongBreaks,
    completedShortBreaks,
    completedLongBreaks,
    selectedDate,
    completionDate,
    navigation,
  ]);

  // IMPROVED: Handle skip with proper session completion
  const handleSkip = useCallback(() => {
    if (isCompleted || targetTime === 0 || isTransitioning) return;

    console.log('Skipping session');

    sessionCompletionRef.current = true;
    setCurrentTime(targetTime);

    setTimeout(() => {
      handleSessionCompletion();
    }, 100);
  }, [isCompleted, targetTime, isTransitioning, handleSessionCompletion]);

  // Handle end
  const handleEnd = useCallback(async () => {
    console.log('Ending timer session');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (continuousSaveRef.current) {
      clearInterval(continuousSaveRef.current);
      continuousSaveRef.current = null;
    }

    if (currentTime > 0) {
      const totalTime = getTotalCompletedTime();
      await saveTimerCompletion(totalTime, false, null, true);
    }

    if (PomodoroModule) {
      try {
        await PomodoroModule.stopPomodoroBlocking();
      } catch (error) {
        console.error('Error stopping blocking on end:', error);
      }
    }

    setIsRunning(false);
    backgroundTimeRef.current = null;
    sessionCompletionRef.current = false;
    navigation.navigate('BottomTab', {screen: 'Home'});
  }, [currentTime, getTotalCompletedTime, saveTimerCompletion, navigation]);

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
    const settings = getPomodoroSettings();
    return `${settings.focusTime.toString().padStart(2, '0')}:00`;
  };

  // Handle tab press
  const handleTabPress = tabIndex => {
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
        activeOpacity={0.7}>
        <IconComponent
          width={WP(12)}
          height={WP(12)}
          style={styles.tabIcon}
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
        display: `Focus ${session.number}`,
        session: session,
      };
    } else {
      return {
        type: 'break',
        display: `${session.subType === 'long' ? 'Long' : 'Short'} Break`,
        session: session,
      };
    }
  };

  const handleTimerAnimationFinish = useCallback(() => {
    console.log('Timer animation reached natural end - ignoring');
    // Do nothing - let progress prop control the animation
  }, []);

  const handleFlowerAnimationFinish = useCallback(() => {
    console.log('Flower animation reached natural end - ignoring');
    // Do nothing - let progress prop control the animation
  }, []);

  // Loading screen
  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#000000" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing timer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentSessionInfo = getCurrentSessionInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

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
              onAnimationFinish={() => {}} // Empty function to prevent restarts
              hardwareAccelerationAndroid={true}
            />
            <View style={styles.timerOverlay}>
              <Text style={[styles.timerText, {color: colors.White}]}>
                {getDisplayTime()}
              </Text>
            </View>
          </View>
        </View>

        {/* FIXED: Task Section with proper break tracking display */}
        <View style={styles.taskSection}>
          <View style={styles.taskCard}>
            <TotalTaskBackgroundSvg
              width={WP(17)}
              height={HP(8.5)}
              style={styles.taskBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.taskOverlay}>
              <Text style={styles.taskNumber}>{totalPomodoros}</Text>
            </View>
            <Text style={styles.taskLabel}>Total Task</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.pomodoroTitle}>Pomodoro</Text>
          </View>

          <View style={styles.taskCard}>
            <CompletedTaskBackgroundSvg
              width={WP(17)}
              height={HP(8.5)}
              style={styles.taskBackground}
              preserveAspectRatio="none"
            />
            <View style={styles.taskOverlay}>
              <Text style={styles.taskNumber}>
                {completedPomodoros}/{totalPomodoros}
              </Text>
            </View>
            <Text style={styles.taskLabel}>Completed Task</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <SessionControls
          isRunning={isRunning}
          isTransitioning={isTransitioning}
          isPomodoroBlocking={isPomodoroBlocking}
          isOnBreak={isOnBreak}
          isCompleted={isCompleted}
          onStartPause={handlePlayPause}
          onStop={handleEnd}
          onSkip={handleSkip}
        />

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
            onAnimationFinish={() => {}} // Empty function to prevent restarts
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
  taskSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(2.5),
    paddingHorizontal: WP(4),
  },
  taskCard: {
    position: 'relative',
    width: WP(17),
    height: HP(8.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  taskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: HP(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  taskNumber: {
    fontSize: FS(1.8),
    fontFamily: 'Poppins-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    marginTop: WP(6),
  },
  taskLabel: {
    fontSize: FS(1.2),
    fontFamily: 'Poppins-SemiBold',
    color: '#B8FEFD',
    textAlign: 'center',
    position: 'absolute',
    bottom: HP(-2),
    marginLeft: WP(-4),
  },
  titleSection: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: WP(5),
  },
  pomodoroTitle: {
    fontSize: FS(3.7),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
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
});

export default PomoScreen;