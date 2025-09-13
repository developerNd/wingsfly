import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  StatusBar,
} from 'react-native';
import {Icons, colors} from '../Helper/Contants';
import {HP, WP, FS} from '../utils/dimentions';

const DeleteTaskModal = ({visible, taskTitle, onCancel, onConfirm}) => {
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
            <Text style={styles.modalTitle}>Delete Task</Text>
          </View>

          {/* Message - aligned with logo start */}
          <View style={styles.messageContainer}>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete{' '}
              <Text style={styles.taskName}>"{taskTitle}"</Text>?
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.7}>
              <Text style={styles.confirmButtonText}>Delete</Text>
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
    marginBottom: HP(3),
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
    fontSize: FS(2.4),
    fontFamily: 'Roboto-Bold',
    color: colors.Primary,
    textAlign: 'left',
  },
  messageContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: HP(3.5),
  },
  modalMessage: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-Regular',
    color: '#555555',
    lineHeight: FS(2.6),
    marginRight: WP(3),
    marginLeft: WP(5),
  },
  taskName: {
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    fontSize: FS(1.9),
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
  confirmButton: {
    backgroundColor: '#DC3545',
  },
  cancelButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#666666',
  },
  confirmButtonText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: '#F8F9FA',
  },
});

export default DeleteTaskModal;
