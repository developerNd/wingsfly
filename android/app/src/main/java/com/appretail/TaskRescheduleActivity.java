package com.wingsfly;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class TaskRescheduleActivity extends Activity {

    private static final String TAG = "TaskReschedule";
    
    private TextView currentTimeTextView;
    private TextView currentDateTextView;
    private TextView taskTitleTextView;
    private TextView taskDescriptionTextView;
    private TextView startTimeTextView;
    private Button rescheduleButton;
    private Button cancelButton;
    
    private PowerManager.WakeLock wakeLock;
    private Handler timeHandler;
    private Runnable timeRunnable;
    
    // Task data
    private String planId;
    private String taskTitle;
    private String taskDescription;
    private String startTime;
    private String category;
    private String evaluationType;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "Task reschedule activity created");
        
        setupScreenFlags();
        acquireWakeLock();
        
        setContentView(R.layout.activity_task_reschedule);
        
        extractTaskData();
        initializeViews();
        startTimeUpdates();
        
        Log.d(TAG, "Reschedule initialized for: " + taskTitle + " (Type: " + evaluationType + ")");
    }
    
    private void setupScreenFlags() {
        Window window = getWindow();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
                if (keyguardManager != null) {
                    keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override
                        public void onDismissSucceeded() {
                            Log.d(TAG, "Keyguard dismissed");
                        }
                        
                        @Override
                        public void onDismissError() {
                            Log.w(TAG, "Failed to dismiss keyguard");
                        }
                    });
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error dismissing keyguard", e);
        }
    }
    
    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK | 
                    PowerManager.ACQUIRE_CAUSES_WAKEUP | 
                    PowerManager.ON_AFTER_RELEASE,
                    "TaskReschedule:Activity"
                );
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes max
                Log.d(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }
    
    private void extractTaskData() {
        Intent intent = getIntent();
        planId = intent.getStringExtra("planId");
        taskTitle = intent.getStringExtra("taskTitle");
        taskDescription = intent.getStringExtra("taskDescription");
        startTime = intent.getStringExtra("startTime");
        category = intent.getStringExtra("category");
        evaluationType = intent.getStringExtra("evaluationType");
        
        Log.d(TAG, "Task data - ID: " + planId + ", Title: " + taskTitle + ", Type: " + evaluationType);
    }
    
    private void initializeViews() {
        currentTimeTextView = findViewById(R.id.currentTime);
        currentDateTextView = findViewById(R.id.currentDate);
        taskTitleTextView = findViewById(R.id.taskTitle);
        taskDescriptionTextView = findViewById(R.id.taskDescription);
        startTimeTextView = findViewById(R.id.startTime);
        rescheduleButton = findViewById(R.id.rescheduleButton);
        cancelButton = findViewById(R.id.cancelButton);
        
        // Set task information
        if (taskTitle != null && !taskTitle.isEmpty()) {
            taskTitleTextView.setText(taskTitle);
        }
        
        if (taskDescription != null && !taskDescription.isEmpty()) {
            taskDescriptionTextView.setText(taskDescription);
            taskDescriptionTextView.setVisibility(View.VISIBLE);
        } else {
            taskDescriptionTextView.setVisibility(View.GONE);
        }
        
        if (startTime != null && !startTime.isEmpty()) {
            startTimeTextView.setText("Scheduled for " + formatTime(startTime));
        }
        
        // Set button listeners
        rescheduleButton.setOnClickListener(v -> onRescheduleClicked());
        cancelButton.setOnClickListener(v -> onCancelClicked());
        
        updateTime();
        updateDate();
    }
    
    private void onRescheduleClicked() {
        Log.d(TAG, "========================================");
        Log.d(TAG, "Reschedule button clicked");
        Log.d(TAG, "Plan ID: " + planId);
        Log.d(TAG, "Evaluation Type: " + evaluationType);
        Log.d(TAG, "========================================");
        
        // Navigate to appropriate edit screen based on evaluation type
        navigateToEditScreen();
    }
    
 private void navigateToEditScreen() {
    try {
        Intent editIntent = new Intent(this, MainActivity.class);
        
        // Check if this is a timer tracker task
        boolean isTimerTracker = checkIfTimerTracker();
        
        Log.d(TAG, "Is Timer Tracker: " + isTimerTracker);
        
        if (isTimerTracker) {
            editIntent.setAction("OPEN_EDIT_PLAN_TIMER_TRACKER");
            Log.d(TAG, "Opening EditPlanTimerTrackerScreen");
        } else {
            editIntent.setAction("OPEN_EDIT_PLAN");
            Log.d(TAG, "Opening EditPlanScreen");
        }
        
        // Use CLEAR_TOP to remove any existing MainActivity and start fresh
        editIntent.setFlags(
            Intent.FLAG_ACTIVITY_CLEAR_TOP | 
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        
        // Add all task data as extras
        editIntent.putExtra("planId", planId);
        editIntent.putExtra("taskTitle", taskTitle);
        editIntent.putExtra("taskDescription", taskDescription != null ? taskDescription : "");
        editIntent.putExtra("startTime", startTime != null ? startTime : "");
        editIntent.putExtra("category", category != null ? category : "");
        editIntent.putExtra("evaluationType", evaluationType);
        editIntent.putExtra("fromReschedule", true);
        
        Log.d(TAG, "Intent created with action: " + editIntent.getAction());
        Log.d(TAG, "Starting MainActivity...");
        
        startActivity(editIntent);
        
        // Finish immediately - no delay needed
        finish();
        
    } catch (Exception e) {
        Log.e(TAG, "ERROR OPENING EDIT SCREEN");
        Log.e(TAG, "Error message: " + e.getMessage());
        e.printStackTrace();
        finish();
    }
}
    
    private boolean checkIfTimerTracker() {
        Log.d(TAG, "Checking evaluation type. Received: '" + evaluationType + "'");
        
        if (evaluationType == null || evaluationType.isEmpty()) {
            Log.d(TAG, "evaluationType is null or empty - not a timer tracker");
            return false;
        }
        
        // Check for timerTracker variations
        boolean isTimerTracker = evaluationType.equalsIgnoreCase("timerTracker") || 
                                 evaluationType.equalsIgnoreCase("timer-tracker") ||
                                 evaluationType.equalsIgnoreCase("timer_tracker");
        
        Log.d(TAG, "Timer tracker check result: " + isTimerTracker);
        return isTimerTracker;
    }
    
    private void onCancelClicked() {
        Log.d(TAG, "User cancelled reschedule: " + planId);
        finishActivity();
    }
    
    private String formatTime(String time24h) {
        try {
            String[] parts = time24h.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            
            String ampm = hour >= 12 ? "PM" : "AM";
            int displayHour = hour == 0 ? 12 : hour > 12 ? hour - 12 : hour;
            
            return String.format(Locale.getDefault(), "%d:%02d %s", displayHour, minute, ampm);
        } catch (Exception e) {
            return time24h;
        }
    }
    
    private void startTimeUpdates() {
        timeHandler = new Handler();
        timeRunnable = new Runnable() {
            @Override
            public void run() {
                updateTime();
                updateDate();
                timeHandler.postDelayed(this, 1000);
            }
        };
        timeHandler.post(timeRunnable);
    }
    
    private void updateTime() {
        if (currentTimeTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = sdf.format(new Date());
            currentTimeTextView.setText(currentTime);
        }
    }
    
    private void updateDate() {
        if (currentDateTextView != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d MMMM", Locale.getDefault());
            String currentDate = sdf.format(new Date());
            currentDateTextView.setText(currentDate);
        }
    }
    
    private void finishActivity() {
        releaseWakeLock();
        
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
        }
        
        clearWindowFlags();
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
            } else {
                finish();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error finishing activity", e);
            finish();
        }
    }
    
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.d(TAG, "Wake lock released");
            } catch (Exception e) {
                Log.e(TAG, "Error releasing wake lock", e);
            }
        }
    }
    
    private void clearWindowFlags() {
        try {
            Window window = getWindow();
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
        } catch (Exception e) {
            Log.e(TAG, "Error clearing window flags", e);
        }
    }
    
    @Override
    protected void onDestroy() {
        Log.d(TAG, "Activity destroying");
        releaseWakeLock();
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        // Allow back button to cancel
        onCancelClicked();
    }
}