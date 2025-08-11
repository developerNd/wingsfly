import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppItem = ({ app, onSchedulePress, loading }) => {
  // Determine if app is actually locked right now based on schedule
  const isActuallyLocked = app.isActuallyLocked !== undefined ? app.isActuallyLocked : app.isLocked;
  
  // Determine if app has schedules
  const hasSchedules = app.schedules && app.schedules.length > 0;
  
  // Apps are always considered enabled when they have schedules
  const schedulesEnabled = hasSchedules;
  
  // Determine if app is currently affected by a schedule that's active right now
  const hasActiveSchedule = hasSchedules && isActuallyLocked !== undefined;

  // Check if app is excluded from Pomodoro
  const isExcludedFromPomodoro = app.excludeFromPomodoro === true;

  return (
    <TouchableOpacity 
      style={[
        styles.appItem,
        app.isDistractive && styles.distractiveAppItem,
        hasActiveSchedule && styles.scheduledAppItem
      ]}
      onPress={() => !loading && onSchedulePress()}
    >
      <Image
        source={{uri: `data:image/png;base64,${app.icon}`}}
        style={styles.appIcon}
      />
      <View style={styles.appInfoContainer}>
        <View style={styles.appNameContainer}>
          <Text style={styles.appName} numberOfLines={1}>
            {app.name}
          </Text>
          
          {/* Tags container for better layout */}
          <View style={styles.tagsContainer}>
            {app.isDistractive && (
              <View style={styles.distractiveTag}>
                <Text style={styles.distractiveTagText}>Distractive</Text>
              </View>
            )}
            
            {hasSchedules && (
              <View style={[styles.scheduleTag]}>
                <Text style={styles.scheduleTagText}>
                  {isActuallyLocked ? 'Locked by schedule' : 'Unlocked by schedule'}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          {/* Pomodoro exclusion icon in action area */}
          {isExcludedFromPomodoro && (
            <View style={styles.pomodoroExcludeIcon}>
              <Icon name="timer-off" size={20} color="#FF9800" />
            </View>
          )}
          
          {hasSchedules ? (
            <Icon name="schedule" size={24} color="#2E7D32" />
          ) : (
            <View style={[styles.noSchedulesIndicator]}>
              <Icon name="schedule" size={20} color="#757575" style={{ opacity: 0.5 }} />
              <Text style={styles.noSchedulesText}>No Schedules</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 16,
  },
  appInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNameContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  distractiveAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  distractiveTag: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  distractiveTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduledAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  scheduleTag: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  scheduleTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pomodoroExcludeTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
  },
  pomodoroExcludeTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledScheduleTag: {
    backgroundColor: '#757575',
  },
  noSchedulesIndicator: {
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  noSchedulesText: {
    color: '#757575',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pomodoroExcludeIcon: {
    padding: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppItem;