import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Headers from '../../../Components/Headers';
import CustomDropdown from '../../../Components/Dropdown';
import TimePicker from '../../../Components/TimePicker';
import DatePickerModal from '../../../Components/DatePickerModal';
import BlockTimeModal from '../../../Components/BlockTime';
import DurationModal from '../../../Components/DurationModal';
import ReminderModal from '../../../Components/ReminderModal';
import NoteModal from '../../../Components/NoteModal';
import CustomToast from '../../../Components/CustomToast';
import {HP, WP, FS} from '../../../utils/dimentions';
import {colors, Icons} from '../../../Helper/Contants';
import {taskService} from '../../../services/api/taskService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';

const RecurringTimerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Task form states
  const [habit, setHabit] = useState('');
  const [description, setDescription] = useState('');
  const [habitFocused, setHabitFocused] = useState(false);

  // Get category data from route params
  const selectedCategoryParam = route.params?.selectedCategory || {
    title: 'Work and Career',
    image: Icons.Work,
  };
  const [selectedCategory, setSelectedCategory] = useState(
    selectedCategoryParam,
  );

  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [isPendingTask, setIsPendingTask] = useState(false);

  // Dropdown and time states
  const [selectedDropdownValue, setSelectedDropdownValue] =
    useState('At Least');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Feature states
  const [addPomodoro, setAddPomodoro] = useState(false);
  const [pomodoroSettings, setPomodoroSettings] = useState(null);
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

  // Date picker states
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const dropdownOptions = ['At Least', 'Less than', 'Any Value'];

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

  // Check if habit label should be active
  const isHabitLabelActive = habitFocused || habit.length > 0;

  // Since this is a timer task, always show Pomodoro option
  const isTimerEvaluation = true;

  // Replace the existing useFocusEffect in RecurringTimerScreen with this:

  useFocusEffect(
    React.useCallback(() => {
      if (route.params) {
        const params = route.params;

        // Restore all form data when returning from navigation
        if (params.habit !== undefined) setHabit(params.habit);
        if (params.description !== undefined)
          setDescription(params.description);
        if (params.selectedCategory !== undefined)
          setSelectedCategory(params.selectedCategory);
        if (params.priority !== undefined) setPriority(params.priority);
        if (params.note !== undefined) setNote(params.note);
        if (params.isPendingTask !== undefined)
          setIsPendingTask(params.isPendingTask);
        if (params.selectedDropdownValue !== undefined)
          setSelectedDropdownValue(params.selectedDropdownValue);
        if (params.selectedTime !== undefined)
          setSelectedTime(params.selectedTime);
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

  // Helper function to calculate duration from selected time (for manual time input)
  const calculateDurationFromTime = timeData => {
    if (!timeData) return null;

    const {hours, minutes} = timeData;
    const totalMinutes = hours * 60 + minutes;

    return {
      hours,
      minutes,
      totalMinutes,
      formattedDuration: `${String(hours).padStart(2, '0')}:${String(
        minutes,
      ).padStart(2, '0')}`,
    };
  };

  // Toast helper functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // Updated RecurringTimerScreen.js - Key changes to handlePomodoroToggle function

  // Replace the existing handlePomodoroToggle function with this:

  const handlePomodoroToggle = () => {
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

      // Calculate duration from block time for Pomodoro (not from manual duration)
      let calculatedDuration = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        calculatedDuration = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
      }

      if (!calculatedDuration) {
        showToast(
          'Please select a block time first to calculate duration for Pomodoro',
        );
        return;
      }

      // Prepare current data and navigate to PomodoroSettings - UPDATED WITHOUT CALLBACK
      const currentData = {
        ...route.params,
        habit,
        description,
        selectedCategory,
        priority,
        note,
        isPendingTask,
        selectedDropdownValue,
        selectedTime,
        addReminder,
        addToGoogleCalendar,
        reminderData,
        startDate: startDate.toISOString(),
        screenType: 'RecurringTimer',
        // Pass duration data calculated from block time for pomodoro
        scheduleData: {
          durationData: calculatedDuration,
          blockTimeData: blockTimeData,
          addPomodoro: true,
          pomodoroSettings: pomodoroSettings,
          startDate: startDate.toISOString(),
          endDate: null,
          endDateSelected: false,
          addReminder,
          reminderData,
          addToGoogleCalendar,
        },
        // REMOVED: onPomodoroSave callback function
      };

      // Navigate to PomodoroSettings screen
      navigation.navigate('PomodoroSettings', currentData);
    }
  };

  // Validation function
  const validateForm = () => {
    if (!habit.trim()) {
      showToast('Enter a name');
      return false;
    }

    if (selectedDropdownValue === 'Less than') {
      const {hours, minutes, seconds} = selectedTime;
      const totalTime = hours + minutes + seconds;

      if (totalTime === 0) {
        showToast('Enter a value greater than zero');
        return false;
      }
    }

    if (!durationData) {
      showToast('Select a Duration');
      return false;
    }

    if (!blockTimeData) {
      showToast('Select a block time');
      return false;
    }

    // Validation for timer task - must have Pomodoro
    if (isTimerEvaluation && !addPomodoro) {
      showToast('Select a Pomodoro');
      return false;
    }

    // Validate pomodoro settings if pomodoro is enabled
    if (addPomodoro && (!pomodoroSettings || !pomodoroSettings.focusTime)) {
      showToast('Please configure Pomodoro settings');
      return false;
    }

    return true;
  };

  // Handle dropdown selection
  const handleDropdownSelect = value => {
    setSelectedDropdownValue(value);

    if (toastVisible) {
      hideToast();
    }
  };

  // Handle time selection
  const handleTimeSelect = time => {
    setSelectedTime(time);

    if (toastVisible && selectedDropdownValue === 'Less than') {
      const {hours, minutes, seconds} = time;
      const totalTime = hours + minutes + seconds;

      if (totalTime > 0) {
        hideToast();
      }
    }
  };

  // Handle habit input change
  const handleHabitChange = text => {
    setHabit(text);

    if (toastVisible) {
      hideToast();
    }
  };

  // UPDATED Handle Next button press with ReminderScheduler
  const handleNextPress = async () => {
    if (!validateForm()) {
      return;
    }

    // Hide any existing toast
    if (toastVisible) {
      hideToast();
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
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
        // Basic task information
        title: habit.trim(),
        description: description.trim(),
        category: selectedCategory.title || selectedCategory,
        taskType: 'Recurring',
        evaluationType: 'timer',
        userId: user.id,

        // Visual and display properties
        time: blockTimeData?.startTime || null,
        timeColor: '#E4EBF3',
        tags: ['Recurring', priority || 'Important'],
        image: null,
        hasFlag: true,
        priority: priority || 'Important',

        // Timer-specific data
        timerDuration: selectedTime,
        timerCondition: selectedDropdownValue,

        // Repetition and frequency settings (default for recurring tasks)
        frequencyType: 'Every Day',
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

        // Duration settings (now from DurationModal picker)
        durationEnabled: true,
        durationData: durationData, // Use manual duration from picker

        // Additional features
        addToGoogleCalendar: addToGoogleCalendar,
        isPendingTask: isPendingTask,

        // Goal linking
        linkedGoalId: null,
        linkedGoalTitle: null,
        linkedGoalType: null,

        // Notes
        note: note,

        // Progress tracking
        progress: null,
      };

      // Add pomodoro settings if enabled - Use duration calculated from block time
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
        taskData.endDate = null; // No end date for recurring timer
        taskData.isEndDateEnabled = false;
        taskData.blockTimeData = blockTimeData;
        taskData.durationData = durationData;
        taskData.frequencyType = 'Every Day'; // Default for recurring timer
        taskData.selectedWeekdays = [];
        taskData.everyDays = 1;
      } else {
        taskData.reminderEnabled = false;
        taskData.reminderData = null;
      }

      console.log('Saving recurring task data:', taskData);

      // Save to database
      const savedTask = await taskService.createTask(taskData);

      console.log('Recurring task saved successfully:', savedTask);

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

      // Update success alert to include reminder info
      Alert.alert(
        'Success',
        `Recurring task created successfully!${reminderMessage}`,
        [
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
        ],
      );
    } catch (error) {
      console.error('Error saving recurring task:', error);
      Alert.alert(
        'Error',
        'Failed to create recurring task. Please try again.',
      );
    }
  };

  // Date formatting
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

  const formatDisplayTime = time => {
    const {hours, minutes} = time;
    if (hours === 0 && minutes === 0) {
      return '00:00';
    }
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  };

  // Event handlers
  const handleStartDateSelect = date => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  // Handle Duration press - Now opens DurationModal
  const handleDurationPress = () => {
    setShowDurationModal(true);
  };

  // Handle Duration save - Now saves from DurationModal
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

    // Hide toast if it was showing block time validation message
    if (toastVisible && toastMessage === 'Select a block time') {
      hideToast();
    }
  };

  const handlePriorityPress = () => {
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handlePrioritySelect = selectedPriority => {
    setPriority(selectedPriority.value);
    setShowPriorityDropdown(false);
  };

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

  const handleLinkToGoalPress = () => {
    navigation.navigate('LinkGoal');
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

  // Render Duration section (Updated - Now with DurationModal picker)
  const renderDurationSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity
          style={styles.optionRow}
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

          <TouchableOpacity
            onPress={handleDurationPress}
            style={styles.plusButton}>
            <Image
              source={Icons.Plus}
              style={styles.plusIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  // Render Pomodoro section
  const renderPomodoroSection = () => {
    // Format pomodoro settings display
    const formatPomodoroDisplay = () => {
      if (!pomodoroSettings) return null;

      const focusTime = pomodoroSettings.focusTime || 25;
      const shortBreak = pomodoroSettings.shortBreak || 5;
      const sessionsPerRound = pomodoroSettings.focusSessionsPerRound || 4;

      return `${focusTime}min focus, ${shortBreak}min break, ${sessionsPerRound} sessions`;
    };

    // Calculate duration from block time for display (not from manual duration)
    let blockTimeDuration = null;
    if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
      blockTimeDuration = calculateDuration(
        blockTimeData.startTime,
        blockTimeData.endTime,
      );
    }

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
              {addPomodoro && blockTimeDuration && (
                <Text style={styles.pomodoroDuration}>
                  Duration: {blockTimeDuration.formattedDuration}
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers
          title="Define Your Task"
          onBackPress={() => navigation.goBack()}>
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{paddingBottom: HP(3)}}
        showsVerticalScrollIndicator={false}>
        {/* Habit Input with Floating Label */}
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isHabitLabelActive
                ? styles.inputLabelActive
                : styles.inputLabelInactive,
            ]}>
            Habit
          </Text>
          <TextInput
            style={styles.textInput}
            value={habit}
            onChangeText={handleHabitChange}
            onFocus={() => setHabitFocused(true)}
            onBlur={() => setHabitFocused(false)}
            placeholder=""
            placeholderTextColor="#575656"
            maxLength={70}
          />
        </View>

        {/* Custom Dropdown */}
        <CustomDropdown
          options={dropdownOptions}
          defaultValue="At Least"
          onSelect={handleDropdownSelect}
          placeholder="Select option"
        />

        {/* Time Display Container */}
        <View style={styles.timeMainContainer}>
          <TouchableOpacity
            style={styles.timeDisplayContainer}
            onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeDisplayText}>
              {formatDisplayTime(selectedTime)}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dayText}>a day.</Text>
        </View>

        {/* Example Text */}
        <Text style={styles.exampleText}>
          e.g. Study for the exam. At least 2 chapters a day
        </Text>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#575656"
            multiline={true}
            maxLength={200}
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
                {selectedCategory?.title || selectedCategory}
              </Text>
              <Image
                source={Icons.Taskhome}
                style={styles.categoryIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowStartDatePicker(true)}>
            <View style={styles.optionLeft}>
              <Image
                source={Icons.Set}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Start Date</Text>
              </View>
            </View>

            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {formatDisplayDate(startDate)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Duration - Now above Block Time and with DurationModal */}
        {renderDurationSection()}

        {/* Block Time - Now below Duration */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
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

            <TouchableOpacity
              onPress={handleBlockTimePress}
              style={styles.plusButton}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Add Pomodoro - Now uses block time duration for calculations */}
        {renderPomodoroSection()}

        {/* Priority */}
        <View
          style={[
            styles.optionContainer,
            showPriorityDropdown && styles.priorityContainerExpanded,
          ]}>
          <TouchableOpacity
            style={styles.optionRow}
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

            <MaterialIcons
              name={
                showPriorityDropdown
                  ? 'keyboard-arrow-up'
                  : 'keyboard-arrow-down'
              }
              size={WP(6)}
              color="#646464"
            />
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
                      priority === option.value &&
                        styles.priorityButtonSelected,
                    ]}
                    onPress={() => handlePrioritySelect(option)}>
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

        {/* Note */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow} onPress={handleNotePress}>
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

        {/* Pending Task */}
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionRow}>
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

            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setIsPendingTask(!isPendingTask)}>
              <View
                style={[
                  styles.radioOuter,
                  isPendingTask && styles.radioOuterSelected,
                ]}>
                {isPendingTask && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Link To Goal */}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionRow}
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

            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleLinkToGoalPress}>
              <Image
                source={Icons.Plus}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Add a Reminder */}
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

              <View style={styles.optionRight}>
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

        <View style={styles.bottomSpacer} />

        {/* Progress Indicator */}
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
      </ScrollView>

      {/* Modals */}
      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onTimeSelect={handleTimeSelect}
        initialTime={selectedTime}
      />

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      {/* Duration Modal - Now implemented */}
      <DurationModal
        visible={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSave={handleDurationSave}
        initialData={durationData}
      />

      <BlockTimeModal
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
      />

      <ReminderModal
        visible={showReminderModal}
        onClose={handleReminderClose}
        onSave={handleReminderSave}
        initialData={reminderData}
        blockTimeData={blockTimeData}
      />

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
    paddingHorizontal: WP(4.533),
    paddingTop: HP(2.8),
  },
  inputContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    padding: WP(2.133),
    marginBottom: HP(2.3),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.08,
    shadowRadius: WP(2.133),
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: HP(4.375),
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
    left: WP(2.7),
    fontSize: FS(1.7),
    color: '#666666',
    fontFamily: 'OpenSans-Bold',
  },
  inputLabelInactive: {
    top: HP(1.5),
    left: WP(3.2),
    fontSize: FS(1.9),
    color: '#575656',
    fontFamily: 'OpenSans-Bold',
  },
  textInput: {
    fontSize: FS(2.0),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Black,
    paddingVertical: HP(-0.25),
    paddingHorizontal: WP(2.133),
  },
  timeMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(1.7),
  },
  timeDisplayContainer: {
    backgroundColor: colors.White,
    borderRadius: WP(2.133),
    paddingHorizontal: WP(17),
    paddingVertical: HP(2),
    marginRight: WP(4.0),
    elevation: 3,
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.125),
    },
    shadowOpacity: 0.05,
    shadowRadius: WP(0.533),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  timeDisplayText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    textAlign: 'center',
  },
  dayText: {
    fontSize: FS(1.625),
    fontFamily: 'OpenSans-SemiBold',
    color: '#929292',
  },
  exampleText: {
    fontSize: FS(1.25),
    fontFamily: 'OpenSans-SemiBold',
    color: '#A3A3A3',
    marginBottom: HP(2.0),
    lineHeight: HP(2.25),
    textAlign: 'center',
  },
  descriptionInput: {
    fontSize: FS(1.75),
    fontFamily: 'OpenSans-Regular',
    color: '#575656',
    minHeight: HP(2.0),
    paddingVertical: HP(0.4375),
    paddingHorizontal: WP(2.667),
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
    marginLeft: WP(3),
  },
  pomodoroDuration: {
    fontSize: FS(1.3),
    fontFamily: 'OpenSans-Regular',
    color: '#888888',
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
    marginBottom: HP(2),
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
  progressDotInactive: {
    width: WP(5.3),
    height: WP(5.3),
    borderRadius: WP(2.65),
    backgroundColor: 'transparent',
    borderWidth: WP(0.5),
    borderColor: colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotTextInactive: {
    color: colors.Primary,
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

export default RecurringTimerScreen;
