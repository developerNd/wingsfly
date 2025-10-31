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
  ActivityIndicator,
  SafeAreaView,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../../utils/dimentions';
import YoutubePlayer from 'react-native-youtube-iframe';
import {YOUTUBE_API_KEY} from '@env';
import ShortsComponent from '../../Components/Shortscomponent';
import {useAuth} from '../../contexts/AuthContext';
import {youtubeContentService} from '../../services/api/youtubeContentService';
import {
  buildPositiveSearchQuery,
  filterPositiveVideos,
  getPositiveShortsQuery,
  getPositiveVideoQuery,
  buildPositiveAPIUrl,
  extractCategory,
} from '../../utils/Contentfilter';
import {cacheManager} from '../../utils/Cachemanager';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const YOUTUBE_KEY = YOUTUBE_API_KEY;

// OPTIMIZED: Increased from 10-20 to 50 for better API efficiency
const MAX_RESULTS_PER_FETCH = 50;
const MAX_RESULTS_SHORTS = 50;

const YouTubeIntegrationScreen = ({navigation}) => {
  const {user} = useAuth();
  
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

  // User preferences state
  const [userPreferences, setUserPreferences] = useState([]);
  const [recommendedCategories, setRecommendedCategories] = useState([]);

  // Shorts pagination states
  const [shortsNextPageToken, setShortsNextPageToken] = useState(null);
  const [loadingMoreShorts, setLoadingMoreShorts] = useState(false);
  const [searchNextPageToken, setSearchNextPageToken] = useState(null);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);

  // Video tracking states
  const videoStartTimeRef = useRef(null);
  const currentPlayingVideoRef = useRef(null);
  const timeTrackingIntervalRef = useRef(null);

  const scrollViewRef = useRef(null);

  // Cache refs
  const fetchedCategoriesRef = useRef(new Set());
  const recommendedVideosRef = useRef([]);
  const generalVideosRef = useRef([]);
  const cacheInitializedRef = useRef(false);

  // Search debounce timer
  const searchDebounceRef = useRef(null);

  // Initialize cache and fetch content on mount
  useEffect(() => {
    const initializeScreen = async () => {
      // Initialize cache manager
      await cacheManager.initialize();
      await cacheManager.cleanExpiredCaches();
      
      cacheInitializedRef.current = true;

      // Load content (with cache)
      await loadUserPreferences();
      await fetchInitialContent();
      await fetchShorts();

      // Log cache stats
      const stats = await cacheManager.getCacheStats();
      console.log('Cache stats:', stats);
    };
    
    initializeScreen();
  }, []);

  // Load user preferences (with cache)
  const loadUserPreferences = async () => {
    if (!user?.id) {
      console.log('No user ID, loading default content');
      return [];
    }

    try {
      // Try cache first
      const cachedPreferences = await cacheManager.getUserPreferences();
      if (cachedPreferences) {
        console.log('Using cached preferences:', cachedPreferences);
        setUserPreferences(cachedPreferences);
        setRecommendedCategories(cachedPreferences.map(p => p.category));
        return cachedPreferences;
      }

      // Fetch from API if no cache
      const [preferences, recommended] = await Promise.all([
        youtubeContentService.getUserPreferences(user.id, 10),
        youtubeContentService.getRecommendedCategories(user.id),
      ]);

      setUserPreferences(preferences);
      setRecommendedCategories(recommended);

      // Cache the preferences
      await cacheManager.saveUserPreferences(preferences);

      console.log('User preferences loaded and cached:', preferences);
      return preferences;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return [];
    }
  };

  // OPTIMIZED: Fetch initial content with caching
  const fetchInitialContent = async () => {
    try {
      setInitialLoading(true);

      // Try to load from cache first
      const cachedVideos = await cacheManager.getHomeVideos();
      if (cachedVideos && cachedVideos.length > 0) {
        console.log(`✅ Loaded ${cachedVideos.length} videos from cache - 0 API calls!`);
        setVideos(cachedVideos);
        setInitialLoading(false);
        return;
      }

      console.log('📡 No cache found, fetching from API...');
      
      // Reset refs
      fetchedCategoriesRef.current.clear();
      recommendedVideosRef.current = [];
      generalVideosRef.current = [];

      const preferences = await loadUserPreferences();

      if (preferences && preferences.length > 0) {
        console.log('Fetching personalized content for:', preferences);
        
        // OPTIMIZED: Fetch 50 videos per category (top 2 categories only)
        const categoryPromises = preferences.slice(0, 2).map(pref => 
          fetchVideosForCategory(pref.category, MAX_RESULTS_PER_FETCH)
        );

        const categoryResults = await Promise.all(categoryPromises);
        
        // Combine and interleave videos
        const mixedRecommendedVideos = interleaveVideos(categoryResults);
        recommendedVideosRef.current = mixedRecommendedVideos;

        console.log(`Fetched ${mixedRecommendedVideos.length} personalized videos`);

        // OPTIMIZED: Fetch 30 general videos
        const generalContent = await fetchGeneralContent(30);
        generalVideosRef.current = generalContent;

        console.log(`Fetched ${generalContent.length} general videos`);

        // Combine: 70% recommended, 30% general
        const combinedVideos = [
          ...mixedRecommendedVideos.slice(0, 70),
          ...generalContent.slice(0, 30),
        ];

        const finalVideos = removeDuplicates(combinedVideos);
        setVideos(finalVideos);

        // Cache the results
        await cacheManager.saveHomeVideos(finalVideos);
        console.log(`✅ Cached ${finalVideos.length} videos for future use`);
      } else {
        console.log('No preferences, loading general content');
        // OPTIMIZED: Fetch 50 general videos at once
        const generalContent = await fetchGeneralContent(MAX_RESULTS_PER_FETCH);
        const finalVideos = removeDuplicates(generalContent);
        setVideos(finalVideos);

        // Cache the results
        await cacheManager.saveHomeVideos(finalVideos);
      }

      setInitialLoading(false);
    } catch (error) {
      console.error('Error fetching initial content:', error);
      setInitialLoading(false);
    }
  };

  // OPTIMIZED: Fetch videos with increased maxResults
  const fetchVideosForCategory = async (category, maxResults = MAX_RESULTS_PER_FETCH) => {
    try {
      console.log(`Fetching ${maxResults} videos for category: ${category}`);

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(
        category,
      )}&type=video&videoDuration=medium&order=viewCount&safeSearch=strict&key=${YOUTUBE_KEY}`;

      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error || !searchData.items || searchData.items.length === 0) {
        console.log(`No videos found for category: ${category}`);
        return [];
      }

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error || !detailsData.items) {
        return [];
      }

      const formattedVideos = detailsData.items.map((item, index) => ({
        id: `${item.id}_${Date.now()}_${index}_${category}`,
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelName: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount),
        publishedAt: formatPublishedDate(item.snippet.publishedAt),
        recommendedCategory: category,
      }));

      const positiveVideos = filterPositiveVideos(formattedVideos);
      console.log(`✅ Found ${positiveVideos.length} positive videos for ${category}`);

      return positiveVideos;
    } catch (error) {
      console.error(`Error fetching videos for category ${category}:`, error);
      return [];
    }
  };

  // Interleave videos from different categories
  const interleaveVideos = (categoryArrays) => {
    const result = [];
    const maxLength = Math.max(...categoryArrays.map(arr => arr.length));

    for (let i = 0; i < maxLength; i++) {
      categoryArrays.forEach(categoryVideos => {
        if (categoryVideos[i]) {
          result.push(categoryVideos[i]);
        }
      });
    }

    return result;
  };

  // OPTIMIZED: Fetch general content with increased maxResults
  const fetchGeneralContent = async (maxResults = 30) => {
    try {
      const generalQuery = getPositiveVideoQuery();
      console.log(`Fetching ${maxResults} general videos with query: ${generalQuery}`);

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(
        generalQuery,
      )}&type=video&videoDuration=medium&order=viewCount&safeSearch=strict&key=${YOUTUBE_KEY}`;

      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error || !searchData.items || searchData.items.length === 0) {
        return [];
      }

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error || !detailsData.items) {
        return [];
      }

      const formattedVideos = detailsData.items.map((item, index) => ({
        id: `${item.id}_${Date.now()}_${index}_general`,
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelName: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount),
        publishedAt: formatPublishedDate(item.snippet.publishedAt),
        recommendedCategory: 'general',
      }));

      return filterPositiveVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching general content:', error);
      return [];
    }
  };

  // OPTIMIZED: Load more content - use cache first
  const loadMoreContent = async () => {
    if (loadingMore) return;

    try {
      setLoadingMore(true);
      console.log('Loading more content...');

      const currentVideoCount = videos.length;
      let newVideos = [];

      // If we still have recommended videos in cache, use them
      if (recommendedVideosRef.current.length > currentVideoCount) {
        const remainingRecommended = recommendedVideosRef.current.slice(currentVideoCount);
        newVideos = remainingRecommended.slice(0, 20);
        console.log(`Loading ${newVideos.length} cached recommended videos`);
      } 
      // If we have general videos in cache, use them
      else if (generalVideosRef.current.length > 0) {
        const startIndex = Math.max(0, currentVideoCount - recommendedVideosRef.current.length);
        newVideos = generalVideosRef.current.slice(startIndex, startIndex + 20);
        console.log(`Loading ${newVideos.length} cached general videos`);
      }
      // Fetch more general content
      else {
        console.log('📡 Fetching new general content...');
        newVideos = await fetchGeneralContent(30);
        generalVideosRef.current = [...generalVideosRef.current, ...newVideos];
      }

      if (newVideos.length > 0) {
        const combinedVideos = [...videos, ...newVideos];
        const finalVideos = removeDuplicates(combinedVideos);
        setVideos(finalVideos);

        // Update cache with new videos
        await cacheManager.saveHomeVideos(finalVideos);
      }

      setLoadingMore(false);
    } catch (error) {
      console.error('Error loading more content:', error);
      setLoadingMore(false);
    }
  };

  // Track video view
  const trackVideoView = async (video, contentType) => {
    if (!user?.id || !video) return;

    try {
      const category = extractCategory(video.title, video.description || '');

      await youtubeContentService.trackContentView(user.id, {
        videoId: video.videoId,
        contentType: contentType,
        title: video.title,
        channelName: video.channelName,
        category: category,
        timeSpent: 0,
        isPositiveContent: true,
      });

      console.log(`Tracked ${contentType} view:`, video.title, `Category: ${category}`);
    } catch (error) {
      console.error('Error tracking video view:', error);
    }
  };

  // Start tracking video time
  const startTimeTracking = useCallback((video, contentType) => {
    if (!user?.id || !video) return;

    if (!videoStartTimeRef.current) {
      videoStartTimeRef.current = Date.now();
    }
    
    currentPlayingVideoRef.current = {video, contentType};

    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
    }

    timeTrackingIntervalRef.current = setInterval(async () => {
      if (!videoStartTimeRef.current || !currentPlayingVideoRef.current) return;

      const currentTime = Date.now();
      const timeSpent = Math.floor((currentTime - videoStartTimeRef.current) / 1000);
      
      if (timeSpent >= 5) {
        try {
          await youtubeContentService.updateTimeSpent(
            user.id,
            video.videoId,
            timeSpent
          );
          console.log(`Updated time: ${timeSpent}s for ${video.title}`);
          videoStartTimeRef.current = currentTime;
        } catch (error) {
          console.error('Error updating time spent:', error);
        }
      }
    }, 5000);
  }, [user]);

  // Stop tracking video time
  const stopTimeTracking = useCallback(async () => {
    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
      timeTrackingIntervalRef.current = null;
    }

    if (videoStartTimeRef.current && currentPlayingVideoRef.current && user?.id) {
      const timeSpent = Math.floor((Date.now() - videoStartTimeRef.current) / 1000);
      
      if (timeSpent > 0) {
        try {
          await youtubeContentService.updateTimeSpent(
            user.id,
            currentPlayingVideoRef.current.video.videoId,
            timeSpent
          );
          console.log(`Final time: ${timeSpent}s for ${currentPlayingVideoRef.current.video.title}`);
          
          // Reload preferences after video ends
          await loadUserPreferences();
        } catch (error) {
          console.error('Error updating final time spent:', error);
        }
      }
    }

    videoStartTimeRef.current = null;
    currentPlayingVideoRef.current = null;
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
    };
  }, [stopTimeTracking]);

  // Convert ISO 8601 duration to readable format
  const formatDuration = isoDuration => {
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
  const formatViews = viewCount => {
    const views = parseInt(viewCount);
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Format published date
  const formatPublishedDate = dateString => {
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

  // Helper function to remove duplicates by videoId
  const removeDuplicates = videoArray => {
    const seen = new Set();
    return videoArray.filter(video => {
      const duplicate = seen.has(video.videoId);
      seen.add(video.videoId);
      return !duplicate;
    });
  };

  // OPTIMIZED: Fetch shorts with caching and increased maxResults
  const fetchShorts = async (pageToken = null) => {
    try {
      // If no page token, try cache first
      if (!pageToken) {
        const cachedShorts = await cacheManager.getShorts();
        if (cachedShorts && cachedShorts.length > 0) {
          console.log(`✅ Loaded ${cachedShorts.length} shorts from cache - 0 API calls!`);
          setShorts(cachedShorts);
          return;
        }
        console.log('📡 No shorts cache, fetching from API...');
      } else {
        setLoadingMoreShorts(true);
      }

      const shortsQuery = getPositiveShortsQuery();

      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${MAX_RESULTS_SHORTS}&q=${encodeURIComponent(
        shortsQuery,
      )}&type=video&videoDuration=short&order=viewCount&key=${YOUTUBE_KEY}`;

      if (pageToken && typeof pageToken === 'string') {
        searchUrl += `&pageToken=${pageToken}`;
      }

      searchUrl = buildPositiveAPIUrl(searchUrl, {safeSearch: true});

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

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(
          detailsData.error.message || 'Failed to fetch video details',
        );
      }

      if (!detailsData.items || detailsData.items.length === 0) {
        console.log('No video details found');
        setLoadingMoreShorts(false);
        return;
      }

      const formattedShorts = detailsData.items
        .filter(item => {
          try {
            if (
              !item ||
              !item.contentDetails ||
              !item.contentDetails.duration
            ) {
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
        .map((item, index) => {
          try {
            return {
              id: `${item.id}_${Date.now()}_${index}`,
              videoId: item.id,
              title: item.snippet?.title || 'Untitled',
              description: item.snippet?.description || '',
              channelName: item.snippet?.channelTitle || 'Unknown Channel',
              thumbnail:
                item.snippet?.thumbnails?.high?.url ||
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

      const positiveShorts = filterPositiveVideos(formattedShorts);

      console.log(`✅ Successfully fetched ${positiveShorts.length} positive shorts`);

      if (pageToken) {
        // Append to existing shorts
        const combinedShorts = await cacheManager.appendShorts(positiveShorts);
        setShorts(combinedShorts);
      } else {
        // First load - cache it
        setShorts(positiveShorts);
        await cacheManager.saveShorts(positiveShorts);
        console.log(`✅ Cached ${positiveShorts.length} shorts for future use`);
      }

      setShortsNextPageToken(searchData.nextPageToken || null);
      setLoadingMoreShorts(false);
    } catch (err) {
      console.error('Error fetching shorts:', err);
      setLoadingMoreShorts(false);
    }
  };

  // OPTIMIZED: Search with debounce and caching
  const handleSearch = async (pageToken = null) => {
    const sanitizedQuery = searchQuery.trim();

    if (!sanitizedQuery && !pageToken) {
      console.log('Empty search query');
      return;
    }

    // Check cache first (only for initial search)
    if (!pageToken) {
      const cachedResults = await cacheManager.getSearchResults(sanitizedQuery);
      if (cachedResults && cachedResults.length > 0) {
        console.log(`✅ Loaded ${cachedResults.length} search results from cache - 0 API calls!`);
        setSearchResults(cachedResults);
        setActiveTab('search');
        setLoading(false);
        return;
      }
      
      console.log('📡 No cache for search, fetching from API...');
      setLoading(true);
      setActiveTab('search');
    } else {
      setLoadingMoreSearch(true);
    }

    try {
      const positiveQuery = buildPositiveSearchQuery(sanitizedQuery);
      const encodedQuery = encodeURIComponent(positiveQuery);

      // OPTIMIZED: Fetch 50 results
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${MAX_RESULTS_PER_FETCH}&q=${encodedQuery}&type=video&key=${YOUTUBE_KEY}`;

      if (pageToken && typeof pageToken === 'string') {
        searchUrl += `&pageToken=${pageToken}`;
      }

      searchUrl = buildPositiveAPIUrl(searchUrl, {safeSearch: true});

      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(searchData.error.message);
      }

      if (!searchData.items || searchData.items.length === 0) {
        if (!pageToken) {
          setSearchResults([]);
        }
        setLoading(false);
        setLoadingMoreSearch(false);
        return;
      }

      const videoIds = searchData.items
        .filter(item => item && item.id && item.id.videoId)
        .map(item => item.id.videoId)
        .join(',');

      if (!videoIds) {
        setLoading(false);
        setLoadingMoreSearch(false);
        return;
      }

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        throw new Error(detailsData.error.message);
      }

      const formattedResults = detailsData.items.map((item, index) => ({
        id: `${item.id}_${Date.now()}_${index}`,
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelName: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url,
        duration: formatDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount),
        publishedAt: formatPublishedDate(item.snippet.publishedAt),
      }));

      const positiveResults = filterPositiveVideos(formattedResults);

      if (pageToken) {
        const combinedResults = [...searchResults, ...positiveResults];
        setSearchResults(removeDuplicates(combinedResults));
      } else {
        setSearchResults(positiveResults);
        // Cache the search results
        await cacheManager.saveSearchResults(sanitizedQuery, positiveResults);
        console.log(`✅ Cached ${positiveResults.length} search results`);
      }

      setSearchNextPageToken(searchData.nextPageToken || null);
      setLoading(false);
      setLoadingMoreSearch(false);
    } catch (err) {
      console.error('Error searching videos:', err);
      setLoading(false);
      setLoadingMoreSearch(false);

      if (!pageToken) {
        setSearchResults([]);
      }
    }
  };

  // Debounced search handler
  const handleSearchDebounced = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      handleSearch(null);
    }, 500); // 500ms debounce
  }, [searchQuery]);

  // Load more videos when scrolling
  const handleLoadMore = () => {
    if (activeTab === 'home' && !loadingMore) {
      loadMoreContent();
    } else if (
      activeTab === 'search' &&
      searchNextPageToken &&
      !loadingMoreSearch
    ) {
      handleSearch(searchNextPageToken);
    }
  };

  // Load more shorts
  const handleLoadMoreShorts = () => {
    if (shortsNextPageToken && !loadingMoreShorts) {
      fetchShorts(shortsNextPageToken);
    }
  };

  const handleVideoPress = useCallback((videoId, type = 'video', video) => {
    stopTimeTracking();
    
    setPlayingVideoId(videoId);
    setPlayingVideoType(type);
    
    if (video) {
      trackVideoView(video, type);
    }
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({y: 0, animated: true});
    }, 100);
  }, [stopTimeTracking]);

  const handleShortPress = useCallback((index) => {
    stopTimeTracking();
    
    setCurrentShortIndex(index);
    setShortsModalVisible(true);
    
    if (shorts[index]) {
      trackVideoView(shorts[index], 'short');
    }
  }, [shorts, stopTimeTracking]);

  const onStateChange = useCallback((state) => {
    console.log('Video state:', state);
    
    if (state === 'ended') {
      stopTimeTracking();
      setPlayingVideoId(null);
      setPlayingVideoType(null);
    } else if (state === 'paused') {
      if (timeTrackingIntervalRef.current) {
        clearInterval(timeTrackingIntervalRef.current);
        timeTrackingIntervalRef.current = null;
      }
    } else if (state === 'playing') {
      if (currentPlayingVideoRef.current && !timeTrackingIntervalRef.current) {
        startTimeTracking(
          currentPlayingVideoRef.current.video,
          currentPlayingVideoRef.current.contentType
        );
      }
    }
  }, [stopTimeTracking, startTimeTracking]);

  const getPlayingItem = useCallback(() => {
    if (!playingVideoId) return null;

    if (playingVideoType === 'short') {
      return shorts.find(
        s => s.videoId === playingVideoId || s.id === playingVideoId,
      );
    } else {
      const allVideos = activeTab === 'search' ? searchResults : videos;
      return allVideos.find(
        v => v.videoId === playingVideoId || v.id === playingVideoId,
      );
    }
  }, [
    playingVideoId,
    playingVideoType,
    activeTab,
    searchResults,
    videos,
    shorts,
  ]);

  const VideoCard = useCallback(
    ({video, isPlaying = false}) => {
      if (!video) return null;

      return (
        <View style={styles.videoCard}>
          {isPlaying ? (
            <View style={styles.playerContainer}>
              <YoutubePlayer
                key={video.videoId}
                height={HP(25)}
                play={true}
                videoId={video.videoId}
                onChangeState={onStateChange}
                onReady={() => {
                  console.log('Player ready:', video.title);
                  currentPlayingVideoRef.current = {video, contentType: 'video'};
                  startTimeTracking(video, 'video');
                }}
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
              onPress={() => handleVideoPress(video.videoId, 'video', video)}>
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
                  <MaterialIcons
                    name="thumb-up"
                    size={WP(5)}
                    color="#0F0F0F"
                  />
                  <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <MaterialIcons
                    name="thumb-down"
                    size={WP(5)}
                    color="#0F0F0F"
                  />
                  <Text style={styles.actionText}>Dislike</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <MaterialIcons name="share" size={WP(5)} color="#0F0F0F" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <MaterialIcons
                    name="download"
                    size={WP(5)}
                    color="#0F0F0F"
                  />
                  <Text style={styles.actionText}>Download</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <MaterialIcons
                    name="playlist-add"
                    size={WP(5)}
                    color="#0F0F0F"
                  />
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
    },
    [handleVideoPress, onStateChange, startTimeTracking],
  );

  const ShortsCard = useCallback(
    ({short, index}) => {
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
    },
    [handleShortPress],
  );

  const renderContent = () => {
    const currentVideos = activeTab === 'search' ? searchResults : videos;
    const playingItem = getPlayingItem();

    if (initialLoading || loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>
            {initialLoading ? 'Loading personalized content...' : 'Searching...'}
          </Text>
        </View>
      );
    }

    return (
      <>
        {playingItem && <VideoCard video={playingItem} isPlaying={true} />}

        {/* Shorts section with horizontal pagination */}
        {activeTab === 'home' && shorts.length > 0 && currentVideos.length > 0 && (
          <>
            {currentVideos
              .slice(0, 1)
              .filter(
                video =>
                  !(
                    playingVideoType === 'video' &&
                    video.videoId === playingVideoId
                  ),
              )
              .map(video => (
                <VideoCard key={video.id} video={video} isPlaying={false} />
              ))}

            <View style={styles.shortsSection}>
              <View style={styles.shortsSectionHeader}>
                <MaterialIcons
                  name="video-library"
                  size={WP(7)}
                  color="#FF0000"
                />
                <Text style={styles.shortsSectionTitle}>Shorts</Text>
              </View>
              <FlatList
                horizontal
                data={shorts}
                renderItem={({item, index}) => (
                  <ShortsCard short={item} index={index} />
                )}
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
              .filter(
                video =>
                  !(
                    playingVideoType === 'video' &&
                    video.videoId === playingVideoId
                  ),
              )
              .map(video => (
                <VideoCard key={video.id} video={video} isPlaying={false} />
              ))}
          </>
        )}

        {(activeTab !== 'home' || shorts.length === 0) &&
          currentVideos.length > 0 && (
            <>
              {currentVideos
                .filter(
                  video =>
                    !(
                      playingVideoType === 'video' &&
                      video.videoId === playingVideoId
                    ),
                )
                .map(video => (
                  <VideoCard key={video.id} video={video} isPlaying={false} />
                ))}
            </>
          )}

        {loadingMore && (
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
                ? 'No positive results found'
                : 'No videos available'}
            </Text>
            <Text style={styles.emptySubtext}>
              Try different keywords for positive content
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
        <View
          style={[
            styles.searchBar,
            isSearchFocused && styles.searchBarFocused,
          ]}>
          <MaterialIcons name="search" size={WP(5.5)} color="#606060" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search content..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(null)}
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
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 500;
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
          <Text
            style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
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
          <Text
            style={[
              styles.navText,
              activeTab === 'shorts' && styles.navTextActive,
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

      {/* Shorts Modal Component */}
      <ShortsComponent
        visible={shortsModalVisible}
        onClose={() => {
          setShortsModalVisible(false);
          stopTimeTracking();
        }}
        shorts={shorts}
        initialIndex={currentShortIndex}
        onLoadMore={handleLoadMoreShorts}
        loading={loadingMoreShorts}
        onShortView={(short, index) => {
          if (user?.id) {
            trackVideoView(short, 'short');
          }
        }}
      />
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
});

export default YouTubeIntegrationScreen;