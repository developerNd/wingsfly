import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import {colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const SortingModal = ({
  visible,
  onClose,
  title,
  options,
  selectedOption,
  onSelectOption,
}) => {
  const handleOptionSelect = option => {
    onSelectOption(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <StatusBar
        backgroundColor={colors.ModelBackground}
        barStyle="dark-content"
      />
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.headerBorder} />

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleOptionSelect(option)}>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>CLOSE</Text>
          </TouchableOpacity>
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
    paddingHorizontal: WP(8),
  },
  modalContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(5.5),
    paddingVertical: HP(3),
    width: WP(89),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#494747',
    textAlign: 'center',
    marginBottom: HP(1.7),
  },
  headerBorder: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginBottom: HP(0.5),
  },
  optionsContainer: {
    marginBottom: HP(1),
    marginTop: HP(-0.2),
  },
  optionButton: {
    paddingVertical: HP(1.35),
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },
  optionText: {
    fontSize: FS(1.65),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    textAlign: 'center',
    marginTop: HP(0.6),
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: HP(2),
  },
  closeButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    textAlign: 'center',
  },
});

export default SortingModal;
