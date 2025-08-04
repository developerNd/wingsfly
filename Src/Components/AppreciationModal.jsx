import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ShareIcon from 'react-native-vector-icons/Entypo';
import LottieView from 'lottie-react-native';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const {width, height} = Dimensions.get('window');

const AppreciationModal = ({
  isVisible,
  onClose,
  taskTitle = '',
  isNewBestStreak = false,
  nextAwardDays = 7,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      setTimeout(() => {
        if (lottieRef.current) {
          lottieRef.current.play();
        }
      }, 200);
    }
  }, [isVisible]);

  const handleShare = async () => {
    try {
      const message = `🎉 Just completed "${taskTitle}" and achieved a 1-day streak! ${
        isNewBestStreak ? '🏆 New personal best!' : ''
      } #HabitTracker #Success`;

      await Share.share({
        message,
        title: 'Achievement Unlocked!',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const getLottieSource = () => {
    return require('../assets/animations/Confetti.json');
  };

  const lottieSource = getLottieSource();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.8}
      useNativeDriver>
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}>
        <Text style={styles.congratsText}>Well done!</Text>

        <View style={styles.borderLine} />

        <View style={styles.medalContainer}>
          <Animated.View style={styles.medal}>
            <Icon name="star" size={WP(8)} color={colors.White} />
          </Animated.View>

          <LottieView
            ref={lottieRef}
            source={getLottieSource()}
            style={styles.lottieAnimation}
            autoPlay={false}
            loop={false}
            speed={1}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.taskName} numberOfLines={2}>
          {taskTitle}
        </Text>

        <Text style={styles.newBestText}>New best streak</Text>

        <Text style={styles.streakDays}>1 day</Text>

        <View style={styles.borderLine} />

        <Text style={styles.nextAwardText}>
          Next Award: {nextAwardDays} days
        </Text>

        <View style={styles.borderLine} />

        <Pressable style={styles.shareButton} onPress={handleShare}>
          <ShareIcon name="share" size={WP(4.5)} color={colors.Primary} />
          <Text style={styles.shareText}>SHARE</Text>
        </Pressable>

        <View style={styles.borderLine} />

        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    padding: WP(4),
    alignItems: 'center',
    width: WP(85),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: HP(1),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(3.5),
    elevation: 10,
  },
  congratsText: {
    fontSize: FS(2.2),
    fontFamily: 'Roboto-Bold',
    color: '#2E2E2E',
    marginBottom: HP(0.2),
    textAlign: 'center',
  },
  borderLine: {
    width: '110%',
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginVertical: HP(1.3),
  },
  medalContainer: {
    alignItems: 'center',
    marginBottom: HP(2),
    position: 'relative',
    width: WP(25),
    height: WP(25),
    justifyContent: 'center',
  },
  medal: {
    width: WP(20),
    height: WP(20),
    borderRadius: WP(10),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.Primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(2),
    elevation: 8,
    marginBottom: HP(1.5),
    marginTop: HP(3),
  },
  lottieAnimation: {
    position: 'absolute',
    width: WP(35),
    height: WP(25),
    top: WP(1),
    left: WP(-4),
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  taskName: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Medium',
    color: colors.Primary,
    textAlign: 'center',
    marginBottom: HP(2),
    lineHeight: FS(2.2),
    paddingHorizontal: WP(2),
  },
  newBestText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#888',
    marginBottom: HP(-0.1),
    textAlign: 'center',
  },
  streakDays: {
    fontSize: FS(2.2),
    fontFamily: 'Anton-Regular',
    letterSpacing: 1,
    marginBottom: HP(1),
    textAlign: 'center',
    color: colors.Primary,
  },
  streakMessage: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginBottom: HP(2),
    textAlign: 'center',
  },
  nextAwardText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#888',
    marginBottom: HP(0.5),
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(8),
    backgroundColor: 'transparent',
    width: '100%',
    justifyContent: 'center',
  },
  shareText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    marginLeft: WP(1.7),
  },
  closeButton: {
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(8),
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
  },
  closeText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666',
  },
});

export default AppreciationModal;
