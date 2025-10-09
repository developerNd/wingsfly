import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { UserDataModule } = NativeModules;

class UserDataService {
  
  // Save user data after successful login with improved error handling
  static async saveUserDataAfterLogin(userProfile) {
    try {
      console.log('Saving user data after login:', userProfile);
      
      // Extract and clean user data from Supabase profile
      const userData = {
        username: this.extractUsername(userProfile),
        display_name: this.extractDisplayName(userProfile),
        email: userProfile.email || '',
        phone: userProfile.phone || userProfile.user_metadata?.phone || '',
        user_metadata: userProfile.user_metadata || {}
      };
      
      console.log('Formatted user data for Android:', userData);
      
      // Save to AsyncStorage for React Native use
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      await AsyncStorage.setItem('user_logged_in', 'true');
      await AsyncStorage.setItem('login_timestamp', String(Date.now()));
      
      // Save to Android SharedPreferences via native module
      if (UserDataModule) {
        await UserDataModule.saveUserData(userData);
        console.log('User data saved to Android SharedPreferences');
        
        // Wait a bit longer and update service notification
        setTimeout(async () => {
          try {
            await this.updateServiceNotification();
            console.log('Service notification updated after login');
          } catch (notificationError) {
            console.error('Error updating service notification after login:', notificationError);
          }
        }, 1500); // Increased delay to ensure data is fully saved
        
      } else {
        console.error('UserDataModule not available');
        throw new Error('UserDataModule not available');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving user data after login:', error);
      return false;
    }
  }

  // Helper method to extract username with fallbacks
  static extractUsername(userProfile) {
    return userProfile.user_metadata?.username || 
           userProfile.user_metadata?.display_name || 
           userProfile.user_metadata?.full_name || 
           userProfile.email?.split('@')[0] || 
           'User';
  }

  // Helper method to extract display name with fallbacks
  static extractDisplayName(userProfile) {
    return userProfile.user_metadata?.display_name || 
           userProfile.user_metadata?.full_name || 
           userProfile.user_metadata?.username || 
           userProfile.email?.split('@')[0] || 
           'User';
  }

  // Clear user data on logout with improved cleanup
  static async clearUserDataOnLogout() {
    try {
      console.log('Clearing user data on logout');
      
      // Clear AsyncStorage
      const keysToRemove = [
        'user_data', 
        'user_logged_in', 
        'login_timestamp',
        'user_profile',
        'auth_session'
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Clear Android SharedPreferences via native module
      if (UserDataModule) {
        await UserDataModule.clearUserData();
        console.log('User data cleared from Android SharedPreferences');
        
        // Update service notification after clearing
        setTimeout(async () => {
          try {
            await this.updateServiceNotification();
            console.log('Service notification updated after logout');
          } catch (notificationError) {
            console.error('Error updating service notification after logout:', notificationError);
          }
        }, 1000);
      } else {
        console.error('UserDataModule not available');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing user data on logout:', error);
      return false;
    }
  }

  // Get current user data with error handling
  static async getUserData() {
    try {
      // Try AsyncStorage first
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        return JSON.parse(userData);
      }
      
      // Fallback to native module
      if (UserDataModule) {
        const nativeUserData = await UserDataModule.getUserData();
        return nativeUserData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Update service notification manually with retry logic
  static async updateServiceNotification() {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        if (UserDataModule) {
          await UserDataModule.updateServiceNotification();
          console.log(`Service notification update requested (attempt ${retryCount + 1})`);
          return true;
        } else {
          console.error('UserDataModule not available');
          return false;
        }
      } catch (error) {
        retryCount++;
        console.error(`Error updating service notification (attempt ${retryCount}):`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
    
    console.error('Failed to update service notification after all retries');
    return false;
  }

  // Check if user is logged in with multiple checks
  static async isUserLoggedIn() {
    try {
      // Check AsyncStorage
      const loggedIn = await AsyncStorage.getItem('user_logged_in');
      if (loggedIn === 'true') {
        return true;
      }
      
      // Double-check with native module if available
      if (UserDataModule) {
        const nativeUserData = await UserDataModule.getUserData();
        return nativeUserData?.user_logged_in === true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Debug method to check what's actually saved
  static async debugUserData() {
    try {
      console.log('=== DEBUG USER DATA ===');
      
      // AsyncStorage data
      const userData = await AsyncStorage.getItem('user_data');
      const loggedIn = await AsyncStorage.getItem('user_logged_in');
      console.log('AsyncStorage user_data:', userData);
      console.log('AsyncStorage user_logged_in:', loggedIn);
      
      // Native module data
      if (UserDataModule) {
        const nativeData = await UserDataModule.getUserData();
        console.log('Native module data:', nativeData);
      }
      
      console.log('=== END DEBUG USER DATA ===');
    } catch (error) {
      console.error('Error debugging user data:', error);
    }
  }
}

export default UserDataService;