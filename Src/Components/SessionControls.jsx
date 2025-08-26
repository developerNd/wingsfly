import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const SessionControls = ({
  isRunning,
  isTransitioning,
  isPomodoroBlocking,
  isOnBreak,
  onStartPause,
  onStop,
}) => {
  const getControlButtonStyle = () => {
    if (isTransitioning) {
      return styles.buttonDisabled;
    }
    
    if (!isTransitioning && isPomodoroBlocking && !isOnBreak) {
      return styles.controlButtonBlocked;
    }
    
    if (!isTransitioning && isRunning && !isPomodoroBlocking && !isOnBreak) {
      return styles.controlButtonPaused;
    }
    
    if (!isTransitioning && isOnBreak) {
      return styles.controlButtonBreak;
    }
    
    return styles.controlButton;
  };

  const getControlButtonText = () => {
    if (isTransitioning) {
      return 'Transitioning...';
    }
    
    if (isRunning) {
      if (isOnBreak) {
        return 'Pause Break';
      } else if (isPomodoroBlocking) {
        return 'Pause Session';
      } else {
        return 'Resume Blocking';
      }
    } else {
      if (isOnBreak) {
        return 'Start Break';
      } else {
        return 'Start Session';
      }
    }
  };

  return (
    <View style={styles.controlsContainer}>
      <TouchableOpacity
        style={[styles.stopButton, isTransitioning && styles.buttonDisabled]}
        onPress={onStop}
        activeOpacity={0.8}
        disabled={isTransitioning}>
        <Icon name="stop" size={WP(6)} color={isTransitioning ? '#CCCCCC' : colors.Black} />
        <Text style={[styles.buttonLabel, isTransitioning && styles.buttonLabelDisabled]}>
          Reset
        </Text>
      </TouchableOpacity>

      <View style={styles.mainControlContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            getControlButtonStyle()
          ]}
          onPress={onStartPause}
          activeOpacity={0.8}
          disabled={isTransitioning}>
          <Icon
            name={isRunning ? 'pause' : 'play-arrow'}
            size={WP(8)}
            color={isTransitioning ? '#CCCCCC' : colors.White}
          />
        </TouchableOpacity>
        
        <Text style={[styles.controlButtonText, isTransitioning && styles.buttonLabelDisabled]}>
          {getControlButtonText()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(25),
    paddingVertical: HP(3),
    paddingBottom: HP(10),
  },
  stopButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(1),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    fontSize: FS(1.4),
    fontFamily: 'Inter-Medium',
    color: colors.Black,
    marginTop: HP(0.5),
  },
  buttonLabelDisabled: {
    color: '#CCCCCC',
  },
  mainControlContainer: {
    alignItems: 'center',
  },
  controlButton: {
    width: WP(16),
    height: WP(16),
    backgroundColor: colors.Black,
    borderRadius: WP(8),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  controlButtonBlocked: {
    backgroundColor: '#FF6B35',
  },
  controlButtonPaused: {
    backgroundColor: '#FFA726',
  },
  controlButtonBreak: {
    backgroundColor: '#4CAF50',
  },
  controlButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'Inter-Medium',
    color: colors.Black,
    marginTop: HP(1),
    textAlign: 'center',
  },
});

export default SessionControls;