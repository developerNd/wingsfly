import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Vibration,
  Animated,
  Platform,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';
import Sound from 'react-native-sound';

const BlockTimeModalOld = ({visible, onClose, onSave}) => {
  // SINGLE STATE OBJECT - No individual setters to prevent re-renders
  const [timeState] = useState({
    startHour: 11,
    startMinute: 30,
    startPeriod: 'AM',
    endHour: 12,
    endMinute: 30,
    endPeriod: 'AM',
  });

  // REF-BASED STATE - Never triggers re-renders
  const stateRef = useRef({
    startHour: 11,
    startMinute: 30,
    startPeriod: 'AM',
    endHour: 12,
    endMinute: 30,
    endPeriod: 'AM',
  });

  // ENHANCED SCROLL MANAGEMENT - Better momentum and smooth stopping
  const scrollEngine = useRef({
    startHour: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 11,
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.94,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
    startMinute: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 30,
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.94,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
    startPeriod: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 'AM',
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.96,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
    endHour: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 12,
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.94,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
    endMinute: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 30,
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.94,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
    endPeriod: {
      lastY: 0,
      lastTime: 0,
      velocity: 0,
      isActive: false,
      targetValue: 'AM',
      animFrame: null,
      snapTimeout: null,
      lastSoundTime: 0,
      momentumDecay: 0.96,
      dampingActive: false,
      isScrolling: false,
      velocityHistory: [],
      smoothStopActive: false,
    },
  });

  // ANIMATED VALUES - Direct manipulation, no re-renders
  const animatedValues = useRef({
    startHour: new Animated.Value(0),
    startMinute: new Animated.Value(0),
    startPeriod: new Animated.Value(0),
    endHour: new Animated.Value(0),
    endMinute: new Animated.Value(0),
    endPeriod: new Animated.Value(0),
  });

  const scrollRefs = useRef({});

  // ENHANCED PERFORMANCE CONSTANTS - Better momentum control
  const ENGINE = useMemo(
    () => ({
      hours: Array.from({length: 12}, (_, i) => i + 1),
      minutes: Array.from({length: 60}, (_, i) => i),
      periods: ['AM', 'PM'],
      ITEM_HEIGHT: HP(3.5),
      CENTER_INDEX: 3,
      BUFFER_SIZE: 4,
      SCROLL_THROTTLE: 2,
      SNAP_DELAY: 150,
      SOUND_THROTTLE: 30,
      VIB_THROTTLE: 40,
      VELOCITY_SMOOTH: 0.85,
      MOMENTUM_THRESHOLD: 0.2,
      FAST_SCROLL_THRESHOLD: 6,
      ULTRA_FAST_THRESHOLD: 12,
      MOMENTUM_DAMPING: 0.95,
      ROTATION_FACTOR: 15,
      SCALE_FACTOR: 0.85,
      // New smooth stopping constants
      SMOOTH_STOP_THRESHOLD: 3,
      VELOCITY_HISTORY_SIZE: 5,
      SMOOTH_STOP_DURATION: 400,
      DECELERATION_CURVE: 0.88,
    }),
    [],
  );

  // PRE-COMPUTED ARRAYS - Never recalculated
  const ARRAYS = useMemo(() => {
    const extendHours = [
      ...ENGINE.hours.slice(-ENGINE.BUFFER_SIZE),
      ...ENGINE.hours,
      ...ENGINE.hours.slice(0, ENGINE.BUFFER_SIZE),
    ];
    const extendMinutes = [
      ...ENGINE.minutes.slice(-ENGINE.BUFFER_SIZE),
      ...ENGINE.minutes,
      ...ENGINE.minutes.slice(0, ENGINE.BUFFER_SIZE),
    ];

    return {
      hours: extendHours,
      minutes: extendMinutes,
      periods: ENGINE.periods,
    };
  }, [ENGINE]);

  // SOUND POOL - Professional audio management
  const audioEngine = useRef({
    scrollPool: [],
    selectSound: null,
    poolIndex: 0,
    ready: false,
    lastVibTime: 0,
  });

  // INITIALIZE SOUNDS - One time only
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create sound pool for smooth overlapping
        const scrollSounds = await Promise.all(
          Array(3)
            .fill(null)
            .map(
              () =>
                new Promise(resolve => {
                  const sound = new Sound(
                    'tic.wav',
                    Sound.MAIN_BUNDLE,
                    error => {
                      if (!error) {
                        sound.setVolume(0.6);
                        resolve(sound);
                      } else resolve(null);
                    },
                  );
                }),
            ),
        );

        const selectSound = await new Promise(resolve => {
          const sound = new Sound('tic.wav', Sound.MAIN_BUNDLE, error => {
            if (!error) {
              sound.setVolume(0.4);
              resolve(sound);
            } else resolve(null);
          });
        });

        audioEngine.current = {
          scrollPool: scrollSounds.filter(Boolean),
          selectSound,
          poolIndex: 0,
          ready: true,
          lastVibTime: 0,
        };
      } catch (error) {
        console.warn('Audio init failed:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      Object.values(scrollEngine.current).forEach(engine => {
        if (engine.animFrame) cancelAnimationFrame(engine.animFrame);
        if (engine.snapTimeout) clearTimeout(engine.snapTimeout);
      });

      audioEngine.current.scrollPool.forEach(sound => sound?.release());
      audioEngine.current.selectSound?.release();
    };
  }, []);

  // SMOOTH DIGIT TRANSITION SYSTEM - Enhanced for native-like behavior
  const smoothDigitTransition = useRef({
    startHour: {currentPos: 0, targetPos: 0, animating: false},
    startMinute: {currentPos: 0, targetPos: 0, animating: false},
    startPeriod: {currentPos: 0, targetPos: 0, animating: false},
    endHour: {currentPos: 0, targetPos: 0, animating: false},
    endMinute: {currentPos: 0, targetPos: 0, animating: false},
    endPeriod: {currentPos: 0, targetPos: 0, animating: false},
  });

  // ENHANCED SMOOTH DIGIT ANIMATION - Native-like transitions
  const animateDigitTransition = useCallback(
    (scrollType, targetPosition, velocity) => {
      const transition = smoothDigitTransition.current[scrollType];
      const scrollRef = scrollRefs.current[scrollType];

      if (!scrollRef || transition.animating) return;

      const isFastScroll = velocity > ENGINE.FAST_SCROLL_THRESHOLD;
      const isUltraFast = velocity > ENGINE.ULTRA_FAST_THRESHOLD;

      // Native-like animation curves and durations
      const baseDuration = isUltraFast ? 800 : isFastScroll ? 600 : 300;

      transition.targetPos = targetPosition;
      transition.animating = true;

      // Use native-like easing curves
      Animated.timing(animatedValues.current[scrollType], {
        toValue: targetPosition,
        duration: baseDuration,
        useNativeDriver: false,
        easing: t => {
          // Native iOS-like easing curve
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        },
      }).start(() => {
        transition.animating = false;
        transition.currentPos = targetPosition;
      });
    },
    [ENGINE],
  );

  // NEW: ENHANCED SMOOTH STOP SYSTEM
  const initiateSmoothStop = useCallback(
    (scrollType, currentY, velocity) => {
      const engine = scrollEngine.current[scrollType];
      const scrollRef = scrollRefs.current[scrollType];

      if (!scrollRef || engine.smoothStopActive) return;

      engine.smoothStopActive = true;
      engine.isScrolling = false;

      // Calculate target snap position
      const rawIndex = currentY / ENGINE.ITEM_HEIGHT;
      const targetIndex = Math.round(rawIndex);
      const targetY = targetIndex * ENGINE.ITEM_HEIGHT;

      // Determine animation duration based on velocity and distance
      const distance = Math.abs(targetY - currentY);
      const baseDuration =
        velocity > ENGINE.FAST_SCROLL_THRESHOLD
          ? ENGINE.SMOOTH_STOP_DURATION
          : Math.min(ENGINE.SMOOTH_STOP_DURATION * 0.7, distance * 8);

      // Enhanced easing for smooth stop
      const smoothStopEasing = t => {
        // Custom easing that provides smooth deceleration
        return (
          1 - Math.pow(1 - t, velocity > ENGINE.FAST_SCROLL_THRESHOLD ? 2.5 : 2)
        );
      };

      // Animate to target position with smooth deceleration
      Animated.timing(animatedValues.current[scrollType], {
        toValue: targetY,
        duration: baseDuration,
        useNativeDriver: false,
        easing: smoothStopEasing,
      }).start(() => {
        engine.smoothStopActive = false;
        smoothDigitTransition.current[scrollType].currentPos = targetY;
        smoothDigitTransition.current[scrollType].targetPos = targetY;
      });

      // Scroll the actual ScrollView smoothly
      scrollRef.scrollTo({
        y: targetY,
        animated: true,
      });
    },
    [ENGINE],
  );

  // NEW: VELOCITY TRACKING SYSTEM
  const updateVelocityHistory = useCallback(
    (scrollType, velocity) => {
      const engine = scrollEngine.current[scrollType];

      // Maintain velocity history for smooth calculations
      engine.velocityHistory = engine.velocityHistory || [];
      engine.velocityHistory.push(velocity);

      if (engine.velocityHistory.length > ENGINE.VELOCITY_HISTORY_SIZE) {
        engine.velocityHistory.shift();
      }

      // Calculate average velocity for smoother decisions
      const avgVelocity =
        engine.velocityHistory.reduce((a, b) => a + b, 0) /
        engine.velocityHistory.length;
      return avgVelocity;
    },
    [ENGINE],
  );

  // PROFESSIONAL AUDIO FUNCTIONS
  const playScrollSound = useCallback(
    scrollType => {
      const engine = scrollEngine.current[scrollType];
      const audio = audioEngine.current;
      const now = Date.now();

      if (!audio.ready || now - engine.lastSoundTime < ENGINE.SOUND_THROTTLE)
        return;

      const sound = audio.scrollPool[audio.poolIndex];
      if (sound) {
        sound.stop(() => sound.play());
        audio.poolIndex = (audio.poolIndex + 1) % audio.scrollPool.length;
        engine.lastSoundTime = now;
      }
    },
    [ENGINE.SOUND_THROTTLE],
  );

  // ENHANCED VIBRATION FUNCTION
  const triggerVibration = useCallback(
    (intensity = 'light', currentTime) => {
      const audio = audioEngine.current;

      if (!currentTime) currentTime = Date.now();
      if (currentTime - audio.lastVibTime < ENGINE.VIB_THROTTLE) return;

      try {
        let duration;
        if (Platform.OS === 'ios') {
          duration =
            intensity === 'strong' ? 15 : intensity === 'medium' ? 10 : 6;
        } else {
          duration =
            intensity === 'strong' ? 20 : intensity === 'medium' ? 15 : 10;
        }

        Vibration.vibrate(duration);
        audio.lastVibTime = currentTime;
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    },
    [ENGINE.VIB_THROTTLE],
  );

  const playSelectSound = useCallback(() => {
    const sound = audioEngine.current.selectSound;
    if (sound && audioEngine.current.ready) {
      sound.play();
    }
    triggerVibration('light');
  }, [triggerVibration]);

  // ENHANCED SCROLL HANDLER - Smooth stopping for all scroll speeds
  const createScrollHandler = useCallback(
    (scrollType, originalArray, isInfinite = true) => {
      return event => {
        const y = event.nativeEvent.contentOffset.y;
        const engine = scrollEngine.current[scrollType];
        const transition = smoothDigitTransition.current[scrollType];
        const now = Date.now();
        const prevY = engine.lastY;

        // Enhanced velocity calculation
        const deltaY = Math.abs(y - prevY);
        const timeDelta = Math.max(1, now - (engine.lastTime || now));
        const rawVelocity = (deltaY / timeDelta) * 16.67;

        // Improved velocity smoothing with history
        engine.velocity =
          engine.velocity * ENGINE.VELOCITY_SMOOTH +
          rawVelocity * (1 - ENGINE.VELOCITY_SMOOTH);
        const avgVelocity = updateVelocityHistory(scrollType, engine.velocity);
        engine.lastTime = now;

        // Track scrolling state
        engine.isScrolling = deltaY > 0.5;

        const isFastScroll = avgVelocity > ENGINE.FAST_SCROLL_THRESHOLD;
        const isSlowScroll = avgVelocity < ENGINE.SMOOTH_STOP_THRESHOLD;

        // Always update animated values for consistent visual feedback
        animatedValues.current[scrollType].setValue(y);
        transition.currentPos = y;

        // Enhanced feedback system
        const movementThreshold = isFastScroll
          ? ENGINE.ITEM_HEIGHT * 0.6
          : ENGINE.ITEM_HEIGHT * 0.3;

        if (
          deltaY > movementThreshold &&
          now - engine.lastSoundTime > ENGINE.SOUND_THROTTLE
        ) {
          playScrollSound(scrollType);
          triggerVibration('light', now);
          engine.lastSoundTime = now;
        }

        // VALUE CALCULATION - Zero re-renders with smooth transitions
        const rawIndex = y / ENGINE.ITEM_HEIGHT;
        const targetIndex = Math.round(rawIndex);
        let newValue;

        if (isInfinite) {
          const actualIndex =
            (((targetIndex - ENGINE.BUFFER_SIZE) % originalArray.length) +
              originalArray.length) %
            originalArray.length;
          newValue = originalArray[actualIndex];

          // INFINITE SCROLL REPOSITIONING
          const scrollRef = scrollRefs.current[scrollType];
          if (
            scrollRef &&
            (targetIndex <= ENGINE.BUFFER_SIZE ||
              targetIndex >= originalArray.length + ENGINE.BUFFER_SIZE)
          ) {
            const newPosition =
              targetIndex <= ENGINE.BUFFER_SIZE
                ? (originalArray.length + targetIndex - ENGINE.BUFFER_SIZE) *
                    ENGINE.ITEM_HEIGHT +
                  ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT
                : (targetIndex - originalArray.length) * ENGINE.ITEM_HEIGHT +
                  ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT;

            if (engine.animFrame) cancelAnimationFrame(engine.animFrame);
            engine.animFrame = requestAnimationFrame(() => {
              scrollRef.scrollTo({y: newPosition, animated: false});
              animatedValues.current[scrollType].setValue(newPosition);
              transition.currentPos = newPosition;
              transition.targetPos = newPosition;
              engine.lastY = newPosition;
              engine.animFrame = null;
            });
          }
        } else {
          // PERIOD HANDLING - Simple and fast
          const clampedIndex = Math.max(
            0,
            Math.min(ENGINE.periods.length - 1, targetIndex),
          );
          newValue = ENGINE.periods[clampedIndex];
        }

        // UPDATE STATE REF - No re-renders
        if (engine.targetValue !== newValue) {
          engine.targetValue = newValue;
          stateRef.current[scrollType] = newValue;
        }

        // ENHANCED SNAP HANDLING - Different behavior for fast vs slow scrolling
        engine.isActive = true;

        // Clear existing timeouts
        if (engine.snapTimeout) clearTimeout(engine.snapTimeout);

        // Determine snap strategy based on velocity
        const snapDelay = isSlowScroll
          ? 100
          : isFastScroll
          ? 200
          : ENGINE.SNAP_DELAY;

        engine.snapTimeout = setTimeout(() => {
          if (!transition.animating && !engine.smoothStopActive) {
            const currentY = y;
            const currentVelocity = avgVelocity;

            // Use smooth stop for all scenarios
            if (currentVelocity > ENGINE.SMOOTH_STOP_THRESHOLD) {
              // Fast scrolling - use smooth stop
              initiateSmoothStop(scrollType, currentY, currentVelocity);
            } else {
              // Very slow scrolling - quick snap
              const rawIndex = currentY / ENGINE.ITEM_HEIGHT;
              const targetIndex = Math.round(rawIndex);
              const snapY = targetIndex * ENGINE.ITEM_HEIGHT;
              const scrollRef = scrollRefs.current[scrollType];

              if (scrollRef && Math.abs(currentY - snapY) > 1) {
                scrollRef.scrollTo({y: snapY, animated: true});

                setTimeout(() => {
                  animatedValues.current[scrollType].setValue(snapY);
                  transition.currentPos = snapY;
                  transition.targetPos = snapY;
                }, 50);
              }
            }

            engine.isActive = false;
          }
          engine.snapTimeout = null;
        }, snapDelay);

        engine.lastY = y;
      };
    },
    [
      ENGINE,
      playScrollSound,
      triggerVibration,
      updateVelocityHistory,
      initiateSmoothStop,
    ],
  );

  // STATIC HANDLERS - Never recreated
  const HANDLERS = useMemo(
    () => ({
      startHour: createScrollHandler('startHour', ENGINE.hours, true),
      startMinute: createScrollHandler('startMinute', ENGINE.minutes, true),
      startPeriod: createScrollHandler('startPeriod', ENGINE.periods, false),
      endHour: createScrollHandler('endHour', ENGINE.hours, true),
      endMinute: createScrollHandler('endMinute', ENGINE.minutes, true),
      endPeriod: createScrollHandler('endPeriod', ENGINE.periods, false),
    }),
    [createScrollHandler, ENGINE],
  );

  // POSITION CALCULATION HELPER
  const getInitialPosition = useCallback(
    (scrollType, value) => {
      if (scrollType.includes('Hour')) {
        const index = ENGINE.hours.indexOf(value);
        return (index + ENGINE.BUFFER_SIZE) * ENGINE.ITEM_HEIGHT;
      } else if (scrollType.includes('Minute')) {
        const numericValue =
          typeof value === 'string' ? parseInt(value, 10) : value;
        const index = ENGINE.minutes.indexOf(numericValue);
        return (index + ENGINE.BUFFER_SIZE) * ENGINE.ITEM_HEIGHT;
      } else if (scrollType.includes('Period')) {
        const index = ENGINE.periods.indexOf(value);
        return (index + ENGINE.CENTER_INDEX) * ENGINE.ITEM_HEIGHT;
      }
      return 0;
    },
    [ENGINE],
  );

  // INITIALIZE POSITIONS
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      const positions = {
        startHour: getInitialPosition('startHour', stateRef.current.startHour),
        startMinute: getInitialPosition(
          'startMinute',
          stateRef.current.startMinute,
        ),
        startPeriod: getInitialPosition(
          'startPeriod',
          stateRef.current.startPeriod,
        ),
        endHour: getInitialPosition('endHour', stateRef.current.endHour),
        endMinute: getInitialPosition('endMinute', stateRef.current.endMinute),
        endPeriod: getInitialPosition('endPeriod', stateRef.current.endPeriod),
      };

      Object.entries(positions).forEach(([key, pos]) => {
        const ref = scrollRefs.current[key];
        if (ref && pos >= 0) {
          requestAnimationFrame(() => {
            ref.scrollTo({y: pos, animated: false});
            animatedValues.current[key].setValue(pos);
            smoothDigitTransition.current[key].currentPos = pos;
            smoothDigitTransition.current[key].targetPos = pos;
          });
        }
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [visible, ENGINE, getInitialPosition]);

  // ENHANCED ANIMATED PERIOD TEXT COMPONENT
  const AnimatedPeriodText = React.memo(
    ({animatedValue, index, children}) => {
      const [fontWeight, setFontWeight] = useState('400');

      useEffect(() => {
        const listener = animatedValue.addListener(({value}) => {
          const centerPosition = index * ENGINE.ITEM_HEIGHT;
          const distance = Math.abs(value - centerPosition);
          const threshold = ENGINE.ITEM_HEIGHT * 0.4;

          const newWeight = distance < threshold ? '700' : '400';
          if (fontWeight !== newWeight) {
            setFontWeight(newWeight);
          }
        });

        return () => animatedValue.removeListener(listener);
      }, [animatedValue, index, fontWeight]);

      return (
        <Animated.Text
          style={[
            styles.timeText,
            styles.periodText,
            {
              color: animatedValue.interpolate({
                inputRange: [
                  (index - 0.5) * ENGINE.ITEM_HEIGHT,
                  index * ENGINE.ITEM_HEIGHT,
                  (index + 0.5) * ENGINE.ITEM_HEIGHT,
                ],
                outputRange: ['#AEAEAE', '#6A6565', '#AEAEAE'],
                extrapolate: 'clamp',
              }),
              fontSize: animatedValue.interpolate({
                inputRange: [
                  (index - 0.5) * ENGINE.ITEM_HEIGHT,
                  index * ENGINE.ITEM_HEIGHT,
                  (index + 0.5) * ENGINE.ITEM_HEIGHT,
                ],
                outputRange: [FS(1.8), FS(2.0), FS(1.8)],
                extrapolate: 'clamp',
              }),
              fontWeight: fontWeight,
            },
          ]}>
          {children}
        </Animated.Text>
      );
    },
    [ENGINE],
  );

  // ENHANCED TIME ITEM - Better spacing and consistent text sizes
  const TimeItem = React.memo(
    ({item, index, scrollType, onPress, isMinute, isPeriod}) => {
      const animatedValue = animatedValues.current[scrollType];

      // PERIOD ITEMS
      if (isPeriod) {
        return (
          <Animated.View style={styles.timeItem}>
            <TouchableOpacity
              style={styles.timeItemTouchable}
              onPress={onPress}
              activeOpacity={0.7}>
              <AnimatedPeriodText animatedValue={animatedValue} index={index}>
                {item}
              </AnimatedPeriodText>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      // ENHANCED ANIMATED ITEMS - Consistent spacing and sizing
      return (
        <Animated.View
          style={[
            styles.timeItem,
            {
              transform: [
                {perspective: 1200},
                {
                  rotateX: animatedValue.interpolate({
                    inputRange: [
                      (index - 2.5) * ENGINE.ITEM_HEIGHT,
                      (index - 1) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 1) * ENGINE.ITEM_HEIGHT,
                      (index + 2.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: ['45deg', '15deg', '0deg', '-15deg', '-45deg'],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  scale: animatedValue.interpolate({
                    inputRange: [
                      (index - 2) * ENGINE.ITEM_HEIGHT,
                      (index - 1) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 1) * ENGINE.ITEM_HEIGHT,
                      (index + 2) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: [
                      ENGINE.SCALE_FACTOR,
                      0.92,
                      1.0,
                      0.92,
                      ENGINE.SCALE_FACTOR,
                    ],
                    extrapolate: 'clamp',
                  }),
                },
              ],
              opacity: animatedValue.interpolate({
                inputRange: [
                  (index - 2.5) * ENGINE.ITEM_HEIGHT,
                  (index - 1) * ENGINE.ITEM_HEIGHT,
                  index * ENGINE.ITEM_HEIGHT,
                  (index + 1) * ENGINE.ITEM_HEIGHT,
                  (index + 2.5) * ENGINE.ITEM_HEIGHT,
                ],
                outputRange: [0.3, 0.7, 1.0, 0.7, 0.3],
                extrapolate: 'clamp',
              }),
            },
          ]}>
          <TouchableOpacity
            style={styles.timeItemTouchable}
            onPress={onPress}
            activeOpacity={0.7}>
            <Animated.Text
              style={[
                styles.timeText,
                {
                  color: animatedValue.interpolate({
                    inputRange: [
                      (index - 0.5) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 0.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: ['#AEAEAE', '#6A6565', '#AEAEAE'],
                    extrapolate: 'clamp',
                  }),
                  fontSize: animatedValue.interpolate({
                    inputRange: [
                      (index - 0.5) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 0.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: [FS(2.4), FS(2.55), FS(2.4)],
                    extrapolate: 'clamp',
                  }),
                  fontWeight: animatedValue.interpolate({
                    inputRange: [
                      (index - 0.5) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 0.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: ['400', '600', '400'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}>
              {isMinute ? String(item).padStart(2, '0') : item}
            </Animated.Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    (prev, next) => {
      return prev.item === next.item && prev.scrollType === next.scrollType;
    },
  );

  // OPTIMIZED COLUMN RENDERER
  const renderTimeColumn = useCallback(
    (items, scrollType, isMinute = false, isPeriod = false) => {
      const handleItemPress = item => {
        playSelectSound();

        stateRef.current[scrollType] = item;
        scrollEngine.current[scrollType].targetValue = item;

        const targetPos = getInitialPosition(scrollType, item);
        const ref = scrollRefs.current[scrollType];

        if (!ref || targetPos < 0) return;

        requestAnimationFrame(() => {
          ref.scrollTo({y: targetPos, animated: true});
          animatedValues.current[scrollType].setValue(targetPos);
          smoothDigitTransition.current[scrollType].currentPos = targetPos;
          smoothDigitTransition.current[scrollType].targetPos = targetPos;
        });
      };

      return (
        <View
          style={[
            styles.timeColumnContainer,
            isMinute && styles.minuteColumn,
            isPeriod && styles.periodColumn,
          ]}>
          <ScrollView
            ref={ref => (scrollRefs.current[scrollType] = ref)}
            style={styles.timeColumn}
            showsVerticalScrollIndicator={false}
            snapToInterval={ENGINE.ITEM_HEIGHT}
            snapToAlignment="start"
            decelerationRate={ENGINE.MOMENTUM_DAMPING}
            onScroll={HANDLERS[scrollType]}
            scrollEventThrottle={ENGINE.SCROLL_THROTTLE}
            removeClippedSubviews={false}
            bounces={!isPeriod}
            bouncesZoom={false}
            overScrollMode={isPeriod ? 'never' : 'auto'}
            contentContainerStyle={[
              styles.infiniteScrollContent,
              {
                paddingTop: ENGINE.CENTER_INDEX * ENGINE.ITEM_HEIGHT,
                paddingBottom: ENGINE.CENTER_INDEX * ENGINE.ITEM_HEIGHT,
              },
            ]}>
            {items.map((item, index) => (
              <TimeItem
                key={`${scrollType}-${item}-${index}`}
                item={item}
                index={index}
                scrollType={scrollType}
                onPress={() => handleItemPress(item)}
                isMinute={isMinute}
                isPeriod={isPeriod}
              />
            ))}
          </ScrollView>
        </View>
      );
    },
    [ENGINE, HANDLERS, playSelectSound, getInitialPosition],
  );

  // TIME PICKER
  const renderTimePicker = useCallback(
    (title, prefix) => (
      <View style={styles.timePickerContainer}>
        <Text style={styles.timePickerTitle}>{title}</Text>
        <View style={styles.timePickerWrapper}>
          <View style={styles.centerSelectionBox} />
          <View style={styles.timePickerColumns}>
            {renderTimeColumn(ARRAYS.hours, `${prefix}Hour`, false, false)}
            <View style={styles.separatorContainer}>
              <Text style={styles.timeSeparator}>:</Text>
            </View>
            {renderTimeColumn(ARRAYS.minutes, `${prefix}Minute`, true, false)}
            {renderTimeColumn(ARRAYS.periods, `${prefix}Period`, false, true)}
          </View>
        </View>
      </View>
    ),
    [ARRAYS, renderTimeColumn],
  );

  // SAVE HANDLER
  const handleSave = useCallback(() => {
    const state = stateRef.current;
    const timeData = {
      startTime: `${state.startHour}:${String(state.startMinute).padStart(
        2,
        '0',
      )} ${state.startPeriod}`,
      endTime: `${state.endHour}:${String(state.endMinute).padStart(2, '0')} ${
        state.endPeriod
      }`,
    };
    onSave(timeData);
    onClose();
  }, [onSave, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      hardwareAccelerated>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.headerTitle}>Block Time</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.timePickersContainer}>
              {renderTimePicker('Start Time', 'start')}
              {renderTimePicker('End Time', 'end')}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: WP(90),
    backgroundColor: colors.White,
    borderRadius: WP(3),
    maxHeight: HP(78),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.8),
    backgroundColor: colors.Primary,
    borderTopLeftRadius: WP(3),
    borderTopRightRadius: WP(3),
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  cancelButton: {
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2),
  },
  content: {
    backgroundColor: colors.White,
    paddingTop: HP(2),
    paddingBottom: HP(1),
  },
  footer: {
    paddingHorizontal: WP(6),
    paddingVertical: HP(1.3),
    backgroundColor: colors.White,
    borderBottomLeftRadius: WP(3),
    borderBottomRightRadius: WP(3),
    marginBottom: HP(1),
  },
  saveButton: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(1.3),
    borderRadius: WP(2),
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
  },
  timePickersContainer: {
    flexDirection: 'row',
    paddingHorizontal: WP(3),
    justifyContent: 'space-between',
  },
  timePickerContainer: {
    flex: 1,
    marginHorizontal: WP(1),
  },
  timePickerWrapper: {
    position: 'relative',
    height: HP(24.5),
    overflow: 'hidden',
    borderRadius: WP(2),
  },
  timePickerTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-SemiBold',
    color: '#6A6565',
    marginBottom: HP(1.5),
    marginRight: WP(11),
    textAlign: 'center',
  },
  timePickerColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  timeColumnContainer: {
    height: '100%',
    justifyContent: 'center',
    flex: 1,
  },
  minuteColumn: {
    marginHorizontal: WP(0),
    paddingHorizontal: WP(0),
  },
  periodColumn: {
    flex: 0.6,
    marginLeft: WP(1.2),
    marginRight: WP(4.2),
    paddingHorizontal: WP(0.3),
  },
  timeColumn: {
    flex: 1,
  },
  infiniteScrollContent: {
    alignItems: 'center',
  },
  centerSelectionBox: {
    position: 'absolute',
    top: '50%',
    left: WP(1),
    right: WP(1),
    height: HP(3.7),
    marginTop: -HP(1.85),
    backgroundColor: '#E2E2E2',
    borderRadius: WP(2),
    zIndex: -1,
  },
  timeItem: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: HP(3.5),
  },
  timeItemTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(1),
  },
  timeText: {
    fontSize: FS(2.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#6A6565',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  periodText: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Medium',
    fontWeight: '300',
  },
  separatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(0.5),
    height: '100%',
    marginTop: HP(-0.1),
    marginLeft: HP(-0.5),
  },
  timeSeparator: {
    fontSize: FS(2.8),
    color: '#6A6565',
    textAlign: 'center',
    opacity: 0.9,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default BlockTimeModalOld;
