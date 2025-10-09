import React, {useState, useEffect} from 'react';
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
  FlatList,
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
import TaskSkeleton from '../../../Components/TaskSkeleton';
import {HP, WP, FS} from '../../../utils/dimentions';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors, Icons} from '../../../Helper/Contants';
import {planYourDayService} from '../../../services/api/planYourDayService';
import {useAuth} from '../../../contexts/AuthContext';
import ReminderScheduler from '../../../services/notifications/ReminderScheduler';
import {useMusic} from '../../../contexts/MusicContext';
import taskConfirmationAlarmManager from '../../../services/TaskConfirmation/taskConfirmationAlarmManager';

const EditPlanScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const {stopPlanMusic, forceStopPlanMusic} = useMusic();

  // Get plan data from route params
  const {planData, planId} = route.params;

  // Loading state
  const [loading, setLoading] = useState(true);

  // NEW: Track if auto-open has been triggered
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

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

  // Initialize states with existing plan data
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState({title: 'Work and Career'});
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [isPendingTask, setIsPendingTask] = useState(false);
  const [evaluationType, setEvaluationType] = useState(null);
  const [checklistData, setChecklistData] = useState(null);

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

  // Load existing plan data on mount
  useEffect(() => {
    loadPlanData();
  }, []);

  const loadPlanData = async () => {
    try {
      setLoading(true);
      
      // Fetch complete plan data from database
      const plan = await planYourDayService.getPlanYourDayById(planId);
      
      if (plan) {
        // Basic information
        setTaskTitle(plan.title || '');
        setSelectedCategory({title: plan.category || 'Work and Career'});
        setNote(plan.note || plan.description || '');
        setIsPendingTask(plan.is_pending_task || false);
        setEvaluationType(plan.evaluation_type);
        
        // Priority from tags
        if (plan.tags && Array.isArray(plan.tags)) {
          const priorityTag = plan.tags.find(tag => 
            tag.toLowerCase() === 'must' || tag.toLowerCase() === 'important'
          );
          setPriority(priorityTag || 'Important');
        } else {
          setPriority(plan.priority || 'Important');
        }

        // Start date
        if (plan.start_date) {
          setStartDate(new Date(plan.start_date));
        }

        // Duration data
        if (plan.duration_data) {
          setDurationData(typeof plan.duration_data === 'string' 
            ? JSON.parse(plan.duration_data) 
            : plan.duration_data
          );
        }

        // Block time data
        if (plan.block_time_data) {
          setBlockTimeData(typeof plan.block_time_data === 'string'
            ? JSON.parse(plan.block_time_data)
            : plan.block_time_data
          );
        }

        // Reminder data
        if (plan.reminder_enabled && plan.reminder_data) {
          setAddReminder(true);
          setReminderData(typeof plan.reminder_data === 'string'
            ? JSON.parse(plan.reminder_data)
            : plan.reminder_data
          );
        }

        // Google Calendar
        setAddToGoogleCalendar(plan.add_to_google_calendar || false);

        // Pomodoro settings (for timer evaluation type)
        if (plan.evaluation_type === 'timer' && plan.pomodoro_settings) {
          setAddPomodoro(true);
          setPomodoroSettings(typeof plan.pomodoro_settings === 'string'
            ? JSON.parse(plan.pomodoro_settings)
            : plan.pomodoro_settings
          );
        }

        // Checklist data (for checklist evaluation type)
        if (plan.evaluation_type === 'checklist' && plan.checklist_items) {
          setChecklistData({
            checklistItems: typeof plan.checklist_items === 'string'
              ? JSON.parse(plan.checklist_items)
              : plan.checklist_items,
            successCondition: plan.success_condition,
            customItemsCount: plan.custom_items_count,
            taskTitle: plan.title,
            description: plan.description || plan.note,
          });
        }
      }

      setLoading(false);
      
      // NEW: Auto-open Block Time modal if triggered from reschedule
      if (route.params?.fromReschedule && !hasAutoOpened) {
        console.log('[EDIT SCREEN] Auto-opening Block Time modal from reschedule');
        setHasAutoOpened(true);
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowBlockTimeModal(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
      Alert.alert('Error', 'Failed to load plan data');
      setLoading(false);
      navigation.goBack();
    }
  };

  // Load data when screen comes into focus (when returning from PomodoroSettings)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params) {
        const params = route.params;

        // Restore all form data when returning from navigation
        if (params.taskTitle !== undefined) setTaskTitle(params.taskTitle);
        if (params.priority !== undefined) setPriority(params.priority);
        if (params.note !== undefined) setNote(params.note);
        if (params.isPendingTask !== undefined) setIsPendingTask(params.isPendingTask);
        if (params.addReminder !== undefined) setAddReminder(params.addReminder);
        if (params.addToGoogleCalendar !== undefined) setAddToGoogleCalendar(params.addToGoogleCalendar);
        if (params.reminderData) setReminderData(params.reminderData);

        // Restore date data
        if (params.startDate) {
          const date = typeof params.startDate === 'string'
            ? new Date(params.startDate)
            : params.startDate;
          setStartDate(date);
        }

        // Restore schedule data
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

        // Restore pomodoro settings
        if (params.pomodoroSettings) {
          setPomodoroSettings(params.pomodoroSettings);
          setAddPomodoro(true);
        }

        // Restore checklist data
        if (params.checklistData) {
          setChecklistData(params.checklistData);
        }
      }
    }, [route.params]),
  );

  // Check if evaluation type is timer or checklist
  const isTimerEvaluation = evaluationType === 'timer';
  const isChecklistEvaluation = evaluationType === 'checklist';

  const priorityOptions = [
    {label: 'Must', value: 'Must', backgroundColor: '#EFCCCC', textColor: '#AF0000'},
    {label: 'Important', value: 'Important', backgroundColor: '#D0D1E3', textColor: colors.Primary},
  ];

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
      formattedDuration: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h) => {
    try {
      const [time, period] = time12h.trim().split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    } catch (error) {
      console.error('Error converting time:', error);
      return '00:00:00';
    }
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

  // Handle Pomodoro toggle with navigation to PomodoroSettings
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
        calculatedDuration = calculateDuration(blockTimeData.startTime, blockTimeData.endTime);
      }

      const durationForPomodoro = calculatedDuration || durationData;

      if (!durationForPomodoro) {
        showToast('Please select a block time first to calculate duration for Pomodoro');
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
        screenType: 'EditPlanScreen',
        planId: planId, // Pass plan ID for edit mode
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

  // UPDATED: Handle Update button press with task confirmation alarm
  const handleUpdatePress = async () => {
    console.log('🎵 EditPlanScreen: handleUpdatePress called');
    
    if (toastVisible) {
      hideToast();
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to update Plan Your Day.');
      return;
    }

    if (!taskTitle.trim()) {
      showToast('Enter a name');
      return;
    }

    // Validation based on evaluation type
    if (isChecklistEvaluation) {
      if (!durationData) {
        showToast('Select a duration');
        return;
      }

      if (!blockTimeData) {
        showToast('Select a block time');
        return;
      }

      if (!checklistData || !checklistData.checklistItems || checklistData.checklistItems.length === 0) {
        showToast('Checklist items are required');
        return;
      }
    } else {
      if (!durationData) {
        showToast('Select a duration');
        return;
      }

      if (!blockTimeData) {
        showToast('Select a block time');
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
    }

    try {
      // Stop background music first
      console.log('🎵 EditPlanScreen: Stopping background music...');
      try {
        await forceStopPlanMusic();
      } catch (musicError) {
        console.error('🎵 EditPlanScreen: Music stop failed:', musicError);
      }

      // Calculate duration from block time for pomodoro
      let finalDurationForPomodoro = null;
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        finalDurationForPomodoro = calculateDuration(blockTimeData.startTime, blockTimeData.endTime);
      }

      // Prepare updated plan data (using correct database column names)
      const updatedPlanData = {
        title: taskTitle.trim(),
        description: note || '',
        category: selectedCategory?.title || 'Work and Career',
        plan_type: isChecklistEvaluation ? 'checklist' : 'hours',
        evaluation_type: evaluationType || 'yesNo',

        // Visual and display properties
        time: blockTimeData?.startTime || null,
        time_color: '#E4EBF3',
        tags: ['Plan', priority || 'Must'],
        priority: priority || 'Important',

        // Timer-specific data
        timer_duration: finalDurationForPomodoro || durationData,

        // Checklist-specific data
        checklist_items: isChecklistEvaluation ? checklistData.checklistItems : null,

        // Scheduling settings
        start_date: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
        end_date: null,
        is_end_date_enabled: false,

        // Block time settings
        block_time_data: blockTimeData,

        // Duration settings
        duration_data: durationData,

        // Additional features (using correct column names)
        add_to_google_calendar: addToGoogleCalendar || false,
        is_pending_task: isPendingTask || false,

        // Goal linking
        linked_goal_id: null,
        linked_goal_title: null,
        linked_goal_type: null,

        // Notes
        note: note || '',
      };

      // Add pomodoro settings if enabled (using correct column names)
      if (addPomodoro && pomodoroSettings) {
        updatedPlanData.pomodoro_settings = pomodoroSettings;
        updatedPlanData.focus_duration = pomodoroSettings.focusTime;
        updatedPlanData.short_break_duration = pomodoroSettings.shortBreak;
        updatedPlanData.long_break_duration = pomodoroSettings.longBreak;
        updatedPlanData.focus_sessions_per_round = pomodoroSettings.focusSessionsPerRound;
        updatedPlanData.auto_start_short_breaks = pomodoroSettings.autoStartShortBreaks || false;
        updatedPlanData.auto_start_focus_sessions = pomodoroSettings.autoStartFocusSessions || false;
      } else {
        // Clear pomodoro settings if disabled
        updatedPlanData.pomodoro_settings = null;
        updatedPlanData.focus_duration = null;
        updatedPlanData.short_break_duration = null;
        updatedPlanData.long_break_duration = null;
        updatedPlanData.focus_sessions_per_round = null;
        updatedPlanData.auto_start_short_breaks = false;
        updatedPlanData.auto_start_focus_sessions = false;
      }

      // Add reminder data if enabled (using correct column names)
      if (addReminder && reminderData) {
        updatedPlanData.reminder_enabled = true;
        updatedPlanData.reminder_data = reminderData;
      } else {
        updatedPlanData.reminder_enabled = false;
        updatedPlanData.reminder_data = null;
      }

      console.log('🎵 EditPlanScreen: Updating Plan Your Day:', updatedPlanData);

      // Update plan in database
      const updatedPlan = await planYourDayService.updatePlanYourDay(planId, updatedPlanData);
      console.log('🎵 EditPlanScreen: Plan updated successfully:', updatedPlan);

      // Schedule task confirmation alarm if start time is available
      if (blockTimeData && blockTimeData.startTime && startDate) {
        try {
          console.log('Scheduling task confirmation alarm for updated task...');
          
          // Convert 12-hour format to 24-hour format
          const time24h = convertTo24Hour(blockTimeData.startTime);
          
          const confirmationResult = await taskConfirmationAlarmManager.scheduleConfirmationAlarm({
            id: updatedPlan.id,
            title: taskTitle.trim(),
            description: note || '',
            start_date: new Date(startDate).toISOString().split('T')[0],
            start_time: time24h,
            category: selectedCategory?.title || 'Work and Career',
            evaluationType: updatedPlanData.evaluation_type,
          });

          if (confirmationResult.success) {
            console.log('Task confirmation alarm scheduled for updated task:', confirmationResult.data);
          } else {
            console.warn('Failed to schedule confirmation alarm:', confirmationResult.error);
          }
        } catch (confirmError) {
          console.error('Error scheduling task confirmation:', confirmError);
        }
      }

      // Schedule reminders if enabled
      let reminderMessage = '';
      if (updatedPlanData.reminder_enabled && updatedPlanData.reminder_data) {
        try {
          const userProfile = {
            username: user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email?.split('@')[0],
            display_name: user?.user_metadata?.display_name,
            user_metadata: user?.user_metadata,
            email: user?.email,
          };

          const scheduledReminders = await ReminderScheduler.scheduleTaskReminders(
            {
              ...updatedPlanData,
              userProfile: userProfile,
            },
            updatedPlan,
          );

          if (scheduledReminders.length > 0) {
            reminderMessage = ` ${scheduledReminders.length} reminder(s) scheduled.`;
          }
        } catch (reminderError) {
          console.error('🎵 EditPlanScreen: Error scheduling reminders:', reminderError);
          reminderMessage = ' (Note: Reminders could not be scheduled)';
        }
      }

      // Final music stop
      try {
        await forceStopPlanMusic();
      } catch (finalMusicError) {
        console.error('🎵 EditPlanScreen: Final music stop failed:', finalMusicError);
      }

      // Show success message
      const taskType = isChecklistEvaluation ? 'checklist' : 'task';
      Alert.alert('Success', `Plan Your Day ${taskType} updated successfully!${reminderMessage}`, [
        {
          text: 'OK',
          onPress: () => {
            forceStopPlanMusic().catch(error => {
              console.error('🎵 EditPlanScreen: Pre-navigation music stop failed:', error);
            });

            navigation.reset({
              index: 0,
              routes: [{name: 'BottomTab', params: {planUpdated: true}}],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('🎵 EditPlanScreen: Error updating Plan Your Day:', error);
      
      try {
        await forceStopPlanMusic();
      } catch (errorMusicStop) {
        console.error('🎵 EditPlanScreen: Error case music stop failed:', errorMusicStop);
      }
      
      Alert.alert('Error', 'Failed to update plan. Please try again.');
    }
  };

  const formatDisplayDate = date => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return 'Today';
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      const calculatedDuration = calculateDuration(timeData.startTime, timeData.endTime);
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
      <TouchableOpacity style={styles.toggleContainer} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.toggleTrack, isEnabled ? styles.toggleTrackActive : styles.toggleTrackInactive]}>
          <View style={[styles.toggleSwitch, isEnabled ? styles.toggleSwitchActive : styles.toggleSwitchInactive]} />
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
            <Image source={iconSource} style={styles.optionIcon} resizeMode="contain" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{title}</Text>
              {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
            </View>
          </View>

          <View style={styles.optionRight}>
            {hasToggle && renderToggle(toggleState, onTogglePress)}
            {hasPlus && (
              <TouchableOpacity onPress={onPlusPress} style={styles.plusButton} activeOpacity={0.7}>
                <Image source={Icons.Plus} style={styles.plusIcon} resizeMode="contain" />
              </TouchableOpacity>
            )}
            {hasDropdown && <MaterialIcons name="keyboard-arrow-down" size={WP(6)} color="#646464" />}
            {customRight && customRight}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Render sections (same as PlanScreen)
  const renderDurationSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={handleDurationPress}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Clock} style={styles.optionIcon} resizeMode="contain" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Duration</Text>
              {durationData && (
                <Text style={styles.optionSubtitle}>
                  {durationData.formattedDuration || `${durationData.hours}h ${durationData.minutes}m`}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.optionRight}>
            <TouchableOpacity onPress={handleDurationPress} style={styles.plusButton} activeOpacity={0.7}>
              <Image source={Icons.Plus} style={styles.plusIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBlockTimeSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={handleBlockTimePress}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Alarm} style={styles.optionIcon} resizeMode="contain" />
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
            <TouchableOpacity onPress={handleBlockTimePress} style={styles.plusButton} activeOpacity={0.7}>
              <Image source={Icons.Plus} style={styles.plusIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPomodoroSection = () => {
    if (!isTimerEvaluation) {
      return null;
    }

    const formatPomodoroDisplay = () => {
      if (!pomodoroSettings) return null;
      const focusTime = pomodoroSettings.focusTime || 25;
      const shortBreak = pomodoroSettings.shortBreak || 5;
      const sessionsPerRound = pomodoroSettings.focusSessionsPerRound || 4;
      return `${focusTime}min focus, ${shortBreak}min break, ${sessionsPerRound} sessions`;
    };

    const getDurationDisplay = () => {
      if (blockTimeData && blockTimeData.startTime && blockTimeData.endTime) {
        const calculatedDuration = calculateDuration(blockTimeData.startTime, blockTimeData.endTime);
        return calculatedDuration ? calculatedDuration.formattedDuration : null;
      }
      return durationData ? durationData.formattedDuration : null;
    };

    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Clock} style={styles.optionIcon} resizeMode="contain" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Add Pomodoro</Text>
              {addPomodoro && pomodoroSettings && (
                <Text style={styles.optionSubtitle}>{formatPomodoroDisplay()}</Text>
              )}
              {addPomodoro && getDurationDisplay() && (
                <Text style={styles.pomodoroDuration}>Duration: {getDurationDisplay()}</Text>
              )}
            </View>
          </View>
          <View style={styles.optionRight}>{renderToggle(addPomodoro, handlePomodoroToggle)}</View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPrioritySection = () => {
    return (
      <View style={[styles.optionContainer, showPriorityDropdown && styles.priorityContainerExpanded]}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={handlePriorityPress}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Flag} style={styles.optionIcon} resizeMode="contain" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Priority</Text>
            </View>
          </View>
          <View style={styles.optionRight}>
            <MaterialIcons
              name={showPriorityDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
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
                  <Text style={[styles.priorityButtonText, {color: option.textColor}]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderNoteSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={handleNotePress}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Note} style={styles.optionIcon} resizeMode="contain" />
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
          <View style={styles.optionRight}>{renderToggle(addReminder, handleReminderToggle)}</View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPendingTaskSection = () => {
    return (
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
          <View style={styles.optionLeft}>
            <Image source={Icons.Pending} style={styles.optionIcon1} resizeMode="contain" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Pending Task</Text>
              <Text style={styles.pendingSubtitle}>It will be shown each day until completed.</Text>
            </View>
          </View>
          <View style={styles.optionRight}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setIsPendingTask(!isPendingTask)}
              activeOpacity={0.7}>
              <View style={[styles.radioOuter, isPendingTask && styles.radioOuterSelected]}>
                {isPendingTask && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

        {/* Header */}
        <View style={styles.headerWrapper}>
          <Headers title="Edit Plan Your Day">
            <View style={{width: WP(15)}} />
          </Headers>
        </View>

        {/* Loading Skeleton */}
        <View style={styles.loadingContent}>
          <FlatList
            data={[1, 2, 3, 4, 5, 6, 7, 8]}
            keyExtractor={(item, index) => `skeleton-${index}`}
            renderItem={() => <TaskSkeleton />}
            contentContainerStyle={{paddingHorizontal: WP(3.5)}}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <Headers title="Edit Plan Your Day">
          <TouchableOpacity onPress={handleUpdatePress}>
            <Text style={styles.nextText}>Update</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.taskInputContainer}>
          <Text
            style={[
              styles.inputLabel,
              isTaskLabelActive ? styles.inputLabelActive : styles.inputLabelInactive,
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
              <Image source={Icons.Category} style={styles.optionIcon} resizeMode="contain" />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Category</Text>
              </View>
            </View>
            <View style={styles.categoryRight}>
              <Text style={styles.categoryText}>{selectedCategory?.title || 'Work and Career'}</Text>
              <Image
                source={getCategoryIcon(selectedCategory?.title || 'Work and Career')}
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

        {/* Duration */}
        {renderDurationSection()}

        {/* Block Time */}
        {renderBlockTimeSection()}

        {/* Add Pomodoro */}
        {renderPomodoroSection()}

        {/* Priority */}
        {renderPrioritySection()}

        {/* Note */}
        {renderNoteSection()}

        {/* Pending Task */}
        {renderPendingTaskSection()}

        {/* Add a Reminder */}
        {renderReminderSection()}

        {/* Add to Google Calendar */}
        <View style={styles.calendarContainer}>
          <View style={[styles.optionContainer, addToGoogleCalendar ? styles.noBottomBorder : null]}>
            <TouchableOpacity style={styles.optionRow} activeOpacity={1}>
              <View style={styles.optionLeft}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Add to Google Calendar</Text>
                </View>
              </View>
              <View>{renderToggle(addToGoogleCalendar, () => setAddToGoogleCalendar(!addToGoogleCalendar))}</View>
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

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        initialDate={startDate}
        title="Select Start Date"
      />

      <DurationModal
        visible={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSave={handleDurationSave}
        initialData={durationData}
      />

      <BlockTimeModalOld
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        onSave={handleBlockTimeSave}
        initialBlockTimeData={blockTimeData}
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
  loadingContent: {
    flex: 1,
    paddingTop: HP(2),
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
    shadowOffset: {width: 0, height: HP(0.25)},
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
    shadowOffset: {width: 0, height: HP(0.25)},
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
});

export default EditPlanScreen;