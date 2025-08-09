// Helper function to check if a task should appear on a specific date
export const shouldTaskAppearOnDate = (task, targetDate) => {
  // Parse target date properly
  let target = null;
  if (typeof targetDate === 'string') {
    // If it's a date string like "Fri Aug 08 2025", parse it properly
    target = new Date(targetDate);
  } else {
    target = new Date(targetDate);
  }
  
  // Parse startDate properly - handle both string and Date objects
  let taskStartDate = null;
  if (task.startDate) {
    if (typeof task.startDate === 'string') {
      // If it's a date string like "2025-08-08", parse it properly
      if (task.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = task.startDate.split('-').map(Number);
        taskStartDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        taskStartDate = new Date(task.startDate);
      }
    } else {
      taskStartDate = new Date(task.startDate);
    }
  }
  
  // Validate dates
  if (!target || isNaN(target.getTime())) {
    return false;
  }
  
  // Normalize dates to start of day for comparison
  const targetStartOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  

  
  // If task has a start date and target date is before start date, don't show
  if (taskStartDate && target < taskStartDate) {
    return false;
  }
  
  // If task has an end date and target date is after end date, don't show
  if (task.endDate && task.isEndDateEnabled) {
    const taskEndDate = new Date(task.endDate);
    if (target > taskEndDate) {
      return false;
    }
  }
  
  // For non-recurring tasks, only show on the date they were created
  if (task.taskType !== 'Recurring' && task.taskType !== 'Habit') {
    const createdDate = task.startDate ? new Date(task.startDate) : new Date(task.created_at);
    const createdStartOfDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const shouldShow = targetStartOfDay.getTime() === createdStartOfDay.getTime();
    return shouldShow;
  }
  
  // For recurring and habit tasks, check repetition conditions
  return checkRepetitionConditions(task, targetStartOfDay);
};

// Helper function to check repetition conditions
const checkRepetitionConditions = (task, targetDate) => {
  // For Habit tasks, they should always show (daily habits)
  if (task.taskType === 'Habit') {
    return true;
  }
  
  const frequencyType = task.frequencyType || 'Every Day';
  
  switch (frequencyType) {
    case 'Every Day':
      return true;
      
    case 'Specific days of the week':
      return checkWeekdayRepetition(task, targetDate);
      
    case 'Specific days of the month':
      return checkMonthDayRepetition(task, targetDate);
      
    case 'Specific days of the year':
      return checkYearDayRepetition(task, targetDate);
      
    case 'Some days per period':
      return checkPeriodRepetition(task, targetDate);
      
    case 'Repeat':
      return checkCustomRepetition(task, targetDate);
      
    default:
      return true;
  }
};

// Check if task should repeat on specific weekdays
const checkWeekdayRepetition = (task, targetDate) => {
  const selectedWeekdays = task.selectedWeekdays || [];
  if (selectedWeekdays.length === 0) return true;
  
  // Convert weekday to number (0 = Sunday, 1 = Monday, etc.)
  const weekday = targetDate.getDay();
  // Convert to our format (1 = Monday, 7 = Sunday)
  const weekdayNumber = weekday === 0 ? 7 : weekday;
  
  return selectedWeekdays.includes(weekdayNumber);
};

// Check if task should repeat on specific days of the month
const checkMonthDayRepetition = (task, targetDate) => {
  const selectedMonthDates = task.selectedMonthDates || [];
  if (selectedMonthDates.length === 0) return true;
  
  const dayOfMonth = targetDate.getDate();
  return selectedMonthDates.includes(dayOfMonth);
};

// Check if task should repeat on specific days of the year
const checkYearDayRepetition = (task, targetDate) => {
  const selectedYearDates = task.selectedYearDates || [];
  if (selectedYearDates.length === 0) return true;
  
  const month = targetDate.getMonth() + 1; // getMonth() returns 0-11
  const day = targetDate.getDate();
  
  return selectedYearDates.some(yearDate => 
    yearDate.month === month && yearDate.day === day
  );
};

// Check if task should repeat based on period conditions
const checkPeriodRepetition = (task, targetDate) => {
  const periodDays = task.periodDays || 1;
  const periodType = task.periodType || 'Week';
  const isFlexible = task.isFlexible || false;
  
  if (periodType === 'Week') {
    // Check if it's the correct week day
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - targetDate.getDay());
    
    const daysSinceWeekStart = Math.floor((targetDate - weekStart) / (1000 * 60 * 60 * 24));
    return (daysSinceWeekStart + 1) <= periodDays;
  }
  
  if (periodType === 'Month') {
    // Check if it's within the first N days of the month
    const dayOfMonth = targetDate.getDate();
    return dayOfMonth <= periodDays;
  }
  
  if (periodType === 'Year') {
    // Check if it's within the first N days of the year
    const dayOfYear = Math.floor((targetDate - new Date(targetDate.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return dayOfYear <= periodDays;
  }
  
  return true;
};

// Check custom repetition conditions
const checkCustomRepetition = (task, targetDate) => {
  const isRepeatFlexible = task.isRepeatFlexible || false;
  const isRepeatAlternateDays = task.isRepeatAlternateDays || false;
  
  if (isRepeatAlternateDays) {
    // Check if it's an alternate day
    const taskStartDate = task.startDate ? new Date(task.startDate) : new Date();
    const daysDiff = Math.floor((targetDate - taskStartDate) / (1000 * 60 * 60 * 24));
    return daysDiff % 2 === 0;
  }
  
  return true;
};

// Helper function to get the next occurrence of a task
export const getNextTaskOccurrence = (task, fromDate = new Date()) => {
  const from = new Date(fromDate);
  let currentDate = new Date(from);
  
  // Check next 365 days
  for (let i = 0; i < 365; i++) {
    currentDate.setDate(from.getDate() + i);
    if (shouldTaskAppearOnDate(task, currentDate)) {
      return new Date(currentDate);
    }
  }
  
  return null;
};

// Helper function to get all occurrences of a task within a date range
export const getTaskOccurrencesInRange = (task, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const occurrences = [];
  
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    if (shouldTaskAppearOnDate(task, currentDate)) {
      occurrences.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return occurrences;
}; 