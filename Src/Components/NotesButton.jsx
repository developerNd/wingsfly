import React, {useRef, useEffect, useState} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNotes} from '../contexts/NotesContext';
import {colors} from '../Helper/Contants';
import {WP, HP} from '../utils/dimentions';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const BUTTON_SIZE = WP(12);
const STORAGE_KEY = '@notes_button_position';

const NotesButton = () => {
  const {toggleNotesVisibility, noteContent} = useNotes();
  const [isActive, setIsActive] = useState(false);
  
  // Position state with default value
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - BUTTON_SIZE - WP(4),
      y: HP(10),
    })
  ).current;

  // Load saved position on mount
  useEffect(() => {
    loadButtonPosition();
  }, []);

  const loadButtonPosition = async () => {
    try {
      const savedPosition = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPosition) {
        const {x, y} = JSON.parse(savedPosition);
        pan.setValue({x, y});
        console.log('[NOTES BUTTON] Loaded position:', {x, y});
      }
    } catch (error) {
      console.error('[NOTES BUTTON] Error loading position:', error);
    }
  };

  const saveButtonPosition = async (x, y) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({x, y}));
      console.log('[NOTES BUTTON] Saved position:', {x, y});
    } catch (error) {
      console.error('[NOTES BUTTON] Error saving position:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsActive(true);
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({x: 0, y: 0});
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        setIsActive(false);

        // Keep button within screen bounds
        const maxX = SCREEN_WIDTH - BUTTON_SIZE;
        const maxY = SCREEN_HEIGHT - BUTTON_SIZE - HP(10); // Account for bottom navigation
        
        let finalX = pan.x._value;
        let finalY = pan.y._value;
        
        // Ensure button stays within bounds
        if (finalX < 0) finalX = 0;
        if (finalX > maxX) finalX = maxX;
        if (finalY < 0) finalY = 0;
        if (finalY > maxY) finalY = maxY;
        
        // Animate to final position
        Animated.spring(pan, {
          toValue: {x: finalX, y: finalY},
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();

        // Save the final position
        saveButtonPosition(finalX, finalY);

        // If the gesture was very short (just a tap), toggle notes
        const distance = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);
        if (distance < 10) {
          toggleNotesVisibility();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        {
          transform: [{translateX: pan.x}, {translateY: pan.y}],
        },
      ]}
      {...panResponder.panHandlers}>
      <TouchableOpacity
        style={[
          styles.notesButton,
          noteContent && noteContent.length > 0 && styles.notesButtonActive,
          isActive && styles.notesButtonDragging,
        ]}
        activeOpacity={0.9}>
        <Icon name="edit" size={WP(5.5)} color={colors.White} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    width: WP(12),
    height: WP(12),
    zIndex: 999,
  },
  notesButton: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(6),
    elevation: 6,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.3),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(1.5),
  },
  notesButtonActive: {
    backgroundColor: '#0D1154',
    elevation: 8,
  },
  notesButtonDragging: {
    elevation: 12,
    shadowOpacity: 0.5,
    transform: [{scale: 1.1}],
  },
});

export default NotesButton;