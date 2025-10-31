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

  const timerIntervalRef = useRef(null);

  const {sessionStartTime, voiceSettings, isSessionExpired} = timerData || {};

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
      // Pause audio before navigating
      TrackPlayer.pause().catch(err => console.error('Error pausing:', err));

      // Small delay to ensure state is updated
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    }
  }, [shouldNavigateBack, navigation]);

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
