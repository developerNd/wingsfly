import AsyncStorage from '@react-native-async-storage/async-storage';

const APPRECIATION_STORAGE_KEY = '@appreciation_data';

class AppreciationStorageService {
  /**
   * Save appreciation data (text or audio file path)
   */
  async saveAppreciationData(data) {
    try {
      const appreciationData = {
        text: data.text || '',
        audioFilePath: data.audioFilePath || null,
        audioFileName: data.audioFileName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        APPRECIATION_STORAGE_KEY,
        JSON.stringify(appreciationData)
      );

      console.log('✅ Appreciation data saved successfully:', appreciationData);
      return {success: true, data: appreciationData};
    } catch (error) {
      console.error('❌ Error saving appreciation data:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Get appreciation data
   */
  async getAppreciationData() {
    try {
      const data = await AsyncStorage.getItem(APPRECIATION_STORAGE_KEY);
      
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('✅ Retrieved appreciation data:', parsedData);
        return parsedData;
      }
      
      console.log('ℹ️ No appreciation data found');
      return null;
    } catch (error) {
      console.error('❌ Error getting appreciation data:', error);
      return null;
    }
  }

  /**
   * Clear appreciation data
   */
  async clearAppreciationData() {
    try {
      await AsyncStorage.removeItem(APPRECIATION_STORAGE_KEY);
      console.log('✅ Appreciation data cleared successfully');
      return {success: true};
    } catch (error) {
      console.error('❌ Error clearing appreciation data:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Check if appreciation data exists
   */
  async hasAppreciationData() {
    try {
      const data = await this.getAppreciationData();
      return data !== null && (data.text || data.audioFilePath);
    } catch (error) {
      console.error('❌ Error checking appreciation data:', error);
      return false;
    }
  }
}

export default new AppreciationStorageService();