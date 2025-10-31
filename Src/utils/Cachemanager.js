import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
  HOME_VIDEOS: '@youtube_cache_home_videos',
  SHORTS: '@youtube_cache_shorts',
  SEARCH_RESULTS: '@youtube_cache_search_',
  USER_PREFERENCES: '@youtube_cache_preferences',
  CACHE_METADATA: '@youtube_cache_metadata',
};

// Cache configuration
const CACHE_CONFIG = {
  HOME_VIDEOS_MAX: 150, // Maximum videos to cache for home
  SHORTS_MAX: 100, // Maximum shorts to cache
  SEARCH_RESULTS_MAX: 5, // Maximum search queries to cache
  CACHE_DURATION: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
  CLEANUP_THRESHOLD: 0.9, // Clean when 90% full
};

class CacheManager {
  constructor() {
    this.metadata = {
      homeVideos: {count: 0, lastUpdated: null},
      shorts: {count: 0, lastUpdated: null},
      searches: [],
    };
  }

  // Initialize cache metadata
  async initialize() {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_KEYS.CACHE_METADATA);
      if (metadata) {
        this.metadata = JSON.parse(metadata);
      }
    } catch (error) {
      console.error('Error initializing cache:', error);
    }
  }

  // Save cache metadata
  async saveMetadata() {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.CACHE_METADATA,
        JSON.stringify(this.metadata),
      );
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  }

  // Check if cache is valid (not expired)
  isCacheValid(timestamp) {
    if (!timestamp) return false;
    const now = Date.now();
    return now - timestamp < CACHE_CONFIG.CACHE_DURATION;
  }

  // Get home videos from cache
  async getHomeVideos() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.HOME_VIDEOS);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Check if cache is still valid
      if (!this.isCacheValid(data.timestamp)) {
        console.log('Home videos cache expired');
        await this.clearHomeVideos();
        return null;
      }

      console.log(`Retrieved ${data.videos.length} videos from cache`);
      return data.videos;
    } catch (error) {
      console.error('Error getting home videos from cache:', error);
      return null;
    }
  }

  // Save home videos to cache
  async saveHomeVideos(videos) {
    try {
      // Limit to max size
      const videosToCache = videos.slice(0, CACHE_CONFIG.HOME_VIDEOS_MAX);
      
      const cacheData = {
        videos: videosToCache,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        CACHE_KEYS.HOME_VIDEOS,
        JSON.stringify(cacheData),
      );

      // Update metadata
      this.metadata.homeVideos = {
        count: videosToCache.length,
        lastUpdated: Date.now(),
      };
      await this.saveMetadata();

      console.log(`Cached ${videosToCache.length} home videos`);
      return true;
    } catch (error) {
      console.error('Error saving home videos to cache:', error);
      return false;
    }
  }

  // Get shorts from cache
  async getShorts() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.SHORTS);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      if (!this.isCacheValid(data.timestamp)) {
        console.log('Shorts cache expired');
        await this.clearShorts();
        return null;
      }

      console.log(`Retrieved ${data.shorts.length} shorts from cache`);
      return data.shorts;
    } catch (error) {
      console.error('Error getting shorts from cache:', error);
      return null;
    }
  }

  // Save shorts to cache
  async saveShorts(shorts) {
    try {
      const shortsToCache = shorts.slice(0, CACHE_CONFIG.SHORTS_MAX);
      
      const cacheData = {
        shorts: shortsToCache,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        CACHE_KEYS.SHORTS,
        JSON.stringify(cacheData),
      );

      this.metadata.shorts = {
        count: shortsToCache.length,
        lastUpdated: Date.now(),
      };
      await this.saveMetadata();

      console.log(`Cached ${shortsToCache.length} shorts`);
      return true;
    } catch (error) {
      console.error('Error saving shorts to cache:', error);
      return false;
    }
  }

  // Append more shorts to existing cache
  async appendShorts(newShorts) {
    try {
      const existingShorts = await this.getShorts() || [];
      const combined = [...existingShorts, ...newShorts];
      
      // Remove duplicates by videoId
      const unique = this.removeDuplicates(combined);
      
      // Save combined shorts (will auto-limit to max)
      await this.saveShorts(unique);
      
      return unique;
    } catch (error) {
      console.error('Error appending shorts:', error);
      return newShorts;
    }
  }

  // Get search results from cache
  async getSearchResults(query) {
    try {
      const cacheKey = CACHE_KEYS.SEARCH_RESULTS + query.toLowerCase().trim();
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      if (!this.isCacheValid(data.timestamp)) {
        console.log(`Search cache expired for: ${query}`);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`Retrieved ${data.results.length} search results from cache for: ${query}`);
      return data.results;
    } catch (error) {
      console.error('Error getting search results from cache:', error);
      return null;
    }
  }

  // Save search results to cache
  async saveSearchResults(query, results) {
    try {
      const trimmedQuery = query.toLowerCase().trim();
      const cacheKey = CACHE_KEYS.SEARCH_RESULTS + trimmedQuery;

      // Check if we need to clean old searches
      await this.cleanOldSearches();

      const cacheData = {
        results: results,
        timestamp: Date.now(),
        query: trimmedQuery,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Update metadata
      if (!this.metadata.searches.includes(trimmedQuery)) {
        this.metadata.searches.unshift(trimmedQuery);
        await this.saveMetadata();
      }

      console.log(`Cached ${results.length} search results for: ${query}`);
      return true;
    } catch (error) {
      console.error('Error saving search results to cache:', error);
      return false;
    }
  }

  // Clean old search caches if limit exceeded
  async cleanOldSearches() {
    try {
      if (this.metadata.searches.length >= CACHE_CONFIG.SEARCH_RESULTS_MAX) {
        // Remove oldest search
        const oldestQuery = this.metadata.searches.pop();
        const cacheKey = CACHE_KEYS.SEARCH_RESULTS + oldestQuery;
        await AsyncStorage.removeItem(cacheKey);
        await this.saveMetadata();
        console.log(`Removed old search cache: ${oldestQuery}`);
      }
    } catch (error) {
      console.error('Error cleaning old searches:', error);
    }
  }

  // Get user preferences from cache
  async getUserPreferences() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_PREFERENCES);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Preferences cache for 6 hours (longer than videos)
      if (Date.now() - data.timestamp > 6 * 60 * 60 * 1000) {
        return null;
      }

      return data.preferences;
    } catch (error) {
      console.error('Error getting preferences from cache:', error);
      return null;
    }
  }

  // Save user preferences to cache
  async saveUserPreferences(preferences) {
    try {
      const cacheData = {
        preferences: preferences,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        CACHE_KEYS.USER_PREFERENCES,
        JSON.stringify(cacheData),
      );

      console.log('Cached user preferences');
      return true;
    } catch (error) {
      console.error('Error saving preferences to cache:', error);
      return false;
    }
  }

  // Clear home videos cache
  async clearHomeVideos() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.HOME_VIDEOS);
      this.metadata.homeVideos = {count: 0, lastUpdated: null};
      await this.saveMetadata();
      console.log('Cleared home videos cache');
    } catch (error) {
      console.error('Error clearing home videos:', error);
    }
  }

  // Clear shorts cache
  async clearShorts() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.SHORTS);
      this.metadata.shorts = {count: 0, lastUpdated: null};
      await this.saveMetadata();
      console.log('Cleared shorts cache');
    } catch (error) {
      console.error('Error clearing shorts:', error);
    }
  }

  // Clear all caches
  async clearAllCache() {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.HOME_VIDEOS,
        CACHE_KEYS.SHORTS,
        CACHE_KEYS.USER_PREFERENCES,
      ]);

      // Clear search caches
      for (const query of this.metadata.searches) {
        await AsyncStorage.removeItem(CACHE_KEYS.SEARCH_RESULTS + query);
      }

      this.metadata = {
        homeVideos: {count: 0, lastUpdated: null},
        shorts: {count: 0, lastUpdated: null},
        searches: [],
      };
      await this.saveMetadata();

      console.log('Cleared all cache');
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const homeVideos = await this.getHomeVideos();
      const shorts = await this.getShorts();

      return {
        homeVideos: {
          count: homeVideos ? homeVideos.length : 0,
          valid: homeVideos !== null,
          lastUpdated: this.metadata.homeVideos.lastUpdated,
        },
        shorts: {
          count: shorts ? shorts.length : 0,
          valid: shorts !== null,
          lastUpdated: this.metadata.shorts.lastUpdated,
        },
        searches: {
          count: this.metadata.searches.length,
          queries: this.metadata.searches,
        },
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Helper: Remove duplicate videos
  removeDuplicates(videos) {
    const seen = new Set();
    return videos.filter(video => {
      const duplicate = seen.has(video.videoId);
      seen.add(video.videoId);
      return !duplicate;
    });
  }

  // Check and clean expired caches on app start
  async cleanExpiredCaches() {
    try {
      console.log('Checking for expired caches...');
      
      const homeVideos = await AsyncStorage.getItem(CACHE_KEYS.HOME_VIDEOS);
      if (homeVideos) {
        const data = JSON.parse(homeVideos);
        if (!this.isCacheValid(data.timestamp)) {
          await this.clearHomeVideos();
        }
      }

      const shorts = await AsyncStorage.getItem(CACHE_KEYS.SHORTS);
      if (shorts) {
        const data = JSON.parse(shorts);
        if (!this.isCacheValid(data.timestamp)) {
          await this.clearShorts();
        }
      }

      console.log('Expired cache cleanup complete');
    } catch (error) {
      console.error('Error cleaning expired caches:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();