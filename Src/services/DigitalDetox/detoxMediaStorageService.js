import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const DETOX_MEDIA_KEY = '@detox_media_data';

class DetoxMediaStorageService {
  /**
   * Save detox media data (video or audio)
   * @param {Object} data - { type: 'video' | 'audio', filePath: string, fileName: string }
   */
  async saveDetoxMedia(data) {
    try {
      const mediaData = {
        type: data.type, // 'video' or 'audio'
        filePath: data.filePath,
        fileName: data.fileName,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(DETOX_MEDIA_KEY, JSON.stringify(mediaData));
      
      console.log('Detox media saved:', mediaData);
      return { success: true, data: mediaData };
    } catch (error) {
      console.error('Error saving detox media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get saved detox media data
   */
  async getDetoxMedia() {
    try {
      const data = await AsyncStorage.getItem(DETOX_MEDIA_KEY);
      
      if (!data) {
        return null;
      }

      const mediaData = JSON.parse(data);
      
      // Verify file still exists
      const fileExists = await RNFS.exists(mediaData.filePath);
      if (!fileExists) {
        console.warn('Detox media file no longer exists');
        await this.clearDetoxMedia();
        return null;
      }

      return mediaData;
    } catch (error) {
      console.error('Error getting detox media:', error);
      return null;
    }
  }

  /**
   * Clear detox media data and delete file
   */
  async clearDetoxMedia() {
    try {
      const mediaData = await this.getDetoxMedia();
      
      // Delete the file if it exists
      if (mediaData && mediaData.filePath) {
        const fileExists = await RNFS.exists(mediaData.filePath);
        if (fileExists) {
          await RNFS.unlink(mediaData.filePath);
          console.log('Detox media file deleted');
        }
      }

      await AsyncStorage.removeItem(DETOX_MEDIA_KEY);
      console.log('Detox media data cleared');
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing detox media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if detox media is configured
   */
  async hasDetoxMedia() {
    try {
      const data = await this.getDetoxMedia();
      return data !== null;
    } catch (error) {
      console.error('Error checking detox media:', error);
      return false;
    }
  }

  /**
   * Get detox media type
   */
  async getMediaType() {
    try {
      const data = await this.getDetoxMedia();
      return data ? data.type : null;
    } catch (error) {
      console.error('Error getting media type:', error);
      return null;
    }
  }
}

export default new DetoxMediaStorageService();