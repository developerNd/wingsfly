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
  if (taskStartDate) {
    const taskStartOfDay = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());
    if (targetStartOfDay < taskStartOfDay) {
      return false;
    }
  }
  
  // If task has an end date and target date is after end date, don't show
  if (task.endDate && task.isEndDateEnabled) {
    let taskEndDate;
    if (typeof task.endDate === 'string') {
      if (task.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = task.endDate.split('-').map(Number);
        taskEndDate = new Date(year, month - 1, day);
      } else {
        taskEndDate = new Date(task.endDate);
      }
    } else {
      taskEndDate = new Date(task.endDate);
    }
    
    if (!isNaN(taskEndDate.getTime())) {
      const taskEndOfDay = new Date(taskEndDate.getFullYear(), taskEndDate.getMonth(), taskEndDate.getDate());
      if (targetStartOfDay > taskEndOfDay) {
        return false;
      }
    }
  }
  
  // For one-time tasks (Task type), only show on the start date or creation date
  if (task.taskType === 'Task') {
    if (task.startDate && taskStartDate && !isNaN(taskStartDate.getTime())) {
      const taskStartOfDay = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());
      return targetStartOfDay.getTime() === taskStartOfDay.getTime();
    }
    
    // Fallback to creation date if no start date
    if (task.created_at) {
      const createdDate = new Date(task.created_at);
      if (!isNaN(createdDate.getTime())) {
        const createdStartOfDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
        return targetStartOfDay.getTime() === createdStartOfDay.getTime();
      }
    }
    
    return false; // Don't show Task type if no valid date found
  }
  
  // For Goal of the Day, only show on the date it was created/started
  if (task.taskType === 'Goal') {
    if (task.startDate && taskStartDate && !isNaN(taskStartDate.getTime())) {
      const taskStartOfDay = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());
      return targetStartOfDay.getTime() === taskStartOfDay.getTime();
    }
    
    // Fallback to creation date if no start date
    if (task.created_at) {
      const createdDate = new Date(task.created_at);
      if (!isNaN(createdDate.getTime())) {
        const createdStartOfDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
        return targetStartOfDay.getTime() === createdStartOfDay.getTime();
      }
    }
    
    return false; // Don't show Goal type if no valid date found
  }
  
  // For recurring and habit tasks, check repetition conditions
  if (task.taskType === 'Recurring' || task.taskType === 'Habit') {
    return checkRepetitionConditions(task, targetStartOfDay, taskStartDate);
  }
  
  // Default: don't show
  return false;
};

// Helper function to check repetition conditions
const checkRepetitionConditions = (task, targetDate, taskStartDate) => {
  const frequencyType = task.frequencyType || 'Every Day';
  
  // Normalize frequency type names to handle variations
  const normalizedFrequency = frequencyType.toLowerCase().trim();
  
  switch (normalizedFrequency) {
    case 'every day':
    case 'daily':
      return true;
      
    case 'specific days of the week':
    case 'weekly':
    case 'custom weekly':
      return checkWeekdayRepetition(task, targetDate);
      
    case 'specific days of the month':
    case 'monthly':
    case 'custom monthly':
      return checkMonthDayRepetition(task, targetDate);
      
    case 'specific days of the year':
    case 'yearly':
    case 'custom yearly':
      return checkYearDayRepetition(task, targetDate);
      
    case 'some days per period':
    case 'period':
      return checkPeriodRepetition(task, targetDate);
      
    case 'repeat':
    case 'custom repeat':
      return checkCustomRepetition(task, targetDate, taskStartDate);
      
    case 'once':
    case 'one time':
      // For one-time recurring tasks, show only on start date
      if (task.startDate) {
        let taskStartDate;
        if (typeof task.startDate === 'string') {
          if (task.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = task.startDate.split('-').map(Number);
            taskStartDate = new Date(year, month - 1, day);
          } else {
            taskStartDate = new Date(task.startDate);
          }
        } else {
          taskStartDate = new Date(task.startDate);
        }
        
        if (!isNaN(taskStartDate.getTime())) {
          const taskStartOfDay = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());
          return targetDate.getTime() === taskStartOfDay.getTime();
        }
      }
      
      // Fallback to creation date
      if (task.created_at) {
        const createdDate = new Date(task.created_at);
        if (!isNaN(createdDate.getTime())) {
          const createdStartOfDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
          return targetDate.getTime() === createdStartOfDay.getTime();
        }
      }
      
      return false;
      
    default:
      // Default to daily for unknown frequency types
      return true;
  }
};

// Check if task should repeat on specific weekdays
const checkWeekdayRepetition = (task, targetDate) => {
  const selectedWeekdays = task.selectedWeekdays || [];
  
  // If no specific weekdays are selected, default to all days
  if (selectedWeekdays.length === 0) {
    return true;
  }
  
  // Convert target date weekday to our format
  const weekday = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const weekdayNumber = weekday === 0 ? 7 : weekday; // Convert to 1 = Monday, 7 = Sunday
  
  // Check if the weekday is in the selected weekdays array
  return selectedWeekdays.includes(weekdayNumber);
};

// Check if task should repeat on specific days of the month
const checkMonthDayRepetition = (task, targetDate) => {
  const selectedMonthDates = task.selectedMonthDates || [];
  
  // If no specific dates are selected, default to all days
  if (selectedMonthDates.length === 0) {
    return true;
  }
  
  const dayOfMonth = targetDate.getDate();
  
  // Handle month flexibility - if enabled, task can appear on any day of month
  if (task.isMonthFlexible) {
    return true;
  }
  
  return selectedMonthDates.includes(dayOfMonth);
};

// Check if task should repeat on specific days of the year
const checkYearDayRepetition = (task, targetDate) => {
  const selectedYearDates = task.selectedYearDates || [];
  
  // If no specific dates are selected, default to all days
  if (selectedYearDates.length === 0) {
    return true;
  }
  
  const month = targetDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  const day = targetDate.getDate();
  
  // Handle year flexibility
  if (task.isYearFlexible) {
    return true;
  }
  
  console.log('Checking year dates for:', task.title);
  console.log('Target date:', `${month}/${day}`);
  console.log('Target date month name:', targetDate.toLocaleDateString('en-US', { month: 'long' }));
  console.log('Selected year dates:', selectedYearDates);
  
  // Month names array for matching
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const targetMonthName = monthNames[month - 1]; // Convert month number to name
  
  // Check if current date matches any selected year date
  return selectedYearDates.some(yearDate => {
    console.log('Checking year date:', yearDate, 'Type:', typeof yearDate);
    
    // Handle "Month Day" format like "January 1", "February 1", etc.
    if (typeof yearDate === 'string') {
      // Handle "Month Day" format (e.g., "January 1", "February 15")
      const monthDayMatch = yearDate.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
      if (monthDayMatch) {
        const [, monthName, dayStr] = monthDayMatch;
        const dayNum = parseInt(dayStr);
        
        // Case insensitive comparison for month names
        const match = monthName.toLowerCase() === targetMonthName.toLowerCase() && dayNum === day;
        console.log(`Month Day format: ${monthName} ${dayNum} === ${targetMonthName} ${day} = ${match}`);
        return match;
      }
      
      // Handle "Day Month" format (e.g., "1 January", "15 February")
      const dayMonthMatch = yearDate.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
      if (dayMonthMatch) {
        const [, dayStr, monthName] = dayMonthMatch;
        const dayNum = parseInt(dayStr);
        
        const match = monthName.toLowerCase() === targetMonthName.toLowerCase() && dayNum === day;
        console.log(`Day Month format: ${dayNum} ${monthName} === ${day} ${targetMonthName} = ${match}`);
        return match;
      }
      
      // Handle abbreviated month format (e.g., "Jan 1", "Feb 15")
      const shortMonthMatch = yearDate.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
      if (shortMonthMatch) {
        const [, shortMonth, dayStr] = shortMonthMatch;
        const dayNum = parseInt(dayStr);
        
        const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonth = monthNames[shortMonthNames.findIndex(m => m.toLowerCase() === shortMonth.toLowerCase())];
        
        const match = fullMonth && fullMonth.toLowerCase() === targetMonthName.toLowerCase() && dayNum === day;
        console.log(`Short month format: ${shortMonth} ${dayNum} (${fullMonth}) === ${targetMonthName} ${day} = ${match}`);
        return match;
      }
      
      // Handle object format: {month: 8, day: 20}
      if (typeof yearDate === 'object' && yearDate !== null) {
        if (yearDate.month && yearDate.day) {
          const match = yearDate.month === month && yearDate.day === day;
          console.log(`Object format: ${yearDate.month}/${yearDate.day} === ${month}/${day} = ${match}`);
          return match;
        }
        
        // Handle date object
        if (yearDate instanceof Date) {
          const match = (yearDate.getMonth() + 1) === month && yearDate.getDate() === day;
          console.log(`Date object: ${yearDate.getMonth() + 1}/${yearDate.getDate()} === ${month}/${day} = ${match}`);
          return match;
        }
      }
      
      // Handle "YYYY-MM-DD" format
      if (yearDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, monthStr, dayStr] = yearDate.split('-').map(Number);
        const match = monthStr === month && dayStr === day;
        console.log(`YYYY-MM-DD format: ${monthStr}/${dayStr} === ${month}/${day} = ${match}`);
        return match;
      }
      
      // Handle "MM/DD" or "MM-DD" format
      if (yearDate.match(/^\d{1,2}[\/\-]\d{1,2}$/)) {
        const parts = yearDate.split(/[\/\-]/);
        const monthStr = parseInt(parts[0]);
        const dayStr = parseInt(parts[1]);
        const match = monthStr === month && dayStr === day;
        console.log(`MM/DD format: ${monthStr}/${dayStr} === ${month}/${day} = ${match}`);
        return match;
      }
      
      // Try parsing as a full date string
      const yearDateObj = new Date(yearDate);
      if (!isNaN(yearDateObj.getTime())) {
        const match = (yearDateObj.getMonth() + 1) === month && yearDateObj.getDate() === day;
        console.log(`Date string: ${yearDateObj.getMonth() + 1}/${yearDateObj.getDate()} === ${month}/${day} = ${match}`);
        return match;
      }
    }
    
    // Handle object format: {month: 8, day: 20}
    if (typeof yearDate === 'object' && yearDate !== null && !(yearDate instanceof Date)) {
      if (yearDate.month && yearDate.day) {
        const match = yearDate.month === month && yearDate.day === day;
        console.log(`Object format: ${yearDate.month}/${yearDate.day} === ${month}/${day} = ${match}`);
        return match;
      }
    }
    
    // Handle Date object
    if (yearDate instanceof Date) {
      const match = (yearDate.getMonth() + 1) === month && yearDate.getDate() === day;
      console.log(`Date object: ${yearDate.getMonth() + 1}/${yearDate.getDate()} === ${month}/${day} = ${match}`);
      return match;
    }
    
    // Handle number format (assuming it's a day of year - 1-365)
    if (typeof yearDate === 'number') {
      const yearStart = new Date(targetDate.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((targetDate - yearStart) / (1000 * 60 * 60 * 24)) + 1;
      const match = yearDate === dayOfYear;
      console.log(`Day of year: ${yearDate} === ${dayOfYear} = ${match}`);
      return match;
    }
    
    console.log('No matching format found for:', yearDate);
    return false;
  });
};

// Check if task should repeat based on period conditions
const checkPeriodRepetition = (task, targetDate) => {
  const periodDays = task.periodDays || 1;
  const periodType = task.periodType || 'Week';
  const isFlexible = task.isFlexible || false;
  
  // If flexible, show on all days within the period
  if (isFlexible) {
    return true;
  }
  
  const normalizedPeriodType = periodType.toLowerCase();
  
  if (normalizedPeriodType === 'week') {
    // Get the start of the week (assuming week starts on Sunday)
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - targetDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate days since week start
    const daysSinceWeekStart = Math.floor((targetDate - weekStart) / (1000 * 60 * 60 * 24));
    
    // Show task if current day is within the specified period days of the week
    return daysSinceWeekStart < periodDays;
  }
  
  if (normalizedPeriodType === 'month') {
    const dayOfMonth = targetDate.getDate();
    return dayOfMonth <= periodDays;
  }
  
  if (normalizedPeriodType === 'year') {
    const yearStart = new Date(targetDate.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((targetDate - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    return dayOfYear <= periodDays;
  }
  
  return true;
};

// UPDATED: Check custom repetition conditions with proper repeat logic
const checkCustomRepetition = (task, targetDate, taskStartDate) => {
  const isRepeatFlexible = task.isRepeatFlexible || false;
  const isRepeatAlternateDays = task.isRepeatAlternateDays || false;
  const everyDays = task.everyDays;
  const activityDays = task.activityDays;
  const restDays = task.restDays;
  
  console.log('=== Checking Custom Repetition ===');
  console.log('Task:', task.title);
  console.log('Is Repeat Flexible:', isRepeatFlexible);
  console.log('Is Repeat Alternate Days:', isRepeatAlternateDays);
  console.log('Every Days:', everyDays);
  console.log('Activity Days:', activityDays);
  console.log('Rest Days:', restDays);
  console.log('Target Date:', targetDate);
  console.log('Task Start Date:', taskStartDate);
  
  // If flexible repeat, show on all days
  if (isRepeatFlexible) {
    console.log('Flexible repeat - showing task');
    return true;
  }
  
  // Determine the start date for calculations
  let startDate = taskStartDate;
  if (!startDate && task.created_at) {
    startDate = new Date(task.created_at);
    if (!isNaN(startDate.getTime())) {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    } else {
      startDate = null;
    }
  }
  
  if (!startDate) {
    console.log('No valid start date found, defaulting to show task');
    return true;
  }
  
  // Calculate days since start date
  const daysDiff = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
  console.log('Days since start:', daysDiff);
  
  if (daysDiff < 0) {
    console.log('Target date is before start date');
    return false;
  }
  
  // Handle "Every X Days" pattern
  if (everyDays && everyDays > 0) {
    const shouldShow = daysDiff % everyDays === 0;
    console.log(`Every ${everyDays} days pattern: ${daysDiff} % ${everyDays} = ${daysDiff % everyDays} - Should show: ${shouldShow}`);
    return shouldShow;
  }
  
  // Handle Activity/Rest Days pattern
  if ((activityDays && activityDays > 0) || (restDays && restDays > 0)) {
    const totalActivityDays = activityDays || 1;
    const totalRestDays = restDays || 0;
    const cycleLength = totalActivityDays + totalRestDays;
    
    if (cycleLength === 0) {
      console.log('Invalid cycle length, showing task');
      return true;
    }
    
    const positionInCycle = daysDiff % cycleLength;
    const shouldShow = positionInCycle < totalActivityDays;
    
    console.log(`Activity/Rest pattern: ${totalActivityDays} activity, ${totalRestDays} rest`);
    console.log(`Cycle length: ${cycleLength}, Position in cycle: ${positionInCycle}`);
    console.log(`Should show: ${shouldShow}`);
    
    return shouldShow;
  }
  
  // Check alternate days pattern (legacy support)
  if (isRepeatAlternateDays) {
    const shouldShow = daysDiff % 2 === 0;
    console.log(`Alternate days pattern: ${daysDiff} % 2 = ${daysDiff % 2} - Should show: ${shouldShow}`);
    return shouldShow;
  }
  
  // Default to showing the task if no specific pattern is defined
  console.log('No specific pattern defined, showing task');
  return true;
};

// Helper function to get the next occurrence of a task
export const getNextTaskOccurrence = (task, fromDate = new Date()) => {
  const from = new Date(fromDate);
  let currentDate = new Date(from);
  
  // Check next 365 days
  for (let i = 0; i < 365; i++) {
    currentDate = new Date(from);
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

// Helper function to debug task filtering (remove in production)
export const debugTaskFiltering = (task, targetDate) => {
  console.log('=== Debug Task Filtering ===');
  console.log('Task:', task.title);
  console.log('Task Type:', task.taskType);
  console.log('Frequency Type:', task.frequencyType);
  console.log('Target Date:', targetDate);
  console.log('Start Date:', task.startDate);
  console.log('End Date:', task.endDate);
  console.log('Selected Weekdays:', task.selectedWeekdays);
  console.log('Selected Month Dates:', task.selectedMonthDates);
  console.log('Selected Year Dates:', task.selectedYearDates);
  console.log('Every Days:', task.everyDays);
  console.log('Activity Days:', task.activityDays);
  console.log('Rest Days:', task.restDays);
  console.log('Is Repeat Flexible:', task.isRepeatFlexible);
  console.log('Is Repeat Alternate Days:', task.isRepeatAlternateDays);
  console.log('Should Appear:', shouldTaskAppearOnDate(task, targetDate));
  console.log('=== End Debug ===');
  
  return shouldTaskAppearOnDate(task, targetDate);
};

// Helper function to validate repeat data
export const validateRepeatData = (frequencyData) => {
  if (!frequencyData || frequencyData.selectedFrequency !== 'repeat') {
    return { isValid: true, errors: [] };
  }
  
  const errors = [];
  const { everyDays, activityDays, restDays, isRepeatFlexible } = frequencyData;
  
  // If flexible, no validation needed
  if (isRepeatFlexible) {
    return { isValid: true, errors: [] };
  }
  
  // Check if at least one pattern is defined
  const hasEveryDaysPattern = everyDays && everyDays > 0;
  const hasActivityRestPattern = (activityDays && activityDays > 0) || (restDays && restDays > 0);
  
  if (!hasEveryDaysPattern && !hasActivityRestPattern) {
    errors.push('Please specify either "Every X Days" or "Activity/Rest Days" pattern');
  }
  
  // Validate every days pattern
  if (everyDays !== undefined && everyDays !== null) {
    if (everyDays <= 0) {
      errors.push('Every Days must be greater than 0');
    }
    if (!Number.isInteger(everyDays)) {
      errors.push('Every Days must be a whole number');
    }
  }
  
  // Validate activity/rest pattern
  if (activityDays !== undefined && activityDays !== null) {
    if (activityDays <= 0) {
      errors.push('Activity Days must be greater than 0');
    }
    if (!Number.isInteger(activityDays)) {
      errors.push('Activity Days must be a whole number');
    }
  }
  
  if (restDays !== undefined && restDays !== null) {
    if (restDays < 0) {
      errors.push('Rest Days must be 0 or greater');
    }
    if (!Number.isInteger(restDays)) {
      errors.push('Rest Days must be a whole number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to get repeat pattern description
export const getRepeatPatternDescription = (task) => {
  if (!task.frequencyType || task.frequencyType.toLowerCase() !== 'repeat') {
    return null;
  }
  
  if (task.isRepeatFlexible) {
    return 'Flexible repeat (can be completed on any day)';
  }
  
  if (task.everyDays && task.everyDays > 0) {
    return `Every ${task.everyDays} day${task.everyDays > 1 ? 's' : ''}`;
  }
  
  if (task.activityDays || task.restDays) {
    const activity = task.activityDays || 1;
    const rest = task.restDays || 0;
    
    if (rest === 0) {
      return `${activity} day${activity > 1 ? 's' : ''} activity (no rest)`;
    }
    
    return `${activity} day${activity > 1 ? 's' : ''} activity, ${rest} day${rest > 1 ? 's' : ''} rest`;
  }
  
  if (task.isRepeatAlternateDays) {
    return 'Alternate days (every other day)';
  }
  
  return 'Custom repeat pattern';
};