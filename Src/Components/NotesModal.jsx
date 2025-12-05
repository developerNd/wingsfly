import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNotes} from '../contexts/NotesContext';
import {useAuth} from '../contexts/AuthContext';
import {notesService} from '../services/api/notesService';
import {colors} from '../Helper/Contants';
import {WP, HP, FS} from '../utils/dimentions';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const NotesModal = () => {
  const {user} = useAuth();
  const {
    noteContent,
    isNotesVisible,
    updateNoteContent,
    saveNotes: contextSaveNotes,
    hideNotes,
    clearNotes: contextClearNotes,
  } = useNotes();

  const [localContent, setLocalContent] = useState(noteContent);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [noteId, setNoteId] = useState(null);
  
  // Position and size state
  const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const [modalSize, setModalSize] = useState({
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.4,
  });

  // Pinch zoom state
  const initialDistance = useRef(0);
  const initialSize = useRef({width: 0, height: 0});
  const [isDragging, setIsDragging] = useState(false);

  // Auto-save timer
  const saveTimerRef = useRef(null);

  // Min and max sizes
  const MIN_WIDTH = SCREEN_WIDTH * 0.5;
  const MAX_WIDTH = SCREEN_WIDTH * 0.95;
  const MIN_HEIGHT = SCREEN_HEIGHT * 0.25;
  const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

  // Load notes from database when modal opens
  useEffect(() => {
    if (isNotesVisible && user?.id) {
      loadNotesFromDB();
    }
  }, [isNotesVisible, user?.id]);

  useEffect(() => {
    setLocalContent(noteContent);
  }, [noteContent]);

  // Load notes from database
  const loadNotesFromDB = async () => {
    if (!user?.id) {
      console.log('[NOTES] No user ID available');
      return;
    }

    try {
      setIsLoading(true);
      const notes = await notesService.getUserNotes(user.id);
      
      if (notes) {
        setNoteId(notes.id);
        setLocalContent(notes.content || '');
        updateNoteContent(notes.content || '');
      } else {
        // No notes found, start fresh
        setNoteId(null);
        setLocalContent('');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distance between two touches
  const getDistance = (touches) => {
    const [touch1, touch2] = touches;
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Auto-save after 2 seconds of inactivity
  const handleTextChange = (text) => {
    setLocalContent(text);
    updateNoteContent(text);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveNotesToDB(text);
    }, 2000);
  };

  // Save notes to database
  const saveNotesToDB = async (content) => {
    if (!user?.id) {
      console.log('[NOTES] No user ID available for saving');
      return;
    }

    try {
      setIsSaving(true);
      const savedNotes = await notesService.saveNotes(user.id, content, noteId);
      
      if (savedNotes) {
        setNoteId(savedNotes.id);
        contextSaveNotes(content);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to save notes.');
      return;
    }

    try {
      setIsSaving(true);
      const savedNotes = await notesService.saveNotes(user.id, localContent, noteId);
      
      if (savedNotes) {
        setNoteId(savedNotes.id);
        contextSaveNotes(localContent);
        Alert.alert('Success', 'Notes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Notes',
      'Are you sure you want to clear all notes? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (noteId) {
                await notesService.clearNotes(noteId);
              }
              contextClearNotes();
              setLocalContent('');
              Alert.alert('Success', 'Notes cleared successfully!');
            } catch (error) {
              console.error('Error clearing notes:', error);
              Alert.alert('Error', 'Failed to clear notes. Please try again.');
            }
          },
        },
      ],
    );
  };

  const toggleExpand = () => {
    if (isExpanded) {
      setModalSize({
        width: SCREEN_WIDTH * 0.85,
        height: SCREEN_HEIGHT * 0.4,
      });
    } else {
      setModalSize({
        width: SCREEN_WIDTH * 0.95,
        height: SCREEN_HEIGHT * 0.7,
      });
    }
    setIsExpanded(!isExpanded);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 1,
      onMoveShouldSetPanResponder: (evt) => {
        if (evt.nativeEvent.touches.length === 1 && isDragging) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 1) {
          setIsDragging(true);
          pan.setOffset({
            x: pan.x._value,
            y: pan.y._value,
          });
          pan.setValue({x: 0, y: 0});
        }
      },
      onPanResponderMove: (evt, gesture) => {
        if (evt.nativeEvent.touches.length === 1) {
          Animated.event([null, {dx: pan.x, dy: pan.y}], {
            useNativeDriver: false,
          })(evt, gesture);
        }
      },
      onPanResponderRelease: (e, gesture) => {
        setIsDragging(false);
        pan.flattenOffset();
        
        const maxX = SCREEN_WIDTH - modalSize.width;
        const maxY = SCREEN_HEIGHT - modalSize.height - 50;
        
        let finalX = pan.x._value;
        let finalY = pan.y._value;
        
        if (finalX < 0) finalX = 0;
        if (finalX > maxX) finalX = maxX;
        if (finalY < 0) finalY = 0;
        if (finalY > maxY) finalY = maxY;
        
        Animated.spring(pan, {
          toValue: {x: finalX, y: finalY},
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  const pinchResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          initialDistance.current = getDistance(evt.nativeEvent.touches);
          initialSize.current = {
            width: modalSize.width,
            height: modalSize.height,
          };
        }
      },
      onPanResponderMove: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const currentDistance = getDistance(evt.nativeEvent.touches);
          const scale = currentDistance / initialDistance.current;
          
          let newWidth = initialSize.current.width * scale;
          let newHeight = initialSize.current.height * scale;
          
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
          
          setModalSize({
            width: newWidth,
            height: newHeight,
          });
          
          const maxX = SCREEN_WIDTH - newWidth;
          const maxY = SCREEN_HEIGHT - newHeight - 50;
          
          let currentX = pan.x._value;
          let currentY = pan.y._value;
          
          if (currentX > maxX) {
            pan.setValue({x: maxX, y: currentY});
          }
          if (currentY > maxY) {
            pan.setValue({x: currentX, y: maxY});
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = 0;
      },
    }),
  ).current;

  if (!isNotesVisible) return null;

  return (
    <Animated.View
      style={[
        styles.modalContainer,
        {
          width: modalSize.width,
          height: modalSize.height,
          transform: [{translateX: pan.x}, {translateY: pan.y}],
        },
      ]}
      {...pinchResponder.panHandlers}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        <View style={styles.header} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>My Notes</Text>
            {isSaving && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.White} />
                <Text style={styles.savingText}>Saving...</Text>
              </View>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={toggleExpand} style={styles.headerButton}>
              <Icon
                name={isExpanded ? 'fullscreen-exit' : 'fullscreen'}
                size={WP(5)}
                color={colors.White}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={hideNotes} style={styles.headerButton}>
              <Icon name="close" size={WP(5.5)} color={colors.White} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.Primary} />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Write your notes here..."
              placeholderTextColor="#999"
              value={localContent}
              onChangeText={handleTextChange}
              textAlignVertical="top"
            />
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={handleClear}
            disabled={!localContent || localContent.length === 0 || isLoading}>
            <Icon name="delete-outline" size={WP(5)} color="#E74C3C" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isSaving || isLoading}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.White} />
            ) : (
              <Icon name="save" size={WP(5)} color={colors.White} />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Resize indicator */}
        <View style={styles.resizeIndicator}>
          <Icon name="zoom-out-map" size={WP(4)} color="#999" />
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    backgroundColor: colors.White,
    borderRadius: WP(3),
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(2),
    zIndex: 9999,
    top: HP(3),
    left: WP(3),
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.Primary,
    borderTopLeftRadius: WP(3),
    borderTopRightRadius: WP(3),
    paddingVertical: HP(1.2),
    paddingHorizontal: WP(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dragHandle: {
    width: WP(10),
    height: HP(0.5),
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: WP(1),
    position: 'absolute',
    top: HP(0.5),
    left: '50%',
    marginLeft: -WP(5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(2),
    marginTop: HP(0.5),
  },
  headerTitle: {
    fontSize: FS(2),
    fontFamily: 'Roboto-Bold',
    color: colors.White,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(1),
  },
  savingText: {
    fontSize: FS(1.4),
    fontFamily: 'Roboto-Regular',
    color: colors.White,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: WP(2),
    marginTop: HP(0.5),
  },
  headerButton: {
    padding: WP(1),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: HP(2),
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  contentContainer: {
    flex: 1,
    padding: WP(4),
  },
  textInput: {
    flex: 1,
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#333',
    minHeight: HP(25),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(1.5),
    paddingHorizontal: WP(3),
    paddingVertical: HP(1),
  },
  clearButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'Roboto-Medium',
    color: '#E74C3C',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WP(1.5),
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.2),
    borderRadius: WP(2),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'Roboto-Bold',
    color: colors.White,
  },
  resizeIndicator: {
    position: 'absolute',
    bottom: HP(1),
    right: WP(3),
    opacity: 0.3,
  },
});

export default NotesModal;