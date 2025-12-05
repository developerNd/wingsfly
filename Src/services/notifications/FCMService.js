import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { supabase } from '../../../supabase';

const { FCMModule } = NativeModules;

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.userId = null;
    this.eventEmitter = null;
    this.tokenListener = null;
    this.messageListener = null;
  }

  /**
   * Initialize FCM Service
   */
  async initialize(userId) {
    console.log('[FCM] 🚀 Initializing FCM Service for user:', userId);
    
    if (!userId) {
      console.error('[FCM] ❌ Cannot initialize without userId');
      return false;
    }

    this.userId = userId;

    try {
      // Request notification permission (Android 13+)
      const hasPermission = await this.requestNotificationPermission();
      
      if (!hasPermission) {
        console.warn('[FCM] ⚠️ Notification permission denied');
        return false;
      }

      // Setup event listeners
      this.setupEventListeners();

      // Get FCM token
      const token = await this.getToken();
      
      if (token) {
        console.log('[FCM] ✅ FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Save token to database
        await this.saveTokenToDatabase(token);
        
        return true;
      } else {
        console.error('[FCM] ❌ Failed to get FCM token');
        return false;
      }
    } catch (error) {
      console.error('[FCM] ❌ Initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permission (Android 13+)
   */
  async requestNotificationPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'WingsFly needs notification permission to send you important updates.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('[FCM] 📱 Notification permission:', hasPermission ? 'GRANTED' : 'DENIED');
        return hasPermission;
      }
      
      // Android < 13 doesn't need runtime permission
      return true;
    } catch (error) {
      console.error('[FCM] ❌ Permission request error:', error);
      return false;
    }
  }

  /**
   * Get FCM token from native module
   */
  async getToken() {
    try {
      const token = await FCMModule.getToken();
      this.fcmToken = token;
      return token;
    } catch (error) {
      console.error('[FCM] ❌ Error getting token:', error);
      return null;
    }
  }

  /**
   * Setup event listeners for FCM events
   */
  setupEventListeners() {
    if (this.tokenListener || this.messageListener) {
      console.log('[FCM] 📡 Event listeners already setup');
      return;
    }

    this.eventEmitter = new NativeEventEmitter(NativeModules.FCMModule);

    // Listen for token refresh
    this.tokenListener = this.eventEmitter.addListener('FCMTokenRefreshed', (event) => {
      console.log('[FCM] 🔄 Token refreshed:', event.token.substring(0, 20) + '...');
      this.fcmToken = event.token;
      
      // Update token in database
      if (this.userId) {
        this.saveTokenToDatabase(event.token);
      }
    });

    // Listen for incoming messages (when app is in foreground)
    this.messageListener = this.eventEmitter.addListener('FCMMessageReceived', (data) => {
      console.log('[FCM] 📨 Message received in foreground:', data);
      
      // You can show an in-app notification or handle the message
      // For now, we'll just log it
    });

    console.log('[FCM] ✅ Event listeners setup complete');
  }

  /**
   * Save FCM token to Supabase database
   * Production-ready approach: One row per user+device, update token when changed
   */
  async saveTokenToDatabase(token) {
    if (!this.userId || !token) {
      console.error('[FCM] ❌ Cannot save token: missing userId or token');
      return false;
    }

    try {
      console.log('[FCM] 💾 Saving token to database...');

      // Get device information
      const deviceId = await DeviceInfo.getAndroidId(); // Unique device identifier
      const deviceName = await DeviceInfo.getDeviceName(); // e.g., "Samsung Galaxy S23"
      const deviceModel = await DeviceInfo.getModel(); // e.g., "SM-S911B"
      const appVersion = DeviceInfo.getVersion(); // e.g., "1.1.0"
      const osVersion = await DeviceInfo.getSystemVersion(); // e.g., "14"

      console.log('[FCM] 📱 Device ID:', deviceId);
      console.log('[FCM] 📱 Device:', deviceName, deviceModel);

      // Check if a row exists for this user+platform+device combination
      const { data: existingRow, error: checkError } = await supabase
        .from('user_fcm_tokens')
        .select('id, fcm_token')
        .eq('user_id', this.userId)
        .eq('platform', Platform.OS)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found (which is fine)
        console.error('[FCM] ❌ Error checking existing row:', checkError);
        return false;
      }

      const tokenData = {
        fcm_token: token,
        device_name: deviceName,
        device_model: deviceModel,
        app_version: appVersion,
        os_version: `Android ${osVersion}`,
        is_active: true,
        last_used_at: new Date().toISOString(),
      };

      if (existingRow) {
        // Row exists - UPDATE with new token and metadata
        const { error: updateError } = await supabase
          .from('user_fcm_tokens')
          .update(tokenData)
          .eq('id', existingRow.id);

        if (updateError) {
          console.error('[FCM] ❌ Error updating token:', updateError);
          return false;
        }

        console.log('[FCM] ✅ Token updated for user+device');
      } else {
        // No row exists - INSERT new row
        const { error: insertError } = await supabase
          .from('user_fcm_tokens')
          .insert({
            user_id: this.userId,
            device_id: deviceId,
            platform: Platform.OS,
            ...tokenData,
          });

        if (insertError) {
          console.error('[FCM] ❌ Error inserting token:', insertError);
          return false;
        }

        console.log('[FCM] ✅ New device token row created');
      }

      return true;
    } catch (error) {
      console.error('[FCM] ❌ Database error:', error);
      return false;
    }
  }

  /**
   * Delete FCM token (on logout)
   */
  async deleteToken() {
    try {
      console.log('[FCM] 🗑️ Deleting FCM token...');

      // Delete from native
      await FCMModule.deleteToken();

      // Mark as inactive in database
      if (this.userId && this.fcmToken) {
        await supabase
          .from('user_fcm_tokens')
          .update({ is_active: false })
          .eq('user_id', this.userId)
          .eq('fcm_token', this.fcmToken);
      }

      this.fcmToken = null;
      console.log('[FCM] ✅ Token deleted');
    } catch (error) {
      console.error('[FCM] ❌ Error deleting token:', error);
    }
  }

  /**
   * Cleanup (remove listeners)
   */
  cleanup() {
    console.log('[FCM] 🧹 Cleaning up FCM Service');
    
    if (this.tokenListener) {
      this.tokenListener.remove();
      this.tokenListener = null;
    }

    if (this.messageListener) {
      this.messageListener.remove();
      this.messageListener = null;
    }

    this.userId = null;
  }

  /**
   * Get current token (for debugging)
   */
  getCurrentToken() {
    return this.fcmToken;
  }
}

// Export singleton instance
export default new FCMService();