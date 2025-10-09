// src/screens/VoiceCommand/VoiceCommandListScreen.js
import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import voiceCommandStorageService from '../../services/VoiceCommand/voiceCommandStorageService';
import voiceCommandAlarmManager from '../../services/VoiceCommand/voiceCommandAlarmManager';

const VoiceCommandListScreen = ({navigation}) => {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load alarms
  const loadAlarms = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const allAlarms = await voiceCommandStorageService.getAllAlarms();
      setAlarms(allAlarms);
      console.log('Voice command alarms loaded:', allAlarms.length);
    } catch (error) {
      console.error('Error loading alarms:', error);
      Alert.alert('Error', 'Failed to load alarms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlarms(false);
  }, [loadAlarms]);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms]),
  );

  // Toggle alarm
  const toggleAlarm = async (alarm) => {
    try {
      const newState = !alarm.is_enabled;
      const result = await voiceCommandAlarmManager.toggleAlarm(alarm.id, newState);

      if (result.success) {
        setAlarms(prevAlarms =>
          prevAlarms.map(a =>
            a.id === alarm.id ? {...a, is_enabled: newState} : a,
          ),
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update alarm');
      }
    } catch (error) {
      console.error('Error toggling alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  // Delete alarm
  const deleteAlarm = async (alarm) => {
    Alert.alert(
      'Delete Alarm',
      `Are you sure you want to delete "${alarm.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await voiceCommandAlarmManager.deleteAndCancelAlarm(
                alarm.id,
              );

              if (result.success) {
                setAlarms(prevAlarms =>
                  prevAlarms.filter(a => a.id !== alarm.id),
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to delete alarm');
              }
            } catch (error) {
              console.error('Error deleting alarm:', error);
              Alert.alert('Error', 'Failed to delete alarm');
            }
          },
        },
      ],
    );
  };

  // Navigate to create screen
  const navigateToCreate = () => {
    navigation.navigate('CreateVoiceCommandScreen');
  };

  // Navigate to edit screen
  const navigateToEdit = (alarm) => {
    navigation.navigate('CreateVoiceCommandScreen', {
      alarmId: alarm.id,
      editMode: true,
    });
  };

  // Custom toggle component
  const CustomToggle = ({value, onValueChange}) => (
    <TouchableOpacity
      style={[
        styles.customToggle,
        value ? styles.customToggleActive : styles.customToggleInactive,
      ]}
      onPress={onValueChange}
      activeOpacity={0.6}>
      <View
        style={[
          styles.customToggleThumb,
          value
            ? styles.customToggleThumbActive
            : styles.customToggleThumbInactive,
        ]}
      />
    </TouchableOpacity>
  );

  // Alarm item component
  const AlarmItem = ({alarm}) => (
    <View style={styles.alarmItem}>
      <TouchableOpacity
        style={styles.alarmTouchable}
        onPress={() => navigateToEdit(alarm)}
        onLongPress={() => deleteAlarm(alarm)}
        delayLongPress={500}
        activeOpacity={0.8}>
        <View style={styles.alarmContent}>
          <View style={styles.alarmInfo}>
            <Text
              style={[
                styles.alarmTime,
                !alarm.is_enabled && styles.disabledAlarmTime,
              ]}>
              {voiceCommandAlarmManager.formatAlarmTime(alarm.start_time)}
            </Text>
            <View style={styles.alarmDetails}>
              <Text
                style={[
                  styles.alarmName,
                  !alarm.is_enabled && styles.disabledAlarmName,
                ]}>
                {alarm.name}
              </Text>
              <Text
                style={[
                  styles.alarmDays,
                  !alarm.is_enabled && styles.disabledAlarmDays,
                ]}>
                {voiceCommandAlarmManager.formatDaysForDisplay(alarm.days)}
              </Text>
              <Text
                style={[
                  styles.commandsCount,
                  !alarm.is_enabled && styles.disabledCommandsCount,
                ]}>
                {alarm.commands.length} command
                {alarm.commands.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.alarmToggleContainer}>
            <CustomToggle
              value={alarm.is_enabled}
              onValueChange={() => toggleAlarm(alarm)}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Empty state
  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateTitle}>No Voice Command Alarms</Text>
      <Text style={styles.emptyStateText}>
        Create your first voice command alarm to get started
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Voice Commands" />
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
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : alarms.length === 0 ? (
          <EmptyState />
        ) : (
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
        onPress={navigateToCreate}
        activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HP(10),
  },
  loadingText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
  },
  emptyStateContainer: {
    marginTop: HP(10),
    alignItems: 'center',
    paddingHorizontal: WP(8),
  },
  emptyStateTitle: {
    fontSize: FS(2),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    marginBottom: HP(1),
  },
  emptyStateText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-Regular',
    color: colors.Shadow,
    textAlign: 'center',
    lineHeight: FS(2.2),
  },
  alarmsSection: {
    marginTop: HP(1),
  },
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
  alarmName: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    lineHeight: FS(2.2),
  },
  disabledAlarmName: {
    color: colors.Shadow + '60',
  },
  alarmDays: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Medium',
    color: colors.Shadow,
    marginTop: HP(0.2),
    lineHeight: FS(1.8),
  },
  disabledAlarmDays: {
    color: colors.Shadow + '50',
  },
  commandsCount: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: colors.Primary,
    marginTop: HP(0.2),
    lineHeight: FS(1.7),
  },
  disabledCommandsCount: {
    color: colors.Primary + '60',
  },
  alarmToggleContainer: {
    marginLeft: WP(4),
    paddingTop: HP(1),
  },
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

export default VoiceCommandListScreen;