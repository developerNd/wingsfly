import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer, {
  State,
  Event,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import Voice from '@react-native-voice/voice';
import {HP, WP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';

const {width} = Dimensions.get('window');

const FullScreenAudioPlay = ({route, navigation}) => {
  const {audio, timerData} = route.params;
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);

  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceToast, setShowVoiceToast] = useState(false);
  const [voiceToastMessage, setVoiceToastMessage] = useState('');

  const timerIntervalRef = useRef(null);
  const voiceToastTimeoutRef = useRef(null);

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
            message: 'Audio player needs microphone access for voice commands.',
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
        const state = await TrackPlayer.getState();
        if (state === State.Paused || hasEnded) {
          if (hasEnded) {
            await TrackPlayer.seekTo(0);
          }
          await TrackPlayer.play();
          setHasEnded(false);
          showVoiceToastMessage('▶️ Playing');
        } else {
          showVoiceToastMessage('Already playing');
        }
      }
      // Pause/Stop command
      else if (text.includes('pause') || text.includes('stop')) {
        await TrackPlayer.pause();
        showVoiceToastMessage('⏸️ Paused');
      }
      // Restart command
      else if (text.includes('restart') || text.includes('replay') || text.includes('again')) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        setHasEnded(false);
        showVoiceToastMessage('🔄 Restarting');
      }
      // Skip forward commands
      else if (text.includes('forward') || text.includes('skip')) {
        const seconds = extractSeconds(text) || 10;
        const newPosition = Math.min(progress.position + seconds, progress.duration);
        await TrackPlayer.seekTo(newPosition);
        showVoiceToastMessage(`⏩ Forward ${seconds}s`);
      }
      // Skip backward commands
      else if (text.includes('backward') || text.includes('rewind') || text.includes('back')) {
        const seconds = extractSeconds(text) || 10;
        const newPosition = Math.max(progress.position - seconds, 0);
        await TrackPlayer.seekTo(newPosition);
        showVoiceToastMessage(`⏪ Backward ${seconds}s`);
      }
      // Seek to position
      else if (text.includes('go to') || text.includes('jump to')) {
        const seconds = extractSeconds(text);
        if (seconds !== null && seconds <= progress.duration) {
          await TrackPlayer.seekTo(seconds);
          showVoiceToastMessage(`⏩ Jumped to ${formatTime(seconds)}`);
        } else {
          showVoiceToastMessage('Invalid position');
        }
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
        const remaining = progress.duration - progress.position;
        showVoiceToastMessage(`⏱️ ${formatTime(remaining)} remaining`, 3000);
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
        '• "Play/Resume/Start" - Play audio\n' +
        '• "Pause/Stop" - Pause audio\n' +
        '• "Restart/Replay" - Restart from beginning\n\n' +
        '⏩ Navigation:\n' +
        '• "Forward [seconds]" - Skip forward\n' +
        '• "Backward/Rewind [seconds]" - Skip backward\n' +
        '• "Go to [seconds]" - Jump to position\n\n' +
        '⏱️ Info:\n' +
        '• "Time/Remaining" - Check time left\n\n' +
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
        console.log('⏰ Session expired in audio player - navigating back');
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

      // Pause audio before navigating
      TrackPlayer.pause().catch(err => console.error('Error pausing:', err));

      // Small delay to ensure state is updated
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    }
  }, [shouldNavigateBack, navigation, isListening]);

  // Listen for playback ended event
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async event => {
    if (event.type === Event.PlaybackQueueEnded) {
      console.log('Audio playback ended');
      setHasEnded(true);
    }
  });

  useEffect(() => {
    setIsBuffering(playbackState.state === State.Buffering);

    // Reset hasEnded when playback starts
    if (playbackState.state === State.Playing) {
      setHasEnded(false);
    }
  }, [playbackState]);

  const isPlaying = playbackState.state === State.Playing;
  const isPaused = playbackState.state === State.Paused;

  const togglePlayback = async () => {
    try {
      const state = await TrackPlayer.getState();
      console.log('Current state:', state, 'hasEnded:', hasEnded);

      // If audio has ended, restart from beginning
      if (hasEnded || state === State.Stopped || state === State.None) {
        console.log('Restarting audio from beginning');
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        setHasEnded(false);
      } else if (state === State.Playing) {
        await TrackPlayer.pause();
      } else if (state === State.Paused || state === State.Ready) {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setHasError(true);

      // Try to restart the track if there's an error
      try {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        setHasError(false);
        setHasEnded(false);
      } catch (retryError) {
        console.error('Error restarting playback:', retryError);
      }
    }
  };

  const handleSeek = async value => {
    try {
      await TrackPlayer.seekTo(value);
      setHasEnded(false);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = seconds => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = async () => {
    // Stop listening if active
    if (isListening) {
      await stopListening();
    }

    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
    navigation.goBack();
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

  // Determine the icon to show
  const getPlayButtonIcon = () => {
    if (isBuffering) {
      return <ActivityIndicator size="large" color="#FFFFFF" />;
    }

    if (hasError) {
      return <MaterialIcons name="refresh" size={WP(12)} color="#FFFFFF" />;
    }

    // Show play if paused, stopped, or ended
    if (hasEnded || isPaused || playbackState.state === State.Stopped) {
      return <MaterialIcons name="play-arrow" size={WP(14)} color="#FFFFFF" />;
    }

    // Show pause if playing
    if (isPlaying) {
      return <MaterialIcons name="pause" size={WP(14)} color="#FFFFFF" />;
    }

    // Default to play
    return <MaterialIcons name="play-arrow" size={WP(14)} color="#FFFFFF" />;
  };

  const remainingTime = getRemainingTime();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.Primary || '#1DB954'}
      />

      {/* Header with Timer */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons
            name="keyboard-arrow-left"
            size={WP(8)}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Now Playing</Text>
          {voiceSettings && voiceSettings.enabled && remainingTime !== null && (
            <View style={styles.timerBadge}>
              <MaterialIcons
                name="access-time"
                size={WP(3.5)}
                color="#FFFFFF"
              />
              <Text style={styles.timerBadgeText}>
                {formatTimeDisplay(remainingTime)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.backButton} />
      </View>

      {/* Voice Control Button - Top Right */}
      {voiceEnabled && !isSessionExpired && (
        <TouchableOpacity
          style={[
            styles.voiceButton,
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
      )}

      {/* Voice Help Button */}
      {voiceEnabled && !isSessionExpired && (
        <TouchableOpacity
          style={styles.helpButton}
          onPress={showVoiceCommandsHelp}
          activeOpacity={0.8}>
          <MaterialIcons
            name="help-outline"
            size={WP(4)}
            color={colors.Primary}
          />
        </TouchableOpacity>
      )}

      {/* Voice Toast */}
      {showVoiceToast && (
        <View style={styles.voiceToast}>
          <Text style={styles.voiceToastText}>{voiceToastMessage}</Text>
        </View>
      )}

      {/* Voice Recognition Status */}
      {isListening && (
        <View style={styles.listeningCard}>
          <MaterialIcons name="mic" size={WP(5)} color={colors.Primary} />
          <Text style={styles.listeningText}>Listening...</Text>
          {recognizedText !== '' && (
            <Text style={styles.recognizedText}>"{recognizedText}"</Text>
          )}
        </View>
      )}

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        <View style={styles.artworkWrapper}>
          <Image
            source={{
              uri:
                audio.thumbnail ||
                'https://via.placeholder.com/400/1DB954/FFFFFF?text=🎵',
            }}
            style={styles.artwork}
            resizeMode="cover"
          />

          {/* Animated Now Playing Indicator */}
          {isPlaying && !hasEnded && (
            <View style={styles.nowPlayingIndicator}>
              <MaterialIcons name="graphic-eq" size={WP(8)} color="#FFFFFF" />
            </View>
          )}

          {/* Ended Badge */}
          {hasEnded && (
            <View style={styles.endedBadge}>
              <MaterialIcons name="check-circle" size={WP(6)} color="#FFFFFF" />
              <Text style={styles.endedText}>Completed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {audio.title || audio.name || 'Unknown Track'}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          Audio Track
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={progress.duration || 1}
          value={progress.position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={colors.Primary || '#1DB954'}
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbTintColor={colors.Primary || '#1DB954'}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>

      {/* Controls - Only Play/Pause Button */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
          activeOpacity={0.7}
          disabled={isBuffering && !hasError}>
          {getPlayButtonIcon()}
        </TouchableOpacity>
      </View>

      {/* Status Indicator */}
      {isBuffering && <Text style={styles.statusText}>Loading...</Text>}
      {hasError && <Text style={styles.errorText}>Tap to retry</Text>}
      {hasEnded && <Text style={styles.statusText}>Tap to replay</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(1),
  },
  backButton: {
    width: WP(10),
    height: WP(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: HP(0.5),
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: WP(2.5),
    paddingVertical: HP(0.5),
    borderRadius: WP(4),
  },
  timerBadgeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(1),
  },
  voiceButton: {
    position: 'absolute',
    top: HP(2),
    right: WP(4),
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.Primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    zIndex: 1000,
  },
  voiceButtonActive: {
    backgroundColor: '#E53935',
  },
  helpButton: {
    position: 'absolute',
    top: HP(2),
    right: WP(18),
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
  },
  voiceToast: {
    position: 'absolute',
    top: HP(15),
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: WP(4),
    marginTop: HP(15),
    padding: WP(3),
    borderRadius: WP(2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
    paddingTop: HP(2),
  },
  artworkWrapper: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: WP(4),
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  nowPlayingIndicator: {
    position: 'absolute',
    top: WP(4),
    right: WP(4),
    backgroundColor: colors.Primary || '#1DB954',
    padding: WP(2),
    borderRadius: WP(2),
  },
  endedBadge: {
    position: 'absolute',
    top: WP(4),
    right: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: WP(3),
    paddingVertical: HP(0.8),
    borderRadius: WP(2),
  },
  endedText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(1),
  },
  infoContainer: {
    paddingHorizontal: WP(8),
    paddingTop: HP(4),
    paddingBottom: HP(2),
  },
  trackTitle: {
    fontSize: FS(2.4),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: HP(1),
  },
  trackArtist: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: WP(8),
    paddingVertical: HP(2),
  },
  slider: {
    width: '100%',
    height: HP(5),
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: WP(2),
  },
  timeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
    paddingVertical: HP(3),
  },
  playButton: {
    width: WP(20),
    height: WP(20),
    borderRadius: WP(10),
    backgroundColor: colors.Primary || '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.Primary || '#1DB954',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  statusText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingBottom: HP(2),
  },
  errorText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: '#FF3B30',
    textAlign: 'center',
    paddingBottom: HP(2),
  },
});

export default FullScreenAudioPlay;