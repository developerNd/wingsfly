import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import {HP, WP, FS} from '../utils/dimentions';
import {colors} from '../Helper/Contants';

const NoteModal = ({visible, onClose, onSave, initialNote = ''}) => {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) {
      setNote(initialNote);
    }
  }, [visible, initialNote]);

  const handleCancel = () => {
    setNote(initialNote);
    onClose();
  };

  const handleOK = () => {
    onSave(note);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Note</Text>
              <TextInput
                style={styles.textInput}
                value={note}
                onChangeText={setNote}
                placeholder=""
                placeholderTextColor="#999999"
                multiline={true}
                textAlignVertical="top"
                autoFocus={true}
              />
            </View>

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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#47474773',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: WP(83),
    backgroundColor: colors.White,
    borderRadius: WP(8),
    elevation: 10,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.5),
    },
    shadowOpacity: 0.25,
    shadowRadius: WP(1),
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
    fontSize: FS(1.5),
    color: '#625F5F',
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: WP(25),
    alignItems: 'center',
    paddingTop: HP(0.6),
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
    color: colors.Black,
    letterSpacing: 0.5,
  },
});

export default NoteModal;
