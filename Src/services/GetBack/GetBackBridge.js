import {NativeModules, Alert} from 'react-native';
import getBackMediaSupabaseService from './getBackMediaSupabaseService';

const {GetBackModule} = NativeModules;

/**
 * Get Back Bridge - Interface to native Android functionality
 * With Do Not Disturb (DND) support
 */
const GetBackBridge = {
  // ========================================
  // DND (Do Not Disturb) METHODS
  // ========================================

  /**
   * Check if app has DND access permission
   */
  hasDndPermission: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const hasPermission = await GetBackModule.hasDndPermission();
      return hasPermission;
    } catch (error) {
      console.error('Error checking DND permission:', error);
      return false;
    }
  },

  /**
   * Request DND access permission
   */
  requestDndPermission: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const result = await GetBackModule.requestDndPermission();
      return result;
    } catch (error) {
      console.error('Error requesting DND permission:', error);
      return false;
    }
  },

  /**
   * Check if DND is currently enabled
   */
  isDndEnabled: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const isEnabled = await GetBackModule.isDndEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error checking DND status:', error);
      return false;
    }
  },

  /**
   * Enable DND mode
   */
  enableDnd: async function (mode = 'alarms_only') {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const result = await GetBackModule.enableDnd(mode);
      return result;
    } catch (error) {
      console.error('Error enabling DND:', error);
      return false;
    }
  },

  /**
   * Disable DND mode
   */
  disableDnd: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const result = await GetBackModule.disableDnd();
      return result;
    } catch (error) {
      console.error('Error disabling DND:', error);
      return false;
    }
  },

  // ========================================
  // SILENT MODE METHODS (Deprecated)
  // ========================================

  isSilentModeEnabled: async function () {
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
  },

  requestSilentMode: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return;
      }

      await GetBackModule.openSoundSettings();
    } catch (error) {
      console.error('Error opening sound settings:', error);
    }
  },

  // ========================================
  // GET BACK LOCK METHODS
  // ========================================

  /**
   * Start Get Back lock session with automatic DND
   */
  startGetBackLock: async function (durationInMinutes) {
    try {
      if (!GetBackModule) {
        console.warn(
          'GetBackModule not available - native implementation required',
        );
        return false;
      }

      console.log(
        '🔒 Starting Get Back lock for',
        durationInMinutes,
        'minutes',
      );

      // ✅ AUTO-ENABLE DND
      const hasDndPerm = await this.hasDndPermission();
      if (hasDndPerm) {
        console.log('🔕 Enabling DND automatically...');
        await this.enableDnd('alarms_only');
        console.log('✅ DND enabled for Get Back session');
      } else {
        console.log('⚠️ No DND permission - starting without DND');
      }

      // Fetch confirmation video from Supabase
      console.log('📥 Fetching confirmation video from Supabase...');
      const confirmationResult =
        await getBackMediaSupabaseService.fetchConfirmationVideo();

      if (!confirmationResult.hasConfirmation) {
        Alert.alert(
          'Confirmation Video Required',
          'No confirmation video found. Please contact admin.',
        );

        // Restore DND if we enabled it
        if (hasDndPerm) {
          await this.disableDnd();
        }
        return false;
      }

      const confirmationVideoUrl = confirmationResult.data.fileUrl;
      console.log('✅ Confirmation video URL:', confirmationVideoUrl);

      // Fetch random media file from Supabase
      console.log('📥 Fetching random media from Supabase...');
      const randomMediaResult =
        await getBackMediaSupabaseService.getRandomMediaFile();

      let mediaFileUrl = null;
      let mediaType = null;

      if (randomMediaResult.success && randomMediaResult.data) {
        mediaFileUrl = randomMediaResult.data.fileUrl;
        mediaType = randomMediaResult.data.type;
        console.log('✅ Random media selected:', {
          type: mediaType,
          url: mediaFileUrl,
        });
      } else {
        console.log(
          '⚠️ No media files available - session will play without media',
        );
      }

      // Start Get Back with URLs (DND already enabled)
      console.log('🚀 Starting Get Back with media from Supabase');
      const result = await GetBackModule.startGetBackLock(
        durationInMinutes,
        confirmationVideoUrl,
        mediaFileUrl,
        mediaType,
      );

      if (!result && hasDndPerm) {
        // If failed, restore DND state
        await this.disableDnd();
      }

      return result;
    } catch (error) {
      console.error('Error starting Get Back lock:', error);
      Alert.alert('Error', 'Failed to start Get Back: ' + error.message);
      throw error;
    }
  },

  /**
   * Stop Get Back lock session
   */
  stopGetBackLock: async function () {
    try {
      if (!GetBackModule) {
        console.warn('GetBackModule not available');
        return false;
      }

      const result = await GetBackModule.stopGetBackLock();

      // ✅ Disable DND when session ends
      const hasDndPerm = await this.hasDndPermission();
      if (hasDndPerm) {
        await this.disableDnd();
        console.log('✅ DND disabled after Get Back ended');
      }

      return result;
    } catch (error) {
      console.error('Error stopping Get Back lock:', error);
      throw error;
    }
  },

  isGetBackActive: async function () {
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
  },

  checkPermissions: async function () {
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
  },

  requestOverlayPermission: async function () {
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
  },
};

export default GetBackBridge;
