import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  Easing,
  Platform,
  PanGestureHandler,
  State,
  NativeModules,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {useNavigation} from '@react-navigation/native';

const {PomodoroModule} = NativeModules;

const PomodoroTimerScreen = () => {
  const navigation = useNavigation();

  const [totalTaskDuration, setTotalTaskDuration] = useState(120 * 60); 
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [currentSessionTarget, setCurrentSessionTarget] = useState(25 * 60); 
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(4); 
  const [completedBreaks, setCompletedBreaks] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(4); 
  const [remainingTaskTime, setRemainingTaskTime] = useState(120 * 60);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPomodoroBlocking, setIsPomodoroBlocking] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // App exclusion tracking
  const [excludedAppsCount, setExcludedAppsCount] = useState(0);
  const [pomodoroState, setPomodoroState] = useState(null);

  const focusIndicatorRotate = useRef(new Animated.Value(0)).current;
  const completionScale = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    const usedTime = (completedPomodoros * 25 * 60) + (completedBreaks * 5 * 60);
    setRemainingTaskTime(Math.max(0, totalTaskDuration - usedTime));
  }, [completedPomodoros, completedBreaks, totalTaskDuration]);

  useEffect(() => {
    checkPomodoroStatus();
    loadPomodoroState();
  }, []);

  // Load Pomodoro state including app exclusion information
  const loadPomodoroState = async () => {
    try {
      if (PomodoroModule && PomodoroModule.getPomodoroState) {
        const state = await PomodoroModule.getPomodoroState();
        console.log('Loaded Pomodoro state with exclusions:', state);
        setPomodoroState(state);
        setExcludedAppsCount(state.excludedAppsCount || 0);
      }
    } catch (error) {
      console.error('Error loading Pomodoro state:', error);
    }
  };

  // Check current Pomodoro blocking status
  const checkPomodoroStatus = async () => {
    try {
      if (PomodoroModule) {
        const isBlocking = await PomodoroModule.isPomodoroBlocking();
        setIsPomodoroBlocking(isBlocking);
        console.log('Pomodoro blocking status:', isBlocking);
        await loadPomodoroState();
      }
    } catch (error) {
      console.error('Error checking Pomodoro status:', error);
    }
  };

  // Start app blocking for work sessions
  const startPomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.startPomodoroBlocking();
        setIsPomodoroBlocking(true);
        console.log('Pomodoro blocking started');
        await loadPomodoroState();
      }
    } catch (error) {
      console.error('Error starting Pomodoro blocking:', error);
    }
  };

  // Stop app blocking
  const stopPomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.stopPomodoroBlocking();
        setIsPomodoroBlocking(false);
        console.log('Pomodoro blocking stopped');
      }
    } catch (error) {
      console.error('Error stopping Pomodoro blocking:', error);
    }
  };

  // Pause app blocking (temporary)
  const pausePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.pausePomodoroBlocking();
        setIsPomodoroBlocking(false);
        console.log('Pomodoro blocking paused');
        
        setTimeout(async () => {
          const isBlocking = await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(isBlocking);
          console.log('Verified blocking state after pause:', isBlocking);
        }, 100);
      }
    } catch (error) {
      console.error('Error pausing Pomodoro blocking:', error);
    }
  };

  // Resume app blocking
  const resumePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.resumePomodoroBlocking();
        setIsPomodoroBlocking(true);
        console.log('Pomodoro blocking resumed');
        
        setTimeout(async () => {
          const isBlocking = await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(isBlocking);
          console.log('Verified blocking state after resume:', isBlocking);
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

  const startNextSession = async () => {
    console.log('Session transition - Current state:', {
      completedPomodoros,
      completedBreaks,
      isOnBreak,
      totalPomodoros,
      totalBreaks
    });

    setIsTransitioning(true);
    setIsRunning(false);

    if (isOnBreak) {
      const newCompletedBreaks = completedBreaks + 1;
      console.log('Break completed, completed breaks will be:', newCompletedBreaks);
      setCompletedBreaks(newCompletedBreaks);
      
      if (completedPomodoros >= totalPomodoros) {
        console.log('All work sessions completed after this break - finishing cycle');
        setIsCompleted(true);
        setIsTransitioning(false);
        await stopPomodoroBlocking();
        
        Animated.spring(completionScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
        return;
      }
      
      
      console.log('Starting next work session');
      setIsOnBreak(false);
      setCurrentSessionTarget(25 * 60); 
      setCurrentSessionTime(0);
      await startPomodoroBlocking();
      
    } else {
      const newCompletedPomodoros = completedPomodoros + 1;
      console.log(`Work session ${newCompletedPomodoros} completed`);
      setCompletedPomodoros(newCompletedPomodoros);
      
      if (newCompletedPomodoros >= totalPomodoros) {
        console.log('Last work session completed - starting final break');
        setIsOnBreak(true);
        setCurrentSessionTarget(5 * 60);
        setCurrentSessionTime(0);
        await stopPomodoroBlocking();
      } else {
        console.log(`Starting break ${completedBreaks + 1} of ${totalBreaks}`);
        setIsOnBreak(true);
        setCurrentSessionTarget(5 * 60); // 5-minute break
        setCurrentSessionTime(0);
        await stopPomodoroBlocking();
      }
    }

    setTimeout(() => {
      if (!isCompleted) {
        setIsTransitioning(false);
        setIsRunning(true); 
      }
    }, 2000);
  };

  useEffect(() => {
    if (isTransitioning) {
      return;
    }

    if (isRunning && currentSessionTime < currentSessionTarget) {
      timerRef.current = setTimeout(() => {
        setCurrentSessionTime(prev => prev + 1);
      }, 1000);
    } else if (currentSessionTime >= currentSessionTarget && !isCompleted && !isTransitioning) {
      // Session completed - start transition
      startNextSession();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, currentSessionTime, currentSessionTarget, isOnBreak, completedPomodoros, totalPomodoros, isTransitioning]);

  // Focus indicator animation during work sessions
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

  // Handle start/pause/restart functionality
  const handleStartPause = async () => {
    if (isTransitioning) {
      return;
    }

    if (isCompleted) {
      // Reset entire cycle
      console.log('Restarting complete Pomodoro cycle');
      setIsCompleted(false);
      setCurrentSessionTime(0);
      setCurrentSessionTarget(25 * 60);
      setIsOnBreak(false);
      setCompletedPomodoros(0);
      setCompletedBreaks(0);
      setRemainingTaskTime(totalTaskDuration);
      setIsTransitioning(false);
      completionScale.setValue(0);
      setIsRunning(true);
      if (!isOnBreak) {
        await startPomodoroBlocking();
      }
    } else {
      const newRunningState = !isRunning;
      setIsRunning(newRunningState);

      console.log('Timer state changing to:', newRunningState, 'Current blocking state:', isPomodoroBlocking);

      if (newRunningState && !isOnBreak) {
        console.log('Starting work session - initiating app blocking');
        await startPomodoroBlocking();
      } else if (newRunningState && isOnBreak) {
        console.log('Starting break - no blocking needed');
      } else {
        console.log('Pausing timer - pausing app blocking');
        await pausePomodoroBlocking();
      }
      
      setTimeout(async () => {
        if (PomodoroModule) {
          const currentBlockingState = await PomodoroModule.isPomodoroBlocking();
          console.log('Final blocking state after start/pause:', currentBlockingState);
          setIsPomodoroBlocking(currentBlockingState);
        }
      }, 200);
    }
  };

  // Stop and reset current cycle
  const handleStop = async () => {
    console.log('Stopping and resetting Pomodoro timer');
    setIsRunning(false);
    setIsTransitioning(false);
    setCurrentSessionTime(0);
    setCurrentSessionTarget(25 * 60);
    setIsOnBreak(false);
    setCompletedPomodoros(0);
    setCompletedBreaks(0);
    setRemainingTaskTime(totalTaskDuration);
    setIsCompleted(false);
    completionScale.setValue(0);
    
    await stopPomodoroBlocking();
  };

  // Close screen and cleanup
  const handleClose = async () => {
    if (isPomodoroBlocking) {
      await stopPomodoroBlocking();
    }
    navigation.goBack();
  };

  // Format seconds to MM:SS
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = () => {
    return (currentSessionTime / currentSessionTarget) * 100;
  };

  // Animation interpolation for rotating focus indicator
  const rotateInterpolate = focusIndicatorRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // FIXED: Dynamic status text with correct transition messages
  const getStatusText = () => {
    if (isTransitioning) {
      return !isOnBreak ? 
        'Focus session complete! Starting break in a moment...' : 
        'Break session ending... Preparing for next focus session';
    }
    
    if (isOnBreak && isRunning) {
      return `Break ${completedBreaks + 1} of ${totalBreaks} - Relax and recharge`;
    } else if (isOnBreak && !isRunning) {
      return `Break ${completedBreaks + 1} of ${totalBreaks} - Paused`;
    } else if (isRunning && isPomodoroBlocking) {
      const excludedText = excludedAppsCount > 0 ? ` • ${excludedAppsCount} apps excluded` : '';
      return `Focus session ${completedPomodoros + 1} of ${totalPomodoros} - Apps blocked${excludedText}`;
    } else if (isRunning && !isPomodoroBlocking && !isOnBreak) {
      return 'Focus session paused - Apps accessible';
    } else if (isRunning) {
      return `Session ${completedPomodoros + 1} of ${totalPomodoros} in progress...`;
    } else if (isPomodoroBlocking) {
      return 'Apps blocked - Session paused';
    } else {
      return `Professional Pomodoro Technique - 4 sessions + 4 breaks (120 min total)`;
    }
  };

  const getSessionTypeText = () => {
    if (isTransitioning) {
      return !isOnBreak ? 'Session Complete!' : 'Break Ending...';
    }
    
    if (isOnBreak) {
      return `Break ${completedBreaks + 1} of ${totalBreaks}`;
    } else {
      return `Focus Session ${completedPomodoros + 1} of ${totalPomodoros}`;
    }
  };

  const getProgressSummary = () => {
    const workProgress = `Sessions: ${completedPomodoros}/${totalPomodoros}`;
    const breakProgress = `Breaks: ${completedBreaks}/${totalBreaks}`;
    const totalMinutes = Math.floor((totalTaskDuration - remainingTaskTime) / 60);
    const timeProgress = `Time: ${totalMinutes}/120 min`;
    
    return `${workProgress} • ${breakProgress} • ${timeProgress}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      <View style={styles.mainContent}>
        {!isCompleted ? (
          <>
            {/* Header with status indicators */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="close" size={WP(6)} color={colors.Black} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                {isTransitioning && (
                  <View style={[styles.blockingIndicator, {backgroundColor: '#F0F8FF'}]}>
                    <Icon name="sync" size={WP(4)} color="#2196F3" />
                    <Text style={[styles.blockingText, {color: '#2196F3'}]}>Transitioning...</Text>
                  </View>
                )}
                {!isTransitioning && isPomodoroBlocking && !isOnBreak && (
                  <View style={styles.blockingIndicator}>
                    <Icon name="block" size={WP(4)} color="#FF6B35" />
                    <Text style={styles.blockingText}>
                      Apps Blocked{excludedAppsCount > 0 ? ` (${excludedAppsCount} excluded)` : ''}
                    </Text>
                  </View>
                )}
                {!isTransitioning && isRunning && !isPomodoroBlocking && !isOnBreak && (
                  <View style={[styles.blockingIndicator, {backgroundColor: '#FFF8E1'}]}>
                    <Icon name="pause" size={WP(4)} color="#FFA726" />
                    <Text style={[styles.blockingText, {color: '#FFA726'}]}>Session Paused</Text>
                  </View>
                )}
                {!isTransitioning && isOnBreak && (
                  <View style={[styles.blockingIndicator, {backgroundColor: '#E8F5E8'}]}>
                    <Icon name="free-breakfast" size={WP(4)} color="#4CAF50" />
                    <Text style={[styles.blockingText, {color: '#4CAF50'}]}>Break Time</Text>
                  </View>
                )}
              </View>

              <View style={styles.sessionCounter}>
                <Text style={styles.sessionCounterText}>
                  {isOnBreak ? `B${completedBreaks + 1}/4` : `S${completedPomodoros + 1}/4`}
                </Text>
              </View>
            </View>

            {/* Main timer display */}
            <View style={styles.timerContainer}>
              <Text style={styles.sessionTypeText}>{getSessionTypeText()}</Text>
              
              <Animated.View
                style={[
                  styles.focusIndicatorContainer,
                  {transform: [{rotate: rotateInterpolate}]},
                ]}>
                <View style={[
                  styles.focusIcon,
                  isTransitioning && styles.focusIconTransition,
                  !isTransitioning && isPomodoroBlocking && !isOnBreak && styles.focusIconBlocked,
                  !isTransitioning && isRunning && !isPomodoroBlocking && !isOnBreak && styles.focusIconPaused,
                  !isTransitioning && isOnBreak && styles.focusIconBreak
                ]}>
                  <Icon
                    name={
                      isTransitioning ? "sync" :
                      isOnBreak ? "free-breakfast" : "center-focus-strong"
                    }
                    size={WP(15)}
                    color={
                      isTransitioning ? '#2196F3' :
                      isOnBreak ? '#4CAF50' :
                      isPomodoroBlocking ? '#FF6B35' : 
                      (isRunning && !isPomodoroBlocking) ? '#FFA726' : 
                      colors.Black
                    }
                  />
                </View>
              </Animated.View>

              <Text style={styles.timerText}>
                {isTransitioning ? '00:00' : formatTime(currentSessionTarget - currentSessionTime)}
              </Text>
              
              <Text style={[
                styles.statusText,
                isTransitioning && styles.statusTextTransition,
                !isTransitioning && isPomodoroBlocking && styles.statusTextBlocked,
                !isTransitioning && isRunning && !isPomodoroBlocking && styles.statusTextPaused,
                !isTransitioning && isOnBreak && styles.statusTextBreak
              ]}>
                {getStatusText()}
              </Text>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {width: isTransitioning ? '100%' : `${getProgress()}%`},
                    isTransitioning && styles.progressBarTransition,
                    !isTransitioning && isPomodoroBlocking && !isOnBreak && styles.progressBarBlocked,
                    !isTransitioning && isRunning && !isPomodoroBlocking && !isOnBreak && styles.progressBarPaused,
                    !isTransitioning && isOnBreak && styles.progressBarBreak
                  ]}
                />
              </View>
              
              <Text style={styles.remainingTimeText}>
                Remaining total time: {formatTime(remainingTaskTime)}
              </Text>

              {/* Progress Summary */}
              <View style={styles.progressSummary}>
                <Text style={styles.progressSummaryText}>
                  {getProgressSummary()}
                </Text>
              </View>
            </View>

            {/* Control buttons */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={[styles.stopButton, isTransitioning && styles.buttonDisabled]}
                onPress={handleStop}
                activeOpacity={0.8}
                disabled={isTransitioning}>
                <Icon name="stop" size={WP(6)} color={isTransitioning ? '#CCCCCC' : colors.Black} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isTransitioning && styles.buttonDisabled,
                  !isTransitioning && isPomodoroBlocking && !isOnBreak && styles.controlButtonBlocked,
                  !isTransitioning && isRunning && !isPomodoroBlocking && !isOnBreak && styles.controlButtonPaused,
                  !isTransitioning && isOnBreak && styles.controlButtonBreak
                ]}
                onPress={handleStartPause}
                activeOpacity={0.8}
                disabled={isTransitioning}>
                <Icon
                  name={isRunning ? 'pause' : 'play-arrow'}
                  size={WP(8)}
                  color={isTransitioning ? '#CCCCCC' : colors.White}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Completion celebration screen */}
            <View style={styles.celebrationContainer}>
              <Animated.View
                style={[
                  styles.completionIndicator,
                  {transform: [{scale: completionScale}]},
                ]}>
                <View style={styles.completedFocusIcon}>
                  <Icon name="emoji-events" size={WP(20)} color="#FF6B35" />
                  <View style={styles.checkmarkOverlay}>
                    <Icon name="check-circle" size={WP(8)} color="#00754B" />
                  </View>
                </View>
              </Animated.View>

              <Text style={styles.congratsText}>
                Outstanding Work!{'\n'}You completed the full Pomodoro cycle:{'\n'}
                4 Focus Sessions + 4 Breaks{'\n'}
                Total productive time: 120 minutes
              </Text>

              <View style={styles.celebrationDots}>
                {[...Array(8)].map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.celebrationDot,
                      {
                        backgroundColor: [
                          '#FF6B35',
                          '#4ECDC4',
                          '#45B7D1',
                          '#96CEB4',
                        ][index % 4],
                        transform: [
                          {
                            translateX:
                              Math.cos((index * 45 * Math.PI) / 180) * WP(25),
                          },
                          {
                            translateY:
                              Math.sin((index * 45 * Math.PI) / 180) * WP(25),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.celebrationActions}>
              <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
                <Icon name="share" size={WP(6)} color={colors.Black} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleStartPause}
                activeOpacity={0.8}>
                <Text style={styles.continueButtonText}>Start New Cycle</Text>
              </TouchableOpacity>
            </View>
          </>
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
  blockingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.5),
    borderRadius: WP(4),
    gap: WP(1),
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
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(3),
    paddingBottom: HP(10),
    gap: WP(8),
  },
  stopButton: {
    width: WP(12),
    height: WP(12),
    backgroundColor: '#F0F0F0',
    borderRadius: WP(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5E5',
    opacity: 0.6,
  },
  controlButton: {
    width: WP(16),
    height: WP(16),
    backgroundColor: colors.Black,
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  controlButtonBlocked: {
    backgroundColor: '#FF6B35',
  },
  controlButtonPaused: {
    backgroundColor: '#FFA726',
  },
  controlButtonBreak: {
    backgroundColor: '#4CAF50',
  },
  controlButtonTransition: {
    backgroundColor: '#2196F3',
  },
  celebrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: HP(4),
  },
  completionIndicator: {
    marginBottom: HP(3),
    position: 'relative',
  },
  completedFocusIcon: {
    width: WP(30),
    height: WP(30),
    backgroundColor: '#FFF5F0',
    borderRadius: WP(15),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: -WP(2),
    right: -WP(1),
    backgroundColor: 'white',
    borderRadius: WP(4),
    elevation: 3,
  },
  congratsText: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    lineHeight: HP(3),
    marginTop: HP(5),
  },
  celebrationDots: {
    position: 'absolute',
    width: WP(50),
    height: WP(50),
  },
  celebrationDot: {
    position: 'absolute',
    width: WP(2),
    height: WP(2),
    borderRadius: WP(1),
    marginLeft: WP(25),
    marginTop: WP(6.5),
  },
  celebrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(25),
    paddingVertical: HP(3),
    paddingBottom: HP(10),
  },
  shareButton: {
    width: WP(16),
    height: WP(12),
    backgroundColor: '#F0F0F0',
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    width: WP(30),
    height: WP(12),
    backgroundColor: colors.Black,
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'Inter-SemiBold',
    color: colors.White,
  },
});

export default PomodoroTimerScreen;