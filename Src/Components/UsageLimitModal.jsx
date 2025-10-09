import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {appBlockerService} from '../services/api/appBlockerService';
import {useAuth} from '../contexts/AuthContext';

const UsageLimitModal = ({
  visible,
  selectedApp,
  loadingUsageData,
  onClose,
  onAppUpdate,
  InstalledApps,
}) => {
  const {user} = useAuth();

  const [limitMinutes, setLimitMinutes] = useState('');
  const [limitHours, setLimitHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localUsageData, setLocalUsageData] = useState({
    usageToday: 0,
    usageLimit: 0,
    isLimitReached: false,
  });

  useEffect(() => {
    if (selectedApp && visible) {
      console.log('Setting up usage limit modal for:', selectedApp.name);

      // Initialize local usage data from the app
      setLocalUsageData({
        usageToday: selectedApp.usageToday || 0,
        usageLimit: selectedApp.usageLimit || 0,
        isLimitReached: selectedApp.isLimitReached || false,
      });

      // Convert existing limit to hours and minutes for display
      const existingLimit = selectedApp.usageLimit || 0;
      if (existingLimit > 0) {
        const hours = Math.floor(existingLimit / 60);
        const minutes = existingLimit % 60;
        setLimitHours(hours > 0 ? hours.toString() : '');
        setLimitMinutes(minutes > 0 ? minutes.toString() : '');
      } else {
        setLimitHours('');
        setLimitMinutes('');
      }
    }
  }, [selectedApp, visible]);

  const formatTime = minutes => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const refreshUsageData = async () => {
    if (!selectedApp) return;

    try {
      setRefreshing(true);
      console.log('Refreshing usage data for:', selectedApp.name);

      const [usageToday, usageLimit, isLimitReached] = await Promise.all([
        InstalledApps.getAppUsageToday(selectedApp.packageName),
        InstalledApps.getAppUsageLimit(selectedApp.packageName),
        InstalledApps.isAppLimitReached(selectedApp.packageName),
      ]);

      const updatedData = {
        usageToday: usageToday || 0,
        usageLimit: usageLimit || 0,
        isLimitReached: isLimitReached || false,
      };

      setLocalUsageData(updatedData);

      console.log('Refreshed usage data:', updatedData);
    } catch (error) {
      console.error('Error refreshing usage data:', error);
      Alert.alert('Error', 'Failed to refresh usage data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveLimit = async () => {
    if (!selectedApp) return;

    try {
      setSaving(true);

      // Calculate total minutes from hours and minutes input
      const hours = parseInt(limitHours) || 0;
      const minutes = parseInt(limitMinutes) || 0;
      const totalMinutes = hours * 60 + minutes;

      console.log(
        'Setting usage limit for',
        selectedApp.name,
        ':',
        totalMinutes,
        'minutes',
      );

      if (totalMinutes <= 0) {
        Alert.alert(
          'Invalid Limit',
          'Please enter a valid time limit (at least 1 minute).',
          [{text: 'OK'}],
        );
        return;
      }

      if (totalMinutes > 1440) {
        // 24 hours
        Alert.alert(
          'Invalid Limit',
          'Usage limit cannot exceed 24 hours per day.',
          [{text: 'OK'}],
        );
        return;
      }

      // Set the usage limit in native module
      const success = await InstalledApps.setAppUsageLimit(
        selectedApp.packageName,
        totalMinutes,
      );

      if (success) {
        // Force re-evaluation of blocking status after setting new limit
        console.log('Re-evaluating blocking status after setting new limit');
        const shouldBeLocked = await InstalledApps.reevaluateAppBlockingStatus(
          selectedApp.packageName,
        );

        // Refresh all usage data to get updated status
        const [usageToday, isLimitReached] = await Promise.all([
          InstalledApps.getAppUsageToday(selectedApp.packageName),
          InstalledApps.isAppLimitReached(selectedApp.packageName),
        ]);

        const updatedApp = {
          ...selectedApp,
          usageLimit: totalMinutes,
          usageToday: usageToday || 0,
          isLimitReached: isLimitReached || false,
          isActuallyLocked: shouldBeLocked || false,
        };

        // Sync to Supabase if user is logged in
        if (user?.id) {
          try {
            await appBlockerService.setAppUsageLimit(
              user.id,
              selectedApp.packageName,
              selectedApp.name,
              totalMinutes,
            );
            console.log('Usage limit synced to Supabase successfully');
          } catch (syncError) {
            console.error(
              'Failed to sync usage limit to Supabase (silent):',
              syncError,
            );
          }
        }

        try {
          await InstalledApps.refreshNotification();
          console.log('Notification refreshed immediately');
        } catch (error) {
          console.warn('Failed to refresh notification:', error);
        }

        console.log('Updated app state after setting limit:', {
          name: updatedApp.name,
          limit: updatedApp.usageLimit,
          usage: updatedApp.usageToday,
          limitReached: updatedApp.isLimitReached,
          actuallyLocked: updatedApp.isActuallyLocked,
        });

        // Update local data
        setLocalUsageData({
          usageToday: usageToday || 0,
          usageLimit: totalMinutes,
          isLimitReached: isLimitReached || false,
        });

        // Update the parent component with complete app state
        onAppUpdate(updatedApp);

        Alert.alert(
          'Success',
          `Usage limit of ${formatTime(totalMinutes)} set for ${
            selectedApp.name
          }${
            !isLimitReached
              ? '\n\nApp is now unlocked as current usage is below the new limit.'
              : ''
          }`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log(
                  'Usage limit set and blocking status updated successfully',
                );
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Failed to set usage limit');
      }
    } catch (error) {
      console.error('Error setting usage limit:', error);
      Alert.alert('Error', 'Failed to set usage limit');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLimit = async () => {
    if (!selectedApp) return;

    Alert.alert(
      'Remove Usage Limit',
      `Are you sure you want to remove the usage limit for ${selectedApp.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              console.log('Removing usage limit for:', selectedApp.name);

              const success = await InstalledApps.removeAppUsageLimit(
                selectedApp.packageName,
              );

              if (success) {
                // Force re-evaluation of blocking status after removing limit
                console.log(
                  'Re-evaluating blocking status after removing limit',
                );
                const shouldBeLocked =
                  await InstalledApps.reevaluateAppBlockingStatus(
                    selectedApp.packageName,
                  );

                // Sync removal to Supabase if user is logged in
                if (user?.id) {
                  try {
                    await appBlockerService.removeAppUsageLimit(
                      user.id,
                      selectedApp.packageName,
                    );
                    console.log(
                      'Usage limit removal synced to Supabase successfully',
                    );
                  } catch (syncError) {
                    console.error(
                      'Failed to sync usage limit removal to Supabase (silent):',
                      syncError,
                    );
                  }
                }

                try {
                  await InstalledApps.refreshNotification();
                  console.log('Notification refreshed after removing limit');
                } catch (error) {
                  console.warn('Failed to refresh notification:', error);
                }

                const updatedApp = {
                  ...selectedApp,
                  usageLimit: 0,
                  isLimitReached: false,
                  isActuallyLocked: shouldBeLocked || false,
                };

                console.log('Updated app state after removing limit:', {
                  name: updatedApp.name,
                  actuallyLocked: updatedApp.isActuallyLocked,
                });

                // Update local data
                setLocalUsageData(prev => ({
                  ...prev,
                  usageLimit: 0,
                  isLimitReached: false,
                }));

                // Clear the input fields
                setLimitHours('');
                setLimitMinutes('');

                // Update the parent component
                onAppUpdate(updatedApp);

                Alert.alert(
                  'Success',
                  `Usage limit removed for ${selectedApp.name}\n\nApp blocking status has been updated.`,
                );
              } else {
                Alert.alert('Error', 'Failed to remove usage limit');
              }
            } catch (error) {
              console.error('Error removing usage limit:', error);
              Alert.alert('Error', 'Failed to remove usage limit');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleResetUsage = async () => {
    if (!selectedApp) return;

    Alert.alert(
      'Reset Usage',
      `Are you sure you want to reset today's usage for ${selectedApp.name}? This will unlock the app if it was locked due to usage limit.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          onPress: async () => {
            try {
              setSaving(true);
              console.log('Resetting usage for:', selectedApp.name);

              const success = await InstalledApps.resetAppUsageToday(
                selectedApp.packageName,
              );

              if (success) {
                // Refresh usage data
                const [usageToday, isLimitReached] = await Promise.all([
                  InstalledApps.getAppUsageToday(selectedApp.packageName),
                  InstalledApps.isAppLimitReached(selectedApp.packageName),
                ]);

                // Re-evaluate blocking status
                const shouldBeLocked =
                  await InstalledApps.reevaluateAppBlockingStatus(
                    selectedApp.packageName,
                  );

                const updatedApp = {
                  ...selectedApp,
                  usageToday: usageToday || 0,
                  isLimitReached: isLimitReached || false,
                  isActuallyLocked: shouldBeLocked || false,
                };

                // Update local data
                setLocalUsageData(prev => ({
                  ...prev,
                  usageToday: usageToday || 0,
                  isLimitReached: isLimitReached || false,
                }));

                // Update the parent component
                onAppUpdate(updatedApp);

                Alert.alert('Success', `Usage reset for ${selectedApp.name}`);
              } else {
                Alert.alert('Error', 'Failed to reset usage');
              }
            } catch (error) {
              console.error('Error resetting usage:', error);
              Alert.alert('Error', 'Failed to reset usage');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (!selectedApp) {
    return null;
  }

  const usagePercentage =
    localUsageData.usageLimit > 0
      ? Math.min(
          (localUsageData.usageToday / localUsageData.usageLimit) * 100,
          100,
        )
      : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Usage Limit</Text>
          <TouchableOpacity
            onPress={refreshUsageData}
            style={styles.refreshButton}
            disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : (
              <Icon name="refresh" size={24} color="#2E7D32" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loadingUsageData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading usage data...</Text>
            </View>
          ) : (
            <>
              {/* App Info */}
              <View style={styles.appInfoContainer}>
                <Image
                  source={{uri: selectedApp.icon}}
                  style={styles.appIcon}
                />
                <View style={styles.appDetails}>
                  <Text style={styles.appName}>{selectedApp.name}</Text>
                  <Text style={styles.packageName}>
                    {selectedApp.packageName}
                  </Text>
                </View>
              </View>

              {/* Usage Statistics */}
              <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>Today's Usage</Text>

                <View style={styles.usageStatsCard}>
                  <View style={styles.usageRow}>
                    <Text style={styles.usageLabel}>Time Used Today:</Text>
                    <Text
                      style={[
                        styles.usageValue,
                        localUsageData.isLimitReached &&
                          styles.limitReachedText,
                      ]}>
                      {formatTime(localUsageData.usageToday)}
                    </Text>
                  </View>

                  {localUsageData.usageLimit > 0 && (
                    <>
                      <View style={styles.usageRow}>
                        <Text style={styles.usageLabel}>Daily Limit:</Text>
                        <Text style={styles.usageValue}>
                          {formatTime(localUsageData.usageLimit)}
                        </Text>
                      </View>

                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${usagePercentage}%`,
                                backgroundColor:
                                  usagePercentage >= 100
                                    ? '#F44336'
                                    : '#2E7D32',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {Math.round(usagePercentage)}%
                        </Text>
                      </View>

                      {localUsageData.isLimitReached && (
                        <View style={styles.limitReachedContainer}>
                          <Icon name="block" size={20} color="#F44336" />
                          <Text style={styles.limitReachedText}>
                            Limit Reached - App is Locked
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* Set Limit Section */}
              <View style={styles.setLimitContainer}>
                <Text style={styles.sectionTitle}>Set Daily Usage Limit</Text>

                <View style={styles.timeInputContainer}>
                  <View style={styles.timeInput}>
                    <TextInput
                      style={styles.timeTextInput}
                      value={limitHours}
                      onChangeText={setLimitHours}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeLabel}>Hours</Text>
                  </View>

                  <Text style={styles.timeSeparator}>:</Text>

                  <View style={styles.timeInput}>
                    <TextInput
                      style={styles.timeTextInput}
                      value={limitMinutes}
                      onChangeText={setLimitMinutes}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeLabel}>Minutes</Text>
                  </View>
                </View>

                <Text style={styles.helperText}>
                  Set how much time per day this app can be used. The app will
                  be locked when the limit is reached.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleSaveLimit}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Icon name="timer" size={20} color="white" />
                      <Text style={styles.primaryButtonText}>Set Limit</Text>
                    </>
                  )}
                </TouchableOpacity>

                {localUsageData.usageLimit > 0 && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleRemoveLimit}
                    disabled={saving}>
                    <Icon name="delete" size={20} color="#F44336" />
                    <Text style={styles.secondaryButtonText}>Remove Limit</Text>
                  </TouchableOpacity>
                )}

                {localUsageData.usageToday > 0 && (
                  <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={handleResetUsage}
                    disabled={saving}>
                    <Icon name="restore" size={20} color="#FF9800" />
                    <Text style={styles.tertiaryButtonText}>
                      Reset Today's Usage
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetsContainer}>
                <Text style={styles.sectionTitle}>Quick Presets</Text>
                <View style={styles.presetButtons}>
                  {[
                    {label: '15min', minutes: 15},
                    {label: '30min', minutes: 30},
                    {label: '1h', minutes: 60},
                    {label: '2h', minutes: 120},
                    {label: '3h', minutes: 180},
                  ].map(preset => (
                    <TouchableOpacity
                      key={preset.minutes}
                      style={styles.presetButton}
                      onPress={() => {
                        const hours = Math.floor(preset.minutes / 60);
                        const minutes = preset.minutes % 60;
                        setLimitHours(hours > 0 ? hours.toString() : '');
                        setLimitMinutes(minutes > 0 ? minutes.toString() : '');
                      }}>
                      <Text style={styles.presetButtonText}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  appInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  appDetails: {
    marginLeft: 16,
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  packageName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  usageStatsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  limitReachedText: {
    color: '#F44336',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
    textAlign: 'right',
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  setLimitContainer: {
    marginTop: 24,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeInput: {
    alignItems: 'center',
    minWidth: 80,
  },
  timeTextInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
    paddingBottom: 4,
    minWidth: 60,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  secondaryButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tertiaryButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  tertiaryButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  presetsContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginRight: 8,
    marginBottom: 8,
  },
  presetButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UsageLimitModal;
