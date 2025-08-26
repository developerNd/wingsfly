import React, {useRef, useState, useCallback} from 'react';
import {View, PanResponder, Animated, Dimensions} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const DraggableMindMapCanvas = ({
  children,
  canvasWidth,
  canvasHeight,
  onOutsidePress,
  style,
}) => {
  // Zoom and pan constraints
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3.0;
  const PAN_THRESHOLD = 5;

  // Animated values - these are the source of truth
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateXValue = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;

  // Current values for calculations (updated via listeners)
  const currentScale = useRef(1);
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);

  // Gesture state
  const gestureState = useRef({
    isScaling: false,
    isPanning: false,
    isLongPressing: false,
    initialDistance: 0,
    initialScale: 1,
    initialTranslateX: 0,
    initialTranslateY: 0,
    startX: 0,
    startY: 0,
  }).current;

  // Set up listeners to track current values
  React.useEffect(() => {
    const scaleListener = scaleValue.addListener(({value}) => {
      currentScale.current = value;
    });

    const translateXListener = translateXValue.addListener(({value}) => {
      currentTranslateX.current = value;
    });

    const translateYListener = translateYValue.addListener(({value}) => {
      currentTranslateY.current = value;
    });

    return () => {
      scaleValue.removeListener(scaleListener);
      translateXValue.removeListener(translateXListener);
      translateYValue.removeListener(translateYListener);
    };
  }, []);

  // Calculate distance between two touches
  const getDistance = useCallback(touches => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback(touches => {
    if (touches.length < 2) return {x: 0, y: 0};
    return {
      x: (touches[0].pageX + touches[1].pageX) / 2,
      y: (touches[0].pageY + touches[1].pageY) / 2,
    };
  }, []);

  // FIXED: Apply bounds to translation values with proper scaling consideration
  const applyTranslationBounds = useCallback(
    (translateX, translateY, scale) => {
      // Calculate the actual content dimensions after scaling
      const scaledCanvasWidth = canvasWidth * scale;
      const scaledCanvasHeight = canvasHeight * scale;

      // Calculate how much content extends beyond the screen
      const horizontalOverflow = Math.max(0, scaledCanvasWidth - screenWidth);
      const verticalOverflow = Math.max(0, scaledCanvasHeight - screenHeight);

      // When zoomed out (scale < 1), allow more freedom to pan
      // When zoomed in (scale > 1), restrict based on actual content overflow
      let maxTranslateX, minTranslateX, maxTranslateY, minTranslateY;

      if (scale <= 1) {
        // When zoomed out, allow generous panning to see all content
        const extraPadding = Math.max(screenWidth * 0.5, screenHeight * 0.5);
        maxTranslateX = extraPadding;
        minTranslateX = -(scaledCanvasWidth + extraPadding - screenWidth);
        maxTranslateY = extraPadding;
        minTranslateY = -(scaledCanvasHeight + extraPadding - screenHeight);
      } else {
        // When zoomed in, restrict based on content overflow with some padding
        const padding = 100; // Fixed padding in pixels
        maxTranslateX = padding;
        minTranslateX = -(horizontalOverflow + padding);
        maxTranslateY = padding;
        minTranslateY = -(verticalOverflow + padding);
      }

      return {
        x: Math.max(minTranslateX, Math.min(maxTranslateX, translateX)),
        y: Math.max(minTranslateY, Math.min(maxTranslateY, translateY)),
      };
    },
    [canvasWidth, canvasHeight],
  );

  // Smooth animation helper
  const animateToValues = useCallback(
    (newScale, newTranslateX, newTranslateY, duration = 200) => {
      const bounded = applyTranslationBounds(
        newTranslateX,
        newTranslateY,
        newScale,
      );

      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: newScale,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateXValue, {
          toValue: bounded.x,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateYValue, {
          toValue: bounded.y,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [applyTranslationBounds],
  );

  // Pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const {dx, dy} = gestureState;
        const touches = evt.nativeEvent.touches;

        // Don't handle if long pressing
        if (gestureState.isLongPressing) {
          return false;
        }

        // Handle multi-touch (pinch/zoom)
        if (touches.length > 1) {
          return true;
        }

        // Handle single touch panning
        return Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD;
      },

      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Capture multi-touch gestures
        return (
          evt.nativeEvent.touches.length > 1 && !gestureState.isLongPressing
        );
      },

      onPanResponderGrant: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // Store current values as starting point
        gestureState.initialScale = currentScale.current;
        gestureState.initialTranslateX = currentTranslateX.current;
        gestureState.initialTranslateY = currentTranslateY.current;

        if (touches.length === 2) {
          // Two-finger pinch/zoom
          gestureState.isScaling = true;
          gestureState.isPanning = false;
          gestureState.initialDistance = getDistance(touches);
        } else if (touches.length === 1 && !gestureState.isLongPressing) {
          // Single finger pan
          gestureState.isPanning = true;
          gestureState.isScaling = false;
          gestureState.startX = touches[0].pageX;
          gestureState.startY = touches[0].pageY;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.isLongPressing) {
          return;
        }

        const touches = evt.nativeEvent.touches;

        if (touches.length === 2 && gestureState.isScaling) {
          // Handle pinch-to-zoom
          const currentDistance = getDistance(touches);
          const scaleMultiplier =
            currentDistance / gestureState.initialDistance;
          const newScale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, gestureState.initialScale * scaleMultiplier),
          );

          // Calculate focal point for zoom
          const center = getCenter(touches);
          const screenCenterX = screenWidth / 2;
          const screenCenterY = screenHeight / 2;

          const focalX = center.x - screenCenterX;
          const focalY = center.y - screenCenterY;

          // Adjust translation to zoom towards focal point
          const scaleDiff = newScale - gestureState.initialScale;
          const newTranslateX =
            gestureState.initialTranslateX - (focalX * scaleDiff) / newScale;
          const newTranslateY =
            gestureState.initialTranslateY - (focalY * scaleDiff) / newScale;

          // Apply bounds and update values
          const bounded = applyTranslationBounds(
            newTranslateX,
            newTranslateY,
            newScale,
          );

          scaleValue.setValue(newScale);
          translateXValue.setValue(bounded.x);
          translateYValue.setValue(bounded.y);
        } else if (touches.length === 1 && gestureState.isPanning) {
          // Handle single-finger panning
          const deltaX = touches[0].pageX - gestureState.startX;
          const deltaY = touches[0].pageY - gestureState.startY;

          const newTranslateX = gestureState.initialTranslateX + deltaX;
          const newTranslateY = gestureState.initialTranslateY + deltaY;

          // Apply bounds
          const bounded = applyTranslationBounds(
            newTranslateX,
            newTranslateY,
            currentScale.current,
          );

          translateXValue.setValue(bounded.x);
          translateYValue.setValue(bounded.y);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        // Handle momentum for panning
        if (
          gestureState.isPanning &&
          (Math.abs(gestureState.vx) > 0.5 || Math.abs(gestureState.vy) > 0.5)
        ) {
          // Apply momentum
          const momentumX = gestureState.vx * 50;
          const momentumY = gestureState.vy * 50;

          const finalTranslateX = currentTranslateX.current + momentumX;
          const finalTranslateY = currentTranslateY.current + momentumY;

          animateToValues(
            currentScale.current,
            finalTranslateX,
            finalTranslateY,
            300,
          );
        }

        // Reset gesture state
        gestureState.isPanning = false;
        gestureState.isScaling = false;
      },

      onPanResponderTerminate: () => {
        // Reset gesture state
        gestureState.isPanning = false;
        gestureState.isScaling = false;
      },
    }),
  ).current;

  // Reset to initial position
  const resetPosition = useCallback(() => {
    animateToValues(1, 0, 0, 300);
  }, [animateToValues]);

  // Zoom to specific level
  const zoomTo = useCallback(
    (scale, x = 0, y = 0) => {
      const boundedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
      animateToValues(boundedScale, x, y, 300);
    },
    [animateToValues],
  );

  return (
    <View style={[{flex: 1, overflow: 'hidden'}, style]}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            flex: 1,
            width: '100%',
            height: '100%',
          },
          {
            transform: [
              {scaleX: scaleValue},
              {scaleY: scaleValue},
              {translateX: translateXValue},
              {translateY: translateYValue},
            ],
          },
        ]}>
        <View
          style={{
            width: canvasWidth,
            height: canvasHeight,
            position: 'relative',
          }}
          onTouchStart={() => {
            if (onOutsidePress) {
              onOutsidePress();
            }
          }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

export default DraggableMindMapCanvas;
