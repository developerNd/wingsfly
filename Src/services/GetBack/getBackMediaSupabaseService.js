import { supabase } from '../../../supabase';

const BUCKET_NAME = 'getback';

class GetBackMediaSupabaseService {
  /**
   * Fetch the confirmation video from Supabase
   * Returns the most recently uploaded confirmation video
   */
  async fetchConfirmationVideo() {
    try {
      console.log('🔍 Fetching confirmation video from Supabase...');

      const { data: confirmationData, error: confirmationError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('confirmation/', {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: 1
        });

      if (confirmationError) {
        console.error('Error fetching confirmation video:', confirmationError);
        return {
          success: false,
          hasConfirmation: false,
          error: confirmationError.message,
          data: null
        };
      }

      if (!confirmationData || confirmationData.length === 0) {
        console.log('❌ No confirmation video found in Supabase');
        return {
          success: false,
          hasConfirmation: false,
          data: null
        };
      }

      const confirmationFile = confirmationData[0];

      // Get public URL for the confirmation video
      const { data: urlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(`confirmation/${confirmationFile.name}`);

      const confirmationUrl = urlData ? urlData.publicUrl : null;

      console.log('✅ Confirmation video found:', {
        name: confirmationFile.name,
        url: confirmationUrl
      });

      return {
        success: true,
        hasConfirmation: true,
        data: {
          fileName: confirmationFile.name,
          fileUrl: confirmationUrl,
          createdAt: confirmationFile.created_at,
          size: confirmationFile.metadata?.size || 0
        }
      };

    } catch (error) {
      console.error('❌ Error fetching confirmation video:', error);
      return {
        success: false,
        hasConfirmation: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Fetch all Get Back media files from Supabase (video and audio)
   * Returns all media files sorted by creation date
   */
  async fetchGetBackMedia() {
    try {
      console.log('🔍 Fetching Get Back media from Supabase...');

      // Check for video files
      const { data: videoData, error: videoError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('videos/', {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (videoError) {
        console.error('Error fetching videos:', videoError);
      }

      // Check for audio files
      const { data: audioData, error: audioError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('audio/', {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (audioError) {
        console.error('Error fetching audio:', audioError);
      }

      // Combine all media files
      const allMediaFiles = [];

      if (videoData) {
        videoData.forEach(file => {
          const { data: urlData } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(`videos/${file.name}`);

          allMediaFiles.push({
            id: file.name,
            type: 'video',
            fileName: file.name,
            fileUrl: urlData.publicUrl,
            createdAt: file.created_at,
            size: file.metadata?.size || 0,
            is_active: true
          });
        });
      }

      if (audioData) {
        audioData.forEach(file => {
          const { data: urlData } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(`audio/${file.name}`);

          allMediaFiles.push({
            id: file.name,
            type: 'audio',
            fileName: file.name,
            fileUrl: urlData.publicUrl,
            createdAt: file.created_at,
            size: file.metadata?.size || 0,
            is_active: true
          });
        });
      }

      console.log(`✅ Get Back media found: ${allMediaFiles.length} files`);

      return {
        success: true,
        hasMedia: allMediaFiles.length > 0,
        files: allMediaFiles,
        videoCount: allMediaFiles.filter(f => f.type === 'video').length,
        audioCount: allMediaFiles.filter(f => f.type === 'audio').length
      };

    } catch (error) {
      console.error('❌ Error fetching Get Back media:', error);
      return {
        success: false,
        hasMedia: false,
        error: error.message,
        files: [],
        videoCount: 0,
        audioCount: 0
      };
    }
  }

  /**
   * Get a random media file for playback during session
   */
  async getRandomMediaFile() {
    try {
      const result = await this.fetchGetBackMedia();
      
      if (!result.hasMedia || result.files.length === 0) {
        console.log('❌ No media files available for random selection');
        return {
          success: false,
          data: null
        };
      }

      // Filter only active files
      const activeFiles = result.files.filter(f => f.is_active);
      
      if (activeFiles.length === 0) {
        console.log('❌ No active media files available');
        return {
          success: false,
          data: null
        };
      }

      // Pick a random file
      const randomIndex = Math.floor(Math.random() * activeFiles.length);
      const randomFile = activeFiles[randomIndex];

      console.log('✅ Random media file selected:', {
        type: randomFile.type,
        name: randomFile.fileName
      });

      return {
        success: true,
        data: randomFile
      };

    } catch (error) {
      console.error('❌ Error getting random media file:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Check if confirmation video exists
   */
  async hasConfirmationVideo() {
    try {
      const result = await this.fetchConfirmationVideo();
      return result.hasConfirmation;
    } catch (error) {
      console.error('Error checking confirmation video:', error);
      return false;
    }
  }

  /**
   * Check if any media files exist
   */
  async hasGetBackMedia() {
    try {
      const result = await this.fetchGetBackMedia();
      return result.hasMedia;
    } catch (error) {
      console.error('Error checking Get Back media:', error);
      return false;
    }
  }

  /**
   * Get media count
   */
  async getMediaCount() {
    try {
      const result = await this.fetchGetBackMedia();
      return {
        total: result.files.length,
        videoCount: result.videoCount,
        audioCount: result.audioCount
      };
    } catch (error) {
      console.error('Error getting media count:', error);
      return { total: 0, videoCount: 0, audioCount: 0 };
    }
  }
}

export default new GetBackMediaSupabaseService();