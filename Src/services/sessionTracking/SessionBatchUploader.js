// Src/services/sessionTracking/SessionBatchUploader.js
import {supabase} from '../../../supabase';
import {SessionStorageManager} from './SessionStorageManager';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SessionBatchUploader {
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

  static async uploadPendingSessions() {
    try {
      // Check internet connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No internet connection, skipping upload');
        return { success: false, reason: 'No internet connection' };
      }

      const pendingSessions = await SessionStorageManager.getPendingSessions();
      
      if (pendingSessions.length === 0) {
        console.log('No pending sessions to upload');
        return { success: true, reason: 'No pending sessions' };
      }

      console.log(`Uploading ${pendingSessions.length} sessions to Supabase with IST timestamps...`);

      // Prepare sessions for database - store formatted duration as text
      const sessionsToUpload = pendingSessions.map(session => {
        const durationInSeconds = session.duration || 0;
        const formattedDuration = this.formatDuration(durationInSeconds);
        
        return {
          user_id: session.user_id,
          session_start: session.session_start, // Already in IST format
          session_end: session.session_end, // Already in IST format
          duration: formattedDuration, // Store as formatted text (e.g., "2h 15m 30s")
          device_info: session.device_info
        };
      });

      // Upload to Supabase in batches of 100 (Supabase limit)
      const batchSize = 100;
      const uploadResults = [];

      for (let i = 0; i < sessionsToUpload.length; i += batchSize) {
        const batch = sessionsToUpload.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('user_activity')
          .insert(batch);

        if (error) {
          console.error('Error uploading batch:', error);
          throw error;
        }

        uploadResults.push({ 
          batchNumber: Math.floor(i / batchSize) + 1, 
          count: batch.length,
          startIndex: i,
          endIndex: i + batch.length - 1,
          sampleDurations: batch.slice(0, 3).map(s => s.duration) // Show first 3 formatted durations
        });
        
        console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}: ${batch.length} sessions (IST with formatted durations)`);
      }

      // Clear pending sessions after successful upload
      await SessionStorageManager.clearPendingSessions();
      await SessionStorageManager.updateLastBatchSent();

      // Calculate total duration from original seconds for summary
      const totalDurationInSeconds = pendingSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const summary = {
        success: true,
        uploadedSessions: pendingSessions.length,
        totalBatches: uploadResults.length,
        batchDetails: uploadResults,
        totalDurationFormatted: this.formatDuration(totalDurationInSeconds),
        avgDurationPerSession: this.formatDuration(Math.round(totalDurationInSeconds / pendingSessions.length)),
        uploadedAt: this.getISTTime(),
        note: 'Duration stored as formatted text in database'
      };

      console.log('Successfully uploaded all pending sessions with formatted durations:', summary);
      return summary;

    } catch (error) {
      console.error('Failed to upload sessions:', error);
      
      // Don't clear sessions if upload failed - they'll be retried later
      return {
        success: false,
        error: error.message,
        reason: 'Upload failed',
        timestamp: this.getISTTime()
      };
    }
  }

  // Upload immediately regardless of daily limit (for testing or manual trigger)
  static async forceUploadPendingSessions() {
    console.log('Force uploading pending sessions with formatted durations...');
    return await this.uploadPendingSessions();
  }

  // Get upload statistics
  static async getUploadStats() {
    try {
      const pendingSessions = await SessionStorageManager.getPendingSessions();
      const lastBatchStr = await AsyncStorage.getItem('last_batch_sent');
      
      const totalPendingDurationInSeconds = pendingSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      
      return {
        pendingSessionsCount: pendingSessions.length,
        lastBatchSent: lastBatchStr ? new Date(lastBatchStr) : null,
        shouldUpload: await SessionStorageManager.shouldSendBatch(),
        totalPendingDurationFormatted: this.formatDuration(totalPendingDurationInSeconds),
        avgPendingDuration: pendingSessions.length > 0 ? 
          this.formatDuration(Math.round(totalPendingDurationInSeconds / pendingSessions.length)) : '0s',
        oldestPendingSession: pendingSessions.length > 0 ? pendingSessions[0].session_start : null,
        newestPendingSession: pendingSessions.length > 0 ? pendingSessions[pendingSessions.length - 1].session_start : null,
        pendingSessionsPreview: pendingSessions.slice(0, 5).map(session => ({
          start: session.session_start,
          duration: this.formatDuration(session.duration || 0)
        }))
      };
    } catch (error) {
      console.error('Error getting upload stats:', error);
      return null;
    }
  }

  // Test connection to Supabase
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('Supabase connection test failed:', error);
        return { success: false, error: error.message };
      }

      console.log('Supabase connection test successful');
      return { success: true, message: 'Connection to Supabase successful' };
    } catch (error) {
      console.error('Supabase connection test error:', error);
      return { success: false, error: error.message };
    }
  }

  // Upload a single test session (for testing)
  static async uploadTestSession(userId) {
    try {
      const testDurationSeconds = 75; // 1 minute 15 seconds for testing
      const testSession = {
        user_id: userId,
        session_start: new Date(Date.now() - 75000).toISOString(), // 75 seconds ago
        session_end: this.getISTTime(),
        duration: this.formatDuration(testDurationSeconds), // Store as formatted text
        device_info: JSON.stringify({
          platform: 'test',
          type: 'test_session',
          timezone: 'IST'
        })
      };

      const { data, error } = await supabase
        .from('user_activity')
        .insert([testSession])
        .select();

      if (error) {
        console.error('Error uploading test session:', error);
        return { success: false, error: error.message };
      }

      console.log('Test session uploaded successfully with formatted duration:', data[0]);
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Test session upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's session data from database (duration already formatted)
  static async getUserSessionData(userId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('session_start', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user session data:', error);
        return { success: false, error: error.message };
      }

      // Add formatted time display (duration is already formatted in database)
      const sessionsWithFormatting = data.map(session => ({
        ...session,
        session_start_formatted: SessionStorageManager.formatTimeForDisplay(session.session_start),
        session_end_formatted: SessionStorageManager.formatTimeForDisplay(session.session_end),
        // duration is already formatted as text from database
        duration_note: 'Duration stored as formatted text'
      }));

      return { success: true, sessions: sessionsWithFormatting };
    } catch (error) {
      console.error('Error in getUserSessionData:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate session analytics (duration is text, so we need to parse for calculations)
  static calculateSessionAnalytics(sessions) {
    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0,
        averageDurationDisplay: '0s',
        longestSessionDisplay: '0s',
        shortestSessionDisplay: '0s',
        sessionsThisWeek: 0,
        sessionsToday: 0,
        note: 'Duration calculations limited since duration is stored as formatted text'
      };
    }

    // Get IST time for comparison
    const istNow = new Date(this.getISTTime());
    const istToday = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    const istWeekAgo = new Date(istNow.getTime() - 7 * 24 * 60 * 60 * 1000);

    const analytics = {
      totalSessions: sessions.length,
      sessionsThisWeek: sessions.filter(session => {
        const sessionDate = new Date(session.session_start);
        return sessionDate >= istWeekAgo;
      }).length,
      sessionsToday: sessions.filter(session => {
        const sessionDate = new Date(session.session_start);
        const sessionDateIST = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
        return sessionDateIST.getTime() === istToday.getTime();
      }).length,
      sampleDurations: sessions.slice(0, 10).map(session => ({
        start: session.session_start,
        duration: session.duration // Already formatted
      })),
      note: 'Duration stored as formatted text in database'
    };

    return analytics;
  }

  // Get today's sessions for a user (IST-aware)
  static async getTodaySessionsIST(userId) {
    try {
      const istNow = new Date(this.getISTTime());
      
      // Start of day in IST
      const startOfDayIST = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
      const startOfDayISOString = new Date(startOfDayIST.getTime() + (5.5 * 60 * 60 * 1000)).toISOString();
      
      // End of day in IST
      const endOfDayIST = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate() + 1);
      const endOfDayISOString = new Date(endOfDayIST.getTime() + (5.5 * 60 * 60 * 1000)).toISOString();

      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .gte('session_start', startOfDayISOString)
        .lt('session_start', endOfDayISOString)
        .order('session_start', { ascending: false });

      if (error) {
        console.error('Error fetching today sessions:', error);
        return { success: false, error: error.message };
      }

      const sessionsWithFormatting = data.map(session => ({
        ...session,
        session_start_formatted: SessionStorageManager.formatTimeForDisplay(session.session_start),
        session_end_formatted: SessionStorageManager.formatTimeForDisplay(session.session_end),
        // duration is already formatted as text from database
      }));

      return { success: true, sessions: sessionsWithFormatting };
    } catch (error) {
      console.error('Error getting today sessions:', error);
      return { success: false, error: error.message };
    }
  }
}