import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import YoutubePlayer from 'react-native-youtube-iframe';
import {HP, WP, FS} from '../utils/dimentions';
import {useAuth} from '../contexts/AuthContext';
import {youtubeContentService} from '../services/api/youtubeContentService';
import {extractCategory} from '../utils/Contentfilter';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const ShortsComponent = ({
  visible,
  onClose,
  shorts,
  initialIndex = 0,
  onLoadMore,
  loading,
  onShortView,
}) => {
  const {user} = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  
  // Time tracking states
  const shortStartTimeRef = useRef(null);
  const currentPlayingShortRef = useRef(null);
  const timeTrackingIntervalRef = useRef(null);
  
  const flatListRef = useRef(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  });

  // Reset when modal visibility changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setPlaying(true);
      
      // Scroll to initial index after a short delay
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 300);
    } else {
      setPlaying(false);
      stopTimeTracking();
    }
  }, [visible, initialIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
    };
  }, []);

  // Track short view
  const trackShortView = useCallback(async (short) => {
    if (!user?.id || !short) return;

    try {
      const category = extractCategory(short.title, short.description || '');

      await youtubeContentService.trackContentView(user.id, {
        videoId: short.videoId,
        contentType: 'short',
        title: short.title,
        channelName: short.channelName,
        category: category,
        timeSpent: 0,
        isPositiveContent: true,
      });

      console.log(`Tracked short view:`, short.title, `Category: ${category}`);
      
      // Call parent callback if provided
      if (onShortView) {
        onShortView(short, currentIndex);
      }
    } catch (error) {
      console.error('Error tracking short view:', error);
    }
  }, [user, onShortView, currentIndex]);

  // Start tracking time
  const startTimeTracking = useCallback((short) => {
    if (!user?.id || !short) return;

    shortStartTimeRef.current = Date.now();
    currentPlayingShortRef.current = short;

    // Clear any existing interval
    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
    }

    // Update time every 3 seconds for shorts
    timeTrackingIntervalRef.current = setInterval(async () => {
      if (!shortStartTimeRef.current || !currentPlayingShortRef.current) return;

      const timeSpent = Math.floor((Date.now() - shortStartTimeRef.current) / 1000);
      
      if (timeSpent >= 3) {
        try {
          await youtubeContentService.updateTimeSpent(
            user.id,
            short.videoId,
            timeSpent
          );
          console.log(`Updated short time: ${timeSpent}s for ${short.title}`);
          shortStartTimeRef.current = Date.now(); // Reset
        } catch (error) {
          console.error('Error updating short time spent:', error);
        }
      }
    }, 3000);
  }, [user]);

  // Stop tracking time
  const stopTimeTracking = useCallback(async () => {
    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
      timeTrackingIntervalRef.current = null;
    }

    if (shortStartTimeRef.current && currentPlayingShortRef.current && user?.id) {
      const timeSpent = Math.floor((Date.now() - shortStartTimeRef.current) / 1000);
      
      if (timeSpent > 0) {
        try {
          await youtubeContentService.updateTimeSpent(
            user.id,
            currentPlayingShortRef.current.videoId,
            timeSpent
          );
          console.log(`Total time on short: ${timeSpent}s`);
        } catch (error) {
          console.error('Error updating final short time:', error);
        }
      }
    }

    shortStartTimeRef.current = null;
    currentPlayingShortRef.current = null;
  }, [user]);

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(({viewableItems}) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      
      if (newIndex !== currentIndex && newIndex !== null) {
        // Stop tracking previous short
        stopTimeTracking();
        
        setCurrentIndex(newIndex);
        
        // Track new short
        const newShort = shorts[newIndex];
        if (newShort) {
          trackShortView(newShort);
          
          // Start tracking time for new short
          if (playing) {
            startTimeTracking(newShort);
          }
        }
      }
    }
  }, [currentIndex, shorts, playing, stopTimeTracking, trackShortView, startTimeTracking]);

  const viewabilityConfigCallbackPairs = useRef([
    {viewabilityConfig: viewabilityConfig.current, onViewableItemsChanged},
  ]);

  // Handle player state change
  const handlePlayerStateChange = useCallback((state, index) => {
    if (index !== currentIndex) return; // Only handle current video
    
    const currentShort = shorts[index];
    
    if (state === 'playing') {
      setPlaying(true);
      if (currentShort) {
        startTimeTracking(currentShort);
      }
    } else if (state === 'paused') {
      setPlaying(false);
      stopTimeTracking();
    } else if (state === 'ended') {
      setPlaying(false);
      stopTimeTracking();
      
      // Auto-play next short
      if (index < shorts.length - 1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: index + 1,
            animated: true,
          });
        }, 300);
      }
    }
  }, [currentIndex, shorts, startTimeTracking, stopTimeTracking]);

  // Handle close
  const handleCloseShorts = useCallback(() => {
    stopTimeTracking();
    setPlaying(false);
    onClose();
  }, [onClose, stopTimeTracking]);

  // Handle end reached
  const handleEndReached = useCallback(() => {
    if (currentIndex >= shorts.length - 3 && onLoadMore) {
      console.log('Loading more shorts...');
      onLoadMore();
    }
  }, [currentIndex, shorts.length, onLoadMore]);

  // Render individual short item
  const renderShortItem = useCallback(({item, index}) => {
    const isActive = index === currentIndex;

    return (
      <View style={styles.shortPlayerContainer}>
        {/* Video Player */}
        <View style={styles.shortVideoWrapper}>
          <YoutubePlayer
            height={SCREEN_HEIGHT}
            width={SCREEN_WIDTH}
            play={isActive && visible && playing}
            videoId={item.videoId}
            onChangeState={(state) => handlePlayerStateChange(state, index)}
            onReady={() => {
              console.log('Short player ready:', item.title);
              if (isActive) {
                currentPlayingShortRef.current = item;
                if (playing) {
                  startTimeTracking(item);
                }
              }
            }}
            webViewStyle={{
              opacity: 0.99,
              backgroundColor: '#000000',
            }}
            webViewProps={{
              allowsFullscreenVideo: false,
              androidLayerType: 'hardware',
            }}
            initialPlayerParams={{
              modestbranding: 1,
              controls: 0, // Hide controls for cleaner shorts experience
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3,
              fs: 0,
              playsinline: 1,
              loop: 0,
            }}
          />

          {/* Bottom gradient for text visibility */}
          <View style={styles.bottomGradient} />
        </View>

        {/* Overlay UI - always show */}
        <View style={styles.shortsOverlay} pointerEvents="box-none">
          {/* Top bar */}
          {isActive && (
            <View style={styles.topBar}>
              <View style={styles.topLeftInfo}>
                <MaterialIcons name="video-library" size={WP(6)} color="#FFFFFF" />
                <Text style={styles.shortsLabel}>Shorts</Text>
              </View>
              <TouchableOpacity
                style={styles.closeShortButton}
                activeOpacity={0.8}
                onPress={handleCloseShorts}>
                <MaterialIcons name="close" size={WP(7)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom info and actions */}
          <View style={styles.shortsBottomInfo}>
            {/* Left side - Channel info and description */}
            <View style={styles.shortsTextContainer}>
              <View style={styles.shortsChannelRow}>
                <View style={styles.shortsChannelAvatar}>
                  <Text style={styles.shortsAvatarText}>
                    {item.channelName?.charAt(0).toUpperCase() || 'Y'}
                  </Text>
                </View>
                <Text style={styles.shortsChannelName} numberOfLines={1}>
                  {item.channelName || 'Unknown'}
                </Text>
                <TouchableOpacity style={styles.subscribeButton}>
                  <Text style={styles.subscribeText}>Subscribe</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.shortDescription} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Show swipe hint */}
              {index < shorts.length - 1 && (
                <View style={styles.swipeHint}>
                  <MaterialIcons 
                    name="arrow-upward" 
                    size={WP(4)} 
                    color="rgba(255,255,255,0.6)" 
                  />
                  <Text style={styles.swipeHintText}>Swipe up for next</Text>
                </View>
              )}
            </View>

            {/* Right side - Action buttons */}
            <View style={styles.shortsActions}>
              <TouchableOpacity style={styles.shortActionBtn}>
                <View style={styles.actionIconContainer}>
                  <MaterialIcons name="thumb-up" size={WP(7)} color="#FFFFFF" />
                </View>
                <Text style={styles.shortActionText}>Like</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <View style={styles.actionIconContainer}>
                  <MaterialIcons name="thumb-down" size={WP(7)} color="#FFFFFF" />
                </View>
                <Text style={styles.shortActionText}>Dislike</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <View style={styles.actionIconContainer}>
                  <MaterialIcons name="comment" size={WP(7)} color="#FFFFFF" />
                </View>
                <Text style={styles.shortActionText}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <View style={styles.actionIconContainer}>
                  <MaterialIcons name="share" size={WP(7)} color="#FFFFFF" />
                </View>
                <Text style={styles.shortActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <View style={styles.actionIconContainer}>
                  <MaterialIcons name="more-vert" size={WP(7)} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Play/Pause indicator */}
        {isActive && !playing && (
          <TouchableOpacity
            style={styles.playPauseOverlay}
            activeOpacity={0.9}
            onPress={() => setPlaying(!playing)}>
            <View style={styles.playButton}>
              <MaterialIcons name="play-arrow" size={WP(15)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    currentIndex, 
    visible, 
    playing, 
    handlePlayerStateChange, 
    handleCloseShorts, 
    startTimeTracking,
    shorts
  ]);

  // Get item layout for better performance
  const getItemLayout = useCallback(
    (data, index) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    []
  );

  // Handle scroll to index failed
  const onScrollToIndexFailed = useCallback((info) => {
    console.log('Scroll to index failed:', info);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
      });
    }, 100);
  }, []);

  if (!shorts || shorts.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleCloseShorts}
        transparent={false}
        statusBarTranslucent={false}>
        <SafeAreaView style={styles.shortsModalContainer}>
          <StatusBar backgroundColor="#000000" barStyle="light-content" />
          <View style={styles.shortsLoadingContainer}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.loadingText}>Loading shorts...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCloseShorts}
      transparent={false}
      statusBarTranslucent={false}
      hardwareAccelerated={true}>
      <SafeAreaView style={styles.shortsModalContainer}>
        <StatusBar backgroundColor="#000000" barStyle="light-content" />
        
        <FlatList
          ref={flatListRef}
          data={shorts}
          renderItem={renderShortItem}
          keyExtractor={(item, index) => `${item.id || item.videoId}_${index}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          initialScrollIndex={initialIndex}
          removeClippedSubviews={true}
          maxToRenderPerBatch={2}
          windowSize={3}
          ListFooterComponent={() =>
            loading ? (
              <View style={styles.shortsLoadingMore}>
                <ActivityIndicator size="large" color="#FF0000" />
                <Text style={styles.loadingMoreText}>Loading more shorts...</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  shortsModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  shortsLoadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    marginTop: HP(2),
  },
  shortsLoadingMore: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingMoreText: {
    color: '#FFFFFF',
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    marginTop: HP(2),
  },
  shortPlayerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  shortVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HP(35),
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Fallback for Android
  },
  shortsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? HP(6) : HP(2),
    paddingHorizontal: WP(4),
    paddingBottom: HP(2),
    backgroundColor: 'transparent',
  },
  topLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(2),
  },
  shortsLabel: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  closeShortButton: {
    width: WP(11),
    height: WP(11),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: WP(5.5),
  },
  shortsBottomInfo: {
    flexDirection: 'row',
    paddingHorizontal: WP(4),
    paddingBottom: Platform.OS === 'ios' ? HP(5) : HP(3),
    alignItems: 'flex-end',
  },
  shortsTextContainer: {
    flex: 1,
    paddingRight: WP(3),
  },
  shortsChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  shortsChannelAvatar: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(2.5),
  },
  shortsAvatarText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  shortsChannelName: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: WP(5),
    paddingVertical: HP(1),
    borderRadius: WP(6),
  },
  subscribeText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  shortDescription: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: '#FFFFFF',
    lineHeight: FS(2.2),
    marginBottom: HP(1),
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(0.5),
    gap: WP(1.5),
  },
  swipeHintText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  shortsActions: {
    alignItems: 'center',
    gap: HP(3),
    paddingBottom: HP(2),
  },
  shortActionBtn: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: WP(12),
    height: WP(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: WP(6),
  },
  shortActionText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    marginTop: HP(0.5),
  },
  playPauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: WP(20),
    height: WP(20),
    borderRadius: WP(10),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ShortsComponent;