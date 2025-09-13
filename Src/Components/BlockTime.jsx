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
  StatusBar,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';
import Sound from 'react-native-sound';

const BlockTimeModal = ({visible, onClose, onSave}) => {
  // REF-BASED STATE - Never triggers re-renders
  const stateRef = useRef({
    startHour: 11,
    startMinute: 30,
    startPeriod: 'AM',
    endHour: 12,
    endMinute: 30,
    endPeriod: 'AM',
  });

  // ENHANCED SCROLL ENGINE WITH OPTIMIZED INFINITE SCROLLING
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
      // OPTIMIZED: Pre-calculate repositioning thresholds
      minThreshold: 0,
      maxThreshold: 0,
      repositionOffset: 0,
      isRepositioning: false,
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
      minThreshold: 0,
      maxThreshold: 0,
      repositionOffset: 0,
      isRepositioning: false,
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
      minThreshold: 0,
      maxThreshold: 0,
      repositionOffset: 0,
      isRepositioning: false,
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
      minThreshold: 0,
      maxThreshold: 0,
      repositionOffset: 0,
      isRepositioning: false,
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
      lastCenterValue: null,
      lastCenterIndex: -1,
      isSnapping: false,
    },
  });

  // ANIMATED VALUES
  const animatedValues = useRef({
    startHour: new Animated.Value(0),
    startMinute: new Animated.Value(0),
    startPeriod: new Animated.Value(0),
    endHour: new Animated.Value(0),
    endMinute: new Animated.Value(0),
    endPeriod: new Animated.Value(0),
  });

  const scrollRefs = useRef({});

  // OPTIMIZED PERFORMANCE CONSTANTS
  const ENGINE = useMemo(
    () => ({
      hours: Array.from({length: 12}, (_, i) => i + 1),
      minutes: Array.from({length: 60}, (_, i) => i),
      periods: ['AM', 'PM'],
      ITEM_HEIGHT: HP(3.5),
      CENTER_INDEX: 3,
      BUFFER_SIZE: 4,
      SCROLL_THROTTLE: 1,
      SNAP_DELAY: 120,
      SOUND_THROTTLE: 30,
      VIB_THROTTLE: 30,
      VELOCITY_SMOOTH: 0.82,
      MOMENTUM_THRESHOLD: 0.15,
      FAST_SCROLL_THRESHOLD: 5,
      ULTRA_FAST_THRESHOLD: 10,
      MOMENTUM_DAMPING: 0.96,
      ROTATION_FACTOR: 15,
      SCALE_FACTOR: 0.85,
      SMOOTH_STOP_THRESHOLD: 2.5,
      VELOCITY_HISTORY_SIZE: 4,
      SMOOTH_STOP_DURATION: 350,
      DECELERATION_CURVE: 0.9,
      SNAP_TOLERANCE: 0.8,
      // OPTIMIZED: Reduced repositioning buffer for faster transitions
      REPOSITION_BUFFER: 2, // Reduced from 4 to 2
      REPOSITION_THRESHOLD: 1.5, // New threshold for earlier repositioning
    }),
    [],
  );

  // OPTIMIZED ARRAYS WITH BETTER INFINITE SCROLLING STRUCTURE
  const ARRAYS = useMemo(() => {
    // OPTIMIZED: Create more efficient infinite arrays
    const hoursExtended = [
      ...ENGINE.hours.slice(-ENGINE.BUFFER_SIZE), // [9, 10, 11, 12]
      ...ENGINE.hours, // [1-12]
      ...ENGINE.hours.slice(0, ENGINE.BUFFER_SIZE), // [1, 2, 3, 4]
    ];

    const minutesExtended = [
      ...ENGINE.minutes.slice(-ENGINE.BUFFER_SIZE), // [56, 57, 58, 59]
      ...ENGINE.minutes, // [0-59]
      ...ENGINE.minutes.slice(0, ENGINE.BUFFER_SIZE), // [0, 1, 2, 3]
    ];

    return {
      hours: hoursExtended,
      minutes: minutesExtended,
      periods: ENGINE.periods,
    };
  }, [ENGINE]);

  // FIXED SOUND POOL - Better error handling and null checks
  const audioEngine = useRef({
    scrollPool: [],
    selectSound: null,
    poolIndex: 0,
    ready: false,
    lastVibTime: 0,
    isInitializing: false,
  });

  // ENHANCED SOUND INITIALIZATION WITH BETTER ERROR HANDLING
  useEffect(() => {
    const initAudio = async () => {
      // Prevent multiple initializations
      if (audioEngine.current.isInitializing || audioEngine.current.ready) {
        return;
      }

      audioEngine.current.isInitializing = true;

      try {
        // Enable sound in silent mode
        Sound.setCategory('Playback', true);

        // Wait a bit for sound system to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create scroll sounds with proper error handling
        const scrollSounds = [];
        for (let i = 0; i < 3; i++) {
          try {
            const sound = new Sound('tic.wav', Sound.MAIN_BUNDLE, error => {
              if (error) {
                console.warn(`Failed to load scroll sound ${i}:`, error);
                return;
              }

              // Only set volume if sound loaded successfully
              try {
                sound.setVolume(0.8); // Reduced volume to avoid conflicts
              } catch (volError) {
                console.warn(
                  `Failed to set volume for scroll sound ${i}:`,
                  volError,
                );
              }
            });

            if (sound) {
              scrollSounds.push(sound);
            }
          } catch (soundError) {
            console.warn(`Error creating scroll sound ${i}:`, soundError);
          }
        }

        // Create select sound with error handling
        let selectSound = null;
        try {
          selectSound = new Sound('tic.wav', Sound.MAIN_BUNDLE, error => {
            if (error) {
              console.warn('Failed to load select sound:', error);
              return;
            }

            try {
              selectSound.setVolume(1.0);
            } catch (volError) {
              console.warn('Failed to set volume for select sound:', volError);
            }
          });
        } catch (selectError) {
          console.warn('Error creating select sound:', selectError);
        }

        // Update audio engine
        audioEngine.current = {
          scrollPool: scrollSounds,
          selectSound: selectSound,
          poolIndex: 0,
          ready: scrollSounds.length > 0, // Only ready if we have at least one sound
          lastVibTime: 0,
          isInitializing: false,
        };

        console.log(
          `Audio engine initialized with ${
            scrollSounds.length
          } scroll sounds and ${selectSound ? '1' : '0'} select sound`,
        );
      } catch (error) {
        console.warn('Audio initialization failed:', error);
        audioEngine.current = {
          scrollPool: [],
          selectSound: null,
          poolIndex: 0,
          ready: false,
          lastVibTime: 0,
          isInitializing: false,
        };
      }
    };

    if (visible) {
      // Small delay to avoid conflicts with other sound systems
      const timer = setTimeout(() => {
        initAudio();
      }, 200);

      return () => clearTimeout(timer);
    }

    return () => {
      // Cleanup on component unmount or when modal closes
      try {
        Object.values(scrollEngine.current).forEach(engine => {
          if (engine.animFrame) {
            cancelAnimationFrame(engine.animFrame);
            engine.animFrame = null;
          }
          if (engine.snapTimeout) {
            clearTimeout(engine.snapTimeout);
            engine.snapTimeout = null;
          }
        });

        // Safely cleanup audio resources
        if (audioEngine.current.scrollPool) {
          audioEngine.current.scrollPool.forEach(sound => {
            try {
              if (sound && typeof sound.release === 'function') {
                sound.release();
              }
            } catch (releaseError) {
              console.warn('Error releasing scroll sound:', releaseError);
            }
          });
        }

        if (audioEngine.current.selectSound) {
          try {
            if (typeof audioEngine.current.selectSound.release === 'function') {
              audioEngine.current.selectSound.release();
            }
          } catch (releaseError) {
            console.warn('Error releasing select sound:', releaseError);
          }
        }

        // Reset audio engine
        audioEngine.current = {
          scrollPool: [],
          selectSound: null,
          poolIndex: 0,
          ready: false,
          lastVibTime: 0,
          isInitializing: false,
        };
      } catch (cleanupError) {
        console.warn('Error during audio cleanup:', cleanupError);
      }
    };
  }, [visible]);

  // SMOOTH DIGIT TRANSITION SYSTEM
  const smoothDigitTransition = useRef({
    startHour: {currentPos: 0, targetPos: 0, animating: false},
    startMinute: {currentPos: 0, targetPos: 0, animating: false},
    startPeriod: {currentPos: 0, targetPos: 0, animating: false},
    endHour: {currentPos: 0, targetPos: 0, animating: false},
    endMinute: {currentPos: 0, targetPos: 0, animating: false},
    endPeriod: {currentPos: 0, targetPos: 0, animating: false},
  });

  // VELOCITY TRACKING
  const updateVelocityHistory = useCallback(
    (scrollType, velocity) => {
      const engine = scrollEngine.current[scrollType];

      engine.velocityHistory = engine.velocityHistory || [];
      engine.velocityHistory.push(velocity);

      if (engine.velocityHistory.length > ENGINE.VELOCITY_HISTORY_SIZE) {
        engine.velocityHistory.shift();
      }

      const avgVelocity =
        engine.velocityHistory.reduce((a, b) => a + b, 0) /
        engine.velocityHistory.length;
      return avgVelocity;
    },
    [ENGINE],
  );

  // ENHANCED AUDIO FUNCTIONS WITH BETTER ERROR HANDLING
  const playScrollSound = useCallback(
    (force = false) => {
      const audio = audioEngine.current;
      const now = Date.now();

      // Check if audio is ready and not initializing
      if (!audio.ready || audio.isInitializing) return;

      if (!force && now - audio.lastVibTime < ENGINE.SOUND_THROTTLE) return;

      try {
        const sound = audio.scrollPool[audio.poolIndex];
        if (
          sound &&
          typeof sound.stop === 'function' &&
          typeof sound.play === 'function'
        ) {
          sound.stop(() => {
            try {
              sound.play(success => {
                if (!success) {
                  console.warn('Failed to play scroll sound');
                }
              });
            } catch (playError) {
              console.warn('Error playing scroll sound:', playError);
            }
          });
          audio.poolIndex = (audio.poolIndex + 1) % audio.scrollPool.length;
          audio.lastVibTime = now;
        }
      } catch (error) {
        console.warn('Error in playScrollSound:', error);
      }
    },
    [ENGINE.SOUND_THROTTLE],
  );

  // ENHANCED VIBRATION WITH STRONGER INTENSITY
  const triggerVibration = useCallback(
    (intensity = 'light', force = false) => {
      const audio = audioEngine.current;
      const now = Date.now();

      if (!force && now - audio.lastVibTime < ENGINE.VIB_THROTTLE) return;

      try {
        let duration;
        if (Platform.OS === 'ios') {
          duration =
            intensity === 'strong' ? 70 : intensity === 'medium' ? 50 : 30;
        } else {
          duration =
            intensity === 'strong' ? 80 : intensity === 'medium' ? 50 : 30;
        }

        Vibration.vibrate(duration);
        audio.lastVibTime = now;
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    },
    [ENGINE.VIB_THROTTLE],
  );

  const playSelectSound = useCallback(() => {
    const audio = audioEngine.current;

    try {
      if (
        audio.ready &&
        audio.selectSound &&
        typeof audio.selectSound.play === 'function'
      ) {
        audio.selectSound.play(success => {
          if (!success) {
            console.warn('Failed to play select sound');
          }
        });
      }
    } catch (error) {
      console.warn('Error playing select sound:', error);
    }

    triggerVibration('strong', true);
  }, [triggerVibration]);

  // ENHANCED SMOOTH STOP SYSTEM
  const initiateSmoothStop = useCallback(
    (scrollType, currentY, velocity) => {
      const engine = scrollEngine.current[scrollType];
      const scrollRef = scrollRefs.current[scrollType];

      if (!scrollRef || engine.smoothStopActive || engine.isSnapping) return;

      engine.smoothStopActive = true;
      engine.isScrolling = false;
      engine.isSnapping = true;

      const rawIndex = currentY / ENGINE.ITEM_HEIGHT;
      const targetIndex = Math.round(rawIndex);
      const targetY = targetIndex * ENGINE.ITEM_HEIGHT;

      const distance = Math.abs(targetY - currentY);

      if (distance > ENGINE.SNAP_TOLERANCE) {
        const baseDuration =
          velocity > ENGINE.FAST_SCROLL_THRESHOLD
            ? ENGINE.SMOOTH_STOP_DURATION
            : Math.min(ENGINE.SMOOTH_STOP_DURATION * 0.6, distance * 10);

        const smoothStopEasing = t => {
          return (
            1 -
            Math.pow(1 - t, velocity > ENGINE.FAST_SCROLL_THRESHOLD ? 2.2 : 1.8)
          );
        };

        Animated.timing(animatedValues.current[scrollType], {
          toValue: targetY,
          duration: baseDuration,
          useNativeDriver: false,
          easing: smoothStopEasing,
        }).start(() => {
          engine.smoothStopActive = false;
          engine.isSnapping = false;
          smoothDigitTransition.current[scrollType].currentPos = targetY;
          smoothDigitTransition.current[scrollType].targetPos = targetY;
        });

        scrollRef.scrollTo({
          y: targetY,
          animated: true,
        });
      } else {
        engine.smoothStopActive = false;
        engine.isSnapping = false;
      }
    },
    [ENGINE],
  );

  // OPTIMIZED VALUE CALCULATION - Pre-computed for better performance
  const calculateValueFromPosition = useCallback(
    (scrollType, y, originalArray, isInfinite) => {
      const rawIndex = y / ENGINE.ITEM_HEIGHT;
      const currentCenterIndex = Math.round(rawIndex);

      if (isInfinite) {
        // OPTIMIZED: Faster modulo calculation with pre-computed values
        const adjustedIndex = currentCenterIndex - ENGINE.BUFFER_SIZE;
        const arrayLength = originalArray.length;

        // Use bitwise operations for faster modulo when possible
        let actualIndex;
        if (arrayLength === 12 || arrayLength === 60) {
          // For common cases, use optimized calculation
          actualIndex =
            ((adjustedIndex % arrayLength) + arrayLength) % arrayLength;
        } else {
          actualIndex =
            ((adjustedIndex % arrayLength) + arrayLength) % arrayLength;
        }

        return {
          value: originalArray[actualIndex],
          centerIndex: currentCenterIndex,
          actualIndex: actualIndex,
        };
      } else {
        const clampedIndex = Math.max(
          0,
          Math.min(ENGINE.periods.length - 1, currentCenterIndex),
        );
        return {
          value: ENGINE.periods[clampedIndex],
          centerIndex: currentCenterIndex,
          actualIndex: clampedIndex,
        };
      }
    },
    [ENGINE],
  );

  // OPTIMIZED INFINITE SCROLL REPOSITIONING - Much faster logic
  const handleInfiniteScrollRepositioning = useCallback(
    (scrollType, y, originalArray) => {
      const engine = scrollEngine.current[scrollType];
      const scrollRef = scrollRefs.current[scrollType];

      if (!scrollRef || engine.isSnapping || engine.isRepositioning)
        return false;

      // OPTIMIZED: Pre-calculated thresholds for faster checking
      if (engine.minThreshold === 0) {
        engine.minThreshold = ENGINE.REPOSITION_BUFFER * ENGINE.ITEM_HEIGHT;
        engine.maxThreshold =
          (originalArray.length +
            ENGINE.BUFFER_SIZE * ENGINE.REPOSITION_THRESHOLD) *
          ENGINE.ITEM_HEIGHT;
        engine.repositionOffset = originalArray.length * ENGINE.ITEM_HEIGHT;
      }

      // OPTIMIZED: Single condition check instead of multiple
      let newPosition = null;

      if (y < engine.minThreshold) {
        newPosition = y + engine.repositionOffset;
      } else if (y > engine.maxThreshold) {
        newPosition = y - engine.repositionOffset;
      }

      if (newPosition !== null) {
        engine.isRepositioning = true;

        // OPTIMIZED: Use immediate repositioning without animation frame delay
        scrollRef.scrollTo({y: newPosition, animated: false});
        animatedValues.current[scrollType].setValue(newPosition);
        smoothDigitTransition.current[scrollType].currentPos = newPosition;
        smoothDigitTransition.current[scrollType].targetPos = newPosition;
        engine.lastY = newPosition;
        engine.lastCenterIndex = Math.round(newPosition / ENGINE.ITEM_HEIGHT);

        // OPTIMIZED: Quick reset of repositioning flag
        requestAnimationFrame(() => {
          engine.isRepositioning = false;
        });

        return true;
      }

      return false;
    },
    [ENGINE],
  );

  // ENHANCED SCROLL HANDLER WITH OPTIMIZED INFINITE SCROLLING
  const createScrollHandler = useCallback(
    (scrollType, originalArray, isInfinite = true) => {
      return event => {
        const y = event.nativeEvent.contentOffset.y;
        const engine = scrollEngine.current[scrollType];
        const transition = smoothDigitTransition.current[scrollType];
        const now = Date.now();
        const prevY = engine.lastY;

        // Skip if currently snapping or repositioning
        if (engine.isSnapping || engine.isRepositioning) {
          return;
        }

        // OPTIMIZED: Handle infinite scroll repositioning first and early exit if repositioned
        if (
          isInfinite &&
          handleInfiniteScrollRepositioning(scrollType, y, originalArray)
        ) {
          return;
        }

        // Enhanced velocity calculation
        const deltaY = Math.abs(y - prevY);
        const timeDelta = Math.max(1, now - (engine.lastTime || now));
        const rawVelocity = (deltaY / timeDelta) * 16.67;

        engine.velocity =
          engine.velocity * ENGINE.VELOCITY_SMOOTH +
          rawVelocity * (1 - ENGINE.VELOCITY_SMOOTH);
        const avgVelocity = updateVelocityHistory(scrollType, engine.velocity);
        engine.lastTime = now;

        engine.isScrolling = deltaY > 0.5;

        const isFastScroll = avgVelocity > ENGINE.FAST_SCROLL_THRESHOLD;
        const isSlowScroll = avgVelocity < ENGINE.SMOOTH_STOP_THRESHOLD;

        // IMMEDIATE ANIMATED VALUE UPDATE
        animatedValues.current[scrollType].setValue(y);
        transition.currentPos = y;

        // OPTIMIZED: Use pre-computed value calculation
        const result = calculateValueFromPosition(
          scrollType,
          y,
          originalArray,
          isInfinite,
        );

        // OPTIMIZED: Combined center detection and value update
        if (engine.lastCenterIndex !== result.centerIndex) {
          engine.lastCenterIndex = result.centerIndex;

          if (engine.lastCenterValue !== result.value) {
            engine.lastCenterValue = result.value;

            // ENHANCED FEEDBACK with safer sound calls
            playScrollSound(true);
            triggerVibration('medium', true);
          }
        }

        // UPDATE STATE REF
        if (engine.targetValue !== result.value) {
          engine.targetValue = result.value;
          stateRef.current[scrollType] = result.value;
        }

        // ENHANCED SNAP HANDLING
        engine.isActive = true;

        if (engine.snapTimeout) clearTimeout(engine.snapTimeout);

        const snapDelay = isSlowScroll
          ? 80
          : isFastScroll
          ? 180
          : ENGINE.SNAP_DELAY;

        engine.snapTimeout = setTimeout(() => {
          if (
            !transition.animating &&
            !engine.smoothStopActive &&
            !engine.isSnapping &&
            !engine.isRepositioning
          ) {
            const currentY = y;
            const currentVelocity = avgVelocity;

            if (currentVelocity > ENGINE.SMOOTH_STOP_THRESHOLD) {
              initiateSmoothStop(scrollType, currentY, currentVelocity);
            } else {
              // Quick snap for very slow scrolling
              const rawIndex = currentY / ENGINE.ITEM_HEIGHT;
              const targetIndex = Math.round(rawIndex);
              const snapY = targetIndex * ENGINE.ITEM_HEIGHT;
              const scrollRef = scrollRefs.current[scrollType];

              if (
                scrollRef &&
                Math.abs(currentY - snapY) > ENGINE.SNAP_TOLERANCE
              ) {
                engine.isSnapping = true;
                scrollRef.scrollTo({y: snapY, animated: true});

                setTimeout(() => {
                  animatedValues.current[scrollType].setValue(snapY);
                  transition.currentPos = snapY;
                  transition.targetPos = snapY;
                  engine.isSnapping = false;
                }, 100);
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
      updateVelocityHistory,
      initiateSmoothStop,
      playScrollSound,
      triggerVibration,
      calculateValueFromPosition,
      handleInfiniteScrollRepositioning,
    ],
  );

  // STATIC HANDLERS
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
        if (index === -1) return ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT;
        return (index + ENGINE.BUFFER_SIZE) * ENGINE.ITEM_HEIGHT;
      } else if (scrollType.includes('Minute')) {
        const numericValue =
          typeof value === 'string' ? parseInt(value, 10) : value;
        const index = ENGINE.minutes.indexOf(numericValue);
        if (index === -1) return ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT;
        return (index + ENGINE.BUFFER_SIZE) * ENGINE.ITEM_HEIGHT;
      } else if (scrollType.includes('Period')) {
        const index = ENGINE.periods.indexOf(value);
        if (index === -1) return ENGINE.CENTER_INDEX * ENGINE.ITEM_HEIGHT;
        return (index + ENGINE.CENTER_INDEX) * ENGINE.ITEM_HEIGHT;
      }
      return 0;
    },
    [ENGINE],
  );

  // OPTIMIZED INITIALIZATION - Faster setup with pre-calculated thresholds
  useEffect(() => {
    if (!visible) return;

    // Calculate all positions immediately
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

    // OPTIMIZED: Pre-calculate infinite scroll thresholds
    Object.entries(scrollEngine.current).forEach(([key, engine]) => {
      if (key.includes('Hour') || key.includes('Minute')) {
        const originalArray = key.includes('Hour')
          ? ENGINE.hours
          : ENGINE.minutes;
        engine.minThreshold = ENGINE.REPOSITION_BUFFER * ENGINE.ITEM_HEIGHT;
        engine.maxThreshold =
          (originalArray.length +
            ENGINE.BUFFER_SIZE * ENGINE.REPOSITION_THRESHOLD) *
          ENGINE.ITEM_HEIGHT;
        engine.repositionOffset = originalArray.length * ENGINE.ITEM_HEIGHT;
      }
    });

    const timer = setTimeout(() => {
      Object.entries(positions).forEach(([key, pos]) => {
        const ref = scrollRefs.current[key];
        const engine = scrollEngine.current[key];
        if (ref && pos >= 0) {
          ref.scrollTo({y: pos, animated: false});
          animatedValues.current[key].setValue(pos);
          smoothDigitTransition.current[key].currentPos = pos;
          smoothDigitTransition.current[key].targetPos = pos;
          engine.lastY = pos;
          engine.lastCenterIndex = Math.round(pos / ENGINE.ITEM_HEIGHT);

          // Initialize center value tracking
          const originalArray = key.includes('Hour')
            ? ENGINE.hours
            : key.includes('Minute')
            ? ENGINE.minutes
            : ENGINE.periods;
          const isInfinite = !key.includes('Period');

          if (isInfinite) {
            const centerIndex = Math.round(pos / ENGINE.ITEM_HEIGHT);
            const adjustedIndex = centerIndex - ENGINE.BUFFER_SIZE;
            const actualIndex =
              ((adjustedIndex % originalArray.length) + originalArray.length) %
              originalArray.length;
            engine.lastCenterValue = originalArray[actualIndex];
          } else {
            const centerIndex = Math.round(pos / ENGINE.ITEM_HEIGHT);
            const clampedIndex = Math.max(
              0,
              Math.min(ENGINE.periods.length - 1, centerIndex),
            );
            engine.lastCenterValue = ENGINE.periods[clampedIndex];
          }
        }
      });
    }, 15); // Further reduced for faster initialization

    return () => clearTimeout(timer);
  }, [visible, ENGINE, getInitialPosition]);

  // ENHANCED ANIMATED PERIOD TEXT COMPONENT
  const AnimatedPeriodText = React.memo(({animatedValue, index, children}) => {
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
              outputRange: [
                'rgba(255,255,255,0.5)',
                'rgba(255,255,255,0.95)',
                'rgba(255,255,255,0.5)',
              ],
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
  });

  // ENHANCED TIME ITEM
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

      // ENHANCED ANIMATED ITEMS
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
                    outputRange: [
                      'rgba(255,255,255,0.6)',
                      'rgba(255,255,255,0.95)',
                      'rgba(255,255,255,0.6)',
                    ],
                    extrapolate: 'clamp',
                  }),
                  fontSize: animatedValue.interpolate({
                    inputRange: [
                      (index - 0.5) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 0.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: [FS(2.4), FS(2.6), FS(2.4)],
                    extrapolate: 'clamp',
                  }),
                  fontWeight: animatedValue.interpolate({
                    inputRange: [
                      (index - 0.5) * ENGINE.ITEM_HEIGHT,
                      index * ENGINE.ITEM_HEIGHT,
                      (index + 0.5) * ENGINE.ITEM_HEIGHT,
                    ],
                    outputRange: ['400', '700', '400'],
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

        const engine = scrollEngine.current[scrollType];
        engine.isSnapping = true;

        requestAnimationFrame(() => {
          ref.scrollTo({y: targetPos, animated: true});
          animatedValues.current[scrollType].setValue(targetPos);
          smoothDigitTransition.current[scrollType].currentPos = targetPos;
          smoothDigitTransition.current[scrollType].targetPos = targetPos;
          scrollEngine.current[scrollType].lastY = targetPos;
          scrollEngine.current[scrollType].lastCenterIndex = Math.round(
            targetPos / ENGINE.ITEM_HEIGHT,
          );

          // Reset snapping state after animation
          setTimeout(() => {
            engine.isSnapping = false;
          }, 300);
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
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Block Time</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.timePickersContainer}>
              {renderTimePicker('Start Time', 'start')}
              {renderTimePicker('End Time', 'end')}
            </View>
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
    backgroundColor: '#1C1C1E',
    borderRadius: WP(3),
    paddingBottom: HP(2.5),
    maxHeight: HP(78),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.8),
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#F5F5F5',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2),
  },
  cancelButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#FF9500',
  },
  saveButton: {
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2),
  },
  saveButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FF9500',
  },
  content: {
    backgroundColor: '#1C1C1E',
    paddingTop: HP(2),
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
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#F5F5F5',
    marginBottom: HP(1.5),
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: WP(2),
    zIndex: 5,
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    marginTop: HP(-0.2),
    marginLeft: HP(-0.5),
  },
  timeSeparator: {
    fontSize: FS(2.8),
    fontFamily: 'OpenSans-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    opacity: 0.9,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default BlockTimeModal;
