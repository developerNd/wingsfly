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
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';
import taskConfirmationAlarmManager from '../../../services/TaskConfirmation/taskConfirmationAlarmManager';

const PlanScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // Step tracking state - Initialize from route params or default to 1
  const [currentStep, setCurrentStep] = useState(
    route.params?.currentStep || 1,
  );
  const TOTAL_STEPS = 4;

  // Get category from route params
  const selectedCategory = route.params?.selectedCategory || {
    title: 'Work and Career',
  };

  const evaluationType = route.params?.evaluationType || null;
  const checklistData = route.params?.checklistData || null;

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
  const [taskTitle, setTaskTitle] = useState(checklistData?.taskTitle || '');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState(checklistData?.description || '');
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
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const isTimerEvaluation = evaluationType === 'timer';
  const isChecklistEvaluation = evaluationType === 'checklist';

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
      if (route.params) {
        const params = route.params;

        // Restore current step if coming back from another screen
        if (params.currentStep !== undefined) {
          setCurrentStep(params.currentStep);
        }

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

        if (params.startDate) {
          const date =
            typeof params.startDate === 'string'
              ? new Date(params.startDate)
              : params.startDate;
          setStartDate(date);
        }

        if (params.scheduleData) {
          if (params.scheduleData.blockTimeData) {
            setBlockTimeData(params.scheduleData.blockTimeData);
          }
          if (params.scheduleData.durationData) {
            setDurationData(params.scheduleData.durationData);
          }
        }

        if (params.blockTimeData) setBlockTimeData(params.blockTimeData);
        if (params.durationData) setDurationData(params.durationData);

        if (params.pomodoroSettings) {
          setPomodoroSettings(params.pomodoroSettings);
          setAddPomodoro(true);
        }

        if (params.checklistData) {
          if (!taskTitle && params.checklistData.taskTitle) {
            setTaskTitle(params.checklistData.taskTitle);
          }
          if (!note && params.checklistData.description) {
            setNote(params.checklistData.description);
          }
        }
      }
    }, [route.params]),
  );

  // Helper function to calculate duration from block time
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;

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

    const startMinutes = start.hours * 60 + start.minutes;
    let endMinutes = end.hours * 60 + end.minutes;

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
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

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const isTaskLabelActive = taskFocused || taskTitle.length > 0;

  // Handle Pomodoro toggle
  const handlePomodoroToggle = () => {
    if (!isTimerEvaluation) {
      return;
    }

    if (addPomodoro) {
      setAddPomodoro(false);
      setPomodoroSettings(null);
    } else {
      if (!blockTimeData) {
        showToast('Please select a block time first to set up Pomodoro');
        return;
      }

      let calculatedDuration = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        calculatedDuration = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
      }

      const durationForPomodoro = calculatedDuration || durationData;

      if (!durationForPomodoro) {
        showToast(
          'Please select a block time first to calculate duration for Pomodoro',
        );
        return;
      }

      const currentData = {
        taskTitle,
        selectedCategory,
        priority,
        note,
        isPendingTask,
        startDate: startDate.toISOString(),
        blockTimeData,
        durationData: durationForPomodoro,
        addPomodoro: true,
        reminderData,
        addReminder,
        addToGoogleCalendar,
        pomodoroSettings,
        evaluationType,
        checklistData,
        screenType: 'PlanScreen',
        currentStep: currentStep, // Pass current step so we can return to it
        scheduleData: {
          startDate: startDate.toISOString(),
          blockTimeData,
          durationData: durationForPomodoro,
          addPomodoro: true,
          reminderData,
          addReminder,
          addToGoogleCalendar,
          pomodoroSettings,
        },
      };

      navigation.navigate('PomodoroSettings', currentData);
    }
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = time12h => {
    try {
      const [time, period] = time12h.trim().split(' ');
      const [hours, minutes] = time.split(':').map(Number);

      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }

      return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0',
      )}:00`;
    } catch (error) {
      console.error('Error converting time:', error);
      return '00:00:00';
    }
  };

  // VALIDATION AND NAVIGATION LOGIC
  const validateCurrentStep = () => {
    if (toastVisible) {
      hideToast();
    }

    switch (currentStep) {
      case 1:
        // Step 1: Task, Category, Start Date
        if (!taskTitle.trim()) {
          showToast('Enter a name');
          return false;
        }
        return true;

      case 2:
        // Step 2: Duration, Block Time, Priority
        if (!durationData) {
          showToast('Select a duration');
          return false;
        }
        if (!blockTimeData) {
          showToast('Select a block time');
          return false;
        }
        return true;

      case 3:
        // Step 3: Note, Pending Task, Pomodoro
        if (isTimerEvaluation && !addPomodoro) {
          showToast('Select a Pomodoro Timer');
          return false;
        }
        if (addPomodoro && (!pomodoroSettings || !pomodoroSettings.focusTime)) {
          showToast('Please configure Pomodoro settings');
          return false;
        }
        return true;

      case 4:
        // Step 4: Link to Goal, Reminder, Google Calendar - no validation needed
        return true;

      default:
        return true;
    }
  };

  const handleNextPress = async () => {
    // Validate current step
    if (!validateCurrentStep()) {
      return;
    }

    // If we're on the last step, save the task
    if (currentStep === TOTAL_STEPS) {
      await handleSaveTask();
    } else {
      // Move to next step
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBackPress = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  // SAVE TASK LOGIC - REMOVED ALL MUSIC STOPPING CODE
  const handleSaveTask = async () => {
    console.log('📝 PlanScreen: handleSaveTask called');

    if (!user) {
      Alert.alert('Error', 'Please log in to create Plan Your Day.');
      return;
    }

    try {
      let finalDurationForPomodoro = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        finalDurationForPomodoro = calculateDuration(
          blockTimeData.startTime,
          blockTimeData.endTime,
        );
      }

      const planData = {
        title: taskTitle.trim(),
        description: note || '',
        category: selectedCategory?.title || 'Work and Career',
        planType: isChecklistEvaluation ? 'checklist' : 'hours',
        evaluationType: evaluationType || 'yesNo',
        userId: user.id,
        time: blockTimeData?.startTime || null,
        timeColor: '#E4EBF3',
        tags: ['Plan', priority || 'Must'],
        priority: priority || 'Important',
        timerDuration: finalDurationForPomodoro || durationData,
        checklistItems: isChecklistEvaluation
          ? checklistData.checklistItems
          : null,
        successCondition: isChecklistEvaluation
          ? checklistData.successCondition
          : null,
        customItemsCount: isChecklistEvaluation
          ? checklistData.customItemsCount
          : null,
        startDate: startDate
          ? new Date(startDate).toISOString().split('T')[0]
          : null,
        endDate: null,
        isEndDateEnabled: false,
        blockTimeEnabled: !!blockTimeData,
        blockTimeData: blockTimeData,
        durationEnabled: !!durationData,
        durationData: durationData,
        addPomodoro: addPomodoro || false,
        addToGoogleCalendar: addToGoogleCalendar || false,
        isPendingTask: isPendingTask || false,
        linkedGoalId: null,
        linkedGoalTitle: null,
        linkedGoalType: null,
        note: note || '',
      };

      if (addPomodoro && pomodoroSettings) {
        planData.pomodoroSettings = pomodoroSettings;
        planData.focusDuration = pomodoroSettings.focusTime;
        planData.shortBreakDuration = pomodoroSettings.shortBreak;
        planData.longBreakDuration = pomodoroSettings.longBreak;
        planData.focusSessionsPerRound = pomodoroSettings.focusSessionsPerRound;
        planData.autoStartShortBreaks =
          pomodoroSettings.autoStartShortBreaks || false;
        planData.autoStartFocusSessions =
          pomodoroSettings.autoStartFocusSessions || false;
      }

      if (addReminder && reminderData) {
        planData.reminderEnabled = true;
        planData.reminderData = reminderData;
      } else {
        planData.reminderEnabled = false;
        planData.reminderData = null;
      }

      const newPlan = await planYourDayService.createPlanYourDay(planData);
      console.log('✅ PlanScreen: Plan created successfully:', newPlan.id);

      if (blockTimeData && blockTimeData.startTime && startDate) {
        try {
          const time24h = convertTo24Hour(blockTimeData.startTime);
          const confirmationResult =
            await taskConfirmationAlarmManager.scheduleConfirmationAlarm({
              id: newPlan.id,
              title: taskTitle.trim(),
              description: note || '',
              start_date: new Date(startDate).toISOString().split('T')[0],
              start_time: time24h,
              category: selectedCategory?.title || 'Work and Career',
              evaluationType: planData.evaluationType,
            });

          if (confirmationResult.success) {
            console.log(
              '✅ Task confirmation alarm scheduled:',
              confirmationResult.data,
            );
          }
        } catch (confirmError) {
          console.error('❌ Error scheduling task confirmation:', confirmError);
        }
      }

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
              {...planData, userProfile: userProfile},
              newPlan,
            );

          if (scheduledReminders.length > 0) {
            reminderMessage = ` ${scheduledReminders.length} reminder(s) scheduled.`;
          }
        } catch (reminderError) {
          console.error('❌ Error scheduling reminders:', reminderError);
          reminderMessage = ' (Note: Reminders could not be scheduled)';
        }
      }

      const fromNightMode = route.params?.fromNightMode;
      const audioInfo = route.params?.audioInfo;
      const sessionData = route.params?.sessionData;

      const taskType = isChecklistEvaluation ? 'checklist' : 'task';
      Alert.alert(
        'Success',
        `Plan Your Day ${taskType} created successfully!${reminderMessage}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to PlanYourDayScreen with taskCreated flag
              navigation.navigate('PlanYourDayScreen', {
                taskCreated: true,
                newPlanCreated: true,
                fromPlanCreation: true,
                refresh: true,
                fromNightMode: fromNightMode,
                audioInfo: audioInfo,
                sessionData: sessionData,
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error('❌ PlanScreen: Error creating Plan Your Day:', error);
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    }
  };

  const handleLinkToGoalPress = () => {
    if (toastVisible) {
      hideToast();
    }
    navigation.navigate('LinkGoal');
  };

  const formatDisplayDate = date => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return 'Today';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isTomorrow) {
      return 'Tomorrow';
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

    if (timeData && timeData.startTime && timeData.endTime) {
      const calculatedDuration = calculateDuration(
        timeData.startTime,
        timeData.endTime,
      );
      if (!durationData) {
        setDurationData(calculatedDuration);
      }
    }

    if (toastVisible) {
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

  // RENDER STEP CONTENT
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Task, Category, Start Date
        return (
          <>
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
                <Text style={styles.dateText}>
                  {formatDisplayDate(startDate)}
                </Text>
              </View>,
              () => setShowStartDatePicker(true),
            )}
          </>
        );

      case 2:
        // Step 2: Duration, Block Time, Priority
        return (
          <>
            {renderOptionRow(
              Icons.Clock,
              'Duration',
              false,
              false,
              null,
              true,
              handleDurationPress,
              durationData
                ? durationData.formattedDuration ||
                    `${durationData.hours}h ${durationData.minutes}m`
                : null,
            )}

            {renderOptionRow(
              Icons.Alarm,
              'Block Time',
              false,
              false,
              null,
              true,
              handleBlockTimePress,
              blockTimeData
                ? `${blockTimeData.startTime} - ${blockTimeData.endTime}`
                : null,
            )}

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
                          priority === option.value &&
                            styles.priorityButtonSelected,
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
          </>
        );

      case 3:
        // Step 3: Note, Pending Task, Pomodoro
        return (
          <>
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

            {isTimerEvaluation && (
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
                        <>
                          <Text style={styles.optionSubtitle}>
                            {`${pomodoroSettings.focusTime || 25}min focus, ${
                              pomodoroSettings.shortBreak || 5
                            }min break, ${
                              pomodoroSettings.focusSessionsPerRound || 4
                            } sessions`}
                          </Text>
                          {(blockTimeData?.startTime && blockTimeData?.endTime
                            ? calculateDuration(
                                blockTimeData.startTime,
                                blockTimeData.endTime,
                              )
                            : durationData) && (
                            <Text style={styles.pomodoroDuration}>
                              Duration:{' '}
                              {
                                (blockTimeData?.startTime &&
                                blockTimeData?.endTime
                                  ? calculateDuration(
                                      blockTimeData.startTime,
                                      blockTimeData.endTime,
                                    )
                                  : durationData
                                )?.formattedDuration
                              }
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.optionRight}>
                    {renderToggle(addPomodoro, handlePomodoroToggle)}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </>
        );

      case 4:
        // Step 4: Link to Goal, Reminder, Google Calendar
        return (
          <>
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

            <View style={styles.calendarContainer}>
              <View
                style={[
                  styles.optionContainer,
                  addToGoogleCalendar ? styles.noBottomBorder : null,
                ]}>
                <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
                  <View style={styles.optionLeft}>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>
                        Add to Google Calendar
                      </Text>
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
                <View
                  style={[styles.optionContainer, styles.connectedContainer]}>
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
          </>
        );

      default:
        return null;
    }
  };

  // RENDER PROGRESS INDICATOR
  const renderProgressIndicator = () => {
    const dots = [];
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (i < currentStep) {
        // Completed steps
        dots.push(
          <View key={i} style={styles.progressDotCompleted}>
            <MaterialIcons name="check" size={WP(3.2)} color={colors.White} />
          </View>,
        );
      } else if (i === currentStep) {
        // Current active step
        dots.push(
          <View key={i} style={styles.progressDotActive}>
            <View style={styles.progressDotActiveInner}>
              <Text style={styles.progressDotTextActive}>{i}</Text>
            </View>
          </View>,
        );
      } else {
        // Future steps
        dots.push(
          <View key={i} style={styles.progressDotInactive}>
            <Text style={styles.progressDotTextInactive}>{i}</Text>
          </View>,
        );
      }

      // Add line between dots (except after last dot)
      if (i < TOTAL_STEPS) {
        dots.push(<View key={`line-${i}`} style={styles.progressLine} />);
      }
    }

    return <View style={styles.progressIndicator}>{dots}</View>;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers
          title="Plan Your Day"
          onBackPress={currentStep > 1 ? handleBackPress : null}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}

        {/* Next/Done Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextPress}
          activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {currentStep === TOTAL_STEPS ? 'Done' : 'Next'}
          </Text>
        </TouchableOpacity>

        {/* Spacer for bottom content */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Progress Indicator */}
      {renderProgressIndicator()}

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
  nextButton: {
    backgroundColor: colors.Primary,
    paddingVertical: HP(1.4),
    paddingHorizontal: WP(7),
    borderRadius: WP(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: HP(3),
    marginBottom: HP(1),
    alignSelf: 'center',
    elevation: 2,
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.25)},
    shadowOpacity: 0.1,
    shadowRadius: WP(1.5),
  },
  nextButtonText: {
    fontSize: FS(1.8),
    color: colors.White,
    fontFamily: 'OpenSans-Bold',
  },
  bottomSpacer: {
    height: HP(3),
  },
  calendarContainer: {},
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

export default PlanScreen;
