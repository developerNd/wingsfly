import React, {useState, useEffect, useRef} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import getBackMediaStorageService from '../../services/GetBack/getBackMediaStorageService';
import GetBackBridge from '../../services/GetBack/GetBackBridge';

const {width} = Dimensions.get('window');

const GetBackConfirmationScreen = ({navigation, route}) => {
  const {durationMinutes} = route.params;
  const [loading, setLoading] = useState(true);
  const [videoPath, setVideoPath] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    loadConfirmationVideo();
  }, []);

  const loadConfirmationVideo = async () => {
    try {
      const confirmationVideo = await getBackMediaStorageService.getConfirmationVideo();
      
      if (!confirmationVideo) {
        Alert.alert(
          'No Confirmation Video',
          'Please set up a confirmation video first in settings.',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
        return;
      }

      setVideoPath(confirmationVideo.filePath);
      setLoading(false);
    } catch (error) {
      console.error('Error loading confirmation video:', error);
      Alert.alert('Error', 'Failed to load confirmation video');
      navigation.goBack();
    }
  };

  const handleVideoEnd = () => {
    setCanProceed(true);
  };

  const handleVideoError = (error) => {
    console.error('Video playback error:', error);
    setVideoError(true);
    Alert.alert(
      'Video Error',
      'Failed to play confirmation video. Please check your video file.',
      [{text: 'OK', onPress: () => navigation.goBack()}]
    );
  };

  const handleNext = async () => {
    if (!canProceed) {
      Alert.alert(
        'Watch Video',
        'Please watch the confirmation video completely before proceeding.'
      );
      return;
    }

    setStarting(true);

    try {
      const success = await GetBackBridge.startGetBackLock(durationMinutes);
      
      if (success) {
        console.log('Get Back lock started successfully');
        // Navigation will be handled by native side
      } else {
        Alert.alert(
          'Error',
          'Failed to start Get Back. Please ensure you have granted all necessary permissions.'
        );
        setStarting(false);
      }
    } catch (error) {
      console.error('Error starting Get Back:', error);
      Alert.alert('Error', 'An error occurred while starting Get Back');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading confirmation video...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={starting}>
          <Icon name="arrow-back" size={WP(6)} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmation Video</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Video Player Container */}
        <View style={styles.videoWrapper}>
          <Text style={styles.instructionText}>
            Watch this confirmation message before starting your Get Back session
          </Text>
          
          <View style={styles.videoContainer}>
            {videoPath && !videoError ? (
              <Video
                ref={videoRef}
                source={{uri: `file://${videoPath}`}}
                style={styles.video}
                controls={false}
                resizeMode="contain"
                repeat={false}
                playInBackground={false}
                playWhenInactive={false}
                onEnd={handleVideoEnd}
                onError={handleVideoError}
                onLoad={() => console.log('Video loaded')}
              />
            ) : (
              <View style={styles.videoErrorContainer}>
                <Icon name="error-outline" size={WP(15)} color="#BDBDBD" />
                <Text style={styles.videoErrorText}>Video unavailable</Text>
              </View>
            )}
          </View>

        </View>

        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <View style={styles.infoRow}>
            <Icon name="timer" size={WP(6)} color={colors.Primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Lock Duration</Text>
              <Text style={styles.infoValue}>{durationMinutes} minutes</Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info-outline" size={WP(6)} color="#1976D2" />
          <View style={styles.infoBoxTextContainer}>
            <Text style={styles.infoBoxText}>
              • Your device will be locked during the session
            </Text>
            <Text style={styles.infoBoxText}>
              • Media will play randomly to help you focus
            </Text>
            <Text style={styles.infoBoxText}>
              • Cannot be stopped once started
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            !canProceed && styles.startButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed || starting}
          activeOpacity={0.8}>
          {starting ? (
            <ActivityIndicator color={colors.White} />
          ) : (
            <>
              <Text style={styles.startButtonText}>Next</Text>
              <Icon name="arrow-forward" size={WP(6)} color={colors.White} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#757575',
    marginTop: HP(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Bold',
    color: '#212121',
  },
  placeholder: {
    width: WP(10),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
  },
  videoWrapper: {
    marginBottom: HP(3),
  },
  instructionText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#424242',
    textAlign: 'center',
    marginBottom: HP(2),
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: WP(4),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoErrorText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#BDBDBD',
    marginTop: HP(2),
  },
  watchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    borderRadius: WP(3),
    marginTop: HP(2),
    borderLeftWidth: 4,
    borderLeftColor: colors.Primary,
  },
  watchingText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#1565C0',
    marginLeft: WP(2),
    flex: 1,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    borderRadius: WP(3),
    marginTop: HP(2),
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  readyText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#2E7D32',
    marginLeft: WP(2),
    flex: 1,
  },
  sessionInfo: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4),
    marginBottom: HP(2),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: WP(3),
    flex: 1,
  },
  infoLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#757575',
    marginBottom: HP(0.3),
  },
  infoValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#212121',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: WP(4),
    padding: WP(4),
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoBoxTextContainer: {
    marginLeft: WP(3),
    flex: 1,
  },
  infoBoxText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#1565C0',
    lineHeight: FS(2.2),
    marginBottom: HP(0.5),
  },
  bottomContainer: {
    backgroundColor: colors.White,
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    paddingVertical: HP(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#BDBDBD',
    elevation: 0,
    shadowOpacity: 0,
  },
  startButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    marginRight: WP(2),
  },
});

export default GetBackConfirmationScreen;