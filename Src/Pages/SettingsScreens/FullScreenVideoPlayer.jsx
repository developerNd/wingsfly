import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import YoutubePlayer from 'react-native-youtube-iframe';
import {HP, WP, FS} from '../../utils/dimentions';
import {colors} from '../../Helper/Contants';

const FullScreenVideoPlayer = ({route, navigation}) => {
  const {video, videoDetails} = route.params;
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef(null);

  const details = videoDetails || {};

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
    navigation.goBack();
  };

  const toggleControls = () => {
    if (showControls) {
      hideControls();
    } else {
      showControlsTemporarily();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        hidden={false}
      />

      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={WP(7)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
    //marginBottom: HP(1.5),
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
