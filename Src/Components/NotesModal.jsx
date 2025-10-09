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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNotes} from '../contexts/NotesContext';
import {colors} from '../Helper/Contants';
import {WP, HP, FS} from '../utils/dimentions';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const NotesModal = () => {
  const {
    noteContent,
    isNotesVisible,
    updateNoteContent,
    saveNotes,
    hideNotes,
    clearNotes,
  } = useNotes();

  const [localContent, setLocalContent] = useState(noteContent);
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  useEffect(() => {
    setLocalContent(noteContent);
  }, [noteContent]);

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
      saveNotes(text);
    }, 2000);
  };

  const handleSave = () => {
    saveNotes(localContent);
    Alert.alert('Success', 'Notes saved successfully!');
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
          onPress: () => {
            clearNotes();
            setLocalContent('');
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
        // Allow dragging only with one finger
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
        
        // Keep within screen bounds
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

  // Pinch zoom responder
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
          
          // Calculate new size
          let newWidth = initialSize.current.width * scale;
          let newHeight = initialSize.current.height * scale;
          
          // Apply constraints
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
          
          setModalSize({
            width: newWidth,
            height: newHeight,
          });
          
          // Adjust position to keep modal within bounds
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
          <Text style={styles.headerTitle}>My Notes</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={handleClear}
            disabled={!localContent || localContent.length === 0}>
            <Icon name="delete-outline" size={WP(5)} color="#E74C3C" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Icon name="save" size={WP(5)} color={colors.White} />
            <Text style={styles.saveButtonText}>Save</Text>
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
  headerTitle: {
    fontSize: FS(2),
    fontFamily: 'Roboto-Bold',
    color: colors.White,
    marginTop: HP(0.5),
  },
  headerButtons: {
    flexDirection: 'row',
    gap: WP(2),
    marginTop: HP(0.5),
  },
  headerButton: {
    padding: WP(1),
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