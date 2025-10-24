import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../../utils/dimentions';
import YoutubePlayer from 'react-native-youtube-iframe';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Replace with your YouTube API Key
const YOUTUBE_API_KEY = 'AIzaSyBUAiHRSxge-MNkRD-TvmobkGf5FfNNGAg';

const YouTubeIntegrationScreen = ({navigation}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [playingVideoType, setPlayingVideoType] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [shortsModalVisible, setShortsModalVisible] = useState(false);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  
  // NEW: Shorts pagination states
  const [shortsNextPageToken, setShortsNextPageToken] = useState(null);
  const [loadingMoreShorts, setLoadingMoreShorts] = useState(false);
  const [searchNextPageToken, setSearchNextPageToken] = useState(null);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  
  const scrollViewRef = useRef(null);
  const shortsListRef = useRef(null);

  // Fetch initial videos on mount
  useEffect(() => {
    fetchHomeVideos();
    fetchShorts();
  }, []);

  // Convert ISO 8601 duration to readable format
  const formatDuration = (isoDuration) => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    if (hours) {
      const formattedHours = hours;
      const formattedMinutes = (minutes || '0').padStart(2, '0');
      const formattedSeconds = (seconds || '0').padStart(2, '0');
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }

    const formattedMinutes = minutes || '0';
    const formattedSeconds = (seconds || '0').padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  // Format view count
  const formatViews = (viewCount) => {
    const views = parseInt(viewCount);
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Format published date
  const formatPublishedDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // UPDATED: Fetch home videos with pagination 
  const fetchHomeVideos = async (pageToken = null) => {
    try {
      if (!pageToken) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Search for videos with medium duration (4-20 minutes)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=trending&type=video&videoDuration=medium&order=viewCount&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(searchData.error.message);
      }

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      
      // Fetch video details
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(detailsData.error.message);
      }

      const formattedVideos = detailsData.items.map((item, index) => ({
        id: item.id,
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelName: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount),
        publishedAt: formatPublishedDate(item.snippet.publishedAt),
      }));

      if (pageToken) {
        setVideos(prev => [...prev, ...formattedVideos]);
      } else {
        setVideos(formattedVideos);
      }

      setNextPageToken(searchData.nextPageToken);
      setInitialLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  // UPDATED: Fetch shorts with pagination support
  const fetchShorts = async (pageToken = null) => {
    try {
      if (pageToken) {
        setLoadingMoreShorts(true);
      }

      // Search for short videos (under 1 minute)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=viral|trending|funny&type=video&videoDuration=short&order=viewCount&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(searchData.error.message || 'Failed to fetch shorts');
      }

      if (!searchData.items || searchData.items.length === 0) {
        console.log('No shorts found');
        setLoadingMoreShorts(false);
        return;
      }

      const videoIds = searchData.items
        .filter(item => item && item.id && item.id.videoId)
        .map(item => item.id.videoId)
        .join(',');
      
      if (!videoIds) {
        console.log('No valid video IDs found');
        setLoadingMoreShorts(false);
        return;
      }

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(detailsData.error.message || 'Failed to fetch video details');
      }

      if (!detailsData.items || detailsData.items.length === 0) {
        console.log('No video details found');
        setLoadingMoreShorts(false);
        return;
      }

      const formattedShorts = detailsData.items
        .filter(item => {
          try {
            if (!item || !item.contentDetails || !item.contentDetails.duration) {
              return false;
            }
            
            const duration = item.contentDetails.duration;
            const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            
            if (!match) return false;
            
            const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
            const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
            const seconds = match[3] ? parseInt(match[3].replace('S', '')) : 0;
            
            return hours === 0 && minutes === 0 && seconds > 0;
          } catch (error) {
            console.log('Error filtering short:', error);
            return false;
          }
        })
        .map((item) => {
          try {
            return {
              id: item.id || `short_${Math.random()}`,
              videoId: item.id,
              title: item.snippet?.title || 'Untitled',
              description: item.snippet?.description || '',
              channelName: item.snippet?.channelTitle || 'Unknown Channel',
              thumbnail: item.snippet?.thumbnails?.high?.url || 
                         item.snippet?.thumbnails?.medium?.url || 
                         item.snippet?.thumbnails?.default?.url ||
                         `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
            };
          } catch (error) {
            console.log('Error mapping short:', error);
            return null;
          }
        })
        .filter(item => item !== null);

      console.log(`Successfully fetched ${formattedShorts.length} shorts`);
      
      // UPDATED: Append or replace based on pagination
      if (pageToken) {
        setShorts(prev => [...prev, ...formattedShorts]);
      } else {
        setShorts(formattedShorts);
      }

      // Store next page token for pagination
      setShortsNextPageToken(searchData.nextPageToken);
      setLoadingMoreShorts(false);
    } catch (err) {
      console.error('Error fetching shorts:', err);
      setLoadingMoreShorts(false);
      
      // Fallback only on initial load
      if (!pageToken) {
        try {
          const fallbackUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&maxResults=10&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
          const fallbackResponse = await fetch(fallbackUrl);
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.items && fallbackData.items.length > 0) {
            const fallbackShorts = fallbackData.items.slice(0, 5).map(item => ({
              id: item.id,
              videoId: item.id,
              title: item.snippet?.title || 'Video',
              description: item.snippet?.description || '',
              channelName: item.snippet?.channelTitle || 'Channel',
              thumbnail: item.snippet?.thumbnails?.high?.url || 
                         item.snippet?.thumbnails?.medium?.url ||
                         `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
            }));
            setShorts(fallbackShorts);
            console.log('Using fallback videos as shorts');
          }
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
      }
    }
  };

  // UPDATED: Search videos with pagination
  const handleSearch = async (pageToken = null) => {
    if (!searchQuery.trim() && !pageToken) return;
    
    if (!pageToken) {
      setLoading(true);
      setActiveTab('search');
    } else {
      setLoadingMoreSearch(true);
    }
    
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(searchData.error.message);
      }

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(detailsData.error.message);
      }

      const formattedResults = detailsData.items.map((item) => ({
        id: item.id,
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelName: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount),
        publishedAt: formatPublishedDate(item.snippet.publishedAt),
      }));

      // UPDATED: Append or replace based on pagination
      if (pageToken) {
        setSearchResults(prev => [...prev, ...formattedResults]);
      } else {
        setSearchResults(formattedResults);
      }

      setSearchNextPageToken(searchData.nextPageToken);
      setLoading(false);
      setLoadingMoreSearch(false);
    } catch (err) {
      console.error('Error searching videos:', err);
      setLoading(false);
      setLoadingMoreSearch(false);
    }
  };

  // UPDATED: Load more videos when scrolling
  const handleLoadMore = () => {
    if (activeTab === 'home' && nextPageToken && !loadingMore) {
      fetchHomeVideos(nextPageToken);
    } else if (activeTab === 'search' && searchNextPageToken && !loadingMoreSearch) {
      handleSearch(searchNextPageToken);
    }
  };

  // NEW: Load more shorts
  const handleLoadMoreShorts = () => {
    if (shortsNextPageToken && !loadingMoreShorts) {
      fetchShorts(shortsNextPageToken);
    }
  };

  const handleVideoPress = useCallback((videoId, type = 'video') => {
    setPlayingVideoId(videoId);
    setPlayingVideoType(type);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({y: 0, animated: true});
    }, 100);
  }, []);

  const handleShortPress = useCallback((index) => {
    setCurrentShortIndex(index);
    setShortsModalVisible(true);
  }, []);

  const onStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlayingVideoId(null);
      setPlayingVideoType(null);
    }
  }, []);

  const getPlayingItem = useCallback(() => {
    if (!playingVideoId) return null;
    
    if (playingVideoType === 'short') {
      return shorts.find(s => s.id === playingVideoId);
    } else {
      const allVideos = activeTab === 'search' ? searchResults : videos;
      return allVideos.find(v => v.id === playingVideoId);
    }
  }, [playingVideoId, playingVideoType, activeTab, searchResults, videos, shorts]);

  const VideoCard = useCallback(({video, isPlaying = false}) => {
    if (!video) return null;

    return (
      <View style={styles.videoCard}>
        {isPlaying ? (
          <View style={styles.playerContainer}>
            <YoutubePlayer
              height={HP(25)}
              play={true}
              videoId={video.videoId}
              onChangeState={onStateChange}
              webViewProps={{
                allowsFullscreenVideo: true,
              }}
              initialPlayerParams={{
                modestbranding: true,
                controls: true,
              }}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            activeOpacity={0.9}
            onPress={() => handleVideoPress(video.id, 'video')}>
            <Image
              source={{uri: video.thumbnail}}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {video.duration && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{video.duration}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.videoInfoContainer}>
          <View style={styles.infoRow}>
            <View style={styles.channelAvatar}>
              <Text style={styles.avatarText}>
                {video.channelName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.videoDetails}>
              <Text style={styles.videoTitle} numberOfLines={2}>
                {video.title}
              </Text>
              
              <View style={styles.metaContainer}>
                <Text style={styles.channelName} numberOfLines={1}>
                  {video.channelName}
                </Text>
                {video.views && video.publishedAt && (
                  <View style={styles.viewsRow}>
                    <Text style={styles.viewsText}>{video.views} views</Text>
                    <View style={styles.dot} />
                    <Text style={styles.timeText}>{video.publishedAt}</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.moreButton}>
              <MaterialIcons name="more-vert" size={WP(6)} color="#606060" />
            </TouchableOpacity>
          </View>

          {isPlaying && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="thumb-up" size={WP(5)} color="#0F0F0F" />
                <Text style={styles.actionText}>Like</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="thumb-down" size={WP(5)} color="#0F0F0F" />
                <Text style={styles.actionText}>Dislike</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="share" size={WP(5)} color="#0F0F0F" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="download" size={WP(5)} color="#0F0F0F" />
                <Text style={styles.actionText}>Download</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="playlist-add" size={WP(5)} color="#0F0F0F" />
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPlaying && video.description && (
            <TouchableOpacity style={styles.descriptionContainer}>
              <Text style={styles.descriptionText} numberOfLines={3}>
                {video.description}
              </Text>
              <Text style={styles.showMoreText}>Show more</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [handleVideoPress, onStateChange]);

  const ShortsCard = useCallback(({short, index}) => {
    return (
      <TouchableOpacity
        style={styles.shortsCard}
        activeOpacity={0.9}
        onPress={() => handleShortPress(index)}>
        <Image
          source={{uri: short.thumbnail}}
          style={styles.shortsImage}
          resizeMode="cover"
        />
        <View style={styles.shortsTitleContainer}>
          <Text style={styles.shortsTitle} numberOfLines={2}>
            {short.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleShortPress]);

  // Shorts Player Modal (Vertical Scrolling)
  const ShortsPlayer = () => {
    const [playerReady, setPlayerReady] = useState(false);

    useEffect(() => {
      if (!shortsModalVisible) {
        setPlayerReady(false);
      } else {
        const timer = setTimeout(() => {
          setPlayerReady(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [shortsModalVisible]);

    const onViewableItemsChanged = useRef(({viewableItems}) => {
      if (viewableItems.length > 0) {
        setCurrentShortIndex(viewableItems[0].index);
      }
    }).current;

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 50,
    }).current;

    const handleCloseShorts = useCallback(() => {
      setPlayerReady(false);
      setShortsModalVisible(false);
      setCurrentShortIndex(0);
    }, []);

    // NEW: Handle load more shorts in modal
    const handleEndReached = () => {
      if (shortsNextPageToken && !loadingMoreShorts) {
        fetchShorts(shortsNextPageToken);
      }
    };

    const renderShortItem = ({item, index}) => (
      <View style={styles.shortPlayerContainer}>
        <View style={styles.shortVideoWrapper}>
          {playerReady && (
            <YoutubePlayer
              height={SCREEN_WIDTH * 1.77}
              width={SCREEN_WIDTH}
              play={index === currentShortIndex && shortsModalVisible}
              videoId={item.videoId}
              webViewStyle={{
                opacity: 0.99,
                backgroundColor: '#000000',
              }}
              webViewProps={{
                allowsFullscreenVideo: false,
                androidLayerType: 'hardware',
                injectedJavaScript: `
                  var meta = document.createElement('meta');
                  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                  meta.setAttribute('name', 'viewport');
                  document.getElementsByTagName('head')[0].appendChild(meta);
                `,
              }}
              initialPlayerParams={{
                modestbranding: 1,
                controls: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                fs: 0,
                playsinline: 1,
              }}
            />
          )}
        </View>
        
        <View style={styles.shortsOverlay} pointerEvents="box-none">
          <TouchableOpacity 
            style={styles.closeShortButton}
            activeOpacity={0.8}
            onPress={handleCloseShorts}>
            <MaterialIcons name="close" size={WP(7)} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.shortsBottomInfo}>
            <View style={styles.shortsTextContainer}>
              <View style={styles.shortsChannelRow}>
                <View style={styles.shortsChannelAvatar}>
                  <Text style={styles.shortsAvatarText}>
                    {item.channelName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.shortsChannelName}>{item.channelName}</Text>
                <TouchableOpacity style={styles.subscribeButton}>
                  <Text style={styles.subscribeText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.shortDescription} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={styles.shortsActions}>
              <TouchableOpacity style={styles.shortActionBtn}>
                <MaterialIcons name="thumb-up" size={WP(7)} color="#FFFFFF" />
                <Text style={styles.shortActionText}>Like</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <MaterialIcons name="thumb-down" size={WP(7)} color="#FFFFFF" />
                <Text style={styles.shortActionText}>Dislike</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <MaterialIcons name="comment" size={WP(7)} color="#FFFFFF" />
                <Text style={styles.shortActionText}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <MaterialIcons name="share" size={WP(7)} color="#FFFFFF" />
                <Text style={styles.shortActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortActionBtn}>
                <MaterialIcons name="more-vert" size={WP(7)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );

    return (
      <Modal
        visible={shortsModalVisible}
        animationType="slide"
        onRequestClose={handleCloseShorts}
        transparent={false}
        statusBarTranslucent={true}
        hardwareAccelerated={true}>
        <View style={styles.shortsModalContainer}>
          <StatusBar 
            backgroundColor="#000000" 
            barStyle="light-content" 
            hidden={false}
          />
          {playerReady && shorts.length > 0 ? (
            <FlatList
              ref={shortsListRef}
              data={shorts}
              renderItem={renderShortItem}
              keyExtractor={item => item.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              snapToAlignment="center"
              decelerationRate="fast"
              snapToInterval={SCREEN_HEIGHT}
              initialScrollIndex={currentShortIndex}
              getItemLayout={(data, index) => ({
                length: SCREEN_HEIGHT,
                offset: SCREEN_HEIGHT * index,
                index,
              })}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              removeClippedSubviews={false}
              maxToRenderPerBatch={2}
              windowSize={3}
              initialNumToRender={1}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => 
                loadingMoreShorts ? (
                  <View style={styles.shortsLoadingMore}>
                    <ActivityIndicator size="large" color="#FF0000" />
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.shortsLoadingContainer}>
              <ActivityIndicator size="large" color="#FF0000" />
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    const currentVideos = activeTab === 'search' ? searchResults : videos;
    const playingItem = getPlayingItem();

    if (initialLoading || loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      );
    }

    return (
      <>
        {playingItem && (
          <VideoCard 
            video={playingItem} 
            isPlaying={true}
          />
        )}

        {/* Shorts section with horizontal pagination */}
        {activeTab === 'home' && shorts.length > 0 && currentVideos.length > 0 && (
          <>
            {currentVideos
              .slice(0, 1)
              .filter(video => !(playingVideoType === 'video' && video.id === playingVideoId))
              .map(video => (
                <VideoCard key={video.id} video={video} isPlaying={false} />
              ))}

            <View style={styles.shortsSection}>
              <View style={styles.shortsSectionHeader}>
                <MaterialIcons name="video-library" size={WP(7)} color="#FF0000" />
                <Text style={styles.shortsSectionTitle}>Shorts</Text>
              </View>
              <FlatList
                horizontal
                data={shorts}
                renderItem={({item, index}) => <ShortsCard short={item} index={index} />}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shortsList}
                onEndReached={handleLoadMoreShorts}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => 
                  loadingMoreShorts ? (
                    <View style={styles.loadingMoreShorts}>
                      <ActivityIndicator size="small" color="#FF0000" />
                    </View>
                  ) : null
                }
              />
            </View>

            {currentVideos
              .slice(1)
              .filter(video => !(playingVideoType === 'video' && video.id === playingVideoId))
              .map(video => (
                <VideoCard key={video.id} video={video} isPlaying={false} />
              ))}
          </>
        )}

        {(activeTab !== 'home' || shorts.length === 0) && currentVideos.length > 0 && (
          <>
            {currentVideos
              .filter(video => !(playingVideoType === 'video' && video.id === playingVideoId))
              .map(video => (
                <VideoCard key={video.id} video={video} isPlaying={false} />
              ))}
          </>
        )}

        {(loadingMore || loadingMoreSearch) && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#FF0000" />
            <Text style={styles.loadingMoreText}>Loading more videos...</Text>
          </View>
        )}

        {currentVideos.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={WP(20)} color="#E0E0E0" />
            <Text style={styles.emptyText}>
              {activeTab === 'search' 
                ? 'No results found'
                : 'No videos available'}
            </Text>
            <Text style={styles.emptySubtext}>
              Try different keywords or check your API key
            </Text>
          </View>
        )}

        <View style={{height: HP(12)}} />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <View style={styles.searchContainer}>
        <View style={[
          styles.searchBar,
          isSearchFocused && styles.searchBarFocused
        ]}>
          <MaterialIcons name="search" size={WP(5.5)} color="#606060" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={WP(5)} color="#606060" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <MaterialIcons name="mic" size={WP(5.5)} color="#606060" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}>
        {renderContent()}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}>
          <MaterialIcons 
            name="home" 
            size={WP(6.5)} 
            color={activeTab === 'home' ? '#0F0F0F' : '#606060'} 
          />
          <Text style={[
            styles.navText,
            activeTab === 'home' && styles.navTextActive
          ]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('shorts');
            if (shorts.length > 0) {
              handleShortPress(0);
            }
          }}>
          <MaterialIcons 
            name="video-library" 
            size={WP(6.5)} 
            color={activeTab === 'shorts' ? '#0F0F0F' : '#606060'} 
          />
          <Text style={[
            styles.navText,
            activeTab === 'shorts' && styles.navTextActive
          ]}>
            Shorts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <View style={styles.plusButton}>
            <MaterialIcons name="add" size={WP(7)} color="#0F0F0F" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="subscriptions" size={WP(6.5)} color="#606060" />
          <Text style={styles.navText}>Subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="video-library" size={WP(6.5)} color="#606060" />
          <Text style={styles.navText}>Library</Text>
        </TouchableOpacity>
      </View>

      <ShortsPlayer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: WP(5),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.2),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchBarFocused: {
    borderColor: '#065FD4',
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#0F0F0F',
    marginLeft: WP(2),
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: HP(0.8),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(0.5),
  },
  navText: {
    fontSize: FS(1),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    marginTop: HP(0.3),
  },
  navTextActive: {
    color: '#0F0F0F',
    fontFamily: 'OpenSans-SemiBold',
  },
  plusButton: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -HP(1.5),
  },
  scrollContainer: {
    flex: 1,
    marginBottom: HP(8),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(20),
  },
  loadingText: {
    marginTop: HP(2),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  loadMoreContainer: {
    paddingVertical: HP(3),
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: HP(1),
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(15),
    paddingHorizontal: WP(8),
  },
  emptyText: {
    marginTop: HP(2),
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
  },
  emptySubtext: {
    marginTop: HP(1),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
    textAlign: 'center',
  },
  shortsSection: {
    marginBottom: HP(2),
    backgroundColor: '#FFFFFF',
    paddingTop: HP(1),
  },
  shortsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    gap: WP(2.5),
  },
  shortsSectionTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: '#0F0F0F',
  },
  shortsList: {
    paddingHorizontal: WP(4),
    gap: WP(2),
  },
  shortsCard: {
    width: WP(40),
    marginRight: WP(2),
    borderRadius: WP(3),
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  shortsImage: {
    width: '100%',
    height: HP(28),
    backgroundColor: '#000000',
  },
  shortsTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: WP(3),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  shortsTitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    lineHeight: FS(1.8),
  },
  loadingMoreShorts: {
    width: WP(40),
    height: HP(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(2),
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: HP(2),
  },
  thumbnailContainer: {
    width: '100%',
    height: HP(25),
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playerContainer: {
    width: '100%',
    height: HP(25),
    backgroundColor: '#000000',
  },
  durationBadge: {
    position: 'absolute',
    bottom: WP(2),
    right: WP(2),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: WP(1.5),
    paddingVertical: HP(0.2),
    borderRadius: WP(0.8),
  },
  durationText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  videoInfoContainer: {
    paddingHorizontal: WP(3),
    paddingTop: HP(1.2),
    paddingBottom: HP(1),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  channelAvatar: {
    width: WP(10),
    height: WP(10),
    borderRadius: WP(5),
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(3),
  },
  avatarText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  videoDetails: {
    flex: 1,
  },
  videoTitle: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#0F0F0F',
    lineHeight: FS(2),
    marginBottom: HP(0.3),
  },
  metaContainer: {
    marginTop: HP(0.2),
  },
  channelName: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HP(0.2),
  },
  viewsText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  dot: {
    width: WP(0.8),
    height: WP(0.8),
    borderRadius: WP(0.4),
    backgroundColor: '#606060',
    marginHorizontal: WP(1.5),
  },
  timeText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#606060',
  },
  moreButton: {
    padding: WP(1),
    marginLeft: WP(2),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(2),
    marginTop: HP(1),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionBtn: {
    alignItems: 'center',
    gap: HP(0.5),
  },
  actionText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Medium',
    color: '#0F0F0F',
  },
  descriptionContainer: {
    marginTop: HP(1.5),
    padding: WP(3),
    backgroundColor: '#F9F9F9',
    borderRadius: WP(2),
  },
  descriptionText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#0F0F0F',
    lineHeight: FS(1.9),
  },
  showMoreText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#606060',
    marginTop: HP(0.5),
  },
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
  shortsLoadingMore: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  shortPlayerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shortsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  closeShortButton: {
    position: 'absolute',
    top: HP(5),
    right: WP(4),
    width: WP(12),
    height: WP(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: WP(6),
    zIndex: 999,
    elevation: 10,
  },
  shortsBottomInfo: {
    position: 'absolute',
    bottom: HP(3),
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: WP(4),
    alignItems: 'flex-end',
  },
  shortsTextContainer: {
    flex: 1,
    paddingRight: WP(4),
  },
  shortsChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1),
  },
  shortsChannelAvatar: {
    width: WP(9),
    height: WP(9),
    borderRadius: WP(4.5),
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: WP(2),
  },
  shortsAvatarText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  shortsChannelName: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: WP(4),
    paddingVertical: HP(0.8),
    borderRadius: WP(5),
  },
  subscribeText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
  },
  shortDescription: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#FFFFFF',
    lineHeight: FS(2),
  },
  shortsActions: {
    alignItems: 'center',
    gap: HP(2.5),
  },
  shortActionBtn: {
    alignItems: 'center',
  },
  shortActionText: {
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Medium',
    color: '#FFFFFF',
    marginTop: HP(0.3),
  },
});

export default YouTubeIntegrationScreen;