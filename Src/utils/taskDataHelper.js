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

// Helper function to prepare task data for database saving
export const prepareTaskData = (previousData, scheduleData, userId, selectedGoal = null) => {
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