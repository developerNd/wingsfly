import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const GET_BACK_MEDIA_KEY = '@get_back_media_data';
const GET_BACK_CONFIRMATION_KEY = '@get_back_confirmation_video';

class GetBackMediaStorageService {
  /**
   * Save multiple audio/video files for Get Back
   * @param {Array} mediaFiles - [{ type: 'video' | 'audio', filePath: string, fileName: string, id: string }]
   */
  async saveGetBackMedia(mediaFiles) {
    try {
      const mediaData = {
        files: mediaFiles,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(GET_BACK_MEDIA_KEY, JSON.stringify(mediaData));
      
      console.log('Get Back media saved:', mediaData);
      return { success: true, data: mediaData };
    } catch (error) {
      console.error('Error saving Get Back media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all saved Get Back media files
   */
  async getGetBackMedia() {
    try {
      const data = await AsyncStorage.getItem(GET_BACK_MEDIA_KEY);
      
      if (!data) {
        return { files: [] };
      }

      const mediaData = JSON.parse(data);
      
      // Verify all files still exist
      const validFiles = [];
      for (const file of mediaData.files) {
        try {
          const fileExists = await RNFS.exists(file.filePath);
          if (fileExists) {
            validFiles.push(file);
          }
        } catch (e) {
          console.log('Error checking file:', e);
        }
      }

      // Update if some files were deleted
      if (validFiles.length !== mediaData.files.length) {
        await this.saveGetBackMedia(validFiles);
      }

      return { files: validFiles };
    } catch (error) {
      console.error('Error getting Get Back media:', error);
      return { files: [] };
    }
  }

  /**
   * Add a new media file to Get Back collection
   */
  async addMediaFile(mediaFile) {
    try {
      const currentData = await this.getGetBackMedia();
      const newFiles = [...currentData.files, mediaFile];
      
      return await this.saveGetBackMedia(newFiles);
    } catch (error) {
      console.error('Error adding media file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a media file from Get Back collection
   */
  async removeMediaFile(fileId) {
    try {
      const currentData = await this.getGetBackMedia();
      const fileToRemove = currentData.files.find(f => f.id === fileId);
      
      // Delete the file
      if (fileToRemove && fileToRemove.filePath) {
        try {
          const fileExists = await RNFS.exists(fileToRemove.filePath);
          if (fileExists) {
            await RNFS.unlink(fileToRemove.filePath);
          }
        } catch (e) {
          console.log('Error deleting file:', e);
        }
      }

      const updatedFiles = currentData.files.filter(f => f.id !== fileId);
      return await this.saveGetBackMedia(updatedFiles);
    } catch (error) {
      console.error('Error removing media file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save confirmation video (only one allowed)
   */
  async saveConfirmationVideo(videoData) {
    try {
      // Get old video data from storage without validation
      const oldDataStr = await AsyncStorage.getItem(GET_BACK_CONFIRMATION_KEY);
      
      // Delete old confirmation video file if exists
      if (oldDataStr) {
        try {
          const oldVideo = JSON.parse(oldDataStr);
          if (oldVideo && oldVideo.filePath && oldVideo.filePath !== videoData.filePath) {
            const fileExists = await RNFS.exists(oldVideo.filePath);
            if (fileExists) {
              await RNFS.unlink(oldVideo.filePath);
            }
          }
        } catch (e) {
          console.log('Error deleting old confirmation video:', e);
        }
      }

      const confirmationData = {
        filePath: videoData.filePath,
        fileName: videoData.fileName,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(GET_BACK_CONFIRMATION_KEY, JSON.stringify(confirmationData));
      
      console.log('Confirmation video saved:', confirmationData);
      return { success: true, data: confirmationData };
    } catch (error) {
      console.error('Error saving confirmation video:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get confirmation video
   */
  async getConfirmationVideo() {
    try {
      const data = await AsyncStorage.getItem(GET_BACK_CONFIRMATION_KEY);
      
      if (!data) {
        return null;
      }

      const videoData = JSON.parse(data);
      
      // Verify file still exists
      try {
        const fileExists = await RNFS.exists(videoData.filePath);
        if (!fileExists) {
          console.log('Confirmation video file no longer exists, clearing storage');
          // Clear storage directly without calling getConfirmationVideo again
          await AsyncStorage.removeItem(GET_BACK_CONFIRMATION_KEY);
          return null;
        }
      } catch (e) {
        console.log('Error checking confirmation video file:', e);
        await AsyncStorage.removeItem(GET_BACK_CONFIRMATION_KEY);
        return null;
      }

      return videoData;
    } catch (error) {
      console.error('Error getting confirmation video:', error);
      return null;
    }
  }

  /**
   * Clear confirmation video
   */
  async clearConfirmationVideo() {
    try {
      // Get video data directly from storage without validation
      const data = await AsyncStorage.getItem(GET_BACK_CONFIRMATION_KEY);
      
      if (data) {
        try {
          const videoData = JSON.parse(data);
          if (videoData && videoData.filePath) {
            const fileExists = await RNFS.exists(videoData.filePath);
            if (fileExists) {
              await RNFS.unlink(videoData.filePath);
            }
          }
        } catch (e) {
          console.log('Error deleting confirmation video file:', e);
        }
      }

      await AsyncStorage.removeItem(GET_BACK_CONFIRMATION_KEY);
      console.log('Confirmation video cleared');
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing confirmation video:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all Get Back media
   */
  async clearAllGetBackMedia() {
    try {
      const mediaData = await this.getGetBackMedia();
      
      // Delete all media files
      for (const file of mediaData.files) {
        if (file.filePath) {
          try {
            const fileExists = await RNFS.exists(file.filePath);
            if (fileExists) {
              await RNFS.unlink(file.filePath);
            }
          } catch (e) {
            console.log('Error deleting media file:', e);
          }
        }
      }

      // Clear confirmation video
      await this.clearConfirmationVideo();

      await AsyncStorage.removeItem(GET_BACK_MEDIA_KEY);
      console.log('All Get Back media cleared');
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing all Get Back media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if Get Back media is configured
   */
  async hasGetBackMedia() {
    try {
      const data = await this.getGetBackMedia();
      return data.files.length > 0;
    } catch (error) {
      console.error('Error checking Get Back media:', error);
      return false;
    }
  }

  /**
   * Check if confirmation video is configured
   */
  async hasConfirmationVideo() {
    try {
      const video = await this.getConfirmationVideo();
      return video !== null;
    } catch (error) {
      console.error('Error checking confirmation video:', error);
      return false;
    }
  }

  /**
   * Get media count
   */
  async getMediaCount() {
    try {
      const data = await this.getGetBackMedia();
      const videoCount = data.files.filter(f => f.type === 'video').length;
      const audioCount = data.files.filter(f => f.type === 'audio').length;
      
      return { total: data.files.length, videoCount, audioCount };
    } catch (error) {
      console.error('Error getting media count:', error);
      return { total: 0, videoCount: 0, audioCount: 0 };
    }
  }
}

export default new GetBackMediaStorageService();