export const getCompletionDateString = dateInput => {
  try {
    let date;

    if (typeof dateInput === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }

      // For date strings like "Thu Aug 21 2025", parse carefully
      // Use local date parsing to avoid timezone issues
      date = new Date(dateInput);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateInput);
        date = new Date(); // Fallback to today
      }
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      console.warn('Invalid date input:', dateInput);
      date = new Date(); // Fallback to today
    }

    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting date:', error);
    // Fallback to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Alternative: if you prefer to keep using toISOString, use this safer version
export const getCompletionDateStringSafe = dateInput => {
  try {
    let date;

    if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }

      // For strings like "Thu Aug 21 2025", create date at noon to avoid timezone issues
      const parsedDate = new Date(dateInput);
      if (isNaN(parsedDate.getTime())) {
        date = new Date();
      } else {
        // Set to noon to avoid timezone edge cases
        date = new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          12,
          0,
          0,
        );
      }
    } else if (dateInput instanceof Date) {
      // Set to noon to avoid timezone edge cases
      date = new Date(
        dateInput.getFullYear(),
        dateInput.getMonth(),
        dateInput.getDate(),
        12,
        0,
        0,
      );
    } else {
      date = new Date();
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting date:', error);
    return new Date().toISOString().split('T')[0];
  }
};
