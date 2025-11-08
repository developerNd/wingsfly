import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import TrackPlayer, {
  Capability,
  State,
  Event,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {supabase} from '../../../supabase';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const AudioFilesScreen = ({navigation}) => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const BUCKET_NAME = 'audio-files';

  // Listen to track changes
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackError],
    async event => {
      if (event.type === Event.PlaybackState) {
        console.log('Playback state:', event.state);
      }
      if (event.type === Event.PlaybackError) {
        console.error('Playback error:', event);
        Alert.alert('Playback Error', 'Failed to play audio file');
        setCurrentlyPlaying(null);
      }
    },
  );

  useEffect(() => {
    initializePlayer();
    fetchAudioFiles();

    return () => {
      // Only reset, don't destroy
      TrackPlayer.reset().catch(err => console.log('Cleanup error:', err));
    };
  }, []);

  const initializePlayer = async () => {
    try {
      // Try to get current state to check if already initialized
      try {
        const state = await TrackPlayer.getState();
        if (state !== undefined && state !== null) {
          console.log('Player already initialized with state:', state);
          setIsPlayerReady(true);
          return;
        }
      } catch (e) {
        console.log('Player not initialized yet, proceeding with setup');
      }

      console.log('Setting up TrackPlayer...');
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
        autoHandleInterruptions: true,
      });

      console.log('Updating player options...');
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: 'StopPlaybackAndRemoveNotification',
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
      });

      setIsPlayerReady(true);
      console.log('✅ Player setup complete');
    } catch (error) {
      console.error('❌ Error setting up player:', error);
      console.error('Error details:', JSON.stringify(error));
      // Set as ready anyway to allow retry
      setIsPlayerReady(true);
    }
  };

  const cleanupPlayer = async () => {
    try {
      await TrackPlayer.reset();
      // Don't call destroy as it may not be available in all versions
      console.log('Player cleanup complete');
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  };

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      setError('');

      const {data, error: fetchError} = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          sortBy: {column: 'created_at', order: 'desc'},
        });

      if (fetchError) throw fetchError;

      // Filter out folders and get only audio files
      const audioData = data.filter(file => file.id && file.name);

      // For PRIVATE buckets, use signed URLs with long expiry
      const filesWithUrls = await Promise.all(
        audioData.map(async file => {
          try {
            // Create signed URL with 7 days expiry (604800 seconds)
            const {data: signedUrlData, error: signedError} =
              await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(file.name, 604800); // 7 days

            if (signedError) {
              console.error(
                `Error creating signed URL for ${file.name}:`,
                signedError,
              );
              return null;
            }

            return {
              ...file,
              url: signedUrlData.signedUrl,
            };
          } catch (e) {
            console.error(`Error getting URL for ${file.name}:`, e);
            return null;
          }
        }),
      );

      // Filter out failed URLs
      const validFiles = filesWithUrls.filter(file => file !== null);

      console.log('Fetched audio files with signed URLs:', validFiles.length);
      setAudioFiles(validFiles);
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError(err.message || 'Failed to fetch audio files');
      Alert.alert('Error', 'Failed to load audio files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Updated verifyAudioUrl for signed URLs
  const verifyAudioUrl = async url => {
    try {
      console.log('Verifying URL accessibility...');

      // For signed URLs, just do a basic check
      if (!url || url === '') {
        return {
          success: false,
          error: 'Invalid URL',
        };
      }

      // Check if it's a signed URL (contains token)
      if (!url.includes('token=')) {
        return {
          success: false,
          error: 'URL is not properly signed. Please refresh the file list.',
        };
      }

      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          Accept: 'audio/*',
        },
      });

      console.log('URL Response Status:', response.status);

      if (response.status === 200) {
        return {success: true};
      }

      if (response.status === 403 || response.status === 401) {
        return {
          success: false,
          error:
            'Access denied. The URL may have expired. Please refresh the file list.',
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: 'File not found.',
        };
      }

      if (response.status === 400) {
        return {
          success: false,
          error:
            'Invalid request. The file URL may have expired. Please refresh the file list.',
        };
      }

      return {
        success: false,
        error: `Server error (${response.status}). Please try again.`,
      };
    } catch (error) {
      console.error('URL verification error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  };

  const formatFileSize = bytes => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = seconds => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = async file => {
    if (!isPlayerReady) {
      Alert.alert('Error', 'Audio player is not ready yet');
      return;
    }

    try {
      console.log('Playing audio:', file.name);
      console.log('Audio URL:', file.url);

      // Verify URL is accessible before attempting to play
      const urlCheck = await verifyAudioUrl(file.url);
      if (!urlCheck.success) {
        Alert.alert(
          'Cannot Play Audio',
          urlCheck.error +
            '\n\nPlease contact the administrator to fix the bucket permissions.',
          [
            {
              text: 'Copy URL',
              onPress: () => {
                // You can add Clipboard.setString(file.url) if you have @react-native-clipboard/clipboard installed
                console.log('URL to copy:', file.url);
              },
            },
            {text: 'OK'},
          ],
        );
        return;
      }

      const state = await TrackPlayer.getState();

      // If clicking on the currently playing track
      if (currentlyPlaying === file.id) {
        if (state === State.Playing) {
          console.log('Pausing current track');
          await TrackPlayer.pause();
          return;
        } else if (state === State.Paused) {
          console.log('Resuming current track');
          await TrackPlayer.play();
          return;
        }
      }

      // Stop and clear previous track
      console.log('Resetting player for new track');
      await TrackPlayer.reset();

      // Add new track with headers for authentication if needed
      await TrackPlayer.add({
        id: file.id,
        url: file.url,
        title: file.name,
        artist: 'Audio File',
        duration: 0,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'audio/*',
        },
      });

      console.log('Track added, starting playback');

      // Start playback
      await TrackPlayer.play();

      setCurrentlyPlaying(file.id);
      console.log('Playback started successfully');
    } catch (err) {
      console.error('Error in playAudio:', err);
      console.error('Error details:', JSON.stringify(err));
      Alert.alert(
        'Playback Error',
        `Failed to play audio: ${
          err.message || 'Unknown error'
        }\n\nThis is usually a permissions issue with the storage bucket.`,
      );
      setCurrentlyPlaying(null);
    }
  };

  const stopAudio = async () => {
    try {
      console.log('Stopping audio');
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      setCurrentlyPlaying(null);
    } catch (err) {
      console.error('Error stopping audio:', err);
    }
  };

  const isPlaying = useCallback(
    fileId => {
      return (
        currentlyPlaying === fileId &&
        (playbackState === State.Playing || playbackState === State.Buffering)
      );
    },
    [currentlyPlaying, playbackState],
  );

  const isPaused = useCallback(
    fileId => {
      return currentlyPlaying === fileId && playbackState === State.Paused;
    },
    [currentlyPlaying, playbackState],
  );

  const renderAudioItem = ({item}) => {
    const playing = isPlaying(item.id);
    const paused = isPaused(item.id);
    const isCurrentTrack = currentlyPlaying === item.id;
    const showProgress = isCurrentTrack && progress.duration > 0;

    return (
      <TouchableOpacity
        style={[styles.audioItem, isCurrentTrack && styles.audioItemPlaying]}
        onPress={() => playAudio(item)}
        activeOpacity={0.7}>
        <View style={styles.audioIcon}>
          <Text style={styles.audioIconText}>{playing ? '⏸' : '▶'}</Text>
        </View>

        <View style={styles.audioInfo}>
          <Text style={styles.audioName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.audioMeta}>
            <Text style={styles.audioMetaText}>
              {formatFileSize(item.metadata?.size)}
            </Text>
            <Text style={styles.audioMetaDot}>•</Text>
            <Text style={styles.audioMetaText}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        (progress.position / progress.duration) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {formatTime(progress.position)} /{' '}
                {formatTime(progress.duration)}
              </Text>
            </View>
          )}

          {isCurrentTrack && playbackState === State.Buffering && (
            <Text style={styles.bufferingText}>Loading...</Text>
          )}
        </View>

        {playing && (
          <View style={styles.playingIndicator}>
            <View style={styles.playingBar} />
            <View style={[styles.playingBar, styles.playingBarDelay1]} />
            <View style={[styles.playingBar, styles.playingBarDelay2]} />
          </View>
        )}

        {isCurrentTrack && (
          <TouchableOpacity style={styles.stopButton} onPress={stopAudio}>
            <Text style={styles.stopButtonText}>⏹</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎵</Text>
      <Text style={styles.emptyTitle}>No Audio Files</Text>
      <Text style={styles.emptyText}>
        Audio files uploaded by admin will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Audio Files" navigation={navigation} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
          <Text style={styles.loadingText}>Loading audio files...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Audio Files" navigation={navigation} />
      </View>

      <View style={styles.content}>
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {audioFiles.length} {audioFiles.length === 1 ? 'File' : 'Files'}
          </Text>
          <View style={styles.statsButtons}>
            {!isPlayerReady && (
              <TouchableOpacity
                onPress={initializePlayer}
                style={[styles.refreshButton, styles.initButton]}>
                <Text style={styles.refreshText}>Init Player</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={fetchAudioFiles}
              style={styles.refreshButton}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={audioFiles}
          renderItem={renderAudioItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            audioFiles.length === 0 ? styles.emptyList : styles.list
          }
          showsVerticalScrollIndicator={false}
        />
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
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    marginTop: HP(1),
  },
  statsText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  statsButtons: {
    flexDirection: 'row',
    gap: WP(2),
  },
  refreshButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(0.8),
    borderRadius: WP(2),
    backgroundColor: colors.Primary,
  },
  initButton: {
    backgroundColor: '#10B981',
  },
  refreshText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  list: {
    paddingBottom: HP(2),
  },
  emptyList: {
    flexGrow: 1,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.White,
    borderRadius: WP(3),
    padding: WP(4),
    marginTop: HP(1.5),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  audioItemPlaying: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: colors.Primary,
  },
  audioIcon: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(3),
  },
  audioIconText: {
    fontSize: FS(2),
    color: colors.White,
  },
  audioInfo: {
    flex: 1,
  },
  audioName: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.5),
  },
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioMetaText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  audioMetaDot: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginHorizontal: WP(2),
  },
  progressContainer: {
    marginTop: HP(1),
  },
  progressBar: {
    height: HP(0.5),
    backgroundColor: '#E5E7EB',
    borderRadius: HP(0.25),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.Primary,
  },
  progressText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(0.5),
  },
  bufferingText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: colors.Primary,
    marginTop: HP(0.5),
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HP(3),
    marginLeft: WP(2),
  },
  playingBar: {
    width: WP(1),
    backgroundColor: colors.Primary,
    marginHorizontal: WP(0.5),
    borderRadius: WP(0.5),
    height: '100%',
  },
  playingBarDelay1: {
    height: '70%',
  },
  playingBarDelay2: {
    height: '50%',
  },
  stopButton: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: WP(2),
  },
  stopButtonText: {
    fontSize: FS(1.8),
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(10),
  },
  emptyIcon: {
    fontSize: FS(6),
    marginBottom: HP(2),
  },
  emptyTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  emptyText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
  },
});

export default AudioFilesScreen;
