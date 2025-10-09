import React, {useState, useEffect, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import TaskSkeleton from '../../Components/TaskSkeleton';
import DeleteTaskModal from '../../Components/DeleteTaskModal';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {alarmService} from '../../services/api/alarmService';
import {customAlarmService} from '../../services/Alarm/customAlarmService';
import {useAuth} from '../../contexts/AuthContext';

const AlarmScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  
  const [alarms, setAlarms] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissions, setPermissions] = useState({
    exactAlarm: true,
  });
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAlarmForDelete, setSelectedAlarmForDelete] = useState(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check permissions on Android
  useEffect(() => {
    if (Platform.OS === 'android' && !permissionsChecked) {
      checkAlarmPermissions();
    }
  }, [permissionsChecked]);

  // Check alarm permissions
  const checkAlarmPermissions = async () => {
    try {
      const permissionStatus = await customAlarmService.checkPermissions();
      setPermissions({ exactAlarm: permissionStatus.exactAlarm });
      setPermissionsChecked(true);

      if (!permissionStatus.exactAlarm) {
        Alert.alert(
          'Permission Required',
          'This app needs exact alarm permission to work properly. Would you like to grant it now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Grant', onPress: requestExactAlarmPermission }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionsChecked(true);
    }
  };

  const requestExactAlarmPermission = async () => {
    try {
      await customAlarmService.requestExactAlarmPermission();
    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
    }
  };

  // Load alarms from database
  const loadAlarms = useCallback(async (showLoading = true) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const allAlarms = await alarmService.getAlarms(user.id);
      setAlarms(allAlarms);
      console.log('Alarms loaded:', allAlarms.length);
    } catch (error) {
      console.error('Error loading alarms:', error);
      Alert.alert('Error', 'Failed to load alarms. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlarms(false);
  }, [loadAlarms]);

  // Load alarms when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms]),
  );

  // Toggle alarm enabled/disabled with native integration and custom tone support
  const toggleAlarm = async (id, currentStatus) => {
    try {
      // Update database first
      const updatedAlarm = await alarmService.toggleAlarm(id, !currentStatus);
      
      // Update local state
      setAlarms(prevAlarms =>
        prevAlarms.map(alarm =>
          alarm.id === id
            ? { ...alarm, is_enabled: updatedAlarm.is_enabled }
            : alarm
        )
      );

      // Handle native alarm scheduling with custom tone support
      const alarm = alarms.find(a => a.id === id);
      if (alarm && Platform.OS === 'android') {
        try {
          if (updatedAlarm.is_enabled) {
            // Schedule native alarm with custom tone data - ENSURE ID IS STRING
            await customAlarmService.scheduleAlarm({
              id: String(alarm.id),
              time: alarm.time,
              label: alarm.label,
              days: alarm.days || [],
              is_enabled: true,
              userId: user.id,
              // Include custom tone data
              toneType: alarm.toneType || 'default',
              customToneUri: alarm.customToneUri || null,
            });
            console.log('Native alarm scheduled for:', alarm.label);
          } else {
            // Cancel native alarm - ENSURE ID IS STRING
            await customAlarmService.cancelAlarm(String(alarm.id));
            console.log('Native alarm cancelled for:', alarm.label);
          }
        } catch (nativeError) {
          console.error('Native alarm error:', nativeError);
          // Don't show error to user as database update succeeded
        }
      }

    } catch (error) {
      console.error('Error toggling alarm:', error);
      Alert.alert('Error', 'Failed to update alarm. Please try again.');
    }
  };

  // Delete alarm function
  const deleteAlarm = async (alarmId) => {
    try {
      // Delete from database
      await alarmService.deleteAlarm(alarmId);
      
      // Cancel native alarm if it exists
      if (Platform.OS === 'android') {
        try {
          await customAlarmService.cancelAlarm(String(alarmId));
          console.log('Native alarm cancelled for deleted alarm:', alarmId);
        } catch (nativeError) {
          console.error('Error cancelling native alarm:', nativeError);
        }
      }
      
      // Update local state
      setAlarms(prevAlarms => prevAlarms.filter(alarm => alarm.id !== alarmId));
      
      console.log('Alarm deleted:', alarmId);
    } catch (error) {
      console.error('Error deleting alarm:', error);
      Alert.alert('Error', 'Failed to delete alarm. Please try again.');
    }
  };

  // Handle long press for delete confirmation modal
  const handleLongPress = (alarm) => {
    console.log('Long press triggered for alarm:', alarm);
    setSelectedAlarmForDelete(alarm);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation from modal
  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (selectedAlarmForDelete) {
      deleteAlarm(selectedAlarmForDelete.id);
    }
    setSelectedAlarmForDelete(null);
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedAlarmForDelete(null);
  };

  // Format time for display
  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get next alarm info
  const getNextAlarmInfo = () => {
    const enabledAlarms = alarms.filter(alarm => alarm.is_enabled);
    if (enabledAlarms.length === 0) return null;
    
    // Calculate next alarm using native service
    const nextAlarms = enabledAlarms.map(alarm => ({
      ...alarm,
      nextTime: customAlarmService.calculateNextAlarmTime(alarm.time, alarm.days || [])
    })).sort((a, b) => a.nextTime - b.nextTime);
    
    const nextAlarm = nextAlarms[0];
    return `Next alarm: ${formatAlarmTime(nextAlarm.time)} - ${nextAlarm.label}`;
  };

  // Format alarm time for display (12-hour format)
  const formatAlarmTime = (time) => {
    return customAlarmService.formatAlarmTime(time, false); // 12-hour format
  };

  // Handle new alarm creation
  const handleCreateAlarm = useCallback(async (newAlarm) => {
    // Add to local state
    setAlarms(prevAlarms => [newAlarm, ...prevAlarms]);
    
    // Schedule native alarm if enabled
    if (newAlarm.is_enabled && Platform.OS === 'android') {
      try {
        await customAlarmService.scheduleAlarm({
          id: String(newAlarm.id),
          time: newAlarm.time,
          label: newAlarm.label,
          days: newAlarm.days || [],
          is_enabled: true,
          userId: user.id,
          // Include custom tone data
          toneType: newAlarm.toneType || 'default',
          customToneUri: newAlarm.customToneUri || null,
        });
        console.log('New alarm scheduled natively:', newAlarm.label);
      } catch (error) {
        console.error('Error scheduling new alarm natively:', error);
      }
    }
  }, [user.id]);

  // Navigate to create alarm screen
  const navigateToCreateAlarm = () => {
    navigation.navigate('CreateAlarmScreen', {
      refreshAlarms: true
    });
  };

  // Handle screen focus to refresh alarms when coming back from create screen
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        const route = navigation.getState()?.routes?.find(r => r.name === 'CreateAlarmScreen');
        if (route?.params?.refreshAlarms) {
          loadAlarms();
        }
      });

      return unsubscribe;
    }, [navigation, loadAlarms])
  );

  // Format days for display
  const formatDaysForDisplay = (days) => {
    if (!days || days.length === 0) return 'Ring once';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) {
      return 'Weekdays';
    }
    if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) {
      return 'Weekends';
    }
    
    const dayAbbr = {
      'Sun': 'Sun',
      'Mon': 'Mon', 
      'Tue': 'Tue',
      'Wed': 'Wed',
      'Thu': 'Thu',
      'Fri': 'Fri',
      'Sat': 'Sat'
    };
    
    if (days.length <= 3) {
      return days.map(day => dayAbbr[day] || day.charAt(0)).join(', ');
    }
    
    return `${days.length} days a week`;
  };

  // Custom Toggle Component
  const CustomToggle = ({value, onValueChange, disabled}) => {
    return (
      <TouchableOpacity
        style={[
          styles.customToggle,
          value ? styles.customToggleActive : styles.customToggleInactive,
          disabled && styles.customToggleDisabled
        ]}
        onPress={onValueChange}
        disabled={disabled}
        activeOpacity={0.6}>
        <View
          style={[
            styles.customToggleThumb,
            value ? styles.customToggleThumbActive : styles.customToggleThumbInactive,
          ]}
        />
      </TouchableOpacity>
    );
  };

  // Alarm Item Component with custom tone indicator
  const AlarmItem = ({alarm}) => {
    return (
      <View style={styles.alarmItem}>
        <TouchableOpacity
          style={styles.alarmTouchable}
          onLongPress={() => handleLongPress(alarm)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={styles.alarmContent}>
            <View style={styles.alarmInfo}>
              <Text style={[
                styles.alarmTime, 
                !alarm.is_enabled && styles.disabledAlarmTime
              ]}>
                {formatAlarmTime(alarm.time)}
              </Text>
              <View style={styles.alarmDetails}>
                <Text style={[
                  styles.alarmFrequency, 
                  !alarm.is_enabled && styles.disabledAlarmFrequency
                ]}>
                  {formatDaysForDisplay(alarm.days)}
                </Text>
                {alarm.label && (
                  <Text style={[
                    styles.alarmLabel,
                    !alarm.is_enabled && styles.disabledAlarmLabel
                  ]}>
                    {alarm.label}
                  </Text>
                )}
                {/* Custom tone indicator */}
                {alarm.toneType === 'custom' && alarm.customToneName && (
                  <Text style={[
                    styles.customToneIndicator,
                    !alarm.is_enabled && styles.disabledCustomToneIndicator
                  ]}>
                    🎵 {alarm.customToneName}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.alarmToggleContainer}>
              <CustomToggle
                value={alarm.is_enabled}
                onValueChange={() => toggleAlarm(alarm.id, alarm.is_enabled)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Empty State Component
  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateTitle}>All alarms turned off</Text>
      {Platform.OS === 'android' && !permissions.exactAlarm && (
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestExactAlarmPermission}>
          <Text style={styles.permissionButtonText}>
            Enable Exact Alarm Permission
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // All Alarms Header Component
  const AllAlarmsHeader = () => (
    <View style={styles.allAlarmsHeader}>
      <Text style={styles.allAlarmsTitle}>All Alarms</Text>
      {getNextAlarmInfo() && (
        <Text style={styles.nextAlarmText}>{getNextAlarmInfo()}</Text>
      )}
    </View>
  );

  // Permission Warning Component
  const PermissionWarning = () => {
    if (Platform.OS !== 'android' || permissions.exactAlarm) {
      return null;
    }

    return (
      <View style={styles.permissionWarning}>
        <Text style={styles.permissionWarningText}>
          Exact alarm permission required for reliable alarms
        </Text>
        <TouchableOpacity 
          style={styles.permissionFixButton}
          onPress={requestExactAlarmPermission}>
          <Text style={styles.permissionFixButtonText}>Fix</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Loading State with TaskSkeleton
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Alarm" />
        </View>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.clockCard}>
            <View style={styles.clockGradient}>
              <Text style={styles.digitalTime}>{formatCurrentTime()}</Text>
              <Text style={styles.digitalDate}>{formatCurrentDate()}</Text>
            </View>
          </View>
          
          {[...Array(4)].map((_, index) => (
            <TaskSkeleton key={index} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Check if any alarm is enabled
  const hasEnabledAlarms = alarms.some(alarm => alarm.is_enabled);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Alarm" />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.Primary]}
            tintColor={colors.Primary}
          />
        }>
        
        {/* Digital Clock Card */}
        <View style={styles.clockCard}>
          <View style={styles.clockGradient}>
            <Text style={styles.digitalTime}>{formatCurrentTime()}</Text>
            <Text style={styles.digitalDate}>{formatCurrentDate()}</Text>
          </View>
        </View>

        {/* Permission Warning */}
        <PermissionWarning />

        {/* Show Empty State only when no alarms exist OR all alarms are disabled */}
        {(alarms.length === 0 || !hasEnabledAlarms) && (
          <EmptyState />
        )}

        {/* Show All Alarms Header when there are alarms and at least one is enabled */}
        {alarms.length > 0 && hasEnabledAlarms && (
          <AllAlarmsHeader />
        )}

        {/* All Alarms Section */}
        {alarms.length > 0 && (
          <View style={styles.alarmsSection}>
            {alarms.map(alarm => (
              <AlarmItem key={alarm.id} alarm={alarm} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToCreateAlarm}
        activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Delete Modal */}
      <DeleteTaskModal
        visible={showDeleteModal}
        taskTitle={selectedAlarmForDelete ? `${selectedAlarmForDelete.label || 'Alarm'} (${formatAlarmTime(selectedAlarmForDelete.time)})` : ''}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
    backgroundColor: colors.White,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
    paddingBottom: HP(10),
  },

  // Clock Card Styles
  clockCard: {
    marginTop: HP(2),
    borderRadius: WP(5),
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  clockGradient: {
    backgroundColor: colors.Primary + '15',
    paddingVertical: HP(4),
    paddingHorizontal: WP(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.Primary + '20',
  },
  digitalTime: {
    fontSize: FS(4.5),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
    letterSpacing: 2,
    marginBottom: HP(0.5),
  },
  digitalDate: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    opacity: 0.8,
  },

  // Permission Warning
  permissionWarning: {
    marginTop: HP(2),
    backgroundColor: '#FFF3CD',
    borderRadius: WP(3),
    padding: WP(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  permissionWarningText: {
    flex: 1,
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: '#856404',
    marginRight: WP(2),
  },
  permissionFixButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: WP(4),
    paddingVertical: HP(1),
    borderRadius: WP(2),
  },
  permissionFixButtonText: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Bold',
    color: '#212529',
  },

  // Empty State
  emptyStateContainer: {
    marginTop: HP(5),
    alignItems: 'flex-start',
    marginLeft: WP(2)
  },
  emptyStateTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  permissionButton: {
    marginTop: HP(2),
    backgroundColor: colors.Primary,
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.2),
    borderRadius: WP(3),
  },
  permissionButtonText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },

  // All Alarms Header
  allAlarmsHeader: {
    marginTop: HP(4),
    marginBottom: HP(1),
    marginLeft: WP(2),
  },
  allAlarmsTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
  },
  nextAlarmText: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Primary,
    marginTop: HP(0.5),
  },

  // Alarms Section
  alarmsSection: {
    marginTop: HP(1),
    paddingHorizontal: WP(1)
  },

  // Alarm Item Styles
  alarmItem: {
    marginBottom: HP(2.5),
    paddingVertical: HP(0.5),
  },
  alarmTouchable: {
    flex: 1,
  },
  alarmContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: HP(0.5),
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(0.3),
    lineHeight: FS(4.5),
  },
  disabledAlarmTime: {
    color: colors.Shadow + '60',
  },
  alarmDetails: {
    marginLeft: WP(1),
  },
  alarmFrequency: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Shadow,
    lineHeight: FS(2),
  },
  disabledAlarmFrequency: {
    color: colors.Shadow + '50',
  },
  alarmLabel: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    marginTop: HP(0.3),
    lineHeight: FS(1.8),
  },
  disabledAlarmLabel: {
    color: colors.Shadow + '40',
  },
  // NEW: Custom tone indicator styles
  customToneIndicator: {
    fontSize: FS(1.2),
    fontFamily: 'OpenSans-Medium',
    color: colors.Primary,
    marginTop: HP(0.2),
    lineHeight: FS(1.6),
  },
  disabledCustomToneIndicator: {
    color: colors.Primary + '60',
  },
  alarmToggleContainer: {
    marginLeft: WP(4),
    paddingTop: HP(1),
  },

  // Custom Toggle Styles
  customToggle: {
    width: WP(12),
    height: HP(3.2),
    borderRadius: WP(6),
    justifyContent: 'center',
    position: 'relative',
  },
  customToggleActive: {
    backgroundColor: colors.Primary,
  },
  customToggleInactive: {
    backgroundColor: '#E0E0E0',
  },
  customToggleDisabled: {
    opacity: 0.6,
  },
  customToggleThumb: {
    width: WP(5.5),
    height: WP(5.5),
    borderRadius: WP(2.75),
    backgroundColor: colors.White,
    position: 'absolute',
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  customToggleThumbActive: {
    right: WP(0.75),
  },
  customToggleThumbInactive: {
    left: WP(0.75),
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    right: WP(6),
    bottom: HP(4),
    width: WP(13),
    height: WP(13),
    borderRadius: WP(4),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.Primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: FS(4),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
});

export default AlarmScreen;