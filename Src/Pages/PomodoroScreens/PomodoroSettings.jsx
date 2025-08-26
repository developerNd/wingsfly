import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {useRoute, useNavigation} from '@react-navigation/native';

const {width, height} = Dimensions.get('window');

const PomodoroSettings = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const routeParams = route.params || {};
  
  // Get duration data from route params
  const scheduleData = routeParams.scheduleData || {};
  const durationData = scheduleData.durationData;

  // Identify the calling screen
  const callingScreen = routeParams.screenType || 'unknown';

  // State for all settings
  const [settings, setSettings] = useState({
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStartShortBreaks: true,
    autoStartFocusSessions: false,
    focusSessionsPerRound: 4,
    dailyGoal: true,
    dailyFocusSessionGoal: 8,
    reminder: false,
  });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTimerType, setCurrentTimerType] = useState('');
  const [tempValue, setTempValue] = useState(0);

  // States for focus sessions per round modal
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [tempSessions, setTempSessions] = useState(4);

  // States for daily goal modal
  const [dailyGoalModalVisible, setDailyGoalModalVisible] = useState(false);
  const [tempDailyGoal, setTempDailyGoal] = useState(8);

  // Load existing pomodoro settings if available
  useEffect(() => {
    if (scheduleData.pomodoroSettings) {
      setSettings(prev => ({
        ...prev,
        ...scheduleData.pomodoroSettings
      }));
    }
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({...prev, [key]: value}));
  };

  // Format duration display
  const formatDurationDisplay = () => {
    if (!durationData) return 'Duration not set';
    
    const { hours, minutes, formattedDuration } = durationData;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return formattedDuration || 'Duration not set';
    }
  };

  const openTimeModal = (type) => {
    setCurrentTimerType(type);
    let currentValue;
    switch (type) {
      case 'focus':
        currentValue = settings.focusTime;
        break;
      case 'shortBreak':
        currentValue = settings.shortBreak;
        break;
      case 'longBreak':
        currentValue = settings.longBreak;
        break;
      default:
        currentValue = 0;
    }
    setTempValue(currentValue);
    setModalVisible(true);
  };

  const openSessionsModal = () => {
    setTempSessions(settings.focusSessionsPerRound);
    setSessionsModalVisible(true);
  };

  const openDailyGoalModal = () => {
    setTempDailyGoal(settings.dailyFocusSessionGoal);
    setDailyGoalModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentTimerType('');
    setTempValue(0);
  };

  const closeSessionsModal = () => {
    setSessionsModalVisible(false);
    setTempSessions(4);
  };

  const closeDailyGoalModal = () => {
    setDailyGoalModalVisible(false);
    setTempDailyGoal(8);
  };

  const saveTimeValue = () => {
    switch (currentTimerType) {
      case 'focus':
        updateSetting('focusTime', tempValue);
        break;
      case 'shortBreak':
        updateSetting('shortBreak', tempValue);
        break;
      case 'longBreak':
        updateSetting('longBreak', tempValue);
        break;
    }
    closeModal();
  };

  const saveSessionsValue = () => {
    updateSetting('focusSessionsPerRound', tempSessions);
    closeSessionsModal();
  };

  const saveDailyGoalValue = () => {
    updateSetting('dailyFocusSessionGoal', tempDailyGoal);
    closeDailyGoalModal();
  };

  const incrementValue = () => {
    if (tempValue < 60) {
      setTempValue(tempValue + 1);
    }
  };

  const decrementValue = () => {
    if (tempValue > 1) {
      setTempValue(tempValue - 1);
    }
  };

  const incrementSessions = () => {
    if (tempSessions < 12) {
      setTempSessions(tempSessions + 1);
    }
  };

  const decrementSessions = () => {
    if (tempSessions > 1) {
      setTempSessions(tempSessions - 1);
    }
  };

  const incrementDailyGoal = () => {
    if (tempDailyGoal < 50) {
      setTempDailyGoal(tempDailyGoal + 1);
    }
  };

  const decrementDailyGoal = () => {
    if (tempDailyGoal > 1) {
      setTempDailyGoal(tempDailyGoal - 1);
    }
  };

  const getModalTitle = () => {
    switch (currentTimerType) {
      case 'focus':
        return 'FOCUS';
      case 'shortBreak':
        return 'SHORT BREAK';
      case 'longBreak':
        return 'LONG BREAK';
      default:
        return '';
    }
  };

  // UNIFIED SAVE FUNCTION - Handles all navigation scenarios
  const handleSave = () => {
    try {
      // Validate settings
      if (settings.focusTime <= 0) {
        Alert.alert('Invalid Settings', 'Focus time must be greater than 0');
        return;
      }

      if (settings.focusSessionsPerRound <= 0) {
        Alert.alert('Invalid Settings', 'Focus sessions per round must be greater than 0');
        return;
      }

      // Prepare pomodoro settings data
      const pomodoroSettingsData = {
        focusTime: settings.focusTime,
        shortBreak: settings.shortBreak,
        longBreak: settings.longBreak,
        autoStartShortBreaks: settings.autoStartShortBreaks,
        autoStartFocusSessions: settings.autoStartFocusSessions,
        focusSessionsPerRound: settings.focusSessionsPerRound,
        dailyGoal: settings.dailyGoal,
        dailyFocusSessionGoal: settings.dailyFocusSessionGoal,
        reminder: settings.reminder,
      };

      // Navigate based on calling screen
      switch (callingScreen) {
        case 'RecurringTimer':
          // Return to RecurringTimerScreen with pomodoro settings
          navigation.navigate('RecurringTimerScreen', {
            ...routeParams,
            pomodoroSettings: pomodoroSettingsData,
            // Remove non-serializable function
            onPomodoroSave: undefined
          });
          break;
          
        case 'GoalScreen':
          // Return to GoalScreen with pomodoro settings
          navigation.navigate('GoalTaskScreen', {
            ...routeParams,
            pomodoroSettings: pomodoroSettingsData,
            // Remove non-serializable function
            onPomodoroSave: undefined
          });
          break;
          
        default:
          // Default behavior - navigate to SchedulePreference
          const updatedScheduleData = {
            ...scheduleData,
            pomodoroSettings: pomodoroSettingsData,
            addPomodoro: true,
          };

          navigation.navigate('SchedulePreference', {
            ...routeParams,
            scheduleData: updatedScheduleData,
            // Remove non-serializable function
            onPomodoroSave: undefined
          });
          break;
      }

    } catch (error) {
      console.error('Error saving pomodoro settings:', error);
      Alert.alert('Error', 'Failed to save Pomodoro settings. Please try again.');
    }
  };

  // Handle back button press
  const handleBack = () => {
    // Navigate back without saving
    navigation.goBack();
  };

  const renderTimeSelector = (label, value, onPress) => (
    <View style={styles.timeSelectorContainer}>
      <TouchableOpacity style={styles.timeValueContainer} onPress={onPress}>
        <Text style={styles.timeValue}>{value}</Text>
      </TouchableOpacity>
      <Text style={styles.timeSelectorLabel}>{label}</Text>
    </View>
  );

  const renderToggle = (isEnabled, onToggle) => {
    return (
      <TouchableOpacity
        style={styles.toggleContainer}
        onPress={() => onToggle(!isEnabled)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.toggleTrack,
            isEnabled ? styles.toggleTrackActive : styles.toggleTrackInactive,
          ]}>
          <View
            style={[
              styles.toggleSwitch,
              isEnabled
                ? styles.toggleSwitchActive
                : styles.toggleSwitchInactive,
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderToggleSetting = (label, value, onToggle, extraMargin = false) => (
    <View style={[styles.optionContainer, extraMargin && styles.extraMarginBottom]}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        {renderToggle(value, onToggle)}
      </View>
    </View>
  );

  const renderClickableSetting = (label, value, onPress, extraMargin = false) => (
    <View style={[styles.optionContainer, extraMargin && styles.extraMarginBottom]}>
      <TouchableOpacity style={styles.settingRow} onPress={onPress}>
        <Text style={styles.settingLabel}>{label}</Text>
        <View style={styles.clickableValue}>
          <Text style={styles.clickableValueText}>{value}</Text>
          <Icon 
            name="keyboard-arrow-down" 
            size={FS(2.2)} 
            color={colors.White} 
            style={styles.dropdownIcon}
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderTimePickerModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{getModalTitle()}</Text>
          
          <View style={styles.timePickerContainer}>
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={decrementValue}>
              <Icon name="remove" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
            
            <View style={styles.timeDisplayContainer}>
              <Text style={styles.timeDisplayValue}>{tempValue}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={incrementValue}>
              <Icon name="add" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkmarkContainer}>
            <TouchableOpacity 
              style={styles.checkmarkButton} 
              onPress={saveTimeValue}>
              <Icon name="check" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSessionsModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={sessionsModalVisible}
      onRequestClose={closeSessionsModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>FOCUS SESSIONS</Text>
          
          <View style={styles.timePickerContainer}>
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={decrementSessions}>
              <Icon name="remove" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
            
            <View style={styles.timeDisplayContainer}>
              <Text style={styles.timeDisplayValue}>{tempSessions}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={incrementSessions}>
              <Icon name="add" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkmarkContainer}>
            <TouchableOpacity 
              style={styles.checkmarkButton} 
              onPress={saveSessionsValue}>
              <Icon name="check" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDailyGoalModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={dailyGoalModalVisible}
      onRequestClose={closeDailyGoalModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>DAILY GOAL</Text>
          
          <View style={styles.timePickerContainer}>
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={decrementDailyGoal}>
              <Icon name="remove" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
            
            <View style={styles.timeDisplayContainer}>
              <Text style={styles.timeDisplayValue}>{tempDailyGoal}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.timeButton} 
              onPress={incrementDailyGoal}>
              <Icon name="add" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkmarkContainer}>
            <TouchableOpacity 
              style={styles.checkmarkButton} 
              onPress={saveDailyGoalValue}>
              <Icon name="check" size={FS(3)} color= "#424141" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F1316" barStyle="light-content" />

      {/* Custom Header with Back Button */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={FS(2.5)} color={colors.White} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pomodoro Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Duration Section - Shows task duration */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Task Duration: {formatDurationDisplay()}</Text>
        </View>

        {/* Time Selectors - Three separate backgrounds in a row */}
        <View style={styles.timeSelectorsRow}>
          <View style={styles.individualTimeSelectorContainer}>
            {renderTimeSelector('Focus', settings.focusTime, () => openTimeModal('focus'))}
          </View>
          <View style={styles.individualTimeSelectorContainer}>
            {renderTimeSelector('Short break', settings.shortBreak, () => openTimeModal('shortBreak'))}
          </View>
          <View style={styles.individualTimeSelectorContainer}>
            {renderTimeSelector('Long break', settings.longBreak, () => openTimeModal('longBreak'))}
          </View>
        </View>

        {renderToggleSetting(
          'Auto start short breaks',
          settings.autoStartShortBreaks,
          value => updateSetting('autoStartShortBreaks', value),
        )}

        {renderToggleSetting(
          'Auto start focus sessions',
          settings.autoStartFocusSessions,
          value => updateSetting('autoStartFocusSessions', value),
        )}

        {renderClickableSetting(
          'Focus sessions per round',
          settings.focusSessionsPerRound,
          openSessionsModal,
          true 
        )}

        {renderToggleSetting('Daily goal', settings.dailyGoal, value =>
          updateSetting('dailyGoal', value),
        )}

        {renderClickableSetting(
          'Daily Focus Session Goal',
          settings.dailyFocusSessionGoal,
          openDailyGoalModal,
          true 
        )}

        {renderToggleSetting('Reminder', settings.reminder, value =>
          updateSetting('reminder', value),
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderTimePickerModal()}
      {renderSessionsModal()}
      {renderDailyGoalModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1316',
  },
  headerContainer: {
    paddingTop: HP(3),
    paddingHorizontal: WP(4),
    paddingBottom: HP(2),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: WP(1),
  },
  headerTitle: {
    fontSize: FS(2.2),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
    flex: 1,
    textAlign: 'center',
    marginLeft: WP(-8), // Compensate for back button width
  },
  headerSpacer: {
    width: WP(8), // Same width as back button for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
  },
  sectionContainer: {
    backgroundColor: '#1D2124',
    borderRadius: WP(4),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.7),
    marginBottom: HP(2),
    borderColor: '#2A2A2A',
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: "#C3C3C3",
  },
  timeSelectorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(2.3),
    gap: WP(2.8),
  },
  individualTimeSelectorContainer: {
    backgroundColor: '#1D2124',
    borderRadius: WP(4),
    paddingHorizontal: WP(2.5),
    paddingVertical: HP(1.3),
    flex: 1,
    alignItems: 'center',
    borderColor: '#2A2A2A',
    borderWidth: 1,
  },
  timeSelectorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  timeValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(0.3),
  },
  timeValue: {
    fontSize: FS(3.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  timeSelectorLabel: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
    color: "#ADADAD",
    textAlign: 'center',
    marginBottom: HP(1.5),
  },
  optionContainer: {
    backgroundColor: '#1D2124',
    borderRadius: WP(4),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.75),
    marginBottom: HP(1.7),
    borderColor: '#2A2A2A',
    borderWidth: 1,
  },
  extraMarginBottom: {
    marginBottom: HP(2.8),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-Regular',
    color: "#C3C3C3",
    flex: 1,
  },
  toggleContainer: {
    width: WP(12),
    height: HP(3),
    justifyContent: 'center',
    marginRight: WP(-2)
  },
  toggleTrack: {
    width: WP(10),
    height: HP(2.5),
    borderRadius: HP(1.5),
    justifyContent: 'center',
    position: 'relative',
  },
  toggleTrackActive: {
    backgroundColor: colors.Primary,
  },
  toggleTrackInactive: {
    backgroundColor: '#302F34',
  },
  toggleSwitch: {
    width: WP(4),
    height: WP(4),
    borderRadius: WP(2),
    backgroundColor: '#E0E0E0',
    position: 'absolute',
    top: HP(0.25),
  },
  toggleSwitchActive: {
    right: WP(1),
  },
  toggleSwitchInactive: {
    left: WP(1),
  },
  clickableValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickableValueText: {
    fontSize: FS(1.7),
    fontFamily: 'OpenSans-SemiBold',
    color: "#C3C3C3",
  },
  dropdownIcon: {
    marginLeft: WP(1),
  },
  bottomSpacer: {
    height: HP(3),
  },
  // Save Button Styles
  saveButtonContainer: {
    paddingHorizontal: WP(4),
    paddingVertical: HP(2),
    backgroundColor: '#0F1316',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  saveButton: {
    backgroundColor: colors.Primary,
    borderRadius: WP(3),
    paddingVertical: HP(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-Bold',
    color: colors.White,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#484747D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: WP(6),
    paddingHorizontal: WP(8),
    alignItems: 'center',
    minWidth: WP(70),
  },
  modalTitle: {
    fontSize: FS(1.85),
    fontFamily: 'OpenSans-SemiBold',
    color: "#CDCDCD",
    marginBottom: HP(0.5),
    letterSpacing: 1,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(2),
  },
  timeButton: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: colors.White,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: WP(8),
  },
  timeDisplayContainer: {
    minWidth: WP(20),
    alignItems: 'center',
  },
  timeDisplayValue: {
    fontSize: FS(8.7),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.White,
  },
  checkmarkContainer: {
    alignItems: 'center',
  },
  checkmarkButton: {
    width: WP(8),
    height: WP(8),
    borderRadius: WP(4),
    backgroundColor: "#FFFFFF",
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PomodoroSettings;