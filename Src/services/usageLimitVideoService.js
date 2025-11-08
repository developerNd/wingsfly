// services/usageLimitVideoService.js - FIXED REALTIME

import { NativeModules } from 'react-native';
import { supabase } from '../../supabase';

const { UsageLimitVideoModule } = NativeModules;

const BUCKET_NAME = 'usagelimit-videos';

class UsageLimitVideoService {
  constructor() {
    this.realtimeChannel = null;
    this.updateListeners = [];
  }

  /**
   * Subscribe to real-time storage updates using polling
   * (More reliable than postgres_changes for storage)
   */
  subscribeToUpdates(onVideoUpdated) {
    try {
      console.log('🔔 Starting video update polling...');

      // Store listener
      if (onVideoUpdated) {
        this.updateListeners.push(onVideoUpdated);
      }

      // Poll every 30 seconds to check for updates
      this.pollingInterval = setInterval(async () => {
        try {
          console.log('🔄 Checking for video updates...');
          
          // Get current cached video
          const cachedData = await this.getCachedVideoData();
          
          // Fetch latest video from Supabase
          const videoFile = await this.fetchVideoList();
          
          if (!videoFile) {
            console.log('⚠️ No video found in storage');
            return;
          }
          
          // Check if video has changed
          if (!cachedData || cachedData.videoName !== videoFile.name) {
            console.log('🔔 NEW VIDEO DETECTED!');
            console.log('   Old:', cachedData?.videoName || 'none');
            console.log('   New:', videoFile.name);
            
            // Fetch and cache new video
            const result = await this.fetchAndCacheVideo();
            
            // Notify all listeners
            this.updateListeners.forEach(listener => {
              listener(result);
            });
          } else {
            console.log('✅ Video unchanged:', videoFile.name);
          }
        } catch (error) {
          console.error('❌ Error in polling:', error);
        }
      }, 30000); // Check every 30 seconds

      return true;
    } catch (error) {
      console.error('❌ Error starting polling:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribeFromUpdates() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.updateListeners = [];
      console.log('🔕 Stopped video update polling');
    }
  }

  /**
   * Fetch video list from Supabase
   */
  async fetchVideoList() {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ Error listing videos:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No videos in bucket');
        return null;
      }

      console.log('📋 Latest video in Supabase:', data[0].name);
      return data[0];
    } catch (error) {
      console.error('❌ Error in fetchVideoList:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a video file
   */
  getPublicUrl(fileName) {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    return data?.publicUrl || null;
  }

  /**
   * Fetch and cache video
   */
  async fetchAndCacheVideo() {
    try {
      console.log('🎬 Fetching latest video...');

      const videoFile = await this.fetchVideoList();
      if (!videoFile) {
        return {
          success: false,
          hasVideo: false,
          message: 'No video found'
        };
      }

      const videoUrl = this.getPublicUrl(videoFile.name);
      if (!videoUrl) {
        throw new Error('Failed to generate public URL');
      }

      console.log('📍 New video URL:', videoUrl);

      // Cache in native storage
      if (UsageLimitVideoModule) {
        await UsageLimitVideoModule.saveVideoData(
          videoUrl,
          videoFile.name,
          Date.now()
        );
        console.log('💾 Video cached in native storage');
      }

      return {
        success: true,
        hasVideo: true,
        videoUrl,
        videoName: videoFile.name
      };
    } catch (error) {
      console.error('❌ Error fetching video:', error);
      return {
        success: false,
        hasVideo: false,
        error: error.message
      };
    }
  }

  /**
   * Get cached video data
   */
  async getCachedVideoData() {
    try {
      if (!UsageLimitVideoModule) {
        console.warn('⚠️ Native module not available');
        return null;
      }
      
      const data = await UsageLimitVideoModule.getVideoData();
      
      if (!data?.hasVideo) {
        return null;
      }
      
      return {
        videoUrl: data.videoUrl,
        videoName: data.videoName,
        lastFetched: data.lastFetched,
        hasVideo: true
      };
    } catch (error) {
      console.error('❌ Error getting cached video:', error);
      return null;
    }
  }

  /**
   * Auto-sync with polling support
   * Always checks Supabase first to ensure we have latest video
   */
  async autoSyncVideo(enableRealtime = true) {
    try {
      console.log('🔄 Auto-syncing video...');

      // ALWAYS fetch from Supabase first to check if there's a new video
      const latestVideo = await this.fetchVideoList();
      
      if (!latestVideo) {
        console.log('⚠️ No video in Supabase');
        return {
          success: false,
          hasVideo: false,
          message: 'No video found'
        };
      }

      // Get cached data
      const cachedData = await this.getCachedVideoData();

      // Check if we need to update cache
      if (!cachedData || cachedData.videoName !== latestVideo.name) {
        console.log('🔄 Video changed - updating cache...');
        console.log('   Cached:', cachedData?.videoName || 'none');
        console.log('   Latest:', latestVideo.name);
        
        // Fetch and cache new video
        const result = await this.fetchAndCacheVideo();
        
        // Start polling for future updates
        if (enableRealtime && !this.pollingInterval) {
          this.subscribeToUpdates((newVideo) => {
            console.log('🔔 Video auto-updated:', newVideo.videoName);
          });
        }
        
        return result;
      }

      // Cache is up to date
      console.log('✅ Using cached video (up to date)');
      
      // Start polling for future updates
      if (enableRealtime && !this.pollingInterval) {
        this.subscribeToUpdates((newVideo) => {
          console.log('🔔 Video auto-updated:', newVideo.videoName);
        });
      }

      return {
        success: true,
        hasVideo: true,
        videoUrl: cachedData.videoUrl,
        videoName: cachedData.videoName,
        cached: true
      };
    } catch (error) {
      console.error('❌ Error in autoSyncVideo:', error);
      
      // Fallback to cache if available
      const cachedData = await this.getCachedVideoData();
      if (cachedData) {
        console.log('⚠️ Using cached video as fallback');
        return {
          success: true,
          hasVideo: true,
          videoUrl: cachedData.videoUrl,
          videoName: cachedData.videoName,
          cached: true,
          fallback: true
        };
      }
      
      return {
        success: false,
        hasVideo: false,
        error: error.message
      };
    }
  }

  /**
   * Force refresh - always fetch from Supabase
   */
  async forceRefresh() {
    console.log('🔄 Force refreshing video...');
    return await this.fetchAndCacheVideo();
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      if (!UsageLimitVideoModule) return false;
      await UsageLimitVideoModule.clearVideoCache();
      console.log('🗑️ Cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get current status (for debugging)
   */
  async getStatus() {
    try {
      const cached = await this.getCachedVideoData();
      const latest = await this.fetchVideoList();
      
      return {
        cachedVideo: cached?.videoName || 'none',
        latestVideo: latest?.name || 'none',
        needsUpdate: cached?.videoName !== latest?.name,
        pollingActive: !!this.pollingInterval
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

export default new UsageLimitVideoService();