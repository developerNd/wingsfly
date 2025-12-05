import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NativeModules,
  AppState,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import {useAuth} from './AuthContext';

const NotesContext = createContext({});

// ✅ REMOVED: NOTES_STORAGE_KEY (no longer storing note content in AsyncStorage)
const NOTES_VISIBILITY_KEY = '@wingsfly_notes_visibility';
const FLOATING_BUTTON_ENABLED_KEY = '@wingsfly_floating_button_enabled';

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export const NotesProvider = ({children}) => {
  // ✅ Get user from AuthContext
  const {user} = useAuth();

  // ✅ Note content is managed only in memory and synced with database
  // No AsyncStorage for content - database is the single source of truth
  const [noteContent, setNoteContent] = useState('');
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [floatingButtonEnabled, setFloatingButtonEnabled] = useState(true);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);

  // ✅ Save userId to native SharedPreferences whenever user changes
  useEffect(() => {
    if (Platform.OS === 'android' && user?.id) {
      saveUserIdToNativePrefs(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      await loadPreferences();
      await checkAndRequestPermission();

      console.log('[NOTES] ========================================');
      console.log('[NOTES] INITIALIZATION CHECK');
      console.log('[NOTES] Platform:', Platform.OS);
      console.log(
        '[NOTES] NativeModules available:',
        Object.keys(NativeModules),
      );
      console.log(
        '[NOTES] FloatingButtonModule exists:',
        !!NativeModules.FloatingButtonModule,
      );

      if (NativeModules.FloatingButtonModule) {
        console.log('[NOTES] ✅ FloatingButtonModule found!');
        console.log(
          '[NOTES] Module methods:',
          Object.keys(NativeModules.FloatingButtonModule),
        );
      } else {
        console.error('[NOTES] ❌ FloatingButtonModule NOT FOUND!');
        console.error(
          '[NOTES] Available modules:',
          Object.keys(NativeModules).filter(
            m => m.includes('Float') || m.includes('Button'),
          ),
        );
      }

      // ✅ Hide floating button when app opens
      if (Platform.OS === 'android') {
        console.log('[NOTES] App opened - ensuring floating button is hidden');
        await hideFloatingButton();
      }

      console.log('[NOTES] ========================================');
    };

    init();

    // Monitor app state
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async nextAppState => {
    if (Platform.OS === 'android') {
      console.log('[NOTES] ========================================');
      console.log('[NOTES] App state changed to:', nextAppState);

      if (nextAppState === 'background' && floatingButtonEnabled) {
        console.log('[NOTES] App backgrounded - showing floating button');

        // Re-check permission before showing
        const FloatingButtonModule = NativeModules.FloatingButtonModule;
        if (FloatingButtonModule) {
          try {
            const currentPermission =
              await FloatingButtonModule.checkPermission();
            console.log(
              '[NOTES] Current overlay permission:',
              currentPermission,
            );

            if (currentPermission !== hasOverlayPermission) {
              console.log('[NOTES] Permission state changed! Updating...');
              setHasOverlayPermission(currentPermission);
            }

            if (currentPermission) {
              console.log('[NOTES] ✅ Permission granted - showing button');
              await showFloatingButton();
            } else {
              console.log(
                '[NOTES] ❌ Permission not granted - cannot show button',
              );
            }
          } catch (error) {
            console.error('[NOTES] Error checking permission:', error);
          }
        }
      } else if (nextAppState === 'active') {
        console.log('[NOTES] App foregrounded - hiding floating button');
        await hideFloatingButton();
      }

      console.log('[NOTES] ========================================');
    }
  };

  const checkAndRequestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const FloatingButtonModule = NativeModules.FloatingButtonModule;

        if (!FloatingButtonModule) {
          console.error('[NOTES] ❌ FloatingButtonModule not available');
          return;
        }

        console.log('[NOTES] Checking overlay permission...');
        const hasPermission = await FloatingButtonModule.checkPermission();
        setHasOverlayPermission(hasPermission);
        console.log('[NOTES] Permission status:', hasPermission);
        /*
        if (!hasPermission) {
          console.log('[NOTES] Requesting overlay permission...');
          const granted = await FloatingButtonModule.requestPermission();
          setHasOverlayPermission(granted);
          console.log('[NOTES] Permission granted:', granted);
        }
        */
      } catch (error) {
        console.error('[NOTES] ❌ Error checking permission:', error);
      }
    }
  };

  /**
   * ✅ Save userId to native SharedPreferences so native code can access it
   * This allows the floating button service to fetch/save notes for the logged-in user
   */
  const saveUserIdToNativePrefs = async userId => {
    if (Platform.OS !== 'android' || !userId) return;

    try {
      const FloatingButtonModule = NativeModules.FloatingButtonModule;

      if (FloatingButtonModule && FloatingButtonModule.saveUserId) {
        await FloatingButtonModule.saveUserId(userId);
        console.log(
          '[NOTES] ✅ User ID saved to native SharedPreferences:',
          userId,
        );
      } else {
        console.warn(
          '[NOTES] ⚠️ FloatingButtonModule.saveUserId not available',
        );
      }
    } catch (error) {
      console.error('[NOTES] ❌ Error saving userId to native:', error);
    }
  };

  const showFloatingButton = async () => {
    if (Platform.OS !== 'android') {
      console.log('[NOTES] Not Android - skipping');
      return;
    }

    try {
      const FloatingButtonModule = NativeModules.FloatingButtonModule;

      console.log('[NOTES] Step 1: Module exists?', !!FloatingButtonModule);

      if (!FloatingButtonModule) {
        console.error('[NOTES] ❌ FloatingButtonModule is undefined!');
        return;
      }

      // ALWAYS re-check permission right before showing
      console.log('[NOTES] Step 2: Re-checking permission from native...');
      const currentPermission = await FloatingButtonModule.checkPermission();
      console.log('[NOTES] Current permission status:', currentPermission);

      // Update state if changed
      if (currentPermission !== hasOverlayPermission) {
        setHasOverlayPermission(currentPermission);
      }

      if (!currentPermission) {
        console.error('[NOTES] ❌ No overlay permission!');
        console.error(
          '[NOTES] User needs to grant "Display over other apps" permission',
        );
        return;
      }

      console.log(
        '[NOTES] Step 3: Permission OK - Calling showFloatingButton()...',
      );
      const result = await FloatingButtonModule.showFloatingButton();
      console.log('[NOTES] ✅ Native call successful:', result);
      console.log(
        '[NOTES] ✅✅✅ FLOATING BUTTON SHOULD BE VISIBLE NOW! ✅✅✅',
      );
    } catch (error) {
      console.error('[NOTES] ========================================');
      console.error('[NOTES] ❌ CRITICAL ERROR showing button');
      console.error('[NOTES] Error message:', error.message);
      console.error('[NOTES] ========================================');
    }
  };

  const hideFloatingButton = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const FloatingButtonModule = NativeModules.FloatingButtonModule;

      if (!FloatingButtonModule) {
        console.log('[NOTES] Module not available for hiding');
        return;
      }

      await FloatingButtonModule.hideFloatingButton();
      console.log('[NOTES] ✅ Floating button hidden successfully');
    } catch (error) {
      console.error('[NOTES] Error hiding button:', error);
    }
  };

  const toggleFloatingButton = async enabled => {
    try {
      setFloatingButtonEnabled(enabled);
      await AsyncStorage.setItem(
        FLOATING_BUTTON_ENABLED_KEY,
        JSON.stringify(enabled),
      );

      if (!enabled) {
        await hideFloatingButton();
      }
    } catch (error) {
      console.error('[NOTES] Error toggling:', error);
    }
  };

  // ✅ Load only preferences (visibility and floating button state)
  // Note content is loaded from database by NotesModal component
  const loadPreferences = async () => {
    try {
      const [storedVisibility, storedFloatingPref] = await Promise.all([
        AsyncStorage.getItem(NOTES_VISIBILITY_KEY),
        AsyncStorage.getItem(FLOATING_BUTTON_ENABLED_KEY),
      ]);

      if (storedVisibility !== null) {
        setIsNotesVisible(JSON.parse(storedVisibility));
      }

      if (storedFloatingPref !== null) {
        setFloatingButtonEnabled(JSON.parse(storedFloatingPref));
      }

      console.log('[NOTES] ✅ Preferences loaded from AsyncStorage');
    } catch (error) {
      console.error('[NOTES] Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ saveNotes now only updates the in-memory state
  // The actual database save is handled by NotesModal component
  const saveNotes = async content => {
    try {
      setNoteContent(content);
      console.log('[NOTES] Note content updated in memory');
    } catch (error) {
      console.error('[NOTES] Error updating note content:', error);
    }
  };

  const updateNoteContent = content => {
    setNoteContent(content);
  };

  const saveVisibilityState = async visible => {
    try {
      await AsyncStorage.setItem(NOTES_VISIBILITY_KEY, JSON.stringify(visible));
    } catch (error) {
      console.error('[NOTES] Error saving visibility state:', error);
    }
  };

  const toggleNotesVisibility = () => {
    setIsNotesVisible(prev => {
      const newState = !prev;
      saveVisibilityState(newState);
      return newState;
    });
  };

  const showNotes = () => {
    setIsNotesVisible(true);
    saveVisibilityState(true);
  };

  const hideNotes = () => {
    setIsNotesVisible(false);
    saveVisibilityState(false);
  };

  // ✅ clearNotes only clears in-memory state
  // Database clear is handled by NotesModal component
  const clearNotes = async () => {
    try {
      setNoteContent('');
      console.log('[NOTES] Note content cleared from memory');
    } catch (error) {
      console.error('[NOTES] Error clearing notes:', error);
    }
  };

  const value = {
    noteContent,
    isNotesVisible,
    loading,
    floatingButtonEnabled,
    hasOverlayPermission,
    updateNoteContent,
    saveNotes,
    toggleNotesVisibility,
    toggleFloatingButton,
    showNotes,
    hideNotes,
    clearNotes,
    checkAndRequestPermission,
  };

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
};
