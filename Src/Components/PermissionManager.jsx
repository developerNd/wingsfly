import React, { useEffect, useState, useRef } from 'react';
import {
  NativeModules,
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';

const InstalledApps = (() => {
  try {
    if (!NativeModules.InstalledApps) {
      return {
        checkPermissions: () => Promise.resolve({ overlay: false, usage: false }),
        openOverlaySettings: () => Promise.resolve(true),
        openUsageSettings: () => Promise.resolve(true),
        startLockService: () => Promise.resolve(true),
      };
    }
    return NativeModules.InstalledApps;
  } catch (error) {
    console.error('Error initializing InstalledApps module:', error);
    return {
      checkPermissions: () => Promise.resolve({ overlay: false, usage: false }),
      openOverlaySettings: () => Promise.resolve(true),
      openUsageSettings: () => Promise.resolve(true),
      startLockService: () => Promise.resolve(true),
    };
  }
})();

/**
 * PermissionManager Component
 * Checks and requests required permissions at app startup
 * Shows modal only if permissions are missing
 */
const PermissionManager = () => {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissions, setPermissions] = useState({
    overlay: false,
    usage: false,
  });
  const hasCheckedInitially = useRef(false);

  useEffect(() => {
    if (!hasCheckedInitially.current) {
      initializePermissions();
      hasCheckedInitially.current = true;
    }

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        checkAndRequestPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializePermissions = async () => {
    try {
      console.log('[PERMISSION MANAGER] Initializing permissions...');
      
      const currentPermissions = await InstalledApps.checkPermissions();
      
      console.log('[PERMISSION MANAGER] Initial state loaded:', {
        currentPermissions
      });
      
      // Determine if we need to show modal BEFORE setting any state
      const shouldShow = shouldShowPermissionModal(currentPermissions);
      
      console.log('[PERMISSION MANAGER] Should show modal:', shouldShow);
      
      // If we don't need to show modal, just start the service
      if (!shouldShow) {
        console.log('[PERMISSION MANAGER] All permissions complete - starting lock service silently');
        await startAppLockService();
        // DON'T set any state - component stays "invisible"
        return;
      }
      
      // ONLY if we need to show modal, set all the states
      console.log('[PERMISSION MANAGER] Missing permissions - setting state to show modal');
      setPermissions(currentPermissions);
      setShowPermissionModal(true);
      
    } catch (error) {
      console.error('[PERMISSION MANAGER] Error initializing permissions:', error);
    }
  };

  const shouldShowPermissionModal = (currentPermissions) => {
    // Check overlay and usage permissions
    if (!currentPermissions.overlay || !currentPermissions.usage) {
      console.log('[PERMISSION MANAGER] Missing overlay or usage permission');
      return true;
    }

    // All permissions are good
    console.log('[PERMISSION MANAGER] All permissions satisfied');
    return false;
  };

  const checkAndRequestPermissions = async () => {
    try {
      console.log('[PERMISSION MANAGER] Checking permissions...');
      const currentPermissions = await InstalledApps.checkPermissions();
      
      console.log('[PERMISSION MANAGER] Current permissions:', currentPermissions);
      setPermissions(currentPermissions);
      
      // Check if we should close the modal
      const shouldShow = shouldShowPermissionModal(currentPermissions);
      
      if (!shouldShow && showPermissionModal) {
        console.log('[PERMISSION MANAGER] All permissions granted - closing modal');
        setShowPermissionModal(false);
        await startAppLockService();
      }
    } catch (error) {
      console.error('[PERMISSION MANAGER] Error checking permissions:', error);
    }
  };

  const startAppLockService = async () => {
    try {
      console.log('[PERMISSION MANAGER] Starting app lock service...');
      await InstalledApps.startLockService();
      console.log('[PERMISSION MANAGER] App lock service started successfully');
    } catch (error) {
      console.error('[PERMISSION MANAGER] Error starting lock service:', error);
    }
  };

  const handlePermissionRequest = async (permissionType) => {
    try {
      console.log(`[PERMISSION MANAGER] Requesting ${permissionType} permission`);
      
      if (permissionType === 'overlay') {
        await InstalledApps.openOverlaySettings();
      } else if (permissionType === 'usage') {
        await InstalledApps.openUsageSettings();
      }

      // Check permissions again after a delay
      setTimeout(async () => {
        await checkAndRequestPermissions();
      }, 1000);
    } catch (error) {
      console.error(`[PERMISSION MANAGER] Error opening ${permissionType} settings:`, error);
    }
  };

  const handleRefreshPermissions = async () => {
    console.log('[PERMISSION MANAGER] Refreshing permissions...');
    await checkAndRequestPermissions();
  };

  const handleCloseModal = async () => {
    // Check if essential permissions are granted
    if (!permissions.overlay || !permissions.usage) {
      Alert.alert(
        'Permissions Required',
        'Display Over Other Apps and Usage Access permissions are essential for the app to function properly. Please grant them to continue.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('[PERMISSION MANAGER] User closed permission modal');
    setShowPermissionModal(false);
    await startAppLockService();
  };

  // CRITICAL: Only render modal if showPermissionModal is true
  // This prevents any flashing
  if (!showPermissionModal) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={showPermissionModal}
      animationType="slide"
      onRequestClose={handleCloseModal}
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
            
            <ScrollView style={styles.permissionScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.permissionList}>
                {/* Display Over Other Apps Permission */}
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
                    onPress={() => handlePermissionRequest('overlay')}
                    disabled={permissions.overlay}
                  >
                    <Text style={styles.permissionButtonText}>
                      {permissions.overlay ? "✓ Granted" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Usage Access Permission */}
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
                    onPress={() => handlePermissionRequest('usage')}
                    disabled={permissions.usage}
                  >
                    <Text style={styles.permissionButtonText}>
                      {permissions.usage ? "✓ Granted" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.refreshPermissionsButton]}
                onPress={handleRefreshPermissions}
              >
                <Text style={styles.saveButtonText}>Refresh Status</Text>
              </TouchableOpacity>
              
              {permissions.overlay && permissions.usage && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.continueButton]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.saveButtonText}>Continue</Text>
                </TouchableOpacity>
              )}
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
    maxHeight: '85%',
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
  permissionScrollView: {
    maxHeight: 400,
  },
  permissionList: {
    marginBottom: 12,
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
    paddingRight: 12,
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
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    minWidth: 90,
    alignItems: 'center',
  },
  permissionGranted: {
    backgroundColor: '#2E7D32',
  },
  permissionNeeded: {
    backgroundColor: '#FF5722',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  refreshPermissionsButton: {
    backgroundColor: '#2E7D32',
  },
  continueButton: {
    backgroundColor: '#1976D2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PermissionManager;