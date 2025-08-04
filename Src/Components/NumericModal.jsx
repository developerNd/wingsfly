import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import Modal from 'react-native-modal';
import {colors, Icons} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const NumericInputModal = ({isVisible, onClose, onSave, taskTitle}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const targetValue = 2;

  const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const incrementValue = () => {
    setCurrentValue(prev => prev + 1);
  };

  const decrementValue = () => {
    setCurrentValue(prev => Math.max(0, prev - 1));
  };

  const handleCancel = () => {
    setCurrentValue(0);
    onClose();
  };

  const handleOK = () => {
    onSave(currentValue);
    setCurrentValue(0);
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      onBackButtonPress={handleCancel}
      style={styles.modal}
      useNativeDriver>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Numeric</Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.headerDate}>{getCurrentDate()}</Text>
            </View>
          </View>
          <View style={styles.habitIcon}>
            <Image
              source={Icons.Habit || Icons.Taskhome}
              style={styles.iconImage}
            />
          </View>
        </View>

        {/* Counter Section */}
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={decrementValue}>
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.counterDivider} />

          <View style={styles.counterValueContainer}>
            <Text style={styles.counterValue}>{currentValue}</Text>
          </View>

          <View style={styles.counterDivider} />

          <TouchableOpacity
            style={styles.counterButton}
            onPress={incrementValue}>
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Today</Text>
            <Text style={styles.progressValue}>
              {currentValue} / {targetValue}
            </Text>
          </View>
        </View>

        {/* Action Buttons with borders */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity style={styles.okButton} onPress={handleOK}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    width: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: HP(1.5),
    paddingHorizontal: WP(4),
    marginBottom: HP(1),
    borderBottomWidth: 0.7,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  titleContainer: {
    marginBottom: HP(0.5),
  },
  headerTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Bold',
    color: '#333333',
  },
  dateContainer: {
    backgroundColor: '#E4E6FF',
    borderRadius: WP(1.5),
    paddingHorizontal: WP(1.2),
    marginLeft: WP(-0.3),
  },
  headerDate: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  habitIcon: {
    backgroundColor: colors.Primary,
    borderRadius: WP(2),
    padding: WP(2),
  },
  iconImage: {
    width: WP(6),
    height: WP(6),
    tintColor: colors.White,
    resizeMode: 'contain',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(1),
    backgroundColor: '#F6F6F6',
    borderRadius: WP(3),
    marginHorizontal: WP(5),
    marginTop: HP(1.5),
    paddingHorizontal: WP(1.5),
  },
  counterButton: {
    width: WP(12),
    height: WP(12),
    borderRadius: WP(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterDivider: {
    width: 0.7,
    backgroundColor: '#E0E0E0',
    height: '100%',
  },
  counterButtonText: {
    fontSize: FS(3.5),
    fontFamily: 'Opensans-SemiBold',
    color: '#666666',
  },
  counterValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(1),
  },
  counterValue: {
    fontSize: FS(3.3),
    fontFamily: 'Roboto-Bold',
    color: '#333333',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: WP(5),
    marginBottom: HP(2.5),
  },
  progressSection: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: WP(2),
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(4),
  },
  progressLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: '#999999',
    marginBottom: HP(0.3),
  },
  progressValue: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  actionButtonsContainer: {
    borderTopWidth: 0.7,
    borderTopColor: '#E0E0E0',
  },
  actionButtons: {
    flexDirection: 'row',
    minHeight: HP(6),
  },
  cancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  cancelButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 0.7,
    backgroundColor: '#E0E0E0',
  },
  okButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: HP(1.6),
  },
  okButtonText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    letterSpacing: 0.5,
  },
});

export default NumericInputModal;
