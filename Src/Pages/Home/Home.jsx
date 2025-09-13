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
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {HP, WP, FS} from '../../utils/dimentions';
import {taskService} from '../../services/api/taskService';
import {taskCompletionsService} from '../../services/api/taskCompletionsService';
import {useAuth} from '../../contexts/AuthContext';
import {shouldTaskAppearOnDate} from '../../utils/taskDateHelper';
import {getCompletionDateString} from '../../utils/dateUtils';

const Home = () => {
  const [checkboxStates, setCheckboxStates] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [isNumericModalVisible, setNumericModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toDateString());
  const [taskCompletions, setTaskCompletions] = useState({});

  const navigation = useNavigation();
  const {user} = useAuth();

  // Debug selectedDate initialization
  console.log('Home component initialized with selectedDate:', selectedDate);

  // FIXED: Convert selectedDate to consistent format for database operations
  const completionDateString = useMemo(() => {
    return getCompletionDateString(selectedDate);
  }, [selectedDate]);

  // Calculate progress based on completed tasks for the selected date
  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;

    // Count tasks completed on the selected date
    const completedTasks = tasks.filter(task => {
      const taskId = task.id;
      const completion = taskCompletions[taskId];
      return completion?.is_completed === true;
    });

    const progressPercentage = Math.round(
      (completedTasks.length / tasks.length) * 100,
    );
    return Math.min(progressPercentage, 100);
  }, [tasks, taskCompletions]);

  // FIXED: Load task completions for the selected date with proper date handling
  const loadTaskCompletions = async dateInput => {
    if (!user) return;

    try {
      // Use consistent date formatting
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

      // Convert array to object with task_id as key
      const completionsMap = {};
      completions.forEach(completion => {
        completionsMap[completion.task_id] = completion;
        console.log(
          `Completion loaded for task ${completion.task_id}: completed=${completion.is_completed}`,
        );
      });

      setTaskCompletions(completionsMap);

      // FIXED: Update checkbox states based on completions for current date only
      const newCheckboxStates = {};
      tasks.forEach(task => {
        const completion = completionsMap[task.id];
        if (completion?.is_completed === true) {
          newCheckboxStates[task.id] = 4; // Completed state
        } else {
          newCheckboxStates[task.id] = 1; // Initial state
        }
      });

      setCheckboxStates(newCheckboxStates);
    } catch (error) {
      console.error('Error loading task completions:', error);
    }
  };

  // Load tasks from Supabase
  const loadTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const tasksData = await taskService.getTasks(user.id);

      // Transform Supabase data to match the expected format
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
      }));

      setAllTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete task function
  const deleteTask = async taskId => {
    try {
      setLoading(true);

      // Delete from Supabase
      await taskService.deleteTask(taskId);

      // Remove from local state
      setAllTasks(prev => prev.filter(task => task.id !== taskId));
      setTasks(prev => prev.filter(task => task.id !== taskId));

      // Remove from checkbox states and completions
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

      Alert.alert('Success', 'Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
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
        // FIXED: Use the specific completion date if provided
        const completionDate =
          route.params?.completedDate || completionDateString;
        markTaskCompleted(route.params.completedTaskId, completionDate);

        // REMOVED: AppreciationModal logic - now handled by AchievementScreen navigation

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
    });

    return unsubscribe;
  }, [navigation, completionDateString]);

  // Filter tasks based on selected date using useMemo for performance
  const filteredTasks = useMemo(() => {
    if (!allTasks.length) return [];

    console.log('Filtering tasks for date:', selectedDate);
    console.log('Total tasks to filter:', allTasks.length);

    const filtered = allTasks.filter(task => {
      const shouldShow = shouldTaskAppearOnDate(task, selectedDate);

      if (task.title) {
        console.log(
          `Task "${task.title}" (${task.taskType}) - Should show: ${shouldShow}`,
        );
        if (task.frequencyType) {
          console.log(`  Frequency: ${task.frequencyType}`);
        }
        if (task.selectedWeekdays?.length > 0) {
          console.log(`  Weekdays: [${task.selectedWeekdays.join(', ')}]`);
        }
        if (task.startDate) {
          console.log(`  Start Date: ${task.startDate}`);
        }
      }

      return shouldShow;
    });

    console.log('Filtered tasks count:', filtered.length);
    return filtered;
  }, [allTasks, selectedDate]);

  useEffect(() => {
    setTasks(filteredTasks);
    // FIXED: Load completions when tasks or date changes, pass selectedDate directly
    if (filteredTasks.length >= 0) {
      // Changed to >= 0 to handle empty task lists
      loadTaskCompletions(selectedDate);
    }
  }, [filteredTasks, selectedDate]);

  useEffect(() => {
    loadTasks();
  }, [user]);

  // FIXED: Improved date selection handling with comprehensive debugging
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

    // Clear previous completions to avoid showing old data
    setTaskCompletions({});
    setCheckboxStates({});

    // Add a small delay to show loading state
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
      title:
        'Set up a multi-day challenge with specific goals and duration.',
      image: Icons.Goal,
      navigation: () => {
        setModalVisible(false);
        navigation.navigate('ChallengeScreen', {type: 'Goal'});
      },
    },
  ];

  const createNewTask = async taskData => {
    if (!user) {
      Alert.alert('Error', 'Please log in to create tasks.');
      return;
    }

    try {
      const newTask = await taskService.createTask({
        ...taskData,
        userId: user.id,
      });

      const transformedTask = {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        taskType: newTask.task_type,
        evaluationType: newTask.evaluation_type,
        time: newTask.time,
        timeColor: newTask.time_color,
        tags: newTask.tags || [],
        image: newTask.image,
        hasFlag: newTask.has_flag,
        priority: newTask.priority,
        type: newTask.evaluation_type,
        progress: newTask.progress,
        numericValue: newTask.numeric_value,
        numericGoal: newTask.numeric_goal,
        numericUnit: newTask.numeric_unit,
        numericCondition: newTask.numeric_condition,
        timerDuration: newTask.timer_duration,
        timerCondition: newTask.timer_condition,
        checklistItems: newTask.checklist_items,
        successCondition: newTask.success_condition,
        customItemsCount: newTask.custom_items_count,
        frequencyType: newTask.frequency_type,
        selectedWeekdays: newTask.selected_weekdays,
        selectedMonthDates: newTask.selected_month_dates,
        selectedYearDates: newTask.selected_year_dates,
        periodDays: newTask.period_days,
        periodType: newTask.period_type,
        isFlexible: newTask.is_flexible,
        isMonthFlexible: newTask.is_month_flexible,
        isYearFlexible: newTask.is_year_flexible,
        useDayOfWeek: newTask.use_day_of_week,
        isRepeatFlexible: newTask.is_repeat_flexible,
        isRepeatAlternateDays: newTask.is_repeat_alternate_days,
        startDate: newTask.start_date,
        endDate: newTask.end_date,
        isEndDateEnabled: newTask.is_end_date_enabled,
        blockTimeEnabled: newTask.block_time_enabled,
        blockTimeData: newTask.block_time_data,
        durationEnabled: newTask.duration_enabled,
        durationData: newTask.duration_data,
        reminderEnabled: newTask.reminder_enabled,
        reminderData: newTask.reminder_data,
        addPomodoro: newTask.add_pomodoro,
        addToGoogleCalendar: newTask.add_to_google_calendar,
        isPendingTask: newTask.is_pending_task,
        linkedGoalId: newTask.linked_goal_id,
        linkedGoalTitle: newTask.linked_goal_title,
        linkedGoalType: newTask.linked_goal_type,
        note: newTask.note,
        created_at: newTask.created_at,
      };

      setAllTasks(prev => [transformedTask, ...prev]);

      if (shouldTaskAppearOnDate(transformedTask, selectedDate)) {
        setTasks(prev => [transformedTask, ...prev]);
      }

      setCheckboxStates(prev => ({
        ...prev,
        [newTask.id]: 1,
      }));

      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  // NEW: Navigate to AchievementScreen with task completion data
  const navigateToAchievementScreen = task => {
    // Calculate duration from block time if available
    let startTime = null;
    let endTime = null;
    let totalCompletedTime = 0;

    console.log('Processing task for achievement screen:', {
      title: task.title,
      blockTimeEnabled: task.blockTimeEnabled,
      blockTimeData: task.blockTimeData,
      type: typeof task.blockTimeData
    });

    if (task.blockTimeEnabled && task.blockTimeData) {
      try {
        const blockTimeData = typeof task.blockTimeData === 'string' 
          ? JSON.parse(task.blockTimeData) 
          : task.blockTimeData;
        
        console.log('Parsed block time data:', blockTimeData);
        
        if (blockTimeData.startTime && blockTimeData.endTime) {
          startTime = blockTimeData.startTime;
          endTime = blockTimeData.endTime;
          
          console.log('Start time:', startTime, 'End time:', endTime);
          
          // FIXED: Better time parsing logic that handles 12-hour format with AM/PM
          const parseTimeString = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') {
              console.warn('Invalid time string:', timeStr);
              return 0;
            }
            
            // Handle 12-hour format with AM/PM
            const timeStr12Hour = timeStr.trim().toUpperCase();
            const isAM = timeStr12Hour.includes('AM');
            const isPM = timeStr12Hour.includes('PM');
            
            if (!isAM && !isPM) {
              // 24-hour format - existing logic
              const timeParts = timeStr.split(':');
              if (timeParts.length === 2) {
                timeStr = `${timeStr}:00`; // Add seconds if missing
              }
              
              const [hours, minutes, seconds] = timeStr.split(':').map(Number);
              
              if (isNaN(hours) || isNaN(minutes) || isNaN(seconds || 0)) {
                console.warn('Invalid time components:', { hours, minutes, seconds });
                return 0;
              }
              
              return hours * 3600 + minutes * 60 + (seconds || 0);
            } else {
              // 12-hour format with AM/PM
              const timeWithoutAMPM = timeStr12Hour.replace(/AM|PM/g, '').trim();
              const timeParts = timeWithoutAMPM.split(':');
              
              if (timeParts.length < 2) {
                console.warn('Invalid 12-hour time format:', timeStr);
                return 0;
              }
              
              let [hours, minutes, seconds] = timeParts.map(Number);
              seconds = seconds || 0;
              
              if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
                console.warn('Invalid 12-hour time components:', { hours, minutes, seconds });
                return 0;
              }
              
              // Convert to 24-hour format
              if (isPM && hours !== 12) {
                hours += 12;
              } else if (isAM && hours === 12) {
                hours = 0;
              }
              
              console.log(`Converted "${timeStr}" to 24-hour: ${hours}:${minutes}:${seconds}`);
              
              return hours * 3600 + minutes * 60 + seconds;
            }
          };
          
          try {
            const startSeconds = parseTimeString(startTime);
            const endSeconds = parseTimeString(endTime);
            
            console.log('Start seconds:', startSeconds, 'End seconds:', endSeconds);
            
            // Validate calculated seconds
            if (startSeconds === 0 && endSeconds === 0) {
              console.warn('Both start and end seconds are 0, invalid time data');
              totalCompletedTime = 0;
            } else {
              // Handle case where end time is next day (crosses midnight)
              if (endSeconds < startSeconds) {
                // Add 24 hours to end time (next day)
                totalCompletedTime = (endSeconds + 24 * 3600) - startSeconds;
              } else {
                totalCompletedTime = endSeconds - startSeconds;
              }
              
              console.log('Calculated duration in seconds:', totalCompletedTime);
              
              // Ensure we have a positive duration
              if (totalCompletedTime < 0 || isNaN(totalCompletedTime)) {
                console.warn('Invalid duration calculated, setting to 0');
                totalCompletedTime = 0;
              }
            }
            
          } catch (timeParseError) {
            console.error('Error parsing time strings:', timeParseError);
            totalCompletedTime = 0;
          }
        } else {
          console.warn('Missing startTime or endTime in block time data');
          totalCompletedTime = 0;
        }
      } catch (error) {
        console.error('Error parsing block time data:', error);
        totalCompletedTime = 0;
      }
    } else {
      console.log('No block time data available for this task');
      // For tasks without block time, we can set a default duration or leave as 0
      totalCompletedTime = 0;
    }

    // Final validation to ensure totalCompletedTime is a valid number
    if (isNaN(totalCompletedTime) || totalCompletedTime < 0) {
      console.warn('Final validation failed, setting totalCompletedTime to 0');
      totalCompletedTime = 0;
    }

    // For non-timer tasks, create achievement data
    const achievementData = {
      taskData: task,
      totalPomodoros: 1, // Single task completion
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
      totalCompletedTimeFormatted: `${Math.floor(totalCompletedTime / 60)}m ${totalCompletedTime % 60}s`
    });
    
    navigation.navigate('AchievementScreen', achievementData);
  };

  // FIXED: Toggle function with proper date handling and comprehensive debugging
  const toggleCheckbox = async id => {
    console.log(
      'toggleCheckbox called with id:',
      id,
      'selectedDate:',
      selectedDate,
      'type:',
      typeof selectedDate,
    );

    const task = tasks.find(task => task.id === id);

    if (task && task.type === 'numeric') {
      console.log('Opening numeric modal with selectedDate:', selectedDate);
      setSelectedTask(task);
      setNumericModalVisible(true);
      return;
    }

    // UPDATED: Timer tasks handle their own completion screen - no achievement screen here
    if (task && task.type === 'timer') {
      console.log('Navigating to timer with selectedDate:', selectedDate);
      navigation.navigate('PomodoroTimerScreen', {
        task: task,
        selectedDate: selectedDate,
      });
      return;
    }

    if (task && task.type === 'checklist') {
      // FIXED: Always pass selectedDate, with proper logging
      console.log('Navigating to TaskEvaluation:');
      console.log('  - selectedDate:', selectedDate);
      console.log('  - selectedDate type:', typeof selectedDate);
      console.log('  - Task:', task.title);
      console.log('  - Task ID:', task.id);

      navigation.navigate('TaskEvaluation', {
        taskData: task,
        taskId: task.id,
        selectedDate: selectedDate, // This is the key fix - always pass selectedDate
      });
      return;
    }

    if (task && task.type === 'yesNo') {
      try {
        const currentCompletion = taskCompletions[id];
        const isCurrentlyCompleted = currentCompletion?.is_completed === true;
        const newIsCompleted = !isCurrentlyCompleted;

        // Update UI immediately
        if (newIsCompleted) {
          setCheckboxStates(prev => ({
            ...prev,
            [id]: 2, // Loading state
          }));

          setTimeout(() => {
            setCheckboxStates(prev => ({
              ...prev,
              [id]: 4, // Completed state
            }));
          }, 200);
        } else {
          setCheckboxStates(prev => ({
            ...prev,
            [id]: 1, // Initial state
          }));
        }

        // FIXED: Use consistent date conversion
        const completionDate = getCompletionDateString(selectedDate);
        console.log('Saving Yes/No completion for date:', completionDate);

        // Save to task_completions table
        const completion = await taskCompletionsService.upsertYesNoCompletion(
          task.id,
          user.id,
          completionDate,
          newIsCompleted,
        );

        // Update local completions state
        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));

        // UPDATED: Navigate to AchievementScreen instead of AppreciationModal
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

        // Revert UI state on error
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

  // FIXED: markTaskCompleted function with proper date handling
  const markTaskCompleted = async (taskId, specificCompletionDate = null) => {
    const task =
      allTasks.find(t => t.id === taskId) || tasks.find(t => t.id === taskId);

    if (!task) {
      console.log('Task not found for completion:', taskId);
      await loadTasks();
      return;
    }

    try {
      setCheckboxStates(prev => ({
        ...prev,
        [taskId]: 2, // Loading state
      }));

      // FIXED: Use the specific completion date or fall back to current selected date
      const completionDate =
        specificCompletionDate || getCompletionDateString(selectedDate);
      console.log('Marking task completed for date:', completionDate);

      // Handle different task types
      if (task.type === 'yesNo') {
        const completion = await taskCompletionsService.upsertYesNoCompletion(
          task.id,
          user.id,
          completionDate,
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));
      } else if (task.type === 'numeric') {
        // For numeric tasks marked as completed externally, use the goal value
        const value = task.numericGoal || task.numericValue || 1;
        const completion = await taskCompletionsService.upsertNumericCompletion(
          task.id,
          user.id,
          completionDate,
          value,
          task.numericUnit || '',
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));
      } else if (task.type === 'checklist') {
        // For checklist tasks, get the current checklist items and mark all as completed
        const checklistItems = task.checklistItems || [];
        const completedItems = checklistItems.map(item => ({
          ...item,
          completed: true,
        }));

        const completion =
          await taskCompletionsService.upsertChecklistCompletion(
            task.id,
            user.id,
            completionDate,
            completedItems,
            completedItems.length,
            true,
          );

        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));
      } else if (task.type === 'timer') {
        // For timer tasks, mark as completed with the timer duration
        const duration = task.timerDuration || 1;
        const completion = await taskCompletionsService.upsertTimerCompletion(
          task.id,
          user.id,
          completionDate,
          duration,
          true,
        );

        setTaskCompletions(prev => ({
          ...prev,
          [task.id]: completion,
        }));
      }

      setTimeout(() => {
        setCheckboxStates(prev => ({
          ...prev,
          [taskId]: 4, // Completed state
        }));
      }, 200);

      // UPDATED: Navigate to AchievementScreen for non-timer tasks only
      if (task.type !== 'timer') {
        setTimeout(() => {
          navigateToAchievementScreen(task);
        }, 300);
      }
    } catch (error) {
      console.error('Error marking task as completed:', error);
      setCheckboxStates(prev => ({
        ...prev,
        [taskId]: 1, // Revert to uncompleted state
      }));
      Alert.alert(
        'Error',
        'Failed to mark task as completed. Please try again.',
      );
    }
  };

  // FIXED: handleNumericSave function with proper date handling
  const handleNumericSave = async (value, isCompleted) => {
    if (selectedTask) {
      try {
        console.log(
          `Task ${selectedTask.id} updated with value: ${value}, completed: ${isCompleted}`,
        );

        // FIXED: Use consistent date conversion
        const completionDate = getCompletionDateString(selectedDate);
        console.log('Saving numeric completion for date:', completionDate);

        // Save to task_completions table using the new service
        const completion = await taskCompletionsService.upsertNumericCompletion(
          selectedTask.id,
          user.id,
          completionDate,
          value,
          selectedTask.numericUnit || '',
          isCompleted,
        );

        // Update local completions state
        setTaskCompletions(prev => ({
          ...prev,
          [selectedTask.id]: completion,
        }));

        // Update UI state
        if (isCompleted) {
          setCheckboxStates(prev => ({
            ...prev,
            [selectedTask.id]: 4, // Completed state
          }));

          // UPDATED: Navigate to AchievementScreen instead of AppreciationModal
          setTimeout(() => navigateToAchievementScreen(selectedTask), 300);
        } else {
          setCheckboxStates(prev => ({
            ...prev,
            [selectedTask.id]: 1, // Uncompleted state
          }));
        }

        console.log(
          `Numeric task ${selectedTask.title} saved with value: ${value}, completed: ${isCompleted} for ${completionDate}`,
        );
      } catch (error) {
        console.error('Error updating numeric task completion:', error);
        Alert.alert('Error', 'Failed to update task. Please try again.');
      }
    }
    setSelectedTask(null);
  };

  const renderTask = ({item, index}) => {
    // FIXED: Determine checkbox state based on completion data for the current date
    let displayCheckboxState = 1; // Default state

    const completion = taskCompletions[item.id];
    if (completion?.is_completed === true) {
      displayCheckboxState = 4; // Completed state
    } else if (checkboxStates[item.id]) {
      displayCheckboxState = checkboxStates[item.id];
    }

    return (
      <View style={index === tasks.length - 1 ? styles.lastTaskCard : null}>
        <TaskCard
          item={item}
          checkboxState={displayCheckboxState}
          onToggle={() => toggleCheckbox(item.id)}
          onTaskCompleted={markTaskCompleted}
          onTaskDelete={deleteTask}
          selectedDate={selectedDate} // FIXED: Pass selectedDate to TaskCard
          taskCompletions={taskCompletions}
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
      isGoalOfDay={item.Heading === 'Create Challenge'}
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
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tasks for {new Date(selectedDate).toLocaleDateString()}
          </Text>
          <Text style={styles.emptySubText}>
            Select a different date or create a new task!
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
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
          <StatusBar backgroundColor={colors.ModelBackground} barStyle="dark-content" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HP(20),
  },
  loadingText: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: colors.Primary,
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