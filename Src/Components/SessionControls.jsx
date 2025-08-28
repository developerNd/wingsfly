import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

import SkipButtonSvg from '../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';
import EndButtonSvg from '../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';
import PlayButtonSvg from '../assets/Images/Pomodoro-screen/dark-grey-bttn.svg';

const SessionControls = ({
  isRunning,
  isTransitioning,
  isPomodoroBlocking,
  isOnBreak,
  isCompleted,
  onStartPause,
  onStop,
  onSkip,
  currentTime = 0,
  targetTime = 0,
}) => {
  const getPlayButtonIcon = () => {
    if (isCompleted) {
      return 'check';
    }
    if (isTransitioning) {
      return 'hourglass-empty';
    }
    return isRunning ? 'pause' : 'play-arrow';
  };

  const getPlayButtonColor = () => {
    if (isTransitioning) {
      return '#CCCCCC';
    }
    if (isCompleted) {
      return '#4CAF50'; // Green for completed
    }
    return colors.White;
  };

  // Determine if skip should be disabled
  const shouldDisableSkip = () => {
    return isCompleted || isTransitioning || (currentTime === 0 && !isRunning);
  };

  // Determine if end should be disabled
  const shouldDisableEnd = () => {
    return isTransitioning;
  };

  const handlePlayPress = () => {
    onStartPause();
  };

  const handleSkipPress = () => {
    if (!shouldDisableSkip()) {
      onSkip();
    }
  };

  const handleEndPress = () => {
    if (!shouldDisableEnd()) {
      onStop();
    }
  };

  return (
    <View style={styles.controlsContainer}>
      {/* Skip Button */}
      <View style={styles.button}>
        <SkipButtonSvg
          width={WP(18)}
          height={HP(9)}
          style={[
            styles.buttonBackground,
            shouldDisableSkip() && styles.disabledButton,
          ]}
          preserveAspectRatio="none"
        />
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handleSkipPress}
          activeOpacity={shouldDisableSkip() ? 1 : 0.8}
          disabled={shouldDisableSkip()}>
          <Text
            style={[
              styles.buttonText,
              shouldDisableSkip() && styles.buttonTextDisabled,
            ]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Play/Pause Button in Center */}
      <View style={styles.playButton}>
        <PlayButtonSvg
          width={WP(25)}
          height={HP(12)}
          style={[
            styles.buttonBackground,
            isCompleted && styles.completedButton,
          ]}
          preserveAspectRatio="none"
        />
        <TouchableOpacity
          style={styles.playButtonTouchable}
          onPress={handlePlayPress}
          activeOpacity={isTransitioning ? 1 : 0.8}
          disabled={isTransitioning && !isCompleted}>
          <View style={styles.playButtonContent}>
            <Icon
              name={getPlayButtonIcon()}
              size={FS(7)}
              color={getPlayButtonColor()}
              style={styles.playIcon}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* End Button */}
      <View style={styles.button}>
        <EndButtonSvg
          width={WP(18)}
          height={HP(9)}
          style={[
            styles.buttonBackground,
            shouldDisableEnd() && styles.disabledButton,
          ]}
          preserveAspectRatio="none"
        />
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handleEndPress}
          activeOpacity={shouldDisableEnd() ? 1 : 0.8}
          disabled={shouldDisableEnd()}>
          <Text
            style={[
              styles.buttonText,
              shouldDisableEnd() && styles.buttonTextDisabled,
            ]}>
            End
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HP(3),
    paddingHorizontal: WP(10),
    position: 'relative',
  },
  button: {
    position: 'relative',
    width: WP(18),
    height: HP(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'relative',
    width: WP(25),
    height: HP(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completedButton: {
    opacity: 1,
  },
  buttonTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playButtonTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FS(2),
    fontFamily: 'Poppins-SemiBold',
    color: colors.White,
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: '#CCCCCC',
  },
  playIcon: {
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
});

export default SessionControls;
