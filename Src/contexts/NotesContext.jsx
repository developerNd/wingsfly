import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotesContext = createContext({});

const NOTES_STORAGE_KEY = '@wingsfly_user_notes';

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export const NotesProvider = ({children}) => {
  const [noteContent, setNoteContent] = useState('');
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load notes from storage on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes !== null) {
        setNoteContent(storedNotes);
        console.log('[NOTES] Loaded from storage');
      }
    } catch (error) {
      console.error('[NOTES] Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async (content) => {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, content);
      setNoteContent(content);
      console.log('[NOTES] Saved to storage');
    } catch (error) {
      console.error('[NOTES] Error saving notes:', error);
    }
  };

  const updateNoteContent = (content) => {
    setNoteContent(content);
  };

  const toggleNotesVisibility = () => {
    setIsNotesVisible(prev => !prev);
  };

  const showNotes = () => {
    setIsNotesVisible(true);
  };

  const hideNotes = () => {
    setIsNotesVisible(false);
  };

  const clearNotes = async () => {
    try {
      await AsyncStorage.removeItem(NOTES_STORAGE_KEY);
      setNoteContent('');
      console.log('[NOTES] Cleared from storage');
    } catch (error) {
      console.error('[NOTES] Error clearing notes:', error);
    }
  };

  const value = {
    noteContent,
    isNotesVisible,
    loading,
    updateNoteContent,
    saveNotes,
    toggleNotesVisibility,
    showNotes,
    hideNotes,
    clearNotes,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};