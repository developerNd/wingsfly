import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  PanResponder,
  Animated,
  AppState,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DigitalDetoxBridge from '../../services/DigitalDetox/DigitalDetoxBridge';
import detoxMediaStorageService from '../../services/DigitalDetox/detoxMediaStorageService';

// ✅ NEW: Get native module for event listening
const { DigitalDetoxModule } = NativeModules;

const DigitalDetoxScreen = ({navigation}) => {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [isDetoxActive, setIsDetoxActive] = useState(false);
  const sliderWidth = useRef(0);
  const pan = useRef(new Animated.Value(0)).current;
  const statusCheckInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const isCheckingStatus = useRef(false);
  const lastCheckTime = useRef(0);
  
  // ✅ NEW: Add event subscription ref
  const eventSubscription = useRef(null);

  const MIN_DURATION = 1;
  const MAX_DURATION = 1440;
  const THUMB_SIZE = WP(12);
  const CHECK_INTERVAL = 5000;
  const MIN_CHECK_DELAY = 2000;

  const checkDetoxStatus = useCallback(async () => {
    if (isCheckingStatus.current) {
      console.log('⏭️ Skipping check - already in progress');
      return;
    }

    const now = Date.now();
    if (now - lastCheckTime.current < MIN_CHECK_DELAY) {
      console.log('⏭️ Skipping check - too soon (only ' + (now - lastCheckTime.current) + 'ms since last check)');
      return;
    }

    if (!isMounted.current) {
      console.log('⏭️ Skipping check - component unmounted');
      return;
    }
    
    try {
      isCheckingStatus.current = true;
      lastCheckTime.current = now;
      
      console.log('========================================');
      console.log('🔍 Checking detox status...');
      
      const active = await Promise.race([
        DigitalDetoxBridge.isDetoxActive(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      if (isMounted.current) {
        console.log('📊 Detox status result:', active);
        console.log('🔄 Current UI state (before update):', isDetoxActive);
        setIsDetoxActive(active);
        console.log('✅ Updated UI state to:', active);
        console.log('========================================');
      }
    } catch (error) {
      if (error.message === 'Timeout') {
        console.error('⏱️ Detox status check timed out');
      } else {
        console.error('❌ Error checking detox status:', error);
      }
      if (isMounted.current) {
        setIsDetoxActive(false);
      }
    } finally {
      isCheckingStatus.current = false;
    }
  }, [isDetoxActive]);

  const checkMediaStatus = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const [hasConfiguredMedia, type] = await Promise.race([
        Promise.all([
          detoxMediaStorageService.hasDetoxMedia(),
          detoxMediaStorageService.getMediaType()
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      if (isMounted.current) {
        setHasMedia(hasConfiguredMedia);
        setMediaType(type);
      }
    } catch (error) {
      if (error.message !== 'Timeout') {
        console.error('❌ Error checking media status:', error);
      }
    }
  }, []);

  // ✅ NEW: Setup detox completion listener
  const setupDetoxCompletionListener = useCallback(() => {
    try {
      console.log('📢 Setting up detox completion listener');
      
      // Create event emitter
      const eventEmitter = new NativeEventEmitter(DigitalDetoxModule);
      
      // Listen for detox completion
      eventSubscription.current = eventEmitter.addListener(
        'DETOX_COMPLETED',
        () => {
          console.log('📢 DETOX_COMPLETED event received!');
          if (isMounted.current) {
            setIsDetoxActive(false);
            // Small delay to ensure UI updates smoothly
            setTimeout(() => {
              if (isMounted.current) {
                Alert.alert(
                  'Detox Complete',
                  'Your digital detox session has ended. Great job staying focused!'
                );
              }
            }, 500);
          }
        }
      );
      
      console.log('✅ Detox completion listener setup complete');
    } catch (error) {
      console.error('Error setting up detox completion listener:', error);
    }
  }, []);

  // ✅ UPDATED: Initial mount with event listener setup
  useEffect(() => {
    console.log('📱 DigitalDetoxScreen mounted');
    isMounted.current = true;
    
    // Setup detox completion listener
    setupDetoxCompletionListener();
    
    // Single initial check
    checkMediaStatus();
    checkDetoxStatus();

    return () => {
      console.log('📱 DigitalDetoxScreen unmounting');
      isMounted.current = false;
      
      // ✅ NEW: Clean up event listener
      if (eventSubscription.current) {
        eventSubscription.current.remove();
        eventSubscription.current = null;
        console.log('✅ Event listener cleaned up');
      }
      
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
    };
  }, [setupDetoxCompletionListener, checkMediaStatus, checkDetoxStatus]);

  useFocusEffect(
    useCallback(() => {
      console.log('🎯 Screen focused - setting up interval check');
      
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }

      checkDetoxStatus();
      checkMediaStatus();

      statusCheckInterval.current = setInterval(() => {
        if (isMounted.current) {
          checkDetoxStatus();
        }
      }, CHECK_INTERVAL);

      return () => {
        console.log('👋 Screen blurred - cleaning up interval');
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
        isCheckingStatus.current = false;
      };
    }, [checkDetoxStatus, checkMediaStatus])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground - checking status');
        if (isMounted.current) {
          setTimeout(() => {
            if (isMounted.current) {
              checkDetoxStatus();
            }
          }, 1000);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkDetoxStatus]);

  const handleStartDetox = async () => {
    try {
      if (isDetoxActive) {
        Alert.alert(
          'Detox Already Active',
          'A digital detox session is already running. Please wait for it to complete or use emergency exit (press volume buttons 5 times).',
          [{ text: 'OK' }]
        );
        return;
      }

      const success = await DigitalDetoxBridge.startDetoxLock(durationMinutes);
      if (success) {
        console.log('✅ Digital Detox lock started successfully');
        setIsDetoxActive(true);
        
        setTimeout(() => {
          if (isMounted.current) {
            checkDetoxStatus();
          }
        }, 2000);
      } else {
        Alert.alert(
          'Error',
          'Failed to start Digital Detox. Please ensure you have granted all necessary permissions.'
        );
      }
    } catch (error) {
      console.error('Error starting detox:', error);
      Alert.alert('Error', 'An error occurred while starting Digital Detox');
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    return `${hours}h ${mins}m`;
  };

  const getEndTime = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60000);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[endTime.getDay()];
    
    let hours = endTime.getHours();
    const minutes = endTime.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${dayName} ${hours}:${minutesStr} ${ampm}`;
  };

  const sliderToMinutes = (percentage) => {
    const normalizedValue = percentage / 100;
    const logMin = Math.log(MIN_DURATION);
    const logMax = Math.log(MAX_DURATION);
    const logValue = logMin + (logMax - logMin) * normalizedValue;
    const minutes = Math.round(Math.exp(logValue));
    
    if (minutes < 10) {
      return Math.max(1, Math.round(minutes));
    }
    if (minutes < 60) {
      return Math.round(minutes / 5) * 5;
    }
    return Math.round(minutes / 15) * 15;
  };

  const minutesToSlider = (minutes) => {
    const logMin = Math.log(MIN_DURATION);
    const logMax = Math.log(MAX_DURATION);
    const logValue = Math.log(minutes);
    return ((logValue - logMin) / (logMax - logMin)) * 100;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDetoxActive,
      onMoveShouldSetPanResponder: () => !isDetoxActive,
      onPanResponderGrant: () => {
        if (!isDetoxActive) {
          pan.setOffset(pan._value);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isDetoxActive) return;
        
        const maxPosition = sliderWidth.current - THUMB_SIZE;
        const newValue = Math.max(
          0, 
          Math.min(maxPosition, pan._offset + gestureState.dx)
        );
        
        pan.setValue(newValue - pan._offset);
        const percentage = (newValue / maxPosition) * 100;
        const minutes = sliderToMinutes(percentage);
        setDurationMinutes(minutes);
      },
      onPanResponderRelease: () => {
        if (!isDetoxActive) {
          pan.flattenOffset();
        }
      },
    })
  ).current;

  const handleSliderLayout = (event) => {
    const {width} = event.nativeEvent.layout;
    sliderWidth.current = width;
    
    const maxPosition = width - THUMB_SIZE;
    const initialPosition = (minutesToSlider(durationMinutes) / 100) * maxPosition;
    pan.setValue(initialPosition);
  };

  const currentPercentage = minutesToSlider(durationMinutes);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Digital Detox" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {isDetoxActive && (
          <View style={styles.activeDetoxBanner}>
            <Icon name="lock" size={WP(5)} color={colors.White} />
            <Text style={styles.activeDetoxText}>
              Detox session active - running in background
            </Text>
          </View>
        )}

        <View style={styles.heroSection}>
          <View style={styles.heroBackground}>
            <Text style={styles.heroEmoji}>🌸</Text>
            <Text style={styles.heroEmoji}>🦋</Text>
            <Text style={styles.heroEmoji}>🌻</Text>
          
            <Text style={styles.heroTitle}>Begin your detox</Text>
          </View>
        </View>

        <View style={[styles.detoxCard, isDetoxActive && styles.detoxCardDisabled]}>
          <Text style={styles.cardTitle}>Your detox</Text>
          
          <View style={styles.durationDisplay}>
            <Text style={[styles.durationValue, isDetoxActive && styles.textDisabled]}>
              {formatDuration(durationMinutes)}
            </Text>
          </View>

          <View style={styles.endTimeDisplay}>
            <Text style={[styles.endTimeLabel, isDetoxActive && styles.textDisabled]}>
              Phoneless till {getEndTime()}
            </Text>
          </View>

          <View 
            style={styles.sliderContainer}
            onLayout={handleSliderLayout}
          >
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill,
                  {width: `${currentPercentage}%`},
                  isDetoxActive && styles.sliderFillDisabled
                ]} 
              />
            </View>
            
            <View style={styles.thumbContainer}>
              <Animated.View
                style={[
                  styles.thumbIcon,
                  {
                    transform: [{translateX: pan}]
                  },
                  isDetoxActive && styles.thumbIconDisabled
                ]}
                {...panResponder.panHandlers}
              >
                <Icon name="power-settings-new" size={WP(5)} color={colors.White} />
              </Animated.View>
            </View>
          </View>

          <View style={styles.rangeLabels}>
            <Text style={[styles.rangeLabel, isDetoxActive && styles.textDisabled]}>5 min</Text>
            <Text style={[styles.rangeLabel, isDetoxActive && styles.textDisabled]}>24 hours</Text>
          </View>

          <View style={styles.statusContainer}>
            <Icon name="apps" size={WP(5)} color={isDetoxActive ? "#ccc" : "#999"} />
            <Text style={[styles.statusText, isDetoxActive && styles.textDisabled]}>
              Apps: {isDetoxActive ? 'Will be disabled' : 'Disabled'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.mediaSettingsButton, isDetoxActive && styles.buttonDisabled]}
            onPress={() => {
              if (isDetoxActive) {
                Alert.alert(
                  'Detox Active',
                  'Cannot change media settings while detox is active'
                );
                return;
              }
              navigation.navigate('DetoxMediaSettingsScreen');
            }}
            activeOpacity={isDetoxActive ? 1 : 0.7}
            disabled={isDetoxActive}>
            <View style={styles.mediaSettingsContent}>
              <View style={styles.mediaSettingsLeft}>
                <Icon 
                  name={hasMedia ? (mediaType === 'video' ? 'videocam' : 'music-note') : 'add-circle-outline'} 
                  size={WP(6)} 
                  color={isDetoxActive ? '#ccc' : (hasMedia ? colors.Primary : '#999')} 
                />
                <View style={styles.mediaSettingsTextContainer}>
                  <Text style={[styles.mediaSettingsTitle, isDetoxActive && styles.textDisabled]}>
                    {hasMedia ? `${mediaType === 'video' ? 'Video' : 'Audio'} configured` : 'Add Media'}
                  </Text>
                  <Text style={[styles.mediaSettingsSubtitle, isDetoxActive && styles.textDisabled]}>
                    {hasMedia ? 'Tap to change or remove' : 'Play video/audio during detox'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={WP(6)} color={isDetoxActive ? '#ccc' : '#999'} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.meditationSection}>
          <View style={styles.meditationImagePlaceholder}>
            <Text style={styles.meditationEmoji}>🧘</Text>
            <Text style={styles.meditationEmoji}>🌅</Text>
            <Text style={styles.meditationEmoji}>🏔️</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.startButton, isDetoxActive && styles.startButtonDisabled]}
          onPress={handleStartDetox}
          activeOpacity={isDetoxActive ? 1 : 0.8}
          disabled={isDetoxActive}>
          <Icon name="power-settings-new" size={WP(6)} color={colors.White} />
          <Text style={styles.startButtonText}>
            {isDetoxActive ? 'Detox Active' : 'Start'}
          </Text>
        </TouchableOpacity>
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
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(4),
  },
  activeDetoxBanner: {
    backgroundColor: '#FF6B6B',
    borderRadius: WP(3),
    padding: WP(4),
    marginTop: HP(2),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  activeDetoxText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    marginLeft: WP(2),
    flex: 1,
  },
  heroSection: {
    marginTop: HP(2),
    borderRadius: WP(4),
    overflow: 'hidden',
    height: HP(22),
    position: 'relative',
  },
  heroBackground: {
    flex: 1,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroEmoji: {
    fontSize: FS(5),
    position: 'absolute',
  },
  heroTitle: {
    fontSize: FS(3.3),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    zIndex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    marginTop: HP(14),
    marginRight: WP(27),
  },
  detoxCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(5),
    marginTop: HP(3),
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  detoxCardDisabled: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#363636',
    marginBottom: HP(2),
  },
  durationDisplay: {
    alignItems: 'flex-start',
    marginBottom: HP(1),
  },
  durationValue: {
    fontSize: FS(3),
    fontFamily: 'Roboto-Bold',
    color: '#363636',
  },
  textDisabled: {
    color: '#999',
  },
  endTimeDisplay: {
    marginBottom: HP(3),
  },
  endTimeLabel: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#5B5B5B',
  },
  sliderContainer: {
    height: HP(9),
    marginBottom: HP(1),
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrack: {
    height: HP(6),
    backgroundColor: '#E0E0E0',
    borderRadius: HP(3),
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.Primary,
    borderRadius: HP(3),
  },
  sliderFillDisabled: {
    backgroundColor: '#ccc',
  },
  thumbContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    paddingHorizontal: WP(6),
  },
  thumbIcon: {
    position: 'absolute',
    width: WP(12),
    height: WP(12),
    backgroundColor: colors.Primary,
    borderRadius: WP(6),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop: HP(1.5),
  },
  thumbIconDisabled: {
    backgroundColor: '#ccc',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(2),
  },
  rangeLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(1),
    marginBottom: HP(2),
  },
  statusText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
    marginLeft: WP(2),
  },
  mediaSettingsButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    padding: WP(4),
    marginTop: HP(1),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mediaSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaSettingsTextContainer: {
    marginLeft: WP(3),
    flex: 1,
  },
  mediaSettingsTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#363636',
    marginBottom: HP(0.3),
  },
  mediaSettingsSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
  },
  meditationSection: {
    marginTop: HP(3),
    borderRadius: WP(4),
    overflow: 'hidden',
    height: HP(20),
  },
  meditationImagePlaceholder: {
    flex: 1,
    backgroundColor: '#FFE5B4',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  meditationEmoji: {
    fontSize: FS(6),
    marginHorizontal: WP(2),
  },
  bottomSpacer: {
    height: HP(12),
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.White,
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(8),
    paddingVertical: HP(2),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    marginLeft: WP(2),
  },
});

export default DigitalDetoxScreen;