import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import ReminderModal from '../../../Components/ReminderModal';
import CustomToast from '../../../Components/CustomToast';
import {HP, WP, FS} from '../../../utils/dimentions';
import {colors, Icons} from '../../../Helper/Contants';
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';
import taskConfirmationAlarmManager from '../../../services/TaskConfirmation/taskConfirmationAlarmManager';
import BlockTimeScheduler from '../../../services/Alarm/BlockTimeScheduler';

const PlanTimerTrackerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  const previousData = route.params || {};

  // Task name states
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [taskNameFocused, setTaskNameFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  // Schedule states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endDateSelected, setEndDateSelected] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Start Time states
  const [startTime, setStartTime] = useState(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  // Feature toggles
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState(null);

  // Priority states
  const [priority, setPriority] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Label states
  const isTaskNameLabelActive = taskNameFocused || taskName.length > 0;
  const isDescriptionLabelActive = descriptionFocused || description.length > 0;

  // Priority options
  const priorityOptions = [
    {
      label: 'Must',
      value: 'Must',
      backgroundColor: '#EFCCCC',
      textColor: '#AF0000',
    },
    {
      label: 'Important',
      value: 'Important',
      backgroundColor: '#D0D1E3',
      textColor: colors.Primary,
    },
  ];

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (route.params && route.params.timerTrackerData) {
        const data = deserializeDatesFromNavigation(
          route.params.timerTrackerData,
        );

        if (data.taskName) setTaskName(data.taskName);
        if (data.description) setDescription(data.description);
        if (data.startDate) setStartDate(data.startDate);
        if (data.endDate) setEndDate(data.endDate);
        if (data.endDateSelected !== undefined)
          setEndDateSelected(data.endDateSelected);
        if (data.startTime) setStartTime(data.startTime);
        if (data.reminderData) setReminderData(data.reminderData);
        if (data.addReminder !== undefined) setAddReminder(data.addReminder);
        if (data.addToGoogleCalendar !== undefined)
          setAddToGoogleCalendar(data.addToGoogleCalendar);
        if (data.priority !== undefined) setPriority(data.priority);
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

  // Helper functions for date serialization
  const serializeDatesForNavigation = data => {
    if (!data) return data;
    const serialized = {...data};
    if (serialized.startDate instanceof Date) {
      serialized.startDate = serialized.startDate.toISOString();
    }
    if (serialized.endDate instanceof Date) {
      serialized.endDate = serialized.endDate.toISOString();
    }
    return serialized;
  };

  const deserializeDatesFromNavigation = data => {
    if (!data) return data;
    const deserialized = {...data};
    if (typeof deserialized.startDate === 'string') {
      deserialized.startDate = new Date(deserialized.startDate);
    }
    if (typeof deserialized.endDate === 'string') {
      deserialized.endDate = new Date(deserialized.endDate);
    }
    return deserialized;
  };

  // Handle task name change
  const handleTaskNameChange = text => {
    setTaskName(text);
    if (toastVisible) {
      hideToast();
    }
  };

  // Format time for display
  const formatTimeForDisplay = timeString => {
    if (!timeString) return 'Set Time';

    const timeParts = timeString.split(':');
    let hour = parseInt(timeParts[0]);
    const minute = timeParts[1];

    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;

    return `${hour}:${minute} ${period}`;
  };

  // Handle start time selection
  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }

    if (event.type === 'set' && selectedTime) {
      // Convert Date to time string (HH:MM:SS)
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;

      setStartTime(timeString);

      if (Platform.OS === 'ios') {
        setShowStartTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowStartTimePicker(false);
    }
  };

  // Open time picker
  const handleStartTimePress = () => {
    // Set initial time for picker
    if (startTime) {
      const timeParts = startTime.split(':');
      const date = new Date();
      date.setHours(parseInt(timeParts[0]));
      date.setMinutes(parseInt(timeParts[1]));
      setTempTime(date);
    } else {
      setTempTime(new Date());
    }
    setShowStartTimePicker(true);
  };

  // Date formatting functions
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

  const formatDateForDB = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateDaysDifference = (startDate, endDate) => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Date handlers
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

  // Priority handlers
  const handlePriorityPress = () => {
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handlePrioritySelect = selectedPriority => {
    setPriority(selectedPriority.value);
    setShowPriorityDropdown(false);
  };

  // Reminder handlers
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

  // Handle Link To Goal press
  const handleLinkToGoalPress = () => {
    if (toastVisible) {
      hideToast();
    }

    if (!taskName.trim()) {
      showToast('Enter a task name');
      return;
    }

    const currentData = {
      ...previousData,
      timerTrackerData: {
        taskName: taskName.trim(),
        description: description.trim(),
        startDate,
        endDate,
        endDateSelected,
        startTime,
        reminderData,
        addReminder,
        addToGoogleCalendar,
        priority,
      },
    };

    const serializedData = {
      ...currentData,
      timerTrackerData: serializeDatesForNavigation(
        currentData.timerTrackerData,
      ),
    };

    navigation.navigate('LinkGoal', serializedData);
  };

  // ✅ FIXED: Handle Done press with proper block_time_data serialization
  const handleDonePress = async () => {
    console.log('========================================');
    console.log('📝 [PlanTimerTracker] Starting task creation');
    console.log('========================================');

    if (toastVisible) {
      hideToast();
    }

    // Validation
    if (!taskName.trim()) {
      showToast('Enter a task name');
      return;
    }

    if (!user) {
      showToast('Please log in to create Plan Your Day', 'error');
      return;
    }

    const timerTrackerData = {
      taskName: taskName.trim(),
      description: description.trim(),
      startDate,
      endDate,
      endDateSelected,
      startTime,
      reminderData,
      addReminder,
      addToGoogleCalendar,
      priority,
    };

    const finalData = {
      ...previousData,
      timerTrackerData,
    };

    try {
      // ✅ AUTOMATIC: Block time enabled if start time is set
      const blockTimeEnabled = !!startTime;

      // Prepare block time data
      const blockTimeData =
        blockTimeEnabled && startTime
          ? {
              enabled: true,
              start_time: startTime,
            }
          : null;

      // Helper function to convert 24-hour time to 12-hour format for display
      const convertTo12Hour = time24h => {
        try {
          if (!time24h) return null;
          const [hours, minutes] = time24h.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
        } catch (error) {
          console.error('Error converting time to 12-hour format:', error);
          return null;
        }
      };

      const planData = {
        title: taskName.trim(),
        description: description.trim(),
        category:
          previousData.selectedCategory?.title ||
          previousData.selectedCategory ||
          'Work and Career',
        planType: 'hours',
        evaluationType: 'timerTracker',
        userId: user.id,
        time: startTime ? convertTo12Hour(startTime) : null, // ✅ Convert 24-hour startTime to 12-hour format for time column
        timeColor: '#E4EBF3',
        tags: ['Plan', priority || 'Important'],
        priority: priority || 'Important',
        startDate: startDate
          ? new Date(startDate).toISOString().split('T')[0]
          : null,
        endDate:
          endDateSelected && endDate
            ? new Date(endDate).toISOString().split('T')[0]
            : null,
        isEndDateEnabled: endDateSelected,
        startTime: startTime,
        addToGoogleCalendar: addToGoogleCalendar,
        isPendingTask: false,
        linkedGoalId: null,
        linkedGoalTitle: null,
        linkedGoalType: null,
        note: description.trim() || '',
        blockTimeEnabled: blockTimeEnabled,
        blockTimeData: blockTimeData,
        durationEnabled: false,
        durationData: null,
        addPomodoro: false,
        pomodoroSettings: null,
        focusDuration: null,
        shortBreakDuration: null,
        longBreakDuration: null,
        autoStartShortBreaks: false,
        autoStartFocusSessions: false,
        focusSessionsPerRound: null,
        timerDuration: null,
        checklistItems: null,
      };

      if (addReminder && reminderData) {
        planData.reminderEnabled = true;
        planData.reminderData = reminderData;
      } else {
        planData.reminderEnabled = false;
        planData.reminderData = null;
      }

      console.log('💾 Saving Plan Your Day Timer Tracker...');

      const savedPlan = await planYourDayService.createPlanYourDay(planData);

      console.log('✅ Task saved successfully:', savedPlan.id);

      // ⏰ AUTOMATIC BLOCK TIME ALARM SCHEDULING - Triggers if start time is set
      if (blockTimeEnabled && startTime && startDate) {
        try {
          console.log('========================================');
          console.log('⏰ [BlockTime] Auto-scheduling Block Time alarm');
          console.log('========================================');
          console.log('📋 Task ID:', savedPlan.id);
          console.log('📋 Start Time:', startTime);
          console.log('📋 Start Date:', formatDateForDB(startDate));

          const dateString = formatDateForDB(startDate);

          // ✅ FIX: Stringify block_time_data for native module
          const blockTimeTask = {
            id: savedPlan.id,
            title: taskName.trim(),
            description: description.trim(),
            category: planData.category,
            evaluation_type: 'timerTracker',
            block_time_enabled: true,
            block_time_data: JSON.stringify({
              // ✅ STRINGIFY HERE
              start_time: startTime,
              enabled: true,
            }),
            source: 'plan_your_day',
            frequency_type: 'Once',
            start_date: dateString,
          };

          console.log(
            '📦 Block Time Task Object:',
            JSON.stringify(blockTimeTask, null, 2),
          );

          const alarmResult = await BlockTimeScheduler.scheduleAlarmForTask(
            blockTimeTask,
            dateString,
          );

          if (alarmResult.success) {
            console.log('========================================');
            console.log('✅ [BlockTime] Alarm scheduled successfully!');
            console.log('📱 Request Code:', alarmResult.result.requestCode);
            console.log(
              '⏰ Trigger Time:',
              new Date(alarmResult.result.triggerTime).toLocaleString(),
            );
            console.log('========================================');
          } else {
            console.warn(
              '⚠️ [BlockTime] Failed to schedule alarm:',
              alarmResult.reason || alarmResult.error,
            );
          }
        } catch (blockTimeError) {
          console.error(
            '❌ [BlockTime] Error scheduling Block Time alarm:',
            blockTimeError,
          );
          // Don't block task creation if Block Time scheduling fails
        }
      }

      // Schedule task confirmation alarm
      if (startTime && startDate) {
        try {
          console.log('📅 Scheduling task confirmation alarm...');

          const confirmationResult =
            await taskConfirmationAlarmManager.scheduleConfirmationAlarm({
              id: savedPlan.id,
              title: taskName.trim(),
              description: description.trim(),
              start_date: new Date(startDate).toISOString().split('T')[0],
              start_time: startTime,
              category:
                previousData.selectedCategory?.title ||
                previousData.selectedCategory ||
                'Work and Career',
              evaluationType: planData.evaluationType,
            });

          if (confirmationResult.success) {
            console.log('✅ Task confirmation alarm scheduled');
          }
        } catch (confirmError) {
          console.error('❌ Error scheduling task confirmation:', confirmError);
        }
      }

      // Schedule reminders
      let reminderMessage = '';
      if (planData.reminderEnabled && planData.reminderData) {
        try {
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
                ...planData,
                userProfile: userProfile,
              },
              savedPlan,
            );

          if (scheduledReminders.length > 0) {
            reminderMessage = ` ${scheduledReminders.length} reminder(s) scheduled.`;
            console.log('✅ Reminders scheduled:', scheduledReminders.length);
          }
        } catch (reminderError) {
          console.error('❌ Error scheduling reminders:', reminderError);
          reminderMessage = ' (Note: Reminders could not be scheduled)';
        }
      }

      console.log('========================================');
      console.log('🎉 Task creation completed successfully!');
      console.log('========================================');

      let successMessage = 'Task created successfully!';

      // Show success toast
      showToast(successMessage, 'success');

      // Navigate after a short delay to allow toast to be visible
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'PlanYourDayScreen',
              params: {
                newPlanCreated: true,
                refresh: true,
              },
            },
          ],
        });
      }, 1500);
    } catch (error) {
      console.error('❌ Error saving Plan Your Day Timer Tracker:', error);
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    }
  };

  // Toggle component
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

  // Option row component
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
    hasDropdown = false,
  ) => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={onRowPress ? 0.7 : hasToggle || hasPlus ? 1 : 0.7}
          onPress={onRowPress || (() => {})}>
          <View style={styles.optionLeft}>
            {iconSource && (
              <Image
                source={iconSource}
                style={styles.optionIcon}
                resizeMode="contain"
              />
            )}
            <View style={styles.optionTextContainer}>
              <Text
                style={[styles.optionTitle, !iconSource && styles.addTitle]}>
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.optionSubtitle,
                    !iconSource && styles.optionSubtitle1,
                  ]}>
                  {subtitle}
                </Text>
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
            {hasDropdown && (
              <MaterialIcons
                name="keyboard-arrow-down"
                size={WP(6)}
                color="#646464"
              />
            )}
            {customRight && customRight}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // End date section component
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

  // Priority section component
  const renderPrioritySection = () => {
    return (
      <View
        style={[
          styles.optionContainer,
          showPriorityDropdown && styles.priorityContainerExpanded,
        ]}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handlePriorityPress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Flag}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Priority</Text>
            </View>
          </View>
          <View style={styles.optionRight}>
            <MaterialIcons
              name={
                showPriorityDropdown
                  ? 'keyboard-arrow-up'
                  : 'keyboard-arrow-down'
              }
              size={WP(6)}
              color="#646464"
            />
          </View>
        </TouchableOpacity>

        {showPriorityDropdown && (
          <View style={styles.priorityDropdown}>
            <View style={styles.priorityButtonsContainer}>
              {priorityOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.priorityButton,
                    {backgroundColor: option.backgroundColor},
                    priority === option.value && styles.priorityButtonSelected,
                  ]}
                  onPress={() => handlePrioritySelect(option)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.priorityButtonText,
                      {color: option.textColor},
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Plan Your Day - Timer Tracker">
          <TouchableOpacity onPress={handleDonePress}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Name Input */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isTaskNameLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Task Name
          </Text>
          <TextInput
            style={styles.textInput}
            value={taskName}
            onChangeText={handleTaskNameChange}
            onFocus={() => setTaskNameFocused(true)}
            onBlur={() => setTaskNameFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            maxLength={70}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isDescriptionLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Description (Optional)
          </Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setDescriptionFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            multiline={true}
            maxLength={200}
          />
        </View>

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

        {/* Start Time */}
        {renderOptionRow(
          Icons.Clock,
          'Start Time',
          false,
          false,
          null,
          false,
          null,
          null,
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {formatTimeForDisplay(startTime)}
            </Text>
          </View>,
          handleStartTimePress,
        )}

        {/* End Date Section */}
        {renderEndDateSection()}

        {/* Priority Section */}
        {renderPrioritySection()}

        {/* Add a Reminder */}
        {renderOptionRow(
          null,
          'Add a Reminder',
          true,
          addReminder,
          handleReminderToggle,
          false,
          null,
          reminderData && addReminder
            ? `${
                reminderData.type === 'notification'
                  ? '🔔 Notification'
                  : reminderData.type === 'alarm'
                  ? '⏰ Alarm'
                  : '🔕 No reminder'
              } at ${reminderData.time}`
            : null,
        )}

        {/* Add to Google Calendar */}
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

        {/* Link To Goal */}
        {renderOptionRow(
          Icons.Link,
          'Link To Goal',
          false,
          false,
          null,
          true,
          handleLinkToGoalPress,
        )}

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

      {/* Native Time Picker */}
      {showStartTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
        />
      )}

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
        blockTimeData={null}
      />

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
    marginTop: HP(2),
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
    paddingHorizontal: WP(4.533),
    paddingTop: HP(2),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(2),
    elevation: 5,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.White,
    height: HP(6.3),
  },
  inputLabel: {
    fontSize: FS(1.625),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
    position: 'absolute',
    backgroundColor: colors.White,
    paddingHorizontal: WP(1.7),
    zIndex: 1,
  },
  inputLabelActive: {
    top: HP(-1.25),
    left: WP(2),
    fontSize: FS(1.5),
    color: '#625F5F',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.7),
    left: WP(2.5),
    fontSize: FS(1.7),
    color: '#625F5F',
    fontFamily: 'OpenSans-SemiBold',
  },
  textInput: {
    fontSize: FS(1.55),
    fontFamily: 'OpenSans-SemiBold',
    color: '#625F5F',
    paddingVertical: HP(0.5),
    paddingHorizontal: WP(2.133),
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
  priorityContainerExpanded: {
    minHeight: HP(12),
    paddingBottom: HP(1.5),
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
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  endDateDetailsContainer: {},
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
  priorityDropdown: {
    paddingTop: HP(1),
    paddingHorizontal: WP(10),
  },
  priorityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priorityButton: {
    paddingVertical: HP(1.2),
    borderRadius: WP(2),
    width: WP(28.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityButtonSelected: {
    opacity: 0.8,
    transform: [{scale: 0.95}],
  },
  priorityButtonText: {
    fontSize: FS(1.5),
    fontFamily: 'OpenSans-SemiBold',
  },
  calendarContainer: {
    marginBottom: HP(0.9),
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
    width: WP(3.6),
    height: WP(3.6),
    borderRadius: WP(1.85),
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

export default PlanTimerTrackerScreen;
