import React, {useState, useCallback, useRef, useEffect, useMemo} from 'react';
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

const {YouTubeNightModeModule} = NativeModules;

const YOUTUBE_API_KEY = 'AIzaSyBUAiHRSxge-MNkRD-TvmobkGf5FfNNGAg';
const STORAGE_KEY = '@youtube_admin_content';

// Register playback service ONCE at module level
let isServiceRegistered = false;
if (!isServiceRegistered) {
  try {
    TrackPlayer.registerPlaybackService(() => require('./playbackService'));
    isServiceRegistered = true;
  } catch (error) {
    console.log('Playback service already registered');
  }
}

const YouTubeVideosScreen = ({navigation, route}) => {
  const [content, setContent] = useState({videos: [], audios: []});
  const [videoDetails, setVideoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false);

  const playbackState = usePlaybackState();
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  const lockMode = route.params?.lockMode || true;

  // Initialize TrackPlayer
  useEffect(() => {
    setupPlayer();

    return () => {
      TrackPlayer.reset().catch(err => console.log('Reset error:', err));
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

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          console.log('📱 App going to background');
        }
      },
    );

    return () => subscription.remove();
  }, []);

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
          console.log('🔒 Enabling Night Mode Lock...');
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
  }, [lockMode]);

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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContent();
    });

    return unsubscribe;
  }, [navigation]);

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

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;

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

  const handleVideoPress = useCallback(
    video => {
      try {
        console.log('📹 Video pressed:', video.videoId);

        // Navigate to full-screen video player
        navigation.navigate('FullScreenVideoPlayer', {
          video: video,
          videoDetails: videoDetails[video.videoId] || {},
        });
      } catch (error) {
        console.error('Error opening video:', error);
        Alert.alert('Error', 'Failed to open video player');
      }
    },
    [navigation, videoDetails],
  );

  const handleAudioPress = useCallback(
    async audio => {
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
          artist: 'Night Mode Audio',
          artwork:
            audio.thumbnail ||
            'https://via.placeholder.com/300/1DB954/FFFFFF?text=🎵',
        };

        console.log('Adding track:', track);
        await TrackPlayer.add(track);
        await TrackPlayer.play();

        setCurrentPlayingAudio(audio.id);

        // Navigate to full-screen audio player
        navigation.navigate('FullScreenAudioPlayer', {
          audio: audio,
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
    [isPlayerInitialized, navigation],
  );

  const handleSettingsPress = () => {
    navigation.navigate('YouTubeSettings');
  };

  const handleExitPress = () => {
    Alert.alert(
      'Exit Night Mode?',
      'Are you sure you want to exit Night Mode?',
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.Primary || '#FF0000'}
        />
        <Headers title="Night Mode" />
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
        <Headers title="Night Mode" />
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

  const videos = content.videos.map(v => ({...v, type: 'video'}));
  const audios = content.audios.map(a => ({...a, type: 'audio'}));

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
            <Text style={styles.lockedTitle}>Night Mode Locked</Text>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitPress}>
            <MaterialIcons name="close" size={WP(6)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <Headers title="Night Mode" />
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Videos Section */}
        {videos.length > 0 && (
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

        {/* Audio Section with Horizontal Scroll */}
        {audios.length > 0 && (
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
  lockedTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
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

export default YouTubeVideosScreen;
