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

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [targetTime, setTargetTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentTag, setCurrentTag] = useState('Focus');
  const [activeMode, setActiveMode] = useState('Pomodoro');
  const [isPomodoroBlocking, setIsPomodoroBlocking] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [timedReminder, setTimedReminder] = useState(true);
  const [reminderInterval, setReminderInterval] = useState(25);

  const focusIndicatorRotate = useRef(new Animated.Value(0)).current;
  const completionScale = useRef(new Animated.Value(0)).current;

  const timerRef = useRef(null);

  const tags = ['Focus', 'Study', 'Work', 'Sport', 'Play', 'Muse'];

  // Check Pomodoro blocking status on component mount
  useEffect(() => {
    checkPomodoroStatus();
  }, []);

  const checkPomodoroStatus = async () => {
    try {
      if (PomodoroModule) {
        const isBlocking = await PomodoroModule.isPomodoroBlocking();
        setIsPomodoroBlocking(isBlocking);
        console.log('Pomodoro blocking status:', isBlocking);
        
        // Debug: Get detailed state
        try {
          const state = await PomodoroModule.getPomodoroState();
          console.log('Detailed Pomodoro state:', state);
        } catch (e) {
          console.log('getPomodoroState not available or failed:', e);
        }
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
        console.log('Pomodoro blocking started');
        
        // Show confirmation alert
        Alert.alert(
          "Focus Mode Activated",
          "All apps are now blocked during your focus session. Only essential system apps will remain accessible.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error starting Pomodoro blocking:', error);
      Alert.alert("Error", "Failed to start app blocking. Please try again.");
    }
  };

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

  const pausePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.pausePomodoroBlocking();
        // Update state immediately to reflect pause
        setIsPomodoroBlocking(false);
        console.log('Pomodoro blocking paused');
        
        // Verify the state after pause
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

  const resumePomodoroBlocking = async () => {
    try {
      if (PomodoroModule) {
        await PomodoroModule.resumePomodoroBlocking();
        // Update state immediately to reflect resume
        setIsPomodoroBlocking(true);
        console.log('Pomodoro blocking resumed');
        
        // Verify the state after resume
        setTimeout(async () => {
          const isBlocking = await PomodoroModule.isPomodoroBlocking();
          setIsPomodoroBlocking(isBlocking);
          console.log('Verified blocking state after resume:', isBlocking);
        }, 100);
      }
    } catch (error) {
      console.error('Error resuming Pomodoro blocking:', error);
      // If resume fails, make sure we reflect the actual state
      setTimeout(async () => {
        const isBlocking = await PomodoroModule.isPomodoroBlocking();
        setIsPomodoroBlocking(isBlocking);
      }, 100);
    }
  };

  useEffect(() => {
    if (isRunning && timeElapsed < targetTime) {
      timerRef.current = setTimeout(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else if (timeElapsed >= targetTime && !isCompleted) {
      setIsCompleted(true);
      setIsRunning(false);
      
      // Stop app blocking when session completes
      stopPomodoroBlocking();

      Animated.spring(completionScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeElapsed, targetTime]);

  useEffect(() => {
    if (isRunning) {
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
  }, [isRunning]);

  const handleStartPause = async () => {
    if (isCompleted) {
      // Reset session
      setIsCompleted(false);
      setTimeElapsed(0);
      completionScale.setValue(0);
    } else {
      const newRunningState = !isRunning;
      setIsRunning(newRunningState);

      console.log('Timer state changing to:', newRunningState, 'Current blocking state:', isPomodoroBlocking);

      // Handle app blocking based on timer state
      if (newRunningState) {
        // Starting timer - start blocking
        console.log('Starting timer - initiating app blocking');
        await startPomodoroBlocking();
      } else {
        // Pausing timer - pause blocking (don't stop completely)
        console.log('Pausing timer - pausing app blocking');
        await pausePomodoroBlocking();
      }
      
      // Verify state after operation
      setTimeout(async () => {
        const currentBlockingState = await PomodoroModule.isPomodoroBlocking();
        console.log('Final blocking state after start/pause:', currentBlockingState);
        setIsPomodoroBlocking(currentBlockingState);
      }, 200);
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    setTimeElapsed(0);
    setIsCompleted(false);
    completionScale.setValue(0);
    
    // Stop app blocking when manually stopping
    await stopPomodoroBlocking();
  };

  const handleClose = async () => {
    // Stop blocking if active when closing
    if (isPomodoroBlocking) {
      await stopPomodoroBlocking();
    }
    navigation.goBack();
  };

  const handleMusicSettings = () => {
    console.log('Music settings pressed');
    setShowSettings(true);
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getProgress = () => {
    return (timeElapsed / targetTime) * 100;
  };

  const handleTimeChange = minutes => {
    const newTime = minutes * 60;
    setTargetTime(newTime);
    if (!isRunning) {
      setTimeElapsed(0);
    }
    setReminderInterval(minutes);
  };

  const handleSliderPress = event => {
    const {locationX} = event.nativeEvent;
    const sliderWidth = WP(85);
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const minutes = Math.max(1, Math.min(60, Math.round(percentage * 59 + 1)));
    setReminderInterval(minutes);
    if (!isRunning) {
      setTargetTime(minutes * 60);
    }
  };

  const rotateInterpolate = focusIndicatorRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get status text based on blocking and timer state
  const getStatusText = () => {
    if (isRunning && isPomodoroBlocking) {
      return 'Focus mode active - Apps blocked';
    } else if (isRunning && !isPomodoroBlocking) {
      return 'Focus session paused - Apps accessible';
    } else if (isRunning) {
      return 'Focus session in progress...';
    } else if (isPomodoroBlocking) {
      return 'Apps blocked - Session paused';
    } else {
      return 'Ready to focus';
    }
  };

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
                {isPomodoroBlocking && (
                  <View style={styles.blockingIndicator}>
                    <Icon name="block" size={WP(4)} color="#FF6B35" />
                    <Text style={styles.blockingText}>Apps Blocked</Text>
                  </View>
                )}
                {isRunning && !isPomodoroBlocking && (
                  <View style={[styles.blockingIndicator, {backgroundColor: '#FFF8E1'}]}>
                    <Icon name="pause" size={WP(4)} color="#FFA726" />
                    <Text style={[styles.blockingText, {color: '#FFA726'}]}>Session Paused</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleMusicSettings}
                style={styles.musicButton}>
                <Icon name="music-note" size={WP(6)} color={colors.Black} />
              </TouchableOpacity>
            </View>

            <View style={styles.timerContainer}>
              <Animated.View
                style={[
                  styles.focusIndicatorContainer,
                  {
                    transform: [{rotate: rotateInterpolate}],
                  },
                ]}>
                <View style={[
                  styles.focusIcon,
                  isPomodoroBlocking && styles.focusIconBlocked,
                  isRunning && !isPomodoroBlocking && styles.focusIconPaused
                ]}>
                  <Icon
                    name="center-focus-strong"
                    size={WP(15)}
                    color={
                      isPomodoroBlocking ? '#FF6B35' : 
                      (isRunning && !isPomodoroBlocking) ? '#FFA726' : 
                      colors.Black
                    }
                  />
                </View>
              </Animated.View>

              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
              <Text style={[
                styles.statusText,
                isPomodoroBlocking && styles.statusTextBlocked,
                isRunning && !isPomodoroBlocking && styles.statusTextPaused
              ]}>
                {getStatusText()}
              </Text>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {width: `${getProgress()}%`},
                    isPomodoroBlocking && styles.progressBarBlocked,
                    isRunning && !isPomodoroBlocking && styles.progressBarPaused
                  ]}
                />
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                activeOpacity={0.8}>
                <Icon
                  name="stop"
                  size={WP(6)}
                  color={colors.Black}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isPomodoroBlocking && styles.controlButtonBlocked,
                  isRunning && !isPomodoroBlocking && styles.controlButtonPaused
                ]}
                onPress={handleStartPause}
                activeOpacity={0.8}>
                <Icon
                  name={isRunning ? 'pause' : 'play-arrow'}
                  size={WP(8)}
                  color={colors.White}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.celebrationContainer}>
              <Animated.View
                style={[
                  styles.completionIndicator,
                  {
                    transform: [{scale: completionScale}],
                  },
                ]}>
                <View style={styles.completedFocusIcon}>
                  <Icon name="emoji-events" size={WP(20)} color="#FF6B35" />
                  <View style={styles.checkmarkOverlay}>
                    <Icon name="check-circle" size={WP(8)} color="#00754B" />
                  </View>
                </View>
              </Animated.View>

              <Text style={styles.congratsText}>
                Congratulations!{'\n'}You focused for{' '}
                {Math.floor(targetTime / 60)} minutes{'\n'}and completed your
                session
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
                <Icon name="check" size={WP(8)} color={colors.White} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {showSettings && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <TouchableOpacity
                onPress={() => setShowSettings(false)}
                style={styles.closeButton}>
                <Icon name="close" size={WP(6)} color={colors.Black} />
              </TouchableOpacity>

              <View style={styles.headerTitles}>
                <View style={styles.modeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      activeMode === 'Pomodoro' && styles.modeButtonActive,
                    ]}
                    onPress={() => setActiveMode('Pomodoro')}>
                    <Text
                      style={[
                        styles.modeText,
                        activeMode === 'Pomodoro' && styles.modeTextActive,
                      ]}>
                      Pomodoro
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      activeMode === 'AddTime' && styles.modeButtonActive,
                    ]}
                    onPress={() => setActiveMode('AddTime')}>
                    <Text
                      style={[
                        styles.modeText,
                        activeMode === 'AddTime' && styles.modeTextActive,
                      ]}>
                      AddTime
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Timed reminder</Text>
                <TouchableOpacity
                  style={[styles.toggle, timedReminder && styles.toggleActive]}
                  onPress={() => setTimedReminder(!timedReminder)}>
                  <View
                    style={[
                      styles.toggleThumb,
                      timedReminder && styles.toggleThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>
                Remind every : {reminderInterval}min
              </Text>
              <View style={styles.sliderSection}>
                <TouchableOpacity
                  style={styles.sliderTrack}
                  onPress={handleSliderPress}
                  activeOpacity={1}>
                  <View
                    style={[
                      styles.sliderFill,
                      {width: `${((reminderInterval - 1) / 59) * 100}%`},
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      {left: `${((reminderInterval - 1) / 59) * 100}%`},
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* App Blocking Setting */}
            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.blockingSettingInfo}>
                  <Text style={styles.settingLabel}>Block Apps During Focus</Text>
                  <Text style={styles.settingDescription}>
                    Prevent access to distracting apps during your session
                  </Text>
                </View>
                <View style={styles.blockingStatus}>
                  <Icon 
                    name={isPomodoroBlocking ? "block" : (isRunning ? "pause" : "check-circle-outline")} 
                    size={WP(5)} 
                    color={isPomodoroBlocking ? "#FF6B35" : (isRunning && !isPomodoroBlocking ? "#FFA726" : "#00754B")} 
                  />
                  <Text style={[
                    styles.blockingStatusText,
                    {color: isPomodoroBlocking ? "#FF6B35" : (isRunning && !isPomodoroBlocking ? "#FFA726" : "#00754B")}
                  ]}>
                    {isPomodoroBlocking ? "Active" : (isRunning && !isPomodoroBlocking ? "Paused" : "Inactive")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.tagHeader}>
                <Text style={styles.settingLabel}>Tag</Text>
                <View style={styles.tagActions}>
                  <TouchableOpacity style={styles.tagMoreButton}>
                    <Icon name="more-horiz" size={WP(5)} color={colors.Black} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addTagButton}>
                    <Icon name="add" size={WP(4)} color={colors.Black} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tagsContainer}>
                <View style={styles.tagsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Focus' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Focus')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Focus' && styles.tagTextActive,
                      ]}>
                      Focus
                    </Text>
                    {currentTag === 'Focus' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Study' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Study')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Study' && styles.tagTextActive,
                      ]}>
                      Study
                    </Text>
                    {currentTag === 'Study' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.tagsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Work' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Work')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Work' && styles.tagTextActive,
                      ]}>
                      Work
                    </Text>
                    {currentTag === 'Work' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Sport' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Sport')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Sport' && styles.tagTextActive,
                      ]}>
                      Sport
                    </Text>
                    {currentTag === 'Sport' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.tagsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Play' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Play')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Play' && styles.tagTextActive,
                      ]}>
                      Play
                    </Text>
                    {currentTag === 'Play' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      currentTag === 'Muse' && styles.tagButtonActive,
                    ]}
                    onPress={() => setCurrentTag('Muse')}>
                    <Text
                      style={[
                        styles.tagText,
                        currentTag === 'Muse' && styles.tagTextActive,
                      ]}>
                      Muse
                    </Text>
                    {currentTag === 'Muse' && (
                      <Icon name="check" size={WP(4)} color={colors.White} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
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
  musicButton: {
    padding: WP(2),
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WP(5),
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
  progressContainer: {
    width: '80%',
    height: HP(0.5),
    backgroundColor: '#E5E5E5',
    borderRadius: HP(0.25),
    overflow: 'hidden',
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
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: colors.White,
    borderTopLeftRadius: WP(6),
    borderTopRightRadius: WP(6),
    height: HP(90),
    paddingBottom: HP(3),
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(5),
    paddingVertical: HP(2.5),
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(4),
    padding: WP(1),
  },
  modeButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    borderRadius: WP(5),
    minWidth: WP(20),
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    elevation: 1,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeText: {
    fontSize: FS(1.8),
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  modeTextActive: {
    color: colors.Black,
  },
  settingItem: {
    paddingHorizontal: WP(5),
    paddingVertical: HP(2),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: FS(1.9),
    fontFamily: 'Inter-Medium',
    color: colors.Black,
    marginBottom: HP(1.5),
    marginLeft: WP(1),
  },
  settingDescription: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(0.5),
  },
  blockingSettingInfo: {
    flex: 1,
  },
  blockingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(1),
  },
  blockingStatusText: {
    fontSize: FS(1.6),
    fontFamily: 'Inter-Medium',
  },
  toggle: {
    width: WP(12),
    height: WP(6.5),
    backgroundColor: '#E8E8E8',
    borderRadius: WP(3.25),
    justifyContent: 'center',
    padding: WP(0.5),
    marginTop: HP(-1.5),
  },
  toggleActive: {
    backgroundColor: colors.Black,
  },
  toggleThumb: {
    width: WP(5.5),
    height: WP(5.5),
    backgroundColor: 'white',
    borderRadius: WP(2.75),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleThumbActive: {
    transform: [{translateX: WP(5.5)}],
  },
  sliderSection: {
    paddingVertical: HP(2),
    paddingHorizontal: WP(1),
  },
  sliderTrack: {
    width: WP(85),
    height: HP(1.2),
    backgroundColor: '#E8E8E8',
    borderRadius: HP(0.6),
    position: 'relative',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.Black,
    borderRadius: HP(0.6),
  },
  sliderThumb: {
    position: 'absolute',
    width: WP(6),
    height: WP(6),
    backgroundColor: colors.Black,
    borderRadius: WP(3),
    top: -WP(2.4),
    marginLeft: -WP(3),
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: HP(2),
  },
  tagActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(3),
  },
  tagMoreButton: {
    padding: WP(1),
    width: WP(7),
    height: WP(7),
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButton: {
    width: WP(7),
    height: WP(7),
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    gap: HP(1.5),
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: WP(3),
  },
  tagButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2),
    paddingHorizontal: WP(4),
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    gap: WP(2),
  },
  tagButtonActive: {
    backgroundColor: colors.Black,
  },
  tagText: {
    fontSize: FS(1.7),
    fontFamily: 'Inter-Medium',
    color: colors.Black,
  },
  tagTextActive: {
    color: colors.White,
  },
});

export default PomodoroTimerScreen;