import React, {useState, useRef, useEffect} from 'react';
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
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import getBackMediaStorageService from '../../services/GetBack/getBackMediaStorageService';

const GetBackScreen = ({navigation}) => {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [hasMedia, setHasMedia] = useState(false);
  const [hasConfirmation, setHasConfirmation] = useState(false);
  const [mediaCount, setMediaCount] = useState({total: 0, videoCount: 0, audioCount: 0});
  const sliderWidth = useRef(0);
  const pan = useRef(new Animated.Value(0)).current;

  const MIN_DURATION = 5;
  const MAX_DURATION = 1440;
  const THUMB_SIZE = WP(12);

  useEffect(() => {
    checkMediaStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkMediaStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkMediaStatus = async () => {
    try {
      const [hasConfiguredMedia, hasConfirmationVideo, count] = await Promise.all([
        getBackMediaStorageService.hasGetBackMedia(),
        getBackMediaStorageService.hasConfirmationVideo(),
        getBackMediaStorageService.getMediaCount(),
      ]);
      
      setHasMedia(hasConfiguredMedia);
      setHasConfirmation(hasConfirmationVideo);
      setMediaCount(count);
    } catch (error) {
      console.error('Error checking media status:', error);
    }
  };

  const handleStartGetBack = async () => {
    if (!hasConfirmation) {
      Alert.alert(
        'Confirmation Video Required',
        'Please set up a confirmation video first in media settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Go to Settings', onPress: () => navigation.navigate('GetBackMediaSettingsScreen')}
        ]
      );
      return;
    }

    if (!hasMedia) {
      Alert.alert(
        'Media Required',
        'Please add at least one audio or video file in media settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Go to Settings', onPress: () => navigation.navigate('GetBackMediaSettingsScreen')}
        ]
      );
      return;
    }

    // Navigate to confirmation screen
    navigation.navigate('GetBackConfirmationScreen', {
      durationMinutes: durationMinutes,
    });
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
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
      },
      onPanResponderMove: (evt, gestureState) => {
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
        pan.flattenOffset();
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
        <Headers title="Get Back" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBackground}>
            <Text style={styles.heroEmoji}>🎯</Text>
            <Text style={styles.heroEmoji}>💪</Text>
            <Text style={styles.heroEmoji}>⭐</Text>
          
          <Text style={styles.heroTitle}>Get Back on Track</Text>
        </View>
        </View>

        {/* Duration Settings Card */}
        <View style={styles.getBackCard}>
          <Text style={styles.cardTitle}>Your session</Text>
          
          {/* Duration Display */}
          <View style={styles.durationDisplay}>
            <Text style={styles.durationValue}>{formatDuration(durationMinutes)}</Text>
          </View>

          {/* End Time Display */}
          <View style={styles.endTimeDisplay}>
            <Text style={styles.endTimeLabel}>Session ends at {getEndTime()}</Text>
          </View>

          {/* Custom Slider Control */}
          <View 
            style={styles.sliderContainer}
            onLayout={handleSliderLayout}
          >
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill,
                  {width: `${currentPercentage}%`}
                ]} 
              />
            </View>
            
            <View style={styles.thumbContainer}>
              <Animated.View
                style={[
                  styles.thumbIcon,
                  {
                    transform: [{translateX: pan}]
                  }
                ]}
                {...panResponder.panHandlers}
              >
                <Icon name="play-arrow" size={WP(5)} color={colors.White} />
              </Animated.View>
            </View>
          </View>

          {/* Time Range Labels */}
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>5 min</Text>
            <Text style={styles.rangeLabel}>24 hours</Text>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Icon 
                name={hasConfirmation ? 'check-circle' : 'cancel'} 
                size={WP(5)} 
                color={hasConfirmation ? '#4CAF50' : '#FF5252'} 
              />
              <Text style={[
                styles.statusText,
                hasConfirmation && styles.statusTextActive
              ]}>
                Confirmation Video
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Icon 
                name={hasMedia ? 'check-circle' : 'cancel'} 
                size={WP(5)} 
                color={hasMedia ? '#4CAF50' : '#FF5252'} 
              />
              <Text style={[
                styles.statusText,
                hasMedia && styles.statusTextActive
              ]}>
                Media Files ({mediaCount.total})
              </Text>
            </View>
          </View>

          {/* Media Settings Button */}
          <TouchableOpacity
            style={styles.mediaSettingsButton}
            onPress={() => navigation.navigate('GetBackSettingsScreen')}
            activeOpacity={0.7}>
            <View style={styles.mediaSettingsContent}>
              <View style={styles.mediaSettingsLeft}>
                <Icon 
                  name="video-library" 
                  size={WP(6)} 
                  color={hasMedia && hasConfirmation ? '#4CAF50' : colors.Primary} 
                />
                <View style={styles.mediaSettingsTextContainer}>
                  <Text style={styles.mediaSettingsTitle}>
                    {hasMedia && hasConfirmation ? 'Media Configured' : 'Configure Media'}
                  </Text>
                  <Text style={styles.mediaSettingsSubtitle}>
                    {hasMedia && hasConfirmation 
                      ? `${mediaCount.videoCount} videos, ${mediaCount.audioCount} audio + confirmation`
                      : 'Set up confirmation video and media files'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={WP(6)} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Focus Image Section */}
        <View style={styles.focusSection}>
          <View style={styles.focusImagePlaceholder}>
            <Text style={styles.focusEmoji}>🎯</Text>
            <Text style={styles.focusEmoji}>🚀</Text>
            <Text style={styles.focusEmoji}>💎</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How Get Back Works</Text>
          
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Watch your confirmation video</Text>
          </View>

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Phone locks completely for duration</Text>
          </View>

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>One random media file plays during session</Text>
          </View>

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Automatically unlocks when time ends</Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Start Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            (!hasMedia || !hasConfirmation) && styles.startButtonDisabled
          ]}
          onPress={handleStartGetBack}
          activeOpacity={0.8}>
          <Icon name="play-arrow" size={WP(6)} color={colors.White} />
          <Text style={styles.startButtonText}>Start Get Back</Text>
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
  heroSection: {
    marginTop: HP(2),
    borderRadius: WP(4),
    overflow: 'hidden',
    height: HP(22),
    position: 'relative',
  },
  heroBackground: {
    flex: 1,
    backgroundColor: '#FF6B6B',
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
    marginRight: WP(20),
  },
  getBackCard: {
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
    backgroundColor: '#FF6B6B',
    borderRadius: HP(3),
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
    backgroundColor: '#FF6B6B',
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
    marginTop: HP(1),
    marginBottom: HP(2),
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  statusText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
    marginLeft: WP(2),
  },
  statusTextActive: {
    color: '#4CAF50',
    fontFamily: 'OpenSans-SemiBold',
  },
  mediaSettingsButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: WP(3),
    padding: WP(4),
    marginTop: HP(1),
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  focusSection: {
    marginTop: HP(3),
    borderRadius: WP(4),
    overflow: 'hidden',
    height: HP(20),
  },
  focusImagePlaceholder: {
    flex: 1,
    backgroundColor: '#FFD93D',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  focusEmoji: {
    fontSize: FS(6),
    marginHorizontal: WP(2),
  },
  infoCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(5),
    marginTop: HP(3),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  infoCardTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#363636',
    marginBottom: HP(2),
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  stepNumber: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
  },
  stepNumberText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  stepText: {
    flex: 1,
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#5B5B5B',
    lineHeight: FS(2.2),
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
    backgroundColor: '#FF6B6B',
    borderRadius: WP(8),
    paddingVertical: HP(2),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  startButtonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    marginLeft: WP(2),
  },
});

export default GetBackScreen;