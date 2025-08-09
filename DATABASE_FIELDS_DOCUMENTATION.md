# Database Fields Documentation

This document explains all the fields in the `tasks` table and how they map to the different screens in the WingsFly app.

## Table Structure Overview

The `tasks` table is designed to store all types of tasks (Habits, Recurring Tasks, Single Tasks, and Goals) with comprehensive data from all the creation flow screens.

## Field Categories

### 1. Basic Task Information

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `id` | UUID | Primary key | Auto-generated |
| `user_id` | UUID | User who owns the task | Auth context |
| `title` | TEXT | Task title/name | All definition screens |
| `description` | TEXT | Task description | All definition screens |
| `category` | TEXT | Task category (e.g., "Work and Career") | CategorySelection.jsx |
| `task_type` | TEXT | Type of task: 'Habit', 'Recurring', 'Task', 'Goal' | Home.jsx modal |
| `evaluation_type` | TEXT | How task is evaluated: 'yesNo', 'timer', 'checklist', 'numeric' | EvaluateProgress.jsx |

### 2. Visual and Display Properties

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `time` | TEXT | Display time (e.g., "09:00 AM") | Various screens |
| `time_color` | TEXT | Background color for time display | Various screens |
| `tags` | TEXT[] | Array of tags (e.g., ["Habit", "Must"]) | Various screens |
| `image` | TEXT | Icon/image path | Various screens |
| `has_flag` | BOOLEAN | Whether task has a flag | Various screens |
| `priority` | TEXT | Priority level: 'High', 'Medium', 'Low' | Recurring screens |

### 3. Task-Specific Data

#### Numeric Tasks
| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `numeric_value` | INTEGER | Current numeric value | NumericScreen.jsx |
| `numeric_goal` | INTEGER | Target numeric goal | NumericScreen.jsx |
| `numeric_unit` | TEXT | Unit of measurement | NumericScreen.jsx |
| `numeric_condition` | TEXT | Condition: 'At Least', 'Less than', 'Exactly', 'Any Value' | NumericScreen.jsx |

#### Timer Tasks
| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `timer_duration` | JSONB | {hours: 0, minutes: 0, seconds: 0} | TimerScreen1.jsx |
| `timer_condition` | TEXT | Condition: 'At Least', 'Less than', 'Any Value' | TimerScreen1.jsx |

#### Checklist Tasks
| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `checklist_items` | JSONB | Array of {id: number, text: string, completed: boolean} | ChecklistScreen.jsx |
| `success_condition` | TEXT | 'All Items' or 'Custom' | ChecklistScreen.jsx |
| `custom_items_count` | INTEGER | Number of items required for success | ChecklistScreen.jsx |

### 4. Repetition and Frequency Settings

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `frequency_type` | TEXT | Frequency type: 'Every Day', 'Specific days of the week', etc. | TimerScreen2.jsx |
| `selected_weekdays` | INTEGER[] | Selected weekdays [1,2,3,4,5,6,7] | TimerScreen2.jsx |
| `selected_month_dates` | INTEGER[] | Selected dates of month [1,2,3...31] | TimerScreen2.jsx |
| `selected_year_dates` | JSONB | Array of {month: number, day: number} | TimerScreen2.jsx |
| `period_days` | INTEGER | Number of days per period | TimerScreen2.jsx |
| `period_type` | TEXT | Period type: 'Week', 'Month', 'Year' | TimerScreen2.jsx |
| `is_flexible` | BOOLEAN | Whether frequency is flexible | TimerScreen2.jsx |
| `is_month_flexible` | BOOLEAN | Whether month selection is flexible | TimerScreen2.jsx |
| `is_year_flexible` | BOOLEAN | Whether year selection is flexible | TimerScreen2.jsx |
| `use_day_of_week` | BOOLEAN | Whether to use day of week | TimerScreen2.jsx |
| `is_repeat_flexible` | BOOLEAN | Whether repeat is flexible | TimerScreen2.jsx |
| `is_repeat_alternate_days` | BOOLEAN | Whether to repeat on alternate days | TimerScreen2.jsx |

### 5. Scheduling Settings

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `start_date` | DATE | Task start date | TimerScreen3.jsx |
| `end_date` | DATE | Task end date | TimerScreen3.jsx |
| `is_end_date_enabled` | BOOLEAN | Whether end date is set | TimerScreen3.jsx |

### 6. Block Time Settings

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `block_time_enabled` | BOOLEAN | Whether block time is enabled | TimerScreen3.jsx |
| `block_time_data` | JSONB | {startTime: string, endTime: string, days: string[]} | BlockTime.jsx |

### 7. Duration Settings

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `duration_enabled` | BOOLEAN | Whether duration is set | TimerScreen3.jsx |
| `duration_data` | JSONB | {hours: number, minutes: number} | DurationModal.jsx |

### 8. Reminder Settings

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `reminder_enabled` | BOOLEAN | Whether reminder is enabled | TimerScreen3.jsx |
| `reminder_data` | JSONB | {time: string, days: string[], enabled: boolean} | ReminderModal.jsx |

### 9. Additional Features

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `add_pomodoro` | BOOLEAN | Whether to add Pomodoro timer | TimerScreen3.jsx |
| `add_to_google_calendar` | BOOLEAN | Whether to add to Google Calendar | TimerScreen3.jsx |
| `is_pending_task` | BOOLEAN | Whether task is pending | Recurring screens |

### 10. Goal Linking

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `linked_goal_id` | UUID | ID of linked goal | LinkGoal.jsx |
| `linked_goal_title` | TEXT | Title of linked goal | LinkGoal.jsx |
| `linked_goal_type` | TEXT | Type of goal: 'longTerm', 'recurring' | LinkGoal.jsx |

### 11. Notes

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `note` | TEXT | Additional notes | NoteModal.jsx |

### 12. Progress Tracking

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `progress` | TEXT | Progress display (e.g., "12/31") | Various screens |
| `is_completed` | BOOLEAN | Whether task is completed | Home.jsx |
| `completion_count` | INTEGER | Number of times completed | Home.jsx |
| `streak_count` | INTEGER | Current streak count | Home.jsx |
| `last_completed_at` | TIMESTAMP | Last completion timestamp | Home.jsx |

### 13. Timestamps

| Field | Type | Description | Source Screen |
|-------|------|-------------|---------------|
| `created_at` | TIMESTAMP | Task creation timestamp | Auto-generated |
| `updated_at` | TIMESTAMP | Last update timestamp | Auto-generated |

## Screen Flow Mapping

### 1. Category Selection Flow
```
Home.jsx (modal) → CategorySelection.jsx → EvaluateProgress.jsx → [Task Type Screens]
```

**Data collected:**
- `task_type` (from Home.jsx modal)
- `category` (from CategorySelection.jsx)
- `evaluation_type` (from EvaluateProgress.jsx)

### 2. Habit Definition Flow
```
TimerScreen1.jsx → TimerScreen2.jsx → TimerScreen3.jsx → LinkGoal.jsx
```

**Data collected:**
- `title`, `description` (from TimerScreen1.jsx)
- `timer_duration`, `timer_condition` (from TimerScreen1.jsx)
- `frequency_type`, `selected_weekdays`, etc. (from TimerScreen2.jsx)
- `start_date`, `end_date`, `block_time_enabled`, etc. (from TimerScreen3.jsx)
- `linked_goal_id`, `linked_goal_title` (from LinkGoal.jsx)

### 3. Numeric Task Flow
```
NumericScreen.jsx → TimerScreen2.jsx → TimerScreen3.jsx → LinkGoal.jsx
```

**Data collected:**
- `title`, `description`, `numeric_goal`, `numeric_unit`, `numeric_condition` (from NumericScreen.jsx)
- Frequency and scheduling data (from subsequent screens)

### 4. Checklist Task Flow
```
ChecklistScreen.jsx → TimerScreen2.jsx → TimerScreen3.jsx → LinkGoal.jsx
```

**Data collected:**
- `title`, `description`, `checklist_items`, `success_condition` (from ChecklistScreen.jsx)
- Frequency and scheduling data (from subsequent screens)

### 5. Yes/No Task Flow
```
YesorNoScreen.jsx → TimerScreen2.jsx → TimerScreen3.jsx → LinkGoal.jsx
```

**Data collected:**
- `title`, `description` (from YesorNoScreen.jsx)
- Frequency and scheduling data (from subsequent screens)

## Usage Examples

### Creating a Numeric Habit Task
```javascript
const taskData = {
  title: "Walk 10k steps",
  description: "Daily walking goal",
  category: "Health and Fitness",
  taskType: "Habit",
  evaluationType: "numeric",
  numericGoal: 10000,
  numericUnit: "steps",
  numericCondition: "At Least",
  frequencyType: "Every Day",
  startDate: "2024-01-01",
  userId: "user-uuid"
};
```

### Creating a Timer Task
```javascript
const taskData = {
  title: "Meditation",
  description: "Daily meditation practice",
  category: "Personal Growth",
  taskType: "Habit",
  evaluationType: "timer",
  timerDuration: { hours: 0, minutes: 30, seconds: 0 },
  timerCondition: "At Least",
  frequencyType: "Specific days of the week",
  selectedWeekdays: [1, 2, 3, 4, 5], // Monday to Friday
  startDate: "2024-01-01",
  userId: "user-uuid"
};
```

### Creating a Checklist Task
```javascript
const taskData = {
  title: "Morning Routine",
  description: "Complete morning routine",
  category: "Personal Growth",
  taskType: "Habit",
  evaluationType: "checklist",
  checklistItems: [
    { id: 1, text: "Brush teeth", completed: false },
    { id: 2, text: "Take shower", completed: false },
    { id: 3, text: "Eat breakfast", completed: false }
  ],
  successCondition: "All Items",
  frequencyType: "Every Day",
  startDate: "2024-01-01",
  userId: "user-uuid"
};
```

## Data Validation

The database includes several constraints and validations:

1. **Required Fields**: `title`, `task_type`, `user_id`
2. **Data Types**: Proper data types for each field
3. **JSONB Fields**: Structured data for complex objects
4. **Array Fields**: Proper array handling for multiple selections
5. **Date Fields**: Proper date formatting and validation

## Performance Considerations

1. **Indexes**: Created on frequently queried fields
2. **JSONB**: Efficient storage for complex data structures
3. **Array Fields**: Optimized for PostgreSQL array operations
4. **Row Level Security**: Ensures data privacy and performance

This comprehensive schema allows the app to store all task-related data in a single, well-structured table while maintaining flexibility for different task types and user preferences. 