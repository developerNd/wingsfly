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
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import getBackMediaSupabaseService from '../../services/GetBack/getBackMediaSupabaseService';
import GetBackBridge from '../../services/GetBack/GetBackBridge';

const GetBackScreen = ({navigation}) => {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [hasMedia, setHasMedia] = useState(false);
  const [hasConfirmation, setHasConfirmation] = useState(false);
  const [mediaCount, setMediaCount] = useState({
    total: 0,
    videoCount: 0,
    audioCount: 0,
  });
  const [loadingMedia, setLoadingMedia] = useState(true);

  // ✅ NEW: DND state
  const [hasDndPermission, setHasDndPermission] = useState(false);
  const [checkingDnd, setCheckingDnd] = useState(true);

  const sliderWidth = useRef(0);
  const pan = useRef(new Animated.Value(0)).current;

  const MIN_DURATION = 1;
  const MAX_DURATION = 1440;
  const THUMB_SIZE = WP(12);

  // ✅ NEW: Check DND permission
  const checkDndStatus = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setCheckingDnd(true);
      }

      const hasPerm = await GetBackBridge.hasDndPermission();
      setHasDndPermission(hasPerm);
      console.log('📢 DND Permission:', hasPerm);
    } catch (error) {
      console.error('Error checking DND permission:', error);
      setHasDndPermission(false);
    } finally {
      if (showLoading) {
        setCheckingDnd(false);
      }
    }
  }, []);

  // ✅ NEW: Handle DND permission request
  const handleDndToggle = useCallback(async () => {
    try {
      await GetBackBridge.requestDndPermission();
      setTimeout(() => {
        checkDndStatus(false);
      }, 1000);
    } catch (error) {
      console.error('Error requesting DND permission:', error);
      Alert.alert('Error', 'Failed to open DND permission settings');
    }
  }, [checkDndStatus]);

  useEffect(() => {
    checkMediaStatus();
    checkDndStatus(); // ✅ Check DND on mount
  }, [checkDndStatus]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkMediaStatus();
      checkDndStatus(false); // ✅ Check DND on focus
    });
    return unsubscribe;
  }, [navigation, checkDndStatus]);

  const checkMediaStatus = useCallback(async () => {
    try {
      setLoadingMedia(true);
      console.log('📥 Fetching Get Back media from Supabase...');

      const [confirmationResult, mediaResult] = await Promise.all([
        getBackMediaSupabaseService.fetchConfirmationVideo(),
        getBackMediaSupabaseService.fetchGetBackMedia(),
      ]);

      console.log('✅ Confirmation result:', confirmationResult);
      console.log('✅ Media result:', mediaResult);

      setHasConfirmation(confirmationResult.hasConfirmation);
      setHasMedia(mediaResult.hasMedia);
      setMediaCount({
        total: mediaResult.files.length,
        videoCount: mediaResult.videoCount,
        audioCount: mediaResult.audioCount,
      });
    } catch (error) {
      console.error('❌ Error checking media status:', error);
      setHasMedia(false);
      setHasConfirmation(false);
      setMediaCount({total: 0, videoCount: 0, audioCount: 0});
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  const handleStartGetBack = async () => {
    // ✅ CHECK 1: DND Permission (MANDATORY)
    if (!hasDndPermission) {
      Alert.alert(
        'DND Permission Required',
        'Please enable Do Not Disturb access first. This is required for Get Back sessions.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Enable Now',
            onPress: handleDndToggle,
          },
        ],
      );
      return;
    }

    // ✅ CHECK 2: Confirmation Video
    if (!hasConfirmation) {
      Alert.alert(
        'Confirmation Video Required',
        'Please ask admin to set up a confirmation video first in the dashboard.',
        [{text: 'OK'}],
      );
      return;
    }

    // ✅ CHECK 3: Media Files
    if (!hasMedia) {
      Alert.alert(
        'Media Required',
        'Please ask admin to add at least one audio or video file in the dashboard.',
        [{text: 'OK'}],
      );
      return;
    }

    // All checks passed - proceed to confirmation screen
    navigation.navigate('GetBackConfirmationScreen', {
      durationMinutes: durationMinutes,
    });
  };

  const formatDuration = minutes => {
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

  const sliderToMinutes = percentage => {
    const normalizedValue = percentage / 100;
    const logMin = Math.log(MIN_DURATION);
    const logMax = Math.log(MAX_DURATION);
    const logValue = logMin + (logMax - logMin) * normalizedValue;
    const minutes = Math.round(Math.exp(logValue));

    if (minutes <= 10) {
      return Math.max(1, minutes);
    }

    if (minutes < 60) {
      return Math.round(minutes / 5) * 5;
    }

    return Math.round(minutes / 15) * 15;
  };

  const minutesToSlider = minutes => {
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
          Math.min(maxPosition, pan._offset + gestureState.dx),
        );

        pan.setValue(newValue - pan._offset);
        const percentage = (newValue / maxPosition) * 100;
        const minutes = sliderToMinutes(percentage);
        setDurationMinutes(minutes);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  const handleSliderLayout = event => {
    const {width} = event.nativeEvent.layout;
    sliderWidth.current = width;

    const maxPosition = width - THUMB_SIZE;
    const initialPosition =
      (minutesToSlider(durationMinutes) / 100) * maxPosition;
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

        {/* ✅ NEW: DND Control Card - ONLY show if permission NOT granted */}
        {!hasDndPermission && !checkingDnd && (
          <TouchableOpacity
            style={styles.dndCard}
            onPress={handleDndToggle}
            activeOpacity={0.7}>
            <View style={styles.dndContent}>
              <View style={styles.dndLeft}>
                <Icon name="notifications-off" size={WP(6)} color="#FF6B6B" />
                <View style={styles.dndTextContainer}>
                  <Text style={styles.dndTitle}>Enable Do Not Disturb</Text>
                  <Text style={styles.dndSubtitle}>
                    Grant permission for the best experience.
                  </Text>
                </View>
              </View>
              <Icon name="arrow-forward" size={WP(5)} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Duration Settings Card */}
        <View style={styles.getBackCard}>
          <Text style={styles.cardTitle}>Your session</Text>

          {/* Duration Display */}
          <View style={styles.durationDisplay}>
            <Text style={styles.durationValue}>
              {formatDuration(durationMinutes)}
            </Text>
          </View>

          {/* End Time Display */}
          <View style={styles.endTimeDisplay}>
            <Text style={styles.endTimeLabel}>
              Session ends at {getEndTime()}
            </Text>
          </View>

          {/* Custom Slider Control */}
          <View style={styles.sliderContainer} onLayout={handleSliderLayout}>
            <View style={styles.sliderTrack}>
              <View
                style={[styles.sliderFill, {width: `${currentPercentage}%`}]}
              />
            </View>

            <View style={styles.thumbContainer}>
              <Animated.View
                style={[
                  styles.thumbIcon,
                  {
                    transform: [{translateX: pan}],
                  },
                ]}
                {...panResponder.panHandlers}>
                <Icon name="play-arrow" size={WP(5)} color={colors.White} />
              </Animated.View>
            </View>
          </View>

          {/* Time Range Labels */}
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>1 min</Text>
            <Text style={styles.rangeLabel}>24 hours</Text>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Icon
                name={
                  loadingMedia
                    ? 'hourglass-empty'
                    : hasConfirmation
                    ? 'check-circle'
                    : 'cancel'
                }
                size={WP(5)}
                color={
                  loadingMedia
                    ? '#999'
                    : hasConfirmation
                    ? '#4CAF50'
                    : '#FF5252'
                }
              />
              <Text
                style={[
                  styles.statusText,
                  hasConfirmation && styles.statusTextActive,
                ]}>
                {loadingMedia ? 'Checking...' : 'Confirmation Video'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Icon
                name={
                  loadingMedia
                    ? 'hourglass-empty'
                    : hasMedia
                    ? 'check-circle'
                    : 'cancel'
                }
                size={WP(5)}
                color={loadingMedia ? '#999' : hasMedia ? '#4CAF50' : '#FF5252'}
              />
              <Text
                style={[
                  styles.statusText,
                  hasMedia && styles.statusTextActive,
                ]}>
                {loadingMedia
                  ? 'Checking...'
                  : `Media Files (${mediaCount.total})`}
              </Text>
            </View>
          </View>

          {/* Media Info Display */}
          <View style={styles.mediaInfoContainer}>
            <View style={styles.mediaSettingsContent}>
              <View style={styles.mediaSettingsLeft}>
                <Icon
                  name={
                    loadingMedia
                      ? 'hourglass-empty'
                      : hasMedia && hasConfirmation
                      ? 'cloud-done'
                      : 'cloud-off'
                  }
                  size={WP(6)}
                  color={
                    loadingMedia
                      ? '#999'
                      : hasMedia && hasConfirmation
                      ? '#4CAF50'
                      : '#FF6B6B'
                  }
                />
                <View style={styles.mediaSettingsTextContainer}>
                  <Text style={styles.mediaSettingsTitle}>
                    {loadingMedia
                      ? 'Loading media...'
                      : hasMedia && hasConfirmation
                      ? 'Media Configured'
                      : 'No media available'}
                  </Text>
                  <Text style={styles.mediaSettingsSubtitle}>
                    {loadingMedia
                      ? 'Checking Supabase...'
                      : hasMedia && hasConfirmation
                      ? `${mediaCount.videoCount} videos, ${mediaCount.audioCount} audio + confirmation`
                      : 'Admin can upload from dashboard'}
                  </Text>
                </View>
              </View>
              {!loadingMedia && (
                <TouchableOpacity
                  onPress={checkMediaStatus}
                  style={styles.refreshButton}>
                  <Icon name="refresh" size={WP(5)} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
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
            <Text style={styles.stepText}>
              Phone locks completely for duration
            </Text>
          </View>

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              One random media file plays during session
            </Text>
          </View>

          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Automatically unlocks when time ends
            </Text>
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
            (loadingMedia ||
              !hasMedia ||
              !hasConfirmation ||
              !hasDndPermission) &&
              styles.startButtonDisabled,
          ]}
          onPress={handleStartGetBack}
          disabled={
            loadingMedia || !hasMedia || !hasConfirmation || !hasDndPermission
          }
          activeOpacity={0.8}>
          <Icon name="play-arrow" size={WP(6)} color={colors.White} />
          <Text style={styles.startButtonText}>
            {loadingMedia
              ? 'Loading...'
              : !hasDndPermission
              ? 'DND Required'
              : 'Start Get Back'}
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
  // ✅ NEW: DND Card Styles
  dndCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4),
    marginTop: HP(2),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dndContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dndLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dndTextContainer: {
    marginLeft: WP(3),
    flex: 1,
  },
  dndTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#363636',
    marginBottom: HP(0.3),
  },
  dndSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
  },
  dndHint: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#999',
    marginTop: HP(1),
    fontStyle: 'italic',
  },
  getBackCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(5),
    marginTop: HP(2),
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
  mediaInfoContainer: {
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
  refreshButton: {
    padding: WP(2),
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
