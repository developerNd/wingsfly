import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Vibration,
  Animated,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {HP, WP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';
import Headers from '../../Components/Headers';
import Sound from 'react-native-sound';
import {alarmService} from '../../services/api/alarmService';
import {customAlarmService} from '../../services/Alarm/customAlarmService';
import {useAuth} from '../../contexts/AuthContext';
import DocumentPicker from 'react-native-document-picker';

const CreateAlarmScreen = ({route}) => {
  const navigation = useNavigation();
  const {user} = useAuth();

  // Basic state
  const [alarmLabel, setAlarmLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [timingMessage, setTimingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom tone state
  const [alarmTone, setAlarmTone] = useState('default');
  const [customToneUri, setCustomToneUri] = useState(null);
  const [customToneName, setCustomToneName] = useState('');

  // Time picker refs
  const stateRef = useRef({hour: 7, minute: 0});
  const scrollEngine = useRef({
    hour: {isScrolling: false, isSnapping: false, snapTimeout: null, userInitiated: false, programmaticScroll: false},
    minute: {isScrolling: false, isSnapping: false, snapTimeout: null, userInitiated: false, programmaticScroll: false},
  });
  const animatedValues = useRef({
    hour: new Animated.Value(0),
    minute: new Animated.Value(0),
  });
  const scrollRefs = useRef({});

  // Constants
  const ENGINE = useMemo(() => ({
    hours: Array.from({length: 24}, (_, i) => i),
    minutes: Array.from({length: 60}, (_, i) => i),
    ITEM_HEIGHT: HP(4.5),
    CENTER_INDEX: 2,
    BUFFER_SIZE: 4,
    SCROLL_THROTTLE: 16,
    SNAP_DELAY: 150,
  }), []);

  const ARRAYS = useMemo(() => {
    const hoursExtended = [
      ...ENGINE.hours.slice(-ENGINE.BUFFER_SIZE),
      ...ENGINE.hours,
      ...ENGINE.hours.slice(0, ENGINE.BUFFER_SIZE),
    ];
    const minutesExtended = [
      ...ENGINE.minutes.slice(-ENGINE.BUFFER_SIZE),
      ...ENGINE.minutes,
      ...ENGINE.minutes.slice(0, ENGINE.BUFFER_SIZE),
    ];
    return {hours: hoursExtended, minutes: minutesExtended};
  }, [ENGINE]);

  // Audio engine
  const audioEngine = useRef({
    scrollPool: [],
    poolIndex: 0,
    ready: false,
    lastVibTime: 0,
    lastSoundTime: 0,
  });

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        Sound.setCategory('Playback', true);
        const scrollSounds = [];
        for (let i = 0; i < 3; i++) {
          const sound = new Sound('tic.wav', Sound.MAIN_BUNDLE, error => {
            if (!error) sound.setVolume(0.8);
          });
          if (sound) scrollSounds.push(sound);
        }
        audioEngine.current = {
          scrollPool: scrollSounds,
          poolIndex: 0,
          ready: scrollSounds.length > 0,
          lastVibTime: 0,
          lastSoundTime: 0,
        };
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };

    const timer = setTimeout(initAudio, 200);
    return () => {
      clearTimeout(timer);
      try {
        audioEngine.current.scrollPool?.forEach(sound => {
          if (sound?.release) sound.release();
        });
      } catch (error) {
        console.warn('Audio cleanup error:', error);
      }
    };
  }, []);

  // Timing message calculation
  const getAlarmTimingMessage = useCallback(() => {
    const now = new Date();
    const timeString = `${stateRef.current.hour.toString().padStart(2, '0')}:${stateRef.current.minute.toString().padStart(2, '0')}`;
    const nextAlarmDate = customAlarmService.calculateNextAlarmTime(timeString, selectedDays);
    const timeDifference = nextAlarmDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeDifference / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntil === 0 && minutesUntil === 0) {
      return 'Alarm will ring in less than 1 minute';
    } else if (hoursUntil === 0) {
      return `Alarm will ring in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    } else if (minutesUntil === 0) {
      return `Alarm will ring in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
    } else {
      return `Alarm will ring in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    }
  }, [selectedDays]);

  // Audio functions
  const playScrollSound = useCallback(() => {
    const audio = audioEngine.current;
    const now = Date.now();
    if (!audio.ready || now - audio.lastSoundTime < 30) return;

    try {
      const sound = audio.scrollPool[audio.poolIndex];
      if (sound) {
        sound.stop(() => sound.play());
        audio.poolIndex = (audio.poolIndex + 1) % audio.scrollPool.length;
        audio.lastSoundTime = now;
      }
    } catch (error) {
      console.warn('Error in playScrollSound:', error);
    }
  }, []);

  const triggerVibration = useCallback((intensity = 'medium') => {
    const audio = audioEngine.current;
    const now = Date.now();
    if (now - audio.lastVibTime < 30) return;

    try {
      const duration = Platform.OS === 'ios' ? (intensity === 'strong' ? 70 : 50) : (intensity === 'strong' ? 80 : 50);
      Vibration.vibrate(duration);
      audio.lastVibTime = now;
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }, []);

  // Scroll calculation functions
  const calculateValueFromPosition = useCallback((scrollType, y, originalArray) => {
    const rawIndex = Math.round(y / ENGINE.ITEM_HEIGHT);
    let actualIndex = rawIndex - ENGINE.BUFFER_SIZE;

    while (actualIndex < 0) actualIndex += originalArray.length;
    while (actualIndex >= originalArray.length) actualIndex -= originalArray.length;

    return {
      value: originalArray[actualIndex],
      centerIndex: rawIndex,
      actualIndex: actualIndex,
    };
  }, [ENGINE]);

  const handleInfiniteScrollRepositioning = useCallback((scrollType, y, originalArray) => {
    const engine = scrollEngine.current[scrollType];
    const scrollRef = scrollRefs.current[scrollType];

    if (!scrollRef || engine.isSnapping || engine.programmaticScroll) return false;

    const bufferHeight = ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT;
    const originalArrayHeight = originalArray.length * ENGINE.ITEM_HEIGHT;
    const totalHeight = bufferHeight * 2 + originalArrayHeight;
    const minBoundary = bufferHeight * 0.25;
    const maxBoundary = totalHeight - bufferHeight * 0.25;

    let newPosition = null;
    if (y <= minBoundary) {
      newPosition = y + originalArrayHeight;
    } else if (y >= maxBoundary) {
      newPosition = y - originalArrayHeight;
    }

    if (newPosition !== null && newPosition >= 0 && newPosition < totalHeight) {
      engine.programmaticScroll = true;
      scrollRef.scrollTo({y: newPosition, animated: false});
      animatedValues.current[scrollType].setValue(newPosition);
      
      const result = calculateValueFromPosition(scrollType, newPosition, originalArray);
      stateRef.current[scrollType] = result.value;

      setTimeout(() => {engine.programmaticScroll = false;}, 50);
      return true;
    }
    return false;
  }, [ENGINE, calculateValueFromPosition]);

  // Scroll handlers
  const createScrollHandler = useCallback((scrollType, originalArray) => {
    return event => {
      const y = event.nativeEvent.contentOffset.y;
      const engine = scrollEngine.current[scrollType];

      if (engine.programmaticScroll) return;
      if (handleInfiniteScrollRepositioning(scrollType, y, originalArray)) return;

      animatedValues.current[scrollType].setValue(y);
      const result = calculateValueFromPosition(scrollType, y, originalArray);
      const previousValue = stateRef.current[scrollType];

      if (result.value !== previousValue) {
        stateRef.current[scrollType] = result.value;
        setTimingMessage(getAlarmTimingMessage());

        if (engine.userInitiated) {
          playScrollSound();
          triggerVibration('medium');
        }
      }

      engine.isScrolling = true;
    };
  }, [handleInfiniteScrollRepositioning, calculateValueFromPosition, getAlarmTimingMessage, playScrollSound, triggerVibration]);

  const createScrollEndHandler = useCallback((scrollType, originalArray) => {
    return () => {
      const engine = scrollEngine.current[scrollType];

      if (engine.snapTimeout) {
        clearTimeout(engine.snapTimeout);
        engine.snapTimeout = null;
      }

      if (engine.programmaticScroll) return;

      engine.userInitiated = true;
      engine.snapTimeout = setTimeout(() => {
        if (!engine.isSnapping && !engine.programmaticScroll) {
          const scrollRef = scrollRefs.current[scrollType];
          if (scrollRef) {
            const currentY = animatedValues.current[scrollType]._value;
            const targetIndex = Math.round(currentY / ENGINE.ITEM_HEIGHT);
            const snapY = targetIndex * ENGINE.ITEM_HEIGHT;
            const distance = Math.abs(currentY - snapY);

            if (distance > 1) {
              engine.isSnapping = true;
              engine.programmaticScroll = true;

              scrollRef.scrollTo({y: snapY, animated: true});

              const result = calculateValueFromPosition(scrollType, snapY, originalArray);
              stateRef.current[scrollType] = result.value;
              setTimingMessage(getAlarmTimingMessage());

              setTimeout(() => {
                engine.isSnapping = false;
                engine.programmaticScroll = false;
                engine.userInitiated = false;
                engine.isScrolling = false;
              }, 300);
            } else {
              engine.userInitiated = false;
              engine.isScrolling = false;
            }
          }
        }
        engine.snapTimeout = null;
      }, ENGINE.SNAP_DELAY);
    };
  }, [ENGINE, calculateValueFromPosition, getAlarmTimingMessage]);

  const createScrollBeginHandler = useCallback(scrollType => {
    return () => {
      const engine = scrollEngine.current[scrollType];
      if (!engine.programmaticScroll) {
        engine.userInitiated = true;
        engine.isScrolling = true;
      }
    };
  }, []);

  // Handlers
  const HANDLERS = useMemo(() => ({
    hour: createScrollHandler('hour', ENGINE.hours),
    minute: createScrollHandler('minute', ENGINE.minutes),
  }), [createScrollHandler, ENGINE]);

  const END_HANDLERS = useMemo(() => ({
    hour: createScrollEndHandler('hour', ENGINE.hours),
    minute: createScrollEndHandler('minute', ENGINE.minutes),
  }), [createScrollEndHandler, ENGINE]);

  const BEGIN_HANDLERS = useMemo(() => ({
    hour: createScrollBeginHandler('hour'),
    minute: createScrollBeginHandler('minute'),
  }), [createScrollBeginHandler]);

  // Position calculation
  const getInitialPosition = useCallback((scrollType, value) => {
    const originalArray = scrollType === 'hour' ? ENGINE.hours : ENGINE.minutes;
    const index = originalArray.indexOf(value);
    if (index === -1) return ENGINE.BUFFER_SIZE * ENGINE.ITEM_HEIGHT;
    return (index + ENGINE.BUFFER_SIZE) * ENGINE.ITEM_HEIGHT;
  }, [ENGINE]);

  // Initialize scroll positions
  useEffect(() => {
    const positions = {
      hour: getInitialPosition('hour', stateRef.current.hour),
      minute: getInitialPosition('minute', stateRef.current.minute),
    };

    setTimingMessage(getAlarmTimingMessage());

    const timer = setTimeout(() => {
      Object.entries(positions).forEach(([key, pos]) => {
        const ref = scrollRefs.current[key];
        const engine = scrollEngine.current[key];
        if (ref && pos >= 0) {
          engine.programmaticScroll = true;
          ref.scrollTo({y: pos, animated: false});
          animatedValues.current[key].setValue(pos);
          setTimeout(() => {engine.programmaticScroll = false;}, 100);
        }
      });
    }, 50);

    const intervalTimer = setInterval(() => {
      setTimingMessage(getAlarmTimingMessage());
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalTimer);
      Object.values(scrollEngine.current).forEach(engine => {
        if (engine.snapTimeout) clearTimeout(engine.snapTimeout);
      });
    };
  }, [ENGINE, getInitialPosition, getAlarmTimingMessage]);

  // Custom tone selection
  const selectCustomTone = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to your storage to select custom alarm tones.',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Storage permission is required to select custom tones.');
          return;
        }
      }

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        presentationStyle: 'fullScreen',
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const selectedFile = result[0];
        
        if (selectedFile.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an audio file smaller than 10MB.');
          return;
        }

        const finalUri = selectedFile.fileCopyUri || selectedFile.uri;
        
        setCustomToneUri(finalUri);
        setCustomToneName(selectedFile.name || 'Custom Tone');
        setAlarmTone('custom');
        
        Alert.alert('Success', `Custom tone "${selectedFile.name}" selected successfully!`);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled tone selection');
      } else {
        console.error('Error selecting custom tone:', error);
        Alert.alert('Error', 'Failed to select custom tone. Please try again.');
      }
    }
  };

  // Day selection functions
  const toggleDay = (day) => {
    setSelectedDays(prevDays => {
      const newDays = prevDays.includes(day) 
        ? prevDays.filter(d => d !== day)
        : [...prevDays, day];

      setTimeout(() => setTimingMessage(getAlarmTimingMessage()), 100);
      return newDays;
    });
  };

  const selectQuickOption = (option) => {
    let newDays = [];
    switch (option) {
      case 'weekdays':
        newDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        break;
      case 'weekends':
        newDays = ['Sat', 'Sun'];
        break;
      case 'everyday':
        newDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        break;
    }

    setSelectedDays(newDays);
    setTimeout(() => setTimingMessage(getAlarmTimingMessage()), 100);
  };

  // Save alarm
  const handleSave = async () => {
    if (isLoading || !user) return;

    setIsLoading(true);

    try {
      const state = stateRef.current;
      const formattedTime = `${state.hour.toString().padStart(2, '0')}:${state.minute.toString().padStart(2, '0')}`;
      const defaultLabel = alarmLabel.trim() || `Alarm ${customAlarmService.formatAlarmTime(formattedTime)}`;

      const alarmData = {
        userId: user.id,
        time: formattedTime,
        label: defaultLabel,
        days: selectedDays,
        isEnabled: true,
        toneType: alarmTone,
        customToneUri: alarmTone === 'custom' ? customToneUri : null,
        customToneName: alarmTone === 'custom' ? customToneName : null,
      };

      const newAlarm = await alarmService.createAlarm(alarmData);

      if (Platform.OS === 'android') {
        try {
          const result = await customAlarmService.scheduleAlarm({
            id: String(newAlarm.id),
            time: formattedTime,
            label: defaultLabel,
            days: selectedDays,
            is_enabled: true,
            userId: user.id,
            toneType: alarmTone,
            customToneUri: alarmTone === 'custom' ? customToneUri : null,
            customToneName: alarmTone === 'custom' ? customToneName : null,
          });
          
          console.log('Native alarm scheduled successfully:', result);
          
          const toneInfo = alarmTone === 'custom' ? ` with custom tone "${customToneName}"` : '';
          Alert.alert('Success', `Alarm created successfully${toneInfo}!`);
          
        } catch (nativeError) {
          console.error('Native alarm scheduling failed:', nativeError);
          Alert.alert(
            'Warning',
            'Alarm saved but native alarm scheduling failed. Please check app permissions.'
          );
        }
      } else {
        Alert.alert('Success', 'Alarm created successfully!');
      }

      if (route.params?.onSave) {
        route.params.onSave(newAlarm);
      }

      navigation.goBack();
      
    } catch (error) {
      console.error('Error creating alarm:', error);
      Alert.alert('Error', 'Failed to create alarm. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Time item component
  const TimeItem = React.memo(({item, index, scrollType}) => {
    const animatedValue = animatedValues.current[scrollType];
    const [currentFontWeight, setCurrentFontWeight] = useState('400');
    const [currentColor, setCurrentColor] = useState(colors.Shadow);

    useEffect(() => {
      const listener = animatedValue.addListener(({value}) => {
        const centerPosition = index * ENGINE.ITEM_HEIGHT;
        const distance = Math.abs(value - centerPosition);
        const threshold = ENGINE.ITEM_HEIGHT * 0.4;

        const newWeight = distance < threshold ? '700' : '400';
        const newColor = distance < threshold ? colors.Primary : colors.Shadow;

        if (currentFontWeight !== newWeight) setCurrentFontWeight(newWeight);
        if (currentColor !== newColor) setCurrentColor(newColor);
      });

      return () => animatedValue.removeListener(listener);
    }, [animatedValue, index, currentFontWeight, currentColor]);

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
                  outputRange: ['50deg', '35deg', '0deg', '-35deg', '-50deg'],
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
                  outputRange: [0.85, 0.92, 1.0, 0.92, 0.85],
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
        <Animated.Text
          style={[
            styles.timeText,
            {
              color: currentColor,
              fontSize: animatedValue.interpolate({
                inputRange: [
                  (index - 0.5) * ENGINE.ITEM_HEIGHT,
                  index * ENGINE.ITEM_HEIGHT,
                  (index + 0.5) * ENGINE.ITEM_HEIGHT,
                ],
                outputRange: [FS(2.4), FS(2.55), FS(2.4)],
                extrapolate: 'clamp',
              }),
              fontWeight: currentFontWeight,
            },
          ]}>
          {String(item).padStart(2, '0')}
        </Animated.Text>
      </Animated.View>
    );
  });

  // Time column renderer
  const renderTimeColumn = (items, scrollType) => {
    return (
      <View style={styles.timeColumnContainer}>
        <ScrollView
          ref={ref => (scrollRefs.current[scrollType] = ref)}
          style={styles.timeColumn}
          showsVerticalScrollIndicator={false}
          onScroll={HANDLERS[scrollType]}
          onScrollBeginDrag={BEGIN_HANDLERS[scrollType]}
          onMomentumScrollEnd={END_HANDLERS[scrollType]}
          onScrollEndDrag={END_HANDLERS[scrollType]}
          scrollEventThrottle={ENGINE.SCROLL_THROTTLE}
          bounces={false}
          bouncesZoom={false}
          decelerationRate="normal"
          removeClippedSubviews={false}
          contentContainerStyle={[
            styles.scrollContent,
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
            />
          ))}
        </ScrollView>
        <View style={styles.unitLabelContainer}>
          <Text style={styles.unitLabel}>
            {scrollType === 'hour' ? 'h' : 'min'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Create Alarm" navigation={navigation}>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#0059FF" size="small" />
            ) : (
              <Text style={styles.doneText}>Done</Text>
            )}
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.contentContainer}>
        {/* Time Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Time</Text>
          <View style={styles.timePickerContainer}>
            <View style={styles.centerLine} />
            <View style={styles.timePickerColumns}>
              {renderTimeColumn(ARRAYS.hours, 'hour')}
              <View style={styles.separatorContainer}>
                <Text style={styles.separator}>:</Text>
              </View>
              {renderTimeColumn(ARRAYS.minutes, 'minute')}
            </View>
          </View>

          <View style={styles.timingMessageContainer}>
            <Text style={styles.timingMessageText}>{timingMessage}</Text>
          </View>
        </View>
          
        {/* Label Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Label</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={alarmLabel}
              onChangeText={setAlarmLabel}
              placeholder="Enter alarm name (optional)"
              placeholderTextColor={colors.Shadow + '60'}
              maxLength={30}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Alarm Tone Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Tone</Text>
          <View style={styles.alarmToneContainer}>
            <View style={styles.toneOptionsRow}>
              {/* Default Tone Option */}
              <TouchableOpacity
                style={[
                  styles.toneOptionRow,
                  alarmTone === 'default' && styles.activeToneOptionRow,
                  isLoading && styles.disabledOption,
                ]}
                onPress={() => !isLoading && setAlarmTone('default')}
                disabled={isLoading}>
                <View style={styles.toneOptionRowContent}>
                  <View style={[
                    styles.radioButton,
                    alarmTone === 'default' && styles.radioButtonActive
                  ]} />
                  <View style={styles.toneInfoRow}>
                    <Text style={[
                      styles.toneTitleRow,
                      alarmTone === 'default' && styles.activeToneTitleRow
                    ]}>
                      Default Alarm
                    </Text>
                    <Text style={[
                      styles.toneDescriptionRow,
                      alarmTone === 'default' && styles.activeToneDescriptionRow
                    ]}>
                      System default tone
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Custom Tone Option */}
              <TouchableOpacity
                style={[
                  styles.toneOptionRow,
                  alarmTone === 'custom' && styles.activeToneOptionRow,
                  isLoading && styles.disabledOption,
                ]}
                onPress={() => !isLoading && selectCustomTone()}
                disabled={isLoading}>
                <View style={styles.toneOptionRowContent}>
                  <View style={[
                    styles.radioButton,
                    alarmTone === 'custom' && styles.radioButtonActive
                  ]} />
                  <View style={styles.toneInfoRow}>
                    <Text style={[
                      styles.toneTitleRow,
                      alarmTone === 'custom' && styles.activeToneTitleRow
                    ]}>
                      Custom Tone
                    </Text>
                    <Text style={[
                      styles.toneDescriptionRow,
                      alarmTone === 'custom' && styles.activeToneDescriptionRow
                    ]}>
                      {customToneName || 'Choose from files'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Select</Text>
          <View style={styles.quickOptionsContainer}>
            <View style={styles.quickOptions}>
              <TouchableOpacity
                style={[styles.quickOption, isLoading && styles.disabledOption]}
                onPress={() => !isLoading && selectQuickOption('weekdays')}
                disabled={isLoading}>
                <Text style={styles.quickOptionText}>Weekdays</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickOption, isLoading && styles.disabledOption]}
                onPress={() => !isLoading && selectQuickOption('weekends')}
                disabled={isLoading}>
                <Text style={styles.quickOptionText}>Weekends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickOption, isLoading && styles.disabledOption]}
                onPress={() => !isLoading && selectQuickOption('everyday')}
                disabled={isLoading}>
                <Text style={styles.quickOptionText}>Every Day</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repeat Days</Text>
          <View style={styles.daysSelectionContainer}>
            <View style={styles.daysContainer}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.activeDayButton,
                    isLoading && styles.disabledOption,
                  ]}
                  onPress={() => !isLoading && toggleDay(day)}
                  disabled={isLoading}>
                  <Text
                    style={[
                      styles.dayText,
                      selectedDays.includes(day) && styles.activeDayText,
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {selectedDays.length === 0
                ? 'One time alarm'
                : selectedDays.length === 7
                ? 'Every day'
                : `Repeats ${selectedDays.length} days a week`}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
    backgroundColor: colors.White,
    marginBottom: HP(1),
  },
  doneText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.3),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: WP(5),
  },
  section: {
    paddingVertical: HP(0.8),
  },
  sectionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1),
    marginLeft: WP(1.5),
  },

  // Time picker styles
  timePickerContainer: {
    height: HP(22.5),
    position: 'relative',
    backgroundColor: colors.White,
    borderRadius: WP(3),
    overflow: 'hidden',
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: WP(2),
    right: WP(2),
    height: HP(4.5),
    marginTop: -HP(2.25),
    backgroundColor: colors.Primary + '15',
    borderRadius: WP(3),
    zIndex: 1,
  },
  timePickerColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  timeColumnContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  timeColumn: {
    flex: 1,
  },
  unitLabelContainer: {
    position: 'absolute',
    top: '50%',
    right: WP(10),
    marginTop: -HP(1),
    zIndex: 2,
  },
  unitLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    opacity: 0.8,
  },
  scrollContent: {
    alignItems: 'center',
  },
  timeItem: {
    height: HP(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  timeText: {
    fontSize: FS(2.5),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  separatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(2),
  },
  separator: {
    fontSize: FS(3.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },

  // Timing message
  timingMessageContainer: {
    backgroundColor: colors.Primary + '08',
    paddingVertical: HP(1.66),
    paddingHorizontal: WP(4),
    borderRadius: WP(3),
    alignItems: 'center',
    marginTop: HP(1.5),
    borderWidth: 1,
    borderColor: colors.Primary + '20',
  },
  timingMessageText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    textAlign: 'center',
  },

  // Input container
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  textInput: {
    paddingVertical: HP(1.6),
    paddingHorizontal: WP(4),
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Black,
    borderRadius: WP(4),
  },

  // Alarm tone styles
  alarmToneContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(3),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toneOptionsRow: {
    flexDirection: 'row',
    gap: WP(3),
  },
  toneOptionRow: {
    flex: 1,
    paddingVertical: HP(1),
    paddingHorizontal: WP(3),
    borderRadius: WP(3),
    backgroundColor: colors.Primary + '05',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeToneOptionRow: {
    backgroundColor: colors.Primary + '15',
    borderColor: colors.Primary + '30',
  },
  toneOptionRowContent: {
    alignItems: 'center',
  },
  radioButton: {
    width: WP(4),
    height: WP(4),
    borderRadius: WP(2),
    borderWidth: 2,
    borderColor: colors.Shadow + '60',
    backgroundColor: 'transparent',
    marginBottom: HP(0.8),
  },
  radioButtonActive: {
    borderColor: colors.Primary,
    backgroundColor: colors.Primary,
  },
  toneInfoRow: {
    alignItems: 'center',
  },
  toneTitleRow: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.3),
    textAlign: 'center',
  },
  activeToneTitleRow: {
    color: colors.Primary,
  },
  toneDescriptionRow: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    lineHeight: FS(1.4),
  },
  activeToneDescriptionRow: {
    color: colors.Primary + 'AA',
  },

  // Quick options
  quickOptionsContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(3),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  quickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickOption: {
    flex: 1,
    paddingVertical: HP(1.2),
    marginHorizontal: WP(1),
    borderRadius: WP(3),
    backgroundColor: colors.Primary + '10',
    alignItems: 'center',
  },
  quickOptionText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },

  // Days selection
  daysSelectionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(3),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(0.8),
  },
  dayButton: {
    width: WP(11),
    height: WP(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(2.5),
  },
  activeDayButton: {
    backgroundColor: colors.Primary,
  },
  dayText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  activeDayText: {
    color: colors.White,
  },
  helperText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
    textAlign: 'center',
  },

  disabledOption: {
    opacity: 0.5,
  },

  bottomSpacer: {
    height: HP(3),
  },
});

export default CreateAlarmScreen;