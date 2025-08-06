import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Image,
} from 'react-native';
import { Icons, colors } from '../Helper/Contants';
import { HP, WP, FS } from '../utils/dimentions';

const CustomToast = ({
  visible,
  message,
  type = 'error',
  duration = 3000,
  onHide,
  position = 'bottom',
  showIcon = true,
  iconSource,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    
    return (
      <View style={styles.iconContainer}>
        <Image source={Icons.Wingsfly} style={styles.iconImage} />
      </View>
    );
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return { top: HP(6) };
      case 'center':
        return {
          top: '50%',
          transform: [{ translateY: HP(-3) }]
        };
      case 'bottom':
      default:
        return { bottom: HP(12.5) };
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.toast}>
        {renderIcon()}
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: WP(5),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.5),
    borderRadius: WP(2),
    minHeight: HP(6),
    backgroundColor: colors.White,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.2),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(1),
    elevation: 5,
    alignSelf: 'center',
    maxWidth: WP(90),
  },
  iconContainer: {
    marginRight: WP(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: WP(5),
    height: WP(5),
    resizeMode: 'contain',
  },
  message: {
    color: colors.Black,
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default CustomToast;