import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppItem = ({app, onSchedulePress, onUsageLimitPress, onLongPress, loading}) => {
  const isActuallyLocked = app.isActuallyLocked !== undefined ? app.isActuallyLocked : app.isLocked;
  const hasSchedules = app.schedules && app.schedules.length > 0;
  const schedulesEnabled = hasSchedules;
  const hasActiveSchedule = hasSchedules && isActuallyLocked !== undefined;
  const isExcludedFromPomodoro = app.excludeFromPomodoro === true;

  const formatUsageTime = minutes => {
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

  const hasUsageLimit = app.usageLimit > 0;
  const isLimitReached = app.isLimitReached === true;
  const usageToday = app.usageToday || 0;
  const usageLimit = app.usageLimit || 0;

  const getLockStatus = () => {
    if (isLimitReached) {
      return {
        type: 'usage_limit',
        text: 'Usage limit reached',
        color: '#F44336',
      };
    } else if (isActuallyLocked) {
      return {type: 'schedule', text: 'Locked by schedule', color: '#2E7D32'};
    } else if (hasSchedules) {
      return {type: 'schedule', text: 'Unlocked by schedule', color: '#4CAF50'};
    }
    return null;
  };

  const lockStatus = getLockStatus();

  return (
    <View
      style={[
        styles.appItem,
        app.isDistractive && styles.distractiveAppItem,
        hasActiveSchedule && styles.scheduledAppItem,
        isLimitReached && styles.limitReachedAppItem,
      ]}>
      
      {/* FIXED: Separate TouchableOpacity for long press on the entire item */}
      <TouchableOpacity
        style={styles.longPressArea}
        onLongPress={() => {
          console.log('🔴 Long press triggered for:', app.name);
          onLongPress && onLongPress(app);
        }}
        delayLongPress={800}
        activeOpacity={0.8}>
        
        <Image source={{uri: app.icon}} style={styles.appIcon} />

        <View style={styles.appInfoContainer}>
          <View style={styles.appDetailsContainer}>
            <Text style={styles.appName} numberOfLines={1}>
              {app.name}
            </Text>

            {hasUsageLimit && (
              <View style={styles.usageContainer}>
                <Text
                  style={[
                    styles.usageText,
                    isLimitReached && styles.limitReachedText,
                  ]}>
                  {formatUsageTime(usageToday)} / {formatUsageTime(usageLimit)}
                </Text>
                {isLimitReached && (
                  <Icon
                    name="hourglass-empty"
                    size={14}
                    color="#F44336"
                    style={styles.limitIcon}
                  />
                )}
              </View>
            )}

            <View style={styles.tagsContainer}>
              {app.isDistractive && (
                <View style={styles.distractiveTag}>
                  <Text style={styles.distractiveTagText}>Distractive</Text>
                </View>
              )}

              {lockStatus && (
                <View
                  style={[
                    styles.statusTag,
                    lockStatus.type === 'usage_limit' && styles.usageLimitTag,
                    lockStatus.type === 'schedule' &&
                      isActuallyLocked &&
                      styles.scheduleLockedTag,
                    lockStatus.type === 'schedule' &&
                      !isActuallyLocked &&
                      styles.scheduleUnlockedTag,
                  ]}>
                  <Text style={styles.statusTagText}>{lockStatus.text}</Text>
                </View>
              )}

              {isExcludedFromPomodoro && (
                <View style={styles.pomodoroExcludeTag}>
                  <Icon name="timer-off" size={12} color="white" />
                  <Text style={styles.pomodoroExcludeTagText}>Excluded</Text>
                </View>
              )}
            </View>
          </View>

          {/* FIXED: Separate action buttons that don't interfere with long press */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.usageLimitButton,
                hasUsageLimit && styles.activeUsageLimitButton,
              ]}
              onPress={() => {
                console.log('Usage limit button pressed for:', app.name);
                !loading && onUsageLimitPress && onUsageLimitPress();
              }}
              disabled={loading}>
              <Icon
                name="timer"
                size={20}
                color={hasUsageLimit ? '#FF9800' : '#757575'}
              />
              {hasUsageLimit && (
                <View style={styles.limitIndicator}>
                  <Text style={styles.limitIndicatorText}>
                    {formatUsageTime(usageLimit)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.scheduleButton,
                hasSchedules && styles.activeScheduleButton,
              ]}
              onPress={() => {
                console.log('Schedule button pressed for:', app.name);
                !loading && onSchedulePress();
              }}
              disabled={loading}>
              <Icon
                name="schedule"
                size={20}
                color={hasSchedules ? '#2E7D32' : '#757575'}
              />
              {hasSchedules && (
                <View style={styles.scheduleIndicator}>
                  <Text style={styles.scheduleIndicatorText}>
                    {app.schedules.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  appItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  longPressArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    width: '100%',
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
  appDetailsContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  usageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  usageText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  limitReachedText: {
    color: '#F44336',
    fontWeight: '600',
  },
  limitIcon: {
    marginLeft: 4,
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
  scheduledAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  limitReachedAppItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  distractiveTag: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  distractiveTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  usageLimitTag: {
    backgroundColor: '#F44336',
  },
  scheduleLockedTag: {
    backgroundColor: '#2E7D32',
  },
  scheduleUnlockedTag: {
    backgroundColor: '#4CAF50',
  },
  statusTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pomodoroExcludeTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pomodoroExcludeTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  usageLimitButton: {
    // Base styles already defined
  },
  activeUsageLimitButton: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  limitIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 14,
    maxWidth: 30,
  },
  limitIndicatorText: {
    color: 'white',
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scheduleButton: {
    // Base styles already defined
  },
  activeScheduleButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  scheduleIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
  },
  scheduleIndicatorText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AppItem;