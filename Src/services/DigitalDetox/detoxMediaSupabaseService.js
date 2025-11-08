import { supabase } from '../../../supabase';

const BUCKET_NAME = 'digitaldetox';

class DetoxMediaSupabaseService {
  /**
   * Fetch the latest detox media from Supabase (video or audio)
   * Returns the most recently uploaded media file
   */
  async fetchLatestDetoxMedia() {
    try {
      console.log('🔍 Fetching latest detox media from Supabase...');

      // Check for video files first
      const { data: videoData, error: videoError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('videos/', {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: 1
        });

      if (videoError) {
        console.error('Error fetching video:', videoError);
      }

      // Check for audio files
      const { data: audioData, error: audioError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('audio/', {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: 1
        });

      if (audioError) {
        console.error('Error fetching audio:', audioError);
      }

      // Determine which media to use (most recent)
      let mediaType = null;
      let mediaFile = null;
      let mediaUrl = null;

      const hasVideo = videoData && videoData.length > 0;
      const hasAudio = audioData && audioData.length > 0;

      if (hasVideo && hasAudio) {
        // Compare timestamps and use the most recent
        const videoDate = new Date(videoData[0].created_at);
        const audioDate = new Date(audioData[0].created_at);
        
        if (videoDate > audioDate) {
          mediaType = 'video';
          mediaFile = videoData[0];
        } else {
          mediaType = 'audio';
          mediaFile = audioData[0];
        }
      } else if (hasVideo) {
        mediaType = 'video';
        mediaFile = videoData[0];
      } else if (hasAudio) {
        mediaType = 'audio';
        mediaFile = audioData[0];
      }

      if (!mediaFile || !mediaType) {
        console.log('❌ No detox media found in Supabase');
        return {
          success: false,
          hasMedia: false,
          data: null
        };
      }

      // Get public URL for the media
      const prefix = mediaType === 'video' ? 'videos/' : 'audio/';
      const { data: urlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(`${prefix}${mediaFile.name}`);

      if (urlData) {
        mediaUrl = urlData.publicUrl;
      }

      console.log('✅ Detox media found:', {
        type: mediaType,
        name: mediaFile.name,
        url: mediaUrl
      });

      return {
        success: true,
        hasMedia: true,
        data: {
          type: mediaType,
          fileName: mediaFile.name,
          fileUrl: mediaUrl,
          createdAt: mediaFile.created_at,
          size: mediaFile.metadata?.size || 0
        }
      };

    } catch (error) {
      console.error('❌ Error fetching detox media:', error);
      return {
        success: false,
        hasMedia: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Download media file to local storage for offline use
   * This is optional - for better performance during detox
   */
  async downloadMediaForOfflineUse(mediaUrl, mediaType) {
    try {
      // This would download the file for offline caching
      // Implementation depends on your offline strategy
      console.log('📥 Downloading media for offline use...');
      
      // You could implement RNFS download here if needed
      // For now, we'll just return the URL for streaming
      
      return {
        success: true,
        localPath: null, // Set to local path if you implement download
        streamUrl: mediaUrl
      };
    } catch (error) {
      console.error('Error downloading media:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if media is available
   */
  async hasDetoxMedia() {
    try {
      const result = await this.fetchLatestDetoxMedia();
      return result.hasMedia;
    } catch (error) {
      console.error('Error checking detox media:', error);
      return false;
    }
  }

  /**
   * Get media type only
   */
  async getMediaType() {
    try {
      const result = await this.fetchLatestDetoxMedia();
      return result.hasMedia ? result.data.type : null;
    } catch (error) {
      console.error('Error getting media type:', error);
      return null;
    }
  }
}

export default new DetoxMediaSupabaseService();