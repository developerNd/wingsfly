import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
  NativeModules,
  AppState,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
} from 'react-native-track-player';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import AudioPlayer from '../../Components/Audioplayer';
import VideoPlayer from '../../Components/Videoplayer';
import nightModeVoiceService from '../../services/NightModeVoiceService';
import {YOUTUBE_API_KEY} from '@env';

const {YouTubeNightModeModule} = NativeModules;

const YOUTUBE_KEY = YOUTUBE_API_KEY;
const STORAGE_KEY = '@morning_admin_content';
const VOICE_SETTINGS_KEY = '@morning_voice_settings'; 
const SESSION_TIMER_KEY = '@morning_session_timer';

let isServiceRegistered = false;
if (!isServiceRegistered) {
  try {
    TrackPlayer.registerPlaybackService(() => require('./playbackService'));
    isServiceRegistered = true;
  } catch (error) {
    console.log('Playback service already registered');
  }
}

const MorningVideosScreen = ({navigation, route}) => {
  const [content, setContent] = useState({videos: [], audios: []});
  const [videoDetails, setVideoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false);

  const playbackState = usePlaybackState();
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  // Timer and Voice Command States
  const [voiceSettings, setVoiceSettings] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [hasPlayedVoiceCommand, setHasPlayedVoiceCommand] = useState(false);

  const timerIntervalRef = useRef(null);
  const backgroundTimeRef = useRef(null);

  const lockMode = route.params?.lockMode || true;

  useEffect(() => {
    setupPlayer();
    nightModeVoiceService.initialize();

    return () => {
      TrackPlayer.reset().catch(err => console.log('Reset error:', err));
      nightModeVoiceService.cleanup();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const setupPlayer = async () => {
    try {
      try {
        const state = await TrackPlayer.getState();
        console.log('✅ TrackPlayer already initialized, state:', state);
        setIsPlayerInitialized(true);
        return;
      } catch (e) {
        console.log('Setting up TrackPlayer for first time...');
      }

      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });

      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [Capability.Play, Capability.Pause],
      });

      setIsPlayerInitialized(true);
      console.log('✅ TrackPlayer initialized successfully');
    } catch (error) {
      console.error('❌ TrackPlayer setup error:', error);
      if (!error.message?.includes('already initialized')) {
        Alert.alert('Error', 'Failed to initialize audio player');
      } else {
        setIsPlayerInitialized(true);
      }
    }
  };

  // Load voice settings and initialize timer
  const loadVoiceSettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setVoiceSettings(settings);
        console.log('📢 Voice settings loaded:', settings);
        return settings;
      }
      return null;
    } catch (error) {
      console.error('Error loading voice settings:', error);
      return null;
    }
  }, []);

  // Load or initialize session timer
  const loadSessionTimer = useCallback(async () => {
    try {
      const savedTimer = await AsyncStorage.getItem(SESSION_TIMER_KEY);
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer);
        console.log('⏱️ Existing timer data found:', timerData);

        const now = Date.now();
        const elapsed = Math.floor((now - timerData.startTime) / 1000);

        setSessionStartTime(timerData.startTime);
        setElapsedSeconds(elapsed);

        return timerData;
      } else {
        const now = Date.now();
        const newTimerData = {
          startTime: now,
          initialized: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          SESSION_TIMER_KEY,
          JSON.stringify(newTimerData),
        );
        setSessionStartTime(now);
        setElapsedSeconds(0);

        console.log('⏱️ New timer initialized:', newTimerData);
        return newTimerData;
      }
    } catch (error) {
      console.error('Error with session timer:', error);
      const now = Date.now();
      setSessionStartTime(now);
      setElapsedSeconds(0);
      return {startTime: now};
    }
  }, []);

  // Initialize timer and voice settings
  useEffect(() => {
    const initializeSession = async () => {
      const settings = await loadVoiceSettings();
      await loadSessionTimer();
    };

    initializeSession();
  }, [loadVoiceSettings, loadSessionTimer]);

  // Timer tick effect - Fixed 1 hour duration
  useEffect(() => {
    if (!sessionStartTime || !voiceSettings || !voiceSettings.enabled) {
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - sessionStartTime) / 1000);
      setElapsedSeconds(elapsed);

      // Fixed 1 hour duration (3600 seconds)
      const durationSeconds = 60 * 60; // 1 hour

      if (
        elapsed >= durationSeconds &&
        !isSessionExpired &&
        !hasPlayedVoiceCommand
      ) {
        console.log('⏰ Session duration reached (1 hour)!');
        handleSessionExpiry();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [
    sessionStartTime,
    voiceSettings,
    isSessionExpired,
    hasPlayedVoiceCommand,
  ]);

  // Handle session expiry
  const handleSessionExpiry = useCallback(async () => {
    console.log('🎯 Handling session expiry...');

    setIsSessionExpired(true);
    setHasPlayedVoiceCommand(true);

    // Stop any playing audio
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Error pausing audio:', error);
    }

    // Play voice command if enabled and message exists
    if (voiceSettings && voiceSettings.enabled && voiceSettings.text) {
      console.log('🔊 Playing voice command:', voiceSettings.text);

      setTimeout(async () => {
        try {
          await nightModeVoiceService.playSessionEndVoice(voiceSettings.text);
          console.log('✅ Voice command played successfully');
        } catch (error) {
          console.error('❌ Error playing voice command:', error);
        }
      }, 500);
    }
  }, [voiceSettings]);

  // Background time handling
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        console.log('📱 App went to background');
      } else if (nextAppState === 'active') {
        if (backgroundTimeRef.current) {
          const backgroundDuration = Date.now() - backgroundTimeRef.current;
          console.log(
            `📱 App returned, was in background for ${Math.floor(
              backgroundDuration / 1000,
            )}s`,
          );

          // Recalculate elapsed time
          if (sessionStartTime) {
            const newElapsed = Math.floor(
              (Date.now() - sessionStartTime) / 1000,
            );
            setElapsedSeconds(newElapsed);

            // Check if session expired while in background (1 hour = 3600 seconds)
            if (voiceSettings && voiceSettings.enabled) {
              const durationSeconds = 60 * 60; // Fixed 1 hour
              if (newElapsed >= durationSeconds && !isSessionExpired) {
                handleSessionExpiry();
              }
            }
          }

          backgroundTimeRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [sessionStartTime, voiceSettings, isSessionExpired, handleSessionExpiry]);

  // Listen for navigation from child screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContent();

      // Check if session expired while away
      if (sessionStartTime && voiceSettings && voiceSettings.enabled) {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime) / 1000);
        const durationSeconds = 60 * 60; // 1 hour

        if (elapsed >= durationSeconds && !isSessionExpired) {
          handleSessionExpiry();
        }
      }
    });

    return unsubscribe;
  }, [
    navigation,
    sessionStartTime,
    voiceSettings,
    isSessionExpired,
    handleSessionExpiry,
  ]);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    if (content.videos.length > 0) {
      fetchVideoDetails();
    }
  }, [content.videos]);

  useEffect(() => {
    let mounted = true;

    const enableLock = async () => {
      if (lockMode && YouTubeNightModeModule) {
        try {
          console.log('🔒 Enabling Morning Mode Lock...');
          await YouTubeNightModeModule.enableKioskLock();
          if (mounted) {
            setIsLocked(true);
            isLockedRef.current = true;
            console.log('✅ Lock enabled successfully');
          }
        } catch (error) {
          console.error('❌ Error enabling lock:', error);
          Alert.alert(
            'Lock Error',
            'Could not enable lock mode. Please check permissions.',
            [{text: 'OK', onPress: () => navigation.goBack()}],
          );
        }
      }
    };

    enableLock();

    return () => {
      mounted = false;
      if (isLockedRef.current && YouTubeNightModeModule) {
        console.log('🔓 Disabling lock on unmount...');
        YouTubeNightModeModule.disableKioskLock()
          .then(() => console.log('✅ Lock disabled'))
          .catch(err => console.error('❌ Error disabling lock:', err));
      }
    };
  }, [lockMode, navigation]);

  useEffect(() => {
    if (!isLocked) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🚫 Back button blocked - screen is locked');
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isLocked]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const savedContent = await AsyncStorage.getItem(STORAGE_KEY);

      if (savedContent) {
        const parsedContent = JSON.parse(savedContent);
        setContent({
          videos: parsedContent.videos || [],
          audios: parsedContent.audios || [],
        });

        if (
          (parsedContent.videos || []).length === 0 &&
          (parsedContent.audios || []).length === 0
        ) {
          setError(
            'No content available. Please add videos or audio files in settings.',
          );
        }
      } else {
        setError(
          'No content available. Please add videos or audio files in settings.',
        );
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load content');
      setLoading(false);
    }
  };

  const fetchVideoDetails = async () => {
    try {
      const videoIds = content.videos.map(v => v.videoId).join(',');

      if (!videoIds) return;

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.error) {
        console.error('YouTube API Error:', data.error);
        return;
      }

      const details = {};
      data.items.forEach(item => {
        details[item.id] = {
          title: item.snippet.title,
          description: item.snippet.description,
          channelName: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails.maxres?.url ||
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url,
          duration: formatDuration(item.contentDetails.duration),
        };
      });

      setVideoDetails(details);
    } catch (err) {
      console.error('Error fetching video details:', err);
    }
  };

  const formatDuration = isoDuration => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    const formattedMinutes = hours
      ? `${parseInt(hours) * 60 + parseInt(minutes || 0)}`
      : minutes || '0';
    const formattedSeconds = (seconds || '0').padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  // Get timer data to pass to child screens
  const getTimerData = () => ({
    sessionStartTime,
    voiceSettings,
    isSessionExpired,
  });

  const handleVideoPress = useCallback(
    video => {
      if (isSessionExpired) {
        Alert.alert(
          'Session Expired',
          'Your Morning Mode session has ended. Please exit and start a new session.',
        );
        return;
      }

      try {
        console.log('📹 Video pressed:', video.videoId);

        navigation.navigate('FullScreenVideoPlayer', {
          video: video,
          videoDetails: videoDetails[video.videoId] || {},
          timerData: getTimerData(),
        });
      } catch (error) {
        console.error('Error opening video:', error);
        Alert.alert('Error', 'Failed to open video player');
      }
    },
    [
      navigation,
      videoDetails,
      isSessionExpired,
      sessionStartTime,
      voiceSettings,
    ],
  );

  const handleAudioPress = useCallback(
    async audio => {
      if (isSessionExpired) {
        Alert.alert(
          'Session Expired',
          'Your Morning Mode session has ended. Please exit and start a new session.',
        );
        return;
      }

      try {
        console.log('🎵 Audio pressed:', audio.id);

        if (!isPlayerInitialized) {
          console.log('Player not initialized, setting up...');
          await setupPlayer();
        }

        const audioUrl = audio.url || audio.uri;

        if (!audioUrl) {
          throw new Error('Audio URL is missing');
        }

        await TrackPlayer.reset();

        const track = {
          id: audio.id,
          url: audioUrl,
          title: audio.title || audio.name || 'Audio',
          artist: 'Morning Mode Audio',
          artwork:
            audio.thumbnail ||
            'https://via.placeholder.com/300/FFA500/FFFFFF?text=🌅',
        };

        console.log('Adding track:', track);
        await TrackPlayer.add(track);
        await TrackPlayer.play();

        setCurrentPlayingAudio(audio.id);

        navigation.navigate('FullScreenAudioPlayer', {
          audio: audio,
          timerData: getTimerData(),
        });

        console.log('✅ Audio playing and navigated to player');
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        Alert.alert(
          'Audio Error',
          `Failed to play audio: ${error.message}\n\nPlease check if the audio URL is valid.`,
        );
      }
    },
    [
      isPlayerInitialized,
      navigation,
      isSessionExpired,
      setupPlayer,
      sessionStartTime,
      voiceSettings,
    ],
  );

  const handleSettingsPress = () => {
    navigation.navigate('MorningModeSettings');
  };

  const handleExitPress = () => {
    Alert.alert(
      'Exit Morning Mode?',
      'Are you sure you want to exit Morning Mode?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔓 User requested exit...');

              await TrackPlayer.reset();

              // Clear session timer
              await AsyncStorage.removeItem(SESSION_TIMER_KEY);

              if (YouTubeNightModeModule) {
                await YouTubeNightModeModule.disableKioskLock();
                isLockedRef.current = false;
                console.log('✅ Lock disabled successfully');
              }
              setIsLocked(false);
              navigation.goBack();
            } catch (error) {
              console.error('❌ Error disabling lock:', error);
              Alert.alert('Error', 'Failed to exit. Please try again.');
            }
          },
        },
      ],
      {cancelable: true},
    );
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

  // Get remaining time (fixed 1 hour)
  const getRemainingTime = () => {
    if (!voiceSettings || !voiceSettings.enabled) return null;

    const durationSeconds = 60 * 60; // Fixed 1 hour
    const remaining = Math.max(0, durationSeconds - elapsedSeconds);
    return remaining;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.Primary || '#FF0000'}
        />
        <Headers title="Morning Mode" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary || '#FF0000'} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.Primary || '#FF0000'}
        />
        <Headers title="Morning Mode" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={WP(15)} color="#606060" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.settingsButtonLarge}
            onPress={handleSettingsPress}>
            <MaterialIcons name="settings" size={WP(5)} color="#FFFFFF" />
            <Text style={styles.settingsButtonLargeText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const videos = isSessionExpired
    ? []
    : content.videos.map(v => ({...v, type: 'video'}));
  const audios = isSessionExpired
    ? []
    : content.audios.map(a => ({...a, type: 'audio'}));
  const remainingTime = getRemainingTime();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.Primary || '#FF0000'}
      />

      {isLocked ? (
        <View style={styles.lockedHeader}>
          <View style={styles.lockedTitleContainer}>
            <MaterialIcons
              name="lock"
              size={WP(6)}
              color="#FFFFFF"
              style={styles.lockIcon}
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.lockedTitle}>Morning Mode</Text>
              {voiceSettings &&
                voiceSettings.enabled &&
                remainingTime !== null && (
                  <Text style={styles.timerText}>
                    {isSessionExpired
                      ? 'Session Ended'
                      : `Time: ${formatTimeDisplay(remainingTime)}`}
                  </Text>
                )}
            </View>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitPress}>
            <MaterialIcons name="close" size={WP(6)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <Headers title="Morning Mode" />
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Session Expired Message */}
        {isSessionExpired && (
          <View style={styles.expiredContainer}>
            <View style={styles.sunIconContainer}>
              <Ionicons
                name="sunny"
                size={WP(17)}
                color={colors.Primary}
              />
            </View>

            <Text style={styles.expiredTitle}>Great Morning! 🌅</Text>

            <Text style={styles.expiredMessage}>
              {voiceSettings && voiceSettings.text
                ? voiceSettings.text
                : 'Ready to conquer the day!'}
            </Text>
          </View>
        )}

        {/* Videos Section */}
        {!isSessionExpired && videos.length > 0 && (
          <View style={styles.videoSection}>
            {videos.map(video => (
              <VideoPlayer
                key={`video-${video.id}`}
                video={video}
                videoDetails={videoDetails}
                onPlayPress={() => handleVideoPress(video)}
              />
            ))}
          </View>
        )}

        {/* Audio Section */}
        {!isSessionExpired && audios.length > 0 && (
          <View style={styles.audioSection}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Audio Tracks</Text>
              <Text style={styles.sectionSubtitle}>
                {audios.length} track{audios.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioScrollContent}
              style={styles.audioScrollView}>
              {audios.map(audio => (
                <AudioPlayer
                  key={`audio-${audio.id}`}
                  audio={audio}
                  isPlaying={currentPlayingAudio === audio.id}
                  playbackState={playbackState}
                  onPlayPress={() => handleAudioPress(audio)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.Primary || '#FF0000',
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  lockedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lockIcon: {
    marginRight: WP(2),
  },
  headerTextContainer: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  timerText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: HP(0.2),
  },
  exitButton: {
    padding: WP(2),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: WP(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingTop: HP(1),
    paddingBottom: HP(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(8),
  },
  errorText: {
    marginTop: HP(2),
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Medium',
    color: '#606060',
    textAlign: 'center',
  },
  settingsButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(3),
    backgroundColor: colors.Primary || '#FF0000',
    paddingHorizontal: WP(8),
    paddingVertical: HP(1.8),
    borderRadius: WP(3),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  settingsButtonLargeText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginLeft: WP(2),
  },
  expiredContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: WP(4),
    marginTop: HP(3),
    marginBottom: HP(2),
    paddingVertical: HP(8),
    paddingHorizontal: WP(6),
    borderRadius: WP(5),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sunIconContainer: {
    marginBottom: HP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredTitle: {
    fontSize: FS(3.5),
    fontFamily: 'OpenSans-Bold',
    color: '#F59E0B',
    marginBottom: HP(2.5),
    textAlign: 'center',
  },
  expiredMessage: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: FS(2.6),
    letterSpacing: 0.3,
  },
  videoSection: {
    marginBottom: HP(2),
  },
  audioSection: {
    marginTop: HP(1),
    marginBottom: HP(2),
    overflow: 'visible',
  },
  sectionHeaderContainer: {
    paddingHorizontal: WP(4),
    marginBottom: HP(1.5),
  },
  sectionTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
    marginBottom: HP(0.3),
  },
  sectionSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  audioScrollView: {
    paddingLeft: WP(4),
    overflow: 'visible',
  },
  audioScrollContent: {
    paddingRight: WP(4),
  },
});

export default MorningVideosScreen;