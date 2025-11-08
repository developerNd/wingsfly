import { NativeModules, Alert } from 'react-native';
import detoxMediaSupabaseService from './detoxMediaSupabaseService';

const { DigitalDetoxModule } = NativeModules;

/**
 * Digital Detox Bridge - Interface to native Android functionality
 * Updated to work with Supabase media URLs
 */
class DigitalDetoxBridge {
  /**
   * Check if silent mode is enabled
   * @returns {Promise<boolean>} True if silent mode is enabled
   */
  static async isSilentModeEnabled() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }
      
      const isEnabled = await DigitalDetoxModule.isSilentModeEnabled();
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
  static async requestSilentMode() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return;
      }
      
      await DigitalDetoxModule.openSoundSettings();
    } catch (error) {
      console.error('Error opening sound settings:', error);
    }
  }

  /**
   * Start the digital detox lock with given duration
   * Fetches media from Supabase and passes URL to native code
   * @param {number} durationInMinutes - Lock duration in minutes
   * @param {string} mediaUrl - Optional: Media URL (will fetch if not provided)
   * @param {string} mediaType - Optional: Media type (will fetch if not provided)
   * @returns {Promise<boolean>} Success status
   */
  static async startDetoxLock(durationInMinutes, mediaUrl = null, mediaType = null) {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available - native implementation required');
        return false;
      }
      
      // Check if detox is already active
      const isActive = await this.isDetoxActive();
      if (isActive) {
        Alert.alert(
          'Detox Already Active',
          'A digital detox session is already in progress.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // If media URL/type not provided, fetch from Supabase
      let finalMediaUrl = mediaUrl;
      let finalMediaType = mediaType;
      
      if (!mediaUrl || !mediaType) {
        console.log('📥 Fetching media from Supabase...');
        const mediaResult = await detoxMediaSupabaseService.fetchLatestDetoxMedia();
        
        if (mediaResult.success && mediaResult.hasMedia) {
          finalMediaUrl = mediaResult.data.fileUrl;
          finalMediaType = mediaResult.data.type;
          console.log('✅ Media fetched:', { type: finalMediaType, url: finalMediaUrl });
        } else {
          console.log('ℹ️ No media available, starting without media');
          finalMediaUrl = null;
          finalMediaType = null;
        }
      }
      
      console.log('🎬 Starting detox with:', {
        duration: durationInMinutes,
        hasMedia: !!finalMediaUrl,
        mediaType: finalMediaType
      });
      
      // Check if silent mode is enabled
      const isSilent = await this.isSilentModeEnabled();
      
      if (!isSilent) {
        return new Promise((resolve) => {
          Alert.alert(
            'Enable Silent Mode',
            'For the best Digital Detox experience, please enable Silent Mode.',
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
                          text: 'Yes, Start Detox',
                          onPress: async () => {
                            const isNowSilent = await this.isSilentModeEnabled();
                            if (isNowSilent) {
                              const result = await DigitalDetoxModule.startDetoxLock(
                                durationInMinutes,
                                finalMediaUrl,
                                finalMediaType
                              );
                              resolve(result);
                            } else {
                              Alert.alert(
                                'Silent Mode Not Enabled',
                                'Please enable Silent Mode before starting Digital Detox.'
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
      
      // Silent mode is enabled, proceed
      const result = await DigitalDetoxModule.startDetoxLock(
        durationInMinutes,
        finalMediaUrl,
        finalMediaType
      );
      return result;
    } catch (error) {
      console.error('Error starting digital detox lock:', error);
      return false;
    }
  }

  /**
   * Stop the digital detox lock (emergency exit)
   * @returns {Promise<boolean>} Success status
   */
  static async stopDetoxLock() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }
      
      const result = await DigitalDetoxModule.stopDetoxLock();
      return result;
    } catch (error) {
      console.error('Error stopping digital detox lock:', error);
      return false;
    }
  }

  /**
   * Check if digital detox is currently active
   * @returns {Promise<boolean>} Active status
   */
  static async isDetoxActive() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }
      
      const isActive = await DigitalDetoxModule.isDetoxActive();
      return isActive;
    } catch (error) {
      console.error('Error checking detox status:', error);
      return false;
    }
  }
}

export default DigitalDetoxBridge;