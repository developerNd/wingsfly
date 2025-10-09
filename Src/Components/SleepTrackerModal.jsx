import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';
import DatePicker from 'react-native-date-picker';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const SleepTrackerModal = ({visible, onClose, onSave, userName}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [slideAnim] = useState(new Animated.Value(50));

  const [wakeupTime, setWakeupTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Set default time to current time when modal opens
      setWakeupTime(new Date());

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Function to get time-based greeting in IST
  const getTimeBasedGreeting = () => {
    // Get current time in IST using toLocaleString
    const istTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    });

    const hours = parseInt(istTime, 10);

    if (hours >= 5 && hours < 12) {
      return 'Good Morning';
    } else if (hours >= 12 && hours < 17) {
      return 'Good Afternoon';
    } else if (hours >= 17 && hours < 21) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  };

  const formatTime = date => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      await onSave(wakeupTime);
      onClose();
    } catch (error) {
      console.error('[SLEEP MODAL] Error saving:', error);
      Alert.alert('Error', 'Failed to save wakeup time. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!visible) {
    return null;
  }

  const greeting = getTimeBasedGreeting();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={handleSkip}>
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light-content" />

      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{scale: scaleAnim}, {translateY: slideAnim}],
            },
          ]}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.closeButton}
            disabled={isSaving}>
            <View style={styles.closeButtonInner}>
              <Icon name="close" size={WP(4)} color="#666666" />
            </View>
          </TouchableOpacity>

          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Icon name="bedtime" size={WP(7)} color={colors.Primary} />
            </View>
            <Text style={styles.headerTitle}>
              {greeting}
              {userName ? `, ${userName}` : ''}!
            </Text>
            <Text style={styles.headerSubtitle}>Track your sleep pattern</Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Time Selection */}
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>What time did you wake up?</Text>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
                disabled={isSaving}>
                <View style={styles.timeButtonContent}>
                  <Icon
                    name="access-time"
                    size={WP(6)}
                    color={colors.Primary}
                  />
                  <Text style={styles.timeText}>{formatTime(wakeupTime)}</Text>
                  <Icon name="edit" size={WP(4.5)} color={colors.Shadow} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={handleSkip}
                disabled={isSaving}>
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  isSaving && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={isSaving}>
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              You can track your complete sleep cycle later
            </Text>
          </View>
        </Animated.View>

        {/* Time Picker Modal */}
        <DatePicker
          modal
          open={showTimePicker}
          date={wakeupTime}
          mode="time"
          onConfirm={date => {
            setShowTimePicker(false);
            setWakeupTime(date);
          }}
          onCancel={() => {
            setShowTimePicker(false);
          }}
          title="Select Wake-up Time"
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(5),
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    width: '100%',
    maxWidth: WP(88),
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: HP(2)},
    shadowOpacity: 0.3,
    shadowRadius: WP(4),
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: HP(1.5),
    right: WP(4),
    zIndex: 10,
  },
  closeButtonInner: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: WP(4),
    paddingTop: HP(3),
    paddingBottom: HP(2),
  },
  headerIconContainer: {
    width: WP(14),
    height: WP(14),
    borderRadius: WP(7),
    backgroundColor: `${colors.Primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: HP(1.5),
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(0.5),
  },
  headerSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  content: {
    paddingHorizontal: WP(5),
    paddingBottom: HP(3),
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.Primary}08`,
    borderRadius: WP(3),
    padding: WP(3.5),
    marginBottom: HP(2.5),
    borderWidth: 1,
    borderColor: `${colors.Primary}20`,
  },
  infoIcon: {
    marginRight: WP(2.5),
    marginTop: HP(0.2),
  },
  infoText: {
    flex: 1,
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: colors.Black,
    lineHeight: FS(1.8),
  },
  timeSection: {
    marginBottom: HP(2.5),
  },
  timeLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(1.2),
  },
  timeButton: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    borderWidth: 2,
    borderColor: `${colors.Primary}30`,
    paddingVertical: HP(2),
    paddingHorizontal: WP(4),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    flex: 1,
    fontSize: FS(2),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    marginLeft: WP(3),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: WP(3),
    marginBottom: HP(1.5),
  },
  button: {
    flex: 1,
    paddingVertical: HP(1.5),
    borderRadius: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
  },
  saveButton: {
    backgroundColor: colors.Primary,
    elevation: 2,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  disabledButton: {
    opacity: 0.6,
  },
  footerNote: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SleepTrackerModal;
