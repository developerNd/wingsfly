import React, {useState, useEffect, useMemo} from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Logo from '../../assets/Images/brand.svg';
import PlusIcon from 'react-native-vector-icons/AntDesign';
import Calender from '../../Components/Calender';
import {colors, Icons} from '../../Helper/Contants';
import Modal from 'react-native-modal';
import TaskCard from '../../Components/TaskCard';
import TaskSkeleton from '../../Components/TaskSkeleton';
import ModalTaskCard from '../../Components/ModalTaskCard';
import NumericInputModal from '../../Components/NumericModal';
import DatePickerModal from '../../Components/DatePickerModal';
import WelcomePopup from '../../Components/WelcomePopup';
import MonthReminderModal from '../../Components/MonthReminderModal';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../../utils/dimentions';
import {taskService} from '../../services/api/taskService';
import {taskCompletionsService} from '../../services/api/taskCompletionsService';
import {planYourDayService} from '../../services/api/planYourDayService';
import {useAuth} from '../../contexts/AuthContext';
import {useSession} from '../../contexts/SessionContext';
import {shouldTaskAppearOnDate} from '../../utils/taskDateHelper';
import {getCompletionDateString} from '../../utils/dateUtils';

const Home = () => {
  const [checkboxStates, setCheckboxStates] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [isNumericModalVisible, setNumericModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isWelcomePopupVisible, setWelcomePopupVisible] = useState(false);
  const [isMonthReminderVisible, setMonthReminderVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [planYourDayEntries, setPlanYourDayEntries] = useState([]);
  const [allPlanYourDay, setAllPlanYourDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toDateString());
  const [taskCompletions, setTaskCompletions] = useState({});

  const navigation = useNavigation();
  const {user} = useAuth();
  const {
    shouldShowWelcome,
    shouldShowMonthReminder,
    markWelcomeShown,
    markMonthReminderShown,
    getSessionInfo,
  } = useSession();

  console.log('Home component initialized with selectedDate:', selectedDate);

  const completionDateString = useMemo(() => {
    return getCompletionDateString(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (user && shouldShowWelcome()) {
      console.log('Showing welcome popup - first time in session');
      console.log('Session info:', getSessionInfo());

      const timer = setTimeout(() => {
        setWelcomePopupVisible(true);
        markWelcomeShown();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      console.log('Not showing welcome popup:', {
        hasUser: !!user,
        shouldShow: shouldShowWelcome(),
        sessionInfo: getSessionInfo(),
      });
      if (user && shouldShowMonthReminder()) {
        console.log('Showing month reminder - once per day');
        const timer = setTimeout(() => {
          setMonthReminderVisible(true);
          markMonthReminderShown();
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleWelcomeClose = () => {
    setWelcomePopupVisible(false);

    // After welcome closes, check if we should show month reminder
    if (shouldShowMonthReminder()) {
      console.log('Welcome closed - showing month reminder next');
      setTimeout(() => {
        setMonthReminderVisible(true);
        markMonthReminderShown();
      }, 800); // Small delay for smooth transition
    }
  };

  // NEW: Handle month reminder close
  const handleMonthReminderClose = () => {
    console.log('Month reminder closed');
    setMonthReminderVisible(false);
  };

  const parseTimeToMinutes = timeStr => {
    if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') {
      return 9999;
    }

    try {
      const timeStr12Hour = timeStr.trim().toUpperCase();
      const isAM = timeStr12Hour.includes('AM');
      const isPM = timeStr12Hour.includes('PM');

      if (!isAM && !isPM) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          return 9999;
        }
        return hours * 60 + minutes;
      } else {
        const timeWithoutAMPM = timeStr12Hour.replace(/AM|PM/g, '').trim();
        const [hours, minutes] = timeWithoutAMPM.split(':').map(Number);

        if (isNaN(hours) || isNaN(minutes)) {
          return 9999;
        }

        let adjustedHours = hours;
        if (isPM && hours !== 12) {
          adjustedHours += 12;
        } else if (isAM && hours === 12) {
          adjustedHours = 0;
        }

        return adjustedHours * 60 + minutes;
      }
    } catch (error) {
      console.error(
        'Error parsing time for sorting:',
        error,
        'Input:',
        timeStr,
      );
      return 9999;
    }
  };

  const progress = useMemo(() => {
    const totalItems = tasks.length + planYourDayEntries.length;
    if (totalItems === 0) return 0;

    const completedTasks = tasks.filter(task => {
      const taskId = task.id;
      const completion = taskCompletions[taskId];
      return completion?.is_completed === true;
    });

    // FIXED: Check completion for Plan Your Day items using the correct task ID mapping
    const completedPlans = planYourDayEntries.filter(plan => {
      const planId = plan.id; // This should be the prefixed ID like "plan_uuid"
      const completion = taskCompletions[planId];
      return completion?.is_completed === true;
    });

    const totalCompleted = completedTasks.length + completedPlans.length;
    const progressPercentage = Math.round((totalCompleted / totalItems) * 100);
    return Math.min(progressPercentage, 100);
  }, [tasks, planYourDayEntries, taskCompletions]);

  const loadTaskCompletions = async dateInput => {
    if (!user) return;

    try {
      const completionDate = getCompletionDateString(dateInput);
      console.log(
        'Loading completions for date:',
        completionDate,
        'from input:',
        dateInput,
      );

      const completions =
        await taskCompletionsService.getTaskCompletionsForDate(
          user.id,
          completionDate,
        );

      console.log('Loaded completions:', completions.length);

      const completionsMap = {};

      completions.forEach(completion => {
        // Default mapping for tasks
        completionsMap[completion.task_id] = completion;

        // Also create a prefixed mapping for plans
        // This handles the case where a completion belongs to a plan
        const prefixedId = `plan_${completion.task_id}`;
        completionsMap[prefixedId] = completion;

        console.log(
          `Completion loaded for ${completion.task_id}: completed=${completion.is_completed}`,
        );
      });

      setTaskCompletions(completionsMap);

      const newCheckboxStates = {};

      // Set checkbox states for regular tasks
      tasks.forEach(task => {
        const completion = completionsMap[task.id];
        if (completion?.is_completed === true) {
          newCheckboxStates[task.id] = 4;
        } else {
          newCheckboxStates[task.id] = 1;
        }
      });

      // Set checkbox states for Plan Your Day items using prefixed IDs
      planYourDayEntries.forEach(plan => {
        const planId = plan.id; // This should already be prefixed like "plan_uuid"
        const completion = completionsMap[planId];
        if (completion?.is_completed === true) {
          newCheckboxStates[planId] = 4;
          console.log(`Plan ${planId} marked as completed in checkbox states`);
        } else {
          newCheckboxStates[planId] = 1;
          console.log(`Plan ${planId} marked as incomplete in checkbox states`);
        }
      });

      setCheckboxStates(newCheckboxStates);
    } catch (error) {
      console.error('Error loading task completions:', error);
    }
  };

  const loadPlanYourDay = async () => {
    if (!user) {
      return;
    }

    try {
      const planData = await planYourDayService.getPlanYourDayEntries(user.id);

      const transformedPlans = planData.map(plan => ({
        id: `plan_${plan.id}`,
        originalId: plan.id,
        title: plan.title,
        description: plan.description,
        category: plan.category,
        taskType: 'Plan Your Day',
        evaluationType: plan.evaluation_type,
        planType: plan.plan_type,
        time: plan.time,
        timeColor: plan.time_color,
        tags: plan.tags || [],
        image: plan.image,
        hasFlag:
          plan.tags &&
          plan.tags.some(tag => {
            const tagLower = tag.toLowerCase();
            return (
              tagLower === 'important' ||
              tagLower === 'must' ||
              tagLower === 'urgent' ||
              tagLower === 'priority'
            );
          }),
        priority: plan.priority,
        type: plan.evaluation_type,
        targetHours: plan.target_hours,
        targetTasks: plan.target_tasks,
        actualHours: plan.actual_hours,
        actualTasks: plan.actual_tasks,
        timerDuration: plan.timer_duration,
        checklistItems: plan.checklist_items,
        startDate: plan.start_date || null,
        endDate: plan.end_date,
        isEndDateEnabled: plan.is_end_date_enabled,
        blockTimeEnabled: false,
        blockTimeData: plan.block_time_data,
        durationEnabled: false,
        durationData: plan.duration_data,
        reminderEnabled: plan.reminder_enabled,
        reminderData: plan.reminder_data,
        focusDuration: plan.focus_duration,
        shortBreakDuration: plan.short_break_duration,
        longBreakDuration: plan.long_break_duration,
        autoStartShortBreaks: plan.auto_start_short_breaks,
        autoStartFocusSessions: plan.auto_start_focus_sessions,
        focusSessionsPerRound: plan.focus_sessions_per_round,
        addToGoogleCalendar: plan.add_to_google_calendar,
        linkedGoalId: plan.linked_goal_id,
        linkedGoalTitle: plan.linked_goal_title,
        linkedGoalType: plan.linked_goal_type,
        note: plan.note,
        created_at: plan.created_at,
        isPlan: true,
      }));

      setAllPlanYourDay(transformedPlans);
    } catch (error) {
      console.error('Error loading Plan Your Day entries:', error);
      Alert.alert(
        'Error',
        'Failed to load Plan Your Day entries. Please try again.',
      );
    }
  };

  const loadTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [tasksData] = await Promise.all([
        taskService.getTasks(user.id),
        loadPlanYourDay(),
      ]);

      const transformedTasks = tasksData.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: task.task_type,
        evaluationType: task.evaluation_type,
        time: task.time,
        timeColor: task.time_color,
        tags: task.tags || [],
        image: task.image,
        hasFlag: task.has_flag,
        priority: task.priority,
        type: task.evaluation_type,
        progress: task.progress,
        numericValue: task.numeric_value,
        numericGoal: task.numeric_goal,
        numericUnit: task.numeric_unit,
        numericCondition: task.numeric_condition,
        timerDuration: task.timer_duration,
        timerCondition: task.timer_condition,
        checklistItems: task.checklist_items,
        successCondition: task.success_condition,
        customItemsCount: task.custom_items_count,
        frequencyType: task.frequency_type,
        selectedWeekdays: task.selected_weekdays,
        selectedMonthDates: task.selected_month_dates,
        selectedYearDates: task.selected_year_dates,
        periodDays: task.period_days,
        periodType: task.period_type,
        isFlexible: task.is_flexible,
        isMonthFlexible: task.is_month_flexible,
        isYearFlexible: task.is_year_flexible,
        useDayOfWeek: task.use_day_of_week,
        isRepeatFlexible: task.is_repeat_flexible,
        isRepeatAlternateDays: task.is_repeat_alternate_days,
        everyDays: task.every_days,
        activityDays: task.activity_days,
        restDays: task.rest_days,
        startDate: task.start_date || null,
        endDate: task.end_date,
        isEndDateEnabled: task.is_end_date_enabled,
        blockTimeEnabled: task.block_time_enabled,
        blockTimeData: task.block_time_data,
        durationEnabled: task.duration_enabled,
        durationData: task.duration_data,
        reminderEnabled: task.reminder_enabled,
        reminderData: task.reminder_data,
        addPomodoro: task.add_pomodoro,
        focusDuration: task.focus_duration,
        shortBreakDuration: task.short_break_duration,
        longBreakDuration: task.long_break_duration,
        autoStartShortBreaks: task.auto_start_short_breaks,
        autoStartFocusSessions: task.auto_start_focus_sessions,
        pomodoroDuration: task.pomodoro_duration,
        focusSessionsPerRound: task.focus_sessions_per_round,
        addToGoogleCalendar: task.add_to_google_calendar,
        isPendingTask: task.is_pending_task,
        linkedGoalId: task.linked_goal_id,
        linkedGoalTitle: task.linked_goal_title,
        linkedGoalType: task.linked_goal_type,
        note: task.note,
        created_at: task.created_at,
        isPlan: false,
      }));

      setAllTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async taskId => {
    try {
      setLoading(true);

      if (taskId.startsWith('plan_')) {
        const originalId = taskId.replace('plan_', '');

        await planYourDayService.deletePlanYourDay(originalId);

        setAllPlanYourDay(prev => prev.filter(plan => plan.id !== taskId));
        setPlanYourDayEntries(prev => prev.filter(plan => plan.id !== taskId));
      } else {
        await taskService.deleteTask(taskId);

        setAllTasks(prev => prev.filter(task => task.id !== taskId));
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }

      setCheckboxStates(prev => {
        const newStates = {...prev};
        delete newStates[taskId];
        return newStates;
      });

      setTaskCompletions(prev => {
        const newCompletions = {...prev};
        delete newCompletions[taskId];
        return newCompletions;
      });

      Alert.alert('Success', 'Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setModalVisible(false);
      setNumericModalVisible(false);
      loadTasks();
    }, [user]),
  );

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const route = navigation.getState()?.routes?.find(r => r.name === 'Home');

      if (route?.params?.completedTaskId) {
        const completionDate =
          route.params?.completedDate || completionDateString;
        markTaskCompleted(route.params.completedTaskId, completionDate);

        navigation.setParams({
          completedTaskId: undefined,
          showAppreciation: undefined,
          taskData: undefined,
          completedDate: undefined,
        });
      }

      if (route?.params?.newTaskCreated) {
        loadTasks();
        navigation.setParams({newTaskCreated: undefined});
      }

      if (route?.params?.newPlanCreated) {
        loadTasks();
        navigation.setParams({newPlanCreated: undefined});
      }
    });

    return unsubscribe;
  }, [navigation, completionDateString]);

  const shouldPlanAppearOnDate = (plan, dateString) => {
    if (!plan.startDate) {
      return true;
    }

    const planStartDate = new Date(plan.startDate).toDateString();
    const checkDate = new Date(dateString).toDateString();

    return planStartDate === checkDate;
  };

  const shouldRegularTaskAppearOnDate = (task, dateString) => {
    if (!task.startDate) {
      return true;
    }

    return shouldTaskAppearOnDate(task, dateString);
  };

  const filteredTasks = useMemo(() => {
    const filteredRegularTasks = allTasks.filter(task => {
      return shouldRegularTaskAppearOnDate(task, selectedDate);
    });

    const filteredPlans = allPlanYourDay.filter(plan => {
      return shouldPlanAppearOnDate(plan, selectedDate);
    });

    const combinedItems = [...filteredRegularTasks, ...filteredPlans];

    console.log('Filtering items for date:', selectedDate);
    console.log('Regular tasks:', filteredRegularTasks.length);
    console.log('Plan Your Day entries:', filteredPlans.length);
    console.log('Total items:', combinedItems.length);

    const sortedItems = combinedItems.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);

      const hasValidTimeA =
        a.time && typeof a.time === 'string' && a.time.trim() !== '';
      const hasValidTimeB =
        b.time && typeof b.time === 'string' && b.time.trim() !== '';

      if (hasValidTimeA && hasValidTimeB) {
        return timeA - timeB;
      }

      if (hasValidTimeA && !hasValidTimeB) {
        return -1;
      }
      if (!hasValidTimeA && hasValidTimeB) {
        return 1;
      }

      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateA - dateB;
    });

    console.log('Filtered and sorted items count:', sortedItems.length);

    return sortedItems;
  }, [allTasks, allPlanYourDay, selectedDate]);

  useEffect(() => {
    const regularTasks = filteredTasks.filter(item => !item.isPlan);
    const plans = filteredTasks.filter(item => item.isPlan);

    setTasks(regularTasks);
    setPlanYourDayEntries(plans);

    if (filteredTasks.length >= 0) {
      loadTaskCompletions(selectedDate);
    }
  }, [filteredTasks, selectedDate]);

  useEffect(() => {
    loadTasks();
  }, [user]);

  const handleDateSelect = dateString => {
    console.log(
      'handleDateSelect called with:',
      dateString,
      'type:',
      typeof dateString,
    );
    console.log('Previous selectedDate:', selectedDate);
    console.log(
      'Completion date will be:',
      getCompletionDateString(dateString),
    );

    setLoading(true);
    setSelectedDate(dateString);

    setTaskCompletions({});
    setCheckboxStates({});

    setTimeout(() => {
      setLoading(false);
      console.log('Date selection completed. New selectedDate:', dateString);
    }, 300);
  };

  const handleDatePickerSelect = date => {
    const dateString = date.toDateString();
    handleDateSelect(dateString);
  };

  const refreshTasks = () => {
    loadTasks();
  };

  const modaltasks = [
    {
      id: '1',
      Heading: 'Habit',
      title:
        'Activity that repeats over time it has detailed tracking and statistics.',
      image: Icons.Habit,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Habit'});
      },
    },
    {
      id: '2',
      Heading: 'Recurring Task',
      title:
        'Activity that repeats over time it has detailed tracking and statistics.',
      image: Icons.Recurring,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Recurring'});
      },
    },
    {
      id: '3',
      Heading: 'Task',
      title: 'Single instance activity without tracking over time.',
      image: Icons.Task,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('CategorySelection', {type: 'Task'});
      },
    },
    {
      id: '4',
      Heading: 'Create Challenge',
      title: 'Set up a multi-day challenge with specific goals and duration.',
      image: Icons.Goal,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('ChallengeScreen', {type: 'Goal'});
      },
    },
    {
      id: '5',
      Heading: 'Plan Your Day',
      title: 'Design your day for maximum productivity and focus.',
      image: Icons.Goal,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('PlanYourDayScreen', {type: 'Plan'});
      },
    },
  ];

  const navigateToAchievementScreen = task => {
    let startTime = null;
    let endTime = null;
    let totalCompletedTime = 0;

    console.log('Processing task for achievement screen:', {
      title: task.title,
      isPlan: task.isPlan,
      blockTimeData: task.blockTimeData,
      durationData: task.durationData,
      timerDuration: task.timerDuration,
    });

    // For Plan Your Day items, check duration data directly
    if (task.isPlan && task.durationData) {
      try {
        const durationData =
          typeof task.durationData === 'string'
            ? JSON.parse(task.durationData)
            : task.durationData;

        console.log('Using Plan Your Day duration data:', durationData);

        if (durationData.totalMinutes) {
          totalCompletedTime = durationData.totalMinutes * 60; // Convert to seconds
        } else if (
          durationData.hours !== undefined ||
          durationData.minutes !== undefined
        ) {
          const hours = durationData.hours || 0;
          const minutes = durationData.minutes || 0;
          totalCompletedTime = hours * 3600 + minutes * 60;
        }

        console.log(
          `Plan duration: ${Math.floor(
            totalCompletedTime / 60,
          )} minutes (${totalCompletedTime} seconds)`,
        );
      } catch (error) {
        console.error('Error parsing Plan Your Day duration data:', error);
      }
    }
    // For Plan Your Day items, also check block time data if available
    else if (task.isPlan && task.blockTimeData) {
      try {
        const blockTimeData =
          typeof task.blockTimeData === 'string'
            ? JSON.parse(task.blockTimeData)
            : task.blockTimeData;

        console.log('Using Plan Your Day block time data:', blockTimeData);

        if (blockTimeData.startTime && blockTimeData.endTime) {
          startTime = blockTimeData.startTime;
          endTime = blockTimeData.endTime;
          totalCompletedTime = calculateTimeDuration(startTime, endTime);
        }
      } catch (error) {
        console.error('Error parsing Plan Your Day block time data:', error);
      }
    }
    // For regular tasks, check block time if enabled
    else if (!task.isPlan && task.blockTimeEnabled && task.blockTimeData) {
      try {
        const blockTimeData =
          typeof task.blockTimeData === 'string'
            ? JSON.parse(task.blockTimeData)
            : task.blockTimeData;

        console.log('Using task block time data:', blockTimeData);

        if (blockTimeData.startTime && blockTimeData.endTime) {
          startTime = blockTimeData.startTime;
          endTime = blockTimeData.endTime;
          totalCompletedTime = calculateTimeDuration(startTime, endTime);
        }
      } catch (error) {
        console.error('Error parsing task block time data:', error);
      }
    }
    // For regular tasks, check timer duration
    else if (!task.isPlan && task.timerDuration) {
      try {
        let durationInMinutes = 0;

        if (
          typeof task.timerDuration === 'object' &&
          task.timerDuration !== null
        ) {
          if (task.timerDuration.totalMinutes) {
            durationInMinutes = task.timerDuration.totalMinutes;
          } else if (
            task.timerDuration.hours !== undefined ||
            task.timerDuration.minutes !== undefined
          ) {
            const hours = task.timerDuration.hours || 0;
            const minutes = task.timerDuration.minutes || 0;
            durationInMinutes = hours * 60 + minutes;
          }
        } else if (typeof task.timerDuration === 'number') {
          durationInMinutes = task.timerDuration;
        }

        totalCompletedTime = durationInMinutes * 60; // Convert to seconds
        console.log(
          `Task timer duration: ${durationInMinutes} minutes (${totalCompletedTime} seconds)`,
        );
      } catch (error) {
        console.error('Error parsing task timer duration:', error);
      }
    }

    if (isNaN(totalCompletedTime) || totalCompletedTime < 0) {
      console.warn('Final validation failed, setting totalCompletedTime to 0');
      totalCompletedTime = 0;
    }

    const achievementData = {
      taskData: task,
      totalPomodoros: 1,
      completedPomodoros: 1,
      totalBreaks: 0,
      completedBreaks: 0,
      totalShortBreaks: 0,
      totalLongBreaks: 0,
      completedShortBreaks: 0,
      completedLongBreaks: 0,
      selectedDate: selectedDate,
      totalCompletedTime: totalCompletedTime,
      completionDate: getCompletionDateString(selectedDate),
      startTime: startTime,
      endTime: endTime,
      userName: user?.name || user?.email || 'User',
    };

    console.log('Final achievement data being passed:', {
      ...achievementData,
      totalCompletedTimeMinutes: Math.floor(totalCompletedTime / 60),
      totalCompletedTimeFormatted: `${Math.floor(totalCompletedTime / 60)}m ${
        totalCompletedTime % 60
      }s`,
    });

    navigation.navigate('AchievementScreen', achievementData);
  };

  // Helper function to calculate time duration from start and end times
  const calculateTimeDuration = (startTime, endTime) => {
    const parseTimeString = timeStr => {
      if (!timeStr || typeof timeStr !== 'string') {
        return 0;
      }

      const timeStr12Hour = timeStr.trim().toUpperCase();
      const isAM = timeStr12Hour.includes('AM');
      const isPM = timeStr12Hour.includes('PM');

      if (!isAM && !isPM) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return 0;
        return hours * 3600 + minutes * 60;
      } else {
        const timeWithoutAMPM = timeStr12Hour.replace(/AM|PM/g, '').trim();
        const [hours, minutes] = timeWithoutAMPM.split(':').map(Number);

        if (isNaN(hours) || isNaN(minutes)) return 0;

        let adjustedHours = hours;
        if (isPM && hours !== 12) {
          adjustedHours += 12;
        } else if (isAM && hours === 12) {
          adjustedHours = 0;
        }

        return adjustedHours * 3600 + minutes * 60;
      }
    };

    try {
      const startSeconds = parseTimeString(startTime);
      const endSeconds = parseTimeString(endTime);

      if (startSeconds === 0 && endSeconds === 0) {
        return 0;
      }

      let duration;
      if (endSeconds < startSeconds) {
        // Time spans midnight
        duration = endSeconds + 24 * 3600 - startSeconds;
      } else {
        duration = endSeconds - startSeconds;
      }

      return duration > 0 ? duration : 0;
    } catch (error) {
      console.error('Error calculating time duration:', error);
      return 0;
    }
  };

  const handlePlanYourDayCompletion = async (planId, isCompleted = true) => {
    try {
      const plan = allPlanYourDay.find(p => p.id === planId);
      if (!plan) {
        console.error('Plan not found:', planId);
        return;
      }

      const originalId = plan.originalId;
      const completionDate = getCompletionDateString(selectedDate);
      console.log(
        `Updating Plan Your Day completion for ${originalId} on ${completionDate}: ${isCompleted}`,
      );

      let completion;

      switch (plan.evaluationType) {
        case 'yesNo':
          completion = await taskCompletionsService.upsertYesNoCompletion(
            originalId,
            user.id,
            completionDate,
            isCompleted,
          );
          break;

        case 'timer':
          const timerDuration = plan.timerDuration || 25;
          completion = await taskCompletionsService.upsertTimerCompletion(
            originalId,
            user.id,
            completionDate,
            isCompleted ? timerDuration : 0,
            isCompleted,
          );
          break;

        case 'timerTracker':
          completion = await taskCompletionsService.upsertTimerCompletion(
            originalId,
            user.id,
            completionDate,
            isCompleted ? 1 : 0,
            isCompleted,
          );
          break;

        case 'checklist':
          const checklistItems = plan.checklistItems || [];
          const completedItems = isCompleted
            ? checklistItems.map(item => ({...item, completed: true}))
            : checklistItems.map(item => ({...item, completed: false}));

          completion = await taskCompletionsService.upsertChecklistCompletion(
            originalId,
            user.id,
            completionDate,
            completedItems,
            isCompleted ? completedItems.length : 0,
            isCompleted,
          );
          break;

        case 'numeric':
          const numericValue = isCompleted
            ? plan.targetHours || plan.targetTasks || 1
            : 0;
          completion = await taskCompletionsService.upsertNumericCompletion(
            originalId,
            user.id,
            completionDate,
            numericValue,
            plan.planType === 'hours' ? 'hours' : 'tasks',
            isCompleted,
          );
          break;

        default:
          completion = await taskCompletionsService.upsertYesNoCompletion(
            originalId,
            user.id,
            completionDate,
            isCompleted,
          );
          break;
      }

      setTaskCompletions(prev => ({
        ...prev,
        [planId]: completion,
      }));

      if (isCompleted) {
        setCheckboxStates(prev => ({
          ...prev,
          [planId]: 4,
        }));

        setTimeout(() => navigateToAchievementScreen(plan), 300);
      } else {
        setCheckboxStates(prev => ({
          ...prev,
          [planId]: 1,
        }));
      }

      console.log(
        `Plan ${planId} (originalId: ${originalId}) marked as ${
          isCompleted ? 'completed' : 'not completed'
        }`,
      );
    } catch (error) {
      console.error('Error updating Plan Your Day completion:', error);
      Alert.alert('Error', 'Failed to update plan. Please try again.');

      const currentCompletion = taskCompletions[planId];
      const revertState = currentCompletion?.is_completed === true ? 4 : 1;
      setCheckboxStates(prev => ({
        ...prev,
        [planId]: revertState,
      }));
    }
  };

  const toggleCheckbox = async id => {
    console.log(
      'toggleCheckbox called with id:',
      id,
      'selectedDate:',
      selectedDate,
      'type:',
      typeof selectedDate,
    );

    if (id.startsWith('plan_')) {
      const plan = allPlanYourDay.find(p => p.id === id);
      if (!plan) return;

      console.log(
        'Toggling Plan Your Day item:',
        plan.title,
        'Current completion:',
        taskCompletions[id]?.is_completed || false,
      );

      switch (plan.evaluationType) {
        case 'yesNo':
          const currentCompletion = taskCompletions[id];
          const isCurrentlyCompleted = currentCompletion?.is_completed === true;
          await handlePlanYourDayCompletion(id, !isCurrentlyCompleted);
          break;

        case 'timer':
          console.log(
            'Navigating to timer for Plan Your Day with selectedDate:',
            selectedDate,
          );
          navigation.navigate('PomoScreen', {
            task: plan,
            taskId: plan.originalId,
            selectedDate: selectedDate,
            isPlan: true,
          });
          break;

        case 'timerTracker':
          console.log(
            'Navigating to timer tracker for Plan Your Day with selectedDate:',
            selectedDate,
          );
          navigation.navigate('PomoTrackerScreen', {
            task: plan,
            taskId: plan.originalId,
            selectedDate: selectedDate,
            isPlan: true,
            isTimerTracker: true,
          });
          break;

        case 'checklist':
          console.log(
            'Navigating to checklist evaluation for Plan Your Day with selectedDate:',
            selectedDate,
          );
          navigation.navigate('TaskEvaluation', {
            taskData: plan,
            taskId: plan.originalId,
            selectedDate: selectedDate,
            isPlan: true,
          });
          break;

        case 'numeric':
          console.log(
            'Opening numeric modal for Plan Your Day with selectedDate:',
            selectedDate,
          );
          setSelectedTask(plan);
          setNumericModalVisible(true);
          break;

        default:
          const defaultCurrentCompletion = taskCompletions[id];
          const defaultIsCompleted =
            defaultCurrentCompletion?.is_completed === true;
          await handlePlanYourDayCompletion(id, !defaultIsCompleted);
          break;
      }
      return;
    }

    const task = tasks.find(task => task.id === id);

    if (task && task.type === 'numeric') {
      console.log('Opening numeric modal with selectedDate:', selectedDate);
      setSelectedTask(task);
      setNumericModalVisible(true);
      return;
    }

    if (task && task.type === 'timer') {
      console.log('Navigating to timer with selectedDate:', selectedDate);
      navigation.navigate('PomodoroTimerScreen', {
        task: task,
        selectedDate: selectedDate,
      });
      return;
    }

    if (task && task.type === 'checklist') {
      console.log('Navigating to TaskEvaluation:');
      console.log('  - selectedDate:', selectedDate);
      console.log('  - selectedDate type:', typeof selectedDate);
      console.log('  - Task:', task.title);
      console.log('  - Task ID:', task.id);

      navigation.navigate('TaskEvaluation', {
        taskData: task,
        taskId: task.id,
        selectedDate: selectedDate,
      });
      return;
    }

    if (task && task.type === 'yesNo') {
      try {
        const currentCompletion = taskCompletions[id];
        const isCurrentlyCompleted = currentCompletion?.is_completed === true;
        const newIsCompleted = !isCurrentlyCompleted;

        if (newIsCompleted) {
          setCheckboxStates(prev => ({
            ...prev,
            [id]: 2,
          }));

          setTimeout(() => {
            setCheckboxStates(prev => ({
              ...prev,
              [id]: 4,
            }));
          }, 200);
        } else {
          setCheckboxStates(prev => ({
            ...prev,
            [id]: 1,
          }));
        }

        const completionDate = getCompletionDateString(selectedDate);
        console.log('Saving Yes/No completion for date:', completionDate);

        const completion = await taskCompletionsService.upsertYesNoCompletion(
          task.id,
          user.id,
          completionDate,
          newIsCompleted,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));

        if (newIsCompleted) {
          setTimeout(() => navigateToAchievementScreen(task), 300);
        }

        console.log(
          `Task ${task.title} marked as ${
            newIsCompleted ? 'completed' : 'not completed'
          } for ${completionDate}`,
        );
      } catch (error) {
        console.error('Error updating Yes/No task completion:', error);
        Alert.alert('Error', 'Failed to update task. Please try again.');

        const currentCompletion = taskCompletions[id];
        const revertState = currentCompletion?.is_completed === true ? 4 : 1;
        setCheckboxStates(prev => ({
          ...prev,
          [id]: revertState,
        }));
        return;
      }
    }
  };

  const markTaskCompleted = async (taskId, specificCompletionDate = null) => {
    let item = null;
    let isPlan = false;

    if (taskId.startsWith('plan_')) {
      item = allPlanYourDay.find(p => p.id === taskId);
      isPlan = true;
    } else {
      item =
        allTasks.find(t => t.id === taskId) || tasks.find(t => t.id === taskId);
    }

    if (!item) {
      console.log('Item not found for completion:', taskId);
      await loadTasks();
      await loadTaskCompletions(selectedDate);
      return;
    }

    try {
      if (isPlan) {
        await handlePlanYourDayCompletion(taskId, true);
        setTimeout(async () => {
          await loadTaskCompletions(selectedDate);
        }, 500);
        return;
      }

      setCheckboxStates(prev => ({
        ...prev,
        [taskId]: 2,
      }));

      const completionDate =
        specificCompletionDate || getCompletionDateString(selectedDate);
      console.log('Marking task completed for date:', completionDate);

      if (item.type === 'yesNo') {
        const completion = await taskCompletionsService.upsertYesNoCompletion(
          item.id,
          user.id,
          completionDate,
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [item.id]: completion,
        }));
      } else if (item.type === 'numeric') {
        const value = item.numericGoal || item.numericValue || 1;
        const completion = await taskCompletionsService.upsertNumericCompletion(
          item.id,
          user.id,
          completionDate,
          value,
          item.numericUnit || '',
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [item.id]: completion,
        }));
      } else if (item.type === 'checklist') {
        const checklistItems = item.checklistItems || [];
        const completedItems = checklistItems.map(item => ({
          ...item,
          completed: true,
        }));

        const completion =
          await taskCompletionsService.upsertChecklistCompletion(
            item.id,
            user.id,
            completionDate,
            completedItems,
            completedItems.length,
            true,
          );

        setTaskCompletions(prev => ({
          ...prev,
          [item.id]: completion,
        }));
      } else if (item.type === 'timer') {
        const duration = item.timerDuration || 1;
        const completion = await taskCompletionsService.upsertTimerCompletion(
          item.id,
          user.id,
          completionDate,
          duration,
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [item.id]: completion,
        }));
      }

      setTimeout(() => {
        setCheckboxStates(prev => ({
          ...prev,
          [taskId]: 4,
        }));
      }, 200);

      if (item.type !== 'timer') {
        setTimeout(() => {
          navigateToAchievementScreen(item);
        }, 300);
      }

      setTimeout(async () => {
        await loadTaskCompletions(selectedDate);
      }, 500);
    } catch (error) {
      console.error('Error marking item as completed:', error);
      setCheckboxStates(prev => ({
        ...prev,
        [taskId]: 1,
      }));
      Alert.alert(
        'Error',
        'Failed to mark item as completed. Please try again.',
      );
    }
  };

  const handleNumericSave = async (value, isCompleted) => {
    if (selectedTask) {
      try {
        console.log(
          `${selectedTask.isPlan ? 'Plan' : 'Task'} ${
            selectedTask.id
          } updated with value: ${value}, completed: ${isCompleted}`,
        );

        const completionDate = getCompletionDateString(selectedDate);
        console.log('Saving numeric completion for date:', completionDate);

        let completion;
        const taskId = selectedTask.isPlan
          ? selectedTask.originalId
          : selectedTask.id;
        const unit = selectedTask.isPlan
          ? selectedTask.planType === 'hours'
            ? 'hours'
            : 'tasks'
          : selectedTask.numericUnit || '';

        completion = await taskCompletionsService.upsertNumericCompletion(
          taskId,
          user.id,
          completionDate,
          value,
          unit,
          isCompleted,
        );

        const stateId = selectedTask.isPlan ? selectedTask.id : selectedTask.id;

        setTaskCompletions(prev => ({
          ...prev,
          [stateId]: completion,
        }));

        if (isCompleted) {
          setCheckboxStates(prev => ({
            ...prev,
            [stateId]: 4,
          }));

          setTimeout(() => navigateToAchievementScreen(selectedTask), 300);
        } else {
          setCheckboxStates(prev => ({
            ...prev,
            [stateId]: 1,
          }));
        }

        console.log(
          `${selectedTask.isPlan ? 'Plan' : 'Numeric task'} ${
            selectedTask.title
          } saved with value: ${value}, completed: ${isCompleted} for ${completionDate}`,
        );

        setTimeout(async () => {
          await loadTaskCompletions(selectedDate);
        }, 500);
      } catch (error) {
        console.error('Error updating numeric completion:', error);
        Alert.alert('Error', 'Failed to update item. Please try again.');
      }
    }
    setSelectedTask(null);
  };

  const renderTask = ({item, index}) => {
    const isPlan = item.isPlan || false;

    let displayCheckboxState = 1;
    const completion = taskCompletions[item.id];

    if (completion?.is_completed === true) {
      displayCheckboxState = 4;
    } else if (checkboxStates[item.id]) {
      displayCheckboxState = checkboxStates[item.id];
    }

    const totalItems = filteredTasks.length;

    return (
      <View style={index === totalItems - 1 ? styles.lastTaskCard : null}>
        <TaskCard
          item={item}
          checkboxState={displayCheckboxState}
          onToggle={() => toggleCheckbox(item.id)}
          onTaskCompleted={markTaskCompleted}
          onTaskDelete={deleteTask}
          selectedDate={selectedDate}
          taskCompletions={taskCompletions}
          isPlan={isPlan}
        />
      </View>
    );
  };

  const renderNewTask = ({item, index}) => (
    <ModalTaskCard
      item={item}
      checked={!!checkboxStates[item.id]}
      onToggle={() => toggleCheckbox(item.id)}
      isFirstItem={index === 0}
      isGoalOfDay={index === modaltasks.length - 1}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Logo width={WP(7.8)} height={WP(7.8)} />
          <Text style={styles.brandText}>WingsFly</Text>
        </View>
        <View style={styles.iconRow}>
          <Icon name="search" size={WP(5.3)} color="#4F4F4F" />
          <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
            <Image source={Icons.Calendar} style={styles.iconImage} />
          </TouchableOpacity>
          <Icon name="help-outline" size={WP(5.3)} color="#4F4F4F" />
        </View>
      </View>

      <Calender onDateSelect={handleDateSelect} selectedDate={selectedDate} />

      <View style={styles.dateHeader}>
        <Text style={styles.dateHeaderText}>
          Tasks for{' '}
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteTitle}>Today's Quote</Text>
        <Text style={styles.quoteText}>
          "You must do the things, you think you cannot do."
        </Text>
        <Text style={styles.progressText}>Progress {progress}%</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, {width: `${progress}%`}]} />
          <View style={[styles.progressThumb, {left: `${progress}%`}]} />
        </View>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item, index) => `skeleton-${index}`}
          renderItem={() => <TaskSkeleton />}
          contentContainerStyle={{marginTop: HP(0.7)}}
          showsVerticalScrollIndicator={false}
        />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tasks or plans for {new Date(selectedDate).toLocaleDateString()}
          </Text>
          <Text style={styles.emptySubText}>
            Select a different date or create a new task or plan!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={{marginTop: HP(0.7)}}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={refreshTasks}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <PlusIcon name="plus" size={WP(6.4)} color={colors.White} />
      </Pressable>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onBackButtonPress={() => setModalVisible(false)}
        style={styles.bottomModal}
        swipeDirection="down"
        onSwipeComplete={() => setModalVisible(false)}
        useNativeDriver>
        <View style={styles.modalContent}>
          <StatusBar
            backgroundColor={colors.ModelBackground}
            barStyle="dark-content"
          />
          <FlatList
            data={modaltasks}
            keyExtractor={item => item.id}
            renderItem={renderNewTask}
            contentContainerStyle={{marginTop: HP(2.5)}}
          />
        </View>
      </Modal>

      <NumericInputModal
        isVisible={isNumericModalVisible}
        onClose={() => {
          setNumericModalVisible(false);
          setSelectedTask(null);
        }}
        onSave={handleNumericSave}
        taskTitle={selectedTask?.title}
        taskData={selectedTask}
        selectedDate={selectedDate}
      />

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onDateSelect={handleDatePickerSelect}
        initialDate={new Date(selectedDate)}
        title="Select Date"
      />

      <WelcomePopup
        visible={isWelcomePopupVisible}
        onClose={handleWelcomeClose}
        userName={user?.name || user?.email || user?.display_name}
      />

      {/* NEW: Month Reminder Modal */}
      <MonthReminderModal
        visible={isMonthReminderVisible}
        onClose={handleMonthReminderClose}
        userName={user?.name || user?.email || user?.display_name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.White},
  header: {
    width: '90%',
    alignSelf: 'center',
    marginTop: HP(2.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: HP(0.75),
  },
  logoRow: {flexDirection: 'row', width: '73%'},
  brandText: {
    fontSize: FS(2.6),
    fontFamily: 'Anton-Regular',
    color: '#363636',
    marginLeft: WP(1.9),
    marginTop: HP(-0.7),
  },
  iconRow: {
    flexDirection: 'row',
    width: '30%',
    gap: WP(3.2),
    marginTop: HP(0.6),
  },
  iconImage: {
    width: WP(5.5),
    height: WP(5.5),
    tintColor: '#4F4F4F',
    resizeMode: 'contain',
  },
  quoteCard: {
    width: '92%',
    alignSelf: 'center',
    backgroundColor: colors.White,
    elevation: 7,
    marginTop: HP(1.9),
    borderRadius: WP(2.1),
    paddingBottom: HP(1.9),
    marginBottom: HP(1),
    paddingTop: HP(1.0),
    height: HP(13.5),
    shadowColor: colors.Shadow,
    shadowOffset: {width: 0, height: HP(0.5)},
    shadowOpacity: 0.3,
    shadowRadius: WP(1.6),
  },
  quoteTitle: {
    fontSize: FS(1.8),
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
    marginBottom: HP(1.35),
    color: '#3B3B3B',
    marginTop: HP(0.3),
  },
  quoteText: {
    fontSize: FS(1.65),
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    color: '#5B5B5B',
    marginBottom: HP(1.0),
  },
  progressText: {
    position: 'absolute',
    left: WP(2.9),
    bottom: HP(1.6),
    fontSize: FS(1.4),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: HP(0.6),
    width: '100%',
    backgroundColor: '#DBDBDB',
    borderBottomLeftRadius: WP(2.1),
    borderBottomRightRadius: WP(2.1),
    paddingHorizontal: WP(2),
    overflow: 'visible',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.Primary,
    marginLeft: WP(-1.9),
    borderBottomLeftRadius: WP(2.1),
    borderBottomRightRadius: WP(2.1),
  },
  progressThumb: {
    position: 'absolute',
    top: HP(-0.75),
    width: WP(4.8),
    height: WP(4.8),
    marginLeft: WP(-0.5),
    backgroundColor: colors.Primary,
    borderRadius: WP(2.4),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.25),
    },
    shadowOpacity: 0.2,
    shadowRadius: WP(1.1),
    elevation: 3,
  },
  lastTaskCard: {
    marginBottom: HP(7.5),
  },
  fab: {
    position: 'absolute',
    right: WP(4.0),
    bottom: HP(0.8),
    height: WP(12.5),
    width: WP(12.5),
    backgroundColor: colors.Primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: WP(2.7),
    elevation: 5,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    backgroundColor: colors.ModelBackground,
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.White,
    borderTopLeftRadius: WP(10.7),
    borderTopRightRadius: WP(10.7),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HP(20),
    paddingHorizontal: WP(5),
  },
  emptyText: {
    fontSize: FS(2.2),
    fontFamily: 'Roboto-Bold',
    color: '#3B3B3B',
    marginBottom: HP(1),
  },
  emptySubText: {
    fontSize: FS(1.6),
    fontFamily: 'OpenSans-Regular',
    color: '#5B5B5B',
    textAlign: 'center',
  },
  dateHeader: {
    width: '92%',
    alignSelf: 'center',
    marginTop: HP(1),
    marginBottom: HP(0.5),
  },
  dateHeaderText: {
    fontSize: FS(1.8),
    fontFamily: 'Roboto-Bold',
    color: '#3B3B3B',
    textAlign: 'center',
  },
});

export default Home;
