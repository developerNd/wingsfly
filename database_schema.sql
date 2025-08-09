-- Create tasks table with comprehensive columns
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic task information
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  task_type TEXT NOT NULL, -- 'Habit', 'Recurring', 'Task', 'Goal'
  evaluation_type TEXT, -- 'yesNo', 'timer', 'checklist', 'numeric'
  
  -- Visual and display properties
  time TEXT,
  time_color TEXT,
  tags TEXT[],
  image TEXT,
  has_flag BOOLEAN DEFAULT false,
  priority TEXT, -- 'High', 'Medium', 'Low'
  
  -- Task-specific data
  numeric_value INTEGER DEFAULT 0,
  numeric_goal INTEGER,
  numeric_unit TEXT,
  numeric_condition TEXT, -- 'At Least', 'Less than', 'Exactly', 'Any Value'
  
  -- Timer-specific data
  timer_duration JSONB, -- {hours: 0, minutes: 0, seconds: 0}
  timer_condition TEXT, -- 'At Least', 'Less than', 'Any Value'
  
  -- Checklist-specific data
  checklist_items JSONB, -- Array of {id: number, text: string, completed: boolean}
  success_condition TEXT, -- 'All Items', 'Custom'
  custom_items_count INTEGER DEFAULT 1,
  
  -- Repetition and frequency settings
  frequency_type TEXT, -- 'Every Day', 'Specific days of the week', 'Specific days of the month', 'Specific days of the year', 'Some days per period', 'Repeat'
  selected_weekdays INTEGER[], -- [1,2,3,4,5,6,7] for Monday-Sunday
  selected_month_dates INTEGER[], -- [1,2,3...31]
  selected_year_dates JSONB, -- Array of {month: number, day: number}
  period_days INTEGER DEFAULT 1,
  period_type TEXT, -- 'Week', 'Month', 'Year'
  is_flexible BOOLEAN DEFAULT false,
  is_month_flexible BOOLEAN DEFAULT false,
  is_year_flexible BOOLEAN DEFAULT false,
  use_day_of_week BOOLEAN DEFAULT false,
  is_repeat_flexible BOOLEAN DEFAULT false,
  is_repeat_alternate_days BOOLEAN DEFAULT false,
  
  -- Scheduling settings
  start_date DATE,
  end_date DATE,
  is_end_date_enabled BOOLEAN DEFAULT false,
  
  -- Block time settings
  block_time_enabled BOOLEAN DEFAULT false,
  block_time_data JSONB, -- {startTime: string, endTime: string, days: string[]}
  
  -- Duration settings
  duration_enabled BOOLEAN DEFAULT false,
  duration_data JSONB, -- {hours: number, minutes: number}
  
  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_data JSONB, -- {time: string, days: string[], enabled: boolean}
  
  -- Additional features
  add_pomodoro BOOLEAN DEFAULT false,
  add_to_google_calendar BOOLEAN DEFAULT false,
  is_pending_task BOOLEAN DEFAULT false,
  
  -- Goal linking
  linked_goal_id UUID,
  linked_goal_title TEXT,
  linked_goal_type TEXT, -- 'longTerm', 'recurring'
  
  -- Notes
  note TEXT,
  
  -- Progress tracking
  progress TEXT,
  is_completed BOOLEAN DEFAULT false,
  completion_count INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own tasks
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own tasks
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 