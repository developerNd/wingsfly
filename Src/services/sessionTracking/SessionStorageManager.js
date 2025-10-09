// Src/services/sessionTracking/SessionStorageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const STORAGE_KEYS = {
  PENDING_SESSIONS: 'pending_sessions',
  CURRENT_SESSION: 'current_session',
  LAST_BATCH_SENT: 'last_batch_sent'
};

export class SessionStorageManager {
  // Convert time to IST and return ISO string
  static getISTTime() {
    const now = new Date();
    // IST is UTC+5:30, so add 5.5 hours (19800000 milliseconds)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString();
  }

  // Format duration from seconds to readable format
  static formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Start a new session when app opens
  static async startSession(userId) {
    try {
      const sessionStart = this.getISTTime();
      const deviceInfo = await this.getDeviceInfo();
      
      const currentSession = {
        user_id: userId,
        session_start: sessionStart,
        device_info: JSON.stringify(deviceInfo)
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_SESSION, 
        JSON.stringify(currentSession)
      );
      
      console.log('Session started (IST):', sessionStart);
      return currentSession;
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  // End session when app goes to background/closes
  static async endSession() {
    try {
      const currentSessionStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      
      if (!currentSessionStr) {
        console.log('No active session to end');
        return;
      }

      const currentSession = JSON.parse(currentSessionStr);
      const sessionEnd = this.getISTTime();
      const sessionStart = new Date(currentSession.session_start);
      const sessionEndDate = new Date(sessionEnd);
      
      // Calculate duration in seconds
      const duration = Math.floor((sessionEndDate - sessionStart) / 1000);
      
      // Only save sessions longer than 5 seconds to avoid noise
      if (duration < 5) {
        console.log('Session too short, not saving');
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        return;
      }
      
      const completedSession = {
        ...currentSession,
        session_end: sessionEnd,
        duration: duration,
        duration_formatted: this.formatDuration(duration),
        id: this.generateUUID() // Generate local UUID
      };

      // Add to pending sessions
      await this.addToPendingSessions(completedSession);
      
      // Clear current session
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      
      console.log('Session ended (IST):', {
        duration: this.formatDuration(duration),
        start: currentSession.session_start,
        end: sessionEnd
      });
      
      return completedSession;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Add completed session to pending list
  static async addToPendingSessions(session) {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS);
      const pendingSessions = pendingStr ? JSON.parse(pendingStr) : [];
      
      pendingSessions.push(session);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_SESSIONS, 
        JSON.stringify(pendingSessions)
      );
      
      console.log(`Added session to pending. Total pending: ${pendingSessions.length}`);
    } catch (error) {
      console.error('Error adding to pending sessions:', error);
    }
  }

  // Get all pending sessions
  static async getPendingSessions() {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS);
      return pendingStr ? JSON.parse(pendingStr) : [];
    } catch (error) {
      console.error('Error getting pending sessions:', error);
      return [];
    }
  }

  // Clear pending sessions after successful upload
  static async clearPendingSessions() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SESSIONS);
      console.log('Cleared pending sessions');
    } catch (error) {
      console.error('Error clearing pending sessions:', error);
    }
  }

  // Check if we should send batch (once per day)
  static async shouldSendBatch() {
    try {
      const lastBatchStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BATCH_SENT);
      const pendingSessions = await this.getPendingSessions();
      
      if (pendingSessions.length === 0) {
        return false;
      }

      if (!lastBatchStr) {
        return true; // Never sent before
      }

      const lastBatchDate = new Date(lastBatchStr);
      const now = new Date(this.getISTTime());
      const hoursSinceLastBatch = (now - lastBatchDate) / (1000 * 60 * 60);
      
      // Send if more than 24 hours or if we have many pending sessions
      return hoursSinceLastBatch >= 24 || pendingSessions.length >= 50;
    } catch (error) {
      console.error('Error checking if should send batch:', error);
      return false;
    }
  }

  // Update last batch sent timestamp
  static async updateLastBatchSent() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_BATCH_SENT, 
        this.getISTTime()
      );
    } catch (error) {
      console.error('Error updating last batch sent:', error);
    }
  }

  // Get device information
  static async getDeviceInfo() {
    try {
      const [brand, model, systemVersion, appVersion] = await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion()
      ]);

      return {
        platform: Platform.OS,
        brand,
        model,
        systemVersion,
        appVersion,
        timezone: 'IST'
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        platform: Platform.OS,
        timezone: 'IST',
        error: 'Unable to get device info'
      };
    }
  }

  // Generate UUID (simple version)
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get session statistics
  static async getSessionStats() {
    try {
      const pendingSessions = await this.getPendingSessions();
      const lastBatchStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BATCH_SENT);
      const currentSessionStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      
      const totalDuration = pendingSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      
      return {
        pendingSessionsCount: pendingSessions.length,
        hasActiveSession: !!currentSessionStr,
        lastBatchSent: lastBatchStr ? new Date(lastBatchStr) : null,
        totalDuration: totalDuration,
        totalDurationFormatted: this.formatDuration(totalDuration),
        pendingSessions: pendingSessions.map(session => ({
          ...session,
          duration_formatted: this.formatDuration(session.duration || 0)
        }))
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  // Force clear all session data
  static async clearAllSessionData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PENDING_SESSIONS,
        STORAGE_KEYS.CURRENT_SESSION,
        STORAGE_KEYS.LAST_BATCH_SENT
      ]);
      console.log('Cleared all session data');
    } catch (error) {
      console.error('Error clearing all session data:', error);
    }
  }

  // Format time for display (IST time)
  static formatTimeForDisplay(istTimeString) {
    try {
      const date = new Date(istTimeString);
      // Since we're already storing IST time, subtract the offset for proper display
      const actualIST = new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
      return actualIST.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return istTimeString;
    }
  }
}