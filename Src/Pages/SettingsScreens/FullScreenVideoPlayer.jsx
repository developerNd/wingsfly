import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import YoutubePlayer from 'react-native-youtube-iframe';
import Voice from '@react-native-voice/voice';
import {HP, WP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';

const FullScreenVideoPlayer = ({route, navigation}) => {
  const {video, videoDetails, timerData} = route.params;
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);

  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceToast, setShowVoiceToast] = useState(false);
  const [voiceToastMessage, setVoiceToastMessage] = useState('');

  const playerRef = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef(null);
  const timerIntervalRef = useRef(null);
  const voiceToastTimeoutRef = useRef(null);

  const details = videoDetails || {};
  const {sessionStartTime, voiceSettings, isSessionExpired} = timerData || {};

  // Setup Voice Recognition
  useEffect(() => {
    setupVoiceRecognition();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (voiceToastTimeoutRef.current) {
        clearTimeout(voiceToastTimeoutRef.current);
      }
    };
  }, []);

  const setupVoiceRecognition = async () => {
    try {
      // Request microphone permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Video player needs microphone access for voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission denied');
          return;
        }
      }

      // Set up voice recognition event listeners
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      setVoiceEnabled(true);
      console.log('✅ Voice recognition setup complete');
    } catch (error) {
      console.error('Error setting up voice recognition:', error);
    }
  };

  const onSpeechStart = () => {
    console.log('🎤 Speech recognition started');
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    console.log('🎤 Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechResults = event => {
    const text = event.value[0].toLowerCase();
    console.log('🗣️ Recognized:', text);
    setRecognizedText(text);
    processVoiceCommand(text);
  };

  const onSpeechError = error => {
    console.error('Speech recognition error:', error);
    setIsListening(false);
    
    // Handle specific error codes
    if (error.error && error.error.code) {
      const errorCode = error.error.code;
      
      if (errorCode === '5') {
        console.log('Client side error, voice recognition available for retry');
      } else if (errorCode === '7') {
        showVoiceToastMessage('No speech detected. Try again.');
      } else if (errorCode === '6') {
        showVoiceToastMessage('No internet connection');
      }
    }
  };

  const startListening = async () => {
    if (!voiceEnabled) {
      Alert.alert(
        'Voice Commands Unavailable',
        'Please enable microphone permissions in settings.',
      );
      return;
    }

    if (isSessionExpired) {
      showVoiceToastMessage('Session has ended');
      return;
    }

    // Prevent starting if already listening
    if (isListening) {
      console.log('Already listening, ignoring request');
      return;
    }

    try {
      // Destroy and cleanup any existing session completely
      try {
        await Voice.destroy();
        await Voice.removeAllListeners();
      } catch (e) {
        console.log('No existing session to destroy');
      }
      
      // Re-setup listeners
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Start fresh recognition
      await Voice.start('en-US');
      setRecognizedText('');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      showVoiceToastMessage('Failed to start voice recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!isListening) {
      console.log('Not listening, ignoring stop request');
      return;
    }
    
    try {
      setIsListening(false);
      await Voice.stop();
      
      // Add small delay before allowing restart
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  };

  const showVoiceToastMessage = (message, duration = 2000) => {
    setVoiceToastMessage(message);
    setShowVoiceToast(true);

    if (voiceToastTimeoutRef.current) {
      clearTimeout(voiceToastTimeoutRef.current);
    }

    voiceToastTimeoutRef.current = setTimeout(() => {
      setShowVoiceToast(false);
    }, duration);
  };

  const processVoiceCommand = async text => {
    try {
      // Play command
      if (text.includes('play') || text.includes('resume') || text.includes('start')) {
        if (!isPlaying) {
          setIsPlaying(true);
          showVoiceToastMessage('▶️ Playing');
        } else {
          showVoiceToastMessage('Already playing');
        }
      }
      // Pause/Stop command
      else if (text.includes('pause') || text.includes('stop')) {
        if (isPlaying) {
          setIsPlaying(false);
          showVoiceToastMessage('⏸️ Paused');
        } else {
          showVoiceToastMessage('Already paused');
        }
      }
      // Toggle play/pause
      else if (text.includes('toggle')) {
        setIsPlaying(!isPlaying);
        showVoiceToastMessage(isPlaying ? '⏸️ Paused' : '▶️ Playing');
      }
      // Restart command
      else if (text.includes('restart') || text.includes('replay') || text.includes('again')) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          setIsPlaying(true);
          showVoiceToastMessage('🔄 Restarting video');
        }
      }
      // Skip forward commands
      else if (text.includes('forward') || text.includes('skip')) {
        const seconds = extractSeconds(text) || 10;
        if (playerRef.current) {
          playerRef.current.getCurrentTime().then(currentTime => {
            playerRef.current.seekTo(currentTime + seconds, true);
            showVoiceToastMessage(`⏩ Forward ${seconds}s`);
          });
        }
      }
      // Skip backward commands
      else if (text.includes('backward') || text.includes('rewind') || text.includes('back')) {
        const seconds = extractSeconds(text) || 10;
        if (playerRef.current) {
          playerRef.current.getCurrentTime().then(currentTime => {
            const newTime = Math.max(0, currentTime - seconds);
            playerRef.current.seekTo(newTime, true);
            showVoiceToastMessage(`⏪ Backward ${seconds}s`);
          });
        }
      }
      // Fullscreen command
      else if (text.includes('fullscreen') || text.includes('full screen')) {
        showVoiceToastMessage('Entering fullscreen');
        // Note: Fullscreen is controlled by YouTube player itself
      }
      // Show/hide controls
      else if (text.includes('show controls')) {
        showControlsTemporarily();
        showVoiceToastMessage('📱 Controls visible');
      }
      // Go back command (exit player)
      else if (text.includes('exit') || text.includes('close') || text.includes('go back')) {
        showVoiceToastMessage('👋 Going back');
        setTimeout(() => {
          handleBack();
        }, 1000);
      }
      // Show time remaining
      else if (text.includes('time') || text.includes('remaining') || text.includes('left')) {
        if (voiceSettings && voiceSettings.enabled) {
          const remaining = getRemainingTime();
          if (remaining !== null) {
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const timeStr =
              hours > 0
                ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${
                    minutes !== 1 ? 's' : ''
                  }`
                : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            showVoiceToastMessage(`⏱️ ${timeStr} remaining`, 3000);
          }
        } else {
          showVoiceToastMessage('Timer not enabled');
        }
      }
      // Help command
      else if (text.includes('help') || text.includes('commands')) {
        showVoiceCommandsHelp();
      }
      // Command not recognized
      else {
        showVoiceToastMessage('Command not recognized. Say "help" for commands');
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      showVoiceToastMessage('Error processing command');
    }

    // Don't manually stop - let onSpeechEnd handle it naturally
  };

  // Extract seconds from voice command
  const extractSeconds = text => {
    // Look for numbers in the text
    const match = text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Handle word numbers
    const wordNumbers = {
      'five': 5, 'ten': 10, 'fifteen': 15, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
    };
    
    for (const [word, value] of Object.entries(wordNumbers)) {
      if (text.includes(word)) {
        return value;
      }
    }
    
    return null;
  };

  const showVoiceCommandsHelp = () => {
    Alert.alert(
      '🎤 Voice Commands',
      '▶️ Playback:\n' +
        '• "Play/Resume/Start" - Play video\n' +
        '• "Pause/Stop" - Pause video\n' +
        '• "Toggle" - Toggle play/pause\n' +
        '• "Restart/Replay" - Restart from beginning\n\n' +
        '⏩ Navigation:\n' +
        '• "Forward [seconds]" - Skip forward\n' +
        '• "Backward/Rewind [seconds]" - Skip backward\n\n' +
        '📱 Controls:\n' +
        '• "Show controls" - Display controls\n' +
        '• "Fullscreen" - Enter fullscreen\n\n' +
        '⏱️ Info:\n' +
        '• "Time/Remaining" - Check session time left\n\n' +
        '🚪 Exit:\n' +
        '• "Exit/Close/Go back" - Return to previous screen\n\n' +
        '❓ Help:\n' +
        '• "Help/Commands" - Show this help',
      [{text: 'Got it', style: 'default'}],
    );
  };

  // Timer tick effect
  useEffect(() => {
    if (
      !sessionStartTime ||
      !voiceSettings ||
      !voiceSettings.enabled ||
      isSessionExpired
    ) {
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Update immediately
    const now = Date.now();
    const elapsed = Math.floor((now - sessionStartTime) / 1000);
    setElapsedSeconds(elapsed);

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - sessionStartTime) / 1000);
      setElapsedSeconds(elapsed);

      // Fixed 1 hour duration (3600 seconds)
      const durationSeconds = 60 * 60;

      if (elapsed >= durationSeconds && !shouldNavigateBack) {
        console.log('⏰ Session expired in video player - navigating back');
        setShouldNavigateBack(true);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionStartTime, voiceSettings, isSessionExpired, shouldNavigateBack]);

  // Navigate back when session expires
  useEffect(() => {
    if (shouldNavigateBack) {
      // Stop listening if active
      if (isListening) {
        stopListening();
      }

      // Small delay to ensure state is updated
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    }
  }, [shouldNavigateBack, navigation, isListening]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && isPlayerReady && isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }

    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [showControls, isPlayerReady, isPlaying]);

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const onStateChange = useCallback(state => {
    console.log('Video state changed:', state);
    if (state === 'ended') {
      setIsPlaying(false);
      showControlsTemporarily();
    } else if (state === 'playing') {
      setIsPlaying(true);
      setIsPlayerReady(true);
    } else if (state === 'paused') {
      setIsPlaying(false);
      showControlsTemporarily();
    }
  }, []);

  const onReady = useCallback(() => {
    console.log('Player is ready');
    setIsPlayerReady(true);
  }, []);

  const handleBack = () => {
    // Stop listening if active
    if (isListening) {
      stopListening();
    }
    navigation.goBack();
  };

  const toggleControls = () => {
    if (showControls) {
      hideControls();
    } else {
      showControlsTemporarily();
    }
  };

  // Format time for display
  const formatTimeDisplay = seconds => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get remaining time
  const getRemainingTime = () => {
    if (!voiceSettings || !voiceSettings.enabled) return null;

    const durationSeconds = 60 * 60; // Fixed 1 hour
    const remaining = Math.max(0, durationSeconds - elapsedSeconds);
    return remaining;
  };

  const remainingTime = getRemainingTime();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        hidden={false}
      />

      {/* Top Header with Back Button and Timer */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={WP(7)} color="#FFFFFF" />
        </TouchableOpacity>

        {voiceSettings && voiceSettings.enabled && remainingTime !== null && (
          <View style={styles.timerContainer}>
            <MaterialIcons name="access-time" size={WP(4.5)} color="#FFFFFF" />
            <Text style={styles.timerText}>
              {formatTimeDisplay(remainingTime)}
            </Text>
          </View>
        )}

        {/* Voice Control Buttons - Top Right */}
        <View style={styles.topRightControls}>
          {voiceEnabled && !isSessionExpired && (
            <>
              <TouchableOpacity
                style={styles.helpButtonTop}
                onPress={showVoiceCommandsHelp}
                activeOpacity={0.8}>
                <MaterialIcons
                  name="help-outline"
                  size={WP(5)}
                  color={colors.White}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voiceButtonTop,
                  isListening && styles.voiceButtonActive,
                ]}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.8}>
                <MaterialIcons
                  name={isListening ? 'mic' : 'mic-none'}
                  size={WP(6)}
                  color={colors.White}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Voice Toast */}
      {showVoiceToast && (
        <View style={styles.voiceToast}>
          <Text style={styles.voiceToastText}>{voiceToastMessage}</Text>
        </View>
      )}

      {/* Voice Recognition Status */}
      {isListening && (
        <View style={styles.listeningCard}>
          <MaterialIcons name="mic" size={WP(5)} color="#FF0000" />
          <Text style={styles.listeningText}>Listening...</Text>
          {recognizedText !== '' && (
            <Text style={styles.recognizedText}>"{recognizedText}"</Text>
          )}
        </View>
      )}

      {/* Video Player */}
      <View style={styles.playerWrapper}>
        <YoutubePlayer
          ref={playerRef}
          height={HP(30)}
          play={isPlaying}
          videoId={video.videoId}
          onChangeState={onStateChange}
          onReady={onReady}
          webViewProps={{
            allowsFullscreenVideo: true,
            androidLayerType: 'hardware',
          }}
          initialPlayerParams={{
            modestbranding: true,
            controls: true,
            rel: false,
            preventFullScreen: false,
          }}
        />
      </View>

      {/* Video Info Below Player - YouTube Style */}
      <View style={styles.videoInfoSection}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {details.title || video.title || 'Video'}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.viewCount}>
            {details.viewCount ? formatViewCount(details.viewCount) : ''}
          </Text>
          {details.publishedAt && (
            <>
              <View style={styles.dot} />
              <Text style={styles.publishDate}>{details.publishedAt}</Text>
            </>
          )}
        </View>
        <View style={styles.channelRow}>
          <View style={styles.channelIcon}>
            <MaterialIcons
              name="account-circle"
              size={WP(9)}
              color="rgba(255, 255, 255, 0.7)"
            />
          </View>
          <Text style={styles.channelName} numberOfLines={1}>
            {details.channelName || 'YouTube'}
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {!isPlayerReady && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <MaterialIcons
              name="play-circle-outline"
              size={WP(20)}
              color="#FFFFFF"
            />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Helper function to format view count
const formatViewCount = count => {
  if (!count) return '';
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K views`;
  }
  return `${num} views`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(1),
    backgroundColor: '#000000',
  },
  backButton: {
    width: WP(11),
    height: WP(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(5.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(5),
  },
  timerText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(1.5),
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButtonTop: {
    width: WP(10),
    height: WP(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: WP(2),
  },
  voiceButtonTop: {
    width: WP(11),
    height: WP(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(5.5),
    backgroundColor: '#FF0000',
    elevation: 4,
    shadowColor: '#FF0000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  voiceButtonActive: {
    backgroundColor: '#E53935',
  },
  voiceToast: {
    position: 'absolute',
    top: HP(12),
    left: WP(4),
    right: WP(4),
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    borderRadius: WP(3),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 2000,
  },
  voiceToastText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  listeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: WP(4),
    marginTop: HP(1),
    padding: WP(3),
    borderRadius: WP(2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1000,
  },
  listeningText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(2),
    flex: 1,
  },
  recognizedText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginLeft: WP(2),
  },
  playerWrapper: {
    backgroundColor: '#000000',
    marginTop: HP(1),
  },
  videoInfoSection: {
    backgroundColor: '#000000',
    paddingHorizontal: WP(4),
    paddingTop: HP(0.5),
    paddingBottom: HP(2),
  },
  videoTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    lineHeight: FS(2.2),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCount: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dot: {
    width: WP(0.8),
    height: WP(0.8),
    borderRadius: WP(0.4),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: WP(2),
  },
  publishDate: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    marginRight: WP(3),
  },
  channelName: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: HP(2),
  },
});

export default FullScreenVideoPlayer;