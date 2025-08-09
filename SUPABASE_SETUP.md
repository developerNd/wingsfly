# Supabase Integration Setup Guide

This guide will help you set up the Supabase integration for saving habit tasks in the WingsFly app.

## Prerequisites

1. A Supabase account and project
2. The Supabase project URL and anon key (already configured in `supabase.jsx`)

## Database Setup

### 1. Create the Database Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database_schema.sql` into the editor
4. Click "Run" to execute the SQL commands

This will create:
- A `tasks` table with all necessary columns
- Proper indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp updates

### 2. Verify the Setup

After running the SQL, you should see:
- A new `tasks` table in your database
- RLS policies in the Authentication > Policies section
- The table should be accessible only to authenticated users

## Features Implemented

### 1. Task Management
- **Create**: New tasks are saved to Supabase
- **Read**: Tasks are loaded from Supabase on app startup
- **Update**: Task completion status is synced with Supabase
- **Delete**: Tasks can be removed from the database

### 2. Task Types Supported
- **Regular Tasks**: Simple checkbox completion
- **Numeric Tasks**: Tasks with numeric values (e.g., "Walk 10k steps")
- **Timer Tasks**: Tasks with time tracking (redirects to Pomodoro screen)

### 3. Data Synchronization
- Real-time updates between local state and Supabase
- Automatic loading of tasks when the screen comes into focus
- Error handling with user-friendly alerts

## Usage

### Creating Tasks
Tasks are created through the existing navigation flow:
1. Tap the "+" button on the home screen
2. Select task type (Habit, Recurring, Task, Goal) from the modal
3. Navigate through the category selection
4. The task will be automatically saved to Supabase

### Completing Tasks
- Tap the checkbox next to any task to mark it as complete
- For numeric tasks, a modal will appear to enter the value
- Completion status is immediately synced to Supabase

### Data Structure

Each task in Supabase contains:
```json
{
  "id": "uuid",
  "user_id": "user_uuid",
  "title": "Task title",
  "description": "Task description",
  "category": "Work and Career",
  "task_type": "Habit|Recurring|Task|Goal",
  "evaluation_type": "yesNo|timer|checklist|numeric",
  "time": "09:00 AM",
  "time_color": "#E4EBF3",
  "tags": ["Habit", "Must"],
  "image": "icon_path",
  "has_flag": true,
  "priority": "High|Medium|Low",
  "numeric_value": 0,
  "numeric_goal": 10000,
  "numeric_unit": "steps",
  "numeric_condition": "At Least",
  "timer_duration": {"hours": 0, "minutes": 30, "seconds": 0},
  "timer_condition": "At Least",
  "checklist_items": [{"id": 1, "text": "Item 1", "completed": false}],
  "success_condition": "All Items",
  "frequency_type": "Every Day",
  "selected_weekdays": [1, 2, 3, 4, 5],
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "is_completed": false,
  "completion_count": 0,
  "streak_count": 0,
  "last_completed_at": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Error Handling

The app includes comprehensive error handling:
- Network errors are caught and displayed to users
- Local state is reverted on failed operations
- Loading states prevent multiple simultaneous requests
- User-friendly error messages guide users on what to do

## Security

- Row Level Security (RLS) ensures users can only access their own tasks
- All database operations require authentication
- User ID is automatically attached to all task operations

## Testing

To test the integration:
1. Ensure you're logged into the app
2. Create a new habit task
3. Check that it appears in your Supabase dashboard
4. Complete the task and verify the completion status updates
5. Check that the task persists after app restart

## Troubleshooting

### Common Issues

1. **Tasks not loading**: Check if the user is authenticated
2. **Permission errors**: Verify RLS policies are correctly set up
3. **Network errors**: Check internet connection and Supabase URL/key
4. **Data not syncing**: Ensure the user ID is being passed correctly

### Debug Steps

1. Check the browser console for error messages
2. Verify the Supabase connection in the dashboard
3. Test database queries directly in the SQL editor
4. Check that the user is properly authenticated

## Next Steps

Potential enhancements:
- Real-time updates using Supabase subscriptions
- Offline support with local storage
- Task categories and filtering
- Advanced analytics and reporting
- Task sharing between users 