import React, { createContext, useContext, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SessionContext = createContext({});

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const hasShownWelcomeThisSession = useRef(false);
  const hasShownMonthReminderToday = useRef(false);
  const sessionStartTime = useRef(Date.now());
  const appState = useRef(AppState.currentState);

  console.log('[SESSION PROVIDER] Initializing SessionProvider', {
    hasShownWelcome: hasShownWelcomeThisSession.current,
    hasShownMonthReminder: hasShownMonthReminderToday.current,
    sessionStartTime: sessionStartTime.current,
    currentAppState: appState.current
  });

  // Check if month reminder was shown today
  useEffect(() => {
    checkMonthReminderStatus();
  }, []);

  const checkMonthReminderStatus = async () => {
    try {
      const lastShownDate = await AsyncStorage.getItem('monthReminderLastShown');
      const today = new Date().toDateString();
      
      console.log('[SESSION PROVIDER] Month reminder check:', {
        lastShownDate,
        today,
        shouldShow: lastShownDate !== today
      });

      if (lastShownDate === today) {
        hasShownMonthReminderToday.current = true;
      } else {
        hasShownMonthReminderToday.current = false;
      }
    } catch (error) {
      console.error('[SESSION PROVIDER] Error checking month reminder status:', error);
      hasShownMonthReminderToday.current = false;
    }
  };

  useEffect(() => {
    console.log('[SESSION PROVIDER] Setting up AppState listener');
    
    const handleAppStateChange = (nextAppState) => {
      console.log('[SESSION PROVIDER] App State Change:', { 
        from: appState.current, 
        to: nextAppState,
        hasShownWelcome: hasShownWelcomeThisSession.current,
        hasShownMonthReminder: hasShownMonthReminderToday.current,
        timestamp: new Date().toISOString()
      });

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came back from background
        const timeSinceLastActive = Date.now() - sessionStartTime.current;
        console.log('[SESSION PROVIDER] App returned from background - Time since last active:', Math.round(timeSinceLastActive / 1000), 'seconds');
        
        // If more than 5 minutes have passed, treat as new session
        if (timeSinceLastActive > 5 * 60 * 1000) {
          console.log('[SESSION PROVIDER] New session detected - resetting welcome popup flag');
          hasShownWelcomeThisSession.current = false;
          sessionStartTime.current = Date.now();
        } else {
          console.log('[SESSION PROVIDER] Same session - not resetting welcome flag');
        }

        // Check month reminder status when app becomes active
        checkMonthReminderStatus();
      }
      
      if (nextAppState.match(/inactive|background/)) {
        console.log('[SESSION PROVIDER] App going to background - updating session time');
        sessionStartTime.current = Date.now();
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log('[SESSION PROVIDER] AppState listener registered');
    
    return () => {
      console.log('[SESSION PROVIDER] Cleaning up AppState listener');
      subscription?.remove();
    };
  }, []);

  const shouldShowWelcome = () => {
    const shouldShow = !hasShownWelcomeThisSession.current;
    console.log('[SESSION PROVIDER] shouldShowWelcome called:', {
      shouldShow: shouldShow,
      hasShownWelcome: hasShownWelcomeThisSession.current,
      sessionStart: sessionStartTime.current,
      currentTime: Date.now(),
      sessionDuration: Date.now() - sessionStartTime.current
    });
    return shouldShow;
  };

  const shouldShowMonthReminder = () => {
    const shouldShow = !hasShownMonthReminderToday.current;
    console.log('[SESSION PROVIDER] shouldShowMonthReminder called:', {
      shouldShow: shouldShow,
      hasShownToday: hasShownMonthReminderToday.current,
      currentDate: new Date().toDateString()
    });
    return shouldShow;
  };

  const markWelcomeShown = () => {
    console.log('[SESSION PROVIDER] markWelcomeShown called - BEFORE:', {
      hasShownWelcome: hasShownWelcomeThisSession.current,
      timestamp: new Date().toISOString()
    });
    hasShownWelcomeThisSession.current = true;
    console.log('[SESSION PROVIDER] markWelcomeShown called - AFTER:', {
      hasShownWelcome: hasShownWelcomeThisSession.current,
      timestamp: new Date().toISOString()
    });
  };

  const markMonthReminderShown = async () => {
    console.log('[SESSION PROVIDER] markMonthReminderShown called - BEFORE:', {
      hasShownToday: hasShownMonthReminderToday.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('monthReminderLastShown', today);
      hasShownMonthReminderToday.current = true;
      
      console.log('[SESSION PROVIDER] markMonthReminderShown called - AFTER:', {
        hasShownToday: hasShownMonthReminderToday.current,
        savedDate: today,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[SESSION PROVIDER] Error saving month reminder status:', error);
    }
  };

  const resetWelcomeFlag = () => {
    console.log('[SESSION PROVIDER] resetWelcomeFlag called (for testing) - BEFORE:', {
      hasShownWelcome: hasShownWelcomeThisSession.current
    });
    hasShownWelcomeThisSession.current = false;
    console.log('[SESSION PROVIDER] resetWelcomeFlag called (for testing) - AFTER:', {
      hasShownWelcome: hasShownWelcomeThisSession.current
    });
  };

  const resetMonthReminderFlag = async () => {
    console.log('[SESSION PROVIDER] resetMonthReminderFlag called (for testing)');
    try {
      await AsyncStorage.removeItem('monthReminderLastShown');
      hasShownMonthReminderToday.current = false;
      console.log('[SESSION PROVIDER] Month reminder flag reset successfully');
    } catch (error) {
      console.error('[SESSION PROVIDER] Error resetting month reminder flag:', error);
    }
  };

  const getSessionInfo = () => {
    const info = {
      hasShownWelcome: hasShownWelcomeThisSession.current,
      hasShownMonthReminder: hasShownMonthReminderToday.current,
      sessionStartTime: sessionStartTime.current,
      currentAppState: appState.current,
      sessionDuration: Date.now() - sessionStartTime.current,
      sessionDurationMinutes: Math.round((Date.now() - sessionStartTime.current) / (1000 * 60)),
      timestamp: new Date().toISOString()
    };
    console.log('[SESSION PROVIDER] getSessionInfo called:', info);
    return info;
  };

  const value = {
    shouldShowWelcome,
    shouldShowMonthReminder,
    markWelcomeShown,
    markMonthReminderShown,
    resetWelcomeFlag,
    resetMonthReminderFlag,
    getSessionInfo,
    // Debug function to force reset for testing
    debugResetSession: async () => {
      console.log('[SESSION PROVIDER] DEBUG: Force resetting session');
      hasShownWelcomeThisSession.current = false;
      hasShownMonthReminderToday.current = false;
      sessionStartTime.current = Date.now();
      await AsyncStorage.removeItem('monthReminderLastShown');
    }
  };

  // Add global access for debugging
  useEffect(() => {
    global.sessionDebug = {
      shouldShowWelcome,
      shouldShowMonthReminder,
      markWelcomeShown,
      markMonthReminderShown,
      resetWelcomeFlag,
      resetMonthReminderFlag,
      getSessionInfo,
      debugResetSession: async () => {
        hasShownWelcomeThisSession.current = false;
        hasShownMonthReminderToday.current = false;
        sessionStartTime.current = Date.now();
        await AsyncStorage.removeItem('monthReminderLastShown');
        console.log('[SESSION DEBUG] Session reset globally');
      }
    };
    
    console.log('[SESSION PROVIDER] Global debug functions available at global.sessionDebug');
  }, []);

  console.log('[SESSION PROVIDER] Rendering children with value:', {
    hasShownWelcome: hasShownWelcomeThisSession.current,
    hasShownMonthReminder: hasShownMonthReminderToday.current,
    timestamp: new Date().toISOString()
  });

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};