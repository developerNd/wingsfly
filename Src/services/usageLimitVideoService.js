import {NativeModules} from 'react-native';

const {UsageLimitVideoModule} = NativeModules;

class UsageLimitVideoService {
  // Save video data (local file)
  async saveVideoData(data) {
    try {
      await UsageLimitVideoModule.saveVideoData(
        data.videoFilePath || '',
        data.videoFileName || '',
        data.youtubeLink || ''
      );
      console.log('Usage limit video data saved:', data);
      return {success: true};
    } catch (error) {
      console.error('Error saving video data:', error);
      return {success: false, error: error.message};
    }
  }

  // Get video data
  async getVideoData() {
    try {
      const data = await UsageLimitVideoModule.getVideoData();
      console.log('Retrieved video data:', data);
      return data;
    } catch (error) {
      console.error('Error retrieving video data:', error);
      return null;
    }
  }

  // Check if video is configured
  async hasVideoConfigured() {
    try {
      const data = await this.getVideoData();
      return (data?.videoFilePath && data.videoFilePath.trim().length > 0) || 
             (data?.youtubeLink && data.youtubeLink.trim().length > 0);
    } catch (error) {
      console.error('Error checking video configuration:', error);
      return false;
    }
  }
}

export default new UsageLimitVideoService();