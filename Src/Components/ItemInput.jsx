import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CustomToast from './CustomToast';

const ItemInput = ({
  visible, 
  onClose, 
  onSave, 
  initialNote = '', 
  taskType = null, // Add taskType prop to determine if evaluation type should show
  initialEvaluationType = 'YesNo' // Add initial evaluation type prop
}) => {
  const [note, setNote] = useState(initialNote);
  const [evaluationType, setEvaluationType] = useState(initialEvaluationType);
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const evaluationTypes = ['YesNo', 'Timer Tracker'];

  // Check if evaluation type should be shown (only for Task and Plan Your Day)
  const shouldShowEvaluationType = taskType === 'Task' || taskType === 'Plan Your Day';

  useEffect(() => {
    if (visible) {
      setNote(initialNote);
      setEvaluationType(initialEvaluationType);
      setShowEvaluationDropdown(false);
    }
  }, [visible, initialNote, initialEvaluationType]);

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleCancel = () => {
    setNote(initialNote);
    setEvaluationType(initialEvaluationType);
    setShowEvaluationDropdown(false);
    hideToast();
    onClose();
  };

  const handleOK = () => {
    if (!note.trim()) {
      showToast('Enter a name');
      return;
    }

    // Pass both note and evaluationType to onSave if evaluation type is shown
    if (shouldShowEvaluationType) {
      onSave(note.trim(), evaluationType);
    } else {
      onSave(note.trim());
    }
    
    hideToast();
    onClose();
  };

  const handleNoteChange = text => {
    setNote(text);

    if (toastVisible) {
      hideToast();
    }
  };

  const handleEvaluationTypeSelect = (type) => {
    setEvaluationType(type);
    setShowEvaluationDropdown(false);
  };

  const handleOverlayPress = () => {
    if (showEvaluationDropdown) {
      setShowEvaluationDropdown(false);
    } else {
      handleCancel();
    }
  };

  const handleModalContentPress = () => {
    if (showEvaluationDropdown) {
      setShowEvaluationDropdown(false);
    }
  };

  const renderEvaluationTypeSection = () => {
    if (!shouldShowEvaluationType) return null;

    return (
      <View style={styles.evaluationContainer}>
        <Text style={styles.evaluationLabel}>Evaluation Type</Text>
        <View style={styles.evaluationDropdownContainer}>
          <TouchableOpacity
            style={styles.evaluationDropdownButton}
            onPress={() => setShowEvaluationDropdown(!showEvaluationDropdown)}
            activeOpacity={0.7}>
            <Text style={styles.evaluationDropdownText}>
              {evaluationType}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={WP(4)}
              color="#666"
              style={[
                styles.dropdownIcon,
                showEvaluationDropdown && styles.dropdownIconRotated
              ]}
            />
          </TouchableOpacity>
          
          {showEvaluationDropdown && (
            <View style={styles.evaluationDropdownMenu}>
              {evaluationTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.evaluationDropdownOption,
                    index === evaluationTypes.length - 1 && styles.lastDropdownOption
                  ]}
                  onPress={() => handleEvaluationTypeSelect(type)}
                  activeOpacity={0.7}>
                  <Text style={[
                    styles.evaluationDropdownOptionText,
                    evaluationType === type && styles.selectedDropdownOptionText
                  ]}>
                    {type}
                  </Text>
                  {evaluationType === type && (
                    <MaterialIcons
                      name="check"
                      size={WP(4)}
                      color={colors.Primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}>
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleModalContentPress}>
            <View style={[
              styles.modalContainer,
              shouldShowEvaluationType && styles.modalContainerExpanded
            ]}>
              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Checklist SubTask</Text>
                  <TextInput
                    style={styles.textInput}
                    value={note}
                    onChangeText={handleNoteChange}
                    placeholder=""
                    placeholderTextColor="#999999"
                    multiline={true}
                    textAlignVertical="top"
                    autoFocus={true}
                  />
                </View>

                {renderEvaluationTypeSection()}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.okButton}
                    onPress={handleOK}
                    activeOpacity={0.7}>
                    <Text style={styles.okButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* Custom Toast */}
          <CustomToast
            visible={toastVisible}
            message={toastMessage}
            type={toastType}
            duration={3000}
            onHide={hideToast}
            position="bottom"
            showIcon={true}
          />
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.ModelBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: WP(87),
    maxHeight: HP(50),
    backgroundColor: colors.White,
    borderRadius: WP(7),
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(1),
  },
  modalContainerExpanded: {
    maxHeight: HP(60), // Increase height when evaluation type is shown
  },
  modalContent: {
    padding: WP(5),
    marginTop: HP(1),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(3),
    marginBottom: HP(1),
    height: HP(10),
    position: 'relative',
    borderWidth: 2,
    borderColor: '#888888',
  },
  inputLabel: {
    fontSize: FS(1.2),
    color: colors.Black,
    fontFamily: 'OpenSans-SemiBold',
    position: 'absolute',
    top: HP(-1.2),
    left: WP(5),
    backgroundColor: colors.White,
    paddingHorizontal: WP(1.5),
    zIndex: 1,
  },
  textInput: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
    padding: WP(3),
    minHeight: HP(12),
    marginLeft: WP(4),
    maxHeight: HP(12),
  },
  evaluationContainer: {
    marginBottom: HP(2),
    position: 'relative',
    zIndex: 1000,
  },
  evaluationLabel: {
    fontSize: FS(1.2),
    color: colors.Black,
    fontFamily: 'OpenSans-SemiBold',
    marginBottom: HP(0.8),
    marginLeft: WP(1),
  },
  evaluationDropdownContainer: {
    position: 'relative',
  },
  evaluationDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: WP(2),
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.2),
    borderWidth: 2,
    borderColor: '#888888',
    minHeight: HP(5),
  },
  evaluationDropdownText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#333333',
  },
  dropdownIcon: {
    marginLeft: WP(2),
  },
  dropdownIconRotated: {
    transform: [{rotate: '180deg'}],
  },
  evaluationDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.White,
    borderRadius: WP(2),
    elevation: 15,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(4),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    zIndex: 2000,
    marginTop: HP(0.5),
  },
  evaluationDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(3.5),
    paddingVertical: HP(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastDropdownOption: {
    borderBottomWidth: 0,
  },
  evaluationDropdownOptionText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  selectedDropdownOptionText: {
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: WP(4),
    alignItems: 'center',
    paddingTop: HP(2.2),
    marginBottom: HP(-0.3),
  },
  cancelButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(0.3),
    marginRight: WP(3),
  },
  cancelButtonText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    letterSpacing: 0.5,
  },
  okButton: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(0.3),
  },
  okButtonText: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
    letterSpacing: 0.5,
  },
});

export default ItemInput;