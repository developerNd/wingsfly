import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@voice_command_alarms';

class VoiceCommandStorageService {
  // Get all voice command alarms
  async getAllAlarms() {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting voice command alarms:', error);
      return [];
    }
  }

  // Get single alarm by ID
  async getAlarmById(id) {
    try {
      const alarms = await this.getAllAlarms();
      return alarms.find(alarm => alarm.id === id);
    } catch (error) {
      console.error('Error getting alarm by ID:', error);
      return null;
    }
  }

  // Create new alarm
  async createAlarm(alarmData) {
    try {
      const alarms = await this.getAllAlarms();
      const newAlarm = {
        id: `vc_alarm_${Date.now()}`,
        name: alarmData.name,
        start_time: alarmData.start_time,
        days: alarmData.days || [],
        is_enabled: alarmData.is_enabled !== undefined ? alarmData.is_enabled : true,
        commands: alarmData.commands || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      alarms.push(newAlarm);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
      
      console.log('Voice command alarm created:', newAlarm.id);
      return newAlarm;
    } catch (error) {
      console.error('Error creating alarm:', error);
      throw error;
    }
  }

  // Update existing alarm
  async updateAlarm(id, updates) {
    try {
      const alarms = await this.getAllAlarms();
      const index = alarms.findIndex(alarm => alarm.id === id);

      if (index === -1) {
        throw new Error('Alarm not found');
      }

      alarms[index] = {
        ...alarms[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
      
      console.log('Voice command alarm updated:', id);
      return alarms[index];
    } catch (error) {
      console.error('Error updating alarm:', error);
      throw error;
    }
  }

  // Delete alarm
  async deleteAlarm(id) {
    try {
      const alarms = await this.getAllAlarms();
      const filteredAlarms = alarms.filter(alarm => alarm.id !== id);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredAlarms));
      
      console.log('Voice command alarm deleted:', id);
      return true;
    } catch (error) {
      console.error('Error deleting alarm:', error);
      throw error;
    }
  }

  // Toggle alarm enabled/disabled
  async toggleAlarm(id, isEnabled) {
    try {
      return await this.updateAlarm(id, { is_enabled: isEnabled });
    } catch (error) {
      console.error('Error toggling alarm:', error);
      throw error;
    }
  }

  // Clear all alarms (useful for testing)
  async clearAllAlarms() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('All voice command alarms cleared');
      return true;
    } catch (error) {
      console.error('Error clearing alarms:', error);
      throw error;
    }
  }
}

export default new VoiceCommandStorageService();