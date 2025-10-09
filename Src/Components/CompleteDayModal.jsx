import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  StatusBar,
  TextInput,
} from 'react-native';
import {Icons, colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const CompleteDayModal = ({
  visible,
  dayNumber,
  challengeName,
  dateString,
  isCompleted = false,
  hoursCompleted = 0,
  targetHoursPerDay = null,
  onCancel,
  onComplete,
  onUndo,
}) => {
  const [hours, setHours] = useState('');
  const [showHoursError, setShowHoursError] = useState(false);

  // Reset hours when modal opens
  useEffect(() => {
    if (visible) {
      if (isCompleted && hoursCompleted > 0) {
        setHours(hoursCompleted.toString());
      } else if (targetHoursPerDay) {
        setHours(targetHoursPerDay.toString());
      } else {
        setHours('');
      }
      setShowHoursError(false);
    }
  }, [visible, isCompleted, hoursCompleted, targetHoursPerDay]);

  const handleHoursInput = (text) => {
    // Allow decimals for hours (e.g., 2.5 hours)
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to one decimal place
    if (parts[1] && parts[1].length > 1) {
      setHours(parts[0] + '.' + parts[1].substring(0, 1));
      return;
    }
    
    setHours(cleanedText);
    setShowHoursError(false);
  };

  const validateHours = () => {
    if (!hours || hours.trim() === '') {
      setShowHoursError(true);
      return false;
    }

    const hoursValue = parseFloat(hours);
    if (isNaN(hoursValue) || hoursValue <= 0 || hoursValue > 24) {
      setShowHoursError(true);
      return false;
    }

    return true;
  };

  const handleAction = () => {
    if (isCompleted) {
      onUndo();
    } else {
      // Validate hours before completing
      if (validateHours()) {
        const hoursValue = parseFloat(hours);
        onComplete(hoursValue);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <StatusBar
          backgroundColor={colors.ModelBackground}
          barStyle="dark-content"
        />
        <View style={styles.modalContainer}>
          {/* Title with Logo */}
          <View style={styles.titleRow}>
            <Image source={Icons.Wingsfly} style={styles.logoImage} />
            <Text style={styles.modalTitle}>
              Day {dayNumber} - {dateString}
            </Text>
          </View>

          {/* Challenge Name */}
          <View style={styles.challengeContainer}>
            <Text style={styles.challengeText}>"{challengeName}"</Text>
          </View>

          {/* Hours Input Section - Only show when not completed */}
          {!isCompleted && (
            <View style={styles.hoursInputContainer}>
              <Text style={styles.hoursLabel}>Hours Completed Today</Text>
              <View style={styles.hoursInputWrapper}>
                <TextInput
                  style={[
                    styles.hoursInput,
                    showHoursError && styles.hoursInputError
                  ]}
                  placeholder={targetHoursPerDay ? targetHoursPerDay.toString() : "2.5"}
                  value={hours}
                  onChangeText={handleHoursInput}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  placeholderTextColor="#AAAAAA"
                />
                <Text style={styles.hoursUnit}>hours</Text>
              </View>
              {showHoursError && (
                <Text style={styles.errorText}>
                  Please enter valid hours (0.1 - 24)
                </Text>
              )}
              {targetHoursPerDay && !showHoursError && (
                <Text style={styles.targetText}>
                  Target: {targetHoursPerDay} hours/day
                </Text>
              )}
            </View>
          )}

          {/* Hours Display - Show when completed */}
          {isCompleted && hoursCompleted > 0 && (
            <View style={styles.completedHoursContainer}>
              <Text style={styles.completedHoursLabel}>Hours Completed:</Text>
              <Text style={styles.completedHoursValue}>
                {hoursCompleted} {hoursCompleted === 1 ? 'hour' : 'hours'}
              </Text>
            </View>
          )}

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.modalMessage}>
              {isCompleted
                ? 'Would you like to undo this completion?'
                : 'Mark this day as complete?'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>
                {isCompleted ? 'Keep Complete' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                isCompleted ? styles.undoButton : styles.completeButton,
              ]}
              onPress={handleAction}
              activeOpacity={0.7}>
              <Text
                style={
                  isCompleted
                    ? styles.undoButtonText
                    : styles.completeButtonText
                }>
                {isCompleted ? 'Undo' : 'Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: WP(4),
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(5),
    paddingVertical: HP(4),
    paddingHorizontal: WP(2),
    width: '100%',
    maxWidth: WP(88),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: HP(1),
    },
    shadowOpacity: 0.3,
    shadowRadius: WP(4),
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(2),
    justifyContent: 'flex-start',
    width: '100%',
  },
  logoImage: {
    width: WP(7),
    height: WP(7),
    resizeMode: 'contain',
    marginRight: WP(2.5),
    marginLeft: WP(5),
  },
  modalTitle: {
    fontSize: FS(2.2),
    fontFamily: 'Roboto-Bold',
    color: colors.Primary,
    textAlign: 'left',
    flex: 1,
  },
  challengeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: HP(2),
    paddingHorizontal: WP(5),
  },
  challengeText: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
    textAlign: 'center',
    lineHeight: FS(2.4),
  },
  
  // Hours Input Section - Matching ChallengeScreen Design
  hoursInputContainer: {
    width: '100%',
    paddingHorizontal: WP(12),
    marginBottom: HP(1.5),
  },
  hoursLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#555555',
    marginBottom: HP(0.8),
    textAlign: 'center',
  },
  hoursInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: HP(0.8),
    paddingHorizontal: WP(3),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
  },
  hoursInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    minWidth: WP(12),
    maxWidth: WP(16),
    textAlign: 'center',
    paddingVertical: HP(0.3),
    paddingHorizontal: WP(1),
  },
  hoursInputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  hoursUnit: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
    marginLeft: WP(1.5),
  },
  errorText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#FF6B6B',
    marginTop: HP(0.6),
    textAlign: 'center',
  },
  targetText: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Regular',
    color: '#888888',
    marginTop: HP(0.6),
    textAlign: 'center',
  },

  // Completed Hours Display - Compact Design
  completedHoursContainer: {
    width: '100%',
    paddingHorizontal: WP(8),
    marginBottom: HP(1.5),
    alignItems: 'center',
    backgroundColor: colors.Primary + '08',
    paddingVertical: HP(1.2),
    borderRadius: WP(3),
    borderWidth: 1,
    borderColor: colors.Primary + '20',
  },
  completedHoursLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
    marginBottom: HP(0.3),
  },
  completedHoursValue: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },

  messageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: HP(2.5),
    paddingHorizontal: WP(8),
  },
  modalMessage: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#555555',
    lineHeight: FS(2.2),
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: WP(12),
    paddingHorizontal: WP(6),
  },
  button: {
    flex: 1,
    paddingVertical: HP(1),
    borderRadius: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
    height: HP(5.2),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: HP(0.2),
    },
    shadowOpacity: 0.15,
    shadowRadius: WP(1),
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#E2E2E2',
  },
  completeButton: {
    backgroundColor: colors.Primary,
  },
  undoButton: {
    backgroundColor: '#FF9800',
  },
  cancelButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  completeButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  undoButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
});

export default CompleteDayModal;