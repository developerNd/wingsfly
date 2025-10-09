import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Headers from '../../../../Components/Headers';
import DatePickerModal from '../../../../Components/DatePickerModal';
import BlockTimeModalOld from '../../../../Components/BlockTimeold';
import DurationModal from '../../../../Components/DurationModal';
import ReminderModal from '../../../../Components/ReminderModal';
import CustomToast from '../../../../Components/CustomToast';
import {HP, WP, FS} from '../../../../utils/dimentions';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../../../Helper/Contants';
import {taskService} from '../../../../services/api/taskService';
import {useAuth} from '../../../../contexts/AuthContext';
import {prepareTaskData} from '../../../../utils/taskDataHelper';
import ReminderScheduler from '../../../../services/notifications/ReminderScheduler';

const SchedulePreference = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const previousData = route.params || {};

  // Get evaluation type from previous data
  const evaluationType = previousData.evaluationType || null;

  const [endDateSelected, setEndDateSelected] = useState(false);
  const [addPomodoro, setAddPomodoro] = useState(false);
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [blockTimeData, setBlockTimeData] = useState(null);
  const [durationData, setDurationData] = useState(null);
  const [reminderData, setReminderData] = useState(null);
  const [pomodoroSettings, setPomodoroSettings] = useState(null);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Date picker states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Check if evaluation type is timer
  const isTimerEvaluation = evaluationType === 'timer';

  // Helper function to calculate duration from block time
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;

    // Parse time strings (assuming format like "10:00 AM" or "12:30 PM")
    const parseTime = timeStr => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);

      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }

      return {hours: hour24, minutes: minutes || 0};
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    // Calculate duration in minutes
    const startMinutes = start.hours * 60 + start.minutes;
    let endMinutes = end.hours * 60 + end.minutes;

    // Handle case where end time is next day
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }

    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return {
      hours,
      minutes,
      totalMinutes: durationMinutes,
      formattedDuration: `${String(hours).padStart(2, '0')}:${String(
        minutes,
      ).padStart(2, '0')}`,
    };
  };

  // Load data when screen comes into focus (when returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params && route.params.scheduleData) {
        const scheduleData = deserializeDatesFromNavigation(
          route.params.scheduleData,
        );

        // Restore all state from navigation params
        if (scheduleData.startDate) setStartDate(scheduleData.startDate);
        if (scheduleData.endDate) setEndDate(scheduleData.endDate);
        if (scheduleData.endDateSelected !== undefined)
          setEndDateSelected(scheduleData.endDateSelected);
        if (scheduleData.blockTimeData)
          setBlockTimeData(scheduleData.blockTimeData);
        if (scheduleData.durationData)
          setDurationData(scheduleData.durationData);
        if (scheduleData.addPomodoro !== undefined)
          setAddPomodoro(scheduleData.addPomodoro);
        if (scheduleData.reminderData)
          setReminderData(scheduleData.reminderData);
        if (scheduleData.addReminder !== undefined)
          setAddReminder(scheduleData.addReminder);
        if (scheduleData.addToGoogleCalendar !== undefined)
          setAddToGoogleCalendar(scheduleData.addToGoogleCalendar);
        if (scheduleData.pomodoroSettings)
          setPomodoroSettings(scheduleData.pomodoroSettings);
      }
    }, [route.params]),
  );

  // Toast helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Helper function to serialize dates for navigation
  const serializeDatesForNavigation = data => {
    if (!data) return data;

    const serialized = {...data};

    // Convert Date objects to ISO strings
    if (serialized.startDate instanceof Date) {
      serialized.startDate = serialized.startDate.toISOString();
    }
    if (serialized.endDate instanceof Date) {
      serialized.endDate = serialized.endDate.toISOString();
    }

    return serialized;
  };

  // Helper function to deserialize dates when receiving navigation params
  const deserializeDatesFromNavigation = data => {
    if (!data) return data;

    const deserialized = {...data};

    // Convert ISO strings back to Date objects
    if (typeof deserialized.startDate === 'string') {
      deserialized.startDate = new Date(deserialized.startDate);
    }
    if (typeof deserialized.endDate === 'string') {
      deserialized.endDate = new Date(deserialized.endDate);
    }

    return deserialized;
  };

  // Handle Pomodoro toggle with navigation to PomodoroSettings
  const handlePomodoroToggle = () => {
    // Only allow pomodoro for timer evaluation type
    if (!isTimerEvaluation) {
      return;
    }

    if (addPomodoro) {
      // If turning off, just disable and clear settings
      setAddPomodoro(false);
      setPomodoroSettings(null);
    } else {
      // Check if block time is available first
      if (!blockTimeData) {
        showToast('Please select a block time first to set up Pomodoro');
        return;
      }

      // Calculate duration from block time for Pomodoro
      let calculatedDuration = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        calculatedDuration = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
      }

      // Use calculated duration from block time or existing duration data
      const durationForPomodoro = calculatedDuration || durationData;

      if (!durationForPomodoro) {
        showToast(
          'Please select a block time first to calculate duration for Pomodoro',
        );
        return;
      }

      // If turning on, prepare current data and navigate to PomodoroSettings
      const currentData = {
        ...previousData,
        scheduleData: {
          startDate,
          endDate,
          endDateSelected,
          blockTimeData,
          durationData: durationForPomodoro, // Pass calculated duration
          addPomodoro: true, // Set to true for navigation
          reminderData,
          addReminder,
          addToGoogleCalendar,
          pomodoroSettings,
        },
      };

      // Serialize dates before navigation
      const serializedData = {
        ...currentData,
        scheduleData: serializeDatesForNavigation(currentData.scheduleData),
      };

      // Navigate to PomodoroSettings screen
      navigation.navigate('PomodoroSettings', serializedData);
    }
  };

  // Replace ONLY your existing handleDonePress function with this:
  const handleDonePress = async () => {
    // Hide any existing toast
    if (toastVisible) {
      hideToast();
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
      return;
    }

    // Your existing validation checks (keep these as they are)
    if (!durationData) {
      showToast('Select a Duration');
      return;
    }

    if (!blockTimeData) {
      showToast('Select a Block Time');
      return;
    }

    if (isTimerEvaluation && !addPomodoro) {
      showToast('Select a Pomodoro Timer');
      return;
    }

    if (addPomodoro && (!pomodoroSettings || !pomodoroSettings.focusTime)) {
      showToast('Please configure Pomodoro settings');
      return;
    }
    

    // Your existing schedule data preparation (keep this as is)
    const scheduleData = {
      startDate,
      endDate,
      endDateSelected,
      blockTimeData,
      durationData,
      addPomodoro,
      reminderData,
      addReminder,
      addToGoogleCalendar,
      pomodoroSettings,
    };

    const serializedScheduleData = serializeDatesForNavigation(scheduleData);
    const finalData = {
      ...previousData,
      scheduleData: serializedScheduleData,
    };

    try {
      // Your existing task data preparation (keep this as is)
      const taskData = prepareTaskData(finalData, scheduleData, user.id);

      // Your existing pomodoro settings (keep this as is)
      if (addPomodoro && pomodoroSettings) {
        let finalDuration = durationData;
        if (
          !finalDuration &&
          blockTimeData &&
          blockTimeData.startTime &&
          blockTimeData.endTime
        ) {
          finalDuration = calculateDuration(
            blockTimeData.startTime,
            blockTimeData.endTime,
          );
        }

        taskData.pomodoroDuration = finalDuration
          ? finalDuration.totalMinutes
          : null;

        taskData.focusDuration = pomodoroSettings.focusTime;
        taskData.shortBreakDuration = pomodoroSettings.shortBreak;
        taskData.longBreakDuration = pomodoroSettings.longBreak;
        taskData.focusSessionsPerRound = pomodoroSettings.focusSessionsPerRound;
        taskData.autoStartShortBreaks =
          pomodoroSettings.autoStartShortBreaks || false;
        taskData.autoStartFocusSessions =
          pomodoroSettings.autoStartFocusSessions || false;

        taskData.pomodoroSessionsCompleted = 0;
        taskData.pomodoroTotalSessions =
          pomodoroSettings.focusSessionsPerRound || 4;
      }

      // ADD THIS NEW SECTION - Prepare reminder data for task
      if (addReminder && reminderData) {
        taskData.reminderEnabled = true;
        taskData.reminderData = reminderData;

        // Add schedule info needed for reminder calculations
        taskData.startDate = startDate;
        taskData.endDate = endDateSelected ? endDate : null;
        taskData.isEndDateEnabled = endDateSelected;
        taskData.blockTimeData = blockTimeData;
        taskData.durationData = durationData;
        taskData.frequencyType = finalData.frequencyType;
        taskData.selectedWeekdays = finalData.selectedWeekdays;
        taskData.everyDays = finalData.everyDays;
      } else {
        taskData.reminderEnabled = false;
        taskData.reminderData = null;
      }

      console.log('Saving task data:', taskData);

      // Save to database (keep your existing save logic)
      const savedTask = await taskService.createTask(taskData);
      console.log('Task saved successfully:', savedTask);

      // ADD THIS NEW SECTION - Schedule reminders after task is saved
      let reminderMessage = '';
      if (taskData.reminderEnabled && taskData.reminderData) {
        try {
          // Get user profile for personalized TTS
          const userProfile = {
            username:
              user?.user_metadata?.display_name ||
              user?.user_metadata?.username ||
              user?.email?.split('@')[0],
            display_name: user?.user_metadata?.display_name,
            user_metadata: user?.user_metadata,
            email: user?.email,
          };

          const scheduledReminders =
            await ReminderScheduler.scheduleTaskReminders(
              {
                ...taskData,
                userProfile: userProfile,
              },
              savedTask,
            );

          if (scheduledReminders.length > 0) {
            reminderMessage = ` ${scheduledReminders.length} reminder(s) scheduled.`;
            console.log('Scheduled reminders:', scheduledReminders);
          }
        } catch (reminderError) {
          console.error('Error scheduling reminders:', reminderError);
          // Don't fail the entire task creation if reminder scheduling fails
          reminderMessage = ' (Note: Reminders could not be scheduled)';
        }
      }

      // Update your success alert to include reminder info
      Alert.alert('Success', `Task created successfully!${reminderMessage}`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'BottomTab',
                  params: {newTaskCreated: true},
                },
              ],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  // Handle Link To Goal press with validation
  const handleLinkToGoalPress = () => {
    if (toastVisible) {
      hideToast();
    }

    if (!durationData) {
      showToast('Select a Duration');
      return;
    }

    if (!blockTimeData) {
      showToast('Select a Block Time');
      return;
    }

    const currentData = {
      ...previousData,
      scheduleData: {
        startDate,
        endDate,
        endDateSelected,
        blockTimeData,
        durationData,
        addPomodoro,
        reminderData,
        addReminder,
        addToGoogleCalendar,
        pomodoroSettings,
      },
    };

    // Serialize dates before navigation
    const serializedData = {
      ...currentData,
      scheduleData: serializeDatesForNavigation(currentData.scheduleData),
    };

    navigation.navigate('LinkGoal', serializedData);
  };

  const formatDisplayDate = date => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return 'Today';
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${dayName}, ${monthName} ${day}`;
  };

  const formatDateForEndDate = date => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  };

  const calculateDaysDifference = (startDate, endDate) => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  const handleEndDateSelect = date => {
    setEndDate(date);
    setEndDateSelected(true);
    setShowEndDatePicker(false);
  };

  const handleEndDateToggle = () => {
    if (endDateSelected) {
      setEndDateSelected(false);
    } else {
      setShowEndDatePicker(true);
    }
  };

  const handleDurationPress = () => {
    setShowDurationModal(true);
  };

  const handleDurationSave = durationData => {
    setDurationData(durationData);
    if (toastVisible) {
      hideToast();
    }
  };

  const handleBlockTimePress = () => {
    setShowBlockTimeModal(true);
  };

  const handleBlockTimeSave = timeData => {
    setBlockTimeData(timeData);

    // Automatically calculate duration from block time
    if (timeData && timeData.startTime && timeData.endTime) {
      const calculatedDuration = calculateDuration(
        timeData.startTime,
        timeData.endTime,
      );

      // Update duration data if it's not manually set or if we want to override
      if (!durationData) {
        setDurationData(calculatedDuration);
      }
    }

    if (toastVisible) {
      hideToast();
    }
  };

  // Handlers for reminder functionality
  const handleReminderToggle = () => {
    if (addReminder) {
      setAddReminder(false);
      setReminderData(null);
    } else {
      setShowReminderModal(true);
    }
  };

  const handleReminderSave = data => {
    setReminderData(data);
    setAddReminder(data.enabled);
  };

  const handleReminderClose = () => {
    setShowReminderModal(false);
  };

  const renderToggle = (isEnabled, onToggle) => {
    return (
      <TouchableOpacity
        style={styles.toggleContainer}
        onPress={onToggle}
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

  const renderOptionRow = (
    iconSource,
    title,
    hasToggle = false,
    toggleState = false,
    onTogglePress = null,
    hasPlus = false,
    onPlusPress = null,
    subtitle = null,
    customRight = null,
    onRowPress = null,
  ) => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={onRowPress ? 0.7 : hasToggle || hasPlus ? 1 : 0.7}
          onPress={onRowPress || (() => {})}>
          <View style={styles.optionLeft}>
            <Image
              source={iconSource}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            {hasToggle && renderToggle(toggleState, onTogglePress)}
            {hasPlus && (
              <TouchableOpacity
                onPress={onPlusPress}
                style={styles.plusButton}
                activeOpacity={0.7}>
                <Image
                  source={Icons.Plus}
                  style={styles.plusIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            {customRight && customRight}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEndDateSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Set}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>End Date</Text>
            </View>
          </View>

          <View style={styles.optionRight}>
            {renderToggle(endDateSelected, handleEndDateToggle)}
          </View>
        </TouchableOpacity>

        {endDateSelected && (
          <View style={styles.endDateDetailsContainer}>
            <TouchableOpacity
              onPress={() => setShowEndDatePicker(true)}
              style={styles.endDateDetailRow}
              activeOpacity={0.7}>
              <Text style={styles.endDateLabel}>
                {formatDateForEndDate(endDate)}
              </Text>
              <View style={styles.daysDifferenceContainer}>
                <Text style={styles.daysDifferenceNumber}>
                  {calculateDaysDifference(startDate, endDate)}
                </Text>
                <Text style={styles.daysDifferenceText}>days.</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderDurationSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handleDurationPress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Clock}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Duration</Text>
              {durationData && (
                <Text style={styles.optionSubtitle}>
                  {durationData.formattedDuration ||
                    `${durationData.hours}h ${durationData.minutes}m`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity
              onPress={handleDurationPress}
              style={styles.plusButton}
              activeOpacity={0.7}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBlockTimeSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handleBlockTimePress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Alarm}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Block Time</Text>
              {blockTimeData && (
                <Text style={styles.optionSubtitle}>
                  {blockTimeData.startTime} - {blockTimeData.endTime}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity
              onPress={handleBlockTimePress}
              style={styles.plusButton}
              activeOpacity={0.7}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPomodoroSection = () => {
    // Only show Pomodoro section if evaluation type is timer
    if (!isTimerEvaluation) {
      return null;
    }

    // Format pomodoro settings display (focus, break, sessions only)
    const formatPomodoroDisplay = () => {
      if (!pomodoroSettings) return null;

      const focusTime = pomodoroSettings.focusTime || 25;
      const shortBreak = pomodoroSettings.shortBreak || 5;
      const sessionsPerRound = pomodoroSettings.focusSessionsPerRound || 4;

      return `${focusTime}min focus, ${shortBreak}min break, ${sessionsPerRound} sessions`;
    };

    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Clock}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Add Pomodoro</Text>
              {addPomodoro && pomodoroSettings && (
                <Text style={styles.optionSubtitle}>
                  {formatPomodoroDisplay()}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            {renderToggle(addPomodoro, handlePomodoroToggle)}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReminderSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.addTitle}>Add a Reminder</Text>
              {reminderData && addReminder && (
                <Text style={styles.optionSubtitle1}>
                  {reminderData.type === 'notification'
                    ? '🔔 Notification'
                    : reminderData.type === 'alarm'
                    ? '⏰ Alarm'
                    : '🔕 No reminder'}{' '}
                  at {reminderData.time}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.optionRight}>
            {renderToggle(addReminder, handleReminderToggle)}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLinkGoalSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handleLinkToGoalPress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Link}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Link To Goal</Text>
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity
              style={styles.plusButton}
              activeOpacity={0.7}
              onPress={handleLinkToGoalPress}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="What Schedule Would You Prefer?">
          <TouchableOpacity onPress={handleDonePress}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Start Date */}
        {renderOptionRow(
          Icons.Set,
          'Start Date',
          false,
          false,
          null,
          false,
          null,
          null,
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDisplayDate(startDate)}</Text>
          </View>,
          () => setShowStartDatePicker(true),
        )}

        {/* End Date Section */}
        {renderEndDateSection()}

        {/* Duration - Now above Block Time */}
        {renderDurationSection()}

        {/* Block Time - Now below Duration */}
        {renderBlockTimeSection()}

        {/* Add Pomodoro - Only show for timer evaluation type */}
        {renderPomodoroSection()}

        {/* Add a Reminder */}
        {renderReminderSection()}

        {/* Add to Google Calendar with connected Select Calendar */}
        <View style={styles.calendarContainer}>
          <View
            style={[
              styles.optionContainer,
              addToGoogleCalendar ? styles.noBottomBorder : null,
            ]}>
            <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
              <View style={styles.optionLeft}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Add to Google Calendar</Text>
                </View>
              </View>

              <View>
                {renderToggle(addToGoogleCalendar, () =>
                  setAddToGoogleCalendar(!addToGoogleCalendar),
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Select Calendar - Only show if Google Calendar is enabled */}
          {addToGoogleCalendar && (
            <View style={[styles.optionContainer, styles.connectedContainer]}>
              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle1}>Select Calendar</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Link To Goal - Now with navigation functionality */}
        {renderLinkGoalSection()}

        {/* Spacer for bottom content */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Progress Indicator */}
      <View style={styles.progressIndicator}>
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotActive}>
          <View style={styles.progressDotActiveInner}>
            <Text style={styles.progressDotTextActive}>4</Text>
          </View>
        </View>
      </View>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onDateSelect={handleEndDateSelect}
        initialDate={endDate}
        title="Select End Date"
      />

      {/* Duration Modal */}
      <DurationModal
        visible={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSave={handleDurationSave}
        initialData={durationData}
      />

      {/* Block Time Modal */}
      <BlockTimeModalOld
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
      />

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
        blockTimeData={blockTimeData}
      />

      {/* Custom Toast */}
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
    marginTop: HP(2.5),
    paddingBottom: HP(0.625),
  },
  doneText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3),
    paddingTop: HP(1.3),
  },
  optionContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(0.9),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
  },
  noBottomBorder: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  connectedContainer: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    position: 'relative',
    borderTopWidth: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: WP(1),
    marginLeft: WP(-0.5),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(3),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.75),
  },
  optionTitle1: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.5),
    top: -2,
  },
  addTitle: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    paddingVertical: HP(0.8),
    marginLeft: WP(3),
  },
  optionSubtitle: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
  },
  optionSubtitle1: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(-0.4),
    marginLeft: WP(2.3),
  },
  optionValue: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
  },
  dateContainer: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(5),
    paddingVertical: HP(1),
    borderRadius: WP(1.5),
    marginRight: WP(-1.5),
  },
  dateText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#5F5F5F',
  },
  plusButton: {
    padding: WP(0.5),
  },
  plusIcon: {
    width: WP(3.7),
    height: WP(3.7),
    tintColor: '#646464',
  },
  toggleContainer: {
    width: WP(8.0),
    height: HP(2.0),
    position: 'relative',
    justifyContent: 'center',
    marginRight: WP(-0.8),
  },
  toggleTrack: {
    width: WP(8.0),
    height: HP(2.0),
    borderRadius: WP(2.7),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toggleTrackActive: {
    backgroundColor: colors.Primary,
  },
  toggleTrackInactive: {
    backgroundColor: '#CAC9C9',
  },
  toggleSwitch: {
    width: WP(3),
    height: WP(3),
    borderRadius: WP(1.5),
    position: 'absolute',
    top: HP(0.25),
    left: WP(0.5),
  },
  toggleSwitchActive: {
    backgroundColor: colors.White,
    left: WP(4.2),
  },
  toggleSwitchInactive: {
    backgroundColor: colors.White,
    left: WP(0.5),
  },
  endDateDetailsContainer: {
    //  marginTop: HP(1),
  },
  endDateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.8),
  },
  endDateLabel: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    letterSpacing: 0.5,
    marginRight: WP(4),
    backgroundColor: '#EFEFEF',
    paddingHorizontal: WP(2),
    paddingVertical: HP(0.6),
    borderRadius: WP(2.2),
  },
  daysDifferenceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  daysDifferenceNumber: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    textAlign: 'center',
    marginRight: WP(3),
    borderBottomWidth: 2,
    borderColor: '#F0F0F0',
    minWidth: WP(14),
  },
  daysDifferenceText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
  },
  bottomSpacer: {
    height: HP(3),
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: HP(2.7),
  },
  progressDotCompleted: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
  },
  checkIcon: {
    width: WP(3.2),
    height: WP(3.2),
    tintColor: colors.White,
  },
  progressDotActive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.6),
    backgroundColor: colors.White,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WP(0.68),
    borderColor: colors.Primary,
  },
  progressDotActiveInner: {
    width: WP(3.65),
    height: WP(3.6),
    borderRadius: WP(1.8),
    backgroundColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextActive: {
    color: colors.White,
    fontSize: FS(1.1),
    fontFamily: 'OpenSans-Bold',
  },
  progressLine: {
    width: WP(5.3),
    height: HP(0.16),
    marginLeft: WP(0.5),
    marginRight: WP(0.5),
    backgroundColor: colors.Primary,
  },
});

export default SchedulePreference;
