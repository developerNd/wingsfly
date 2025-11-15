import { NativeModules, Alert } from 'react-native';
import getBackMediaSupabaseService from './getBackMediaSupabaseService';

const { GetBackModule } = NativeModules;

class GetBackBridge {
  /**
   * Check if silent mode is enabled
   * @returns {Promise<boolean>} True if silent mode is enabled
   */
  async isSilentModeEnabled() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }
      
      const isEnabled = await GetBackModule.isSilentModeEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error checking silent mode:', error);
      return false;
    }
  }

  /**
   * Request user to enable silent mode
   * Opens the sound settings page
   * @returns {Promise<void>}
   */
  async requestSilentMode() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return;
      }
      
      await GetBackModule.openSoundSettings();
    } catch (error) {
      console.error('Error opening sound settings:', error);
    }
  }

  /**
   * Start Get Back lock session
   * ✅ UPDATED: Fetches confirmation video and random media from Supabase
   * @param {number} durationInMinutes - Duration of the lock session
   * @returns {Promise<boolean>} Success status
   */
  async startGetBackLock(durationInMinutes) {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available - native implementation required');
        return false;
      }

      console.log('🔒 Starting Get Back lock for', durationInMinutes, 'minutes');
      
      // ✅ NEW: Fetch confirmation video from Supabase
      console.log('📥 Fetching confirmation video from Supabase...');
      const confirmationResult = await getBackMediaSupabaseService.fetchConfirmationVideo();
      
      if (!confirmationResult.hasConfirmation) {
        Alert.alert(
          'Confirmation Video Required',
          'No confirmation video found. Please contact admin.'
        );
        return false;
      }
      
      const confirmationVideoUrl = confirmationResult.data.fileUrl;
      console.log('✅ Confirmation video URL:', confirmationVideoUrl);
      
      // ✅ NEW: Fetch random media file from Supabase
      console.log('📥 Fetching random media from Supabase...');
      const randomMediaResult = await getBackMediaSupabaseService.getRandomMediaFile();
      
      let mediaFileUrl = null;
      let mediaType = null;
      
      if (randomMediaResult.success && randomMediaResult.data) {
        mediaFileUrl = randomMediaResult.data.fileUrl;
        mediaType = randomMediaResult.data.type;
        console.log('✅ Random media selected:', {
          type: mediaType,
          url: mediaFileUrl
        });
      } else {
        console.log('⚠️ No media files available - session will play without media');
      }
      
      // Check if silent mode is enabled
      const isSilent = await this.isSilentModeEnabled();
      
      if (!isSilent) {
        // Return a promise that resolves based on user choice
        return new Promise((resolve) => {
          Alert.alert(
            'Enable Silent Mode',
            'For the best Get Back experience, please enable Silent Mode to minimize distractions.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Enable Silent Mode',
                onPress: async () => {
                  await this.requestSilentMode();
                  
                  // Wait for user to enable and come back
                  setTimeout(() => {
                    Alert.alert(
                      'Ready to Start?',
                      'Have you enabled Silent Mode?',
                      [
                        {
                          text: 'Not Yet',
                          style: 'cancel',
                          onPress: () => resolve(false)
                        },
                        {
                          text: 'Yes, Start Get Back',
                          onPress: async () => {
                            // Verify silent mode is now enabled
                            const isNowSilent = await this.isSilentModeEnabled();
                            if (isNowSilent) {
                              // ✅ Start with Supabase URLs
                              const result = await GetBackModule.startGetBackLock(
                                durationInMinutes,
                                confirmationVideoUrl,
                                mediaFileUrl,
                                mediaType
                              );
                              resolve(result);
                            } else {
                              Alert.alert(
                                'Silent Mode Not Enabled',
                                'Please enable Silent Mode before starting Get Back.'
                              );
                              resolve(false);
                            }
                          }
                        }
                      ]
                    );
                  }, 500);
                }
              }
            ]
          );
        });
      }
      
      // Silent mode is already enabled, proceed with Supabase URLs
      console.log('🚀 Starting Get Back with media from Supabase');
      const result = await GetBackModule.startGetBackLock(
        durationInMinutes,
        confirmationVideoUrl,
        mediaFileUrl,
        mediaType
      );
      return result;
    } catch (error) {
      console.error('Error starting Get Back lock:', error);
      Alert.alert('Error', 'Failed to start Get Back: ' + error.message);
      throw error;
    }
  }

  /**
   * Stop Get Back lock session (emergency stop)
   * @returns {Promise<boolean>}
   */
  async stopGetBackLock() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }
      
      const result = await GetBackModule.stopGetBackLock();
      return result;
    } catch (error) {
      console.error('Error stopping Get Back lock:', error);
      throw error;
    }
  }

  /**
   * Check if Get Back is currently active
   * @returns {Promise<boolean>}
   */
  async isGetBackActive() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }
      
      const result = await GetBackModule.isGetBackActive();
      return result;
    } catch (error) {
      console.error('Error checking Get Back status:', error);
      return false;
    }
  }

  /**
   * Check all required permissions for Get Back
   * @returns {Promise<object>} Permissions status
   */
  async checkPermissions() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return {};
      }
      
      const permissions = await GetBackModule.checkPermissions();
      return permissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      throw error;
    }
  }

  /**
   * Request overlay permission
   * @returns {Promise<boolean>}
   */
  async requestOverlayPermission() {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }
      
      const result = await GetBackModule.requestOverlayPermission();
      return result;
    } catch (error) {
      console.error('Error requesting overlay permission:', error);
      throw error;
    }
  }
}

export default new GetBackBridge();