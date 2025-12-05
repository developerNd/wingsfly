import {NativeModules, Alert} from 'react-native';
import detoxMediaSupabaseService from './detoxMediaSupabaseService';

const {DigitalDetoxModule} = NativeModules;

/**
 * Digital Detox Bridge - Interface to native Android functionality
 * Updated to work with Supabase media URLs and Do Not Disturb (DND)
 */
class DigitalDetoxBridge {
  // ========================================
  // DND (Do Not Disturb) METHODS - NEW
  // ========================================

  /**
   * Check if app has DND access permission
   * @returns {Promise<boolean>} True if permission granted
   */
  static async hasDndPermission() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const hasPermission = await DigitalDetoxModule.hasDndPermission();
      return hasPermission;
    } catch (error) {
      console.error('Error checking DND permission:', error);
      return false;
    }
  }

  /**
   * Request DND access permission (opens Settings)
   * User must manually grant permission in Settings
   * @returns {Promise<boolean>} False initially (permission not granted yet)
   */
  static async requestDndPermission() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const result = await DigitalDetoxModule.requestDndPermission();
      return result;
    } catch (error) {
      console.error('Error requesting DND permission:', error);
      return false;
    }
  }

  /**
   * Check if DND is currently enabled
   * @returns {Promise<boolean>} True if DND is active
   */
  static async isDndEnabled() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const isEnabled = await DigitalDetoxModule.isDndEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error checking DND status:', error);
      return false;
    }
  }

  /**
   * Enable DND mode
   * @param {string} mode - "total_silence", "alarms_only", or "priority_only"
   * @returns {Promise<boolean>} True if successfully enabled
   */
  static async enableDnd(mode = 'alarms_only') {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const result = await DigitalDetoxModule.enableDnd(mode);
      return result;
    } catch (error) {
      console.error('Error enabling DND:', error);

      if (error.code === 'NO_DND_PERMISSION') {
        Alert.alert(
          'Permission Required',
          'Please grant Do Not Disturb access permission first.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Grant Permission',
              onPress: () => this.requestDndPermission(),
            },
          ],
        );
      }

      return false;
    }
  }

  /**
   * Disable DND mode (return to normal)
   * @returns {Promise<boolean>} True if successfully disabled
   */
  static async disableDnd() {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const result = await DigitalDetoxModule.disableDnd();
      return result;
    } catch (error) {
      console.error('Error disabling DND:', error);
      return false;
    }
  }

  // ========================================
  // SILENT MODE METHODS (Deprecated - use DND instead)
  // ========================================

  /**
   * Check if silent mode is enabled
   * NOTE: Use DND methods instead for better control
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
   * NOTE: Use requestDndPermission() instead for automated control
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

  // ========================================
  // DETOX LOCK METHODS
  // ========================================

  /**
   * Start the digital detox lock with given duration
   * Optionally enables DND mode automatically
   * @param {number} durationInMinutes - Lock duration in minutes
   * @param {string} mediaUrl - Optional: Media URL
   * @param {string} mediaType - Optional: Media type
   * @param {boolean} enableDndMode - Optional: Enable DND automatically (default: true)
   * @param {string} dndMode - Optional: DND mode ("total_silence", "alarms_only", "priority_only")
   * @returns {Promise<boolean>} Success status
   */
  static async startDetoxLock(
    durationInMinutes,
    mediaUrl = null,
    mediaType = null,
    enableDndMode = true,
    dndMode = 'alarms_only',
  ) {
    try {
      if (!DigitalDetoxModule) {
        console.warn(
          'DigitalDetoxModule not available - native implementation required',
        );
        return false;
      }

      // Check if detox is already active
      const isActive = await this.isDetoxActive();
      if (isActive) {
        Alert.alert(
          'Detox Already Active',
          'A digital detox session is already in progress.',
          [{text: 'OK'}],
        );
        return false;
      }

      // If media URL/type not provided, fetch from Supabase
      let finalMediaUrl = mediaUrl;
      let finalMediaType = mediaType;

      if (!mediaUrl || !mediaType) {
        console.log('📥 Fetching media from Supabase...');
        const mediaResult =
          await detoxMediaSupabaseService.fetchLatestDetoxMedia();

        if (mediaResult.success && mediaResult.hasMedia) {
          finalMediaUrl = mediaResult.data.fileUrl;
          finalMediaType = mediaResult.data.type;
          console.log('✅ Media fetched:', {
            type: finalMediaType,
            url: finalMediaUrl,
          });
        } else {
          console.log('ℹ️ No media available, starting without media');
          finalMediaUrl = null;
          finalMediaType = null;
        }
      }

      console.log('🎬 Starting detox with:', {
        duration: durationInMinutes,
        hasMedia: !!finalMediaUrl,
        mediaType: finalMediaType,
        enableDnd: enableDndMode,
        dndMode: dndMode,
      });

      // ✅ NEW: Handle DND permission and enabling
      if (enableDndMode) {
        const hasDndPerm = await this.hasDndPermission();

        if (!hasDndPerm) {
          // Ask user to grant DND permission first
          return new Promise(resolve => {
            Alert.alert(
              'Enable Do Not Disturb',
              'For the best Digital Detox experience, grant Do Not Disturb access.\n\nThis allows the app to automatically silence notifications during your detox session.',
              [
                {
                  text: 'Skip',
                  style: 'cancel',
                  onPress: async () => {
                    // Start detox without DND
                    const result = await DigitalDetoxModule.startDetoxLock(
                      durationInMinutes,
                      finalMediaUrl,
                      finalMediaType,
                    );
                    resolve(result);
                  },
                },
                {
                  text: 'Grant Permission',
                  onPress: async () => {
                    await this.requestDndPermission();

                    // Wait a bit for user to grant permission
                    setTimeout(async () => {
                      const nowHasPerm = await this.hasDndPermission();

                      if (nowHasPerm) {
                        // Enable DND
                        await this.enableDnd(dndMode);

                        // Start detox
                        const result = await DigitalDetoxModule.startDetoxLock(
                          durationInMinutes,
                          finalMediaUrl,
                          finalMediaType,
                        );
                        resolve(result);
                      } else {
                        Alert.alert(
                          'Permission Not Granted',
                          'Do Not Disturb permission was not granted. Starting detox without DND.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                const result =
                                  await DigitalDetoxModule.startDetoxLock(
                                    durationInMinutes,
                                    finalMediaUrl,
                                    finalMediaType,
                                  );
                                resolve(result);
                              },
                            },
                          ],
                        );
                      }
                    }, 1000);
                  },
                },
              ],
            );
          });
        } else {
          // Permission already granted, enable DND
          await this.enableDnd(dndMode);
        }
      }

      // Start the detox lock
      const result = await DigitalDetoxModule.startDetoxLock(
        durationInMinutes,
        finalMediaUrl,
        finalMediaType,
      );

      return result;
    } catch (error) {
      console.error('Error starting digital detox lock:', error);
      return false;
    }
  }

  /**
   * Stop the digital detox lock (emergency exit)
   * Optionally disables DND mode automatically
   * @param {boolean} disableDndMode - Optional: Disable DND automatically (default: true)
   * @returns {Promise<boolean>} Success status
   */
  static async stopDetoxLock(disableDndMode = true) {
    try {
      if (!DigitalDetoxModule) {
        console.warn('DigitalDetoxModule not available');
        return false;
      }

      const result = await DigitalDetoxModule.stopDetoxLock();

      // Disable DND if it was enabled
      if (disableDndMode) {
        const isDndOn = await this.isDndEnabled();
        if (isDndOn) {
          await this.disableDnd();
          console.log('✅ DND disabled after detox ended');
        }
      }

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
