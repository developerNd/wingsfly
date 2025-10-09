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

public class TaskConfirmationAlarmActivity extends Activity {

    private static final String TAG = "TaskConfirmationAlarm";
    
    private TextView currentTimeTextView;
    private TextView currentDateTextView;
    private TextView taskTitleTextView;
    private TextView taskDescriptionTextView;
    private TextView startTimeTextView;
    private Button yesButton;
    private Button noButton;
    
    private PowerManager.WakeLock wakeLock;
    private Handler timeHandler;
    private Runnable timeRunnable;
    
    // Task data
    private String planId;
    private String taskTitle;
    private String taskDescription;
    private String startTime;
    private String category;
    private String evaluationType; // ADDED THIS
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "Task confirmation alarm activity created");
        
        setupScreenFlags();
        acquireWakeLock();
        
        setContentView(R.layout.activity_task_confirmation_alarm);
        
        extractTaskData();
        initializeViews();
        startTimeUpdates();
        
        Log.d(TAG, "Task confirmation initialized for: " + taskTitle + " (Type: " + evaluationType + ")");
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
                    "TaskConfirmation:Activity"
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
        evaluationType = intent.getStringExtra("evaluationType"); // ADDED THIS LINE
        
        Log.d(TAG, "Task data - ID: " + planId + ", Title: " + taskTitle + ", Start: " + startTime + ", Type: " + evaluationType);
    }
    
    private void initializeViews() {
        currentTimeTextView = findViewById(R.id.currentTime);
        currentDateTextView = findViewById(R.id.currentDate);
        taskTitleTextView = findViewById(R.id.taskTitle);
        taskDescriptionTextView = findViewById(R.id.taskDescription);
        startTimeTextView = findViewById(R.id.startTime);
        yesButton = findViewById(R.id.yesButton);
        noButton = findViewById(R.id.noButton);
        
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
            startTimeTextView.setText("Starts at " + formatTime(startTime));
        }
        
        // Set button listeners
        yesButton.setOnClickListener(v -> onYesClicked());
        noButton.setOnClickListener(v -> onNoClicked());
        
        updateTime();
        updateDate();
    }
    
    private void onYesClicked() {
        Log.d(TAG, "User confirmed task: " + planId);
        
        // Send confirmation result back to React Native
        sendConfirmationToReactNative(true);
        
        // Launch Intention Voice Activity
        launchIntentionVoiceActivity();
    }

    private void launchIntentionVoiceActivity() {
        try {
            Intent intentionIntent = new Intent(this, IntentionVoiceActivity.class);
            intentionIntent.putExtra("planId", planId);
            intentionIntent.putExtra("taskTitle", taskTitle);
            intentionIntent.putExtra("taskDescription", taskDescription);
            intentionIntent.putExtra("startTime", startTime);
            intentionIntent.putExtra("category", category);
            intentionIntent.putExtra("evaluationType", evaluationType); // ADDED THIS LINE
            
            intentionIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            
            startActivity(intentionIntent);
            Log.d(TAG, "Intention voice activity launched with evaluationType: " + evaluationType);
            
            // Finish this activity
            finishActivity();
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch intention activity", e);
            // Fallback: just finish
            finishActivity();
        }
    }
    
    private void onNoClicked() {
        Log.d(TAG, "User declined task: " + planId);
        
        // Send confirmation result back to React Native
        sendConfirmationToReactNative(false);
        
        launchRescheduleActivity();
    }

    private void launchRescheduleActivity() {
    try {
        Intent rescheduleIntent = new Intent(this, TaskRescheduleActivity.class);
        rescheduleIntent.putExtra("planId", planId);
        rescheduleIntent.putExtra("taskTitle", taskTitle);
        rescheduleIntent.putExtra("taskDescription", taskDescription);
        rescheduleIntent.putExtra("startTime", startTime);
        rescheduleIntent.putExtra("category", category);
        rescheduleIntent.putExtra("evaluationType", evaluationType);
        
        rescheduleIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        
        startActivity(rescheduleIntent);
        Log.d(TAG, "Reschedule activity launched with evaluationType: " + evaluationType);
        
        // Finish this activity
        finishActivity();
        
    } catch (Exception e) {
        Log.e(TAG, "Failed to launch reschedule activity", e);
        // Fallback: just finish
        finishActivity();
    }
}
    
    private void sendConfirmationToReactNative(boolean confirmed) {
        try {
            // Broadcast to React Native via intent
            Intent broadcastIntent = new Intent("com.wingsfly.TASK_CONFIRMATION_RESPONSE");
            broadcastIntent.putExtra("planId", planId);
            broadcastIntent.putExtra("confirmed", confirmed);
            broadcastIntent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(broadcastIntent);
            
            Log.d(TAG, "Confirmation broadcast sent: " + confirmed);
        } catch (Exception e) {
            Log.e(TAG, "Error sending confirmation", e);
        }
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
        // Treat back button as "No" response
        onNoClicked();
    }
}