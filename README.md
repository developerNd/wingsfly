# WingsFly - Advanced Task Management & Productivity App

A feature-rich React Native task management application with intelligent app blocking, custom voice commands, and comprehensive analytics. Built for iOS and Android with Supabase backend and ElevenLabs voice integration.

---

## 📱 Platform & Tech Stack

- **Framework:** React Native CLI
- **Backend:** Supabase
- **Voice Integration:** ElevenLabs (Cloned Voice)
- **Platforms:** iOS & Android
- **Language:** JavaScript/TypeScript
- **Native Modules:** Android (custom implementation for blocking, alarms, and voice features)

---

## 🔐 Authentication & Onboarding

### **Login Features**
- Email/Password authentication
- Remember me functionality
- Forgot password flow with email reset
- Secure session management

### **Onboarding Experience**
- Gender-based selection for personalization
- Custom profile setup
- Initial preferences configuration
- Welcome tutorial

---

## 🎯 Core Features

### **1. Five Main Task Types**

#### **A. Habit Tasks**
Complete workflow for building lasting habits with multiple evaluation methods.

**Category Selection:**
- Choose from predefined categories or create custom ones
- Visual category icons for quick identification

**Five Evaluation Types:**
1. **Yes/No Completion** - Simple toggle for daily habits
2. **Focus Session (Pomodoro)** - Timed focus sessions with breaks
3. **Timer Tracker** - Unlimited time tracking across multiple cycles
4. **Checklist** - Multi-step task completion
5. **Numeric Tracking** - Goal-based numerical progress (reps, km, hours, etc.)

**Date Specification Options:**
- **Every Day** - Daily recurring tasks
- **Specific Days** - Select particular days of week/month/year
- **Days per Period** - X days per week/month
- **Repeat Intervals** - Every 2 days, every 3 days, etc.

**Time Management:**
- Start Date & End Date selection
- Start Time & End Time configuration
- Duration-based scheduling

**Dual Reminder System:**
1. **Notification Reminders** - Standard push notifications
2. **Alarm Reminders** - Custom ElevenLabs voice message alarms with native implementation

**Pomodoro Settings (Focus Session only):**
- Customizable focus duration (default: 25 minutes)
- Short break duration (default: 5 minutes)
- Long break duration (default: 15 minutes)
- Sessions per round (default: 4)
- Auto-start options for breaks and focus sessions

---

#### **B. Recurring Tasks**
Tasks that appear continuously without specific date limitations.

**Features:**
- Same evaluation types as Habit tasks
- No date-specific creation required
- Appears daily from creation date onwards
- Continuous tracking and progress monitoring
- Ideal for ongoing responsibilities

---

#### **C. Standard Tasks**
One-time tasks for specific dates.

**Features:**
- Date-specific creation
- Shows only on created date
- All evaluation types supported
- One-time completion tracking
- Perfect for deadlines and single events

---

#### **D. Challenge Creation**
Gamified long-term goal tracking with dedicated management.

**Quick Setup:**
- Challenge name
- Purpose/Motivation ("Why?")
- Duration in days
- Hours per day commitment

**Features:**
- Separate dedicated tab for all challenges
- Daily progress tracking
- Completion statistics
- Achievement milestones
- Visual progress indicators

---

#### **E. Plan Your Day**
Smart daily planning with unique voice-guided experience.

**Unique Features:**
- Background music plays during task creation
- Category-based organization
- All evaluation types supported
- Voice-guided intention setting

**Smart 5-Minute Pre-Task Reminders:**
1. **Initial Prompt** - "Are you ready?" notification
2. **If Ready Selected:**
   - Plays custom intention voice command (ElevenLabs)
   - Auto-navigates to app
   - For Timer Tracker tasks → Opens timer screen directly
   - For other tasks → Opens relevant completion screen
3. **If Not Ready Selected:**
   - Shows Reschedule or Cancel options
   - Reschedule → Opens task edit screen
   - Allows time adjustment on-the-fly

---

#### **F. Lock Challenge**
Gamified intensive digital wellness challenges with video-based motivation and scheduled time slots.

**Quick Setup:**
- Challenge name and category selection
- Video integration (local upload or YouTube link)
- Duration configuration (1-365 days)
- Hours per day commitment (0.5-24 hours)
- Primary and backup time slot scheduling
- Automatic start and end date calculation

**Features:**
- Dedicated "Lock Challenges" tab in navigation
- Quick add button for challenge creation
- Pull-to-refresh for real-time updates
- Status indicators: pending, in-progress, completed, missed
- Challenge cards display:
  - Name and status badge
  - Duration and hours per day
  - Start and end dates
  - Category tag
- Day-by-day calendar grid (4-column layout) with color-coded day status:
  - Gray: Pending/incomplete
  - Blue: Completed
  - Red: Expired (past date, not completed)
- Completion tracking:
  - Mark individual days as complete
  - Track hours invested per day
  - Record video completion status
  - Automatic expiration for past dates
  - Completion statistics (total days, percentage, hours)
  - Video completion rate calculation
- Data Persistence:
  - Supabase backend synchronization
  - Real-time multi-device sync
  - Historical data preservation
  - Offline caching support
- Native Integration:
  - `ChallengeNativeScheduler` module
  - Time slot notification scheduling
  - Background task scheduling
  - Persistent cross-restart scheduling
- Validation:
  - Challenge name required (max 70 characters)
  - Video required (upload or YouTube)
  - YouTube URL format validation
  - Time slot ordering (backup after primary)
  - Duration range: 1-365 days
  - Hours per day: 0.5-24 hours

---

### **2. Evaluation Type Completion Flows**

#### **Yes/No Completion**
- Simple radio button interface
- Single tap to complete/uncomplete
- Instant visual feedback
- Date-specific completion tracking
- Progress history

---

#### **Focus Session (Pomodoro Timer)**

**Core Features:**
- Customizable Pomodoro session structure
- Multiple focus/break cycles per round
- Visual timer with animated clock
- Real-time progress tracking with Lottie animations
- Flower animation grows with progress

**Session Management:**
- Session structure with configurable cycles
- Separate tracking for focus sessions and breaks
- Auto-progression between sessions
- Completion detection and auto-save

**Advanced Features:**
- App blocking during focus sessions (native implementation)
- Background time synchronization
- Pause and resume functionality
- Session persistence across app restarts
- Total time accumulation
- Completed pomodoros counter
- Break tracking (short/long breaks separately)

**Controls:**
- Play/Pause toggle
- Skip current session
- Stop and reset
- Achievement screen on completion

**Data Tracking:**
- Total pomodoros completed
- Total breaks completed
- Short breaks vs long breaks
- Session-by-session history
- Time spent per session

---

#### **Timer Tracker (Unlimited Time Tracking)**

**Core Features:**
- Unlimited cycle-based time tracking
- Continuous session progression
- No time limit constraints
- Real-time total time display

**Cycle Management:**
- Current cycle number tracking
- Total cycles completed
- Session within cycle tracking
- Automatic cycle progression

**Display Elements:**
- Large animated timer display
- Total accumulated time (hours, minutes, seconds)
- Session count badge (total completed sessions)
- Current cycle/session indicator

**Controls:**
- **Play/Pause Button** - Start/pause timer with visual feedback
- **Complete Button** - Mark entire task as complete (green on press)
- **Stop Button** - Stop and reset timer (red on press with confirmation)

**Advanced Features:**
- App blocking during focus sessions
- Background time synchronization
- Activity tracking (play, pause, stop, complete events)
- Stop confirmation modal to prevent accidental resets
- State persistence across app restarts
- Resume from paused state
- Cleared state detection on restart

**Voice Test Feature (Plan Your Day only):**
- Triple-tap timer to reveal voice test controls
- Test short break voice
- Test long break voice
- Hidden by default, visible only for Plan Your Day tasks

**Data Tracking:**
- Total time across all cycles
- Completed pomodoros per cycle
- Completed breaks (short/long) per cycle
- Session completions
- Activity logs (play, pause, stop, complete)
- Achievement data with time breakdown

---

#### **Checklist Completion**

**Item Management:**
- Add new checklist items dynamically
- Delete items with visual confirmation
- Reorder items via drag-and-drop (Sorting Screen)
- Edit item text inline

**Completion Tracking:**
- Toggle individual items
- Visual progress counter (X/Y completed)
- Completed items remain visible
- Date-specific completion state

**Advanced Features:**
- Filter mode for item management
- Sort items by various criteria
- Bulk operations support
- Success condition modal for batch completion
- Evaluation type per item (Task & Plan Your Day only)

**Visual Elements:**
- Numbered list format
- Checkbox indicators (checked/unchecked)
- Strike-through for completed items (optional)
- Progress percentage display

**Modes:**
- **Normal Mode** - Toggle completion
- **Filter Mode** - Delete and manage items
- **Sort Mode** - Reorder items

**Achievement Integration:**
- Auto-navigation to Achievement screen on full completion
- Time tracking if block time enabled
- Duration calculation from start/end time
- Completion celebration

---

#### **Numeric Tracking**

**Input Controls:**
- Increment button (+)
- Decrement button (-)
- Large numeric display with unit
- Current value vs target value display

**Goal Configuration:**
- Set numeric goal (target value)
- Specify unit (kg, km, reps, hours, liters, etc.)
- Define completion condition:
  - **Any Value** - Any number > 0 completes
  - **Less Than** - Value must be < target
  - **Exactly** - Value must equal target
  - **At Least** - Value must be ≥ target

**Features:**
- Real-time completion status
- Progress visualization (Today: X / Y units)
- Date-specific value storage
- Historical value tracking
- Zero value always means incomplete

**Visual Feedback:**
- Color-coded completion status
- Unit display beside value
- Target comparison
- Date badge showing current date

**Data Persistence:**
- Loads saved value for selected date
- Auto-saves on every change
- Maintains completion state
- Syncs with backend (Supabase)

---

### **3. Planner Tab - Node-Based Task Management**

**Visual Task Organization:**
- Node-based hierarchical structure
- Drag-and-drop interface
- Connect related tasks visually
- Parent-child task relationships

**Zoom & Navigation:**
- Pinch to zoom in/out
- Pan across canvas
- Minimap for navigation (if implemented)
- Fit-to-screen option

**Quick Task Creation:**
- Create task with name only
- Set target date
- Add to existing node structure
- Instant visual placement

**Node Features:**
- Separate completion tracking per node
- Visual connection lines
- Color-coded by status
- Expandable/collapsible branches

---

### **4. Analytics Dashboard**

**Separate Analytics Categories:**

**Habit Analytics:**
- Completion streaks
- Daily/weekly/monthly patterns
- Best performing habits
- Completion rate trends
- Heatmap visualization

**Recurring Task Analytics:**
- Daily completion rates
- Consistency tracking
- Performance trends
- Time-of-day patterns

**Standard Task Analytics:**
- On-time completion rates
- Overdue tasks tracking
- Completion statistics
- Task type breakdown

**Challenge Analytics:**
- Progress tracking per challenge
- Success rates
- Time investment
- Milestone achievements
- Completion predictions

**Plan Your Day Analytics:**
- Daily planning effectiveness
- Task completion rates
- Time allocation analysis
- Voice reminder response rates
- Most productive times

---

### **5. Settings - Power Features**

#### **A. App Lock & Usage Management**

**App Lock with Scheduling:**
- Schedule-based app blocking
- Custom time slots per app
- App-specific locking rules
- Whitelist/blacklist management

**Usage Limit Blocking:**
- Set time limits per app
- Daily reset options
- Auto-block when limit reached
- Usage warnings before blocking

**Automatic Blocking During:**
- Focus Sessions (Pomodoro) - Native implementation
- Timer Tracker sessions - Native implementation
- Scheduled focus periods
- Challenge active time

**Excluded Apps Management:**
- Essential apps whitelist
- Emergency access apps
- Communication apps exception
- Productivity apps allowlist

---

#### **B. App Usage Statistics**

**Today's Usage:**
- Total time spent in app
- Session count and duration
- Feature usage breakdown
- Most used task types

**Historical Data:**
- Daily/weekly/monthly trends
- App usage patterns
- Peak activity times
- Productivity metrics

**App Breakdown:**
- Time per blocked app (attempted access)
- Most blocked apps
- Usage reduction statistics

---

#### **C. Custom Alarms (Native Implementation)**

**Alarm Configuration:**
- Set alarm time
- Select alarm tone:
  - Default system tones
  - Custom uploaded audio files
  - Voice command tones (ElevenLabs)
- Recurring alarm schedule (daily, weekly, custom)

**Smart Features:**
- Gradual volume increase
- Vibration patterns
- Snooze options
- Smart wake (optimal time in window)

---

#### **D. Wellbeing Section**

**Detox Mobile Lock (Native Implementation):**
- Complete phone lockdown feature
- Set lock duration (minutes to hours)
- Video or audio playback during lock
- No interruptions until timer expires
- Emergency call access only
- Lockscreen overlay
- Cannot be cancelled once started

**Get Back Feature (Native Implementation):**
- Intentional phone lock with pre-confirmation
- Confirmation screen before lock starts
- "Are you sure?" safety check
- Custom duration setting
- Focus-enhancing full lock mode
- Visual countdown before lock
- Motivation message display

**Common Features:**
- Progress indicator during lock
- Motivational content display
- Completion celebration
- Usage statistics post-lock

---

#### **E. Voice Command Alarms (Native Implementation with ElevenLabs)**

**Advanced Multi-Command System:**

**Setup Process:**
1. Set initial start time
2. Configure first command:
   - Text-to-speech input
   - Or upload audio file
   - Or select from ElevenLabs voice library
3. Set gap interval (time before next command)
4. Add additional commands with individual gap times
5. Save command sequence

**Example Configuration:**
**First Command:** "Good morning! Time to wake up!"
* Triggers at: 6:00 AM

**Second Command:** "Let's start with some stretches"
* Gap time: 15 minutes
* Triggers at: 6:15 AM

**Third Command:** "Time for meditation"
* Gap time: 30 minutes
* Triggers at: 6:45 AM

**Features:**
- Unlimited commands per alarm
- Individual gap timing for each command
- Mix of text and audio commands
- ElevenLabs voice synthesis
- Command preview before saving

---

### **6. Smart Reminders & Notifications**

#### **Home Screen Popup Messages**

**Motivational Popup:**
- Appears on app opening
- User-configurable message
- Default: "What will you do if you don't use this app?"
- Dismissible with action buttons

---

#### **Challenge Task Reminders**

**Daily Challenge Notification:**
- Triggers once per day
- First opening reminder
- Progress update
- Encouragement message
- Quick action to open challenge
- Streak tracking alert

---

#### **Current Month Reminder**

**Remaining Days Notification:**
- First-time monthly opening trigger
- Shows days remaining in month
- Planning encouragement
- Monthly goal reminder
- Task completion summary
- Action button to plan remaining days

---

#### **Plan Your Day - 5 Minute Reminders (Native Implementation)**

**Smart Pre-Task Alert System:**

**5 Minutes Before Task:**
1. **Initial Notification**
   - "Your task '[Task Name]' starts in 5 minutes"
   - Two action buttons:
     - ✅ "Ready"
     - ❌ "Not Ready"

2. **If "Ready" Selected:**
   - Plays intention voice command (ElevenLabs custom voice)
   - Voice message: User's pre-recorded intention or motivational message
   - Auto-opens WingsFly app
   - Smart navigation:
     - Timer Tracker task → Opens Timer Tracker screen directly
     - Focus Session → Opens Pomodoro screen
     - Other tasks → Opens appropriate evaluation screen
   - Task highlighted and ready to start

3. **If "Not Ready" Selected:**
   - Shows reschedule/cancel screen
   - Two options:
     - **Reschedule** - Opens task edit screen
       - Adjust start time
       - Modify task details
       - Save changes
       - New reminder set automatically
     - **Cancel** - Dismiss reminder
       - Task remains scheduled
       - No action taken
       - Can manually start later

**Configuration:**
- Enable/disable per task
- Customize voice message per task
- Set reminder advance time (default: 5 minutes)
- Choose voice tone/style (ElevenLabs)

---

## 🔔 Task Creation Reminder Options

**During Task Creation:**

**Notification Reminders:**
- Standard push notifications
- Time-based alerts
- Multiple reminders per task
- Customizable notification text
- Pre-task, during, and post-task options

**Alarm Reminders (Native Implementation with ElevenLabs):**
- Full-screen alarm interface
- Custom voice messages using ElevenLabs
- Cannot be dismissed easily (intentional friction)
- Louder than notifications
- Works even in Do Not Disturb mode (if permitted)
- Repeating alarm option
- Snooze functionality with limits

**Reminder Configuration:**
- Set reminder time relative to task start
- Choose reminder type (notification vs alarm)
- Select voice message for alarm reminders
- Set multiple reminders per task
- Recurring reminder options

---

## 📅 Date Reminder - Daily Date Notifications

**Full-Screen Date Reminders:**  

- Two scheduled notifications per day (morning and evening)
- Customizable timing for each reminder
- 12-hour format (AM/PM) time display
- Immersive full-screen overlay design
- Optional custom image background
- Dismissible manually or auto-closes after 30 seconds
- Works in foreground and background
- Persists across app restarts

**Image Integration:**  

- Optional personal image per reminder
- Image upload from gallery or files
- Image preview during setup
- Supported formats: JPG, PNG
- Auto-optimized (1024x1024, 0.8 quality)
- Change or remove images anytime

**Auto-Dismiss Functionality:**  

- Configurable 30-second auto-close timer
- Manual dismiss option always available
- Prevents notification fatigue
- User-controlled toggle on/off

**Notification Behavior:**  

- Native system-level scheduling
- Precise time-based delivery
- Active in system notification area
- Reliable cross-device consistency
- Settings persist after app restart

**Backend Integration:**  

- Native `DateReminderModule` management
- Real-time configuration updates
- Settings auto-save on changes
- Seamless notification delivery

---

## 🚫 App Blocking Features (Native Implementation)

### **Automatic Blocking:**

**During Focus Sessions (Pomodoro):**
- Blocks distracting apps when focus session active
- Configurable app blacklist
- Override protection (requires confirmation)
- Blocking status indicator

**During Timer Tracker:**
- Same blocking as Focus Session
- Works across unlimited cycles
- Pause timer = pause blocking
- Stop timer = stop blocking

**Schedule-Based Blocking:**
- Set specific time windows
- Days of week selection
- App-specific schedules
- Recurring schedules

**Usage Limit Enforcement:**
- Auto-block when daily limit reached
- Per-app limit configuration
- Warning before block (5 min, 1 min)
- Reset at midnight

### **Manual Blocking:**

**Detox Mobile Lock:**
- User-initiated full phone lock
- Set duration before lock
- Complete device lockdown
- Only emergency calls allowed

**Get Back Feature:**
- Confirmation-based intentional lock
- "Are you sure?" screen prevents accidents
- Custom focus duration
- Motivational lock screen

**Common Blocking Features:**
- Native Android/iOS implementation
- Persistent across device restarts
- System-level blocking (not just overlay)
- Usage statistics during blocking
- Attempted access tracking

---

## 🎵 Audio & Voice Features (ElevenLabs Integration)

### **Task Creation Music**
- Background music during Plan Your Day task creation
- Calming/focus-enhancing tracks
- User-selectable music library
- Volume control
- Auto-pause on task save

### **Voice Command Integration**
- Custom cloned voice (ElevenLabs)
- Text-to-speech for reminders
- Intention voice messages (Plan Your Day)
- Break announcement voices (Focus Session/Timer Tracker)
- Alarm voice messages

### **Custom Alarm Tones**
- Upload custom audio files
- Select from default tone library
- ElevenLabs voice tones
- Preview before saving
- Volume adjustment

### **Voice Message Recording**
- Record intention messages for Plan Your Day
- Motivational voice clips
- Task-specific voice notes
- ElevenLabs voice synthesis for custom text

---

## 📊 Data Persistence & Sync

**Supabase Backend:**
- Real-time data synchronization
- Task completion tracking
- User preferences storage
- Analytics data aggregation
- Backup and restore

**Local Caching:**
- Offline functionality
- Instant UI updates
- Background sync when online
- Conflict resolution

**Date-Specific Tracking:**
- Completion data per date
- Historical data preservation
- Date range queries
- Calendar integration

---

## 🎨 UI/UX Features

**Animations:**
- Lottie animations for timers
- Smooth transitions
- Progress indicators
- Celebration animations
- Loading states

**Visual Elements:**
- Animated Pomodoro clock
- Growing flower animation (progress indicator)
- Progress bars and counters
- Color-coded task categories
- Icon-based navigation

**Gestures:**
- Swipe actions
- Drag-and-drop (Planner)
- Pinch-to-zoom (Planner)
- Pull-to-refresh
- Long-press menus

**Navigation:**
- Bottom tab navigation
- Stack navigation for task flows
- Modal screens for inputs
- Achievement screen transitions

---

## 🔐 Security & Privacy

- Secure authentication via Supabase
- App lock functionality
- Encrypted data storage
- Privacy-focused design
- No data sharing with third parties
- Local data caching for offline use

---

## 📱 Native Features Implementation

**Android Native Modules:**
- PomodoroModule for app blocking
- Detox Mobile Lock native implementation
- Get Back feature native implementation
- Voice command alarm system
- Custom alarm management
- Usage statistics tracking

---

## 🎯 Key Benefits

✅ **Comprehensive Task Management** - Five task types cover all use cases  
✅ **Smart Reminders** - Voice-guided, intelligent notifications  
✅ **Focus Enhancement** - App blocking during productive periods  
✅ **Wellbeing Focus** - Detox features for digital wellness  
✅ **Flexible Tracking** - Multiple evaluation types for any goal  
✅ **Visual Progress** - Beautiful animations and analytics   
✅ **Native Performance** - Smooth, responsive user experience  

---

## 📞 Support

For questions, issues, or feature requests, please contact our support team through the in-app support section.

---

**Built with ❤️ for productivity enthusiasts who want to master their time and achieve their goals!**