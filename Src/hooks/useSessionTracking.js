import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SessionStorageManager } from '../services/sessionTracking/SessionStorageManager';
import { SessionBatchUploader } from '../services/sessionTracking/SessionBatchUploader';

export const useSessionTracking = (user) => {
  const appState = useRef(AppState.currentState);
  const sessionStarted = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      console.log('[SESSION] No user ID, skipping session tracking');
      return;
    }

    // Start session when hook initializes (app opens)
    const initSession = async () => {
      if (!sessionStarted.current) {
        console.log('[SESSION] Starting initial session for user:', userId);
        await SessionStorageManager.startSession(userId);
        sessionStarted.current = true;
        
        // Check if we should upload pending sessions
        await checkAndUploadPendingSessions();
      }
    };

    initSession();

    const handleAppStateChange = async (nextAppState) => {
      console.log('[SESSION] App state changed:', appState.current, '->', nextAppState);

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('[SESSION] App came to foreground');
        
        if (!sessionStarted.current) {
          await SessionStorageManager.startSession(userId);
          sessionStarted.current = true;
          console.log('[SESSION] Started new session on foreground');
        }
        
        // Check for pending uploads when app becomes active
        setTimeout(() => {
          checkAndUploadPendingSessions();
        }, 1000);
      }

      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background
        console.log('[SESSION] App going to background');
        
        if (sessionStarted.current) {
          await SessionStorageManager.endSession();
          sessionStarted.current = false;
          console.log('[SESSION] Ended session on background');
        }
      }

      appState.current = nextAppState;
    };

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      subscription?.remove();
      
      // End session if component unmounts while session is active
      if (sessionStarted.current) {
        SessionStorageManager.endSession();
        sessionStarted.current = false;
        console.log('[SESSION] Ended session on cleanup');
      }
    };
  }, [userId]);

  const checkAndUploadPendingSessions = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected;
      
      console.log('[SESSION] Network status:', isConnected ? 'Connected' : 'Disconnected');
      
      if (isConnected) {
        const shouldSend = await SessionStorageManager.shouldSendBatch();
        
        if (shouldSend) {
          console.log('[SESSION] Attempting to upload pending sessions...');
          const result = await SessionBatchUploader.uploadPendingSessions();
          
          if (result.success) {
            console.log(`[SESSION] Successfully uploaded ${result.uploadedSessions} sessions`);
          } else {
            console.log('[SESSION] Upload failed:', result.reason);
          }
        } else {
          console.log('[SESSION] Not time to upload yet');
        }
      } else {
        console.log('[SESSION] No internet connection, skipping batch upload');
      }
    } catch (error) {
      console.error('[SESSION] Error checking/uploading pending sessions:', error);
    }
  };

  // Manual trigger for batch upload (useful for testing or force upload)
  const triggerBatchUpload = async () => {
    console.log('[SESSION] Manual batch upload triggered');
    const result = await SessionBatchUploader.forceUploadPendingSessions();
    return result;
  };

  // Get current session statistics
  const getSessionStats = async () => {
    try {
      const [storageStats, uploadStats] = await Promise.all([
        SessionStorageManager.getSessionStats(),
        SessionBatchUploader.getUploadStats()
      ]);

      return {
        storage: storageStats,
        upload: uploadStats,
        isSessionActive: sessionStarted.current
      };
    } catch (error) {
      console.error('[SESSION] Error getting session stats:', error);
      return null;
    }
  };

  // Test the session system
  const testSessionSystem = async () => {
    try {
      console.log('[SESSION] Testing session system...');
      
      // Test connection
      const connectionTest = await SessionBatchUploader.testConnection();
      console.log('[SESSION] Connection test:', connectionTest);
      
      // Test session upload
      const uploadTest = await SessionBatchUploader.uploadTestSession(userId);
      console.log('[SESSION] Upload test:', uploadTest);
      
      // Get stats
      const stats = await getSessionStats();
      console.log('[SESSION] Current stats:', stats);
      
      return {
        connection: connectionTest,
        upload: uploadTest,
        stats: stats
      };
    } catch (error) {
      console.error('[SESSION] Test failed:', error);
      return { error: error.message };
    }
  };

  // Clear all session data (for debugging)
  const clearAllSessionData = async () => {
    await SessionStorageManager.clearAllSessionData();
    console.log('[SESSION] Cleared all session data');
  };

  return {
    triggerBatchUpload,
    getSessionStats,
    testSessionSystem,
    clearAllSessionData,
    isSessionActive: sessionStarted.current
  };
};