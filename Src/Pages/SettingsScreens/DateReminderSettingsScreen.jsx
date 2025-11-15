import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  AppState,
} from 'react-native';
import Headers from '../../Components/Headers';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import CustomToast from '../../Components/CustomToast';
import {NativeModules} from 'react-native';

const {DateReminderModule} = NativeModules;

const DateReminderSettingsScreen = ({navigation}) => {
  const [isEnabled, setIsEnabled] = useState(true); // Changed to true
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentSettings, setCurrentSettings] = useState(null);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    loadSettings();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('App came to foreground - syncing settings...');
      await syncSettings();
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await DateReminderModule.getSettings();
      setIsEnabled(settings.enabled);
      
      if (settings.lastSyncTime > 0) {
        setLastSyncTime(new Date(settings.lastSyncTime));
      }
      
      if (settings.enabled) {
        setCurrentSettings({
          morningTime: settings.morningTime,
          eveningTime: settings.eveningTime,
          autoClose: settings.autoClose,
        });
      }
    } catch (error) {
      console.log('Error loading settings:', error);
      setIsEnabled(true); // Keep enabled on error
    } finally {
      setIsLoading(false);
    }
  };

  const syncSettings = async () => {
    try {
      setIsSyncing(true);
      const synced = await DateReminderModule.syncSettings();
      
      if (synced) {
        await loadSettings();
        console.log('✅ Settings synced from database');
      }
    } catch (error) {
      console.error('Error syncing settings:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceRefresh = async () => {
    try {
      setIsSyncing(true);
      showToast('Refreshing...', 'info');
      
      await DateReminderModule.forceRefresh();
      await loadSettings();
      
      showToast('Settings refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing settings:', error);
      showToast('Refresh failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleToggle = async (value) => {
    try {
      setIsSwitching(true);

      if (value) {
        await DateReminderModule.enableReminders();
        showToast('Reminders enabled', 'success');
      } else {
        await DateReminderModule.disableReminders();
        showToast('Reminders disabled', 'success');
      }

      setIsEnabled(value);
      await loadSettings();
    } catch (error) {
      console.error('Error toggling reminders:', error);
      showToast(error.message || 'Failed to update', 'error');
      setIsEnabled(!value);
    } finally {
      setIsSwitching(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatLastSync = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
        <View style={styles.headerWrapper}>
          <Headers title="Date Reminder" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Date Reminder">
          {isEnabled && (
            <TouchableOpacity
              onPress={handleForceRefresh}
              disabled={isSyncing}
              style={styles.refreshButton}>
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.Primary} />
              ) : (
                <Text style={styles.refreshText}>🔄</Text>
              )}
            </TouchableOpacity>
          )}
        </Headers>
      </View>

      <View style={styles.content}>
        {/* Toggle Section */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>Daily Reminders</Text>
            <Text style={styles.toggleSubtitle}>
              Twice daily at scheduled times
            </Text>
          </View>
          {isSwitching ? (
            <ActivityIndicator size="small" color={colors.Primary} />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{false: '#D1D1D6', true: colors.Primary}}
              thumbColor={colors.White}
              ios_backgroundColor="#D1D1D6"
            />
          )}
        </View>

        {/* Schedule Display */}
        {isEnabled && currentSettings && (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>Schedule</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>☀️ Morning</Text>
                <Text style={styles.timeValue}>
                  {formatTime(currentSettings.morningTime)}
                </Text>
              </View>
              
              <View style={styles.timeDivider} />
              
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>🌙 Evening</Text>
                <Text style={styles.timeValue}>
                  {formatTime(currentSettings.eveningTime)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    minWidth: WP(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontSize: FS(2),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    paddingTop: HP(2),
  },
  toggleCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: HP(2),
  },
  toggleContent: {
    flex: 1,
    marginRight: WP(3),
  },
  toggleTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(0.3),
  },
  toggleSubtitle: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
  },
  scheduleCard: {
    backgroundColor: colors.White,
    borderRadius: WP(4),
    padding: WP(4.5),
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scheduleTitle: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Bold',
    color: colors.Black,
    marginBottom: HP(2),
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: HP(2),
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: WP(2),
  },
  timeLabel: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginBottom: HP(0.5),
  },
  timeValue: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.Primary,
  },
});

export default DateReminderSettingsScreen;