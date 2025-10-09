import React, {createContext, useContext, useReducer, useEffect, useRef} from 'react';
import MusicService from '../services/MusicService';

const MusicContext = createContext();

const MUSIC_ACTIONS = {
  START_PLAN_MUSIC: 'START_PLAN_MUSIC',
  STOP_PLAN_MUSIC: 'STOP_PLAN_MUSIC',
  SET_PLAYING: 'SET_PLAYING',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET',
};

const initialState = {
  isPlanMusicActive: false,
  isPlaying: false,
  error: null,
  currentTrack: null,
};

const musicReducer = (state, action) => {
  console.log('🎵 Music Reducer - Action:', action.type, 'Current State:', state);
  
  switch (action.type) {
    case MUSIC_ACTIONS.START_PLAN_MUSIC:
      const startState = {
        ...state,
        isPlanMusicActive: true,
        isPlaying: true,
        currentTrack: 'plan_your_day',
        error: null,
      };
      console.log('🎵 Music Reducer - Start Music New State:', startState);
      return startState;
      
    case MUSIC_ACTIONS.STOP_PLAN_MUSIC:
      const stopState = {
        ...state,
        isPlanMusicActive: false,
        isPlaying: false,
        currentTrack: null,
        error: null,
      };
      console.log('🎵 Music Reducer - Stop Music New State:', stopState);
      return stopState;
      
    case MUSIC_ACTIONS.SET_PLAYING:
      const playingState = {
        ...state,
        isPlaying: action.payload,
      };
      console.log('🎵 Music Reducer - Set Playing New State:', playingState);
      return playingState;
      
    case MUSIC_ACTIONS.SET_ERROR:
      const errorState = {
        ...state,
        error: action.payload,
        isPlaying: false,
      };
      console.log('🎵 Music Reducer - Error State:', errorState);
      return errorState;
      
    case MUSIC_ACTIONS.RESET:
      console.log('🎵 Music Reducer - Reset to Initial State:', initialState);
      return initialState;
      
    default:
      console.log('🎵 Music Reducer - Unknown action, returning current state');
      return state;
  }
};

export const MusicProvider = ({children}) => {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  
  // CRITICAL FIX: Use ref to track if we're currently stopping music to prevent race conditions
  const isStoppingRef = useRef(false);
  const stopTimeoutRef = useRef(null);

  // Start Plan Your Day music
  const startPlanMusic = async () => {
    try {
      console.log('🎵 MusicContext: Starting Plan Your Day background music...');
      console.log('🎵 MusicContext: Current state before start:', state);
      
      // Cancel any pending stop operations
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      isStoppingRef.current = false;
      
      const success = await MusicService.startPlanYourDayMusic();
      
      if (success) {
        console.log('🎵 MusicContext: Music service started successfully, dispatching START_PLAN_MUSIC');
        dispatch({type: MUSIC_ACTIONS.START_PLAN_MUSIC});
      } else {
        console.log('🎵 MusicContext: Music service start failed, but continuing...');
      }
      
      return success;
    } catch (error) {
      console.error('🎵 MusicContext: Error starting Plan Your Day music:', error);
      dispatch({type: MUSIC_ACTIONS.SET_ERROR, payload: error.message});
      return false;
    }
  };

  // Stop Plan Your Day music - SYNCHRONOUS state update
  const stopPlanMusic = async () => {
    // Prevent multiple simultaneous stop calls
    if (isStoppingRef.current) {
      console.log('🎵 MusicContext: Stop already in progress, skipping duplicate call');
      return true;
    }
    
    try {
      isStoppingRef.current = true;
      console.log('🎵 MusicContext: Stopping Plan Your Day background music...');
      console.log('🎵 MusicContext: Current state before stop:', state);
      
      // CRITICAL: Update state IMMEDIATELY before async operations
      dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
      console.log('🎵 MusicContext: State updated to STOPPED immediately');
      
      // Then stop the actual music service (async)
      const success = await MusicService.stopPlanYourDayMusic();
      console.log('🎵 MusicContext: Music service stop result:', success);
      
      // Ensure state is stopped (double check)
      dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
      
      return success;
    } catch (error) {
      console.error('🎵 MusicContext: Error stopping Plan Your Day music:', error);
      // Still ensure state is stopped
      dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
      return false;
    } finally {
      isStoppingRef.current = false;
    }
  };

  // Force stop music - IMMEDIATE state update with aggressive service stop
  const forceStopPlanMusic = async () => {
    // Cancel any pending operations
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    try {
      console.log('🎵 MusicContext: FORCE STOPPING Plan Your Day music...');
      console.log('🎵 MusicContext: Current state before force stop:', state);
      
      // CRITICAL: Update state FIRST - don't wait for async
      dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
      isStoppingRef.current = false; // Reset the flag
      console.log('🎵 MusicContext: State updated immediately for force stop');
      
      // Then aggressively stop the music service
      const success = await MusicService.forceStopPlanYourDayMusic();
      console.log('🎵 MusicContext: Force stop music service result:', success);
      
      // Triple verification with timeout
      stopTimeoutRef.current = setTimeout(() => {
        console.log('🎵 MusicContext: Force stop verification timeout - ensuring state is stopped');
        dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
        isStoppingRef.current = false;
      }, 200);
      
      return success;
    } catch (error) {
      console.error('🎵 MusicContext: Error in force stop:', error);
      // Absolutely ensure state is stopped
      dispatch({type: MUSIC_ACTIONS.STOP_PLAN_MUSIC});
      isStoppingRef.current = false;
      return false;
    }
  };

  // Check if music should continue (for navigation between Plan Your Day screens)
  const shouldContinueMusic = (fromScreen, toScreen) => {
    const planYourDayScreens = [
      'PlanYourDayScreen',
      'CategorySelection',
      'EvaluateProgress',
      'PlanScreen',
      'PlanTimerTrackerScreen',
      'PlanChecklistScreen',
      'PomodoroSettings',
    ];
    
    const shouldContinue = planYourDayScreens.includes(fromScreen) && planYourDayScreens.includes(toScreen);
    console.log('🎵 MusicContext: Should continue music?', shouldContinue, 'From:', fromScreen, 'To:', toScreen);
    
    return shouldContinue;
  };

  // FIXED: Cleanup effect - runs ONCE on unmount only
  useEffect(() => {
    console.log('🎵 MusicContext: Provider mounted');
    
    // Cleanup function - only runs when provider unmounts (app closes)
    return () => {
      console.log('🎵 MusicContext: Provider unmounting - final cleanup');
      
      // Clear any pending timeouts
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      
      // Force stop music immediately (sync)
      MusicService.forceStopPlanYourDayMusic()
        .then(() => console.log('🎵 MusicContext: Final cleanup completed'))
        .catch(err => console.error('🎵 MusicContext: Final cleanup error:', err));
    };
  }, []); // Empty dependency array - runs once on mount/unmount only

  // Log state changes (for debugging)
  useEffect(() => {
    console.log('🎵 MusicContext: State changed:', {
      isPlanMusicActive: state.isPlanMusicActive,
      isPlaying: state.isPlaying,
      currentTrack: state.currentTrack,
      error: state.error,
    });
  }, [state]);

  const value = {
    // State
    ...state,
    
    // Actions
    startPlanMusic,
    stopPlanMusic,
    forceStopPlanMusic,
    shouldContinueMusic,
    
    // Helper methods
    isPlanFlowActive: state.isPlanMusicActive,
    canStartMusic: !state.isPlanMusicActive && !state.isPlaying,
    canStopMusic: state.isPlanMusicActive || state.isPlaying,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export default MusicContext;