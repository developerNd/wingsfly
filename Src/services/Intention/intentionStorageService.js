import {NativeModules} from 'react-native';

const {IntentionModule} = NativeModules;

class IntentionStorageService {
  // Save intention data (text OR audio file)
  async saveIntentionData(data) {
    try {
      await IntentionModule.saveIntentionData(
        data.text || '',
        data.audioFilePath || '',
        data.audioFileName || ''
      );
      console.log('Intention data saved:', data);
      return {success: true};
    } catch (error) {
      console.error('Error saving intention data:', error);
      return {success: false, error: error.message};
    }
  }

  // Get intention data (returns object with text, audioFilePath, audioFileName)
  async getIntentionData() {
    try {
      const data = await IntentionModule.getIntentionData();
      console.log('Retrieved intention data:', data);
      return data;
    } catch (error) {
      console.error('Error retrieving intention data:', error);
      return null;
    }
  }

  // DEPRECATED: Use getIntentionData() instead
  async getIntentionCommand() {
    try {
      const data = await this.getIntentionData();
      return data?.text || '';
    } catch (error) {
      console.error('Error retrieving intention command:', error);
      return null;
    }
  }

  // DEPRECATED: Use saveIntentionData() instead
  async saveIntentionCommand(commandText) {
    try {
      return await this.saveIntentionData({
        text: commandText,
        audioFilePath: null,
        audioFileName: null,
      });
    } catch (error) {
      console.error('Error saving intention command:', error);
      return {success: false, error: error.message};
    }
  }

  async hasIntentionCommand() {
    try {
      const data = await this.getIntentionData();
      return (data?.text && data.text.trim().length > 0) || 
             (data?.audioFilePath && data.audioFilePath.trim().length > 0);
    } catch (error) {
      console.error('Error checking intention command:', error);
      return false;
    }
  }
}

export default new IntentionStorageService();