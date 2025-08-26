import React, {useRef, useEffect} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const TimerDisplay = ({
  sessionStructure,
  currentSessionTime,
  currentSessionTarget,
  isOnBreak,
  currentBreakType,
  isTransitioning,
  isRunning,
  isPomodoroBlocking,
  excludedAppsCount,
  remainingTaskTime,
  totalPomodoros,
  totalBreaks,
  completedPomodoros,
  completedBreaks,
  currentSessionIndex,
  totalTaskDuration,
}) => {
  const focusIndicatorRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRunning && !isOnBreak && !isTransitioning) {
      const rotateAnimation = Animated.loop(
        Animated.timing(focusIndicatorRotate, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotateAnimation.start();

      return () => rotateAnimation.stop();
    } else {
      focusIndicatorRotate.setValue(0);
    }
  }, [isRunning, isOnBreak, isTransitioning]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getProgress = () => {
    return (currentSessionTime / currentSessionTarget) * 100;
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

    const currentSession = sessionStructure.sessions[currentSessionIndex];
    if (currentSession && currentSession.type === 'focus') {
      return focusCount;
    }

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

    const currentSession = sessionStructure.sessions[currentSessionIndex];
    if (currentSession && currentSession.type === 'break') {
      return breakCount;
    }

    return Math.max(0, breakCount);
  };

  const getStatusText = () => {
    if (isTransitioning) {
      return !isOnBreak
        ? 'Break session ending... Preparing for next focus session'
        : 'Focus session complete! Starting break in a moment...';
    }

    if (isOnBreak && isRunning) {
      const breakTypeText =
        currentBreakType === 'long' ? 'Long break' : 'Short break';
      return `${breakTypeText} - Relax and recharge`;
    } else if (isOnBreak && !isRunning) {
      const breakTypeText =
        currentBreakType === 'long' ? 'Long break' : 'Short break';
      return `${breakTypeText} - Paused`;
    } else if (isRunning && isPomodoroBlocking) {
      const excludedText =
        excludedAppsCount > 0 ? ` • ${excludedAppsCount} apps excluded` : '';
      return `Focus session ${getCurrentFocusSession()} of ${totalPomodoros} - Apps blocked${excludedText}`;
    } else if (isRunning && !isPomodoroBlocking && !isOnBreak) {
      return 'Focus session paused - Apps accessible';
    } else if (isRunning) {
      return `Session ${getCurrentFocusSession()} of ${totalPomodoros} in progress...`;
    } else if (isPomodoroBlocking) {
      return 'Apps blocked - Session paused';
    } else {
      const totalMinutes = sessionStructure
        ? sessionStructure.usedMinutes
        : Math.floor(totalTaskDuration / 60);
      return `Pomodoro Timer - ${totalPomodoros} sessions + ${totalBreaks} breaks (${totalMinutes} min total)`;
    }
  };

  const getSessionTypeText = () => {
    if (isTransitioning) {
      return !isOnBreak ? 'Break Ending...' : 'Session Complete!';
    }

    if (isOnBreak) {
      const breakTypeText =
        currentBreakType === 'long' ? 'Long Break' : 'Short Break';
      const breakNumber = getCurrentBreakSession();
      return `${breakTypeText} ${breakNumber}`;
    } else {
      return `Focus Session ${getCurrentFocusSession()} of ${totalPomodoros}`;
    }
  };

  const getProgressSummary = () => {
    const workProgress = `Sessions: ${completedPomodoros}/${totalPomodoros}`;
    const breakProgress = `Breaks: ${completedBreaks}/${totalBreaks}`;
    const completedTime = sessionStructure
      ? sessionStructure.sessions
          .slice(0, currentSessionIndex)
          .reduce((sum, session) => sum + session.duration, 0) +
        Math.floor(currentSessionTime / 60)
      : 0;
    const totalMinutes = sessionStructure
      ? sessionStructure.usedMinutes
      : Math.floor(totalTaskDuration / 60);
    const timeProgress = `Time: ${completedTime}/${totalMinutes} min`;

    return `${workProgress} • ${breakProgress} • ${timeProgress}`;
  };

  const rotateInterpolate = focusIndicatorRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.sessionTypeText}>{getSessionTypeText()}</Text>

      <Animated.View
        style={[
          styles.focusIndicatorContainer,
          {transform: [{rotate: rotateInterpolate}]},
        ]}>
        <View
          style={[
            styles.focusIcon,
            isTransitioning && styles.focusIconTransition,
            !isTransitioning &&
              isPomodoroBlocking &&
              !isOnBreak &&
              styles.focusIconBlocked,
            !isTransitioning &&
              isRunning &&
              !isPomodoroBlocking &&
              !isOnBreak &&
              styles.focusIconPaused,
            !isTransitioning && isOnBreak && styles.focusIconBreak,
          ]}>
          <Icon
            name={
              isTransitioning
                ? 'sync'
                : isOnBreak
                ? currentBreakType === 'long'
                  ? 'schedule'
                  : 'free-breakfast'
                : 'center-focus-strong'
            }
            size={WP(15)}
            color={
              isTransitioning
                ? '#2196F3'
                : isOnBreak
                ? '#4CAF50'
                : isPomodoroBlocking
                ? '#FF6B35'
                : isRunning && !isPomodoroBlocking
                ? '#FFA726'
                : colors.Black
            }
          />
        </View>
      </Animated.View>

      <Text style={styles.timerText}>
        {isTransitioning
          ? '00:00'
          : formatTime(currentSessionTarget - currentSessionTime)}
      </Text>

      <Text
        style={[
          styles.statusText,
          isTransitioning && styles.statusTextTransition,
          !isTransitioning && isPomodoroBlocking && styles.statusTextBlocked,
          !isTransitioning &&
            isRunning &&
            !isPomodoroBlocking &&
            styles.statusTextPaused,
          !isTransitioning && isOnBreak && styles.statusTextBreak,
        ]}>
        {getStatusText()}
      </Text>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {width: isTransitioning ? '100%' : `${getProgress()}%`},
            isTransitioning && styles.progressBarTransition,
            !isTransitioning &&
              isPomodoroBlocking &&
              !isOnBreak &&
              styles.progressBarBlocked,
            !isTransitioning &&
              isRunning &&
              !isPomodoroBlocking &&
              !isOnBreak &&
              styles.progressBarPaused,
            !isTransitioning && isOnBreak && styles.progressBarBreak,
          ]}
        />
      </View>

      <Text style={styles.remainingTimeText}>
        Remaining total time: {formatTime(remainingTaskTime)}
      </Text>

      <View style={styles.progressSummary}>
        <Text style={styles.progressSummaryText}>{getProgressSummary()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WP(5),
  },
  sessionTypeText: {
    fontSize: FS(2.2),
    fontFamily: 'Inter-SemiBold',
    color: colors.Black,
    marginBottom: HP(2),
  },
  focusIndicatorContainer: {
    marginBottom: HP(3),
  },
  focusIcon: {
    width: WP(25),
    height: WP(25),
    backgroundColor: '#F8F8F8',
    borderRadius: WP(12.5),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  focusIconBlocked: {
    backgroundColor: '#FFF5F0',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  focusIconPaused: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  focusIconBreak: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  focusIconTransition: {
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  timerText: {
    fontSize: FS(6),
    fontFamily: 'Inter-Bold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  statusText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(2),
    textAlign: 'center',
  },
  statusTextBlocked: {
    color: '#FF6B35',
    fontFamily: 'OpenSans-SemiBold',
  },
  statusTextPaused: {
    color: '#FFA726',
    fontFamily: 'OpenSans-SemiBold',
  },
  statusTextBreak: {
    color: '#4CAF50',
    fontFamily: 'OpenSans-SemiBold',
  },
  statusTextTransition: {
    color: '#2196F3',
    fontFamily: 'OpenSans-SemiBold',
  },
  progressContainer: {
    width: '80%',
    height: HP(0.5),
    backgroundColor: '#E5E5E5',
    borderRadius: HP(0.25),
    overflow: 'hidden',
    marginBottom: HP(2),
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderRadius: HP(0.25),
  },
  progressBarBlocked: {
    backgroundColor: '#FF6B35',
  },
  progressBarPaused: {
    backgroundColor: '#FFA726',
  },
  progressBarBreak: {
    backgroundColor: '#4CAF50',
  },
  progressBarTransition: {
    backgroundColor: '#2196F3',
  },
  remainingTimeText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#999999',
    textAlign: 'center',
    marginBottom: HP(1),
  },
  progressSummary: {
    marginTop: HP(1),
  },
  progressSummaryText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#666666',
    textAlign: 'center',
  },
});

export default TimerDisplay;
