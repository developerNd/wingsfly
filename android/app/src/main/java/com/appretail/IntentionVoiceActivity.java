package com.wingsfly;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

public class IntentionVoiceActivity extends Activity {

    private static final String TAG = "IntentionVoice";
    private static final String PREFS_NAME = "IntentionPrefs";
    private static final String KEY_INTENTION_TEXT = "intention_text";
    private static final String KEY_AUDIO_FILE_PATH = "intention_audio_path";
    private static final String KEY_AUDIO_FILE_NAME = "intention_audio_name";
    
    private TextView intentionTextView;
    private Button startSessionButton;
    private View audioIndicator;
    
    private PowerManager.WakeLock wakeLock;
    private IntentionTTSService ttsService;
    
    // Task data
    private String planId;
    private String taskTitle;
    private String taskDescription;
    private String startTime;
    private String category;
    private String evaluationType;
    
    // Intention data
    private String intentionText;
    private String intentionAudioPath;
    private String intentionAudioName;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "Intention voice activity created");
        
        setupScreenFlags();
        acquireWakeLock();
        
        setContentView(R.layout.activity_intention_voice);
        
        extractTaskData();
        loadIntentionData();
        initializeViews();
        initializeTTS();
        
        Log.d(TAG, "Intention initialized for: " + taskTitle + " (Type: " + evaluationType + ")");
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
                    "IntentionVoice:Activity"
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
        
        Log.d(TAG, "Task data extracted:");
        Log.d(TAG, "  - planId: " + planId);
        Log.d(TAG, "  - taskTitle: " + taskTitle);
        Log.d(TAG, "  - evaluationType: " + evaluationType);
        Log.d(TAG, "  - startTime: " + startTime);
        Log.d(TAG, "  - category: " + category);
    }
    
    private void loadIntentionData() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        intentionText = prefs.getString(KEY_INTENTION_TEXT, "");
        intentionAudioPath = prefs.getString(KEY_AUDIO_FILE_PATH, "");
        intentionAudioName = prefs.getString(KEY_AUDIO_FILE_NAME, "");
        
        // Set default if nothing is set
        if (intentionText.isEmpty() && intentionAudioPath.isEmpty()) {
            intentionText = "I am focused and ready to accomplish my goals";
        }
        
        Log.d(TAG, "Loaded intention - Text: " + !intentionText.isEmpty() + 
                  ", Audio: " + !intentionAudioPath.isEmpty());
    }
    
    private void initializeViews() {
        intentionTextView = findViewById(R.id.intentionText);
        startSessionButton = findViewById(R.id.startSessionButton);
        audioIndicator = findViewById(R.id.audioIndicator);
        
        // Set intention text (or audio file name)
        if (intentionAudioPath != null && !intentionAudioPath.isEmpty()) {
            // Show audio file name
            String displayText = intentionAudioName != null && !intentionAudioName.isEmpty() 
                ? "🎵 " + intentionAudioName 
                : "🎵 Playing audio...";
            intentionTextView.setText(displayText);
        } else {
            // Show text
            intentionTextView.setText(intentionText);
        }
        
        // Update button text based on task type
        if (checkIfTimerTracker()) {
            startSessionButton.setText("Start Session");
            Log.d(TAG, "Button text set to: Start Session");
        } else {
            startSessionButton.setText("Ready");
            Log.d(TAG, "Button text set to: Ready");
        }
        
        // Initially disable button until audio completes
        startSessionButton.setEnabled(false);
        startSessionButton.setAlpha(0.5f);
        
        // Set button listener
        startSessionButton.setOnClickListener(v -> onStartSessionClicked());
    }
    
    private void initializeTTS() {
        ttsService = new IntentionTTSService(this);
        
        // Show audio indicator
        audioIndicator.setVisibility(View.VISIBLE);
        
        // Play intention after short delay
        new Handler().postDelayed(() -> {
            ttsService.speakIntention(intentionText, intentionAudioPath, () -> {
                runOnUiThread(() -> {
                    // Hide audio indicator
                    audioIndicator.setVisibility(View.GONE);
                    
                    // Enable button
                    startSessionButton.setEnabled(true);
                    startSessionButton.setAlpha(1.0f);
                    
                    Log.d(TAG, "Intention playback completed - button enabled");
                });
            });
        }, 1000);
    }
    
    private void onStartSessionClicked() {
        Log.d(TAG, "=== START SESSION CLICKED ===");
        Log.d(TAG, "Task: " + taskTitle);
        Log.d(TAG, "Plan ID: " + planId);
        Log.d(TAG, "Evaluation Type: " + evaluationType);
        
        // Check if this is a timer tracker task
        boolean isTimerTracker = checkIfTimerTracker();
        Log.d(TAG, "Is Timer Tracker: " + isTimerTracker);
        
        if (isTimerTracker) {
            Log.d(TAG, "Opening PomoTrackerScreen...");
            openPomoTrackerScreen();
        } else {
            Log.d(TAG, "Regular task - returning to app");
            showTaskReadyMessage();
        }
        
        finishActivity();
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
    
    private void openPomoTrackerScreen() {
        try {
            Log.d(TAG, "========================================");
            Log.d(TAG, "OPENING POMO TRACKER SCREEN");
            Log.d(TAG, "========================================");
            Log.d(TAG, "Task Details:");
            Log.d(TAG, "  planId: " + planId);
            Log.d(TAG, "  taskTitle: " + taskTitle);
            Log.d(TAG, "  taskDescription: " + (taskDescription != null ? taskDescription : "null"));
            Log.d(TAG, "  startTime: " + (startTime != null ? startTime : "null"));
            Log.d(TAG, "  category: " + (category != null ? category : "null"));
            Log.d(TAG, "  evaluationType: " + evaluationType);
            Log.d(TAG, "========================================");
            
            Intent launchIntent = new Intent(this, MainActivity.class);
            
            // Use setAction for better intent matching
            launchIntent.setAction("OPEN_POMO_TRACKER");
            
            // Set flags
            launchIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK | 
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            
            // Add all task data as extras
            launchIntent.putExtra("planId", planId);
            launchIntent.putExtra("taskTitle", taskTitle);
            launchIntent.putExtra("taskDescription", taskDescription != null ? taskDescription : "");
            launchIntent.putExtra("startTime", startTime != null ? startTime : "");
            launchIntent.putExtra("category", category != null ? category : "");
            launchIntent.putExtra("evaluationType", evaluationType);
            launchIntent.putExtra("timestamp", System.currentTimeMillis());
            
            Log.d(TAG, "Intent created with action: " + launchIntent.getAction());
            Log.d(TAG, "Intent flags: " + launchIntent.getFlags());
            Log.d(TAG, "Starting MainActivity...");
            
            startActivity(launchIntent);
            
            Log.d(TAG, "MainActivity launched successfully!");
            Log.d(TAG, "========================================");
            
        } catch (Exception e) {
            Log.e(TAG, "========================================");
            Log.e(TAG, "ERROR OPENING POMO TRACKER");
            Log.e(TAG, "========================================");
            Log.e(TAG, "Error message: " + e.getMessage());
            e.printStackTrace();
            Log.e(TAG, "========================================");
        }
    }
    
    private void showTaskReadyMessage() {
        Log.d(TAG, "Task intention completed - user is ready");
        
        // For non-timer-tracker tasks, just open the main app
        try {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(launchIntent);
                Log.d(TAG, "Returned to main app");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error returning to app", e);
        }
    }
    
    private void finishActivity() {
        releaseWakeLock();
        
        if (ttsService != null) {
            ttsService.cleanup();
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
        if (ttsService != null) {
            ttsService.cleanup();
        }
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button
        Log.d(TAG, "Back button pressed - ignored");
    }
}