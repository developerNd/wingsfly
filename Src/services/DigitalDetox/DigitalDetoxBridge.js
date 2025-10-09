import { NativeModules, Alert } from 'react-native';
import detoxMediaStorageService from './detoxMediaStorageService';

const { DigitalDetoxModule } = NativeModules;

/**
 * Digital Detox Bridge - Interface to native Android functionality
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
   * First checks if silent mode is enabled, prompts user if not
   * @param {number} durationInMinutes - Lock duration in minutes
   * @returns {Promise<boolean>} Success status
   */
  static async startDetoxLock(durationInMinutes) {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available - native implementation required');
        return false;
      }
      
      // Get media file path if configured
      const mediaData = await detoxMediaStorageService.getDetoxMedia();
      const mediaFilePath = mediaData ? mediaData.filePath : null;
      const mediaType = mediaData ? mediaData.type : null;
      
      console.log('Starting detox with media:', { mediaType, mediaFilePath });
      
      // Check if silent mode is enabled
      const isSilent = await this.isSilentModeEnabled();
      
      if (!isSilent) {
        // Return a promise that resolves based on user choice
        return new Promise((resolve) => {
          Alert.alert(
            'Enable Silent Mode',
            'For the best Digital Detox experience, please enable Silent Mode to minimize distractions.',
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
                          text: 'Yes, Start Detox',
                          onPress: async () => {
                            // Verify silent mode is now enabled
                            const isNowSilent = await this.isSilentModeEnabled();
                            if (isNowSilent) {
                              const result = await DigitalDetoxModule.startDetoxLock(
                                durationInMinutes,
                                mediaFilePath,
                                mediaType
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
      
      // Silent mode is already enabled, proceed
      const result = await DigitalDetoxModule.startDetoxLock(
        durationInMinutes,
        mediaFilePath,
        mediaType
      );
      return result;
    } catch (error) {
      console.error('Error starting digital detox lock:', error);
      return false;
    }
  }

  /**
   * Stop the digital detox lock (emergency exit - use cautiously)
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