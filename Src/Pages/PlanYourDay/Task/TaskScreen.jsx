import React, {useState} from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Headers from '../../../Components/Headers';
import DatePickerModal from '../../../Components/DatePickerModal';
import BlockTimeModalOld from '../../../Components/BlockTimeold';
import DurationModal from '../../../Components/DurationModal';
import ReminderModal from '../../../Components/ReminderModal';
import NoteModal from '../../../Components/NoteModal';
import CustomToast from '../../../Components/CustomToast';
import {HP, WP, FS} from '../../../utils/dimentions';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../../Helper/Contants';
import {taskService} from '../../../services/api/taskService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';

const TaskScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Get category from route params (from CategorySelection screen)
  const selectedCategory = route.params?.selectedCategory || {
    title: 'Work and Career',
  };

  // Get evaluation type from route params
  const evaluationType = route.params?.evaluationType || null;

  // Helper function to get category icon
  const getCategoryIcon = categoryName => {
    if (!categoryName) return Icons.Work;

    const categoryImageMap = {
      'Work & Career': Icons.Work,
      'Work and Career': Icons.Work,
      'Health & Wellness': Icons.Health,
      'Health and Wellness': Icons.Health,
      'Love & Relationship': Icons.Love,
      'Love and Relationship': Icons.Love,
      'Money & Finances': Icons.Money,
      'Money and Finances': Icons.Money,
      'Spirtuality & Faith': Icons.Faith,
      'Spirtuality and Faith': Icons.Faith,
      'Personal & Growth': Icons.Growth,
      'Personal and Growth': Icons.Growth,
      'Other Goals': Icons.Other,
      Other: Icons.Other,
      'Create a category': Icons.Create,
    };

    return categoryImageMap[categoryName] || Icons.Work;
  };

  // Task form states
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [isPendingTask, setIsPendingTask] = useState(false);

  // Input focus states
  const [taskFocused, setTaskFocused] = useState(false);

  // Feature states
  const [addPomodoro, setAddPomodoro] = useState(false);
  const [addReminder, setAddReminder] = useState(false);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  // Check if evaluation type is timer
  const isTimerEvaluation = evaluationType === 'timer';

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

  // Load data when screen comes into focus (when returning from PomodoroSettings)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params) {
        const params = route.params;

        // Restore all form data when returning from navigation
        if (params.taskTitle !== undefined) setTaskTitle(params.taskTitle);
        if (params.priority !== undefined) setPriority(params.priority);
        if (params.note !== undefined) setNote(params.note);
        if (params.isPendingTask !== undefined)
          setIsPendingTask(params.isPendingTask);
        if (params.addReminder !== undefined)
          setAddReminder(params.addReminder);
        if (params.addToGoogleCalendar !== undefined)
          setAddToGoogleCalendar(params.addToGoogleCalendar);
        if (params.reminderData) setReminderData(params.reminderData);

        // Restore date data
        if (params.startDate) {
          const date =
            typeof params.startDate === 'string'
              ? new Date(params.startDate)
              : params.startDate;
          setStartDate(date);
        }

        // Restore schedule data (block time and duration)
        if (params.scheduleData) {
          if (params.scheduleData.blockTimeData) {
            setBlockTimeData(params.scheduleData.blockTimeData);
          }
          if (params.scheduleData.durationData) {
            setDurationData(params.scheduleData.durationData);
          }
        }

        // Restore direct block time and duration data if available
        if (params.blockTimeData) setBlockTimeData(params.blockTimeData);
        if (params.durationData) setDurationData(params.durationData);

        // Restore pomodoro settings and state
        if (params.pomodoroSettings) {
          setPomodoroSettings(params.pomodoroSettings);
          setAddPomodoro(true); // Enable pomodoro when settings are available
        }
      }
    }, [route.params]),
  );

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

  // Helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const isTaskLabelActive = taskFocused || taskTitle.length > 0;

  // Handle Pomodoro toggle with navigation to PomodoroSettings - FIXED VERSION
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
      // Check if block time is available first (now block time is the primary requirement)
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

      // Prepare current data and navigate to PomodoroSettings
      const currentData = {
        taskTitle,
        selectedCategory,
        priority,
        note,
        isPendingTask,
        startDate: startDate.toISOString(),
        blockTimeData,
        durationData: durationForPomodoro, // Pass calculated duration from block time
        addPomodoro: true, // Set to true for navigation
        reminderData,
        addReminder,
        addToGoogleCalendar,
        pomodoroSettings,
        evaluationType,
        screenType: 'GoalScreen',
        scheduleData: {
          startDate: startDate.toISOString(),
          blockTimeData,
          durationData: durationForPomodoro, // Include duration calculated from block time
          addPomodoro: true,
          reminderData,
          addReminder,
          addToGoogleCalendar,
          pomodoroSettings,
        },
      };

      // Navigate to PomodoroSettings screen
      navigation.navigate('PomodoroSettings', currentData);
    }
  };

  // UPDATED Handle Next button press with ReminderScheduler
  const handleNextPress = async () => {
    if (toastVisible) {
      hideToast();
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
      return;
    }

    if (!taskTitle.trim()) {
      showToast('Enter a name');
      return;
    }

    if (!durationData) {
      showToast('Select a duration');
      return;
    }

    if (!blockTimeData) {
      showToast('Select a block time');
      return;
    }

    // Additional validation for timer evaluation type
    if (isTimerEvaluation && !addPomodoro) {
      showToast('Select a Pomodoro Timer');
      return;
    }

    // Validate pomodoro settings if pomodoro is enabled
    if (addPomodoro && (!pomodoroSettings || !pomodoroSettings.focusTime)) {
      showToast('Please configure Pomodoro settings');
      return;
    }

    try {
      // Calculate duration from block time for pomodoro (not from manual duration)
      let finalDurationForPomodoro = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        finalDurationForPomodoro = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
      }

      // Prepare task data for database
      const taskData = {
        title: taskTitle.trim(),
        description: note || '',
        category: selectedCategory?.title || 'Work and Career',
        taskType: 'Task',
        evaluationType: evaluationType || 'yesNo', // Use passed evaluation type
        userId: user.id,

        // Visual and display properties
        time: blockTimeData?.startTime || null,
        timeColor: '#E4EBF3',
        tags: ['Task', priority || 'Must'],
        image: null,
        hasFlag: true,
        priority: priority || 'High',

        // Task-specific data (minimal for basic tasks)
        numericValue: 0,
        numericGoal: null,
        numericUnit: null,
        numericCondition: 'At Least',

        // Timer-specific data (minimal)
        timerDuration: {hours: 0, minutes: 0, seconds: 0},
        timerCondition: 'At Least',

        // Checklist-specific data (minimal)
        checklistItems: null,
        successCondition: 'All Items',
        customItemsCount: 1,

        // Repetition and frequency settings (one-time task)
        frequencyType: 'Once',
        selectedWeekdays: [],
        selectedMonthDates: [],
        selectedYearDates: [],
        periodDays: 1,
        periodType: 'Week',
        isFlexible: false,
        isMonthFlexible: false,
        isYearFlexible: false,
        useDayOfWeek: false,
        isRepeatFlexible: false,
        isRepeatAlternateDays: false,

        // Scheduling settings
        startDate: startDate
          ? new Date(startDate).toISOString().split('T')[0]
          : null,
        endDate: null,
        isEndDateEnabled: false,

        // Block time settings
        blockTimeEnabled: !!blockTimeData,
        blockTimeData: blockTimeData,

        // Duration settings
        durationEnabled: !!durationData,
        durationData: durationData,

        // Additional features
        addPomodoro: addPomodoro || false,
        addToGoogleCalendar: addToGoogleCalendar || false,
        isPendingTask: isPendingTask || false,

        // Goal linking (not applicable)
        linkedGoalId: null,
        linkedGoalTitle: null,
        linkedGoalType: null,

        // Notes
        note: note || '',

        // Progress tracking
        progress: null,
      };

      // Add pomodoro settings if pomodoro is enabled - Use duration calculated from block time
      if (addPomodoro && pomodoroSettings) {
        // Use duration calculated from block time for pomodoro, not manual duration
        taskData.pomodoroDuration = finalDurationForPomodoro
          ? finalDurationForPomodoro.totalMinutes
          : null;

        // Store pomodoro settings
        taskData.focusDuration = pomodoroSettings.focusTime;
        taskData.shortBreakDuration = pomodoroSettings.shortBreak;
        taskData.longBreakDuration = pomodoroSettings.longBreak;
        taskData.focusSessionsPerRound = pomodoroSettings.focusSessionsPerRound;
        taskData.autoStartShortBreaks =
          pomodoroSettings.autoStartShortBreaks || false;
        taskData.autoStartFocusSessions =
          pomodoroSettings.autoStartFocusSessions || false;

        // Initialize pomodoro progress fields
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
        taskData.endDate = null; // No end date for one-time goal task
        taskData.isEndDateEnabled = false;
        taskData.blockTimeData = blockTimeData;
        taskData.durationData = durationData;
        taskData.frequencyType = 'Once'; // One-time task
        taskData.selectedWeekdays = [];
        taskData.everyDays = null; // Not applicable for one-time tasks
      } else {
        taskData.reminderEnabled = false;
        taskData.reminderData = null;
      }

      console.log('Saving task data:', taskData);

      // Save to database
      const newTask = await taskService.createTask(taskData);

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
              newTask,
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

      // Update success alert to include reminder info
      Alert.alert('Success', `Task created successfully!${reminderMessage}`, [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to home with success flag
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
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  // Handle Link To Goal press - UPDATE WITH VALIDATION
  const handleLinkToGoalPress = () => {
    if (toastVisible) {
      hideToast();
    }

    if (!taskTitle.trim()) {
      showToast('Enter a name');
      return;
    }

    if (!durationData) {
      showToast('Select a duration');
      return;
    }

    if (!blockTimeData) {
      showToast('Select a block time');
      return;
    }

    navigation.navigate('LinkGoal');
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

  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  // Handle Duration press - Open duration modal
  const handleDurationPress = () => {
    setShowDurationModal(true);
  };

  // Handle Duration save - Save duration data
  const handleDurationSave = durationData => {
    setDurationData(durationData);
    // Hide toast when duration is saved
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

    // Hide toast when block time is saved
    if (toastVisible) {
      hideToast();
    }
  };

  // Handle priority dropdown
  const handlePriorityPress = () => {
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handlePrioritySelect = selectedPriority => {
    setPriority(selectedPriority.value);
    setShowPriorityDropdown(false);
  };

  // Handle note press
  const handleNotePress = () => {
    setShowNoteModal(true);
  };

  const handleNoteSave = noteText => {
    setNote(noteText);
  };

  // UPDATED reminder handlers to match SchedulePreference pattern
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
    hasDropdown = false,
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

  // Duration section - Now with duration picker functionality
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

    // Calculate duration display from block time
    const getDurationDisplay = () => {
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        const calculatedDuration = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
        return calculatedDuration ? calculatedDuration.formattedDuration : null;
      }
      return durationData ? durationData.formattedDuration : null;
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
              {addPomodoro && getDurationDisplay() && (
                <Text style={styles.pomodoroDuration}>
                  Duration: {getDurationDisplay()}
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

  // Priority section
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

  // Note section
  const renderNoteSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          activeOpacity={0.7}
          onPress={handleNotePress}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Note}
              style={styles.optionIcon}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Note</Text>
              {note && (
                <Text style={styles.optionSubtitle} numberOfLines={1}>
                  {note}
                </Text>
              )}
            </View>
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

  const renderPendingTaskSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image
              source={Icons.Pending}
              style={styles.optionIcon1}
              resizeMode="contain"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Pending Task</Text>
              <Text style={styles.pendingSubtitle}>
                It will be shown each day until completed.
              </Text>
            </View>
          </View>

          <View style={styles.optionRight}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setIsPendingTask(!isPendingTask)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.radioOuter,
                  isPendingTask && styles.radioOuterSelected,
                ]}>
                {isPendingTask && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Progress indicator
  const renderProgressIndicator = () => {
    return (
      <View style={styles.progressIndicator}>
        <View style={styles.progressDotCompleted}>
          <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressDotActive}>
          <View style={styles.progressDotActiveInner}>
            <Text style={styles.progressDotTextActive}>2</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="New Task">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.taskInputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isTaskLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Task
          </Text>
          <TextInput
            style={styles.taskInput}
            value={taskTitle}
            onChangeText={setTaskTitle}
            onFocus={() => setTaskFocused(true)}
            onBlur={() => setTaskFocused(false)}
            placeholder=""
            placeholderTextColor="#625F5F"
            multiline={false}
          />
        </View>

        {/* Category */}
        <View style={styles.optionContainer}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Category}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Category</Text>
              </View>
            </View>

            <View style={styles.categoryRight}>
              <Text style={styles.categoryText}>
                {selectedCategory?.title || 'Work and Career'}
              </Text>
              <Image
                source={getCategoryIcon(
                  selectedCategory?.title || 'Work and Career',
                )}
                style={styles.categoryIcon}
                resizeMode="contain"
              />
            </View>
          </View>
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

        {/* Duration - Now above Block Time */}
        {renderDurationSection()}

        {/* Block Time - Now below Duration */}
        {renderBlockTimeSection()}

        {/* Add Pomodoro - Only show for timer evaluation type */}
        {renderPomodoroSection()}

        {/* Priority with dropdown */}
        {renderPrioritySection()}

        {/* Note */}
        {renderNoteSection()}

        {/* Pending Task */}
        {renderPendingTaskSection()}

        {/* Link To Goal */}
        {renderLinkGoalSection()}

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

        {/* Spacer for bottom content */}
        <View style={styles.bottomSpacer} />

        {/* Progress Indicator */}
        {renderProgressIndicator()}
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
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

      {/* Note Modal */}
      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleNoteSave}
        initialNote={note}
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
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(3.5),
    paddingTop: HP(2),
  },
  taskInputContainer: {
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
    height: HP(6.4),
    position: 'relative',
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
  taskInput: {
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
    minHeight: HP(6.6),
    justifyContent: 'center',
  },
  priorityContainerExpanded: {
    minHeight: HP(12),
    paddingBottom: HP(1.5),
  },
  noteContainer: {
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
    borderBottomWidth: 1,
  },
  connectedContainer: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    position: 'relative',
    borderTopWidth: 0,
    height: HP(5.5),
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
  optionRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  categoryRight: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    position: 'absolute',
    right: WP(-0.5),
  },
  optionIcon: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(2),
  },
  optionIcon1: {
    width: WP(4.8),
    height: WP(4.8),
    marginRight: WP(2),
    marginBottom: HP(1),
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
    marginLeft: WP(4),
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
    marginLeft: WP(3.5),
  },
  pomodoroDuration: {
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-Regular',
    color: '#666666',
    marginTop: HP(0.2),
  },
  pendingSubtitle: {
    fontSize: FS(1.28),
    fontFamily: 'OpenSans-Regular',
    color: '#8A8A8A',
    marginTop: HP(-1),
    marginBottom: HP(0.8),
  },
  categoryText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-SemiBold',
    color: '#646464',
    marginRight: WP(2),
  },
  categoryIcon: {
    width: WP(12),
    height: WP(12),
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
    marginRight: WP(2),
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
  radioButton: {
    padding: WP(1),
  },
  radioOuter: {
    width: WP(4.5),
    height: WP(4.5),
    borderRadius: WP(2.25),
    borderWidth: 2,
    borderColor: '#595959',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.Primary,
  },
  radioInner: {
    width: WP(2.5),
    height: WP(2.5),
    borderRadius: WP(1.25),
    backgroundColor: colors.Primary,
  },
  bottomSpacer: {
    height: HP(3),
  },
  calendarContainer: {
    // Container for calendar sections
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
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HP(2.5),
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

export default TaskScreen;
