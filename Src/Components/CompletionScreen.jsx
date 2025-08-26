import React, {useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const CompletionScreen = ({
  taskData,
  totalPomodoros,
  totalBreaks,
  sessionStructure,
  totalTaskDuration,
  onComplete,
}) => {
  const completionScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(completionScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <>
      <View style={styles.celebrationContainer}>
        <Animated.View
          style={[
            styles.completionIndicator,
            {transform: [{scale: completionScale}]},
          ]}>
          <View style={styles.completedFocusIcon}>
            <Icon name="emoji-events" size={WP(20)} color="#FF6B35" />
            <View style={styles.checkmarkOverlay}>
              <Icon name="check-circle" size={WP(8)} color="#00754B" />
            </View>
          </View>
        </Animated.View>

        <Text style={styles.congratsText}>
          Outstanding Work!{'\n'}
          {taskData
            ? `"${taskData.title}" completed!`
            : 'Timer task completed!'}
          {'\n'}
          You finished the Pomodoro cycle:{'\n'}
          {totalPomodoros} Focus Sessions + {totalBreaks} Breaks{'\n'}
          Total productive time:{' '}
          {sessionStructure
            ? sessionStructure.usedMinutes
            : Math.floor(totalTaskDuration / 60)}{' '}
          minutes
        </Text>

        <View style={styles.celebrationDots}>
          {[...Array(8)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.celebrationDot,
                {
                  backgroundColor: ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'][
                    index % 4
                  ],
                  transform: [
                    {
                      translateX:
                        Math.cos((index * 45 * Math.PI) / 180) * WP(25),
                    },
                    {
                      translateY:
                        Math.sin((index * 45 * Math.PI) / 180) * WP(25),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.celebrationActions}>
        <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
          <Icon name="share" size={WP(6)} color={colors.Black} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onComplete}
          activeOpacity={0.8}>
          <Text style={styles.continueButtonText}>Complete & Return</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  celebrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: HP(4),
  },
  completionIndicator: {
    marginBottom: HP(3),
    position: 'relative',
  },
  completedFocusIcon: {
    width: WP(30),
    height: WP(30),
    backgroundColor: '#FFF5F0',
    borderRadius: WP(15),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: -WP(2),
    right: -WP(1),
    backgroundColor: 'white',
    borderRadius: WP(4),
    elevation: 3,
  },
  congratsText: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    lineHeight: HP(3),
    marginTop: HP(5),
  },
  celebrationDots: {
    position: 'absolute',
    width: WP(50),
    height: WP(50),
  },
  celebrationDot: {
    position: 'absolute',
    width: WP(2),
    height: WP(2),
    borderRadius: WP(1),
    marginLeft: WP(25),
    marginTop: WP(6.5),
  },
  celebrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(25),
    paddingVertical: HP(3),
    paddingBottom: HP(10),
  },
  shareButton: {
    width: WP(16),
    height: WP(12),
    backgroundColor: '#F0F0F0',
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    width: WP(30),
    height: WP(12),
    backgroundColor: colors.Black,
    borderRadius: WP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'Inter-SemiBold',
    color: colors.White,
  },
});

export default CompletionScreen;
