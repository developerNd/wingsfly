// Helper function to convert weekday strings to numbers
const convertWeekdaysToNumbers = (weekdays) => {
  const weekdayMap = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 7
  };
  
  return weekdays.map(day => weekdayMap[day.toLowerCase()]).filter(day => day !== undefined);
};

// Helper function to calculate total pomodoro duration in minutes
const calculatePomodoroDuration = (pomodoroSettings) => {
  if (!pomodoroSettings) return null;

  const focusTime = pomodoroSettings.focusTime || 25;
  const shortBreak = pomodoroSettings.shortBreak || 5;
  const longBreak = pomodoroSettings.longBreak || 15;
  const focusSessionsPerRound = pomodoroSettings.focusSessionsPerRound || 4;

  // Calculate one complete round duration
  // Focus sessions + short breaks (n-1) + long break
  const focusTimeTotal = focusTime * focusSessionsPerRound;
  const shortBreakTotal = shortBreak * (focusSessionsPerRound - 1);
  const roundDuration = focusTimeTotal + shortBreakTotal + longBreak;

  return roundDuration; // Return total duration in minutes
};

// Helper function to prepare task data for database saving
export const prepareTaskData = (previousData, scheduleData, userId, selectedGoal = null) => {
  // Calculate pomodoro duration if pomodoro is enabled
  let calculatedPomodoroDuration = null;
  if (scheduleData?.addPomodoro && scheduleData?.pomodoroSettings) {
    calculatedPomodoroDuration = calculatePomodoroDuration(scheduleData.pomodoroSettings);
  }

  return {
    // Basic task information
    title: previousData.habit || previousData.taskTitle || 'Untitled Task',
    description: previousData.description || '',
    category: previousData.selectedCategory?.title || 'Other',
    taskType: previousData.type || 'Habit',
    evaluationType: previousData.evaluationType || 'timer',
    userId: userId,
    
    // Visual and display properties
    time: scheduleData?.blockTimeData?.startTime || null,
    timeColor: '#E4EBF3',
    tags: [previousData.type || 'Habit', 'Must'],
    image: null,
    hasFlag: true,
    priority: 'High',
    
    // Task-specific data
    numericValue: 0,
    numericGoal: previousData.goal ? parseInt(previousData.goal.toString()) : null,
    numericUnit: previousData.unit || null,
    numericCondition: previousData.selectedDropdownValue || 'At Least',
    
    // Timer-specific data
    timerDuration: previousData.selectedTime || { hours: 0, minutes: 0, seconds: 0 },
    timerCondition: previousData.selectedDropdownValue || 'At Least',
    
    // Checklist-specific data
    checklistItems: previousData.checklistItems || null,
    successCondition: previousData.selectedSuccessCondition || 'All Items',
    customItemsCount: previousData.customItems ? parseInt(previousData.customItems.toString()) : 1,
    
    // Repetition and frequency settings
    frequencyType: previousData.frequencyData?.selectedFrequency || 'Every Day',
    selectedWeekdays: convertWeekdaysToNumbers(previousData.frequencyData?.selectedWeekdays || []),
    selectedMonthDates: previousData.frequencyData?.selectedMonthDates || [],
    selectedYearDates: previousData.frequencyData?.selectedYearDates || [],
    periodDays: previousData.frequencyData?.periodDays ? parseInt(previousData.frequencyData.periodDays.toString()) : 1,
    periodType: previousData.frequencyData?.selectedPeriod || 'Week',
    isFlexible: previousData.frequencyData?.isFlexible || false,
    isMonthFlexible: previousData.frequencyData?.isMonthFlexible || false,
    isYearFlexible: previousData.frequencyData?.isYearFlexible || false,
    useDayOfWeek: previousData.frequencyData?.useDayOfWeek || false,
    isRepeatFlexible: previousData.frequencyData?.isRepeatFlexible || false,
    isRepeatAlternateDays: previousData.frequencyData?.isRepeatAlternateDays || false,
    
    // FIXED: Repeat-specific data fields - These were missing!
    everyDays: previousData.frequencyData?.everyDays || null,
    activityDays: previousData.frequencyData?.activityDays || null,
    restDays: previousData.frequencyData?.restDays || null,
    
    // Scheduling settings
    startDate: scheduleData?.startDate ? new Date(scheduleData.startDate).toISOString().split('T')[0] : null,
    endDate: scheduleData?.endDate && scheduleData?.endDateSelected ? new Date(scheduleData.endDate).toISOString().split('T')[0] : null,
    isEndDateEnabled: scheduleData?.endDateSelected || false,
    
    // Block time settings
    blockTimeEnabled: !!scheduleData?.blockTimeData,
    blockTimeData: scheduleData?.blockTimeData,
    
    // Duration settings
    durationEnabled: !!scheduleData?.durationData,
    durationData: scheduleData?.durationData,
    
    // Reminder settings
    reminderEnabled: scheduleData?.addReminder || false,
    reminderData: scheduleData?.reminderData,
    
    // Additional features
    addPomodoro: scheduleData?.addPomodoro || false,
    addToGoogleCalendar: scheduleData?.addToGoogleCalendar || false,
    isPendingTask: false,

    // Pomodoro settings with proper field mapping
    focusDuration: scheduleData?.pomodoroSettings?.focusTime || null,
    shortBreakDuration: scheduleData?.pomodoroSettings?.shortBreak || null,
    longBreakDuration: scheduleData?.pomodoroSettings?.longBreak || null,
    autoStartShortBreaks: scheduleData?.pomodoroSettings?.autoStartShortBreaks || false,
    autoStartFocusSessions: scheduleData?.pomodoroSettings?.autoStartFocusSessions || false,
    focusSessionsPerRound: scheduleData?.pomodoroSettings?.focusSessionsPerRound || null,
    
    // Additional pomodoro fields
    pomodoroDuration: calculatedPomodoroDuration, // Calculated total duration
    
    // Goal linking
    linkedGoalId: selectedGoal?.id || null,
    linkedGoalTitle: selectedGoal?.title || null,
    linkedGoalType: selectedGoal ? (selectedGoal.id <= 2 ? 'longTerm' : 'recurring') : null,
    
    // Notes
    note: '',
    
    // Progress tracking
    progress: null,
  };
};

// Helper function to format pomodoro duration for display
export const formatPomodoroDuration = (durationInMinutes) => {
  if (!durationInMinutes) return 'Not set';
  
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

// Helper function to get pomodoro session breakdown
export const getPomodoroPlan = (pomodoroSettings) => {
  if (!pomodoroSettings) return null;

  const focusTime = pomodoroSettings.focusTime || 25;
  const shortBreak = pomodoroSettings.shortBreak || 5;
  const longBreak = pomodoroSettings.longBreak || 15;
  const focusSessionsPerRound = pomodoroSettings.focusSessionsPerRound || 4;

  return {
    focusTime,
    shortBreak,
    longBreak,
    focusSessionsPerRound,
    totalDuration: calculatePomodoroDuration(pomodoroSettings),
    sessionBreakdown: {
      focus: `${focusTime} min`,
      shortBreak: `${shortBreak} min`,
      longBreak: `${longBreak} min`,
      sessions: `${focusSessionsPerRound} sessions per round`
    }
  };
};

// Helper function to validate pomodoro settings
export const validatePomodoroSettings = (pomodoroSettings) => {
  if (!pomodoroSettings) return { isValid: false, errors: ['Pomodoro settings are required'] };

  const errors = [];

  if (!pomodoroSettings.focusTime || pomodoroSettings.focusTime <= 0) {
    errors.push('Focus time must be greater than 0');
  }

  if (!pomodoroSettings.shortBreak || pomodoroSettings.shortBreak < 0) {
    errors.push('Short break duration must be 0 or greater');
  }

  if (!pomodoroSettings.longBreak || pomodoroSettings.longBreak < 0) {
    errors.push('Long break duration must be 0 or greater');
  }

  if (!pomodoroSettings.focusSessionsPerRound || pomodoroSettings.focusSessionsPerRound <= 0) {
    errors.push('Focus sessions per round must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to debug repeat data flow
export const debugRepeatData = (data) => {
  console.log('=== DEBUG REPEAT DATA ===');
  console.log('Full data object:', JSON.stringify(data, null, 2));
  console.log('Frequency data:', data.frequencyData);
  console.log('Activity Days:', data.frequencyData?.activityDays);
  console.log('Rest Days:', data.frequencyData?.restDays);
  console.log('Every Days:', data.frequencyData?.everyDays);
  console.log('Is Alternate Days:', data.frequencyData?.isRepeatAlternateDays);
  console.log('Is Repeat Flexible:', data.frequencyData?.isRepeatFlexible);
  console.log('========================');
};