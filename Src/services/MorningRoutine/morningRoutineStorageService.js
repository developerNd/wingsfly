import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@morning_routine';

class MorningRoutineStorageService {
  // Get morning routine for user
  async getMorningRoutine(userId) {
    try {
      const key = `${STORAGE_KEY}_${userId}`;
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error getting morning routine:', error);
      return null;
    }
  }

  // Save morning routine
  async saveMorningRoutine(routineData) {
    try {
      const key = `${STORAGE_KEY}_${routineData.userId}`;
      
      const routine = {
        userId: routineData.userId,
        name: routineData.name,
        wakeUpTime: routineData.wakeUpTime,
        commands: routineData.commands,
        isEnabled: routineData.isEnabled !== undefined ? routineData.isEnabled : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(routine));
      
      console.log('✅ Morning routine saved for user:', routineData.userId);
      return routine;
    } catch (error) {
      console.error('Error saving morning routine:', error);
      throw error;
    }
  }

  // Update morning routine
  async updateMorningRoutine(userId, updates) {
    try {
      const existing = await this.getMorningRoutine(userId);
      
      if (!existing) {
        throw new Error('Morning routine not found');
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const key = `${STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      console.log('✅ Morning routine updated for user:', userId);
      return updated;
    } catch (error) {
      console.error('Error updating morning routine:', error);
      throw error;
    }
  }

  // Delete morning routine
  async deleteMorningRoutine(userId) {
    try {
      const key = `${STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
      console.log('✅ Morning routine deleted for user:', userId);
      return true;
    } catch (error) {
      console.error('Error deleting morning routine:', error);
      throw error;
    }
  }

  // Toggle enabled state
  async toggleEnabled(userId, isEnabled) {
    try {
      return await this.updateMorningRoutine(userId, { isEnabled });
    } catch (error) {
      console.error('Error toggling morning routine:', error);
      throw error;
    }
  }

  // Clear all morning routines (for testing)
  async clearAllRoutines() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const morningRoutineKeys = keys.filter(key => key.startsWith(STORAGE_KEY));
      await AsyncStorage.multiRemove(morningRoutineKeys);
      console.log('✅ All morning routines cleared');
      return true;
    } catch (error) {
      console.error('Error clearing routines:', error);
      throw error;
    }
  }
}

export default new MorningRoutineStorageService();