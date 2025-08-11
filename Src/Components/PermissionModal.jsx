import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';

const PermissionModal = ({ 
  visible, 
  permissions, 
  onClose, 
  onPermissionRequest, 
  onRefreshPermissions 
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Permissions Required</Text>
              <Text style={styles.modalSubtitle}>
                This app needs the following permissions to function properly:
              </Text>
            </View>
            
            <View style={styles.permissionList}>
              <View style={styles.permissionItem}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>Display Over Other Apps</Text>
                  <Text style={styles.permissionDescription}>
                    Required to show lock screens when an app is restricted
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    permissions.overlay ? styles.permissionGranted : styles.permissionNeeded
                  ]}
                  onPress={() => onPermissionRequest('overlay')}
                >
                  <Text style={styles.permissionButtonText}>
                    {permissions.overlay ? "Granted" : "Grant"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.permissionItem}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>Usage Access</Text>
                  <Text style={styles.permissionDescription}>
                    Required to detect when restricted apps are launched
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    permissions.usage ? styles.permissionGranted : styles.permissionNeeded
                  ]}
                  onPress={() => onPermissionRequest('usage')}
                >
                  <Text style={styles.permissionButtonText}>
                    {permissions.usage ? "Granted" : "Grant"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.refreshPermissionsButton]}
                onPress={onRefreshPermissions}
              >
                <Text style={styles.saveButtonText}>Refresh Permissions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  permissionList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  permissionGranted: {
    backgroundColor: '#2E7D32',
  },
  permissionNeeded: {
    backgroundColor: '#FF5722',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  refreshPermissionsButton: {
    backgroundColor: '#2E7D32',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default PermissionModal;